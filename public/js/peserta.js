import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, setDoc, writeBatch, collection, query, where, onSnapshot, runTransaction } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { bukaKartu } from "./kartu.js";
import { halamanJuz, siapkanHalaman, gambarHalaman, paskanUkuran, prefetch } from "./mushaf.js";
import { terapkanTema, ikon, inisial, alokasiJuz, idDariWa, KATEGORI, kelompok, tampilId } from "./common.js";
import { auth, db, configBelumDiisi, emailNim, isAkunPeserta, nimDariUser, JUZ, rentangJuz, $, esc, angkaArab, bersihkanNim, lalu, setMsg, pesanError, kosongkanJuz } from "./common.js";

let me = null;            // dokumen peserta
let mine = [];            // bacaan milik peserta
let papan = [];           // bacaan pada putaran yang sedang berjalan
let putaranAktif = 1;
let unsub = [];
let unsubPapan = null;
let membaca = null, konfirmasi = false;
let acara = {};

if (configBelumDiisi) $("cfgNote").hidden = false;

onSnapshot(doc(db, "pengaturan", "acara"), s => {
  const d = acara = s.exists() ? s.data() : {};
  $("evLogo").hidden = !d.logo; if (d.logo) $("evLogo").src = $("evLogo2").src = d.logo;
  render();
  terapkanTema(d.warna);
  $("evName").textContent = d.nama || "Khatmil Qur'an";
  $("evSub").textContent = d.sub || "Laporan bacaan bersama";
  document.title = (d.nama || "Khatmil Qur'an") + " — Peserta";
}, () => {});

onAuthStateChanged(auth, async user => {
  unsub.forEach(f => f()); unsub = [];
  if (unsubPapan) { unsubPapan(); unsubPapan = null; }
  me = null; mine = []; papan = [];
  if (!user) return render();
  if (!isAkunPeserta(user)) {           // akun panitia membuka halaman peserta
    $("authView").hidden = false;
    setMsg("lMsg", "Anda masuk sebagai panitia. Keluar dulu untuk masuk sebagai peserta.", "err");
    return;
  }
  const nim = nimDariUser(user);
  unsub.push(onSnapshot(doc(db, "peserta", nim), s => { me = s.exists() ? s.data() : null; render(); }));
  unsub.push(onSnapshot(query(collection(db, "bacaan"), where("uid", "==", user.uid)), s => { mine = s.docs.map(d => ({ ...d.data(), _id: d.id })); render(); }));
  unsub.push(onSnapshot(doc(db, "state", "alokasi"), s => {
    const p = s.exists() ? (s.data().putaran || 1) : 1;
    if (p !== putaranAktif || !unsubPapan) {
      putaranAktif = p;
      if (unsubPapan) unsubPapan();
      unsubPapan = onSnapshot(query(collection(db, "bacaan"), where("putaran", "==", p)), q => { papan = q.docs.map(d => d.data()); render(); });
    }
    render();
  }));
});

/* ---------- tampilan ---------- */
function render() {
  const user = auth.currentUser;
  const masuk = !!(user && isAkunPeserta(user) && me);
  $("authView").hidden = !!(user && isAkunPeserta(user));
  $("homeView").hidden = !masuk;
  $("who").hidden = !masuk;
  $("brand").hidden = masuk;
  $("logout").hidden = !masuk;
  $("evLogo2").hidden = !(masuk && acara.logo);
  if (!masuk) return;

  $("whoInit").textContent = inisial(me.nama);
  $("whoName").textContent = me.nama.replace(/^Contoh:\s*/, "").split(" ")[0];
  $("whoNim").textContent = (me.kategori && me.kategori !== "mahasiswa")
    ? `${KATEGORI[me.kategori]}${me.instansi ? " · " + me.instansi : ""}`
    : `NIM ${me.nim}${me.prodi ? " · " + me.prodi : ""}`;

  // papan putaran
  const per = {}; papan.forEach(r => per[r.juz] = r);
  let selesai = 0, dibaca = 0, html = "";
  for (let j = 1; j <= 30; j++) {
    const r = per[j];
    const cls = r ? (r.status === "selesai" ? "done" : "busy") : "";
    if (r?.status === "selesai") selesai++; else if (r) dibaca++;
    const milik = r && r.nim === me.nim ? " mine" : "";
    const tip = `Juz ${j} · ${rentangJuz(j)} · ${r ? (r.status === "selesai" ? "selesai" : "sedang dibaca") : "belum diambil"}`;
    html += `<div class="cell ${cls}${milik}" title="${esc(tip)}" aria-label="${esc(tip)}">${j}</div>`;
  }
  $("grid").innerHTML = html;
  $("pNo").textContent = putaranAktif;
  $("pBar").style.width = (selesai / 30 * 100) + "%";
  $("pText").textContent = `${selesai} dari 30 juz selesai · ${dibaca} sedang dibaca · ${30 - selesai - dibaca} belum diambil`;

  // kartu juz
  const aktif = mine.find(r => r.status === "membaca");
  const tuntas = mine.filter(r => r.status === "selesai").sort((a, b) => (b.selesai || 0) - (a.selesai || 0));
  if (aktif) {
    const m = JUZ[aktif.juz - 1], hj = halamanJuz(aktif.juz);
    $("assign").innerHTML = `
      <div class="row" style="justify-content:space-between"><span class="chip"><i></i>Juz bagianmu · putaran ${aktif.putaran}</span><span class="eyebrow" style="color:var(--accent-ink)">diambil ${lalu(aktif.ambil)}</span></div>
      <div class="juz-hero"><div class="angka num"><small>Juz</small>${aktif.juz}</div>
        <div class="ket"><b>${rentangJuz(aktif.juz)}</b>${m[4]} ayat · ${hj.akhir - hj.awal + 1} halaman</div></div>
      <div class="row"><button class="btn pil-ikon" id="readBtn" type="button">Mulai baca <span class="bulat">${ikon("main", 16)}</span></button>
        <button class="ibtn" id="doneBtn" type="button" title="Tandai selesai" aria-label="Tandai selesai">${ikon("cek")}</button>
        <button class="btn-link" id="returnBtn" type="button">Kembalikan juz</button></div>
      <div class="msg" id="aMsg" role="status"></div>`;
  } else {
    $("assign").innerHTML = `
      <span class="chip"><i></i>Putaran ke-${putaranAktif} sedang berjalan</span>
      <div><h1 style="font-size:clamp(28px,6vw,40px)">${tuntas.length ? "Lanjut ke juz berikutnya?" : "Ambil juz pertamamu"}</h1>
        <p style="margin:8px 0 0;color:var(--accent-ink);opacity:.8;font-size:14px">Sistem membagikan juz yang masih kosong, berurutan dari juz terkecil.</p></div>
      <div class="row"><button class="btn pil-ikon" id="takeBtn" type="button">Ambil juz <span class="bulat">${ikon("buku", 16)}</span></button></div>
      <div class="msg" id="aMsg" role="status"></div>`;
  }
  const baris = (warna, nilai, label) => `<div class="statrow"><span class="val ${warna}">${nilai}</span><span class="lbl">${label}</span></div>`;
  $("stats").innerHTML =
    baris("t-mint", `${ikon("cek", 16)} ${tuntas.length} juz`, "Sudah kamu tuntaskan") +
    baris("t-sky", `${ikon("bintang", 16)} ${selesai}/30`, `Juz selesai di putaran ${putaranAktif}`) +
    baris("t-butter", `${ikon("jam", 16)} ${dibaca} juz`, "Sedang dibaca peserta") +
    baris("t-peach", `${ikon("buku", 16)} ${30 - selesai - dibaca} juz`, "Belum diambil");
  const items = [...mine].sort((a, b) => (b.ambil || 0) - (a.ambil || 0)).map(r =>
    `<li><span><b>Juz ${r.juz}</b> <span class="muted">· putaran ${r.putaran}</span></span><span class="row" style="gap:6px;flex-wrap:nowrap"><span class="pill ${r.status === "selesai" ? "done" : "busy"}">${r.status === "selesai" ? "Selesai " + lalu(r.selesai) : "Sedang dibaca"}</span>${r.status === "selesai" ? `<button class="btn-link btn-sm" data-kartu="${esc(r._id)}" type="button">Kartu</button>` : ""}</span></li>`);
  $("myList").innerHTML = (items.length ? items.join("") : `<li class="empty">Belum ada juz yang dibaca.</li>`);
}

/* ---------- masuk & daftar ---------- */
/* ---------- kategori peserta ---------- */
let kategori = "mahasiswa";
function pilihKategori(k) {
  kategori = k;
  document.querySelectorAll("#katPilih [data-kat]").forEach(b => b.setAttribute("aria-checked", String(b.dataset.kat === k)));
  const mhs = k === "mahasiswa";
  $("lNimLbl").textContent = mhs ? "NIM" : "No. WhatsApp";
  $("lNim").placeholder = mhs ? "11210340000123" : "0812xxxxxxxx";
  $("lNim").inputMode = mhs ? "numeric" : "tel";
  $("rMhs").hidden = !mhs;
  $("rHpKet").textContent = mhs ? "(opsional)" : "(dipakai untuk masuk)";
  $("rInstansiBox").hidden = k !== "umum";
  setMsg("lMsg", ""); setMsg("rMsg", "");
}
$("katPilih").addEventListener("click", e => { const b = e.target.closest("[data-kat]"); if (b) pilihKategori(b.dataset.kat); });

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const mhs = kategori === "mahasiswa";
  const id = mhs ? bersihkanNim($("lNim").value) : idDariWa($("lNim").value), pin = $("lPin").value;
  if (!id || !pin) return setMsg("lMsg", mhs ? "Isi NIM dan PIN." : "Isi nomor WhatsApp yang benar (mis. 0812…) dan PIN.", "err");
  setMsg("lMsg", "Memeriksa…");
  try { await signInWithEmailAndPassword(auth, emailNim(id), pin); setMsg("lMsg", ""); $("loginForm").reset(); }
  catch (err) { setMsg("lMsg", err?.code === "auth/invalid-credential" ? `${mhs ? "NIM" : "Nomor WhatsApp"} atau PIN salah, atau belum terdaftar.` : pesanError(err), "err"); }
});

$("regForm").addEventListener("submit", async e => {
  e.preventDefault();
  const mhs = kategori === "mahasiswa";
  const nama = $("rNama").value.trim().replace(/\s+/g, " ");
  const hp = $("rHp").value.trim(), pin = $("rPin").value;
  const prodi = mhs ? $("rProdi").value.trim() : KATEGORI[kategori];
  const instansi = kategori === "umum" ? $("rInstansi").value.trim() : "";
  const id = mhs ? bersihkanNim($("rNim").value) : idDariWa(hp);
  if (!nama) return setMsg("rMsg", "Nama lengkap wajib diisi.", "err");
  if (mhs && (!id || !prodi)) return setMsg("rMsg", "NIM dan program studi wajib diisi.", "err");
  if (!mhs && !id) return setMsg("rMsg", "Isi nomor WhatsApp yang benar (mis. 0812…). Nomor ini dipakai untuk masuk.", "err");
  if (pin.length < 6) return setMsg("rMsg", "PIN minimal 6 karakter.", "err");
  setMsg("rMsg", "Mendaftarkan…");
  try {
    const cred = await createUserWithEmailAndPassword(auth, emailNim(id), pin);
    await setDoc(doc(db, "peserta", id.toLowerCase()), { nim: id.toLowerCase(), nama, kategori, prodi, instansi, hp, uid: cred.user.uid, aktif: null, daftar: Date.now() });
    setMsg("rMsg", ""); $("regForm").reset();
  } catch (err) {
    setMsg("rMsg", err?.code === "auth/email-already-in-use" ? `${mhs ? "NIM" : "Nomor WhatsApp"} ini sudah terdaftar. Silakan masuk.` : pesanError(err), "err");
  }
});

$("logout").addEventListener("click", () => signOut(auth));

/* ---------- ambil, selesai, kembalikan ---------- */
async function ambilJuz() {
  const btn = $("takeBtn"); if (btn) btn.disabled = true;
  setMsg("aMsg", "Mencarikan juz…");
  try {
    // Utamakan juz yang belum pernah dibaca peserta ini, tanpa melanggar urutan putaran.
    const sudah = new Set(mine.map(r => r.juz));
    await alokasiJuz({ nim: me.nim, nama: me.nama, prodi: kelompok(me), uid: auth.currentUser.uid }, sudah);
    setMsg("aMsg", "");
  } catch (err) {
    setMsg("aMsg", err?.code === "bentrok" ? "Juz itu baru saja diambil orang lain. Coba lagi." : pesanError(err), "err");
    const b = $("takeBtn"); if (b) b.disabled = false;
  }
}

async function tandaiSelesai(r) {
  const batch = writeBatch(db);
  batch.update(doc(db, "bacaan", r._id), { status: "selesai", selesai: Date.now() });
  batch.update(doc(db, "peserta", me.nim), { aktif: null });
  try { await batch.commit(); return true; }
  catch (err) { setMsg("aMsg", pesanError(err), "err"); return false; }
}

$("assign").addEventListener("click", async ev => {
  const b = ev.target.closest("button"); if (!b) return;
  const e = { target: b };
  const id = b.id;
  if (id === "takeBtn") return ambilJuz();
  const aktif = mine.find(r => r.status === "membaca");
  if (!aktif) return;
  if (id === "readBtn") return bukaMushaf(aktif);
  if (id === "doneBtn") {
    if (e.target.dataset.armed) { e.target.disabled = true; if (await tandaiSelesai(aktif)) bukaKartu({ nama: me.nama, juz: aktif.juz, putaran: aktif.putaran, selesai: Date.now() }, acara); return; }
    e.target.dataset.armed = "1"; e.target.textContent = "Yakin selesai?"; e.target.className = "btn btn-sm";
  }
  if (id === "returnBtn") {
    if (e.target.dataset.armed) { try { await kosongkanJuz(aktif._id); } catch (err) { setMsg("aMsg", pesanError(err), "err"); } return; }
    e.target.dataset.armed = "1"; e.target.textContent = "Ketuk lagi untuk mengembalikan";
  }
});

/* ---------- mushaf ---------- */
// Dua tampilan: halaman Mushaf Madinah (bawaan) dan teks per ayat (cadangan bila halaman gagal dimuat).
const cacheTeks = {};
let mode = "halaman", hal = { awal: 1, akhir: 1, skr: 1 }, rangeJuz = null;

async function bukaMushaf(r) {
  membaca = r; konfirmasi = false;
  $("rTitle").textContent = `Juz ${r.juz} · ${rentangJuz(r.juz)}`;
  $("rEndText").textContent = "Sudah sampai akhir juz.";
  $("reader").hidden = false; document.body.style.overflow = "hidden";
  rangeJuz = halamanJuz(r.juz);
  let simpanan = 0; try { simpanan = Number(sessionStorage.getItem("khatam.hal." + r._id)) || 0; } catch {}
  hal = { awal: rangeJuz.awal, akhir: rangeJuz.akhir, skr: simpanan >= rangeJuz.awal && simpanan <= rangeJuz.akhir ? simpanan : rangeJuz.awal };
  tombolKonfirmasi();
  await gantiMode(mode);
}

async function gantiMode(m) {
  mode = m;
  if (m === "halaman") $("rNotice").hidden = true;
  const lbl = m === "halaman" ? "Mode teks" : "Mode halaman";
  $("rMode").innerHTML = ikon(m === "halaman" ? "teks" : "buku"); $("rMode").title = lbl; $("rMode").setAttribute("aria-label", lbl);
  $("halView").hidden = m !== "halaman";
  $("mushaf").hidden = m !== "teks";
  if (m === "halaman") await tampilHalaman(); else await tampilTeks();
}

// Tiga slot berjajar kiri→kanan: [berikutnya, sekarang, sebelumnya] — urutan buku Arab.
const slotEl = () => [...$("mpTrack").children].map(c => c.firstElementChild);
function slot() { const [next, cur, prev] = slotEl(); return { next, cur, prev }; }

async function isiSlot(el, p) {
  if (!membaca) return;
  if (p < hal.awal || p > hal.akhir) {
    el.dataset.p = "";
    el.innerHTML = `<div class="mp-load">${p > hal.akhir ? `Akhir juz ${membaca.juz}.<br>Ketuk <b>Selesai</b> untuk melapor.` : `Awal juz ${membaca.juz}`}</div>`;
    return;
  }
  if (el.dataset.p === String(p) && el.querySelector(".mp-lines")) { paskanUkuran(el); return; }
  el.dataset.p = String(p);
  el.innerHTML = `<div class="mp-load">Membuka halaman ${p}…</div>`;
  try {
    const data = await siapkanHalaman(p);
    if (el.dataset.p !== String(p) || !membaca) return true;
    gambarHalaman(el, data, rangeJuz, membaca.juz);
    return true;
  } catch (err) {
    console.warn("Halaman mushaf", p, "gagal dimuat:", err);
    if (el.dataset.p === String(p)) { el.dataset.p = ""; el.innerHTML = `<div class="mp-load">Halaman mushaf gagal dimuat.</div>`; }
    return false;
  }
}

async function tampilHalaman() {
  const r = membaca; if (!r) return;
  const total = hal.akhir - hal.awal + 1, ke = hal.skr - hal.awal + 1;
  $("mpInfo").textContent = `Halaman ${ke} dari ${total} · mushaf hlm. ${hal.skr}`;
  $("mpPrev").disabled = hal.skr <= hal.awal;
  $("mpNext").hidden = hal.skr >= hal.akhir;
  $("finishBox").hidden = hal.skr < hal.akhir && !konfirmasi;
  $("mpHint").hidden = ke > 2;
  $("rProg").style.width = (ke / total * 100) + "%";
  try { sessionStorage.setItem("khatam.hal." + r._id, hal.skr); } catch {}
  const { next, cur, prev } = slot();
  const ok = await isiSlot(cur, hal.skr);
  if (ok === false && membaca === r && mode === "halaman") {
    // Jangan biarkan peserta tertahan: pindah otomatis ke teks per ayat.
    $("rNotice").hidden = false;
    $("rNotice").innerHTML = globalThis.KHATAM_DEMO
      ? `Versi uji hanya memuat halaman mushaf Juz 1, 2, dan 30. Juz ${r.juz} ditampilkan sebagai teks. Setelah di-deploy, semua juz tampil per halaman.`
      : `Halaman mushaf belum bisa dimuat (koneksi lemah atau CDN terblokir), jadi ditampilkan sebagai teks. <button class="btn-link" id="rCoba" type="button">Coba lagi</button>`;
    return gantiMode("teks");
  }
  $("rNotice").hidden = true;
  isiSlot(next, hal.skr + 1); isiSlot(prev, hal.skr - 1);
  prefetch(hal.skr + 2);
}

/* ---------- geser seperti membalik buku ---------- */
let sibukAnim = false;
function aturGeser(px, anim) {
  const t = $("mpTrack");
  t.classList.toggle("anim", !!anim);
  t.style.transform = `translate3d(calc(-33.3333% + ${px}px),0,0)`;
  const w = $("mpView").clientWidth || 1;
  $("mpShade").style.opacity = Math.min(1, Math.abs(px) / w * 1.6);
}
function pindah(arah) {
  if (sibukAnim || !membaca) return;
  const baru = hal.skr + arah;
  if (baru < hal.awal || baru > hal.akhir) { aturGeser(0, true); return; }
  sibukAnim = true;
  const w = $("mpView").clientWidth;
  aturGeser(arah > 0 ? w : -w, true);           // berikutnya datang dari kiri: geser ke kanan
  const selesai = () => {
    const t = $("mpTrack"), [nx, cu, pv] = [...t.children];
    if (arah > 0) t.replaceChildren(pv, nx, cu);  // slot "sebelumnya" lama dipakai ulang untuk halaman berikutnya
    else t.replaceChildren(cu, pv, nx);
    aturGeser(0, false);
    hal.skr = baru; sibukAnim = false;
    $("rScroll").scrollTop = 0;
    tampilHalaman();
  };
  let beres = false;
  const sekali = () => { if (!beres) { beres = true; selesai(); } };
  $("mpTrack").addEventListener("transitionend", sekali, { once: true });
  setTimeout(sekali, 420);
}

const geser = { id: null, x: 0, y: 0, t: 0, arah: null, dx: 0 };
$("mpView").addEventListener("pointerdown", e => {
  if (sibukAnim || mode !== "halaman" || (e.pointerType === "mouse" && e.button !== 0)) return;
  Object.assign(geser, { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), arah: null, dx: 0 });
});
$("mpView").addEventListener("pointermove", e => {
  if (e.pointerId !== geser.id) return;
  const dx = e.clientX - geser.x, dy = e.clientY - geser.y;
  if (!geser.arah) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    geser.arah = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (geser.arah === "x") { $("mpView").setPointerCapture?.(e.pointerId); $("mpView").classList.add("drag"); }
  }
  if (geser.arah !== "x") return;
  e.preventDefault();
  const bisa = dx > 0 ? hal.skr < hal.akhir : hal.skr > hal.awal;
  geser.dx = bisa ? dx : dx * 0.25;               // terasa menahan di awal/akhir juz
  aturGeser(geser.dx, false);
});
function lepas(e) {
  if (e.pointerId !== geser.id) return;
  geser.id = null; $("mpView").classList.remove("drag");
  if (geser.arah !== "x") return;
  const w = $("mpView").clientWidth, laju = geser.dx / Math.max(1, performance.now() - geser.t);
  if (Math.abs(geser.dx) > w * 0.2 || Math.abs(laju) > 0.5) pindah(geser.dx > 0 ? 1 : -1);
  else aturGeser(0, true);
}
$("mpView").addEventListener("pointerup", lepas);
$("mpView").addEventListener("pointercancel", lepas);
$("mpView").addEventListener("dragstart", e => e.preventDefault());

async function tampilTeks() {
  const r = membaca; if (!r) return;
  $("finishBox").hidden = false;
  $("mushaf").innerHTML = `<div class="loading">Membuka teks juz ${r.juz}…</div>`;
  perbaruiProgres();
  try {
    const key = String(r.juz).padStart(2, "0");
    const data = cacheTeks[key] || (cacheTeks[key] = await (await fetch(`juz/${key}.json`)).json());
    let h = "";
    data.forEach((s, i) => {
      if (s.v[0][0] === 1) {
        h += `<div class="surah">سُورَةُ ${esc(s.n)}<small>Surah ${s.s} · ${esc(s.tr)}</small></div>`;
        if (s.s !== 1 && s.s !== 9) h += `<div class="basmala">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</div>`;
      } else if (i === 0) {
        h += `<div class="surah">سُورَةُ ${esc(s.n)}<small>Surah ${s.s} · ${esc(s.tr)} · mulai ayat ${s.v[0][0]}</small></div>`;
      }
      h += `<p style="margin:0">` + s.v.map(([a, t]) => `${esc(t)}<span class="aya-no">﴿${angkaArab(a)}﴾</span>`).join(" ") + `</p>`;
    });
    $("mushaf").innerHTML = h;
  } catch { $("mushaf").innerHTML = `<div class="loading">Teks gagal dimuat. Periksa koneksi lalu buka lagi.</div>`; }
}

function tutupMushaf() { $("reader").hidden = true; document.body.style.overflow = ""; membaca = null; }
function perbaruiProgres() {
  if (mode !== "teks") return;
  const s = $("rScroll"); const p = s.scrollHeight > s.clientHeight ? s.scrollTop / (s.scrollHeight - s.clientHeight) : 0;
  $("rProg").style.width = Math.min(100, p * 100) + "%";
}
function tombolKonfirmasi() {
  $("rConfirm").innerHTML = konfirmasi
    ? `<button class="btn" id="rYes" type="button">Ya, laporkan juz ${membaca?.juz} selesai</button><button class="btn-ghost" id="rNo" type="button">Belum</button>`
    : `<button class="btn-gold" id="rFinish" type="button">Selesai membaca juz ${membaca?.juz}</button>`;
}
$("rScroll").addEventListener("scroll", perbaruiProgres, { passive: true });
$("rMode").addEventListener("click", () => gantiMode(mode === "halaman" ? "teks" : "halaman"));
$("mpNext").addEventListener("click", () => pindah(1));
$("mpPrev").addEventListener("click", () => pindah(-1));
// Mushaf dibaca dari kanan ke kiri: panah kiri / geser ke kanan = halaman berikutnya.
document.addEventListener("keydown", e => {
  if ($("reader").hidden || mode !== "halaman" || e.target.closest?.("input,textarea")) return;
  if (e.key === "ArrowLeft") pindah(1); else if (e.key === "ArrowRight") pindah(-1);
});
let tundaUkur;
window.addEventListener("resize", () => { clearTimeout(tundaUkur); tundaUkur = setTimeout(() => { if (!$("reader").hidden && mode === "halaman") slotEl().forEach(paskanUkuran); }, 150); });
$("rClose").addEventListener("click", tutupMushaf);
$("rDoneTop").addEventListener("click", () => {
  konfirmasi = true; tombolKonfirmasi();
  if (mode === "halaman" && hal.skr !== hal.akhir) { hal.skr = hal.akhir; tampilHalaman(); }
  $("finishBox").hidden = false;
  const s = $("rScroll"); setTimeout(() => { s.scrollTop = s.scrollHeight; }, 50);
});
$("rConfirm").addEventListener("click", async e => {
  if (e.target.id === "rFinish") { konfirmasi = true; tombolKonfirmasi(); }
  else if (e.target.id === "rNo") { konfirmasi = false; tombolKonfirmasi(); }
  else if (e.target.id === "rYes" && membaca) {
    e.target.disabled = true; e.target.textContent = "Menyimpan…";
    if (await tandaiSelesai(membaca)) {
      const r = membaca;
      tutupMushaf();
      bukaKartu({ nama: me.nama, juz: r.juz, putaran: r.putaran, selesai: Date.now() }, acara);
    } else { $("rEndText").textContent = "Laporan gagal tersimpan. Coba lagi."; konfirmasi = false; tombolKonfirmasi(); }
  }
});

render();
if (!auth.currentUser) $("authView").hidden = false;

$("myList").addEventListener("click", e => {
  const id = e.target.dataset.kartu; if (!id) return;
  const r = mine.find(x => x._id === id);
  if (r) bukaKartu({ nama: me.nama, juz: r.juz, putaran: r.putaran, selesai: r.selesai }, acara);
});

/* ---------- tab masuk / daftar ---------- */
function tab(daftar) {
  $("loginForm").hidden = daftar; $("regForm").hidden = !daftar;
  $("tabMasuk").setAttribute("aria-pressed", String(!daftar)); $("tabDaftar").setAttribute("aria-pressed", String(daftar));
}
$("tabMasuk").addEventListener("click", () => tab(false));
$("tabDaftar").addEventListener("click", () => tab(true));

$("rNotice").addEventListener("click", e => { if (e.target.id === "rCoba") gantiMode("halaman"); });

import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { terapkanTema, WARNA_PRESET, hexValid, kelompok, tampilId, kodeAcak, idHadir, keCSV, bacaCSV, unduhBerkas, muatSkrip, KATEGORI, idDariWa, bersihkanNim, bersihkanKode, bacaTiket, mulaiPindai, URL_QR_LIB, inisial, PRODI } from "./common.js";
import { auth, db, configBelumDiisi, isAkunPeserta, rentangJuz, $, esc, lalu, setMsg, pesanError, kosongkanJuz, ringkas } from "./common.js";

let bacaan = [], peserta = [], acara = {}, unsub = [];
let sesiList = [], hadirList = [], qrKode = null;
let logoDraf;
let warnaDraf;  // undefined = tidak diubah, null = kembali ke bawaan, string = warna baru   // undefined = tidak diubah, null = dihapus, string = logo baru (data URL)

if (configBelumDiisi) $("cfgNote").hidden = false;

function tampil(mode) {
  $("loginView").hidden = mode !== "login";
  $("dash").hidden = mode !== "dash";
  $("who").hidden = mode !== "dash";
}

onAuthStateChanged(auth, async user => {
  unsub.forEach(f => f()); unsub = [];
  if (!$("screen").hidden) tutupLayar();
  if (!user) return tampil("login");
  if (isAkunPeserta(user)) { tampil("login"); return setMsg("lMsg", "Akun peserta tidak bisa membuka dasbor panitia.", "err"); }
  let admin = false, galat = null;
  const emailKecil = user.email.toLowerCase();
  try { admin = (await getDoc(doc(db, "admins", emailKecil))).exists(); } catch (e) { galat = e; }
  if (!admin) {
    await signOut(auth); tampil("login");
    if (galat?.code === "permission-denied")
      return setMsg("lMsg", `Database menolak pengecekan panitia. Pasang aturan Firestore dulu: Firebase Console → Firestore Database → Rules → tempel isi firestore.rules → Publish.`, "err");
    if (galat)
      return setMsg("lMsg", `Gagal memeriksa status panitia (${galat.code || "koneksi"}). Coba lagi sebentar.`, "err");
    return setMsg("lMsg", `${emailKecil} belum ada di koleksi "admins". Di Firestore, buat dokumen dengan Document ID persis "${emailKecil}" di dalam koleksi "admins".`, "err");
  }
  $("whoEmail").textContent = user.email;
  tampil("dash");
  unsub.push(onSnapshot(collection(db, "bacaan"), s => { bacaan = s.docs.map(d => ({ ...d.data(), _id: d.id })); render(); }));
  unsub.push(onSnapshot(collection(db, "peserta"), s => { peserta = s.docs.map(d => d.data()); render(); }));
  unsub.push(onSnapshot(collection(db, "sesi"), s => { sesiList = s.docs.map(d => ({ ...d.data(), kode: d.id })).sort((a, b) => (b.dibuat || 0) - (a.dibuat || 0)); renderHadir(); }));
  unsub.push(onSnapshot(collection(db, "hadir"), s => { hadirList = s.docs.map(d => ({ ...d.data(), _id: d.id })); renderHadir(); }));
  unsub.push(onSnapshot(doc(db, "pengaturan", "acara"), s => {
    acara = s.exists() ? s.data() : {};
    $("evName").textContent = acara.nama || "Khatmil Qur'an";
    $("scName").textContent = acara.nama || "Khatmil Qur'an";
    renderLayar();
    if (document.activeElement !== $("sName")) $("sName").value = acara.nama || "";
    if (document.activeElement !== $("sSub")) $("sSub").value = acara.sub || "";
    if (document.activeElement !== $("sTagar")) $("sTagar").value = acara.tagar || "";
    $("evLogo").hidden = $("scLogo").hidden = !acara.logo;
    if (acara.logo) $("evLogo").src = $("scLogo").src = acara.logo;
    if (logoDraf === undefined) pratinjauLogo(acara.logo || null);
    if (warnaDraf === undefined) tampilWarna(acara.warna || null);
  }));
});

function render() {
  const R = ringkas(bacaan);
  $("kCount").textContent = R.khatam;
  $("scKhatam").textContent = R.khatam;
  $("scJuz").textContent = R.juzSelesai;
  $("tJuz").textContent = R.juzSelesai;
  $("tBaca").textContent = R.dibaca;
  $("tPeserta").textContent = peserta.length;
  $("tPembaca").textContent = R.pembaca;
  const sisa = 30 - (R.juzSelesai % 30);
  // Khatam dihitung per putaran: satu putaran terhitung khatam hanya jika Juz 1–30 semuanya selesai.
  // Yang dipantau di sini adalah putaran tertua yang belum lengkap, karena itulah khatam berikutnya.
  const belum = R.putaranList.filter(p => R.selesaiDi(p) < 30);
  const pj = belum[0] ?? (R.putaranList.length ? R.putaranList[R.putaranList.length - 1] + 1 : 1);
  const pjSelesai = R.selesaiDi(pj), pct = Math.round(pjSelesai / 30 * 100);
  $("gaugeArc").setAttribute("stroke-dasharray", `${(pct / 100 * 314.16).toFixed(1)} 314.16`);
  $("gaugeVal").textContent = pct + "%";
  $("gaugeLbl").textContent = "putaran " + pj;
  const kurang = (p => { const per = R.per[p] || {}, dibaca = [], kosong = []; for (let j = 1; j <= 30; j++) { const r = per[j]; if (!r) kosong.push(j); else if (r.status !== "selesai") dibaca.push(r); } return { dibaca, kosong }; })(pj);
  const daftarJuz = a => a.length > 6 ? a.slice(0, 6).join(", ") + ` dan ${a.length - 6} lagi` : a.join(", ");
  $("kNext").textContent = R.juzSelesai === 0 ? "Belum ada juz yang dilaporkan selesai."
    : `Khatam ke-${R.khatam + 1} = putaran ${pj}, sudah ${pjSelesai}/30 juz.`
      + (kurang.dibaca.length ? ` Masih dibaca: juz ${daftarJuz(kurang.dibaca.map(r => r.juz))}.` : "")
      + (kurang.kosong.length ? ` Belum diambil: juz ${daftarJuz(kurang.kosong)}.` : "")
      + ` Total ${R.juzSelesai} juz dibaca dari semua putaran.`;

  // progres per putaran
  const daftar = R.putaranList.length ? R.putaranList : [1];
  $("rounds").innerHTML = daftar.map(p => {
    const per = R.per[p] || {};
    let cells = "";
    for (let j = 1; j <= 30; j++) { const r = per[j]; cells += `<i class="${r ? (r.status === "selesai" ? "done" : "busy") : ""}" title="Juz ${j}${r ? " · " + esc(r.nama) : ""}"></i>`; }
    const n = R.selesaiDi(p);
    const tunggu = [], kosong = [];
    for (let j = 1; j <= 30; j++) { if (!per[j]) kosong.push(j); else if (per[j].status !== "selesai") tunggu.push(`${j} (${esc(String(per[j].nama).replace(/^Contoh:\s*/, ""))})`); }
    const ket = n === 30 ? "" : `<div class="round-ket">${tunggu.length ? `Masih dibaca: juz ${tunggu.join(", ")}` : ""}${tunggu.length && kosong.length ? " · " : ""}${kosong.length ? `Belum diambil: juz ${kosong.join(", ")}` : ""}</div>`;
    return `<div class="round"><span>Putaran ${p}</span><div class="strip">${cells}</div><span class="num" style="text-align:right">${n === 30 ? "<b>Khatam ✓</b>" : n + "/30"}</span>${ket}</div>`;
  }).join("");

  // sedang dibaca
  const sibuk = bacaan.filter(r => r.status === "membaca").sort((a, b) => (a.ambil || 0) - (b.ambil || 0));
  $("busyList").innerHTML = sibuk.length ? sibuk.map(r =>
    `<li><span><b>${esc(r.nama)}</b> · Juz ${r.juz} <span class="muted">(putaran ${r.putaran}) · ${esc(tampilId(r))} · diambil ${lalu(r.ambil)}</span></span><button class="btn-ghost btn-sm" data-release="${esc(r._id)}" type="button">Lepaskan</button></li>`).join("")
    : `<li class="empty">Tidak ada juz yang sedang dibaca.</li>`;

  // per prodi
  const prodi = {};
  bacaan.filter(r => r.status === "selesai").forEach(r => { const k = (r.prodi || "Lainnya").trim(); prodi[k] = (prodi[k] || 0) + 1; });
  const urut = Object.entries(prodi).sort((a, b) => b[1] - a[1]);
  const maks = urut[0]?.[1] || 1;
  $("prodiList").innerHTML = urut.length ? urut.map(([k, v]) =>
    `<li><span>${esc(k)}</span><span class="meter"><span style="width:${v / maks * 100}%"></span></span><b class="num">${v}</b></li>`).join("")
    : `<li class="empty">Belum ada juz yang selesai.</li>`;

  renderPeserta();
  renderLayar();
  renderZona();
}

function renderPeserta() {
  const q = $("search").value.trim().toLowerCase();
  const hitung = {};
  bacaan.forEach(r => { if (r.status === "selesai") hitung[r.nim] = (hitung[r.nim] || 0) + 1; });
  const rows = peserta
    .filter(p => !q || `${p.nama} ${p.nim} ${tampilId(p)} ${kelompok(p)} ${p.instansi || ""}`.toLowerCase().includes(q))
    .sort((a, b) => (hitung[b.nim] || 0) - (hitung[a.nim] || 0) || a.nama.localeCompare(b.nama));
  const belum = peserta.filter(p => !p.uid).length;
  $("pRingkas").textContent = peserta.length ? `${peserta.length} peserta${belum ? ` · ${belum} belum pernah masuk` : ""}` : "";
  $("pesertaBody").innerHTML = rows.length ? rows.map(p => {
    const aktif = p.aktif ? bacaan.find(r => r._id === p.aktif) : null;
    return `<tr><td class="wrap">${esc(p.nama)}</td><td class="num">${esc(tampilId(p))}</td><td>${esc(kelompok(p))}${p.instansi ? `<span class="muted"> · ${esc(p.instansi)}</span>` : ""}</td><td class="num">${hitung[p.nim] || 0}</td>
      <td>${aktif ? `<span class="pill busy">Membaca juz ${aktif.juz}</span>` : !p.uid ? `<span class="pill" style="background:var(--sky)">Belum masuk</span>` : `<span class="muted">—</span>`}</td><td>${p.hp ? `${esc(p.hp)} <a class="btn-link" href="${tautanWaTiket(p)}" target="_blank" rel="noopener">Kirim tiket</a>` : `<span class="muted">—</span>`}</td>
      <td><button class="btn-link" data-hapus-peserta="${esc(p.nim)}" type="button">Hapus</button></td></tr>`;
  }).join("") : `<tr><td colspan="7" class="empty">${peserta.length ? "Tidak ada yang cocok." : "Belum ada peserta terdaftar."}</td></tr>`;
}

/* ---------- aksi ---------- */
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("lEmail").value.trim(), pass = $("lPass").value;
  if (!email || !pass) return setMsg("lMsg", "Isi email dan kata sandi.", "err");
  setMsg("lMsg", "Memeriksa…");
  try { await signInWithEmailAndPassword(auth, email, pass); setMsg("lMsg", ""); $("loginForm").reset(); }
  catch (err) { setMsg("lMsg", pesanError(err), "err"); }
});
$("logout").addEventListener("click", () => signOut(auth));
$("search").addEventListener("input", renderPeserta);

$("busyList").addEventListener("click", async e => {
  const id = e.target.dataset.release; if (!id) return;
  if (!e.target.dataset.armed) { e.target.dataset.armed = "1"; e.target.textContent = "Yakin lepaskan?"; return; }
  e.target.disabled = true;
  try { await kosongkanJuz(id); } catch (err) { e.target.textContent = err?.code === "sudah-selesai" ? "Sudah selesai" : "Gagal"; }
});

$("setForm").addEventListener("submit", async e => {
  e.preventDefault();
  const isi = { nama: $("sName").value.trim(), sub: $("sSub").value.trim(), tagar: $("sTagar").value.trim(), logo: logoDraf === undefined ? (acara.logo || null) : logoDraf, warna: warnaDraf === undefined ? (acara.warna || null) : warnaDraf };
  setMsg("sMsg", "Menyimpan…");
  try { await setDoc(doc(db, "pengaturan", "acara"), isi); logoDraf = undefined; warnaDraf = undefined; setMsg("sMsg", "Tersimpan", "ok"); }
  catch (err) { setMsg("sMsg", pesanError(err), "err"); }
});

$("screenBtn").addEventListener("click", bukaLayar);
$("screenExit").addEventListener("click", tutupLayar);
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("screen").hidden) tutupLayar(); });

$("csvBtn").addEventListener("click", () => {
  const sel = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const fmt = t => t ? new Date(t).toLocaleString("id-ID") : "";
  const baris = [["Putaran", "Juz", "Rentang", "Nama", "NIM / WhatsApp", "Kelompok", "Status", "Diambil", "Selesai"]]
    .concat([...bacaan].sort((a, b) => a.putaran - b.putaran || a.juz - b.juz)
      .map(r => [r.putaran, r.juz, rentangJuz(r.juz), r.nama, tampilId(r), r.prodi, r.status, fmt(r.ambil), fmt(r.selesai)]));
  const blob = new Blob(["﻿" + baris.map(b => b.map(sel).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const nama = `rekap-khatmil-quran-${new Date().toISOString().slice(0, 10)}.csv`;
  if (globalThis.KHATAM_SIMPAN) { globalThis.KHATAM_SIMPAN(blob, nama).catch(() => {}); return; }   // versi uji coba di Claude
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nama;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

/* ---------- logo acara ---------- */
function pratinjauLogo(src) {
  $("sLogoPrev").hidden = !src; $("sLogoKosong").hidden = !!src; $("sLogoHapus").hidden = !src;
  if (src) $("sLogoPrev").src = src; else $("sLogoPrev").removeAttribute("src");
}
// Logo disimpan langsung di Firestore sebagai gambar kecil (tanpa Firebase Storage),
// jadi diperkecil dulu agar ukurannya jauh di bawah batas 1 MB per dokumen.
async function kecilkanLogo(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, gagal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = gagal; i.src = url; });
    const maks = 600, w0 = img.naturalWidth || 600, h0 = img.naturalHeight || 600;
    const s = Math.min(1, maks / Math.max(w0, h0));
    const cv = document.createElement("canvas"); cv.width = Math.round(w0 * s); cv.height = Math.round(h0 * s);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    let hasil = cv.toDataURL("image/png");
    if (hasil.length > 350000) hasil = cv.toDataURL("image/webp", 0.9);
    if (hasil.length > 700000) throw new Error("terlalu besar");
    return hasil;
  } finally { URL.revokeObjectURL(url); }
}
$("sLogo").addEventListener("change", async e => {
  const f = e.target.files[0]; if (!f) return;
  setMsg("sMsg", "Memproses logo…");
  try { logoDraf = await kecilkanLogo(f); pratinjauLogo(logoDraf); setMsg("sMsg", "Logo siap. Tekan Simpan pengaturan.", "ok"); }
  catch { setMsg("sMsg", "Logo tidak bisa dibaca atau terlalu besar. Coba PNG/JPG lain.", "err"); }
  e.target.value = "";
});
$("sLogoHapus").addEventListener("click", () => { logoDraf = null; pratinjauLogo(null); setMsg("sMsg", "Logo akan dihapus setelah disimpan."); });

/* ---------- warna tema ---------- */
function tampilWarna(hex) {
  terapkanTema(hex);
  $("sWarnaHex").textContent = hexValid(hex) ? hex.toUpperCase() : "Bawaan (hijau)";
  if (hexValid(hex)) $("sWarna").value = hex;
  $("sWarnaReset").hidden = !hexValid(hex);
  document.querySelectorAll("#sWarnaPreset button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.warna === (hex || "").toLowerCase())));
}
$("sWarnaPreset").innerHTML = WARNA_PRESET.map(([n, h]) =>
  `<button type="button" class="swatch" data-warna="${h}" title="${n}" aria-label="${n}" aria-pressed="false" style="--sw:${h}"><span>${n}</span></button>`).join("");
function pilihWarna(hex) { warnaDraf = hex; tampilWarna(hex); setMsg("sMsg", "Warna dipilih. Tekan Simpan pengaturan."); }
$("sWarnaPreset").addEventListener("click", e => { const b = e.target.closest("[data-warna]"); if (b) pilihWarna(b.dataset.warna); });
$("sWarna").addEventListener("input", e => pilihWarna(e.target.value.toLowerCase()));
$("sWarnaReset").addEventListener("click", () => pilihWarna(null));

/* ---------- kehadiran ---------- */
const CARA = { scan: "Scan QR", tiket: "Tiket", manual: "Manual", impor: "Impor" };
const CARA_PANJANG = { scan: "Peserta scan QR sesi", tiket: "Panitia scan tiket", manual: "Dicatat manual panitia", impor: "Impor CSV" };
const fmtWaktu = t => t ? new Date(t).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const tautanHadir = kode => new URL("./", location.href).href + "?hadir=" + kode;

function renderHadir() {
  const jumlah = {}; hadirList.forEach(h => { jumlah[h.sesi] = (jumlah[h.sesi] || 0) + 1; });
  $("sesiList").innerHTML = sesiList.length ? sesiList.map(x => `
    <div class="sesi ${x.aktif ? "buka" : ""}">
      <div class="atas"><b>${esc(x.nama)}</b><span class="pill ${x.aktif ? "done" : ""}" style="${x.aktif ? "" : "background:var(--surface)"}">${x.aktif ? "Dibuka" : "Ditutup"}</span></div>
      <div class="row" style="justify-content:space-between"><span class="kode num">${x.kode}</span><span class="num" style="font-weight:600">${jumlah[x.kode] || 0} hadir</span></div>
      <div class="row" style="gap:6px">
        <button class="btn btn-sm" data-qr="${x.kode}" type="button">Tampilkan QR</button>
        <button class="btn-ghost btn-sm" data-toggle="${x.kode}" type="button">${x.aktif ? "Tutup check-in" : "Buka lagi"}</button>
      </div>
    </div>`).join("") : `<p class="empty">Belum ada sesi. Buat sesi pertama di atas, misalnya "Ushuluddin Mengaji" dan "Puncak Milad".</p>`;

  const pilih = $("hFilter").value;
  $("hFilter").innerHTML = `<option value="">Semua sesi</option>` + sesiList.map(x => `<option value="${x.kode}">${esc(x.nama)} (${x.kode})</option>`).join("");
  $("hFilter").value = sesiList.some(x => x.kode === pilih) ? pilih : "";

  const q = $("hCari").value.trim().toLowerCase(), f = $("hFilter").value;
  const baris = barisHadir(f).filter(h => !q || `${h.nama} ${h.nim} ${tampilId(h)} ${h.prodi} ${h.instansi || ""}`.toLowerCase().includes(q));
  const namaSesi = Object.fromEntries(sesiList.map(x => [x.kode, x.nama]));
  $("hJumlah").textContent = `· ${baris.length} orang`;
  $("hBody").innerHTML = baris.length ? baris.map(h => `<tr>
      <td class="num">${fmtWaktu(h.waktu)}</td><td class="wrap">${esc(h.nama)}</td><td class="num">${esc(tampilId(h))}</td>
      <td>${esc(h.prodi || "")}${h.instansi ? `<span class="muted"> · ${esc(h.instansi)}</span>` : ""}</td>
      <td>${esc(namaSesi[h.sesi] || h.namaSesi || h.sesi)}</td><td><span class="pill ${h.sumber === "impor" ? "busy" : "done"}">${CARA[h.sumber] || h.sumber}</span></td>
      <td><button class="btn-link" data-hapus="${esc(h._id)}" type="button">Hapus</button></td></tr>`).join("")
    : `<tr><td colspan="7" class="empty">${hadirList.length ? "Tidak ada yang cocok." : "Belum ada yang check-in."}</td></tr>`;
  if (qrKode) $("qrJumlah").textContent = jumlah[qrKode] || 0;
  renderLayar();
  renderZona();
}
const barisHadir = f => hadirList.filter(h => !f || h.sesi === f).sort((a, b) => (b.waktu || 0) - (a.waktu || 0));
$("hFilter").addEventListener("change", renderHadir);
$("hCari").addEventListener("input", renderHadir);

$("sesiForm").addEventListener("submit", async e => {
  e.preventDefault();
  const nama = $("sesiNama").value.trim();
  if (!nama) return setMsg("hAdmMsg", "Isi nama sesi dulu.", "err");
  let kode = kodeAcak();
  while (sesiList.some(x => x.kode === kode)) kode = kodeAcak();
  try { await setDoc(doc(db, "sesi", kode), { nama, aktif: true, dibuat: Date.now() }); $("sesiNama").value = ""; setMsg("hAdmMsg", `Sesi "${nama}" dibuat dengan kode ${kode}.`, "ok"); }
  catch (err) { setMsg("hAdmMsg", pesanError(err), "err"); }
});

$("sesiList").addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.qr) return tampilQR(b.dataset.qr);
  if (b.dataset.toggle) {
    const x = sesiList.find(y => y.kode === b.dataset.toggle); if (!x) return;
    try { await updateDoc(doc(db, "sesi", x.kode), { aktif: !x.aktif }); } catch (err) { setMsg("hAdmMsg", pesanError(err), "err"); }
  }
});

$("hBody").addEventListener("click", async e => {
  const id = e.target.dataset.hapus; if (!id) return;
  if (!e.target.dataset.armed) { e.target.dataset.armed = "1"; e.target.textContent = "Yakin hapus?"; return; }
  try { await deleteDoc(doc(db, "hadir", id)); } catch (err) { setMsg("hAdmMsg", pesanError(err), "err"); }
});

async function tampilQR(kode) {
  const x = sesiList.find(y => y.kode === kode); if (!x) return;
  qrKode = kode;
  $("qrAcara").textContent = acara.nama || "Khatmil Qur'an";
  $("qrSesi").textContent = x.nama;
  $("qrKode").textContent = kode;
  $("qrGambar").innerHTML = `<span class="muted">Membuat QR…</span>`;
  $("qrLayar").hidden = false;
  document.documentElement.requestFullscreen?.().catch(() => {});
  renderHadir();
  try {
    await muatSkrip(URL_QR_LIB);
    const qr = window.qrcode(0, "M"); qr.addData(tautanHadir(kode)); qr.make();
    $("qrGambar").innerHTML = qr.createSvgTag({ cellSize: 8, margin: 1, scalable: true });
  } catch { $("qrGambar").innerHTML = `<span class="muted" style="padding:20px;text-align:center">QR tidak bisa dibuat (cek koneksi). Peserta tetap bisa check-in dengan mengetik kode di bawah.</span>`; }
}
function tutupQR() { $("qrLayar").hidden = true; qrKode = null; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
$("qrTutup").addEventListener("click", tutupQR);
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("qrLayar").hidden) tutupQR(); });

/* unduh daftar hadir */
$("hCsv").addEventListener("click", async () => {
  const f = $("hFilter").value, namaSesi = Object.fromEntries(sesiList.map(x => [x.kode, x.nama]));
  const baris = [["Sesi", "Kode sesi", "Waktu", "Nama", "NIM / WhatsApp", "Kategori", "Prodi / kelompok", "Instansi", "WhatsApp", "Cara"]]
    .concat(barisHadir(f).reverse().map(h => [namaSesi[h.sesi] || h.namaSesi || h.sesi, h.sesi, fmtWaktu(h.waktu), h.nama, tampilId(h), KATEGORI[h.kategori] || h.kategori || "", h.prodi || "", h.instansi || "", h.hp || "", CARA_PANJANG[h.sumber] || h.sumber]));
  const sesiNama = f ? (namaSesi[f] || f).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "semua-sesi";
  try { await unduhBerkas(new Blob([keCSV(baris)], { type: "text/csv;charset=utf-8" }), `kehadiran-${sesiNama}-${new Date().toISOString().slice(0, 10)}.csv`); }
  catch { setMsg("hAdmMsg", "Unduhan dibatalkan.", "err"); }
});

/* template & impor */
const KOLOM = ["nama", "nim_atau_wa", "kategori", "prodi", "instansi", "waktu", "kode_sesi"];
$("hTemplate").addEventListener("click", async () => {
  const kode = $("hFilter").value || sesiList[0]?.kode || "";
  const baris = [KOLOM,
    ["Contoh Mahasiswa", "11210340000123", "mahasiswa", "Ilmu Hadis", "", "2026-11-02 08:15", kode],
    ["Contoh Dosen", "081234567890", "dosen", "", "", "2026-11-02 08:20", kode],
    ["Contoh Peserta Luar", "081298765432", "umum", "", "Alumni 2015", "", kode]];
  try { await unduhBerkas(new Blob([keCSV(baris)], { type: "text/csv;charset=utf-8" }), "template-kehadiran.csv"); }
  catch { setMsg("hAdmMsg", "Unduhan dibatalkan.", "err"); }
});

$("hImpor").addEventListener("change", async e => {
  const file = e.target.files[0]; e.target.value = "";
  if (!file) return;
  setMsg("hAdmMsg", "Membaca berkas…");
  let rows;
  try { rows = bacaCSV(await file.text()); } catch { return setMsg("hAdmMsg", "Berkas tidak bisa dibaca. Simpan sebagai CSV lalu coba lagi.", "err"); }
  if (rows.length < 2) return setMsg("hAdmMsg", "Berkas kosong. Isi data di bawah baris judul kolom.", "err");
  const kepala = rows[0].map(k => k.trim().toLowerCase().replace(/\s+/g, "_"));
  const ix = n => kepala.indexOf(n);
  if (ix("nama") < 0) return setMsg("hAdmMsg", 'Kolom "nama" tidak ditemukan. Pakai template dari tombol "Unduh template".', "err");
  const bawaan = $("hFilter").value;
  const ada = new Set(hadirList.map(h => h._id)), kodeAda = new Set(sesiList.map(x => x.kode));
  const tulis = [], lewat = [];
  let sudah = 0;
  rows.slice(1).forEach((r, i) => {
    const ambil = n => (ix(n) >= 0 ? String(r[ix(n)] ?? "") : "").trim();
    const noBaris = i + 2, nama = ambil("nama");
    if (!nama || /^contoh\b/i.test(nama)) { if (!nama) lewat.push(`baris ${noBaris}: nama kosong`); return; }
    const kode = bersihkanKode(ambil("kode_sesi")) || bawaan;
    if (!kode) return lewat.push(`baris ${noBaris}: kode_sesi kosong (atau pilih sesi di daftar hadir)`);
    if (!kodeAda.has(kode)) return lewat.push(`baris ${noBaris}: sesi ${kode} tidak ada`);
    let kat = ambil("kategori").toLowerCase();
    kat = kat.startsWith("dos") ? "dosen" : (kat.startsWith("umum") || kat.startsWith("luar") || kat.startsWith("peserta")) ? "umum" : "mahasiswa";
    const idMentah = ambil("nim_atau_wa");
    let id = kat === "mahasiswa" ? bersihkanNim(idMentah).toLowerCase() : idDariWa(idMentah);
    if (!id) id = "manual-" + nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    const docId = idHadir(kode, id);
    if (ada.has(docId)) { sudah++; return; }
    ada.add(docId);
    const t = Date.parse(ambil("waktu").replace(" ", "T"));
    const sesi = sesiList.find(x => x.kode === kode);
    tulis.push([docId, { sesi: kode, namaSesi: sesi.nama, nim: id, nama, kategori: kat,
      prodi: kat === "mahasiswa" ? (ambil("prodi") || "Mahasiswa") : KATEGORI[kat], instansi: ambil("instansi"),
      hp: kat === "mahasiswa" ? "" : idMentah, uid: null, waktu: isNaN(t) ? Date.now() : t, sumber: "impor" }]);
  });
  try {
    for (let i = 0; i < tulis.length; i += 400) {
      const b = writeBatch(db);
      tulis.slice(i, i + 400).forEach(([id, d]) => b.set(doc(db, "hadir", id), d));
      await b.commit();
    }
    const info = [`${tulis.length} kehadiran diimpor`];
    if (sudah) info.push(`${sudah} sudah tercatat sebelumnya`);
    if (lewat.length) info.push(`${lewat.length} dilewati (${lewat.slice(0, 3).join("; ")}${lewat.length > 3 ? "; …" : ""})`);
    setMsg("hAdmMsg", info.join(" · ") + ".", lewat.length && !tulis.length ? "err" : "ok");
  } catch (err) { setMsg("hAdmMsg", "Impor gagal: " + pesanError(err), "err"); }
});

/** Pesan WhatsApp dari panitia ke peserta berisi tautan tiket. */
function tautanWaTiket(p) {
  const nomor = idDariWa(p.hp).replace(/^wa/, "");
  const link = new URL("./", location.href).href + "?tiket=1";
  const sapa = `Assalamu'alaikum ${String(p.nama).replace(/^Contoh:\s*/, "")}.`, idTeks = p.kategori && p.kategori !== "mahasiswa" ? "nomor WhatsApp" : "NIM";
  const teks = p.uid
    ? `${sapa} Pendaftaran ${acara.nama || "Khatmil Qur'an"} sudah kami terima.\n\nBuka tiket QR-mu di: ${link}\n(masuk dengan ${idTeks} dan PIN). Tunjukkan QR tiket ke panitia saat datang.`
    : `${sapa} Kamu sudah kami daftarkan sebagai peserta ${acara.nama || "Khatmil Qur'an"}, tidak perlu mendaftar lagi.\n\n1. Buka ${link}\n2. Pilih "Pertama kali masuk"\n3. Isi ${idTeks} ${tampilId(p)}, nomor WhatsApp ini, lalu buat PIN.\n\nTiket QR-mu langsung muncul. Tunjukkan ke panitia saat datang.`;
  return `https://wa.me/${nomor}?text=${encodeURIComponent(teks)}`;
}

/* ---------- panitia memindai tiket peserta ---------- */
let hentikanScan = null, terakhir = { teks: "", t: 0 }, tutupHasil = null;
function sesiTerbuka() { return sesiList.filter(x => x.aktif); }
function isiPilihanSesi() {
  const buka = sesiTerbuka(), skr = $("sSesi").value || $("hFilter").value;
  $("sSesi").innerHTML = buka.length ? buka.map(x => `<option value="${x.kode}">Catat ke: ${esc(x.nama)}</option>`).join("") : `<option value="">Belum ada sesi yang dibuka</option>`;
  if (buka.some(x => x.kode === skr)) $("sSesi").value = skr;
}
function tampilHasil(jenis, judul, detail) {
  const el = $("sHasil");
  el.className = "s-hasil " + jenis; el.hidden = false;
  el.innerHTML = `<span class="ikon">${jenis === "ok" ? "✓" : jenis === "warn" ? "!" : "✕"}</span><b>${esc(judul)}</b><span>${esc(detail || "")}</span>`;
  clearTimeout(tutupHasil); tutupHasil = setTimeout(() => { el.hidden = true; }, jenis === "ok" ? 1800 : 2800);
  try { navigator.vibrate?.(jenis === "ok" ? 60 : [80, 60, 80]); } catch {}
}
async function prosesTiket(teks, manual = false) {
  const kode = $("sSesi").value;
  if (!kode) return tampilHasil("err", "Belum ada sesi dibuka", "Buat atau buka sesi dulu di bagian Kehadiran.");
  const sesi = sesiList.find(x => x.kode === kode);
  const tk = bacaTiket(teks);
  let id;
  if (tk) id = tk.id;
  else if (manual) { const t = teks.trim(); id = /^(\+?62|0)?8\d{7,}$/.test(t.replace(/[\s-]/g, "")) ? idDariWa(t) : bersihkanNim(t).toLowerCase(); }
  else return tampilHasil("err", "Bukan QR tiket", "Minta peserta membuka Tiket saya di aplikasi.");
  if (!id) return tampilHasil("err", "Isian tidak dikenali", "Ketik NIM atau nomor WhatsApp peserta.");
  let p = peserta.find(x => x.nim === id);
  if (!p) { try { const d = await getDoc(doc(db, "peserta", id)); if (d.exists()) p = d.data(); } catch {} }
  if (!p) return tampilHasil("err", "Belum terdaftar", `${manual ? id : "Tiket ini"} tidak ditemukan. Minta peserta mendaftar dulu.`);
  if (tk && p.tiket !== tk.token) return tampilHasil("err", "Tiket tidak sah", `QR tidak cocok dengan tiket ${p.nama}.`);
  const docId = idHadir(kode, p.nim);
  const sudah = hadirList.find(h => h._id === docId);
  if (sudah) return tampilHasil("warn", p.nama, `Sudah tercatat hadir pukul ${new Date(sudah.waktu).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}.`);
  try {
    await setDoc(doc(db, "hadir", docId), { sesi: kode, namaSesi: sesi.nama, nim: p.nim, nama: p.nama, kategori: p.kategori || "mahasiswa", prodi: kelompok(p),
      instansi: p.instansi || "", hp: p.hp || "", uid: p.uid || null, waktu: Date.now(), sumber: tk ? "tiket" : "manual" });
    tampilHasil("ok", p.nama, `${kelompok(p)} · hadir di ${sesi.nama}`);
  } catch (err) { tampilHasil("err", "Gagal mencatat", pesanError(err)); }
}
async function bukaScanTiket() {
  isiPilihanSesi();
  $("sTiket").hidden = false; $("sHasil").hidden = true; $("sMsg").textContent = "Membuka kamera…";
  try {
    hentikanScan = await mulaiPindai($("sVideo"), async teks => {
      const kini = Date.now();
      if (teks === terakhir.teks && kini - terakhir.t < 3500) return;     // QR yang sama masih di depan kamera
      terakhir = { teks, t: kini };
      await prosesTiket(teks);
    });
    $("sMsg").textContent = "Arahkan kamera ke QR tiket peserta";
  } catch (e) {
    $("sMsg").textContent = globalThis.KHATAM_DEMO ? "Pratinjau di Claude tidak boleh membuka kamera. Coba dengan mengetik NIM/WA di bawah."
      : e?.name === "NotAllowedError" ? "Izin kamera ditolak. Izinkan kamera, atau ketik NIM/WA di bawah." : "Kamera tidak bisa dibuka. Ketik NIM/WA peserta di bawah.";
  }
}
function tutupScanTiket() { hentikanScan?.(); hentikanScan = null; $("sTiket").hidden = true; }
$("hScanTiket").addEventListener("click", bukaScanTiket);
$("sSelesai").addEventListener("click", tutupScanTiket);
$("sManual").addEventListener("submit", async e => { e.preventDefault(); const v = $("sId").value.trim(); if (!v) return; await prosesTiket(v, true); $("sId").value = ""; });
document.addEventListener("visibilitychange", () => { if (document.hidden && !$("sTiket").hidden) tutupScanTiket(); });

/* ---------- layar acara (proyektor): tab check-in, juz dibaca, khatam ---------- */
let layarTab = "hadir", layarSesi = null, putarTimer = null, sudahLihat = null, sambutTimer = null, qrLayarKode = null;
const sorot = new Map();     // id kehadiran -> sampai kapan disorot sebagai "baru"
const namaBersih = n => String(n || "").replace(/^Contoh:\s*/, "");
const namaPendek = n => { const k = namaBersih(n).split(/\s+/); return k.find(w => !/\.$/.test(w)) || k[0] || ""; };
const jam = t => t ? new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";
function bukaLayar() { $("screen").hidden = false; document.documentElement.requestFullscreen?.().catch(() => {}); sudahLihat = null; layarSesi = null; qrLayarKode = null; gantiTab(layarTab); }
function tutupLayar() {
  $("screen").hidden = true; clearInterval(putarTimer); putarTimer = null; $("scPutar").setAttribute("aria-pressed", "false");
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function gantiTab(t) {
  layarTab = t;
  document.querySelectorAll(".layar-tab [data-tab]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tab === t)));
  document.querySelectorAll("#screen [data-panel]").forEach(p => { p.hidden = p.dataset.panel !== t; });
  renderLayar();
}
document.querySelector(".layar-tab").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) gantiTab(b.dataset.tab); });
$("scSesi").addEventListener("change", e => { layarSesi = e.target.value; qrLayarKode = null; sudahLihat = null; renderLayar(); });
$("scPutar").addEventListener("click", () => {
  const nyala = !putarTimer;
  $("scPutar").setAttribute("aria-pressed", String(nyala));
  if (nyala) { const urut = ["hadir", "juz", "khatam"]; putarTimer = setInterval(() => gantiTab(urut[(urut.indexOf(layarTab) + 1) % urut.length]), 15000); }
  else { clearInterval(putarTimer); putarTimer = null; }
});

function itemFeed(nama, ket, waktu, baru) {
  return `<li class="${baru ? "baru" : ""}"><span class="avatar">${esc(inisial(nama))}</span><div style="min-width:0"><b>${esc(namaBersih(nama))}</b><span>${esc(ket)}</span></div><span class="wkt">${jam(waktu)}</span></li>`;
}
async function renderLayar() {
  if ($("screen").hidden) return;
  $("scSub").textContent = acara.sub || "";
  const kini = Date.now();

  // --- check-in ---
  if (layarSesi === null) layarSesi = sesiList.find(x => x.aktif)?.kode || "";
  $("scSesi").innerHTML = `<option value="">Semua sesi</option>` + sesiList.map(x => `<option value="${x.kode}">${esc(x.nama)}${x.aktif ? "" : " (ditutup)"}</option>`).join("");
  $("scSesi").value = sesiList.some(x => x.kode === layarSesi) ? layarSesi : "";
  const sesi = sesiList.find(x => x.kode === layarSesi);
  const rows = hadirList.filter(h => !layarSesi || h.sesi === layarSesi).sort((a, b) => (b.waktu || 0) - (a.waktu || 0));
  $("scHadir").textContent = rows.length;
  $("scHadirKet").textContent = sesi ? sesi.nama : "semua sesi";
  const baru = sudahLihat ? rows.filter(h => !sudahLihat.has(h._id)) : [];
  sudahLihat = new Set(hadirList.map(h => h._id));
  baru.forEach(h => sorot.set(h._id, kini + 8000));
  $("scFeed").innerHTML = rows.slice(0, 12).map(h => itemFeed(h.nama, [h.prodi, h.instansi].filter(Boolean).join(" · "), h.waktu, (sorot.get(h._id) || 0) > kini)).join("")
    || `<li style="grid-template-columns:1fr"><span>Belum ada yang check-in. Nama peserta akan muncul di sini begitu mereka check-in.</span></li>`;
  if (baru.length) {
    const h = baru[0], lain = baru.length - 1;
    $("scSambut").innerHTML = `<small>Selamat datang</small>${esc(namaBersih(h.nama))}${lain ? ` <small style="display:inline">dan ${lain} lainnya</small>` : ""}`;
    $("scSambut").hidden = false; clearTimeout(sambutTimer); sambutTimer = setTimeout(() => { $("scSambut").hidden = true; }, 5000);
  }
  $("scQrBox").hidden = !(sesi && sesi.aktif);
  if (sesi && sesi.aktif && qrLayarKode !== sesi.kode) {
    qrLayarKode = sesi.kode; $("scKode").textContent = sesi.kode;
    try { await muatSkrip(URL_QR_LIB); const qr = window.qrcode(0, "M"); qr.addData(tautanHadir(sesi.kode)); qr.make(); $("scQr").innerHTML = qr.createSvgTag({ cellSize: 6, margin: 1, scalable: true }); }
    catch { $("scQr").innerHTML = ""; }
  }

  // --- juz dibaca ---
  const R = ringkas(bacaan);
  const belum = R.putaranList.filter(p => R.selesaiDi(p) < 30);
  const pj = belum[0] ?? (R.putaranList.length ? R.putaranList[R.putaranList.length - 1] + 1 : 1);
  const per = R.per[pj] || {};
  let html = "", dibacaPj = 0;
  for (let j = 1; j <= 30; j++) {
    const r = per[j], cls = r ? (r.status === "selesai" ? "done" : "busy") : "";
    if (r && r.status !== "selesai") dibacaPj++;
    html += `<div class="${cls}"><b>${j}</b><span>${r ? esc(namaPendek(r.nama)) : "&nbsp;"}</span></div>`;
  }
  $("scGrid").innerHTML = html;
  $("scPutaran").textContent = `Putaran ${pj}`;
  $("scPutaranKet").textContent = `${R.selesaiDi(pj)}/30 selesai · ${dibacaPj} dibaca`;
  const selesai = bacaan.filter(r => r.status === "selesai").sort((a, b) => (b.selesai || 0) - (a.selesai || 0));
  $("scSelesai").innerHTML = selesai.slice(0, 10).map(r => itemFeed(r.nama, `Juz ${r.juz} · ${rentangJuz(r.juz)}`, r.selesai, kini - (r.selesai || 0) < 60000)).join("")
    || `<li style="grid-template-columns:1fr"><span>Belum ada juz yang selesai.</span></li>`;

  // --- khatam ---
  const pct = Math.round(R.selesaiDi(pj) / 30 * 100);
  $("scKhatam").textContent = R.khatam;
  $("scArc").setAttribute("stroke-dasharray", `${(pct / 100 * 314.16).toFixed(1)} 314.16`);
  $("scPct").textContent = pct + "%";
  $("scKhatamBerikut").textContent = `Menuju khatam ke-${R.khatam + 1}`;
  $("scKhatamKet").textContent = `Putaran ${pj}: ${R.selesaiDi(pj)} dari 30 juz selesai, ${dibacaPj} sedang dibaca.`;
  $("scJuz").textContent = R.juzSelesai;
  $("scPembaca").textContent = R.pembaca;
  $("scDibaca").textContent = R.dibaca;
  const awalHari = new Date(); awalHari.setHours(0, 0, 0, 0);
  $("scHadirTot").textContent = hadirList.filter(h => (h.waktu || 0) >= awalHari.getTime()).length;
}

/* ---------- reset & hapus data ---------- */
async function hapusBanyak(refs) {
  for (let i = 0; i < refs.length; i += 400) {
    const b = writeBatch(db);
    refs.slice(i, i + 400).forEach(r => b.delete(r));
    await b.commit();
  }
}
const STATE_AWAL = { putaran: 1, terambil: [], kosong: [] };
const AKSI = {
  bacaan: {
    judul: "Reset bacaan & khataman",
    ket: () => `Menghapus ${bacaan.length} catatan bacaan. Khataman kembali 0, pembagian juz mulai lagi dari Putaran 1 Juz 1. Peserta dan kehadiran tetap.`,
    jalan: async () => {
      const n = bacaan.length;
      await hapusBanyak(bacaan.map(r => doc(db, "bacaan", r._id)));
      const b = writeBatch(db);
      b.set(doc(db, "state", "alokasi"), STATE_AWAL);
      peserta.filter(p => p.aktif).forEach(p => b.update(doc(db, "peserta", p.nim), { aktif: null }));
      await b.commit();
      return `${n} catatan bacaan dihapus. Khataman kembali 0.`;
    },
  },
  hadir: {
    judul: "Hapus data kehadiran",
    ket: () => `Menghapus ${hadirList.length} catatan check-in dari semua sesi. Sesi dan QR-nya tetap bisa dipakai.`,
    jalan: async () => { const n = hadirList.length; await hapusBanyak(hadirList.map(h => doc(db, "hadir", h._id))); return `${n} catatan kehadiran dihapus.`; },
  },
  sesi: {
    judul: "Hapus semua sesi",
    ket: () => `Menghapus ${sesiList.length} sesi beserta ${hadirList.length} catatan kehadirannya. QR lama tidak berlaku lagi.`,
    jalan: async () => {
      const n = sesiList.length;
      await hapusBanyak([...hadirList.map(h => doc(db, "hadir", h._id)), ...sesiList.map(x => doc(db, "sesi", x.kode))]);
      return `${n} sesi dan kehadirannya dihapus.`;
    },
  },
  peserta: {
    judul: "Hapus semua peserta",
    ket: () => `Menghapus ${peserta.length} data peserta. Juz yang sedang mereka pegang dikembalikan. Riwayat bacaan dan kehadiran tetap. Peserta bisa mendaftar ulang dengan NIM/WA dan PIN yang sama.`,
    jalan: async () => {
      const n = peserta.length;
      for (const r of bacaan.filter(r => r.status === "membaca")) { try { await kosongkanJuz(r._id); } catch {} }
      await hapusBanyak(peserta.map(p => doc(db, "peserta", p.nim)));
      return `${n} data peserta dihapus.`;
    },
  },
  semua: {
    judul: "Reset seluruh acara",
    ket: () => `Menghapus semua peserta (${peserta.length}), bacaan (${bacaan.length}), sesi (${sesiList.length}), dan kehadiran (${hadirList.length}). Acara kembali kosong seperti baru. Pengaturan acara dan akun panitia tetap.`,
    jalan: async () => {
      const ringkasan = `${peserta.length} peserta, ${bacaan.length} bacaan, ${sesiList.length} sesi, ${hadirList.length} kehadiran dihapus.`;
      await hapusBanyak([...bacaan.map(r => doc(db, "bacaan", r._id)), ...hadirList.map(h => doc(db, "hadir", h._id)),
        ...sesiList.map(x => doc(db, "sesi", x.kode)), ...peserta.map(p => doc(db, "peserta", p.nim))]);
      await setDoc(doc(db, "state", "alokasi"), STATE_AWAL);
      return ringkasan;
    },
  },
};
let zonaBuka = null, zonaSibuk = false;
function renderZona(paksa = false) {
  if (zonaSibuk || (zonaBuka && !paksa)) return;   // jangan ganggu kolom konfirmasi yang sedang diisi
  $("zList").innerHTML = Object.entries(AKSI).map(([id, a]) => `
    <div class="zona-item ${id === "semua" ? "zona-semua" : ""}">
      <div style="min-width:0"><b>${a.judul}</b><p class="muted">${esc(a.ket())}</p></div>
      ${zonaBuka === id ? `
        <form class="zona-konfirm" data-konfirm="${id}" novalidate>
          <label for="zKetik-${id}" class="sr">Ketik HAPUS untuk konfirmasi</label>
          <input id="zKetik-${id}" placeholder="Ketik HAPUS" autocomplete="off" autocapitalize="characters">
          <button class="btn-bahaya btn-sm" type="submit">Ya, hapus</button>
          <button class="btn-ghost btn-sm" type="button" data-batal>Batal</button>
        </form>` : `<button class="btn-ghost btn-sm zona-btn" type="button" data-zona="${id}">${id === "bacaan" ? "Reset" : id === "semua" ? "Reset semua" : "Hapus"}</button>`}
    </div>`).join("");
  if (zonaBuka) $("zKetik-" + zonaBuka)?.focus();
}
$("zList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.zona) { zonaBuka = b.dataset.zona; setMsg("zMsg", ""); renderZona(true); }
  else if (b.hasAttribute("data-batal")) { zonaBuka = null; renderZona(true); }
});
$("zList").addEventListener("submit", async e => {
  e.preventDefault();
  const id = e.target.dataset.konfirm, a = AKSI[id];
  if ($("zKetik-" + id).value.trim().toUpperCase() !== "HAPUS") return setMsg("zMsg", 'Ketik kata HAPUS di kolom konfirmasi untuk melanjutkan.', "err");
  zonaSibuk = true; e.target.querySelectorAll("button,input").forEach(x => { x.disabled = true; });
  setMsg("zMsg", "Menghapus…");
  try { const hasil = await a.jalan(); setMsg("zMsg", hasil, "ok"); }
  catch (err) { setMsg("zMsg", "Gagal menghapus: " + pesanError(err), "err"); }
  zonaSibuk = false; zonaBuka = null; renderZona(true);
});
$("zBackup").addEventListener("click", async () => {
  const data = { dibuat: new Date().toISOString(), acara, peserta, bacaan, sesi: sesiList, hadir: hadirList };
  try { await unduhBerkas(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `cadangan-khatmil-quran-${new Date().toISOString().slice(0, 10)}.json`); setMsg("zMsg", "Cadangan diunduh.", "ok"); }
  catch { setMsg("zMsg", "Unduhan dibatalkan.", "err"); }
});

// hapus satu peserta dari tabel
$("pesertaBody").addEventListener("click", async e => {
  const nim = e.target.dataset.hapusPeserta; if (!nim) return;
  if (!e.target.dataset.armed) { e.target.dataset.armed = "1"; e.target.textContent = "Yakin hapus?"; return; }
  e.target.disabled = true;
  try {
    const p = peserta.find(x => x.nim === nim);
    if (p?.aktif) { try { await kosongkanJuz(p.aktif); } catch {} }
    await deleteDoc(doc(db, "peserta", nim));
  } catch (err) { e.target.textContent = "Gagal"; }
});

/* ---------- impor daftar peserta ---------- */
const KOLOM_P = ["nama", "kategori", "nim", "prodi", "no_wa", "instansi"];
$("pTemplate").addEventListener("click", async () => {
  const baris = [KOLOM_P,
    ["Contoh Mahasiswa", "mahasiswa", "11210340000123", "Ilmu Hadis", "081234567890", ""],
    ["Contoh Dosen", "dosen", "", "", "081298765432", ""],
    ["Contoh Peserta Luar", "umum", "", "", "085712345678", "Alumni 2015"]];
  try { await unduhBerkas(new Blob([keCSV(baris)], { type: "text/csv;charset=utf-8" }), "template-peserta.csv"); }
  catch { setMsg("pMsg", "Unduhan dibatalkan.", "err"); }
});
$("pImpor").addEventListener("change", async e => {
  const file = e.target.files[0]; e.target.value = "";
  if (!file) return;
  setMsg("pMsg", "Membaca berkas…");
  let rows;
  try { rows = bacaCSV(await file.text()); } catch { return setMsg("pMsg", "Berkas tidak bisa dibaca. Simpan sebagai CSV lalu coba lagi.", "err"); }
  if (rows.length < 2) return setMsg("pMsg", "Berkas kosong. Isi data di bawah baris judul kolom.", "err");
  const kepala = rows[0].map(k => k.trim().toLowerCase().replace(/\s+/g, "_").replace(/^no_?(hp|wa|whatsapp)$/, "no_wa"));
  const ix = n => kepala.indexOf(n);
  if (ix("nama") < 0) return setMsg("pMsg", 'Kolom "nama" tidak ditemukan. Pakai template dari tombol "Unduh template peserta".', "err");
  const ada = new Set(peserta.map(p => p.nim)), tulis = [], lewat = [];
  let sudah = 0;
  rows.slice(1).forEach((r, i) => {
    const ambil = n => (ix(n) >= 0 ? String(r[ix(n)] ?? "") : "").trim();
    const noBaris = i + 2, nama = ambil("nama").replace(/\s+/g, " ");
    if (!nama) return lewat.push(`baris ${noBaris}: nama kosong`);
    if (/^contoh\b/i.test(nama)) return;
    let kat = ambil("kategori").toLowerCase();
    kat = kat.startsWith("dos") ? "dosen" : (kat.startsWith("umum") || kat.startsWith("luar") || kat.startsWith("peserta")) ? "umum" : "mahasiswa";
    const waId = idDariWa(ambil("no_wa"));
    const id = kat === "mahasiswa" ? bersihkanNim(ambil("nim")).toLowerCase() : waId;
    if (!id) return lewat.push(`baris ${noBaris}: ${kat === "mahasiswa" ? "NIM" : "nomor WA"} kosong/tidak valid`);
    if (ada.has(id)) { sudah++; return; }
    ada.add(id);
    const prodiMentah = ambil("prodi"), prodi = PRODI.find(p => p.toLowerCase() === prodiMentah.toLowerCase()) || prodiMentah;
    tulis.push([id, { nim: id, nama, kategori: kat, prodi: kat === "mahasiswa" ? (prodi || "Mahasiswa") : KATEGORI[kat], instansi: ambil("instansi"),
      hp: waId ? "0" + waId.slice(4) : "", tiket: kodeAcak(8), uid: null, aktif: null, daftar: Date.now(), sumber: "impor" }]);
  });
  try {
    for (let i = 0; i < tulis.length; i += 400) {
      const b = writeBatch(db);
      tulis.slice(i, i + 400).forEach(([id, d]) => b.set(doc(db, "peserta", id), d));
      await b.commit();
    }
    const info = [`${tulis.length} peserta diimpor`];
    if (sudah) info.push(`${sudah} sudah terdaftar sebelumnya`);
    if (lewat.length) info.push(`${lewat.length} dilewati (${lewat.slice(0, 3).join("; ")}${lewat.length > 3 ? "; …" : ""})`);
    setMsg("pMsg", info.join(" · ") + ". Kirim tautan masuk lewat tombol \"Kirim tiket\" di tabel.", lewat.length && !tulis.length ? "err" : "ok");
  } catch (err) { setMsg("pMsg", "Impor gagal: " + pesanError(err), "err"); }
});

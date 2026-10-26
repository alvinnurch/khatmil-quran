import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { terapkanTema, WARNA_PRESET, hexValid, kelompok, tampilId } from "./common.js";
import { auth, db, configBelumDiisi, isAkunPeserta, rentangJuz, $, esc, lalu, setMsg, pesanError, kosongkanJuz, ringkas } from "./common.js";

let bacaan = [], peserta = [], acara = {}, unsub = [];
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
  if (!user) return tampil("login");
  if (isAkunPeserta(user)) { tampil("login"); return setMsg("lMsg", "Akun peserta tidak bisa membuka dasbor panitia.", "err"); }
  let admin = false;
  try { admin = (await getDoc(doc(db, "admins", user.email.toLowerCase()))).exists(); } catch { admin = false; }
  if (!admin) { await signOut(auth); tampil("login"); return setMsg("lMsg", `${user.email} belum terdaftar sebagai panitia. Tambahkan di koleksi "admins" (lihat README).`, "err"); }
  $("whoEmail").textContent = user.email;
  tampil("dash");
  unsub.push(onSnapshot(collection(db, "bacaan"), s => { bacaan = s.docs.map(d => ({ ...d.data(), _id: d.id })); render(); }));
  unsub.push(onSnapshot(collection(db, "peserta"), s => { peserta = s.docs.map(d => d.data()); render(); }));
  unsub.push(onSnapshot(doc(db, "pengaturan", "acara"), s => {
    acara = s.exists() ? s.data() : {};
    $("evName").textContent = acara.nama || "Khatmil Qur'an";
    $("scName").textContent = acara.nama || "Khatmil Qur'an";
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
}

function renderPeserta() {
  const q = $("search").value.trim().toLowerCase();
  const hitung = {};
  bacaan.forEach(r => { if (r.status === "selesai") hitung[r.nim] = (hitung[r.nim] || 0) + 1; });
  const rows = peserta
    .filter(p => !q || `${p.nama} ${p.nim} ${tampilId(p)} ${kelompok(p)} ${p.instansi || ""}`.toLowerCase().includes(q))
    .sort((a, b) => (hitung[b.nim] || 0) - (hitung[a.nim] || 0) || a.nama.localeCompare(b.nama));
  $("pesertaBody").innerHTML = rows.length ? rows.map(p => {
    const aktif = p.aktif ? bacaan.find(r => r._id === p.aktif) : null;
    return `<tr><td class="wrap">${esc(p.nama)}</td><td class="num">${esc(tampilId(p))}</td><td>${esc(kelompok(p))}${p.instansi ? `<span class="muted"> · ${esc(p.instansi)}</span>` : ""}</td><td class="num">${hitung[p.nim] || 0}</td>
      <td>${aktif ? `<span class="pill busy">Membaca juz ${aktif.juz}</span>` : `<span class="muted">—</span>`}</td><td>${esc(p.hp || "")}</td></tr>`;
  }).join("") : `<tr><td colspan="6" class="empty">${peserta.length ? "Tidak ada yang cocok." : "Belum ada peserta terdaftar."}</td></tr>`;
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

$("screenBtn").addEventListener("click", () => { $("screen").hidden = false; document.documentElement.requestFullscreen?.().catch(() => {}); });
$("screenExit").addEventListener("click", () => { $("screen").hidden = true; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); });
document.addEventListener("keydown", e => { if (e.key === "Escape") $("screen").hidden = true; });

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

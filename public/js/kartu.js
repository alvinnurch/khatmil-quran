// Kartu ucapan selesai membaca: selfie + logo acara, siap disimpan atau dibagikan ke Story/Feed.
import { $, esc, rentangJuz, paletTema, hexValid } from "./common.js";

const UKURAN = { story: { w: 1080, h: 1920 }, feed: { w: 1080, h: 1350 } };
const TINTA = "#151515", REDUP = "#6f6f69", PUTIH = "#ffffff";
const HURUF = { display: '"Plus Jakarta Sans", system-ui, sans-serif', body: '"Plus Jakarta Sans", system-ui, sans-serif', arab: '"Amiri Quran", "Amiri", serif' };

let state = null;   // { data, acara, format, foto, logo }

/** data: { nama, juz, putaran, selesai }  acara: { nama, sub, tagar, logo } */
export async function bukaKartu(data, acara) {
  state = { data, acara: acara || {}, format: "story", foto: null, logo: null };
  $("kJudul").textContent = `Selamat, ${data.nama.split(" ")[0]}!`;
  $("kTeks").textContent = `Juz ${data.juz} (${rentangJuz(data.juz)}) sudah Anda tuntaskan. Tambahkan selfie, lalu simpan atau bagikan kartunya.`;
  $("kartu").hidden = false;
  document.body.style.overflow = "hidden";
  pilihFormat("story");
  $("kShare").hidden = !bisaBagikan();
  setStatus("");
  try { await document.fonts.load(`600 80px ${HURUF.display}`); await document.fonts.load(`600 40px ${HURUF.body}`); await document.fonts.load(`60px ${HURUF.arab}`); } catch {}
  if (state.acara.logo) state.logo = await muatGambar(state.acara.logo).catch(() => null);
  await gambar();
}

function tutup() { if (!$("kamera").hidden) tutupKamera(); $("kartu").hidden = true; document.body.style.overflow = ""; if (state?.foto?.close) state.foto.close(); state = null; $("kFotoKamera").value = ""; $("kFotoGaleri").value = ""; }
function setStatus(t, kind) { const el = $("kStatus"); el.textContent = t || ""; el.className = "msg" + (kind ? " " + kind : ""); }
function bisaBagikan() {
  try { return !!(navigator.canShare && navigator.canShare({ files: [new File([new Blob(["x"])], "x.jpg", { type: "image/jpeg" })] })); } catch { return false; }
}
function muatGambar(src) { return new Promise((ok, gagal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = gagal; i.src = src; }); }

function pilihFormat(f) {
  if (!state) return;
  state.format = f;
  document.querySelectorAll("[data-format]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.format === f)));
  $("kCanvas").style.aspectRatio = `${UKURAN[f].w} / ${UKURAN[f].h}`;
}

async function pakaiFoto(file) {
  if (!file || !state) return;
  setStatus("Memproses foto…");
  try {
    if (state.foto?.close) state.foto.close();
    state.foto = await createImageBitmap(file);          // orientasi kamera ikut terbaca
    setStatus("");
    await gambar();
  } catch { setStatus("Foto tidak bisa dibuka. Coba foto lain.", "err"); }
}

/* ---------- menggambar kartu ---------- */
function kotakBulat(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function bintang8(c, cx, cy, r) {           // motif bintang delapan khas iluminasi mushaf
  c.beginPath();
  for (let i = 0; i < 16; i++) { const a = Math.PI / 8 * i - Math.PI / 2; const rr = i % 2 ? r * 0.72 : r; c.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
  c.closePath();
}
function bungkusTeks(c, teks, maks) {
  const kata = String(teks).split(/\s+/), baris = []; let skr = "";
  for (const k of kata) { const coba = skr ? skr + " " + k : k; if (c.measureText(coba).width > maks && skr) { baris.push(skr); skr = k; } else skr = coba; }
  if (skr) baris.push(skr);
  return baris;
}
function tutupCover(c, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
  c.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

async function gambar() {
  if (!state) return;
  const { w, h } = UKURAN[state.format];
  const story = state.format === "story";
  const k = story ? 1 : 0.8;                         // skala ukuran huruf untuk format feed
  const cv = $("kCanvas"); cv.width = w; cv.height = h;
  const c = cv.getContext("2d");
  const pad = 64, lebar = w - pad * 2;
  const { data, acara, foto, logo } = state;
  const tema = paletTema(hexValid(acara.warna) ? acara.warna : "#1f5c47").kartu;

  // latar pastel + lingkaran lembut
  c.fillStyle = tema.latar; c.fillRect(0, 0, w, h);
  c.save(); c.globalAlpha = .35; c.fillStyle = PUTIH;
  c.beginPath(); c.arc(w * .92, h * .06, w * .42, 0, Math.PI * 2); c.fill();
  c.restore();
  c.textBaseline = "top"; c.textAlign = "left";

  // kepala: logo dalam lingkaran putih + nama acara
  let y = pad;
  const dLogo = Math.round(112 * k);
  let xTeks = pad;
  if (logo) {
    c.fillStyle = PUTIH; c.beginPath(); c.arc(pad + dLogo / 2, y + dLogo / 2, dLogo / 2, 0, Math.PI * 2); c.fill();
    const s = Math.min((dLogo * .66) / logo.width, (dLogo * .66) / logo.height);
    c.drawImage(logo, pad + dLogo / 2 - logo.width * s / 2, y + dLogo / 2 - logo.height * s / 2, logo.width * s, logo.height * s);
    xTeks = pad + dLogo + 24;
  }
  c.font = `600 ${Math.round(38 * k)}px ${HURUF.display}`; c.fillStyle = TINTA;
  const namaAcara = bungkusTeks(c, acara.nama || "Khatmil Qur'an", w - pad - xTeks).slice(0, 2);
  const tinggiNama = namaAcara.length * 46 * k + (acara.sub ? 40 * k : 0);
  let ty = y + Math.max(0, (dLogo - tinggiNama) / 2);
  namaAcara.forEach(b => { c.fillText(b, xTeks, ty); ty += 46 * k; });
  if (acara.sub) { c.fillStyle = REDUP; c.font = `500 ${Math.round(27 * k)}px ${HURUF.body}`; c.fillText(bungkusTeks(c, acara.sub, w - pad - xTeks)[0], xTeks, ty + 4); }
  y += Math.max(dLogo, tinggiNama) + (story ? 44 : 30);

  // foto (atau ubin nomor juz bila tanpa foto)
  const tinggiFoto = story ? 860 : 520, rFoto = 56;
  if (foto) {
    c.save(); kotakBulat(c, pad, y, lebar, tinggiFoto, rFoto); c.clip(); tutupCover(c, foto, pad, y, lebar, tinggiFoto); c.restore();
  } else {
    c.fillStyle = tema.latar2; kotakBulat(c, pad, y, lebar, tinggiFoto, rFoto); c.fill();
    c.fillStyle = tema.tinta; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = `600 ${Math.round(tinggiFoto * .55)}px ${HURUF.display}`;
    c.fillText(String(data.juz), w / 2, y + tinggiFoto * .5);
    c.font = `${Math.round(64 * k)}px ${HURUF.arab}`; c.fillText("الجزء", w / 2, y + tinggiFoto * .14);
    c.textAlign = "left"; c.textBaseline = "top";
  }
  // pil "Juz N tuntas" di sudut foto
  c.font = `600 ${Math.round(32 * k)}px ${HURUF.body}`;
  const teksPil = `Juz ${data.juz} tuntas`;
  const wPil = c.measureText(teksPil).width + 112 * k, hPil = 76 * k;
  const xPil = pad + 28, yPil = y + tinggiFoto - hPil - 28;
  c.fillStyle = PUTIH; kotakBulat(c, xPil, yPil, wPil, hPil, hPil / 2); c.fill();
  c.fillStyle = tema.aksen; c.beginPath(); c.arc(xPil + hPil / 2, yPil + hPil / 2, hPil / 2 - 10, 0, Math.PI * 2); c.fill();
  c.strokeStyle = PUTIH; c.lineWidth = 5 * k; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath();
  const cx = xPil + hPil / 2, cy = yPil + hPil / 2, u = 10 * k;
  c.moveTo(cx - u, cy); c.lineTo(cx - u * .25, cy + u * .75); c.lineTo(cx + u, cy - u * .7); c.stroke();
  c.fillStyle = TINTA; c.textBaseline = "middle"; c.fillText(teksPil, xPil + hPil + 10 * k, yPil + hPil / 2 + 1); c.textBaseline = "top";
  y += tinggiFoto + 28;

  // kartu putih bawah
  const yKartu = y, hKartu = h - pad - yKartu;
  c.fillStyle = PUTIH; kotakBulat(c, pad, yKartu, lebar, hKartu, 48); c.fill();
  const xi = pad + 44;
  let yy = yKartu + 40 * k;
  c.fillStyle = tema.tinta; c.font = `${Math.round(50 * k)}px ${HURUF.arab}`; c.textAlign = "right";
  c.fillText("صَدَقَ اللّٰهُ الْعَظِيْمُ", w - pad - 44, yy - 6 * k);
  c.textAlign = "left";
  c.fillStyle = REDUP; c.font = `500 ${Math.round(28 * k)}px ${HURUF.body}`;
  c.fillText("Alhamdulillah, saya telah menuntaskan", xi, yy + 8 * k); yy += 56 * k;
  c.fillStyle = TINTA; c.font = `600 ${Math.round(132 * k)}px ${HURUF.display}`;
  c.fillText(`Juz ${data.juz}`, xi - 4, yy); yy += 146 * k;
  c.fillStyle = REDUP; c.font = `500 ${Math.round(28 * k)}px ${HURUF.body}`;
  c.fillText(rentangJuz(data.juz), xi, yy);

  // baris kaki di dalam kartu: nama + tanggal, pil putaran di kanan
  const tanggal = new Date(data.selesai || Date.now()).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const yKaki = yKartu + hKartu - 44 - 84 * k;
  c.strokeStyle = "#ececE8"; c.lineWidth = 2; c.beginPath(); c.moveTo(xi, yKaki - 24 * k); c.lineTo(w - pad - 44, yKaki - 24 * k); c.stroke();
  c.fillStyle = TINTA; c.font = `600 ${Math.round(32 * k)}px ${HURUF.body}`;
  const nama = String(data.nama).replace(/^Contoh:\s*/, "");
  c.fillText(bungkusTeks(c, nama, lebar - 360 * k)[0], xi, yKaki);
  c.fillStyle = REDUP; c.font = `500 ${Math.round(24 * k)}px ${HURUF.body}`;
  const kaki = [tanggal, acara.tagar ? acara.tagar.split(/\s+/).map(t => t.startsWith("#") ? t : "#" + t).join(" ") : ""].filter(Boolean).join("  ·  ");
  c.fillText(bungkusTeks(c, kaki, lebar - 120)[0], xi, yKaki + 46 * k);
  if (data.putaran) {
    c.font = `600 ${Math.round(24 * k)}px ${HURUF.body}`;
    const tp = `Putaran ${data.putaran}`, wp = c.measureText(tp).width + 44 * k, hp = 54 * k;
    const xp = w - pad - 44 - wp;
    c.fillStyle = tema.latar; kotakBulat(c, xp, yKaki - 6, wp, hp, hp / 2); c.fill();
    c.fillStyle = TINTA; c.textBaseline = "middle"; c.fillText(tp, xp + 22 * k, yKaki - 6 + hp / 2 + 1); c.textBaseline = "top";
  }
}

function keBlob() { return new Promise(ok => $("kCanvas").toBlob(ok, "image/jpeg", 0.92)); }
function namaBerkas() { return `khatmil-quran-juz-${state.data.juz}-${state.format}.jpg`; }

async function simpan() {
  const blob = await keBlob(); if (!blob) return setStatus("Gagal membuat gambar.", "err");
  if (globalThis.KHATAM_SIMPAN) {                       // dipakai versi uji coba di Claude
    try { await globalThis.KHATAM_SIMPAN(blob, namaBerkas()); setStatus("Gambar disimpan.", "ok"); }
    catch { setStatus("Penyimpanan dibatalkan.", "err"); }
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = namaBerkas(); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  setStatus("Gambar tersimpan. Di iPhone, tekan lama gambar yang terbuka lalu pilih Simpan ke Foto.", "ok");
}
async function bagikan() {
  const blob = await keBlob(); if (!blob) return;
  const file = new File([blob], namaBerkas(), { type: "image/jpeg" });
  try {
    await navigator.share({ files: [file], title: state.acara.nama || "Khatmil Qur'an", text: `Alhamdulillah, Juz ${state.data.juz} tuntas.${state.acara.tagar ? " " + state.acara.tagar : ""}` });
  } catch (e) { if (e?.name !== "AbortError") setStatus("Gagal membagikan. Simpan gambar lalu unggah dari galeri.", "err"); }
}

// sambungan tombol (markup ada di index.html)
$("kTutup").addEventListener("click", tutup);
$("kTanpaFoto").addEventListener("click", async () => { if (state?.foto?.close) state.foto.close(); if (state) state.foto = null; await gambar(); });
$("kFotoKamera").addEventListener("change", e => pakaiFoto(e.target.files[0]));
$("kFotoGaleri").addEventListener("change", e => pakaiFoto(e.target.files[0]));
document.querySelectorAll("[data-format]").forEach(b => b.addEventListener("click", async () => { pilihFormat(b.dataset.format); await gambar(); }));
$("kSave").addEventListener("click", simpan);
$("kShare").addEventListener("click", bagikan);

/* ---------- kamera selfie langsung di aplikasi ---------- */
// Atribut `capture` pada input berkas sering diabaikan (laptop, sebagian browser HP, aplikasi dalam aplikasi),
// jadi kamera dibuka sendiri lewat getUserMedia. Bila izin ditolak atau tidak didukung, jatuh ke pemilih berkas.
let aliran = null, hadap = "user";
function hentikanKamera() { aliran?.getTracks().forEach(t => t.stop()); aliran = null; $("kVideo").srcObject = null; }
function tutupKamera() { hentikanKamera(); $("kamera").hidden = true; }
async function nyalakan() {
  hentikanKamera();
  $("kJepret").disabled = true;
  $("kKameraMsg").textContent = "Membuka kamera…";
  aliran = await navigator.mediaDevices.getUserMedia({ video: { facingMode: hadap, width: { ideal: 1440 }, height: { ideal: 1920 } }, audio: false });
  const v = $("kVideo");
  v.classList.toggle("belakang", hadap !== "user");
  v.srcObject = aliran;
  await v.play().catch(() => {});
  $("kKameraMsg").textContent = "";
  $("kJepret").disabled = false;
}
async function bukaKamera() {
  if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) { $("kFotoKamera").click(); return; }
  $("kamera").hidden = false;
  try { await nyalakan(); }
  catch (e) {
    tutupKamera();
    const ditolak = e?.name === "NotAllowedError" || e?.name === "SecurityError";
    if (globalThis.KHATAM_DEMO) return setStatus("Pratinjau di Claude tidak boleh membuka kamera. Setelah aplikasi di-deploy, tombol ini membuka kamera depan. Untuk tes sekarang, pakai Pilih dari galeri.", "err");
    setStatus(ditolak ? "Izin kamera ditolak. Izinkan kamera di pengaturan browser, atau pilih foto dari galeri." : "Kamera tidak bisa dibuka di perangkat ini. Pilih foto dari galeri.", "err");
    if (!ditolak) $("kFotoKamera").click();
  }
}
async function jepret() {
  const v = $("kVideo");
  if (!v.videoWidth || !state) return;
  const c = document.createElement("canvas");
  c.width = v.videoWidth; c.height = v.videoHeight;
  const g = c.getContext("2d");
  if (hadap === "user") { g.translate(c.width, 0); g.scale(-1, 1); }   // sama seperti yang terlihat di layar
  g.drawImage(v, 0, 0);
  if (state.foto?.close) state.foto.close();
  state.foto = await createImageBitmap(c);
  tutupKamera();
  setStatus("");
  await gambar();
}
$("kSelfie").addEventListener("click", bukaKamera);
$("kJepret").addEventListener("click", jepret);
$("kBatal").addEventListener("click", tutupKamera);
$("kBalik").addEventListener("click", async () => {
  hadap = hadap === "user" ? "environment" : "user";
  try { await nyalakan(); } catch { hadap = "user"; $("kKameraMsg").textContent = "Kamera lain tidak tersedia."; try { await nyalakan(); } catch {} }
});
document.addEventListener("visibilitychange", () => { if (document.hidden && !$("kamera").hidden) tutupKamera(); });

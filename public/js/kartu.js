// Kartu ucapan selesai membaca: selfie + logo acara, siap disimpan atau dibagikan ke Story/Feed.
// Peserta bisa memilih 5 desain, filter foto, dan kutipan. Semua digambar di <canvas> di perangkat peserta.
import { $, esc, rentangJuz, paletTema, hexValid, namaPanggil } from "./common.js";

const UKURAN = { story: { w: 1080, h: 1920 }, feed: { w: 1080, h: 1350 } };
const TINTA = "#151515", REDUP = "#6f6f69", PUTIH = "#ffffff", EMAS = "#d9b45a", EMAS_MUDA = "#f3e6c4";
const HURUF = {
  display: '"Plus Jakarta Sans", system-ui, sans-serif',
  body: '"Plus Jakarta Sans", system-ui, sans-serif',
  arab: '"Amiri Quran", "Amiri", serif',
  tangan: '"Caveat", "Segoe Print", cursive',
  serif: '"Fraunces", Georgia, serif',
};

const KUTIPAN = {
  shadaqa: { label: "Ṣadaqallāhul-'aẓīm", ar: "صَدَقَ اللّٰهُ الْعَظِيْمُ", arti: "Mahabenar Allah Yang Mahaagung.", sumber: "" },
  hamdalah: { label: "Alḥamdulillāh", ar: "الْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِيْنَ", arti: "Segala puji bagi Allah, Tuhan semesta alam.", sumber: "QS. Al-Fātiḥah [1]: 2" },
  tartil: { label: "QS. Al-Muzzammil: 4", ar: "وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا", arti: "Dan bacalah Al-Qur'an itu dengan tartil.", sumber: "QS. Al-Muzzammil [73]: 4" },
  khairukum: { label: "Khairukum man ta'allam…", ar: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ", arti: "Sebaik-baik kalian adalah orang yang belajar Al-Qur'an dan mengajarkannya.", sumber: "HR. al-Bukhari" },
  syafaat: { label: "Iqra'ul-Qur'ān… syafī'an", ar: "اقْرَءُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ", arti: "Bacalah Al-Qur'an, karena ia akan datang pada hari kiamat memberi syafaat bagi pembacanya.", sumber: "HR. Muslim" },
};
const FILTER = { asli: "Asli", hangat: "Hangat", sejuk: "Sejuk", cerah: "Cerah", lembut: "Lembut", hitamputih: "Hitam-putih" };
const URUTAN_JUZ = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر", "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر", "الخامس عشر", "السادس عشر", "السابع عشر", "الثامن عشر", "التاسع عشر", "العشرون", "الحادي والعشرون", "الثاني والعشرون", "الثالث والعشرون", "الرابع والعشرون", "الخامس والعشرون", "السادس والعشرون", "السابع والعشرون", "الثامن والعشرون", "التاسع والعشرون", "الثلاثون"];

let state = null;   // { data, acara, format, template, filter, kutipan, fotoAsli, foto, logo }

/** data: { nama, juz, putaran, selesai, totalSaya? }  acara: { nama, sub, tagar, logo, warna } */
export async function bukaKartu(data, acara) {
  const ingat = bacaPilihan();
  state = { data, acara: acara || {}, format: ingat.format || "story", template: TEMPLATE[ingat.template] ? ingat.template : "minimal",
    filter: "asli", kutipan: KUTIPAN[ingat.kutipan] ? ingat.kutipan : "shadaqa", fotoAsli: null, foto: null, logo: null };
  $("kJudul").textContent = `Selamat, ${namaPanggil(data.nama)}!`;
  $("kTeks").textContent = `Juz ${data.juz} (${rentangJuz(data.juz)}) sudah tuntas. Pilih desain, tambahkan selfie, lalu simpan atau bagikan.`;
  $("kartu").hidden = false;
  document.body.style.overflow = "hidden";
  $("kShare").hidden = !bisaBagikan();
  $("kKutipan").value = state.kutipan;
  $("kFilterBox").hidden = true;
  pilihFormat(state.format);
  susunPilihan();
  setStatus("");
  try {
    await Promise.all([`600 80px ${HURUF.display}`, `800 80px ${HURUF.display}`, `500 40px ${HURUF.body}`, `60px ${HURUF.arab}`,
      `700 60px ${HURUF.tangan}`, `600 60px ${HURUF.serif}`, `italic 400 40px ${HURUF.serif}`].map(f => document.fonts.load(f)));
  } catch {}
  if (state.acara.logo) state.logo = await muatGambar(state.acara.logo).catch(() => null);
  await gambar();
}

function bacaPilihan() { try { return JSON.parse(localStorage.getItem("khatam.kartu") || "{}"); } catch { return {}; } }
function ingatPilihan() { try { localStorage.setItem("khatam.kartu", JSON.stringify({ format: state.format, template: state.template, kutipan: state.kutipan })); } catch {} }

function tutup() {
  if (!$("kamera").hidden) tutupKamera();
  $("kartu").hidden = true; document.body.style.overflow = "";
  if (state?.fotoAsli?.close) state.fotoAsli.close();
  state = null; $("kFotoKamera").value = ""; $("kFotoGaleri").value = "";
}
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

/* ---------- daftar pilihan (desain, filter, kutipan) ---------- */
function susunPilihan() {
  $("kTpl").innerHTML = Object.entries(TEMPLATE).map(([id, t]) =>
    `<button type="button" class="tpl" role="radio" data-tpl="${id}" aria-checked="${id === state.template}"><canvas width="10" height="10"></canvas>${esc(t.nama)}</button>`).join("");
  $("kFilter").innerHTML = Object.entries(FILTER).map(([id, n]) =>
    `<button type="button" role="radio" data-filter="${id}" aria-checked="${id === state.filter}">${n}</button>`).join("");
  if (!$("kKutipan").options.length)
    $("kKutipan").innerHTML = Object.entries(KUTIPAN).map(([id, q]) => `<option value="${id}">${esc(q.label)}</option>`).join("");
  $("kKutipan").value = state.kutipan;
}
function tandai(wadah, attr, nilai) { wadah.querySelectorAll(`[${attr}]`).forEach(b => b.setAttribute("aria-checked", String(b.getAttribute(attr) === nilai))); }

/* ---------- foto & filter ---------- */
async function pakaiFoto(file) {
  if (!file || !state) return;
  setStatus("Memproses foto…");
  try {
    const bmp = await createImageBitmap(file);          // orientasi kamera ikut terbaca
    await setelFoto(bmp);
    setStatus("");
  } catch { setStatus("Foto tidak bisa dibuka. Coba foto lain.", "err"); }
}
async function setelFoto(sumber) {
  if (state.fotoAsli?.close) state.fotoAsli.close();
  state.fotoAsli = sumber;
  state.foto = terapkanFilter(sumber, state.filter);
  $("kFilterBox").hidden = false;
  await gambar();
}
const jepit = v => v < 0 ? 0 : v > 255 ? 255 : v;
function terapkanFilter(src, f) {
  const maks = 1600, s = Math.min(1, maks / Math.max(src.width, src.height));
  const cv = document.createElement("canvas");
  cv.width = Math.round(src.width * s); cv.height = Math.round(src.height * s);
  const g = cv.getContext("2d");
  g.drawImage(src, 0, 0, cv.width, cv.height);
  if (f === "asli") return cv;
  const im = g.getImageData(0, 0, cv.width, cv.height), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], gg = d[i + 1], b = d[i + 2];
    const l = 0.299 * r + 0.587 * gg + 0.114 * b;
    if (f === "hangat") { r = r * 1.07 + 10; gg = gg * 1.02 + 3; b = b * 0.88; }
    else if (f === "sejuk") { r = r * 0.92; gg = gg * 1.01 + 2; b = b * 1.08 + 10; }
    else if (f === "cerah") { r = l + (r - l) * 1.35 + 6; gg = l + (gg - l) * 1.35 + 6; b = l + (b - l) * 1.35 + 6; r = (r - 128) * 1.06 + 128; gg = (gg - 128) * 1.06 + 128; b = (b - 128) * 1.06 + 128; }
    else if (f === "lembut") { r = r * 0.82 + 42; gg = gg * 0.82 + 36; b = b * 0.8 + 34; }
    else if (f === "hitamputih") { const v = (l - 128) * 1.18 + 128; r = gg = b = v; }
    d[i] = jepit(r); d[i + 1] = jepit(gg); d[i + 2] = jepit(b);
  }
  g.putImageData(im, 0, 0);
  return cv;
}

/* ---------- alat gambar ---------- */
function kotakBulat(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function lingkar(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }
function bintang8(c, cx, cy, r, dalam = 0.72, putar = 0) {   // motif bintang delapan khas iluminasi mushaf
  c.beginPath();
  for (let i = 0; i < 16; i++) { const a = Math.PI / 8 * i - Math.PI / 2 + putar; const rr = i % 2 ? r * dalam : r; c.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
  c.closePath();
}
function mihrab(c, x, y, w, h) {                          // bingkai lengkung mihrab
  const r = w * 0.62;
  c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + r);
  c.bezierCurveTo(x, y + r * 0.35, x + w * 0.3, y + r * 0.06, x + w / 2, y);
  c.bezierCurveTo(x + w * 0.7, y + r * 0.06, x + w, y + r * 0.35, x + w, y + r);
  c.lineTo(x + w, y + h); c.closePath();
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
function gambarLogo(c, logo, cx, cy, d, latar = PUTIH, cincin = null) {
  c.fillStyle = latar; lingkar(c, cx, cy, d / 2); c.fill();
  if (cincin) { c.strokeStyle = cincin; c.lineWidth = d * 0.04; lingkar(c, cx, cy, d / 2); c.stroke(); }
  const s = Math.min((d * .64) / logo.width, (d * .64) / logo.height);
  c.drawImage(logo, cx - logo.width * s / 2, cy - logo.height * s / 2, logo.width * s, logo.height * s);
}
/** Tulis teks dalam beberapa baris; mengembalikan y setelah baris terakhir. */
function tulis(c, teks, x, y, maks, ukuran, tinggi, { maksBaris = 2, rtl = false } = {}) {
  c.direction = rtl ? "rtl" : "ltr";
  let baris = bungkusTeks(c, teks, maks);
  if (baris.length > maksBaris) { baris = baris.slice(0, maksBaris); baris[maksBaris - 1] += " …"; }
  baris.forEach((b, i) => c.fillText(b, x, y + i * tinggi));
  c.direction = "ltr";
  return y + baris.length * tinggi;
}
/** Teks melengkung mengikuti lingkaran, berpusat pada sudut `pusat` (radian, -π/2 = atas). */
function teksLengkung(c, teks, cx, cy, r, pusat, spasi) {
  const lebar = [...teks].map(ch => c.measureText(ch).width);
  const total = lebar.reduce((a, b) => a + b, 0) + spasi * (lebar.length - 1);
  let a = pusat - total / r / 2;
  c.save(); c.textAlign = "center"; c.textBaseline = "middle";
  [...teks].forEach((ch, i) => {
    a += lebar[i] / 2 / r;
    c.save(); c.translate(cx + r * Math.cos(a), cy + r * Math.sin(a)); c.rotate(a + Math.PI / 2); c.fillText(ch, 0, 0); c.restore();
    a += (lebar[i] / 2 + spasi) / r;
  });
  c.restore();
}
function acak(benih) { let t = benih >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
function centang(c, cx, cy, u, warna, tebal) {
  c.strokeStyle = warna; c.lineWidth = tebal; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); c.moveTo(cx - u, cy); c.lineTo(cx - u * .25, cy + u * .75); c.lineTo(cx + u, cy - u * .7); c.stroke();
}
function konteks(c, w, h) {
  const { data, acara, foto, logo } = state;
  const story = h / w > 1.5;
  const tema = paletTema(hexValid(acara.warna) ? acara.warna : "#1f5c47").kartu;
  return {
    c, w, h, story, k: story ? 1 : 0.8, pad: 64, data, acara, foto, logo, tema,
    kut: KUTIPAN[state.kutipan] || KUTIPAN.shadaqa,
    nama: String(data.nama).replace(/^Contoh:\s*/, ""),
    namaAcara: acara.nama || "Khatmil Qur'an",
    tanggal: new Date(data.selesai || Date.now()).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    tagar: acara.tagar ? acara.tagar.split(/\s+/).filter(Boolean).map(t => t.startsWith("#") ? t : "#" + t).join(" ") : "",
  };
}
const kaki = x => [x.tanggal, x.tagar].filter(Boolean).join("  ·  ");

/* ---------- desain 1: Minimal (pastel, kartu putih) ---------- */
function tplMinimal(x) {
  const { c, w, h, story, k, pad, data, acara, foto, logo, tema, kut } = x;
  const lebar = w - pad * 2;
  c.fillStyle = tema.latar; c.fillRect(0, 0, w, h);
  c.save(); c.globalAlpha = .35; c.fillStyle = PUTIH; lingkar(c, w * .92, h * .06, w * .42); c.fill(); c.restore();
  c.textBaseline = "top"; c.textAlign = "left";

  let y = pad;
  const dLogo = Math.round(112 * k);
  let xT = pad;
  if (logo) { gambarLogo(c, logo, pad + dLogo / 2, y + dLogo / 2, dLogo); xT = pad + dLogo + 24; }
  c.font = `600 ${38 * k}px ${HURUF.display}`; c.fillStyle = TINTA;
  const nm = bungkusTeks(c, x.namaAcara, w - pad - xT).slice(0, 2);
  const tn = nm.length * 46 * k + (acara.sub ? 40 * k : 0);
  let ty = y + Math.max(0, (dLogo - tn) / 2);
  nm.forEach(b => { c.fillText(b, xT, ty); ty += 46 * k; });
  if (acara.sub) { c.fillStyle = REDUP; c.font = `500 ${27 * k}px ${HURUF.body}`; c.fillText(bungkusTeks(c, acara.sub, w - pad - xT)[0], xT, ty + 4); }
  y += Math.max(dLogo, tn) + (story ? 44 : 30);

  const tf = story ? 900 : 480, rF = 56;
  if (foto) { c.save(); kotakBulat(c, pad, y, lebar, tf, rF); c.clip(); tutupCover(c, foto, pad, y, lebar, tf); c.restore(); }
  else {
    c.fillStyle = tema.latar2; kotakBulat(c, pad, y, lebar, tf, rF); c.fill();
    c.fillStyle = tema.tinta; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = `600 ${Math.round(tf * .55)}px ${HURUF.display}`; c.fillText(String(data.juz), w / 2, y + tf * .54);
    c.font = `${Math.round(64 * k)}px ${HURUF.arab}`; c.fillText("الجزء", w / 2, y + tf * .14);
    c.textAlign = "left"; c.textBaseline = "top";
  }
  // pil "Juz N tuntas"
  c.font = `600 ${32 * k}px ${HURUF.body}`;
  const tp = `Juz ${data.juz} tuntas`, hp = 76 * k, wp = c.measureText(tp).width + hp + 36 * k;
  const xp = pad + 28, yp = y + tf - hp - 28;
  c.fillStyle = PUTIH; kotakBulat(c, xp, yp, wp, hp, hp / 2); c.fill();
  c.fillStyle = tema.aksen; lingkar(c, xp + hp / 2, yp + hp / 2, hp / 2 - 10); c.fill();
  centang(c, xp + hp / 2, yp + hp / 2, 10 * k, PUTIH, 5 * k);
  c.fillStyle = TINTA; c.textBaseline = "middle"; c.fillText(tp, xp + hp + 10 * k, yp + hp / 2 + 1); c.textBaseline = "top";
  y += tf + 28;

  const yK = y, hK = h - pad - yK, xi = pad + 44, xr = w - pad - 44;
  c.fillStyle = PUTIH; kotakBulat(c, pad, yK, lebar, hK, 48); c.fill();
  let yy = yK + 40 * k;
  c.fillStyle = tema.tinta; c.font = `${48 * k}px ${HURUF.arab}`; c.textAlign = "right";
  yy = tulis(c, kut.ar, xr, yy, xr - xi, 0, 70 * k, { rtl: true });
  if (kut.sumber) { c.fillStyle = REDUP; c.font = `500 ${22 * k}px ${HURUF.body}`; c.fillText(kut.sumber, xr, yy); yy += 34 * k; }
  c.textAlign = "left"; yy += 8 * k;
  c.fillStyle = REDUP; c.font = `500 ${28 * k}px ${HURUF.body}`; c.fillText("Alhamdulillah, saya telah menuntaskan", xi, yy); yy += 48 * k;
  c.fillStyle = TINTA; c.font = `700 ${124 * k}px ${HURUF.display}`; c.fillText(`Juz ${data.juz}`, xi - 4, yy); yy += 136 * k;
  c.fillStyle = REDUP; c.font = `500 ${28 * k}px ${HURUF.body}`; c.fillText(rentangJuz(data.juz), xi, yy);

  const yKaki = yK + hK - 44 - 84 * k;
  c.fillStyle = "#ecece8"; c.fillRect(xi, yKaki - 24 * k, xr - xi, 2);
  c.fillStyle = TINTA; c.font = `600 ${32 * k}px ${HURUF.body}`; c.fillText(bungkusTeks(c, x.nama, xr - xi - 240 * k)[0], xi, yKaki);
  c.fillStyle = REDUP; c.font = `500 ${24 * k}px ${HURUF.body}`; c.fillText(bungkusTeks(c, kaki(x), xr - xi)[0], xi, yKaki + 46 * k);
  if (data.putaran) {
    c.font = `600 ${24 * k}px ${HURUF.body}`;
    const t = `Putaran ${data.putaran}`, pw = c.measureText(t).width + 44 * k, ph = 54 * k, px = xr - pw;
    c.fillStyle = tema.latar; kotakBulat(c, px, yKaki - 6, pw, ph, ph / 2); c.fill();
    c.fillStyle = TINTA; c.textBaseline = "middle"; c.fillText(t, px + 22 * k, yKaki - 6 + ph / 2 + 1); c.textBaseline = "top";
  }
}

/* ---------- desain 2: Poster (foto penuh, angka raksasa) ---------- */
function tplPoster(x) {
  const { c, w, h, story, k, pad, data, foto, logo, tema, kut } = x;
  if (foto) tutupCover(c, foto, 0, 0, w, h);
  else {
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, tema.aksen); g.addColorStop(1, tema.gelap2);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.save(); c.globalAlpha = .08; c.fillStyle = PUTIH;
    for (let yy = -60, r = 0; yy < h + 150; yy += 150, r++) for (let xx = r % 2 ? 75 : 0; xx < w + 150; xx += 150) { bintang8(c, xx, yy, 40); c.fill(); }
    c.restore();
  }
  let g = c.createLinearGradient(0, 0, 0, h * .26); g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g; c.fillRect(0, 0, w, h * .26);
  g = c.createLinearGradient(0, h * .36, 0, h); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.45, "rgba(0,0,0,.55)"); g.addColorStop(1, "rgba(0,0,0,.9)");
  c.fillStyle = g; c.fillRect(0, h * .36, w, h * .64);

  // kepala
  c.textAlign = "left"; c.textBaseline = "middle";
  const d = Math.round(92 * k), cy = pad + d / 2;
  let xT = pad, kanan = w - pad;
  if (logo) { gambarLogo(c, logo, pad + d / 2, cy, d); xT = pad + d + 22; }
  if (data.putaran) {
    c.font = `600 ${24 * k}px ${HURUF.body}`;
    const t = `Putaran ${data.putaran}`, pw = c.measureText(t).width + 40 * k, ph = 52 * k;
    c.fillStyle = "rgba(255,255,255,.22)"; kotakBulat(c, w - pad - pw, cy - ph / 2, pw, ph, ph / 2); c.fill();
    c.fillStyle = PUTIH; c.fillText(t, w - pad - pw + 20 * k, cy + 1);
    kanan = w - pad - pw - 20;
  }
  c.fillStyle = PUTIH; c.font = `700 ${30 * k}px ${HURUF.display}`;
  const nm = bungkusTeks(c, x.namaAcara, kanan - xT).slice(0, 2);
  nm.forEach((b, i) => c.fillText(b, xT, cy + (i - (nm.length - 1) / 2) * 38 * k));

  // tumpukan bawah, disusun dari bawah ke atas
  c.textBaseline = "alphabetic";
  const yNama = h - pad - 46 * k;
  c.fillStyle = PUTIH; c.font = `700 ${34 * k}px ${HURUF.body}`; c.fillText(bungkusTeks(c, x.nama, w - 2 * pad)[0], pad, yNama);
  c.fillStyle = "rgba(255,255,255,.72)"; c.font = `500 ${24 * k}px ${HURUF.body}`; c.fillText(bungkusTeks(c, kaki(x), w - 2 * pad)[0], pad, yNama + 40 * k);
  const yGaris = yNama - 60 * k;
  c.fillStyle = "rgba(255,255,255,.3)"; c.fillRect(pad, yGaris, w - 2 * pad, 2);

  c.font = `${46 * k}px ${HURUF.arab}`; c.direction = "rtl";
  let bar = bungkusTeks(c, kut.ar, w - 2 * pad); if (bar.length > 2) bar = bar.slice(0, 2);
  const tA = 68 * k, ySumber = kut.sumber ? 36 * k : 0;
  const yA = yGaris - 34 * k - ySumber - (bar.length - 1) * tA;
  c.fillStyle = PUTIH; c.textAlign = "right"; bar.forEach((b, i) => c.fillText(b, w - pad, yA + i * tA)); c.direction = "ltr";
  if (kut.sumber) { c.fillStyle = "rgba(255,255,255,.65)"; c.font = `500 ${22 * k}px ${HURUF.body}`; c.fillText(kut.sumber, w - pad, yA + (bar.length - 1) * tA + ySumber); }
  c.textAlign = "left";

  const yRent = yA - 74 * k;
  c.fillStyle = "rgba(255,255,255,.88)"; c.font = `500 ${30 * k}px ${HURUF.body}`; c.fillText(rentangJuz(data.juz), pad, yRent);
  const N = story ? 440 : 320, yNum = yRent - 46 * k;
  c.fillStyle = PUTIH; c.font = `800 ${N}px ${HURUF.display}`; c.fillText(String(data.juz), pad - N * .04, yNum);
  const wNum = c.measureText(String(data.juz)).width;
  c.font = `700 ${40 * k}px ${HURUF.display}`; c.fillText("JUZ", pad, yNum - N * .74 - 22 * k);
  // pil "Tuntas" di samping angka
  const ph = 66 * k; c.font = `700 ${28 * k}px ${HURUF.body}`;
  const pw = c.measureText("Tuntas").width + ph + 30 * k, xp = pad + wNum - N * .02 + 22 * k, yp = yNum - ph - 6 * k;
  c.fillStyle = PUTIH; kotakBulat(c, xp, yp, pw, ph, ph / 2); c.fill();
  c.fillStyle = tema.aksen; lingkar(c, xp + ph / 2, yp + ph / 2, ph / 2 - 9); c.fill();
  centang(c, xp + ph / 2, yp + ph / 2, 9 * k, PUTIH, 5 * k);
  c.fillStyle = TINTA; c.textBaseline = "middle"; c.fillText("Tuntas", xp + ph + 6 * k, yp + ph / 2 + 1); c.textBaseline = "alphabetic";
}

/* ---------- desain 3: Iluminasi (bingkai emas, jendela mihrab) ---------- */
function tplIluminasi(x) {
  const { c, w, h, story, k, data, acara, foto, logo, tema, kut } = x;
  const m = 34;
  const g = c.createRadialGradient(w / 2, h * .42, 40, w / 2, h * .45, h * .78); g.addColorStop(0, tema.gelap); g.addColorStop(1, tema.gelap2);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.save(); c.globalAlpha = .08; c.strokeStyle = EMAS; c.lineWidth = 2;
  for (let yy = 0, r = 0; yy < h + 120; yy += 120, r++) for (let xx = r % 2 ? 60 : 0; xx < w + 120; xx += 120) { bintang8(c, xx, yy, 30); c.stroke(); }
  c.restore();
  c.strokeStyle = EMAS; c.lineWidth = 4; c.strokeRect(m, m, w - 2 * m, h - 2 * m);
  c.lineWidth = 1.5; c.strokeRect(m + 14, m + 14, w - 2 * m - 28, h - 2 * m - 28);
  for (const [px, py] of [[m, m], [w - m, m], [m, h - m], [w - m, h - m]]) {
    c.fillStyle = tema.gelap2; bintang8(c, px, py, 32); c.fill();
    c.fillStyle = EMAS; bintang8(c, px, py, 25); c.fill();
    c.fillStyle = tema.gelap; lingkar(c, px, py, 8); c.fill();
  }
  c.textAlign = "center"; c.textBaseline = "top";
  let y = m + 60 * k;
  if (logo) { const d = 104 * k; gambarLogo(c, logo, w / 2, y + d / 2, d, PUTIH, EMAS); y += d + 22 * k; }
  c.fillStyle = EMAS_MUDA; c.font = `600 ${32 * k}px ${HURUF.serif}`;
  y = tulis(c, x.namaAcara, w / 2, y, w - 2 * m - 140, 0, 40 * k);
  if (acara.sub) { c.fillStyle = "rgba(243,230,196,.65)"; c.font = `500 ${22 * k}px ${HURUF.body}`; c.fillText(bungkusTeks(c, acara.sub, w - 280)[0], w / 2, y + 4); y += 34 * k; }
  y += 18 * k;
  c.fillStyle = EMAS; c.font = `${story ? 78 : 62}px ${HURUF.arab}`; c.direction = "rtl";
  c.fillText("الجزء " + URUTAN_JUZ[data.juz - 1], w / 2, y); c.direction = "ltr";
  y += story ? 122 : 94;

  const aw = story ? w * .66 : w * .5, ah = story ? 780 : 470, ax = (w - aw) / 2;
  c.save(); mihrab(c, ax, y, aw, ah); c.clip();
  if (foto) tutupCover(c, foto, ax, y, aw, ah);
  else {
    const gg = c.createLinearGradient(0, y, 0, y + ah); gg.addColorStop(0, tema.aksen); gg.addColorStop(1, tema.gelap); c.fillStyle = gg; c.fillRect(ax, y, aw, ah);
    const cy2 = y + ah * .58;
    c.fillStyle = EMAS; bintang8(c, w / 2, cy2, aw * .34); c.fill();
    c.fillStyle = tema.gelap2; lingkar(c, w / 2, cy2, aw * .24); c.fill();
    c.fillStyle = EMAS; c.font = `800 ${aw * .26}px ${HURUF.display}`; c.textBaseline = "middle"; c.fillText(String(data.juz), w / 2, cy2 + aw * .01); c.textBaseline = "top";
  }
  c.restore();
  c.strokeStyle = EMAS; c.lineWidth = 7; mihrab(c, ax, y, aw, ah); c.stroke();
  c.lineWidth = 2; mihrab(c, ax - 16, y - 16, aw + 32, ah + 16); c.stroke();
  y += ah + 34 * k;

  c.fillStyle = EMAS_MUDA; c.font = `600 ${56 * k}px ${HURUF.serif}`; c.fillText(`Juz ${data.juz} tuntas`, w / 2, y); y += 72 * k;
  c.fillStyle = "rgba(243,230,196,.7)"; c.font = `500 ${24 * k}px ${HURUF.body}`; c.fillText(rentangJuz(data.juz), w / 2, y); y += 54 * k;
  c.fillStyle = EMAS; bintang8(c, w / 2, y, 12 * k); c.fill(); c.fillRect(w / 2 - 170 * k, y - 1, 140 * k, 2); c.fillRect(w / 2 + 30 * k, y - 1, 140 * k, 2);
  y += 30 * k;
  c.fillStyle = EMAS; c.font = `${44 * k}px ${HURUF.arab}`;
  y = tulis(c, kut.ar, w / 2, y, w - 2 * m - 150, 0, 66 * k, { rtl: true });
  if (story) { c.fillStyle = "rgba(243,230,196,.85)"; c.font = `italic 400 ${26 * k}px ${HURUF.serif}`; y = tulis(c, `“${kut.arti}”`, w / 2, y + 6, w - 2 * m - 190, 0, 36 * k); }
  if (kut.sumber) { c.fillStyle = "rgba(243,230,196,.6)"; c.font = `500 ${20 * k}px ${HURUF.body}`; c.fillText(kut.sumber, w / 2, y + 8); }

  const yF = h - m - 40 - 84 * k;
  c.fillStyle = EMAS_MUDA; c.font = `700 ${32 * k}px ${HURUF.body}`; c.fillText(bungkusTeks(c, x.nama, w - 280)[0], w / 2, yF);
  c.fillStyle = "rgba(243,230,196,.62)"; c.font = `500 ${22 * k}px ${HURUF.body}`; c.fillText(bungkusTeks(c, kaki(x), w - 220)[0], w / 2, yF + 44 * k);
  c.textAlign = "left";
}

/* ---------- desain 4: Polaroid (foto miring, tulisan tangan, stiker) ---------- */
function tplPolaroid(x) {
  const { c, w, h, story, k, pad, data, acara, foto, logo, tema, kut } = x;
  c.fillStyle = tema.lembut; c.fillRect(0, 0, w, h);
  c.fillStyle = tema.latar2;
  for (let yy = 23; yy < h; yy += 46) for (let xx = 23; xx < w; xx += 46) { lingkar(c, xx, yy, 3.2); c.fill(); }
  c.fillStyle = tema.latar; c.font = `800 ${story ? 880 : 640}px ${HURUF.display}`; c.textAlign = "right"; c.textBaseline = "alphabetic";
  c.fillText(String(data.juz), w + 30, h - 20);

  c.textAlign = "left"; c.textBaseline = "top";
  const d = Math.round(84 * k);
  let xT = pad;
  if (logo) { gambarLogo(c, logo, pad + d / 2, pad + d / 2, d); xT = pad + d + 20; }
  c.fillStyle = TINTA; c.font = `700 ${30 * k}px ${HURUF.display}`;
  const nm = bungkusTeks(c, x.namaAcara, w - pad - xT).slice(0, 2);
  const tn = nm.length * 38 * k + (acara.sub ? 32 * k : 0);
  let ty = pad + Math.max(0, (d - tn) / 2);
  nm.forEach(b => { c.fillText(b, xT, ty); ty += 38 * k; });
  if (acara.sub) { c.fillStyle = REDUP; c.font = `500 ${22 * k}px ${HURUF.body}`; c.fillText(bungkusTeks(c, acara.sub, w - pad - xT)[0], xT, ty + 2); }
  let y = pad + Math.max(d, tn) + (story ? 56 : 40);

  const pw = story ? w * .8 : w * .62, mm = pw * .045, sisi = pw - 2 * mm;
  const fh = story ? sisi : sisi * .88, cap = (story ? 210 : 160) * (story ? 1 : 1);
  const pH = mm + fh + cap, cx = w / 2, cy = y + pH / 2 + 10;
  c.save(); c.translate(cx, cy); c.rotate(-0.055);
  c.shadowColor = "rgba(0,0,0,.2)"; c.shadowBlur = 44; c.shadowOffsetY = 20;
  c.fillStyle = "#fffefa"; c.fillRect(-pw / 2, -pH / 2, pw, pH);
  c.shadowColor = "transparent"; c.shadowBlur = 0; c.shadowOffsetY = 0;
  const x0 = -pw / 2 + mm, y0 = -pH / 2 + mm;
  if (foto) tutupCover(c, foto, x0, y0, sisi, fh);
  else {
    c.fillStyle = tema.latar2; c.fillRect(x0, y0, sisi, fh);
    c.fillStyle = tema.tinta; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = `800 ${fh * .5}px ${HURUF.display}`; c.fillText(String(data.juz), 0, y0 + fh * .55);
    c.font = `${60 * k}px ${HURUF.arab}`; c.fillText("الجزء", 0, y0 + fh * .16);
  }
  c.fillStyle = "#2b2b2b"; c.textAlign = "center"; c.textBaseline = "alphabetic";
  c.font = `700 ${50 * k}px ${HURUF.tangan}`; c.fillText("Alhamdulillah,", 0, y0 + fh + cap * .42);
  c.font = `700 ${84 * k}px ${HURUF.tangan}`; c.fillText(`Juz ${data.juz} tuntas!`, 0, y0 + fh + cap * .88);
  c.save(); c.translate(0, -pH / 2 + 4); c.rotate(0.07); c.globalAlpha = .82; c.fillStyle = tema.latar2;
  c.fillRect(-125 * k, -30 * k, 250 * k, 60 * k); c.restore();
  c.restore();

  // stiker bintang di pojok foto
  const r = 104 * k;
  c.save(); c.translate(cx + pw / 2 - 40 * k, y + 40 * k); c.rotate(0.22);
  c.shadowColor = "rgba(0,0,0,.18)"; c.shadowBlur = 18; c.shadowOffsetY = 8;
  c.fillStyle = tema.aksen; bintang8(c, 0, 0, r, .82); c.fill();
  c.shadowColor = "transparent";
  c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 3; lingkar(c, 0, 0, r * .68); c.stroke();
  c.fillStyle = PUTIH; c.textAlign = "center"; c.textBaseline = "middle";
  c.font = `700 ${22 * k}px ${HURUF.body}`; c.fillText("JUZ", 0, -r * .34);
  c.font = `800 ${r * .62}px ${HURUF.display}`; c.fillText(String(data.juz), 0, r * .12);
  c.restore();

  y = cy + pH / 2 + (story ? 74 : 56);
  c.textAlign = "center"; c.textBaseline = "top";
  c.fillStyle = TINTA; c.font = `${44 * k}px ${HURUF.arab}`;
  y = tulis(c, kut.ar, w / 2, y, w - 2 * pad - 40, 0, 66 * k, { rtl: true });
  if (kut.sumber) { c.fillStyle = REDUP; c.font = `500 ${21 * k}px ${HURUF.body}`; c.fillText(kut.sumber, w / 2, y + 2); }
  const yF = h - pad - 84 * k;
  c.fillStyle = TINTA; c.font = `700 ${32 * k}px ${HURUF.body}`; c.fillText(bungkusTeks(c, x.nama, w - 2 * pad)[0], w / 2, yF);
  c.fillStyle = REDUP; c.font = `500 ${23 * k}px ${HURUF.body}`; c.fillText(bungkusTeks(c, [rentangJuz(data.juz), kaki(x)].join("  ·  "), w - 2 * pad)[0], w / 2, yF + 46 * k);
  c.textAlign = "left";
}

/* ---------- desain 5: Lencana (medali, pita, konfeti) ---------- */
function tplLencana(x) {
  const { c, w, h, story, k, pad, data, foto, logo, tema, kut } = x;
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, tema.aksen); g.addColorStop(1, tema.gelap2);
  c.fillStyle = g; c.fillRect(0, 0, w, h);

  c.textAlign = "center"; c.textBaseline = "top";
  let y = pad;
  if (logo) { const d = 88 * k; gambarLogo(c, logo, w / 2, y + d / 2, d); y += d + 18 * k; }
  c.fillStyle = PUTIH; c.font = `700 ${30 * k}px ${HURUF.display}`;
  y = tulis(c, x.namaAcara, w / 2, y, w - 2 * pad - 60, 0, 38 * k) + 40 * k;

  const R = story ? 340 : 215, cx = w / 2, cy = y + R * 1.22 + 10, yKepala = y - 20 * k;
  // konfeti
  const rnd = acak(data.juz * 977 + (data.putaran || 0) * 31);
  const warna = [EMAS, PUTIH, tema.latar, "#f6cbb9", "#f6eba8", "#cfe8f3"];
  for (let i = 0; i < (story ? 80 : 56); i++) {
    const px = rnd() * w, py = rnd() * (cy + R * 1.6), jenis = rnd(), ukuran = (8 + rnd() * 12) * k;
    if (Math.hypot(px - cx, py - cy) < R * 1.38 || py < yKepala) continue;
    c.save(); c.translate(px, py); c.rotate(rnd() * Math.PI); c.globalAlpha = .55 + rnd() * .4; c.fillStyle = warna[Math.floor(rnd() * warna.length)];
    if (jenis < .4) { lingkar(c, 0, 0, ukuran * .5); c.fill(); }
    else if (jenis < .8) c.fillRect(-ukuran * .3, -ukuran, ukuran * .6, ukuran * 2);
    else { bintang8(c, 0, 0, ukuran * .8, .55); c.fill(); }
    c.restore();
  }
  // medali
  c.fillStyle = "#c49a3c"; bintang8(c, cx, cy, R * 1.24, .86, Math.PI / 8); c.fill();
  c.fillStyle = EMAS; bintang8(c, cx, cy, R * 1.24, .86); c.fill();
  c.fillStyle = tema.gelap2; lingkar(c, cx, cy, R * 1.06); c.fill();
  c.fillStyle = EMAS_MUDA; c.font = `700 ${26 * k}px ${HURUF.body}`;
  const busur = Math.PI * R * .94 * .82;
  let atas = x.namaAcara.toUpperCase();
  while (atas.length > 4 && c.measureText(atas).width + atas.length * 5 * k > busur) atas = atas.slice(0, -2).trimEnd() + "…";
  teksLengkung(c, atas, cx, cy, R * .945, -Math.PI / 2, 5 * k);
  teksLengkungBawah(c, "ALHAMDULILLAH", cx, cy, R * .945, 7 * k);
  c.save(); lingkar(c, cx, cy, R * .84); c.clip();
  if (foto) tutupCover(c, foto, cx - R * .84, cy - R * .84, R * 1.68, R * 1.68);
  else {
    c.fillStyle = tema.latar; c.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    c.fillStyle = tema.tinta; c.textBaseline = "middle";
    c.font = `800 ${R * .9}px ${HURUF.display}`; c.fillText(String(data.juz), cx, cy + R * .1);
    c.font = `${R * .2}px ${HURUF.arab}`; c.fillText("الجزء", cx, cy - R * .5); c.textBaseline = "top";
  }
  c.restore();
  c.strokeStyle = PUTIH; c.lineWidth = 6; lingkar(c, cx, cy, R * .84); c.stroke();

  // pita
  const yr = cy + R * 1.12, rw = w * .74, rh = 112 * k, rx = (w - rw) / 2, ekor = 70 * k;
  c.fillStyle = "#d8d2c0";
  for (const s of [-1, 1]) {
    const xe = s < 0 ? rx - ekor * .6 : rx + rw + ekor * .6;
    c.beginPath();
    c.moveTo(xe - s * ekor, yr + 26 * k); c.lineTo(xe + s * ekor * .55, yr + 26 * k); c.lineTo(xe + s * ekor * .15, yr + 26 * k + rh / 2);
    c.lineTo(xe + s * ekor * .55, yr + 26 * k + rh); c.lineTo(xe - s * ekor, yr + 26 * k + rh); c.closePath(); c.fill();
  }
  c.fillStyle = PUTIH; kotakBulat(c, rx, yr, rw, rh, 14 * k); c.fill();
  c.fillStyle = tema.tinta; c.font = `800 ${52 * k}px ${HURUF.display}`; c.textBaseline = "middle";
  c.fillText(`JUZ ${data.juz} TUNTAS`, w / 2, yr + rh / 2 + 2); c.textBaseline = "top";
  y = yr + rh + 46 * k;

  if (data.totalSaya) { c.fillStyle = PUTIH; c.font = `600 ${30 * k}px ${HURUF.body}`; c.fillText(`Juz ke-${data.totalSaya} yang sudah kutuntaskan`, w / 2, y); y += 46 * k; }
  c.fillStyle = "rgba(255,255,255,.8)"; c.font = `500 ${26 * k}px ${HURUF.body}`; c.fillText(rentangJuz(data.juz), w / 2, y); y += 58 * k;
  c.fillStyle = PUTIH; c.font = `${44 * k}px ${HURUF.arab}`;
  y = tulis(c, kut.ar, w / 2, y, w - 2 * pad - 60, 0, 66 * k, { rtl: true });
  if (kut.sumber) { c.fillStyle = "rgba(255,255,255,.65)"; c.font = `500 ${21 * k}px ${HURUF.body}`; c.fillText(kut.sumber, w / 2, y + 2); }
  const yF = h - pad - 84 * k;
  c.fillStyle = PUTIH; c.font = `700 ${32 * k}px ${HURUF.body}`; c.fillText(bungkusTeks(c, x.nama, w - 2 * pad)[0], w / 2, yF);
  c.fillStyle = "rgba(255,255,255,.7)"; c.font = `500 ${23 * k}px ${HURUF.body}`; c.fillText(bungkusTeks(c, kaki(x), w - 2 * pad)[0], w / 2, yF + 46 * k);
  c.textAlign = "left";
}
function teksLengkungBawah(c, teks, cx, cy, r, spasi) {
  const ch = [...teks], lebar = ch.map(t => c.measureText(t).width);
  const total = lebar.reduce((a, b) => a + b, 0) + spasi * (ch.length - 1);
  let a = Math.PI / 2 + total / r / 2;
  c.save(); c.textAlign = "center"; c.textBaseline = "middle";
  ch.forEach((t, i) => {
    a -= lebar[i] / 2 / r;
    c.save(); c.translate(cx + r * Math.cos(a), cy + r * Math.sin(a)); c.rotate(a - Math.PI / 2); c.fillText(t, 0, 0); c.restore();
    a -= (lebar[i] / 2 + spasi) / r;
  });
  c.restore();
}

const TEMPLATE = {
  minimal: { nama: "Minimal", gambar: tplMinimal },
  poster: { nama: "Poster", gambar: tplPoster },
  iluminasi: { nama: "Iluminasi", gambar: tplIluminasi },
  polaroid: { nama: "Polaroid", gambar: tplPolaroid },
  lencana: { nama: "Lencana", gambar: tplLencana },
};

/* ---------- menggambar ---------- */
function lukis(cv, tpl, lebarPx) {
  const { w, h } = UKURAN[state.format];
  const s = lebarPx ? lebarPx / w : 1;
  cv.width = Math.round(w * s); cv.height = Math.round(h * s);
  const c = cv.getContext("2d");
  c.setTransform(s, 0, 0, s, 0, 0);
  c.textAlign = "left"; c.textBaseline = "top"; c.direction = "ltr";
  TEMPLATE[tpl].gambar(konteks(c, w, h));
}
async function gambar({ miniatur = true } = {}) {
  if (!state) return;
  lukis($("kCanvas"), state.template);
  if (miniatur) $("kTpl").querySelectorAll("[data-tpl]").forEach(b => lukis(b.querySelector("canvas"), b.dataset.tpl, 152));
}

function keBlob() { return new Promise(ok => $("kCanvas").toBlob(ok, "image/jpeg", 0.92)); }
function namaBerkas() { return `khatmil-quran-juz-${state.data.juz}-${state.template}-${state.format}.jpg`; }

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
$("kTanpaFoto").addEventListener("click", async () => {
  if (!state) return;
  if (state.fotoAsli?.close) state.fotoAsli.close();
  state.fotoAsli = null; state.foto = null; $("kFilterBox").hidden = true;
  await gambar();
});
$("kFotoKamera").addEventListener("change", e => pakaiFoto(e.target.files[0]));
$("kFotoGaleri").addEventListener("change", e => pakaiFoto(e.target.files[0]));
document.querySelectorAll("[data-format]").forEach(b => b.addEventListener("click", async () => { pilihFormat(b.dataset.format); ingatPilihan(); await gambar(); }));
$("kTpl").addEventListener("click", async e => {
  const b = e.target.closest("[data-tpl]"); if (!b || !state) return;
  state.template = b.dataset.tpl; tandai($("kTpl"), "data-tpl", state.template); ingatPilihan();
  await gambar({ miniatur: false });
});
$("kFilter").addEventListener("click", async e => {
  const b = e.target.closest("[data-filter]"); if (!b || !state) return;
  state.filter = b.dataset.filter; tandai($("kFilter"), "data-filter", state.filter);
  if (state.fotoAsli) { state.foto = terapkanFilter(state.fotoAsli, state.filter); await gambar(); }
});
$("kKutipan").addEventListener("change", async e => { if (!state) return; state.kutipan = e.target.value; ingatPilihan(); await gambar(); });
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
  const bmp = await createImageBitmap(c);
  tutupKamera();
  setStatus("");
  await setelFoto(bmp);
}
$("kSelfie").addEventListener("click", bukaKamera);
$("kJepret").addEventListener("click", jepret);
$("kBatal").addEventListener("click", tutupKamera);
$("kBalik").addEventListener("click", async () => {
  hadap = hadap === "user" ? "environment" : "user";
  try { await nyalakan(); } catch { hadap = "user"; $("kKameraMsg").textContent = "Kamera lain tidak tersedia."; try { await nyalakan(); } catch {} }
});
document.addEventListener("visibilitychange", () => { if (document.hidden && !$("kamera").hidden) tutupKamera(); });

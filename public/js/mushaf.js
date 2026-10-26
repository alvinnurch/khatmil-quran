// Penampil mushaf per halaman: Mushaf Madinah riwayat Hafs 'an 'Ashim, 15 baris, 604 halaman.
// Tata letak halaman dan font glyph QCF v4 dimuat dari paket npm `quran-qcf4` lewat jsDelivr,
// jadi tidak ada gambar mushaf yang perlu di-upload ke hosting Anda.
import { angkaArab } from "./common.js";

export const MUSHAF_BASE = globalThis.KHATAM_MUSHAF_BASE || "https://cdn.jsdelivr.net/npm/quran-qcf4@1.1.0/";

// Halaman awal dan ayat pertama tiap juz (Mushaf Madinah 1441 H).
const HAL_AWAL = [1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];
const AYAT_AWAL = ["1:1", "2:142", "2:253", "3:93", "4:24", "4:148", "5:82", "6:111", "7:88", "8:41", "9:93", "11:6", "12:53", "15:1", "17:1", "18:75", "21:1", "23:1", "25:21", "27:56", "29:46", "33:31", "36:28", "39:32", "41:47", "46:1", "51:31", "58:1", "67:1", "78:1"];
// Juz yang dimulai di tengah halaman: halaman awalnya masih memuat akhir juz sebelumnya.
const MULAI_TENGAH = new Set([4, 7, 11, 26]);

const kunci = vk => { const [s, a] = String(vk).split(":").map(Number); return s * 1000 + a; };

/** Rentang halaman dan ayat satu juz. */
export function halamanJuz(j) {
  const awal = HAL_AWAL[j - 1];
  const akhir = j === 30 ? 604 : (MULAI_TENGAH.has(j + 1) ? HAL_AWAL[j] : HAL_AWAL[j] - 1);
  return { awal, akhir, dari: kunci(AYAT_AWAL[j - 1]), sampai: j === 30 ? Infinity : kunci(AYAT_AWAL[j]) };
}

const muatanFont = {}, muatanHal = {};
function berkasFont(nama) { return nama === "QCF4_QBSML" ? "QCF4_QBSML.woff2" : `${nama}_W.woff2`; }
export function muatFont(nama) {
  return muatanFont[nama] ??= (async () => {
    const res = await fetch(MUSHAF_BASE + "fonts-woff2/" + berkasFont(nama));
    if (!res.ok) throw new Error("font " + nama);
    const ff = new FontFace(nama, await res.arrayBuffer());
    await ff.load();
    document.fonts.add(ff);
  })().catch(e => { delete muatanFont[nama]; throw e; });
}
export function muatHalaman(p) {
  return muatanHal[p] ??= fetch(MUSHAF_BASE + `pages/${String(p).padStart(3, "0")}.json`)
    .then(r => { if (!r.ok) throw new Error("halaman " + p); return r.json(); })
    .catch(e => { delete muatanHal[p]; throw e; });
}

/** Siapkan halaman beserta semua font yang dipakainya. */
export async function siapkanHalaman(p) {
  const data = await muatHalaman(p);
  const fonts = new Set();
  data.lines.forEach(l => l.words.forEach(w => fonts.add(w.font)));
  await Promise.all([...fonts].map(muatFont));
  return data;
}
/** Muat lebih dulu halaman berikutnya di latar belakang. */
export function prefetch(p) { if (p >= 1 && p <= 604) siapkanHalaman(p).catch(() => {}); }

/** Bangun DOM satu halaman ke dalam `el`. Kata di luar juz (`jz`) dibuat samar. */
export function gambarHalaman(el, data, jz, juzNo) {
  const surah = data.surahs?.[0];
  const pembuka = data.page <= 2;
  let baris = "";
  for (const l of data.lines) {
    const jenis = l.words[0]?.type;
    const tengah = pembuka || jenis === "surah_header" || jenis === "bismillah";
    const kata = l.words.map(w => {
      const luar = w.verse_key && (kunci(w.verse_key) < jz.dari || kunci(w.verse_key) >= jz.sampai);
      const kelas = ["mp-w", w.type === "end" ? "mp-end" : "", luar ? "mp-luar" : ""].join(" ").trim();
      return `<span class="${kelas}" style="font-family:'${w.font}'">${w.char}</span>`;
    }).join("");
    baris += `<div class="mp-line${tengah ? " mp-center" : ""}${jenis === "surah_header" ? " mp-header" : ""}">${kata}</div>`;
  }
  el.innerHTML = `
    <div class="mp-top"><span>الجزء ${angkaArab(juzNo)}</span><span>${surah ? "سورة " + surah.name_arabic : ""}</span></div>
    <div class="mp-lines${pembuka ? " mp-pembuka" : ""}">${baris}</div>
    <div class="mp-bottom">${angkaArab(data.page)}</div>`;
  paskanUkuran(el);
}

/** Ukur baris terpanjang lalu skalakan font agar pas selebar halaman. */
export function paskanUkuran(el) {
  const wadah = el.querySelector(".mp-lines");
  if (!wadah) return;
  const lebar = wadah.clientWidth;
  if (!lebar) return;
  wadah.style.fontSize = "100px";
  wadah.classList.add("mp-ukur");
  let maks = 0;
  wadah.querySelectorAll(".mp-line:not(.mp-center)").forEach(b => { maks = Math.max(maks, b.scrollWidth); });
  if (!maks) wadah.querySelectorAll(".mp-line").forEach(b => { maks = Math.max(maks, b.scrollWidth * 1.6); });
  wadah.classList.remove("mp-ukur");
  wadah.style.fontSize = Math.max(12, Math.min(60, 100 * lebar / (maks * 1.02))) + "px";
}

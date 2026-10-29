import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator, doc, runTransaction } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig, DOMAIN_PESERTA, PAKAI_EMULATOR } from "./firebase-config.js";

export const configBelumDiisi = String(firebaseConfig.apiKey).startsWith("GANTI") && !PAKAI_EMULATOR && !globalThis.KHATAM_DEMO;
export const app = initializeApp(configBelumDiisi || PAKAI_EMULATOR ? { apiKey: "demo", projectId: "demo-khatam", appId: "demo" } : firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
if (PAKAI_EMULATOR) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

/** Nomor WhatsApp → ID akun dosen/peserta luar, mis. 0812-3456-789 → wa62812345678. */
export function idDariWa(no) {
  let d = String(no || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d.length >= 10 && d.length <= 15 && d.startsWith("62") ? "wa" + d : "";
}
export const KATEGORI = { mahasiswa: "Mahasiswa", dosen: "Dosen", umum: "Peserta luar" };
/** Label kelompok untuk rekap: prodi untuk mahasiswa, "Dosen" atau "Peserta luar" untuk lainnya. */
export const kelompok = p => p.kategori && p.kategori !== "mahasiswa" ? KATEGORI[p.kategori] : (p.prodi || "Mahasiswa");
/** Tampilan identitas: NIM untuk mahasiswa, nomor WA (0812…) untuk lainnya. */
export const tampilId = p => String(p.nim || "").startsWith("wa62") ? "0" + p.nim.slice(4) : p.nim;
export const emailNim = nim => `${nim}@${DOMAIN_PESERTA}`.toLowerCase();
export const isAkunPeserta = user => !!user?.email?.endsWith("@" + DOMAIN_PESERTA);
export const nimDariUser = user => user.email.split("@")[0];

// [surah awal, ayat awal, surah akhir, ayat akhir, jumlah ayat] untuk Juz 1–30 (mushaf standar Madinah)
export const JUZ = [["Al-Fatihah",1,"Al-Baqarah",141,148],["Al-Baqarah",142,"Al-Baqarah",252,111],["Al-Baqarah",253,"Ali 'Imran",92,126],["Ali 'Imran",93,"An-Nisa",23,131],["An-Nisa",24,"An-Nisa",147,124],["An-Nisa",148,"Al-Ma'idah",81,110],["Al-Ma'idah",82,"Al-An'am",110,149],["Al-An'am",111,"Al-A'raf",87,142],["Al-A'raf",88,"Al-Anfal",40,159],["Al-Anfal",41,"At-Tawbah",92,127],["At-Tawbah",93,"Hud",5,151],["Hud",6,"Yusuf",52,170],["Yusuf",53,"Ibrahim",52,154],["Al-Hijr",1,"An-Nahl",128,227],["Al-Isra",1,"Al-Kahf",74,185],["Al-Kahf",75,"Taha",135,269],["Al-Anbya",1,"Al-Hajj",78,190],["Al-Mu'minun",1,"Al-Furqan",20,202],["Al-Furqan",21,"An-Naml",55,339],["An-Naml",56,"Al-'Ankabut",45,171],["Al-'Ankabut",46,"Al-Ahzab",30,178],["Al-Ahzab",31,"Ya-Sin",27,169],["Ya-Sin",28,"Az-Zumar",31,357],["Az-Zumar",32,"Fussilat",46,175],["Fussilat",47,"Al-Jathiyah",37,246],["Al-Ahqaf",1,"Adh-Dhariyat",30,195],["Adh-Dhariyat",31,"Al-Hadid",29,399],["Al-Mujadila",1,"At-Tahrim",12,137],["Al-Mulk",1,"Al-Mursalat",50,431],["An-Naba",1,"An-Nas",6,564]];
export const rentangJuz = j => { const m = JUZ[j - 1]; return `${m[0]} ${m[1]} – ${m[2]} ${m[3]}`; };

export const $ = id => document.getElementById(id);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const angkaArab = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
export const bersihkanNim = s => String(s || "").replace(/[^0-9A-Za-z]/g, "");
export function lalu(t) {
  if (!t) return "";
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return m + " menit lalu";
  const h = Math.round(m / 60);
  if (h < 24) return h + " jam lalu";
  return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
export function setMsg(id, text, kind) { const el = $(id); if (!el) return; el.textContent = text || ""; el.className = "msg" + (kind ? " " + kind : ""); }

export function pesanError(e) {
  const c = e?.code || "";
  if (c === "auth/email-already-in-use") return "NIM ini sudah terdaftar. Silakan masuk.";
  if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found" || c === "auth/invalid-login-credentials") return "NIM/email atau PIN salah.";
  if (c === "auth/weak-password") return "PIN minimal 6 karakter.";
  if (c === "auth/too-many-requests") return "Terlalu banyak percobaan. Tunggu beberapa menit.";
  if (c === "auth/network-request-failed" || c === "unavailable") return "Koneksi bermasalah. Periksa internet lalu coba lagi.";
  if (c === "permission-denied") return "Akses ditolak oleh aturan database.";
  if (c === "punya-aktif") return "Anda masih memegang satu juz. Selesaikan atau kembalikan dulu.";
  return "Terjadi kesalahan. Coba lagi.";
}

/**
 * Membagikan satu juz kepada peserta, dalam satu transaksi.
 * Aturan:
 *  1. Satu putaran = Juz 1–30, masing-masing tepat satu kali. Putaran baru baru dibuka setelah
 *     ke-30 juz putaran berjalan sudah diambil semuanya.
 *  2. Juz yang dikembalikan/dilepas dari putaran lama ("kosong") dibagikan lebih dulu, supaya
 *     putaran lama segera lengkap dan terhitung khatam.
 *  3. Di antara juz yang boleh diambil, utamakan yang belum pernah dibaca peserta ini.
 */
export async function alokasiJuz(peserta, sudahDibaca = new Set()) {
  return runTransaction(db, async tx => {
    const stRef = doc(db, "state", "alokasi");
    const pRef = doc(db, "peserta", peserta.nim);
    const st = await tx.get(stRef), p = await tx.get(pRef);
    if (p.data()?.aktif) throw { code: "punya-aktif" };
    const s = st.exists() ? st.data() : { putaran: 1, terambil: [], kosong: [] };
    let putaran = s.putaran || 1, terambil = [...(s.terambil || [])];
    let kosong = [...(s.kosong || [])].sort((a, b) => a.p - b.p || a.j - b.j);
    let ambilP, ambilJ;
    if (kosong.length) {
      const pLama = kosong[0].p;                       // selesaikan putaran tertua lebih dulu
      const calon = kosong.filter(k => k.p === pLama);
      const pilih = calon.find(k => !sudahDibaca.has(k.j)) || calon[0];
      ambilP = pilih.p; ambilJ = pilih.j;
      kosong = kosong.filter(k => k !== pilih);
    } else {
      if (terambil.length >= 30) { putaran += 1; terambil = []; }
      const tersedia = [];
      for (let j = 1; j <= 30; j++) if (!terambil.includes(j)) tersedia.push(j);
      ambilJ = tersedia.find(j => !sudahDibaca.has(j)) ?? tersedia[0];
      ambilP = putaran; terambil.push(ambilJ);
    }
    const id = `p${ambilP}-j${ambilJ}`;
    const bRef = doc(db, "bacaan", id);
    const b = await tx.get(bRef);
    if (b.exists()) throw { code: "bentrok" };
    tx.set(stRef, { putaran, terambil, kosong });
    tx.set(bRef, { putaran: ambilP, juz: ambilJ, nim: peserta.nim, nama: peserta.nama, prodi: peserta.prodi || "", uid: peserta.uid, status: "membaca", ambil: Date.now(), selesai: null });
    tx.update(pRef, { aktif: id });
    return id;
  });
}

/** Mengosongkan satu juz (dikembalikan peserta atau dilepas panitia) agar bisa diambil orang lain. */
export async function kosongkanJuz(bacaanId) {
  await runTransaction(db, async tx => {
    const bRef = doc(db, "bacaan", bacaanId);
    const stRef = doc(db, "state", "alokasi");
    const [b, st] = [await tx.get(bRef), await tx.get(stRef)];
    if (!b.exists()) return;
    const d = b.data();
    if (d.status !== "membaca") throw { code: "sudah-selesai" };
    const s = st.exists() ? st.data() : { putaran: 1, terambil: [], kosong: [] };
    let terambil = s.terambil || [], kosong = s.kosong || [];
    if (d.putaran === s.putaran) terambil = terambil.filter(j => j !== d.juz);
    else if (!kosong.some(k => k.p === d.putaran && k.j === d.juz)) kosong = [...kosong, { p: d.putaran, j: d.juz }];
    const pRef = doc(db, "peserta", d.nim);
    const p = await tx.get(pRef);
    tx.set(stRef, { putaran: s.putaran || 1, terambil, kosong });
    tx.delete(bRef);
    if (p.exists() && p.data().aktif === bacaanId) tx.update(pRef, { aktif: null });
  });
}

/** Ringkasan dari seluruh dokumen bacaan. */
export function ringkas(rows) {
  const per = {};
  for (const r of rows) (per[r.putaran] ??= {})[r.juz] = r;
  const putaranList = Object.keys(per).map(Number).sort((a, b) => a - b);
  const selesaiDi = p => Object.values(per[p] || {}).filter(r => r.status === "selesai").length;
  const khatam = putaranList.filter(p => selesaiDi(p) === 30).length;
  return {
    per, putaranList, selesaiDi, khatam,
    juzSelesai: rows.filter(r => r.status === "selesai").length,
    dibaca: rows.filter(r => r.status === "membaca").length,
    pembaca: new Set(rows.map(r => r.nim)).size,
  };
}

/* ---------- warna tema acara ---------- */
export const WARNA_PRESET = [
  ["Hijau", "#1f5c47"], ["Biru", "#1f4f7a"], ["Toska", "#0f6f72"], ["Marun", "#8a1c2b"],
  ["Ungu", "#5b3a8c"], ["Cokelat", "#7a4a1e"], ["Jingga", "#b4531a"], ["Arang", "#2b2f33"],
];
export function hexValid(h) { return /^#[0-9a-f]{6}$/i.test(String(h || "")); }
function keHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100) };
}
const hsl = (h, s, l) => `hsl(${h} ${Math.round(s)}% ${Math.round(l)}%)`;
const batas = (v, a, b) => Math.min(b, Math.max(a, v));

/** Turunkan palet halaman dari satu warna acara: latar netral bernuansa warna itu, ubin pastel, dan aksen. */
export function paletTema(hex) {
  const { h, s } = keHsl(hex);
  const sn = batas(s * .25, 0, 10), sp = batas(s, 25, 60), sk = batas(s, 20, 75);
  return {
    terang: { bg: hsl(h, sn, 94), sunk: hsl(h, sn, 95.5), line: hsl(h, sn, 89), accent: hex, "accent-soft": hsl(h, sp, 88), "accent-ink": hsl(h, sk, 20) },
    gelap: { bg: hsl(h, sn, 7), surface: hsl(h, sn, 11), sunk: hsl(h, sn, 14), line: hsl(h, sn, 18), accent: hsl(h, sk, 66), "accent-soft": hsl(h, batas(s, 15, 40), 20), "accent-ink": hsl(h, sk, 86) },
    kartu: { latar: hsl(h, sp, 88), latar2: hsl(h, sp, 82), lembut: hsl(h, sp, 94), aksen: hex, tinta: hsl(h, sk, 16), gelap: hsl(h, batas(s, 20, 55), 15), gelap2: hsl(h, batas(s, 20, 55), 8) },
  };
}
export function terapkanTema(hex) {
  let el = document.getElementById("tema-acara");
  if (!hexValid(hex)) { el?.remove(); return; }
  const p = paletTema(hex);
  const blok = o => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(";");
  if (!el) { el = document.createElement("style"); el.id = "tema-acara"; document.head.appendChild(el); }
  el.textContent = `:root{${blok(p.terang)}}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${blok(p.gelap)};color-scheme:dark}}
:root[data-theme="dark"]{${blok(p.gelap)};color-scheme:dark}`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", p.kartu.latar);
}

/* ---------- ikon garis sederhana ---------- */
const JALUR = {
  keluar: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
  main: '<path d="M8 5.5v13l10-6.5z"/>',
  cek: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  ulang: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v5h5"/>',
  buku: '<path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z"/><path d="M12 6.5V19"/>',
  kembali: '<path d="M15 5l-7 7 7 7"/>',
  teks: '<path d="M5 7V5h14v2"/><path d="M12 5v14"/><path d="M9 19h6"/>',
  layar: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16.5V20"/>',
  unduh: '<path d="M12 4v11"/><path d="M7 10.5l5 5 5-5"/><path d="M5 20h14"/>',
  kamera: '<path d="M4 8.5A2 2 0 0 1 6 6.5h2l1.5-2h5l1.5 2h2a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.5"/>',
  gambar: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9.5" cy="9.5" r="1.5"/><path d="M20 15l-4.5-4.5L6 20"/>',
  bagi: '<path d="M12 15V4"/><path d="M8 8l4-4 4 4"/><path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/>',
  orang: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  jam: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  bintang: '<path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8z"/>',
};
export const ikon = (n, ukuran = 20) => `<svg class="i" viewBox="0 0 24 24" width="${ukuran}" height="${ukuran}" aria-hidden="true">${JALUR[n] || ""}</svg>`;
export const inisial = nama => String(nama || "?").replace(/^Contoh:\s*/, "").split(/\s+/).filter(Boolean).slice(0, 2).map(k => k[0]).join("").toUpperCase();

/* ---------- program studi ---------- */
export const PRODI = ["Ilmu Al-Qur'an dan Tafsir", "Ilmu Hadis", "Akidah dan Filsafat Islam", "Studi Agama-Agama", "Ilmu Tasawuf", "Magister Ilmu Al-Qur'an dan Tafsir", "Magister Studi Agama-Agama"];

/* ---------- kehadiran ---------- */
const HURUF_KODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // tanpa huruf/angka yang mirip (0/O, 1/I/L)
export function kodeAcak(n = 6) {
  const a = new Uint32Array(n); crypto.getRandomValues(a);
  return [...a].map(v => HURUF_KODE[v % HURUF_KODE.length]).join("");
}
export const bersihkanKode = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
export const idHadir = (kode, id) => `${kode}__${String(id).toLowerCase()}`;
/** Ambil kode kehadiran dari teks QR: URL berisi ?hadir=KODE, atau kode polos. */
export function kodeDariTeks(teks) {
  const t = String(teks || "").trim();
  try { const u = new URL(t); const k = u.searchParams.get("hadir"); if (k) return bersihkanKode(k); } catch {}
  return /^[A-Za-z0-9]{6}$/.test(t) ? t.toUpperCase() : "";
}

/* ---------- CSV ---------- */
export function keCSV(baris) {
  const sel = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return "﻿" + baris.map(b => b.map(sel).join(",")).join("\r\n");
}
/** Baca CSV (pemisah koma atau titik koma, mendukung tanda kutip). */
export function bacaCSV(teks) {
  teks = String(teks).replace(/^﻿/, "");
  const barisPertama = teks.split(/\r?\n/)[0] || "";
  const pisah = (barisPertama.match(/;/g) || []).length > (barisPertama.match(/,/g) || []).length ? ";" : ",";
  const hasil = []; let sel = "", baris = [], kutip = false;
  for (let i = 0; i < teks.length; i++) {
    const ch = teks[i];
    if (kutip) {
      if (ch === '"' && teks[i + 1] === '"') { sel += '"'; i++; }
      else if (ch === '"') kutip = false;
      else sel += ch;
    } else if (ch === '"') kutip = true;
    else if (ch === pisah) { baris.push(sel); sel = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && teks[i + 1] === "\n") i++; baris.push(sel); hasil.push(baris); baris = []; sel = ""; }
    else sel += ch;
  }
  if (sel !== "" || baris.length) { baris.push(sel); hasil.push(baris); }
  return hasil.filter(b => b.some(v => v.trim() !== ""));
}
/** Simpan berkas: pakai jembatan versi uji bila ada, selain itu unduhan biasa. */
export async function unduhBerkas(blob, nama) {
  if (globalThis.KHATAM_SIMPAN) return globalThis.KHATAM_SIMPAN(blob, nama);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
/** Muat pustaka skrip dari CDN sekali saja. */
const muatan = {};
export function muatSkrip(url) {
  return muatan[url] ??= new Promise((ok, gagal) => {
    const s = document.createElement("script"); s.src = url; s.async = true;
    s.onload = ok; s.onerror = () => { delete muatan[url]; gagal(new Error("gagal memuat " + url)); };
    document.head.appendChild(s);
  });
}

/* ---------- tiket peserta ---------- */
// Isi QR tiket: KHATAM:<id peserta>:<token acak>. Token disimpan di dokumen peserta, jadi tiket tidak bisa dipalsukan
// hanya dengan menebak NIM/nomor WA.
export const URL_QR_LIB = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
export const URL_JSQR = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
export const isiTiket = (id, token) => `KHATAM:${id}:${token}`;
export function bacaTiket(teks) {
  const m = /^KHATAM:([a-z0-9-]+):([A-Z0-9]{6,12})$/i.exec(String(teks || "").trim());
  return m ? { id: m[1].toLowerCase(), token: m[2].toUpperCase() } : null;
}
/** Gambar QR ke kanvas (kotak hitam di atas latar putih). */
export async function gambarQR(c, teks, x, y, ukuran, warna = "#151515") {
  await muatSkrip(URL_QR_LIB);
  const qr = window.qrcode(0, "M"); qr.addData(teks); qr.make();
  const n = qr.getModuleCount(), sel = ukuran / n;
  c.fillStyle = warna;
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) c.fillRect(x + k * sel, y + r * sel, Math.ceil(sel), Math.ceil(sel));
}

/**
 * Pemindai QR memakai kamera. BarcodeDetector bila ada (Chrome Android), selain itu pustaka jsQR.
 * Memanggil onTeks(teks) setiap kali QR terbaca. Mengembalikan fungsi untuk menghentikan kamera.
 */
export async function mulaiPindai(video, onTeks, { hadap = "environment" } = {}) {
  if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) throw Object.assign(new Error("tanpa kamera"), { name: "NotSupportedError" });
  let detektor = null;
  if ("BarcodeDetector" in window) {
    try { if ((await BarcodeDetector.getSupportedFormats()).includes("qr_code")) detektor = new BarcodeDetector({ formats: ["qr_code"] }); } catch {}
  }
  if (!detektor) await muatSkrip(URL_JSQR);
  const aliran = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: hadap } }, audio: false });
  video.srcObject = aliran; await video.play().catch(() => {});
  let jalan = true;
  const cv = document.createElement("canvas"), g = cv.getContext("2d", { willReadFrequently: true });
  const pindai = async () => {
    if (!jalan) return;
    if (video.readyState >= 2 && video.videoWidth) {
      let teks = "";
      try {
        if (detektor) teks = (await detektor.detect(video))[0]?.rawValue || "";
        else {
          const s = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
          cv.width = video.videoWidth * s | 0; cv.height = video.videoHeight * s | 0;
          g.drawImage(video, 0, 0, cv.width, cv.height);
          teks = window.jsQR(g.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height, { inversionAttempts: "dontInvert" })?.data || "";
        }
      } catch {}
      if (teks && jalan) { try { await onTeks(teks); } catch {} }
    }
    if (jalan) setTimeout(pindai, 160);
  };
  pindai();
  return () => { jalan = false; aliran.getTracks().forEach(t => t.stop()); video.srcObject = null; };
}

/** Nama sapaan: kata pertama nama, melewati gelar seperti Dr., Hj., Prof., KH. */
export function namaPanggil(nama) {
  const k = String(nama || "").replace(/^Contoh:\s*/, "").split(/\s+/).filter(Boolean);
  const gelar = /^(dr|drs|dra|hj|h|prof|kh|ust|ustadz|ustazah|ustadzah|ir|nyai|gus|ning|habib|syekh|sy)\.?,?$/i;
  return k.find(w => !gelar.test(w) && !/\.$/.test(w)) || k[0] || "";
}

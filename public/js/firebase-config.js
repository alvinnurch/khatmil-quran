// GANTI isi objek ini dengan konfigurasi dari Firebase Console:
// Project settings → General → Your apps → Web app → SDK setup and configuration → Config
export const firebaseConfig = {
  apiKey: "AIzaSyB8EgX23B31S2Uolu-D_TPXcbYAuDQ0cFc",
  authDomain: "khatmil-quran-fu.firebaseapp.com",
  projectId: "khatmil-quran-fu",
  storageBucket: "khatmil-quran-fu.firebasestorage.app",
  messagingSenderId: "917640735506",
  appId: "1:917640735506:web:aea3be3a078db0af0161cb"
};

// Domain semu untuk akun peserta. NIM 11210340000123 menjadi akun
// 11210340000123@peserta.khatam — tidak perlu email sungguhan.
// Jangan diubah setelah acara berjalan, karena akun lama memakai domain ini.
export const DOMAIN_PESERTA = "peserta.khatam";

// true = sambungkan ke Firebase Emulator di komputer sendiri (untuk uji coba).
export const PAKAI_EMULATOR = location.hostname === "localhost" || location.hostname === "127.0.0.1";

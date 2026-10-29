// GANTI isi objek ini dengan konfigurasi dari Firebase Console:
// Project settings → General → Your apps → Web app → SDK setup and configuration → Config
export const firebaseConfig = {
  apiKey: "GANTI_API_KEY",
  authDomain: "GANTI_PROJECT_ID.firebaseapp.com",
  projectId: "GANTI_PROJECT_ID",
  storageBucket: "GANTI_PROJECT_ID.appspot.com",
  messagingSenderId: "GANTI_SENDER_ID",
  appId: "GANTI_APP_ID"
};

// Domain semu untuk akun peserta. NIM 11210340000123 menjadi akun
// 11210340000123@peserta.khatam — tidak perlu email sungguhan.
// Jangan diubah setelah acara berjalan, karena akun lama memakai domain ini.
export const DOMAIN_PESERTA = "peserta.khatam";

// true = sambungkan ke Firebase Emulator di komputer sendiri (untuk uji coba).
export const PAKAI_EMULATOR = location.hostname === "localhost" || location.hostname === "127.0.0.1";

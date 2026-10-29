# Khatmil Qur'an — aplikasi laporan bacaan

Aplikasi web untuk acara khataman bersama. Mahasiswa mendaftar dengan NIM, mengambil juz yang dibagikan sistem, membaca mushaf juz tersebut di layar, lalu melaporkan selesai. Setelah itu mereka mendapat kartu ucapan berisi selfie dan logo acara yang bisa disimpan atau dibagikan ke Story/Feed. Panitia memantau jumlah khataman dari dasbor terpisah.

Dibangun dengan HTML, CSS, dan JavaScript biasa (tanpa proses build) di atas Firebase Hosting, Firestore, dan Firebase Authentication. Paket gratis Firebase (Spark) cukup untuk mulai.

## Isi aplikasi

**Halaman peserta** (`/`)
- Daftar sekali sebagai **Mahasiswa Ushuluddin** (nama, NIM, prodi, PIN), **Dosen** (nama, nomor WhatsApp, PIN), atau **Peserta luar** (nama, nomor WhatsApp, asal/instansi opsional, PIN). Mahasiswa masuk dengan NIM + PIN; dosen dan peserta luar masuk dengan nomor WhatsApp + PIN.
- Tombol **Ambil juz**: sistem memberi juz terkecil yang belum diambil pada putaran berjalan. Satu peserta memegang satu juz dalam satu waktu. Setelah 30 juz terbagi, sistem membuka putaran berikutnya.
- Tombol **Baca** membuka **Mushaf Madinah riwayat Hafs** per halaman (15 baris, 604 halaman, sama dengan mushaf cetak). Geser ke kanan atau tekan panah kiri untuk halaman berikutnya. Jika juz dimulai di tengah halaman, ayat milik juz lain ditampilkan samar. Tombol **Mode teks** menampilkan teks per ayat sebagai cadangan bila koneksi lemah.
- **Selesai membaca** mencatat laporan, lalu membuka kartu ucapan: ambil selfie atau pilih dari galeri, pilih format Story 9:16 atau Feed 4:5, lalu **Simpan gambar** atau **Bagikan** (di ponsel akan membuka menu berbagi ke Instagram, WhatsApp, dan lainnya). Kartu bisa dibuat ulang dari riwayat bacaan.
- **Kembalikan juz** jika berhalangan, agar juz bisa diambil peserta lain.
- Papan 30 juz putaran berjalan: belum diambil, sedang dibaca, selesai.

**Aturan pembagian juz**
- Satu putaran = Juz 1 sampai 30, masing-masing tepat satu kali. Putaran berikutnya baru dibuka setelah ke-30 juz di putaran berjalan sudah diambil semua.
- Satu putaran terhitung **satu khatam** hanya setelah ke-30 juznya dilaporkan selesai. Jadi angka "juz selesai" bisa lebih besar dari 30 × khatam, karena juz di putaran yang belum lengkap ikut terhitung.
- Juz yang dikembalikan peserta atau dilepas panitia dari putaran lama dibagikan lebih dulu, supaya putaran lama cepat lengkap.
- Bila memungkinkan, peserta diberi juz yang belum pernah ia baca.

**Impor peserta (tanpa pendaftaran)**
- Di dasbor, bagian Peserta: **Unduh template peserta** → isi (kolom: nama, kategori, nim, prodi, no_wa, instansi) → **Impor peserta (CSV)**. NIM yang sudah terdaftar dilewati.
- Peserta hasil impor tidak perlu mendaftar. Di halaman masuk mereka memilih **Pertama kali masuk**, mengisi NIM (dosen/peserta luar: nomor WA), nomor WhatsApp sebagai verifikasi, lalu membuat PIN. Bila panitia mengisi nomor WA di data impor, nomornya harus sama.
- Tombol **Kirim tiket** di tabel mengirim petunjuk "Pertama kali masuk" lewat WhatsApp. Status "Belum masuk" menandai peserta yang belum pernah masuk.
- Pendaftaran mandiri tetap tersedia. Bila seseorang mendaftar dengan NIM yang sudah diimpor, datanya otomatis memakai data impor.

**Tiket peserta**
- Saat mendaftar, setiap peserta otomatis mendapat **tiket ber-QR** (nomor WhatsApp kini wajib diisi). Tiket langsung tampil setelah daftar dan bisa dibuka lagi lewat tombol **Tiket saya**.
- Tombol **Kirim ke WhatsApp**: di HP membuka menu berbagi (pilih WhatsApp → chat ke nomor sendiri) beserta gambar tiket; di laptop membuka WhatsApp ke nomor peserta dengan kode dan tautan tiket.
- Di tabel peserta, panitia bisa menekan **Kirim tiket** untuk mengirim tautan tiket ke WhatsApp peserta dari nomor panitia.
- Pengiriman **otomatis** tanpa klik membutuhkan layanan WhatsApp gateway berbayar dan Cloud Function (paket Blaze). Belum termasuk di versi ini.

**Kehadiran (check-in)**
- Panitia membuat **sesi** di dasbor (mis. "Ushuluddin Mengaji", "Puncak Milad"). Setiap sesi mendapat kode 6 karakter dan QR.
- Tekan **Tampilkan QR** lalu tayangkan di proyektor/layar. Peserta scan dengan kamera HP (membuka aplikasi dan langsung mencatat kehadiran setelah masuk), memakai tombol **Scan QR** di aplikasi, atau mengetik kodenya.
- Satu orang tercatat sekali per sesi. Tekan **Tutup check-in** setelah acara agar QR yang tersebar tidak bisa dipakai lagi.
- **Unduh template** → isi daftar hadir manual (kolom: nama, nim_atau_wa, kategori, prodi, instansi, waktu, kode_sesi) → **Impor CSV**. Berkas dari Excel dengan pemisah titik koma juga diterima. Baris yang sudah tercatat dilewati.
- **Scan tiket peserta**: panitia memindai QR tiket peserta dengan kamera HP/laptop untuk sesi yang sedang dibuka. Hasilnya langsung tampil (hijau = tercatat, kuning = sudah hadir, merah = tiket tidak sah/belum terdaftar). Peserta tanpa HP bisa dicatat dengan mengetik NIM atau nomor WA.
- **Unduh CSV** mengunduh daftar hadir sesi yang dipilih (atau semua sesi).

**Dasbor panitia** (`/panitia`)
- Jumlah khataman terkumpul (satu khatam = satu putaran yang 30 juznya selesai), juz selesai, juz sedang dibaca, peserta terdaftar, dan peserta yang sudah membaca.
- Progres setiap putaran dalam satu pandangan.
- Daftar juz yang sedang dibaca, diurutkan dari yang paling lama, dengan tombol **Lepaskan** untuk juz yang tidak kunjung dilaporkan.
- Juz selesai per program studi.
- Tabel peserta dengan pencarian.
- **Mode layar**: angka khataman besar untuk ditayangkan di proyektor, diperbarui langsung.
- **Unduh CSV**: rekap seluruh bacaan untuk laporan.
- **Pengaturan acara**: nama acara, keterangan, tagar media sosial, **logo acara**, dan **warna tema** (8 pilihan siap pakai atau warna bebas). Semuanya tampil di halaman peserta, dasbor, mode layar, dan kartu selfie.
- **Reset & hapus data**: reset bacaan & khataman, hapus kehadiran, hapus sesi, hapus semua peserta, atau reset seluruh acara. Setiap tindakan meminta konfirmasi dengan mengetik HAPUS. Tombol **Unduh cadangan (JSON)** menyimpan seluruh data sebelum dihapus. Peserta juga bisa dihapus satu per satu dari tabel peserta. Akun login peserta (di Authentication) tidak ikut terhapus, sehingga peserta yang datanya dihapus cukup masuk lagi dan mengisi ulang formulir.

## Struktur berkas

```
khatmil-quran/
├── public/                  ← yang di-upload ke hosting
│   ├── index.html           halaman peserta
│   ├── panitia.html         dasbor panitia
│   ├── css/style.css
│   ├── js/firebase-config.js   ← ISI DENGAN KONFIGURASI PROYEK ANDA
│   ├── js/common.js         koneksi Firebase, data juz, fungsi bersama
│   ├── js/peserta.js
│   ├── js/panitia.js
│   ├── js/kartu.js          kartu ucapan + selfie
│   ├── js/mushaf.js         penampil Mushaf Madinah per halaman
│   └── juz/01.json … 30.json   teks Al-Qur'an per juz
├── firestore.rules          aturan keamanan database
├── firebase.json
├── .firebaserc              ← ganti ID proyek
└── .github/workflows/deploy.yml   deploy otomatis dari GitHub
```

## Langkah 1 — Siapkan proyek Firebase

1. Buka <https://console.firebase.google.com>, klik **Add project**, beri nama (mis. `khatmil-quran-fu`). Google Analytics boleh dimatikan.
2. **Authentication** → **Get started** → tab **Sign-in method** → aktifkan **Email/Password**.
3. **Firestore Database** → **Create database** → pilih lokasi `asia-southeast2 (Jakarta)` → mode **production**.
4. **Project settings** (ikon roda gigi) → **General** → bagian *Your apps* → klik ikon **Web** (`</>`) → beri nama → **Register app**. Salin objek `firebaseConfig` yang muncul.
5. Tempel nilai-nilai itu ke `public/js/firebase-config.js`, menggantikan teks `GANTI_…`.
6. Ganti `GANTI_PROJECT_ID` di `.firebaserc` dengan ID proyek Anda.

Konfigurasi web Firebase memang dirancang untuk terlihat publik. Keamanan data dijaga oleh `firestore.rules`, bukan dengan menyembunyikan konfigurasi.

## Langkah 2 — Daftarkan akun panitia

1. **Authentication** → **Users** → **Add user** → isi email dan kata sandi panitia.
2. **Firestore Database** → **Start collection** → ID koleksi `admins` → ID dokumen = **email panitia itu dalam huruf kecil** (mis. `panitia@uinjkt.ac.id`). Isi satu field bebas, misalnya `nama` (string) = `Ketua Panitia`. Simpan.
3. Ulangi untuk setiap panitia. Hanya email yang ada di koleksi `admins` yang bisa membuka dasbor.

## Langkah 3 — Upload ke GitHub

```bash
cd khatmil-quran
git init
git add .
git commit -m "Aplikasi Khatmil Qur'an"
git branch -M main
git remote add origin https://github.com/NAMA-AKUN/khatmil-quran.git
git push -u origin main
```

Buat repositori kosong di GitHub terlebih dahulu (tanpa README) dengan nama yang sama.

## Langkah 4 — Deploy

### Cara A: deploy otomatis lewat GitHub Actions (disarankan)

Setiap `git push` ke branch `main` akan langsung memperbarui situs.

1. Firebase Console → **Project settings** → **Service accounts** → **Generate new private key**. Sebuah berkas JSON akan terunduh. Simpan baik-baik dan jangan di-commit ke repositori.
2. Di GitHub: repositori → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - `FIREBASE_SERVICE_ACCOUNT` → tempel **seluruh isi** berkas JSON tadi.
   - `FIREBASE_PROJECT_ID` → ID proyek, mis. `khatmil-quran-fu`.
3. Buka tab **Actions** → pilih **Deploy ke Firebase** → **Run workflow** (atau cukup push perubahan apa pun).
4. Setelah centang hijau, situs aktif di `https://ID-PROYEK.web.app`. Aturan Firestore ikut terpasang.

### Cara B: deploy manual dari komputer

Butuh Node.js 18 atau lebih baru.

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting,firestore
```

## Alamat yang dibagikan

- Peserta: `https://ID-PROYEK.web.app`
- Panitia: `https://ID-PROYEK.web.app/panitia`

Untuk domain sendiri (mis. `khatam.fu.uinjkt.ac.id`): **Hosting** → **Add custom domain**, ikuti petunjuk DNS. Lalu tambahkan domain itu di **Authentication** → **Settings** → **Authorized domains**.

## Uji coba di komputer sendiri

Emulator Firebase menjalankan database dan login tiruan, jadi data sungguhan tidak tersentuh. Butuh Node.js dan Java 11+.

```bash
npm install
npm run dev
```

Buka <http://127.0.0.1:5000>. Aplikasi otomatis memakai emulator saat dibuka dari `localhost` atau `127.0.0.1`. Untuk mencoba dasbor panitia, buka <http://127.0.0.1:4000> (Emulator UI): buat user di tab Authentication, lalu buat dokumen `admins/<email>` di tab Firestore.

## Catatan penting

- **Lupa PIN.** Panitia membuka **Authentication** → cari `NIM@peserta.khatam` (untuk dosen/peserta luar: `wa62812xxxx@peserta.khatam`) → hapus user tersebut, lalu hapus dokumen `peserta/NIM` (atau `peserta/wa62812xxxx`) di Firestore. Peserta kemudian mendaftar ulang. Riwayat bacaannya tetap tercatat.
- **Domain akun peserta** (`peserta.khatam`) tertulis di dua tempat: `public/js/firebase-config.js` dan `firestore.rules`. Jika diubah, ubah keduanya sebelum acara dimulai.
- **Logo** disimpan langsung di Firestore setelah diperkecil otomatis (maks. 600 px), jadi tidak perlu Firebase Storage maupun paket berbayar. Gunakan PNG berlatar transparan agar hasilnya rapi di kartu.
- **Selfie tidak di-upload.** Foto hanya diolah di ponsel peserta untuk membuat kartu, lalu disimpan atau dibagikan oleh peserta sendiri.
- **Tombol Bagikan** memakai fitur berbagi bawaan ponsel (Android Chrome, iPhone Safari). Di laptop, tombol ini disembunyikan; gunakan **Simpan gambar**.
- **Kuota gratis.** Paket Spark memberi 50.000 pembacaan dokumen per hari. Itu cukup untuk acara dengan beberapa ratus peserta. Untuk acara besar yang berlangsung berhari-hari, beralihlah ke paket **Blaze** (bayar sesuai pemakaian; biayanya sekitar US$0,06 per 100.000 pembacaan) agar aplikasi tidak berhenti di tengah acara.
- **Mushaf per halaman** memakai data tata letak dan font QCF v4 (Mushaf Madinah 1441 H, khat Utsman Thaha, Kompleks Percetakan Raja Fahd) dari paket [quran-qcf4](https://github.com/MohamadHajjRabee/quran-qcf4). Semuanya dimuat langsung dari jsDelivr, jadi tidak perlu di-upload ke hosting dan tidak memakan kuota transfer Firebase. Satu juz kira-kira 2–3 MB untuk dibuka pertama kali. Font QCF hanya boleh dipakai untuk menampilkan Al-Qur'an dan tidak boleh diubah atau dijual. Karena itu, font tidak disertakan di repositori ini. Jika kampus ingin menyimpannya di server sendiri, mintalah izin ke Kompleks Raja Fahd, lalu atur `globalThis.KHATAM_MUSHAF_BASE` ke alamat salinannya.
- **Sumber teks Al-Qur'an (mode teks).** Teks Utsmani berasal dari paket [quran-json](https://github.com/risan/quran-json) v3.1.2, yang mengambilnya dari [The Noble Qur'an Encyclopedia (QuranEnc)](https://quranenc.com), berlisensi CC BY-SA 4.0. Pembagian juz mengikuti mushaf standar Madinah. Lakukan tashih teks oleh panitia atau Lajnah sebelum dipakai secara resmi.

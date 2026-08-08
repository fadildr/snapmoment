# SHIP-FAST SCOPE — Wedding MVP (v0)

> AI: ini scope prioritas TERTINGGI saat ini, MENGGANTIKAN sementara `01-FEATURES-MVP.md` yang lebih lengkap. Tujuan: web ini harus BISA DIPAKAI TAMU DI PERNIKAHAN NYATA secepat mungkin. Jangan kerjakan apapun di luar daftar "In Scope" di bawah — termasuk fitur yang ada di `01-FEATURES-MVP.md` tapi tidak disebut di sini, tunda dulu.

## Tujuan

Satu event kawinan nyata, tanggal sudah fix. User (tamu) buka link/QR di HP, langsung bisa motret dengan tampilan seperti kamera disposable, foto otomatis kesimpan ke cloud walau sinyal di venue jelek. Tidak butuh dashboard host yang canggih, tidak butuh pembayaran, tidak butuh multi-event.

## In Scope (v0)

### 1. Satu event, setup manual/hardcoded
- Tidak perlu form "buat event" yang fleksibel. Cukup 1 event record di database (bisa di-insert manual lewat Prisma Studio/seed script), berisi: nama acara, tanggal, 1 preset filter default.
- Link tamu: `/e/{slug}` dengan slug fix, misal `/e/pernikahan-nama-teman`.
- QR code di-generate dari slug ini (bisa pakai generator online sekali pakai untuk print, tidak perlu fitur "download QR" otomatis di v0).

### 2. Kamera — desain disposable camera (INI FOKUS UTAMA)
- Layar full-screen, viewfinder kamera pakai `getUserMedia` (kamera belakang default, `facingMode: environment`).
- **UI dibungkus visual seperti body kamera disposable fisik**, bukan UI kamera browser polos:
  - Viewfinder ditampilkan sebagai jendela kecil di tengah (bukan full bleed), dikelilingi "body" kamera bewarna solid (misal kuning/hijau ala Kodak FunSaver, sesuai preset event) dengan sudut membulat meniru plastik kamera
  - Shutter button besar, bulat, sedikit menonjol (pakai shadow/gradient ringan supaya terasa fisik, bukan flat button web)
  - Counter frame di bagian atas/bawah body kamera, font monospace, format "07/24" — meniru jendela kecil counter di kamera disposable asli
  - Opsional kalau sempat: sedikit "efek jendela" viewfinder (vignette ringan di tepi) supaya terasa seperti ngintip lewat viewfinder asli, bukan preview kamera browser biasa
- Setelah shutter ditekan: filter preset (CSS filter + overlay grain, sudah didefinisikan di `lib/presets.ts` sesuai `00-PROJECT-CONTEXT.md`) diterapkan ke foto sebelum disimpan.
- Counter naik setiap berhasil motret. **Tidak perlu batas hard limit di v0** — kalau tamu banyak motret, biarkan saja, jangan blokir (fitur kuota tamu di `01-FEATURES-MVP.md` DITUNDA).

### 3. Simpan ke cloud
- Foto dikompres client-side dulu (target ~300-500KB) sebelum upload — pakai `browser-image-compression` atau canvas manual.
- Upload ke **Supabase Storage** (bukan Cloudflare R2 dulu di v0 — alasan: kalau sudah pakai Supabase untuk database, satu provider lebih cepat setup daripada nambah R2 + kredensial terpisah; migrasi ke R2 bisa nanti kalau volume besar).
- Foto tersimpan dengan referensi ke `event_id` (hardcoded event yang sama untuk semua tamu di v0 ini) dan `client_photo_id` (untuk idempotency saat retry).
- **Tidak perlu tabel `guests` dengan nama/whatsapp di v0.** Cukup `device_id` random yang digenerate sekali dan disimpan di localStorage, dipakai untuk asosiasi foto ke "siapa yang motret" secara teknis saja (untuk keperluan galeri nanti kalau perlu difilter). Tidak perlu tamu mengisi nama di v0 kecuali kamu mau tetap tambahkan field nama opsional simpel (boleh, tapi tanpa validasi rumit).

### 4. PWA — wajib berfungsi tanpa sinyal stabil
- `manifest.json` lengkap (nama app, ikon, `display: standalone`, warna tema) supaya bisa di-"Add to Home Screen" dari browser HP tamu.
- Service worker meng-cache app shell (HTML/CSS/JS halaman kamera) supaya halaman tetap bisa dibuka meski sinyal hilang total setelah pertama kali load.
- **Upload queue offline-first**, ini bagian paling kritis:
  1. Foto yang sudah diambil + difilter disimpan dulu ke **IndexedDB** di device tamu (bukan langsung coba upload).
  2. Background sync (`Background Sync API` kalau didukung browser, atau fallback: retry loop tiap beberapa detik saat app aktif/`online` event terdeteksi) mencoba upload foto yang statusnya masih `pending` di IndexedDB.
  3. Retry pakai exponential backoff, foto TIDAK PERNAH hilang dari IndexedDB sampai konfirmasi upload sukses dari server.
  4. UI kasih status sederhana per foto/badge global: "X foto menunggu terkirim" — supaya tamu tenang walau belum semua terupload.
- **Acceptance criteria yang wajib dites manual sebelum hari-H:**
  - Matikan wifi/data HP setelah buka halaman kamera → tetap bisa motret beberapa kali → nyalakan sinyal lagi → semua foto pending otomatis terkirim tanpa aksi tambahan dari tamu
  - Tutup browser/app di tengah ada foto pending → buka lagi → foto pending masih ada di queue, lanjut coba upload

### 5. Galeri sangat minim (opsional, kalau waktu cukup)
- Cukup 1 halaman `/e/{slug}/gallery` yang menampilkan grid semua foto yang sudah terupload (tanpa mekanisme reveal/hidden-sampai-waktu-tertentu dulu — itu fitur `01-FEATURES-MVP.md` yang DITUNDA).
- Kalau waktu benar-benar mepet, galeri ini boleh dilewati dulu untuk hari-H — yang penting foto sudah aman tersimpan di cloud, galeri bisa disusulkan H+1/H+2 setelah acara selesai karena datanya sudah ada.

## Eksplisit DI LUAR SCOPE v0 (jangan dikerjakan sekarang)

- Dashboard host, multi-event, form buat event dinamis
- Sistem pembayaran/tier apapun
- Reveal mechanic (hidden sampai waktu tertentu)
- WhatsApp broadcast
- Multiple preset selectable per event (cukup 1 preset default, hardcode)
- Kuota tamu / limit foto
- Auth/login apapun (baik host maupun tamu)
- Semua yang ada di bagian "Backlog / Ideas" di `01-FEATURES-MVP.md`

## Setelah hari-H selesai

File ini (`06-SHIP-FAST-WEDDING-MVP.md`) statusnya sementara. Setelah acara temanmu selesai dan sukses, kembali ke roadmap penuh di `01-FEATURES-MVP.md` untuk versi yang bisa dijual ke banyak event — tambahkan lagi dashboard, reveal mechanic, payment, dst secara bertahap di atas fondasi kamera+PWA yang sudah teruji nyata ini.

## Desain visual kamera (rujukan cepat)

Tetap pakai token warna dari `05-DESIGN-PRINCIPLES.md` (`--ink`, `--paper`, `--film-amber`, dst) untuk elemen UI di LUAR body kamera (misal halaman gallery, teks status). Tapi **body kamera itu sendiri boleh punya warna solid mengikuti preset** (misal body kuning solid untuk preset "Kodak FunSaver", hijau untuk "Fujifilm QuickSnap") — ini konsisten dengan referensi warna kemasan kamera disposable asli, bagian dari signature visual yang membedakan dari kompetitor.

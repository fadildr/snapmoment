# FEATURES — MVP Scope (LOCKED)

> AI: implementasikan HANYA yang ada di bagian "MVP (In Scope)". Bagian "Backlog / Ideas" TIDAK boleh diimplementasi kecuali diminta eksplisit oleh user di chat.

## MVP (In Scope)

### F1. Buat Event (Host)
- Host login (email/password atau magic link via Supabase Auth)
- Host isi: nama event, tanggal, pilih preset film (dari daftar preset hardcoded, lihat F4), waktu reveal (saat itu juga / setelah delay X jam / custom datetime), paket tamu (5/10/25/50/... sesuai tier harga)
- Sistem generate: slug unik event, QR code, link tamu (`/e/{slug}`)
- **Acceptance criteria:** setelah submit, host diarahkan ke dashboard event dengan QR code yang bisa didownload/discreenshot

### F2. Ambil Foto (Tamu, tanpa login)
- Tamu buka link/scan QR → masukkan nama (opsional, disimpan di local session, bukan akun)
- Tamu buka kamera browser (`getUserMedia` atau `<input type="file" capture>` sebagai fallback)
- Foto langsung diberi filter preset event tsb (client-side, canvas)
- Foto disimpan dulu ke IndexedDB lokal browser tamu
- **Acceptance criteria:** tamu tetap bisa lanjut motret foto berikutnya walau foto sebelumnya belum selesai upload

### F3. Upload Resilient (teknis, tidak visible ke user tapi WAJIB)
- Compress foto ke ~300-500KB sebelum upload (client-side)
- Queue upload di background dengan retry (exponential backoff) kalau gagal/koneksi putus
- Tampilkan status jelas ke tamu: "tersimpan, menunggu koneksi" / "terupload"
- **Acceptance criteria:** simulasikan koneksi mati 30 detik lalu nyala lagi → foto tetap ke-upload otomatis tanpa aksi ulang dari tamu

### F4. Preset Film (hardcoded, bukan builder)
- Minimal 6 preset (contoh: sama seperti kompetitor sebagai baseline: Kodak FunSaver, Portra 400, Fujifilm QuickSnap, Ektar 100, Ilford HP5, CineStill 800T) — implementasi sebagai kombinasi CSS filter + grain/light-leak overlay PNG, bukan ML
- Preset diterapkan client-side saat capture, disimpan permanen ke file hasil

### F5. Reveal Album (Host + Tamu)
- Sebelum waktu reveal: tamu yang sudah motret hanya lihat foto mereka sendiri ("Rollmu"), belum lihat punya orang lain
- Setelah waktu reveal tercapai (cron/scheduled check sederhana, bukan realtime push): semua foto event terbuka untuk dilihat semua peserta yang punya link
- Galeri bisa difilter per orang / lihat semua
- **Acceptance criteria:** foto tidak accessible via direct URL sebelum waktu reveal (cek di server, bukan cuma disembunyikan di UI)

### F6. Download Foto
- Setiap foto bisa didownload individual (resolusi penuh dari R2)
- Tidak perlu bulk-zip di MVP (bisa jadi fitur v1.1)

### F7. WhatsApp Broadcast saat Reveal
- Saat album reveal, sistem kirim pesan WA otomatis (via Fonnte/Wablas) ke nomor tamu yang sempat submit foto (nomor dikumpulkan opsional saat tamu isi nama) berisi link galeri
- Kalau nomor tidak diisi, skip — tidak wajib

### F8. Pembayaran
- Host pilih tier tamu → redirect ke Midtrans/Xendit snap checkout
- Setelah bayar, tier event ter-upgrade otomatis (webhook)
- Tier gratis (misal sampai 10 tamu) tidak perlu bayar

### F9. Dashboard Host (minimal)
- List event yang dibuat
- Per event: jumlah foto masuk, jumlah tamu, status (belum reveal/sudah reveal), link+QR, tombol upgrade tier

## Backlog / Ideas (BUKAN MVP — jangan implementasi dulu)

- Video singkat 5-10 detik
- Custom preset builder oleh host
- Mode "upload station" fisik (transfer lokal ke device host lalu upload massal)
- Bulk download / zip semua foto
- Auto-generate recap video/slideshow
- Realtime live gallery selama acara berlangsung (Socket.IO)
- Custom domain per event
- Multi-admin per event (co-host)
- Native mobile app
- Vendor marketplace, wedding ERP, dst (visi jangka panjang, bukan produk)

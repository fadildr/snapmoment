# PROJECT CONTEXT — SnapMoment

> File ini WAJIB dibaca AI di awal setiap sesi coding sebelum menulis kode apapun.
> Tujuan: memberi AI pemahaman konsisten tentang produk, batasan, dan keputusan yang sudah diambil, supaya tidak ada drift antar sesi.

## 1. Apa produk ini

SnapMoment adalah web app "kamera sekali pakai digital" untuk acara (pernikahan, ulang tahun, pesta). Tamu scan QR, motret lewat browser (tanpa install app), foto otomatis dikasih preset film, dan semua foto tersembunyi sampai waktu tertentu lalu "diungkap bersama" ke semua peserta.

Kompetitor referensi: satualbum.id (Indonesia). Kita tidak meng-clone — kita target lebih murah, lebih tahan koneksi lambat, dan ada fitur yang mereka belum punya (lihat bagian 4).

## 2. Status proyek

- **Fase:** MVP, belum ada user, belum ada kode.
- **Tim:** 2 orang (kamu + 1 teman), keduanya fokus development.
- **Aturan penting:** SCOPE DIKUNCI ke MVP di `01-FEATURES-MVP.md`. Jangan menambah fitur di luar file itu tanpa update file itu dulu. Kalau ada ide baru, catat di bagian "Backlog / Ideas (bukan MVP)" di file fitur, JANGAN langsung diimplementasi.

## 3. Target user & masalah yang diselesaikan

- **Host acara** (pengantin, orang tua yang bikin ulang tahun anak, panitia acara kantor) — mau punya foto kandid dari sudut pandang tamu, tanpa ribet minta tamu install app atau kirim manual satu-satu.
- **Tamu acara** — mager install app baru, banyak yang gaptek/tua, koneksi internet di venue sering lambat.
- Masalah utama yang membedakan kita: **koneksi internet lambat di venue** adalah kegagalan produk yang fatal untuk kompetitor. Kita HARUS handle ini dari desain awal (lihat 05-backend nanti: offline-first, compress client-side, retry queue).

## 4. Diferensiasi vs satualbum (jangan hilang dari scope jangka menengah)

1. Harga entry-level lebih murah (tier dibuka lebih rendah)
2. Upload tahan koneksi lambat (compress + queue + retry + PWA offline-first) — ini prioritas teknis #1
3. Broadcast WhatsApp otomatis saat album "reveal" (bukan cuma link manual)
4. Lebih banyak preset / custom preset sederhana
5. (Later, bukan MVP) video singkat, mode upload-station offline

## 5. Tech stack (KEPUTUSAN FINAL — jangan diganti tanpa alasan kuat)

Stack dipilih untuk MVP ringan, murah, dan cepat dikembangkan 2 orang. **Bukan** stack enterprise (NestJS/BullMQ/Redis/Socket.IO ditolak untuk MVP — overkill, nambah biaya infra & waktu setup tanpa validasi user dulu).

| Layer | Pilihan | Alasan |
|---|---|---|
| Frontend + API | Next.js 15 (App Router), TypeScript | Frontend & API routes jadi satu, deploy simpel |
| Styling | Tailwind CSS | Cepat, konsisten |
| Database | PostgreSQL via Supabase | Free tier generous, auth bawaan kalau perlu nanti |
| ORM | Prisma | Type-safe, migration jelas |
| Storage foto | Cloudflare R2 | Tanpa biaya egress, jauh lebih murah dari S3 |
| Image processing | Client-side (Canvas API) untuk compress + preset filter | Hemat biaya server, gak perlu worker terpisah |
| WA broadcast | Fonnte / Wablas API | Murah, cocok untuk skala kecil-menengah |
| Payment | Midtrans atau Xendit | QRIS, e-wallet, transfer bank |
| Hosting frontend+API | Vercel (hobby/free tier awal) | |
| PWA / offline | next-pwa atau custom service worker | Untuk queue upload tahan sinyal lemah |

**Yang SENGAJA tidak dipakai di MVP:** NestJS, Redis, BullMQ, Socket.IO, microservices. Alasan: kompleksitas operasional tidak sepadan untuk tim 2 orang dan traffic yang belum tervalidasi. Bisa dipertimbangkan lagi setelah traksi nyata (ratusan event aktif bersamaan).

## 6. Prinsip desain teknis yang harus dipegang AI saat coding

- **Mobile-first, koneksi-lambat-first.** Anggap user selalu di 3G/sinyal padat. Bundle JS kecil, lazy load, compress sebelum upload.
- **Tanpa akun untuk tamu.** Tamu tidak perlu daftar/login. Host yang punya akun.
- **Upload harus resilient**: simpan foto ke local (IndexedDB) dulu → queue → retry otomatis. Jangan blocking UI menunggu upload selesai.
- **Jangan over-engineer.** Kalau ragu antara solusi simpel vs "proper/scalable", pilih simpel dulu untuk MVP, catat sebagai technical debt di komentar kode.

## 7. File lain yang harus dibaca AI sesuai konteks kerja

- `01-FEATURES-MVP.md` — scope fitur, jangan keluar dari ini
- `02-DATABASE-SCHEMA.md` — struktur data, source of truth untuk Prisma schema
- `03-API-SPEC.md` — kontrak endpoint
- `04-AI-CODING-RULES.md` — konvensi kode, struktur folder, aturan commit

## 8. Non-goals MVP (biar AI gak improvisasi keluar scope)

- Tidak ada video di MVP
- Tidak ada custom preset builder (preset hardcoded dulu)
- Tidak ada marketplace vendor, tidak ada "wedding ERP" — itu visi jangka panjang, bukan sekarang
- Tidak ada mobile native app — web only (PWA)
- Tidak ada realtime socket untuk live gallery — polling cukup di MVP

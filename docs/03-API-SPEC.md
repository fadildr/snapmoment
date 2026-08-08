# API SPEC — MVP

> AI: implementasikan sebagai Next.js Route Handlers (`app/api/.../route.ts`). Semua response JSON. Auth host pakai session dari Supabase Auth (middleware cek `hosts.id`). Endpoint tamu tidak butuh auth, tapi butuh `guest_id` (dari localStorage) di body/header untuk identifikasi.

## Host — Auth
Delegasikan ke Supabase Auth SDK langsung dari client kalau memungkinkan (signup/login/logout). Tidak perlu bikin endpoint custom kecuali butuh logic tambahan.

## Host — Event

### `POST /api/events`
Buat event baru.
- Body: `{ name, event_date?, preset_id, reveal_mode, reveal_delay_hours?, reveal_at?, max_guests_tier }`
- Response 201: `{ id, slug, qr_code_url, guest_link }`
- Validasi: `preset_id` harus ada di tabel presets; `reveal_mode` konsisten dengan field terkait

### `GET /api/events`
List event milik host yang login.
- Response: `[{ id, slug, name, photo_count, guest_count, tier_paid_status, reveal_status }]`

### `GET /api/events/:id`
Detail event untuk dashboard host.
- Response: seluruh field event + agregat (jumlah tamu, jumlah foto, status reveal terhitung dari `reveal_at` vs waktu sekarang)

### `POST /api/events/:id/upgrade`
Trigger checkout pembayaran untuk naik tier.
- Body: `{ target_tier }`
- Response: `{ checkout_url }` (dari Midtrans/Xendit Snap)

## Payment Webhook

### `POST /api/webhooks/payment`
Endpoint callback dari Midtrans/Xendit.
- Verifikasi signature sesuai dokumentasi provider (WAJIB, jangan skip validasi signature)
- Update `payments.status` dan `events.tier_paid_status`, `events.max_guests_tier`

## Guest — Public (tanpa auth)

### `GET /api/e/:slug`
Ambil info event publik untuk halaman tamu.
- Response: `{ name, preset, reveal_mode, reveal_at, is_revealed: boolean, guest_quota_remaining }`
- **Penting:** kalau `max_guests_tier` sudah tercapai (guest count unik >= tier), tambahkan flag `quota_full: true` supaya frontend bisa handle gracefully

### `POST /api/e/:slug/join`
Tamu daftar sesi (bukan akun).
- Body: `{ display_name?, whatsapp_number? }`
- Response: `{ guest_id }` — disimpan client di localStorage
- Validasi kuota tamu di sini (lihat aturan #2 di file database schema)

### `POST /api/e/:slug/photos`
Upload foto (dipanggil dari queue upload resilient, bisa retry berkali-kali dengan foto yang sama pakai idempotency key).
- Header/body: `guest_id`, file (multipart atau base64 sesuai implementasi), `client_photo_id` (idempotency key dari client, dibuat saat capture, supaya retry tidak duplikat)
- Response: `{ photo_id, status: 'uploaded' }`
- Server: upload ke R2, insert row `photos`, increment counter

### `GET /api/e/:slug/gallery`
Ambil galeri foto.
- Query param: `guest_id` (dikirim selalu, dipakai server untuk logic akses)
- **Logic wajib:** kalau `now < reveal_at` → hanya return foto milik `guest_id` yang match. Kalau sudah lewat `reveal_at` → return semua foto event.
- Response: `[{ id, url, guest_display_name, taken_at }]`

## Internal / Scheduled

### Cron check reveal (Vercel Cron atau sejenis, jalan tiap beberapa menit)
- Cek event yang `reveal_at` sudah lewat tapi belum di-trigger broadcast WA
- Kirim WA ke semua `guests` di event tsb yang punya `whatsapp_number`, via Fonnte/Wablas API
- Tandai event supaya broadcast tidak terkirim dobel (tambahkan kolom `reveal_notified_at` di `events` kalau belum ada)

## Aturan umum untuk semua endpoint

- Semua endpoint publik (guest-facing) harus rate-limited sederhana per IP untuk cegah abuse
- Semua endpoint yang menyentuh `photos` sebelum reveal WAJIB cek `guest_id` ownership di server, bukan percaya parameter dari client begitu saja
- Error response konsisten: `{ error: { code, message } }`

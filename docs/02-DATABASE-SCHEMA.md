# DATABASE SCHEMA — Source of Truth

> AI: gunakan struktur ini sebagai acuan `schema.prisma`. Kalau perlu ubah struktur, update file ini DULU baru generate migration — jangan sebaliknya.

## Entitas utama

### `hosts`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| email | string, unique | |
| password_hash | string | (atau pakai Supabase Auth, kolom ini bisa dihapus kalau delegasi ke Supabase) |
| name | string | |
| whatsapp_number | string, nullable | untuk notifikasi ke host sendiri |
| created_at | timestamp | |

### `events`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| host_id | uuid, FK → hosts.id | |
| slug | string, unique | dipakai di URL `/e/{slug}` |
| name | string | nama acara |
| event_date | date, nullable | |
| preset_id | string, FK → presets.id | preset default event ini |
| reveal_mode | enum('immediate','delay','scheduled') | |
| reveal_delay_hours | int, nullable | dipakai kalau reveal_mode = 'delay' |
| reveal_at | timestamp, nullable | dipakai kalau reveal_mode = 'scheduled', atau di-set otomatis saat immediate/delay dihitung |
| max_guests_tier | int | 5 / 10 / 25 / 50 / 100 / 150 / 200 / -1 (unlimited) |
| tier_paid_status | enum('free','paid','pending') | |
| photo_count | int, default 0 | denormalized counter, update via trigger/transaction saat upload sukses |
| created_at | timestamp | |

### `presets` (hardcoded seed data, bukan user-generated di MVP)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | string, PK | slug, misal `kodak-funsaver` |
| name | string | nama tampilan |
| css_filter | string | nilai CSS filter |
| overlay_asset_url | string, nullable | path ke PNG grain/light-leak overlay |

### `guests` (bukan akun, cuma identitas ringan per sesi)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | disimpan juga di localStorage browser tamu sebagai session token |
| event_id | uuid, FK → events.id | |
| display_name | string, nullable | |
| whatsapp_number | string, nullable | opsional, untuk broadcast reveal |
| joined_at | timestamp | |

### `photos`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| event_id | uuid, FK → events.id | |
| guest_id | uuid, FK → guests.id | |
| storage_key | string | path object di Cloudflare R2 |
| status | enum('queued','uploading','uploaded','failed') | untuk tracking upload resilient di F3 |
| taken_at | timestamp | |
| uploaded_at | timestamp, nullable | |

### `payments`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| event_id | uuid, FK → events.id | |
| provider | enum('midtrans','xendit') | |
| provider_ref | string | transaction id dari provider |
| amount | int | dalam Rupiah |
| status | enum('pending','paid','failed','expired') | |
| paid_at | timestamp, nullable | |

## Aturan penting untuk AI

1. **`photos` tidak boleh accessible via query publik sebelum `events.reveal_at` tercapai**, KECUALI baris milik `guest_id` yang sama dengan requester (lihat F5 di features). Ini harus dicek di level API/query, bukan cuma disembunyikan di frontend.
2. `photo_count` di `events` di-increment via transaction saat status photo berubah jadi `uploaded`, dipakai untuk validasi kuota tier (`max_guests_tier` sebenarnya membatasi jumlah `guests` unik, bukan jumlah foto — perlu query count distinct `guests` per event untuk validasi kuota, bukan `photo_count`).
3. Index yang wajib ada: `events.slug` (unique), `photos.event_id`, `guests.event_id`, `photos.status` (untuk query retry queue kalau ada worker cleanup).

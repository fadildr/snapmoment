# AI CODING RULES

> AI: ini aturan kerja yang harus diikuti setiap kali menulis/mengubah kode di repo ini, supaya hasil antar sesi konsisten meskipun dikerjakan bertahap ("vibe coding").

## Sebelum mulai coding di sesi manapun

1. Baca `00-PROJECT-CONTEXT.md` dulu.
2. Kalau task menyangkut fitur baru, cek `01-FEATURES-MVP.md` — kalau fitur itu ada di "Backlog / Ideas", **tanya user dulu** apakah memang mau keluar dari scope MVP, jangan langsung kerjakan.
3. Kalau task menyangkut struktur data, cek `02-DATABASE-SCHEMA.md` sebelum ubah `schema.prisma`.
4. Kalau task menyangkut endpoint, cek `03-API-SPEC.md` sebelum bikin route baru — kalau endpoint belum ada di spec, tambahkan dulu ke spec (update dokumen), baru implementasi.

## Struktur folder

```
snapmoment/
├── app/
│   ├── (host)/dashboard/...       # halaman host, perlu auth
│   ├── e/[slug]/...               # halaman tamu, publik
│   ├── api/
│   │   ├── events/
│   │   ├── e/[slug]/
│   │   └── webhooks/
├── components/
│   ├── ui/                        # komponen generic (button, card, dst)
│   └── features/                  # komponen spesifik fitur (camera-capture, gallery-grid, dst)
├── lib/
│   ├── db.ts                      # prisma client
│   ├── storage.ts                 # helper R2
│   ├── upload-queue.ts            # logic queue+retry client-side
│   └── presets.ts                 # definisi preset filter
├── prisma/
│   └── schema.prisma
└── docs/                          # folder ini
```

## Konvensi kode

- **TypeScript strict mode**, hindari `any`.
- Nama file: `kebab-case.tsx` untuk komponen, `camelCase.ts` untuk util/lib.
- Server logic (akses DB, R2, dst) hanya di `app/api/*` atau `lib/*` yang jelas ditandai server-only — jangan bocorkan credential ke client component.
- Setiap komponen kamera/upload harus asumsikan koneksi lambat/putus — lihat prinsip di `00-PROJECT-CONTEXT.md` bagian 6, ini bukan opsional.
- Validasi input pakai Zod di setiap API route, jangan percaya body request mentah.

## Kalau AI ragu / ambigu

- Pilih solusi paling sederhana yang memenuhi acceptance criteria di `01-FEATURES-MVP.md`.
- Jangan menambah dependency/library baru tanpa alasan jelas — cek dulu apakah bisa pakai yang sudah ada di stack (`00-PROJECT-CONTEXT.md` bagian 5).
- Kalau menemukan keputusan desain yang belum tercakup di dokumen manapun, **tulis catatan singkat** di komentar kode (`// DECISION:`) dan laporkan ke user di akhir respons, supaya bisa didokumentasikan kalau perlu.

## Commit & progress tracking

- Commit message format: `feat(scope): deskripsi singkat` / `fix(scope): ...` / `chore(scope): ...`
- Scope merujuk ke nomor fitur di `01-FEATURES-MVP.md`, misal `feat(F3): implement upload retry queue`
- Setelah fitur selesai, cocokkan lagi ke acceptance criteria sebelum dianggap done.

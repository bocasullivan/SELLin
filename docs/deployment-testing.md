# Testing personal: Vercel Hobby + Neon Free

Hanya untuk testing personal/nonkomersial dengan data contoh. Vercel Hobby tidak untuk operasional komersial. Periksa ketentuan dan kuota layanan sebelum digunakan. Tidak perlu membayar domain untuk testing.

## Status kode

- Node.js 24.x; Next.js App Router, runtime Node untuk API.
- `postinstall` membuat Prisma Client; build tidak menjalankan migrasi otomatis.
- `vercel.json` memilih region Singapore (`sin1`), sesuai region Neon.
- Logo/signature disimpan privat di PostgreSQL, diunggah satu per request (2 MB maksimum; base64 < 3 MB). Respons workspace berisi URL privat, bukan seluruh data gambar. Endpoint gambar memeriksa session dan mengirim binary dengan `private, no-store`.
- Pengaturan teks dan dua upload terpisah, bukan satu transaksi gabungan: jika upload kedua gagal, upload pertama mungkin sudah tersimpan. Pesan sukses profil baru muncul setelah seluruh langkah sukses.
- Workspace masih memuat semua invoice akun. Batas respons Vercel 4,5 MB tetap perlu diperhatikan jika jumlah invoice sangat besar; pagination server adalah pengembangan berikutnya.

## 1. Neon: ambil dua connection string sendiri

Klik **Connect**, gunakan branch/database yang benar:

- **Pooled** (hostname biasanya mengandung `-pooler`): untuk aplikasi, sebagai `DATABASE_URL`.
- **Direct/unpooled** (pooling dimatikan): untuk migrasi, sebagai `DIRECT_URL`.

Jangan mengirim secret di chat, menaruhnya di source, atau menghapus parameter TLS Neon. Jangan menggunakan `rejectUnauthorized: false`. `.env` lokal tetap menunjuk database lokal. Online mulai kosong; data lokal tidak ikut pindah.

## 2. Migrasi online secara eksplisit

Simpan URL direct di file baru **`.env.neon.local`** (sudah diabaikan Git), melalui editor lokal:

```dotenv
DIRECT_URL="CONNECTION_STRING_DIRECT_NEON"
```

Jangan menimpa `.env` lokal. Di terminal proyek, jalankan:

```powershell
node --env-file=.env.neon.local node_modules/prisma/build/index.js migrate deploy
```

Perintah menggunakan `DIRECT_URL` untuk CLI tanpa mengubah database lokal. Periksa nama database/host tujuan pada output sebelum melanjutkan. Jangan menjalankan `migrate reset`, `db push --force-reset`, atau drop database. File secret jangan di-commit; hapus secara manual setelah tidak diperlukan jika diinginkan.

Di Neon SQL Editor, pastikan tabel `User`, `Session`, `AccountCustomer`, `AccountInvoice`, `AccountItem`, dan `AccountSettings` tersedia. Tidak ada akun atau password default; register dari website setelah deploy.

## 3. GitHub

Review diff, jalankan build/lint/test, lalu commit/push perubahan yang sudah disetujui. Pastikan `.env*` selain `.env.example` tidak dilacak. Vercel mengambil kode di GitHub, bukan perubahan lokal yang belum dipush.

## 4. Vercel

1. Login, pilih Hobby, **Add New → Project**, import repository SELLin.
2. Framework **Next.js**, root folder repository, Node **24.x**.
3. Build command `npm run build`, install `npm ci`, output default Next.js.
4. Pada environment **Production**, isi:

| Variable | Nilai |
| --- | --- |
| `DATABASE_URL` | URL pooled Neon, dengan TLS |
| `APP_ORIGIN` | URL HTTPS utama, misalnya `https://sellin-testing.vercel.app`, tanpa trailing slash |

Tidak perlu memasang `DIRECT_URL` di runtime Vercel jika migrasi dijalankan secara lokal di langkah 2. Jangan membuat database URL dengan prefix `NEXT_PUBLIC_`. Jangan mengatur `NODE_ENV=development`; cookie dan proteksi harus memakai mode production.

Jika URL final baru diketahui setelah deployment pertama, isi/koreksi `APP_ORIGIN`, lalu **Redeploy**. Tanpa origin yang benar, POST login/register/simpan akan ditolak dengan aman.

Jangan menghubungkan Preview deployment ke database production yang sama. Gunakan branch Neon terpisah untuk Preview atau jangan memasang secret database pada Preview dahulu.

Untuk testing sendiri, gunakan **Deployment Protection/Vercel Authentication** jika tersedia pada paket dan deployment tersebut. Ini lapisan akses hosting, bukan menutup kemampuan register multi-user dalam kode. Jangan mengumumkan link publik; rate limiting per email bukan mitigasi lengkap untuk spam akun.

## 5. Uji online

- Buka `/` tanpa login: harus diarahkan ke Login.
- Register akun uji, login benar/salah; cek cookie Secure/HttpOnly/SameSite.
- Simpan customer/invoice/settings, refresh, logout/login kembali.
- Upload logo dan signature masing-masing mendekati batas 2 MB; cek simpan/refresh/print.
- Akun kedua harus tidak bisa melihat data/gambar akun pertama.
- Logout: endpoint privat harus kembali 401. Jangan membagikan token/session atau secret dalam screenshot.
- Seluruh pengujian lokal tidak membuktikan Neon terhubung: periksa hasil online dan log yang sudah disensor.

## Advisory dependency yang belum terselesaikan

`mysql2` transitif Prisma dipin ke versi patch aman dengan override. `deepmerge-ts` pada Prisma CLI dan `braces` pada ESLint masih memiliki advisory high. Registry belum menyediakan patch `braces` di versi 3.x saat pemeriksaan; perbaikan `deepmerge-ts` memerlukan major 8, jangan dipaksakan ke Prisma tanpa pemeriksaan kompatibilitas. Tidak dilakukan `audit fix --force`/downgrade Prisma atau Next.

Ini terutama dependency tooling, bukan bukti endpoint aplikasi rentan terhadap semua advisory tersebut. Tetapi audit **belum bersih** dan jangan nyatakan siap production bisnis. Batasi deployment untuk testing personal, jangan menjalankan tooling dengan input tidak tepercaya, dan pantau pembaruan upstream.

Siapkan backup/restore, pembersihan session, email verification/reset, perlindungan spam dan observabilitas sebelum operasional nyata.

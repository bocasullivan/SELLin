# PostgreSQL lokal untuk SELLin

Status: Prisma dan migrasi tersedia; Login/Register serta session sudah terhubung database. Data bisnis di Dashboard masih demo. Lihat [authentication.md](authentication.md) untuk aturan autentikasi dan keamanan.

## 1. Pasang PostgreSQL

Unduh installer Windows dari https://www.postgresql.org/download/windows/ (tautan installer EDB). Pilih versi stabil yang masih didukung, misalnya PostgreSQL 17 atau 18.

- Pasang PostgreSQL Server, pgAdmin 4, dan Command Line Tools.
- Port: `5432`.
- Buat password administrator `postgres` yang kuat dan simpan sendiri; jangan kirim di chat.
- Stack Builder/add-on tidak diperlukan.
- Jangan membuka port database melalui router/firewall ke internet.

Jika PostgreSQL ternyata sudah terpasang di lokasi lain, gunakan instalasi tersebut dan jangan membuat instalasi kedua.

## 2. Buat user dan database development

Buka pgAdmin, sambungkan ke server lokal dengan akun `postgres`, lalu buka **Query Tool** pada database `postgres`.

Jalankan perintah berikut satu per satu. Ganti placeholder password dengan password lokal baru; hindari memakai password administrator untuk aplikasi.

```sql
CREATE ROLE sellin_app WITH LOGIN PASSWORD 'GANTI_PASSWORD_KUAT';
```

```sql
CREATE DATABASE sellin_dev OWNER sellin_app;
```

User aplikasi tidak perlu `SUPERUSER` atau `CREATEDB`. Script `db:migrate` menerapkan migrasi yang sudah dibuat dan tidak memerlukan shadow database. `db:migrate:dev` ditujukan untuk pengembangan migrasi baru; membutuhkan izin shadow database atau database shadow tersendiri, jadi jangan jalankan untuk setup awal ini.

## 3. Isi environment lokal

Di terminal proyek:

```powershell
Copy-Item .env.example .env
```

Jangan menimpa `.env` jika sebelumnya sudah ada. Edit file `.env` sendiri:

```dotenv
DATABASE_URL="postgresql://sellin_app:PASSWORD_LOKAL@127.0.0.1:5432/sellin_dev?schema=public"
```

Password yang mengandung `@`, `:`, `/`, `#`, `%`, atau karakter khusus lain harus di-URL-encode. File `.env` diabaikan Git. Jangan gunakan `NEXT_PUBLIC_DATABASE_URL`.

## 4. Terapkan migrasi dan periksa koneksi

```powershell
npm.cmd run db:generate
npm.cmd run db:validate
npm.cmd run db:migrate
npm.cmd run db:check
```

Hasil sukses pemeriksaan: `Koneksi dan tabel siap. Customer: 0; invoice: 0.` Tidak ada data demo atau password default yang otomatis dimasukkan ke database.

Restart server Next.js setelah mengubah `.env`. UI masih demo sampai operasi server dan login diimplementasikan. Prisma Client berada di `src/generated/prisma`, tidak di-commit, dan dibuat ulang melalui `postinstall`/`db:generate`.

## Model data

- `Owner`: tabel legacy dipertahankan; autentikasi sekarang memakai `User`, `Session`, dan `AuthAttempt`.
- `Customer` + `CustomerCounter`: identitas internal UUID, kode customer 4101–4199 yang tidak digunakan ulang.
- `InvoiceSequence`: urutan per customer per tahun, tidak dikurangi saat invoice dihapus.
- `Invoice`: nomor unik, status unpaid/paid, snapshot customer, nilai Rupiah Decimal, tanggal, dan penanda soft-delete.
- `InvoiceItem`: perangkat, deskripsi, qty, harga, dan subtotal item.
- `BusinessSettings`: profil bisnis/rekening dan key penyimpanan privat untuk logo/tanda tangan.

Constraint dasar tersedia di migrasi. Pengalokasian counter atomik, total server, aturan invoice lunas, validasi payload, serta autentikasi masih harus diimplementasikan sebelum data asli digunakan. Skema bukan bukti bahwa aplikasi sudah siap production.

## Jika gagal

- Connection refused: cek service PostgreSQL dan port 5432.
- Authentication failed: cek username/password dan URL encoding.
- Tabel tidak ditemukan: jalankan `db:migrate` pada database yang sama.
- Jangan menjalankan reset/drop database sebagai solusi; sampaikan pesan error yang sudah disensor.

Database production nanti terpisah, dengan koneksi TLS, akses jaringan terbatas, secret deployment, backup, dan pengujian restore. Jangan gunakan database lokal ini sebagai production online.

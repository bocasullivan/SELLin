# Login dan Register SELLin

Register melalui `/register` menyimpan pengguna di tabel `User`; tidak perlu membuat akun lewat SQL. Email dinormalisasi ke lowercase dan harus unik. Password 8–128 karakter saat register, disimpan sebagai hash scrypt dengan salt acak. Register sukses mengarahkan pengguna untuk masuk lewat `/login` (tidak otomatis login).

## Session

- Dashboard `/` memeriksa session di server, bukan hanya keberadaan cookie.
- Token session acak 256-bit dikirim melalui cookie `HttpOnly`, `SameSite=Lax`, path `/`, maksimal 259200 detik.
- Di production cookie menggunakan `Secure` dan prefix `__Host-`; wajib HTTPS.
- Database hanya menyimpan hash SHA-256 token, bukan token mentah.
- Session berakhir setelah **3 hari tidak aktif**, bukan 3 hari sejak login. Aktivitas pada halaman yang terlihat memperbarui expiry di database dan cookie, dibatasi sekali per menit.
- Tab yang ditinggalkan tidak melakukan heartbeat. Membuka/fokus kembali, mengetik, klik, atau scroll memeriksa session. Session kedaluwarsa tidak dapat diperpanjang.
- Logout mencabut session browser tersebut di database dan menghapus cookie. Session pada browser/perangkat lain tidak ikut dicabut.
- Pesan kegagalan login adalah “Email atau kata sandi salah”, tanpa mengungkap apakah email terdaftar.

## Proteksi pengujian dan production

Sesuai permintaan pengujian, di `npm.cmd run dev`, kedua proteksi berikut **nonaktif secara default**:

```dotenv
AUTH_CSRF_ENABLED="false"
AUTH_RATE_LIMIT_ENABLED="false"
```

Gunakan `true` untuk mencoba proteksi dalam development. Di semua lingkungan selain development (termasuk `next start`), proteksi selalu aktif meskipun flag bernilai false:

- Pengecekan Origin pada semua operasi autentikasi POST, hanya menerima JSON. Endpoint tidak mengaktifkan CORS untuk origin lain.
- Pembatasan 10 percobaan login/register per email yang dinormalisasi dalam 15 menit. Counter atomik di PostgreSQL, berlaku lintas proses.

Production wajib memiliki `APP_ORIGIN`, misalnya `https://sellin.example.com` tanpa trailing slash. Origin yang tidak cocok atau konfigurasi origin production yang tidak tersedia akan ditolak. Proteksi cookie tetap aktif di development; hanya `Secure` nonaktif agar localhost HTTP bisa digunakan.

Rate limit per email ini adalah fondasi; sebelum dibuka ke publik tambahkan pembatasan berbasis sumber request pada reverse proxy/provider tepercaya, mitigasi bot/spam registrasi, verifikasi email, pemulihan password, dan monitoring. Jangan mengekspos server development ke internet.

## Database

Migrasi `202610080002_auth` menambahkan `User`, `Session`, dan `AuthAttempt`, tanpa menghapus tabel `Owner` lama. Tabel legacy tidak dipakai untuk autentikasi baru. Jalankan `npm.cmd run db:generate` dan `npm.cmd run db:migrate` pada instalasi lain. Restart server development sesudah pembaruan client/schema bila diperlukan.

**Customer/Invoice/Settings sudah tersimpan per user di PostgreSQL.** Tabel global legacy tidak digunakan oleh halaman aktif; lihat [workspace-database.md](workspace-database.md) untuk aturan isolasi, migrasi, dan pengujian.

## Pemeriksaan

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npx.cmd tsx scripts/auth-integration-check.ts
```

Smoke check terakhir membutuhkan server localhost dan `.env` database yang sama. Script membuat akun sintetis unik dengan email `@example.invalid`, menguji register/login/session/logout/expiry, lalu hanya menghapus akun uji tersebut beserta session-nya. Tidak menghapus akun asli. Untuk server di port lain, set `AUTH_TEST_ORIGIN`. Dengan `AUTH_TEST_SECURITY="true"`, pemeriksaan juga menguji Origin dan rate limit (server harus mengaktifkan keduanya).

Session kedaluwarsa tetap tidak valid meskipun baris belum dibersihkan. Penjadwalan cleanup session dan counter lama, audit keamanan/dependency, backup, dan pengujian isolasi multi-user diperlukan sebelum production.

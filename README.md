# SELLin

Workspace invoicing dengan desain monokrom, login multi-user dan penyimpanan PostgreSQL. **Masih tahap pengujian lokal, bukan aplikasi siap production.**

## Menjalankan

## Database PostgreSQL

Prisma 7, skema, migrasi, dan client server-only sudah tersedia. Ikuti **[docs/database-setup.md](docs/database-setup.md)** untuk setup PostgreSQL lokal. Login/Register multi-user dan session database sudah aktif; detail pengujian serta konfigurasi ada di **[docs/authentication.md](docs/authentication.md)**. Data bisnis di Dashboard masih demo.

### Menjalankan aplikasi

Memerlukan Node.js 22.13+ (direkomendasikan Node.js 24) dan npm.

```sh
npm install
npm run dev
```

Buka http://localhost:3000. Pada PowerShell yang membatasi script, gunakan `npm.cmd` sebagai pengganti `npm`.

## Pemeriksaan

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

## Fitur preview

- Dashboard dengan tagihan belum dibayar, pembayaran diterima, dan total invoice.
- Invoice tanpa jatuh tempo; filter semua, belum dibayar, dan lunas.
- Membuat invoice: item, kuantitas, diskon, pajak, perhitungan otomatis.
- Preview dokumen dan cetak/save as PDF melalui browser (belum PDF server).
- Tabel customer (ID, nama, alamat, kota, kontak, keterangan) dan form tambah customer sementara.
- Profil bisnis untuk preview dan cetak.
- Layout responsif desktop/mobile.
- Sidebar mobile buka/tutup; dropdown akun dengan Pengaturan dan placeholder Logout.
- ID customer otomatis 4101–4199; nomor invoice `INVYYCCCCNNNNN` dengan urutan per customer/tahun (5 digit).
- Pencarian customer melalui ID/nama yang saling sinkron; identitas invoice tidak dapat diedit langsung.
- Device/pemilik per item, termasuk pada preview. Detail tambahan, diskon, dan pajak sementara nonaktif; source form lama dipertahankan sebagai `InvoiceFormNonaktif`.
- Layout preview/cetak mengikuti `Assets/ContohInvoice.pdf`: tanggal panjang, nomor invoice, Bill to, Payment Method, THANK YOU!, kontak, total, dan tanda tangan.
- Pengaturan bank/nama rekening/nomor rekening, telepon, email, nama pembuat invoice, dan gambar tanda tangan (PNG/JPG/WebP maksimal 2 MB). Semua masih hanya di memori sesi; tanda tangan tidak diunggah ke server.
- Action Edit/Delete tersedia hanya untuk invoice belum dibayar; penghapusan memerlukan konfirmasi. Invoice lunas dikunci. Nomor invoice dipertahankan saat edit customer/tahun yang sama.
- Customer dapat diedit/dihapus dengan konfirmasi hapus. ID terkunci dan ID terpakai tetap dicatat selama sesi, sehingga nomor yang dihapus tidak digunakan ulang. Perubahan customer tidak mengubah snapshot invoice lama.
- Logo invoice dapat diunggah di Pengaturan (PNG/JPG/WebP maksimal 2 MB); fallback `public/default-logo.svg`. Payment Method rata ke kanan dan alamat panjang mengikuti alur dokumen.

Penomoran saat ini memakai data sesi saja. Implementasi produksi harus mengalokasikan urutan secara atomik di database dengan constraint unik untuk mencegah duplikasi.

Halaman Invoice lama disimpan di `src/components/invoice-page-nonaktif.tsx`, tidak digunakan oleh navigasi aktif. Dashboard ada di `src/components/workspace.tsx`. Field jatuh tempo dan status draft pada tipe/data lama dipertahankan hanya untuk kompatibilitas source nonaktif; tidak digunakan di UI aktif. Total Dashboard tidak menyertakan draft lama.

Customer, invoice, item, pengaturan, logo dan tanda tangan tersimpan per akun di PostgreSQL; Dashboard dilindungi login. Data dummy tidak digunakan halaman aktif. Lihat **[docs/workspace-database.md](docs/workspace-database.md)** untuk aturan, pengujian, dan batasan. Siapkan backup sebelum menggunakan aplikasi sebagai sumber catatan finansial; jangan publikasikan versi ini sebagai aplikasi siap production. `robots: noindex` bukan kontrol akses.

## Standar coding

Pemilih bahasa Indonesia/English (bendera Indonesia/UK) tersedia di header global. Bahasa berlaku untuk halaman aktif, form, dialog, notifikasi, dan label/tanggal preview invoice. Data bisnis dan status yang disimpan tidak diterjemahkan; mata uang tetap IDR. Pilihan bahasa berlaku selama sesi dan kembali ke Indonesia setelah refresh. Teks validasi/file picker bawaan browser mengikuti bahasa browser/OS.

SELLin adalah baseline pertama untuk skill `.opencode/skills/coding-style/SKILL.md`.
Source aktif/nonaktif menggunakan JSX dan CSS multiline, indentasi 2 spasi, serta konfigurasi Prettier di `.prettierrc.json`. Jalankan `npm run format` untuk merapikan dan `npm run format:check` untuk memeriksa. `.editorconfig` menyelaraskan indentasi dan newline editor. Formatter tidak menggantikan linting, TypeScript, testing, atau review pemisahan logika.

## Struktur

- `src/app`: entry point dan stylesheet.
- `src/components`: workspace, editor, dokumen preview, komponen UI.
- `src/lib`: tipe, perhitungan, utilitas, dan data contoh.
- `tests`: pengujian perhitungan dan status terlambat.

## Tahap berikutnya

Isolasi data bisnis per user, CRUD PostgreSQL, validasi & perhitungan server, penyimpanan snapshot invoice, aturan penerbitan/nomor unik, PDF server, backup, verifikasi email/pemulihan akun, serta pengujian akses sebelum deployment online. Kalkulasi UI saat ini adalah preview saja, bukan implementasi akuntansi final.

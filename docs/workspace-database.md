# Data bisnis PostgreSQL

Dashboard, Customer, Invoice, dan Settings kini menggunakan tabel `Account*` yang dimiliki oleh `User`. Akun baru mulai tanpa customer/invoice dan tanpa profil bisnis. Source demo/nonaktif dipertahankan, tetapi tidak dipakai oleh halaman aktif.

## Penyimpanan dan isolasi

- Seluruh operasi `/api/workspace` memerlukan session valid; userId selalu berasal dari session, bukan payload.
- Customer, invoice, dan settings difilter per user. Foreign key gabungan memastikan invoice tidak mengacu ke customer akun lain.
- Mutasi satu akun diserialisasi dengan row lock dalam transaksi PostgreSQL. Penomoran, status, item, dan total disimpan bersama.
- Customer dihapus secara soft-delete. Counter customer tidak dikurangi; 4101–4199 berlaku terpisah per akun.
- Invoice dihapus secara soft-delete. Urutan customer/tahun tidak dikurangi. Nomor di form adalah perkiraan; server menentukan nomor final saat simpan, termasuk ketika dua tab bekerja bersamaan.
- Semua invoice, termasuk lunas, dapat diedit atau dihapus oleh pemilik akun. Status lunas juga dapat dikoreksi kembali menjadi belum dibayar; hapus tetap memerlukan konfirmasi di UI.
- Snapshot nama/alamat/kontak customer disimpan dalam invoice. Mengedit atau menghapus customer tidak mengubah invoice lama.
- Harga harus Rupiah bulat, qty bilangan bulat positif. Total dihitung di server, tidak dipercaya dari payload; nilainya harus aman untuk representasi angka UI.
- Logo/tanda tangan raster maksimal 2 MB per gambar disimpan sebagai data URL dalam tabel settings privat. Upload dilakukan satu gambar per request. Respons workspace hanya memuat URL endpoint gambar privat, dengan pemeriksaan session dan respons binary `no-store`. MIME, signature file dan batas ukuran diperiksa server. Tidak ada direktori upload publik.

## Pengujian manual

1. Restart `npm.cmd run dev` setelah migrasi/generate Prisma.
2. Login, isi Settings (profil/rekening/logo/tanda tangan), simpan, refresh.
3. Buat Customer lalu refresh; ID pertama adalah 4101 untuk akun baru.
4. Buat invoice belum dibayar, isi item, simpan; refresh dan cek preview/print.
5. Edit customer: identitas invoice lama harus tetap.
6. Edit invoice lunas, koreksi status/item, lalu simpan; pastikan invoice lunas juga bisa dihapus dengan konfirmasi.
7. Hapus customer atau invoice belum dibayar; nomor berikutnya tidak boleh menggunakan ulang nomor sebelumnya.
8. Login akun kedua: data bisnis akun pertama tidak boleh muncul.

```powershell
npx.cmd tsx scripts/workspace-integration-check.ts
```

Script memerlukan server localhost dan database yang sama. Script hanya membuat dua akun sintetis unik, menguji API/persistensi/isolasi, lalu menghapus data milik akun uji tersebut. Akun dan data asli tidak disentuh.

## Batas tahap ini

Pencarian dan pagination masih diproses pada data akun yang dimuat ke browser, bukan query halaman server. Print/PDF tetap melalui browser. Migrasi menambahkan tabel tenant baru dan **tidak memindahkan atau menghapus** isi tabel global legacy; jika sebelumnya ada data asli di tabel legacy, perlu pemetaan pemilik yang disetujui sebelum migrasi data.

Layak untuk pengujian pemakaian lokal; sebelum menyimpan catatan finansial satu-satunya, siapkan backup dan uji restore. Ini belum izin deployment publik: verifikasi email/reset password, audit dependency, perlindungan bot, cleanup session, observabilitas, dan pengujian keamanan production masih diperlukan. Rate limiting/CSRF tetap nonaktif dalam development sesuai permintaan, dan wajib aktif dalam production.

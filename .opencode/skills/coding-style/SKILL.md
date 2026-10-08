---
name: Coding Style
description: Standarisasi gaya coding bersama untuk menulis, mengubah, atau mereview kode website. Gunakan untuk menjaga JSX/HTML multiline, indentasi konsisten, dan pemisahan kode yang mudah dibaca pada SELLin maupun proyek baru.
---

# Standar Gaya Coding Bersama

Versi: 0.2.0  
Status: aturan awal, dapat dikembangkan mengikuti kesepakatan pengguna.

## Tujuan

Kode harus rapi, mudah dibaca, dan tidak memadatkan struktur panjang menjadi satu baris. **SELLin adalah proyek acuan pertama** untuk standar ini. Gaya, struktur, dan konfigurasi yang digunakan di SELLin menjadi baseline bagi proyek selanjutnya; standar berkembang mengikuti pengalaman dan kesepakatan kita.

## Baseline SELLin

- Next.js App Router dengan TypeScript; React/JSX untuk tampilan.
- `src/app/`: entry point halaman, layout, dan CSS global.
- `src/components/`: komponen fitur; `src/components/ui/`: komponen UI reusable.
- `src/lib/`: tipe bersama, utilitas, dan logika bisnis yang tidak memerlukan JSX.
- `tests/`: pengujian logika; `public/`: aset yang dilayani aplikasi.
- `.opencode/skills/coding-style/SKILL.md`: sumber utama standar ini.
- File nonaktif yang sengaja dipertahankan diberi penjelasan `NONAKTIF`; jangan dihapus tanpa permintaan pengguna.
- Nama komponen/tipe memakai PascalCase, fungsi/variabel camelCase, file komponen kebab-case, dan class CSS kebab-case, mengikuti source SELLin.
- Ini adalah baseline gaya dan organisasi, **bukan kewajiban memakai stack SELLin untuk semua proyek**. Jika proyek baru berbeda teknologi, adaptasikan prinsip kerapian tanpa memaksakan struktur Next.js.

## Kapan digunakan

- Saat menulis atau mengubah kode website.
- Saat mereview keterbacaan kode.
- Saat menyiapkan proyek baru yang menggunakan gaya coding bersama.

## Aturan 01 — Struktur markup multiline

**Wajib:** elemen JSX/HTML yang memiliki beberapa anak atau struktur bertingkat ditulis multiline.

- Opening tag container, anak-anaknya, dan closing tag berada pada baris terpisah.
- Satu elemen saudara per baris; jangan menyambung beberapa elemen menjadi satu baris panjang.
- Indentasikan anak satu tingkat di dalam parent. Closing tag sejajar dengan opening tag.
- Elemen pendek seperti judul, paragraf, atau tombol sederhana boleh tetap satu baris.
- Tag input dengan atribut pendek boleh satu baris. Jika atribut atau handler membuatnya sulit dibaca, pecah atribut ke beberapa baris.
- Conditional rendering mengikuti aturan yang sama: blok sederhana boleh ringkas, blok bertingkat harus multiline.
- Callback atau event handler dengan beberapa langkah ditulis sebagai blok multiline. Jangan memadatkan beberapa statement dengan pemisah titik koma dalam satu baris.
- Keterbacaan lebih penting daripada menghemat jumlah baris.

## Aturan 02 — Gaya TypeScript, CSS, dan konfigurasi SELLin

- Indentasi **2 spasi**, bukan tab; newline LF dan newline di akhir file.
- JavaScript/TypeScript memakai semicolon, double quote, dan trailing comma yang didukung formatter.
- Target lebar baris **100 karakter**. Ini panduan formatter, bukan batas keras untuk string, URL, atau identifier yang tidak dapat dipecah.
- Arrow function memakai tanda kurung pada parameter, misalnya `(event) => ...`.
- Import diletakkan di bagian atas setelah directive/komentar file. Gunakan `import type` untuk import yang hanya digunakan sebagai tipe.
- Objek, tipe, dan pemanggilan panjang dipecah multiline oleh formatter; jangan menggabungkan banyak statement dalam satu baris.
- CSS ditulis multiline: selector dan kurung buka, deklarasi per baris, lalu kurung tutup. Pertahankan urutan rule/media query karena urutan memengaruhi tampilan.
- Konfigurasi JSON/MJS tetap terpisah dari kode fitur.
- Jangan mengubah fitur, isi teks, urutan data, atau aturan bisnis hanya untuk merapikan format.

### Preferred

```tsx
<section className="settings-section">
  <h2>Logo invoice</h2>
  <p>Ditampilkan di kanan atas invoice. PNG, JPG, atau WebP, maksimal 2 MB.</p>
  <label htmlFor="logo-file" className="signature-upload-label">
    <Upload size={16} />
    Unggah logo
  </label>
  <input
    id="logo-file"
    ref={logoRef}
    type="file"
    accept="image/png,image/jpeg,image/webp"
    disabled={loading}
    onChange={event => void signature(event.target.files?.[0], "logo")}
  />
  <div className="signature-preview">
    <img src={draft.logo || "/default-logo.svg"} alt="Preview logo invoice" />
    {draft.logo && (
      <Button type="button" variant="ghost" onClick={() => field("logo", "")}>
        <X size={15} />
        Kembali ke logo default
      </Button>
    )}
  </div>
</section>
```

### Not preferred

```tsx
<section className="settings-section"><h2>Logo invoice</h2><p>Ditampilkan di kanan atas invoice.</p><div className="signature-preview"><img src={draft.logo} alt="Logo" /></div></section>
```

## Indentasi dan formatter

- Di SELLin, gunakan **Prettier** dengan `.prettierrc.json` dan `.editorconfig` yang tersimpan di root proyek.
- Gunakan `npm run format` untuk merapikan source dan konfigurasi yang ditentukan script, serta `npm run format:check` untuk memeriksa konsistensinya. Di PowerShell yang memblokir `npm.ps1`, gunakan `npm.cmd`.
- Jangan memformat dependency, file build/generated, lockfile, atau aset referensi pengguna.
- Di proyek baru, salin baseline konfigurasi SELLin jika belum ada formatter. Jika sudah ada formatter, selaraskan secara eksplisit; jangan diam-diam mengganti seluruh gaya proyek.
- Preferensi utama pengguna adalah struktur multiline dan nesting yang jelas, bukan kewajiban memakai karakter tab dari contoh.
- Jika formatter bertentangan dengan standar ini, jelaskan konflik dan selaraskan konfigurasinya sebelum menerapkan formatting luas.
- Skill ini adalah instruksi, bukan formatter otomatis. Jangan mengklaim lint/formatter menegakkan aturan jika belum dikonfigurasi.
- Prettier menegakkan formatting dasar; ESLint, TypeScript, dan review tetap diperlukan untuk penamaan, pemisahan fungsi, serta kualitas kode. Jangan mengklaim formatter menegakkan seluruh isi skill.

## Pemisahan kode yang proporsional

- Untuk kode baru, pisahkan struktur tampilan, styling, dan logika yang reusable sesuai pola proyek.
- Jangan menaruh handler panjang langsung di atribut JSX; pindahkan ke fungsi bernama bila itu memperjelas kode.
- Jangan membuat abstraksi atau file tambahan hanya untuk memecah kode pendek yang sudah jelas.
- Jangan menambahkan aturan framework, stack, atau penamaan baru tanpa kebutuhan atau kesepakatan pengguna.

## Workflow

1. Baca `AGENTS.md` dan konfigurasi formatter/linter yang berlaku.
2. Terapkan standar ini pada kode baru dan bagian yang diubah.
3. Pertahankan perilaku aplikasi saat perubahan hanya mengenai formatting.
4. Hindari reformat massal atau perubahan file di luar scope permintaan. Jika pengguna meminta perapian seluruh proyek, lakukan sebagai tugas tersendiri.
5. Jalankan pemeriksaan relevan yang tersedia, dan laporkan mana yang berhasil atau belum dijalankan.

## Pengembangan standar

- Tambahkan aturan baru setelah disepakati pengguna; aturan di luar kesepakatan harus ditandai sebagai usulan, bukan kewajiban.
- Saat menambah aturan, sertakan alasan singkat dan contoh jika membantu.
- Tingkatkan versi bila aturan berubah. Jangan diam-diam mengganti aturan lama yang masih disepakati.
- Hindari salinan aturan yang berbeda-beda. File ini menjadi sumber utama standar reusable.

## Pemakaian di proyek lain

Salin folder `coding-style` ke `.opencode/skills/` proyek tujuan, lalu tambahkan rujukan berikut di `AGENTS.md` proyek tersebut:

```md
## Gaya coding

Untuk menulis, mengubah, atau mereview kode, muat skill `coding-style`.
Jika skill tool belum menemukannya, baca `.opencode/skills/coding-style/SKILL.md`.
Terapkan aturan pada kode baru dan bagian yang diubah; jangan reformat massal tanpa permintaan.
```

Skill dapat diminta secara eksplisit dengan `@coding-style`. Tidak ada konfigurasi global yang diubah oleh pemasangan di proyek ini.

Untuk baseline formatter yang sama, salin `.prettierrc.json`, `.prettierignore`, dan `.editorconfig` dari SELLin, pasang Prettier sebagai dev dependency, lalu sesuaikan glob script `format`/`format:check` dengan source proyek tujuan.

## Riwayat

- 0.1.0: standar awal berdasarkan permintaan pengguna untuk JSX/HTML multiline, nesting rapi, dan kode tidak dipadatkan.
- 0.2.0: SELLin dijadikan baseline pertama; struktur source, penamaan, gaya TypeScript/CSS, dan konfigurasi Prettier/EditorConfig disepakati untuk perapian seluruh source.

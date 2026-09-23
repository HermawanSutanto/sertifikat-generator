# SertiGen

Aplikasi web untuk membuat sertifikat/dokumen massal dari satu template PDF + daftar data (CSV) — pasang template, atur tata letak teks di atas pratinjau, lalu hasilkan ratusan/ribuan sertifikat sekaligus dalam berkas ZIP.

Seluruh proses rendering PDF berjalan **sepenuhnya di sisi klien** (browser) lewat WebAssembly (Rust), sehingga tidak ada data template maupun data peserta yang dikirim ke server.

## Fitur Utama

- **Editor tata letak visual** — geser, ubah ukuran, dan atur teks (statis maupun dari kolom CSV) langsung di atas pratinjau template, dengan bantuan snap-to-center dan panduan sumbu.
- **Import CSV** dengan deteksi otomatis kolom, dan dukungan template teks gabungan (`{Nama}`, `{Nomor}`, dsb).
- **Font kustom** — pilih font yang terpasang di perangkat (Local Font Access API) untuk dipakai baik di pratinjau maupun hasil PDF akhir.
- **Preflight validation** — memeriksa placeholder yang tidak cocok dengan kolom CSV, baris data kosong, dan elemen yang menargetkan halaman di luar jumlah halaman template, sebelum proses generate dimulai.
- **Undo/redo** riwayat tata letak (grouping otomatis untuk aksi beruntun seperti mengetik/drag), pintasan keyboard (`Ctrl+Z`, panah untuk geser posisi, `Ctrl+D` duplikat elemen statis, `Delete` hapus elemen).
- **Zoom & pan pratinjau** (25%–200%, termasuk `Ctrl/Cmd + scroll`).
- **Autosave sesi** ke IndexedDB — template, data CSV, dan tata letak tersimpan otomatis dan bisa dipulihkan kalau tab/browser tertutup tanpa sengaja.
- **Generate batch via Web Worker** — proses rendering ribuan sertifikat dipecah per-chunk di background thread (tidak memblokir UI), dengan progress bar real-time dan hasil diunduh sebagai beberapa bagian ZIP.
- **Preview & kompresi template** — template PDF dikompresi otomatis sebelum diproses untuk mempercepat generate massal.

## Tumpukan Teknologi

| Bagian | Teknologi |
|---|---|
| Framework | Next.js (App Router) |
| Bahasa UI | React (JavaScript), Tailwind CSS |
| Autentikasi | Firebase Authentication |
| Rendering PDF | Rust yang dikompilasi ke WebAssembly (`wasm-bindgen`), dijalankan di Web Worker |
| Manipulasi PDF sisi klien | `pdf-lib`, `pdfjs-dist` (pratinjau) |
| Parsing CSV | `papaparse` |
| Editor drag/resize | `react-rnd` |
| Blog | MDX (`next-mdx-remote`, `gray-matter`) — artikel statis dari folder `posts/` |
| Ikon | `lucide-react` |
| Font | Archivo Black (display), Inter (body), JetBrains Mono (label/UI teknis) — via `next/font/google` |

## Struktur Folder

```
app/
├── page.js                    # Landing page
├── layout.js                  # Root layout: font global, AuthContextProvider
├── globals.css                # Token desain (warna, font) global
├── AuthNav.js                 # Tombol Masuk/Daftar/Dashboard/Logout (dipakai di landing page)
├── login/page.js               # Halaman login
├── register/page.js            # Halaman register
├── dashboard/
│   ├── page.js                 # Editor & generator sertifikat (client-side, WASM)
│   ├── idbStorage.js           # Wrapper IndexedDB untuk autosave sesi
│   ├── pdfWorker.js             # Web Worker: generate sertifikat per-chunk via WASM
│   └── cetak-lokal/page.js     # Redirect kompatibilitas → /dashboard (URL lama)
├── blog/
│   ├── page.js                  # Daftar artikel (baca dari folder posts/*.mdx)
│   └── [slug]/page.js           # Halaman detail artikel
├── robots.js, sitemap.js        # SEO
context/
└── AuthContext.js              # Provider status login (Firebase onAuthStateChanged)
lib/
└── firebase.js                 # Inisialisasi Firebase App/Auth (client-side)
```

> Catatan: dashboard lama (server-side, berbasis kuota + riwayat Firestore/Supabase) dan halaman desainer template (`/create-design`) sudah dihapus dari proyek ini — digantikan sepenuhnya oleh alur cetak lokal di atas.

### Dependensi eksternal yang tidak ikut di repo ini

Modul WASM untuk rendering PDF (`@/rust_wasm/pkg/pdf_cert_wasm.js`) dimuat secara dinamis oleh `app/dashboard/page.js` dan `app/dashboard/pdfWorker.js`, tapi **source Rust dan hasil build `wasm-pack`-nya tidak termasuk dalam paket ini**. Proyek ini mengasumsikan sudah ada crate Rust terpisah yang di-build dengan `wasm-pack build --target web` ke folder `rust_wasm/pkg/` di root proyek, dengan fungsi `generate_certificates_chunk(...)` yang menerima bytes template PDF, daftar baris data, konfigurasi tata letak, dan (opsional) bytes font kustom — mengembalikan `Vec<u8>` berisi berkas ZIP.

## Environment Variables

Buat berkas `.env.local` di root proyek:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Nilai-nilai ini didapat dari pengaturan proyek Firebase Anda (Project Settings → General → Your apps). Hanya dipakai untuk Firebase Authentication (login/register) — tidak ada data sertifikat/template yang disimpan ke Firebase.

## Menjalankan Secara Lokal

```bash
# 1. Install dependency
npm install

# 2. Pastikan modul WASM sudah tersedia di rust_wasm/pkg/
#    (build terpisah dari crate Rust, lihat catatan di atas)

# 3. Isi .env.local sesuai bagian Environment Variables

# 4. Jalankan dev server
npm run dev
```

Buka `http://localhost:3000`.

## Peta Halaman

| Rute | Deskripsi | Perlu login? |
|---|---|---|
| `/` | Landing page | Tidak |
| `/login`, `/register` | Autentikasi | Tidak |
| `/dashboard` | Editor & generator sertifikat (cetak lokal) | Ya |
| `/dashboard/cetak-lokal` | Redirect otomatis → `/dashboard` (kompatibilitas tautan lama) | Ya |
| `/blog`, `/blog/[slug]` | Artikel bantuan/panduan | Tidak |

## Desain

Seluruh halaman memakai satu sistem desain yang sama: latar krem terang (`#EBE9E4`), teks hitam pekat (`#111111`), aksen biru klasik (`#0000EE`), tombol bersudut tegas (`rounded-[4px]`), dan label berformat mono/uppercase untuk elemen UI teknis — didefinisikan di `app/globals.css` dan `app/layout.js`, dipakai konsisten di landing page, dashboard, login, register, dan blog.

## Lisensi

Belum ditentukan — tambahkan berkas `LICENSE` sesuai kebutuhan Anda.
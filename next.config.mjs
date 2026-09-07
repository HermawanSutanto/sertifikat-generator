/** @type {import('next').NextConfig} */
const nextConfig = {
  // @resvg/resvg-js (dan sharp) memuat binary native (.node). Package ini
  // tidak boleh ikut dibundel oleh bundler Next.js (Turbopack/Webpack) -
  // harus tetap di-require langsung dari node_modules saat runtime.
  //
  // Next.js 15+: opsi ini ada di level atas (bukan lagi di dalam `experimental`).
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],

  // Route /api/generate membaca file .ttf dari public/fonts/ lewat
  // fs.readFileSync saat runtime, dengan nama file yang dipilih secara
  // dinamis dari sebuah object (bukan string literal). Static file tracing
  // Next.js/Vercel bisa gagal mendeteksi dependency dinamis semacam ini,
  // sehingga file .ttf-nya terpangkas dari bundle serverless function
  // (gejalanya: jalan normal di lokal, tapi font hilang/kosong di Vercel).
  // Baris ini memaksa seluruh isi public/fonts/ ikut dibundel untuk route
  // tersebut, apa pun hasil analisis statisnya.
  outputFileTracingIncludes: {
    "/api/generate": ["./public/fonts/**"]
  }

  // Kalau project ini masih pakai Next.js 13/14, ganti dua baris di atas
  // menjadi ini (opsi-opsi lama ada di dalam `experimental`):
  //
  // experimental: {
  //   serverComponentsExternalPackages: ["@resvg/resvg-js", "sharp"],
  //   outputFileTracingIncludes: {
  //     "/api/generate": ["./public/fonts/**"]
  //   }
  // }
};

module.exports = nextConfig;
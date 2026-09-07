"use client"; // BARU: Mengubah ini menjadi Komponen Klien
import Link from "next/link";
import Image from "next/image"; // <-- TAMBAHKAN BARIS INI
import { useAuth } from "../context/AuthContext"; // BARU: Impor hook autentikasi
import { useRouter } from "next/navigation";
// Komponen ikon untuk bagian fitur
const FeatureIcon = ({ children }) => (
  <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white shadow-md">
    {children}
  </div>
);

export default function LandingPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const handleLogout = async () => {
    try {
      await logout();
      router.push("/"); // Arahkan kembali ke halaman utama setelah logout
    } catch (error) {
      console.error("Gagal melakukan logout:", error);
    }
  };
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-800">
      {/* Header */}
      <header className="w-full sticky top-0 bg-white/70 backdrop-blur-md shadow-sm z-50">
        <div className="container mx-auto flex justify-between items-center px-6 py-4">
          <Link
            href="/"
            className="text-2xl font-extrabold text-indigo-600 tracking-tight"
          >
            SertiGen
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
            <Link
              href="/#features"
              className="hover:text-indigo-600 transition"
            >
              Fitur
            </Link>
            <Link
              href="/#how-it-works"
              className="hover:text-indigo-600 transition"
            >
              Cara Kerja
            </Link>
            <Link href="/blog" className="hover:text-indigo-600 transition">
              Blog
            </Link>
          </nav>

          {/* Navigasi Aksi (DINAMIS BERDASARKAN STATUS LOGIN) */}
          <div className="flex items-center gap-2">
            {user ? (
              // Tampilan JIKA PENGGUNA SUDAH LOGIN
              <>
                <Link
                  href="/dashboard"
                  className="px-5 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              // Tampilan JIKA PENGGUNA BELUM LOGIN (Tamu)
              <>
                <Link
                  href="/login"
                  className="px-5 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition"
                >
                  Daftar Gratis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="pt-24 pb-12 flex items-center bg-gradient-to-br from-indigo-50 to-white">
          <div className="container mx-auto text-center px-6">
            <h2 className="text-4xl md:text-6xl font-extrabold leading-tight text-slate-900">
              Buat Ratusan Sertifikat Personal
              <span className="block text-indigo-600 mt-2">
                dalam Hitungan Menit
              </span>
            </h2>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
              Ucapkan selamat tinggal pada proses input data manual. Cukup
              unggah template, masukkan daftar nama, dan biarkan SertiGen
              mencetak sertifikat profesional secara otomatis.
            </p>
            <div className="mt-10">
              <Link
                href="/register"
                className="px-8 py-4 font-semibold text-white bg-indigo-600 rounded-xl shadow-lg hover:bg-indigo-700 hover:scale-105 transform transition"
              >
                Mulai Membuat, Gratis!
              </Link>
            </div>
          </div>
        </section>

        {/* BAGIAN BARU: Visual Produk */}
        <section className="pb-20 pt-10 bg-white">
          <div className="container mx-auto px-6">
            <div className="w-full max-w-4xl mx-auto rounded-2xl shadow-2xl border border-slate-200 p-2 bg-slate-100">
              {/* Ganti div di bawah ini dengan screenshot atau GIF aplikasi Anda */}
              <Image
                src="/sertigen-demo.png" // Nama file gambar Anda di folder /public
                alt="Demo Aplikasi SertiGen - Generator Sertifikat Otomatis"
                width={1200} // Lebar asli gambar dalam pixel
                height={675} // Tinggi asli gambar dalam pixel
                className="rounded-xl w-full h-auto"
              />
            </div>
          </div>
        </section>

        {/* Fitur Unggulan */}
        <section id="features" className="bg-white py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900">
                Kenapa Memilih SertiGen?
              </h3>
              <p className="mt-4 text-gray-600 max-w-xl mx-auto">
                Alat yang Anda butuhkan untuk efisiensi kerja tanpa kompromi
                pada kualitas.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {[
                {
                  title: "Cepat & Efisien",
                  desc: "Proses ratusan nama hanya dalam sekali klik, bukan berjam-jam kerja manual.",
                  icon: (
                    <>
                      <path d="m12 14 4-4" />
                      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
                    </>
                  )
                },
                {
                  title: "Kustomisasi Mudah",
                  desc: "Atur posisi nama, ukuran, jenis, dan warna font dengan pratinjau interaktif.",
                  icon: (
                    <path d="M12 15-3.4 4.2c-.5-.8-1.5-.8-2-.1l-.8.8c-.5.7-.5 1.7 0 2.4l13.2 13.2c.7.7 1.7.7 2.4 0l.8-.8c.7-.5.7-1.5-.1-2Z" />
                  )
                },
                {
                  title: "Kualitas Profesional",
                  desc: "Ekspor sertifikat dalam format PNG resolusi tinggi, siap dibagikan digital.",
                  icon: (
                    <>
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <path d="m12 9 1.8 3.6a.5.5 0 0 0 .8.4l3.6 1.8-3.6 1.8a.5.5 0 0 0-.8.4L12 21l-1.8-3.6a.5.5 0 0 0-.8-.4L5.8 15l3.6-1.8a.5.5 0 0 0 .8-.4Z" />
                    </>
                  )
                },
                {
                  title: "Siap Cetak & Digital",
                  desc: "File PNG tajam saat dicetak dan sempurna untuk dibagikan online.",
                  icon: (
                    <>
                      <path d="M6 18h12a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2Z" />
                      <path d="M6 9V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
                      <path d="M10 12h4" />
                    </>
                  )
                }
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-8 bg-slate-50 rounded-2xl shadow-sm hover:shadow-md transition"
                >
                  <FeatureIcon>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {item.icon}
                    </svg>
                  </FeatureIcon>
                  <h4 className="mt-6 text-xl font-semibold">{item.title}</h4>
                  <p className="mt-2 text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BAGIAN BARU: Bukti Sosial (Testimonials) */}
        <section id="testimonials" className="py-20 bg-slate-50">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900">
                Dipercaya oleh Penyelenggara Acara
              </h3>
              <p className="mt-4 text-gray-600 max-w-xl mx-auto">
                Lihat apa kata mereka yang telah menghemat waktu dengan
                SertiGen.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Testimoni 1 */}
              <div className="p-8 bg-white rounded-2xl shadow-sm">
                <p className="text-gray-700 italic">
                  &quot;SertiGen benar-benar mengubah cara kami mengelola
                  sertifikat webinar. Dari yang tadinya butuh berjam-jam,
                  sekarang selesai dalam 5 menit. Luar biasa!&quot;
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200"></div>{" "}
                  {/* Placeholder Foto */}
                  <div>
                    <p className="font-semibold text-slate-900">Budi Santoso</p>
                    <p className="text-sm text-gray-600">
                      Event Organizer, TechTalks ID
                    </p>
                  </div>
                </div>
              </div>
              {/* Testimoni 2 */}
              <div className="p-8 bg-white rounded-2xl shadow-sm">
                <p className="text-gray-700 italic">
                  &quot;Awalnya ragu, tapi ternyata antarmukanya sangat mudah
                  digunakan. Fitur kustomisasi posisinya sangat membantu. Highly
                  recommended!&quot;
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200"></div>{" "}
                  {/* Placeholder Foto */}
                  <div>
                    <p className="font-semibold text-slate-900">
                      Citra Lestari
                    </p>
                    <p className="text-sm text-gray-600">
                      Panitia, Lomba Desain Nasional
                    </p>
                  </div>
                </div>
              </div>
              {/* Testimoni 3 */}
              <div className="p-8 bg-white rounded-2xl shadow-sm">
                <p className="text-gray-700 italic">
                  &quot;Fitur download semua sebagai ZIP adalah penyelamat.
                  Tidak perlu lagi mengunduh satu per satu. Efisiensi kerja tim
                  kami meningkat drastis.&quot;
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200"></div>{" "}
                  {/* Placeholder Foto */}
                  <div>
                    <p className="font-semibold text-slate-900">
                      Rian Adriansyah
                    </p>
                    <p className="text-sm text-gray-600">
                      Koordinator, Pelatihan Digital Marketing
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cara Kerja */}
        <section id="how-it-works" className="py-20 bg-slate-50">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900">
                Hanya 3 Langkah Mudah
              </h3>
              <p className="mt-4 text-gray-600 max-w-xl mx-auto">
                Mulai dari template hingga sertifikat jadi dalam sekejap.
              </p>
            </div>
            <div className="relative">
              <div
                className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-indigo-100"
                aria-hidden="true"
              />
              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-16">
                {[
                  {
                    step: "01",
                    title: "Unggah Template",
                    desc: "Gunakan desain sertifikat Anda dalam format JPG atau PNG."
                  },
                  {
                    step: "02",
                    title: "Masukkan Nama",
                    desc: "Salin-tempel daftar nama, lalu sesuaikan posisi dan gaya teks."
                  },
                  {
                    step: "03",
                    title: "Generate & Unduh",
                    desc: "Klik 'Generate' dan semua sertifikat siap diunduh."
                  }
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-white shadow-md border border-indigo-100 text-2xl font-bold text-indigo-600">
                      {s.step}
                    </div>
                    <h4 className="mt-6 text-xl font-semibold">{s.title}</h4>
                    <p className="mt-2 text-gray-600">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* BAGIAN BARU: FAQ */}
        <section id="faq" className="py-20 bg-slate-50">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900">
                Pertanyaan yang Sering Diajukan
              </h3>
              <p className="mt-4 text-gray-600 max-w-xl mx-auto">
                Punya pertanyaan? Kami punya jawabannya.
              </p>
            </div>
            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-lg mb-2">
                  Apakah SertiGen gratis?
                </h4>
                <p className="text-gray-600">
                  Ya, Anda bisa memulai secara gratis! Paket gratis kami
                  memungkinkan Anda untuk membuat hingga 50 sertifikat untuk
                  mencoba semua fitur utama SertiGen.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2">
                  Format file apa yang didukung?
                </h4>
                <p className="text-gray-600">
                  Anda dapat mengunggah template sertifikat dalam format gambar
                  populer seperti JPG atau PNG untuk hasil terbaik.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2">
                  Berapa banyak sertifikat yang bisa saya buat?
                </h4>
                <p className="text-gray-600">
                  Dengan paket premium kami, tidak ada batasan jumlah sertifikat
                  yang bisa Anda hasilkan. Untuk paket gratis, batasnya adalah
                  50 sertifikat.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2">
                  Apakah data saya aman?
                </h4>
                <p className="text-gray-600">
                  Tentu saja. Kami sangat menjaga privasi data Anda. Daftar nama
                  yang Anda unggah hanya digunakan untuk proses pembuatan
                  sertifikat dan tidak akan dibagikan.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BAGIAN BARU: Dari Blog Kami */}
        <section id="blog-preview" className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900">
                Dari Blog Kami
              </h3>
              <p className="mt-4 text-gray-600 max-w-xl mx-auto">
                Baca tips dan panduan terbaru seputar dunia sertifikat.
              </p>
            </div>
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Post 1 */}
              <Link
                href="/blog/10-font-terbaik-untuk-sertifikat"
                className="block p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100"
              >
                <h4 className="font-bold text-xl text-indigo-700">
                  10 Font Terbaik dan Profesional untuk Desain Sertifikat Resmi
                </h4>
                <p className="mt-2 text-gray-600">
                  Memilih font yang tepat adalah kunci untuk desain sertifikat
                  yang terlihat profesional...
                </p>
                <div className="text-indigo-600 font-semibold mt-4 inline-block">
                  Baca Selengkapnya →
                </div>
              </Link>
              {/* Post 2 */}
              <Link
                href="/blog/cara-membuat-sertifikat-webinar"
                className="block p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100"
              >
                <h4 className="font-bold text-xl text-indigo-700">
                  5 Langkah Mudah Membuat Sertifikat Webinar Profesional
                </h4>
                <p className="mt-2 text-gray-600">
                  Webinar Anda sukses besar? Saatnya memberikan apresiasi kepada
                  peserta dengan sertifikat...
                </p>
                <div className="text-indigo-600 font-semibold mt-4 inline-block">
                  Baca Selengkapnya →
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
          <div className="container mx-auto text-center px-6 py-20">
            <h3 className="text-3xl md:text-4xl font-bold">
              Siap Mengubah Cara Anda Membuat Sertifikat?
            </h3>
            <p className="mt-4 text-indigo-200 max-w-xl mx-auto">
              Daftar sekarang dan rasakan kemudahan manajemen sertifikat di
              ujung jari Anda. Gratis untuk memulai!
            </p>
            <div className="mt-8">
              <Link
                href="/register"
                className="px-8 py-4 font-semibold text-indigo-600 bg-white rounded-xl shadow-lg hover:bg-gray-100 hover:scale-105 transform transition"
              >
                Coba SertiGen Sekarang
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-gray-50 border-t">
        <div className="container mx-auto p-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SertiGen. Hak Cipta Dilindungi.
        </div>
      </footer>
    </div>
  );
}

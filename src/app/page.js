import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Fraunces, Public_Sans } from "next/font/google";
import AuthNav from "./AuthNav"; // sesuaikan path jika struktur folder berbeda

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

// SEO: sekarang bisa diekspor karena halaman ini server component.
// Ganti "https://sertifikat-generator-olive.vercel.app/" dengan domain asli sebelum deploy.
export const metadata = {
  metadataBase: new URL("https://sertifikat-generator-olive.vercel.app/"),
  title: "SertiGen — Generator Sertifikat Otomatis untuk Webinar & Acara",
  description:
    "Buat ratusan sertifikat personal dalam hitungan menit. Unggah template, masukkan daftar nama, dan unduh sertifikat profesional siap cetak maupun digital. Gratis untuk 50 sertifikat pertama.",
  keywords: [
    "generator sertifikat",
    "buat sertifikat online",
    "sertifikat webinar",
    "sertifikat otomatis",
    "template sertifikat",
    "cetak sertifikat massal",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "SertiGen — Generator Sertifikat Otomatis untuk Webinar & Acara",
    description:
      "Ucapkan selamat tinggal pada input data manual. Unggah template, masukkan daftar nama, dan biarkan SertiGen mencetak sertifikat profesional secara otomatis.",
    url: "/",
    siteName: "SertiGen",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "SertiGen — Generator Sertifikat Otomatis" }],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SertiGen — Generator Sertifikat Otomatis untuk Webinar & Acara",
    description: "Buat ratusan sertifikat personal dalam hitungan menit tanpa input manual satu per satu.",
  },
};

const faqs = [
  {
    q: "Apakah SertiGen gratis?",
    a: "Ya, Anda bisa memulai secara gratis. Paket gratis memungkinkan Anda membuat hingga 50 sertifikat untuk mencoba semua fitur utama SertiGen.",
  },
  {
    q: "Format file apa yang didukung?",
    a: "Anda dapat mengunggah template sertifikat dalam format gambar populer seperti JPG atau PNG untuk hasil terbaik.",
  },
  {
    q: "Berapa banyak sertifikat yang bisa saya buat?",
    a: "Paket gratis dibatasi 50 sertifikat. Dengan paket premium, tidak ada batasan jumlah sertifikat yang bisa Anda hasilkan.",
  },
  {
    q: "Apakah data saya aman?",
    a: "Ya. Daftar nama yang Anda unggah hanya digunakan untuk proses pembuatan sertifikat dan tidak akan dibagikan ke pihak lain.",
  },
];

// Structured data: memberi peluang FAQ rich-snippet di hasil pencarian Google.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

const features = [
  {
    title: "Cepat & Efisien",
    desc: "Proses ratusan nama hanya dalam sekali klik, bukan berjam-jam kerja manual.",
    icon: (
      <>
        <path d="m12 14 4-4" />
        <path d="M3.34 19a10 10 0 1 1 17.32 0" />
      </>
    ),
  },
  {
    title: "Kustomisasi Mudah",
    desc: "Atur posisi nama, ukuran, jenis, dan warna font dengan pratinjau interaktif.",
    icon: <path d="M12 15-3.4 4.2c-.5-.8-1.5-.8-2-.1l-.8.8c-.5.7-.5 1.7 0 2.4l13.2 13.2c.7.7 1.7.7 2.4 0l.8-.8c.7-.5.7-1.5-.1-2Z" />,
  },
  {
    title: "Kualitas Profesional",
    desc: "Ekspor sertifikat dalam format PNG resolusi tinggi, siap dibagikan digital.",
    icon: (
      <>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="m12 9 1.8 3.6a.5.5 0 0 0 .8.4l3.6 1.8-3.6 1.8a.5.5 0 0 0-.8.4L12 21l-1.8-3.6a.5.5 0 0 0-.8-.4L5.8 15l3.6-1.8a.5.5 0 0 0 .8-.4Z" />
      </>
    ),
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
    ),
  },
];

const testimonials = [
  {
    quote:
      "SertiGen benar-benar mengubah cara kami mengelola sertifikat webinar. Dari yang tadinya butuh berjam-jam, sekarang selesai dalam 5 menit.",
    name: "Budi Santoso",
    role: "Event Organizer, TechTalks ID",
  },
  {
    quote:
      "Awalnya ragu, tapi ternyata antarmukanya sangat mudah digunakan. Fitur kustomisasi posisinya sangat membantu.",
    name: "Citra Lestari",
    role: "Panitia, Lomba Desain Nasional",
  },
  {
    quote:
      "Fitur download semua sebagai ZIP adalah penyelamat. Tidak perlu lagi mengunduh satu per satu. Efisiensi kerja tim kami meningkat drastis.",
    name: "Rian Adriansyah",
    role: "Koordinator, Pelatihan Digital Marketing",
  },
];

const steps = [
  { step: "01", title: "Unggah Template", desc: "Gunakan desain sertifikat Anda dalam format JPG atau PNG." },
  { step: "02", title: "Masukkan Nama", desc: "Salin-tempel daftar nama, lalu sesuaikan posisi dan gaya teks." },
  { step: "03", title: "Generate & Unduh", desc: "Klik \u201cGenerate\u201d dan semua sertifikat siap diunduh." },
];

const posts = [
  {
    href: "/blog/10-font-terbaik-untuk-sertifikat",
    title: "10 Font Terbaik dan Profesional untuk Desain Sertifikat Resmi",
    excerpt: "Memilih font yang tepat adalah kunci untuk desain sertifikat yang terlihat profesional.",
  },
  {
    href: "/blog/cara-membuat-sertifikat-webinar",
    title: "5 Langkah Mudah Membuat Sertifikat Webinar Profesional",
    excerpt: "Webinar Anda sukses besar? Saatnya memberikan apresiasi kepada peserta dengan sertifikat.",
  },
];

function Icon({ children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div
      className={`${fraunces.variable} ${publicSans.variable} flex flex-col min-h-screen bg-[#F2EAD3] text-[#1B2436]`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-[#17233D] focus:text-[#F2EAD3] focus:px-4 focus:py-2 focus:rounded-md"
      >
        Lewati ke konten
      </a>

      {/* Header */}
      <header className="w-full sticky top-0 bg-[#F2EAD3]/90 backdrop-blur-md border-b border-[#1B2436]/10 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#17233D]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="flex items-center justify-center h-8 w-8 rounded-full border-2 border-[#A9822E] text-xs text-[#A9822E]">
              SG
            </span>
            SertiGen
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#1B2436]/80">
            <Link href="/#features" className="hover:text-[#8C2F39] transition-colors">
              Fitur
            </Link>
            <Link href="/#how-it-works" className="hover:text-[#8C2F39] transition-colors">
              Cara Kerja
            </Link>
            <Link href="/blog" className="hover:text-[#8C2F39] transition-colors">
              Blog
            </Link>
          </nav>

          <Suspense
            fallback={<div className="h-9 w-[168px]" aria-hidden="true" />}
          >
            <AuthNav />
          </Suspense>
        </div>
      </header>

      <main id="konten-utama" className="flex-grow">
        {/* Hero */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-14 items-center">
            <div>
              <h1
                className="text-4xl md:text-[3.4rem] leading-[1.08] font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Ratusan sertifikat, satu template, lima menit.
              </h1>
              <p className="mt-6 text-lg text-[#1B2436]/75 max-w-md">
                Ucapkan selamat tinggal pada input data manual. Unggah template
                Anda, tempel daftar nama, dan biarkan SertiGen mencetak
                sertifikat profesional secara otomatis.
              </p>
              <div className="mt-9 flex items-center gap-5">
                <Link
                  href="/register"
                  className="px-7 py-3.5 font-semibold text-[#F2EAD3] bg-[#8C2F39] rounded-md hover:bg-[#742531] transition-colors"
                >
                  Mulai Membuat, Gratis
                </Link>
                <Link
                  href="/#how-it-works"
                  className="text-sm font-semibold text-[#17233D] border-b border-[#17233D]/40 hover:border-[#17233D] transition-colors"
                >
                  Lihat cara kerjanya
                </Link>
              </div>
              <p className="mt-5 text-sm text-[#1B2436]/55">
                Gratis untuk 50 sertifikat pertama. Tanpa kartu kredit.
              </p>
            </div>

            {/* Bingkai ala sertifikat, bukan kartu shadow generik */}
            <div className="relative">
              <div className="border-[3px] border-double border-[#A9822E]/70 p-3 bg-[#FCFAF2]">
                <Image
                  src="/sertigen-demo.png"
                  alt="Tampilan dashboard SertiGen menunjukkan template sertifikat dan daftar nama penerima"
                  width={1200}
                  height={675}
                  priority
                  className="w-full h-auto"
                />
              </div>
              <span className="absolute -top-3 -left-3 h-6 w-6 border-t-2 border-l-2 border-[#A9822E]" aria-hidden="true" />
              <span className="absolute -bottom-3 -right-3 h-6 w-6 border-b-2 border-r-2 border-[#A9822E]" aria-hidden="true" />
            </div>
          </div>
        </section>

        {/* Fitur Unggulan */}
        <section id="features" className="py-20 bg-[#FCFAF2] border-y border-[#1B2436]/10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-xl mb-14">
              <h2
                className="text-3xl md:text-4xl font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Kenapa memilih SertiGen?
              </h2>
              <p className="mt-4 text-[#1B2436]/70">
                Alat yang Anda butuhkan untuk efisiensi kerja tanpa kompromi
                pada kualitas.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
              {features.map((item, i) => (
                <div key={i} className="border-t-2 border-[#17233D] pt-5">
                  <div className="flex items-center justify-center h-11 w-11 rounded-full border border-[#A9822E] text-[#A9822E]">
                    <Icon>{item.icon}</Icon>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[#17233D]">{item.title}</h3>
                  <p className="mt-2 text-[#1B2436]/70 text-[15px]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bukti Sosial */}
        <section id="testimonials" className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-xl mb-14">
              <h2
                className="text-3xl md:text-4xl font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Dipercaya oleh penyelenggara acara
              </h2>
              <p className="mt-4 text-[#1B2436]/70">
                Lihat apa kata mereka yang telah menghemat waktu dengan
                SertiGen.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((t, i) => (
                <figure key={i} className="bg-[#FCFAF2] border border-[#1B2436]/10 p-7">
                  <blockquote className="text-[#1B2436]/85 text-[15px] leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#17233D]/10" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-[#17233D] text-sm">{t.name}</p>
                      <p className="text-xs text-[#1B2436]/60">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Cara Kerja */}
        <section id="how-it-works" className="py-20 bg-[#FCFAF2] border-y border-[#1B2436]/10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-xl mb-14">
              <h2
                className="text-3xl md:text-4xl font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Hanya 3 langkah mudah
              </h2>
              <p className="mt-4 text-[#1B2436]/70">
                Mulai dari template hingga sertifikat jadi dalam sekejap.
              </p>
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span
                    className="shrink-0 flex items-center justify-center h-11 w-11 rounded-full bg-[#17233D] text-[#F2EAD3] text-sm font-semibold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {s.step}
                  </span>
                  <div>
                    <h3 className="font-semibold text-[#17233D]">{s.title}</h3>
                    <p className="mt-1.5 text-[15px] text-[#1B2436]/70">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-xl mb-14">
              <h2
                className="text-3xl md:text-4xl font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Pertanyaan yang sering diajukan
              </h2>
              <p className="mt-4 text-[#1B2436]/70">Punya pertanyaan lain? Kami siap membantu.</p>
            </div>
            <dl className="max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
              {faqs.map((item, i) => (
                <div key={i}>
                  <dt className="font-semibold text-[#17233D]">{item.q}</dt>
                  <dd className="mt-2 text-[#1B2436]/70 text-[15px]">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Dari Blog Kami */}
        <section id="blog-preview" className="py-20 bg-[#FCFAF2] border-y border-[#1B2436]/10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-xl mb-14">
              <h2
                className="text-3xl md:text-4xl font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Dari blog kami
              </h2>
              <p className="mt-4 text-[#1B2436]/70">
                Baca tips dan panduan terbaru seputar dunia sertifikat.
              </p>
            </div>
            <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
              {posts.map((post, i) => (
                <Link
                  key={i}
                  href={post.href}
                  className="block p-7 border border-[#1B2436]/10 bg-white hover:border-[#A9822E] transition-colors"
                >
                  <h3 className="font-semibold text-lg text-[#17233D]">{post.title}</h3>
                  <p className="mt-2 text-[15px] text-[#1B2436]/70">{post.excerpt}</p>
                  <span className="mt-4 inline-block text-sm font-semibold text-[#8C2F39]">
                    Baca selengkapnya
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-[#17233D] text-[#F2EAD3]">
          <div className="max-w-6xl mx-auto text-center px-6 py-20">
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Siap mengubah cara Anda membuat sertifikat?
            </h2>
            <p className="mt-4 text-[#F2EAD3]/70 max-w-xl mx-auto">
              Daftar sekarang dan rasakan kemudahan manajemen sertifikat di
              ujung jari Anda. Gratis untuk memulai.
            </p>
            <div className="mt-8">
              <Link
                href="/register"
                className="inline-block px-7 py-3.5 font-semibold text-[#17233D] bg-[#F2EAD3] rounded-md hover:bg-white transition-colors"
              >
                Coba SertiGen Sekarang
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#F2EAD3] border-t border-[#1B2436]/10">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-[#1B2436]/55">
          © {new Date().getFullYear()} SertiGen. Hak cipta dilindungi.
        </div>
      </footer>
    </div>
  );
}
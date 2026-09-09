import { Suspense } from "react";
import Link from "next/link";
import { Fraunces, Public_Sans } from "next/font/google";
import {
  ArrowRight,
  Award,
  Check,
  Globe,
  Mail,
  Medal,
  MessageCircle,
  Plus,
  Printer,
  Quote,
  SlidersHorizontal,
  Target,
} from "lucide-react";
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

// SEO: halaman ini server component sehingga metadata bisa diekspor.
// Ganti "https://sertigen.example.com" dengan domain asli sebelum deploy.
export const metadata = {
  metadataBase: new URL("https://sertigen.example.com"),
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

// Ganti angka-angka di bawah (badge, stats) dengan data riil sebelum publish.
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
    icon: Target,
  },
  {
    title: "Kustomisasi Mudah",
    desc: "Atur posisi nama, ukuran, jenis, dan warna font dengan pratinjau interaktif.",
    icon: SlidersHorizontal,
  },
  {
    title: "Kualitas Profesional",
    desc: "Ekspor sertifikat dalam format PNG resolusi tinggi, siap dibagikan digital.",
    icon: Medal,
  },
  {
    title: "Siap Cetak & Digital",
    desc: "File PNG tajam saat dicetak dan sempurna untuk dibagikan online.",
    icon: Printer,
  },
];

const testimonials = [
  {
    quote:
      "SertiGen benar-benar mengubah cara kami mengelola sertifikat webinar. Dari yang tadinya butuh berjam-jam, sekarang selesai dalam 5 menit.",
    name: "Budi Santoso",
    role: "Event Organizer, TechTalks ID",
    initials: "BS",
  },
  {
    quote:
      "Awalnya ragu, tapi ternyata antarmukanya sangat mudah digunakan. Fitur kustomisasi posisinya sangat membantu.",
    name: "Citra Lestari",
    role: "Panitia, Lomba Desain Nasional",
    initials: "CL",
  },
  {
    quote:
      "Fitur download semua sebagai ZIP adalah penyelamat. Tidak perlu lagi mengunduh satu per satu. Efisiensi kerja tim kami meningkat drastis.",
    name: "Rian Adriansyah",
    role: "Koordinator, Pelatihan Digital Marketing",
    initials: "RA",
  },
];

const steps = [
  { step: "01", title: "Unggah Template", desc: "Gunakan desain sertifikat Anda dalam format JPG atau PNG." },
  { step: "02", title: "Masukkan Nama", desc: "Salin-tempel daftar nama, lalu sesuaikan posisi dan gaya teks." },
  { step: "03", title: "Generate & Unduh", desc: "Klik \u201cGenerate\u201d dan semua sertifikat siap diunduh." },
];

const plans = [
  {
    name: "Gratis",
    price: "Rp0",
    perks: ["50 sertifikat pertama", "Semua fitur kustomisasi", "Export PNG resolusi tinggi"],
    highlight: false,
  },
  {
    name: "Premium",
    price: "Rp149rb/bulan",
    perks: ["Sertifikat tanpa batas", "Download massal ZIP", "Dukungan prioritas"],
    highlight: true,
  },
];

const posts = [
  {
    href: "/blog/10-font-terbaik-untuk-sertifikat",
    tag: "Desain",
    title: "10 Font Terbaik dan Profesional untuk Desain Sertifikat Resmi",
    excerpt: "Memilih font yang tepat adalah kunci untuk desain sertifikat yang terlihat profesional.",
  },
  {
    href: "/blog/cara-membuat-sertifikat-webinar",
    tag: "Panduan",
    title: "5 Langkah Mudah Membuat Sertifikat Webinar Profesional",
    excerpt: "Webinar Anda sukses besar? Saatnya memberikan apresiasi kepada peserta dengan sertifikat.",
  },
];

// Ganti href="#" dengan tautan sosial asli, dan sesuaikan ikon/label sesuai platform yang dipakai.
const socials = [
  { icon: Globe, label: "Website" },
  { icon: Mail, label: "Email" },
  { icon: MessageCircle, label: "WhatsApp" },
];

export default function LandingPage() {
  return (
    <div
      className={`${fraunces.variable} ${publicSans.variable} bg-[#F2EAD3] text-[#17233D] w-full`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-[#17233D] focus:text-[#F2EAD3] focus:px-4 focus:py-2 focus:rounded-full"
      >
        Lewati ke konten
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F2EAD3]/90 backdrop-blur-md border-b border-[#17233D]/10">
        <div className="max-w-[1140px] mx-auto px-6 md:px-12 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Logo Certify" style={{ maxWidth: "40pt" }} className="site-logo" />
            <span
              className="text-xl font-bold text-[#17233D] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              SertiGen
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#17233D]/80">
            <Link href="/#features" className="hover:text-[#8C2F39] transition-colors">
              Fitur
            </Link>
            <Link href="/#how-it-works" className="hover:text-[#8C2F39] transition-colors">
              Cara Kerja
            </Link>
            <Link href="/#pricing" className="hover:text-[#8C2F39] transition-colors">
              Harga
            </Link>
            <Link href="/blog" className="hover:text-[#8C2F39] transition-colors">
              Blog
            </Link>
          </nav>

          <Suspense fallback={<div className="h-9 w-[168px]" aria-hidden="true" />}>
            <AuthNav />
          </Suspense>
        </div>
      </header>

      <main id="konten-utama">
        {/* Hero */}
        <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_#FBF3DB,_#F2EAD3)] pt-16 pb-20 md:pt-20 md:pb-24">
          <div
            className="hidden md:block absolute right-16 top-16 w-24 h-24 rounded-full border-2 border-[#A9822E]/40"
            aria-hidden="true"
          />
          <div
            className="hidden md:block absolute left-1/4 top-24 w-40 h-40 rounded-full border border-dashed border-[#A9822E]/40"
            aria-hidden="true"
          />

          <div className="relative max-w-[1140px] mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#A9822E]/50 bg-[#FCFAF2] px-4 py-1.5 text-xs font-semibold text-[#A9822E]">
                ✦ Dipercaya 2.000+ penyelenggara acara
              </div>

              <h1
                className="mt-6 text-4xl md:text-[3.4rem] leading-[1.08] font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Ratusan sertifikat, <em className="italic text-[#8C2F39]">satu template</em>, lima menit.
              </h1>

              <p className="mt-6 max-w-md text-lg leading-relaxed text-[#17233D]/70">
                Ucapkan selamat tinggal pada input data manual. Unggah template
                Anda, tempel daftar nama, dan biarkan SertiGen mencetak
                sertifikat profesional secara otomatis.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-[#8C2F39] px-7 py-3.5 text-base font-semibold text-[#F2EAD3] shadow-lg hover:bg-[#742531] transition-colors"
                >
                  Mulai Membuat, Gratis
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/#how-it-works"
                  className="rounded-full px-7 py-3.5 text-base font-semibold text-[#17233D] hover:bg-[#17233D]/[0.06] transition-colors"
                >
                  Lihat Cara Kerja
                </Link>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex -space-x-2" aria-hidden="true">
                  <div className="w-7 h-7 rounded-full border-2 border-[#F2EAD3] bg-[#A9822E]/40" />
                  <div className="w-7 h-7 rounded-full border-2 border-[#F2EAD3] bg-[#8C2F39]/40" />
                  <div className="w-7 h-7 rounded-full border-2 border-[#F2EAD3] bg-[#17233D]/30" />
                </div>
                <span className="text-sm text-[#17233D]/60">
                  Gratis untuk 50 sertifikat pertama · Tanpa kartu kredit
                </span>
              </div>

              <dl className="mt-8 flex gap-10">
                <div>
                  <dt className="sr-only">Sertifikat dibuat</dt>
                  <dd className="text-2xl font-bold text-[#17233D]">50.000+</dd>
                  <dt className="text-xs uppercase tracking-wide text-[#17233D]/50">Sertifikat dibuat</dt>
                </div>
                <div>
                  <dd className="text-2xl font-bold text-[#17233D]">2.000+</dd>
                  <dt className="text-xs uppercase tracking-wide text-[#17233D]/50">Penyelenggara</dt>
                </div>
                <div>
                  <dd className="text-2xl font-bold text-[#17233D]">4.9/5</dd>
                  <dt className="text-xs uppercase tracking-wide text-[#17233D]/50">Rating pengguna</dt>
                </div>
              </dl>
            </div>

            {/* Mockup sertifikat dekoratif */}
            <div className="relative">
              <div
                className="hidden md:block absolute -right-8 -top-8 w-56 h-56 rounded-full bg-[#A9822E]/30 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative border-[3px] border-double border-[#A9822E]/70 bg-[#FCFAF2] p-10 shadow-2xl">
                <span className="absolute -left-3 -top-3 h-7 w-7 border-t-2 border-l-2 border-[#A9822E]" aria-hidden="true" />
                <span className="absolute -right-3 -bottom-3 h-7 w-7 border-b-2 border-r-2 border-[#A9822E]" aria-hidden="true" />
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full border border-[#A9822E]/50 bg-[#A9822E]/15">
                    <Award className="size-8 text-[#A9822E]" />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#A9822E]">
                    Certificate of Completion
                  </div>
                  <div className="h-px w-24 bg-[#A9822E]/50" />
                  <div className="h-4 w-40 rounded-sm bg-[#17233D]/15" />
                  <div className="mt-6 h-px w-32 bg-[#17233D]/30" />
                  <div className="text-[10px] uppercase tracking-widest text-[#17233D]/40">
                    Tanda Tangan
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fitur Unggulan */}
        <section id="features" className="border-y border-[#17233D]/10 bg-[#FCFAF2] py-20">
          <div className="max-w-[1140px] mx-auto px-6 md:px-12">
            <div className="max-w-xl mb-14">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[#A9822E]">
                Keunggulan
              </div>
              <h2
                className="mt-3 text-3xl md:text-4xl font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Kenapa memilih SertiGen?
              </h2>
              <p className="mt-4 text-[#17233D]/70">
                Alat yang Anda butuhkan untuk efisiensi kerja tanpa kompromi
                pada kualitas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((item) => (
                <div key={item.title} className="rounded-xl bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-center w-11 h-11 rounded-full border border-[#A9822E] text-[#A9822E]">
                    <item.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#17233D]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#17233D]/70">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quote Spotlight */}
        <section className="py-20">
          <div className="max-w-[1140px] mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-center">
            <div className="overflow-hidden rounded-2xl shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800"
                alt="Suasana upacara wisuda dan penyerahan sertifikat"
                width={800}
                height={600}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <Quote className="size-8 text-[#A9822E]" aria-hidden="true" />
              <blockquote
                className="mt-4 text-3xl font-bold leading-snug text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                &ldquo;SertiGen menghemat 20+ jam kerja tim kami setiap bulan.&rdquo;
              </blockquote>
              <p className="mt-4 text-sm font-medium text-[#17233D]/70">
                Tim Event, Kominfo Digital Talent
              </p>
              <div className="mt-8 flex gap-8">
                <div>
                  <div className="text-xl font-bold text-[#17233D]">20+</div>
                  <div className="text-xs text-[#17233D]/50">jam dihemat/bulan</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#17233D]">99%</div>
                  <div className="text-xs text-[#17233D]/50">akurasi nama</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#17233D]">&lt;5 menit</div>
                  <div className="text-xs text-[#17233D]/50">proses</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimoni */}
        <section id="testimonials" className="py-20">
          <div className="max-w-[1140px] mx-auto px-6 md:px-12">
            <div className="max-w-xl mb-14">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[#A9822E]">
                Testimoni
              </div>
              <h2
                className="mt-3 text-3xl md:text-4xl font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Dipercaya oleh penyelenggara acara
              </h2>
              <p className="mt-4 text-[#17233D]/70">
                Lihat apa kata mereka yang telah menghemat waktu dengan
                SertiGen.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((t) => (
                <figure key={t.name} className="rounded-xl bg-white p-6 shadow-sm">
                  <Quote className="size-6 text-[#A9822E]" aria-hidden="true" />
                  <blockquote className="mt-4 text-sm leading-relaxed text-[#17233D]/85">
                    {t.quote}
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#17233D]/10 text-xs font-semibold text-[#17233D]">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#17233D]">{t.name}</p>
                      <p className="text-xs text-[#17233D]/60">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Cara Kerja */}
        <section id="how-it-works" className="border-y border-[#17233D]/10 bg-[#FCFAF2] py-20">
          <div className="max-w-[1140px] mx-auto px-6 md:px-12">
            <div className="max-w-xl mb-14">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[#A9822E]">
                Alur Kerja
              </div>
              <h2
                className="mt-3 text-3xl md:text-4xl font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Hanya 3 langkah mudah
              </h2>
              <p className="mt-4 text-[#17233D]/70">
                Mulai dari template hingga sertifikat jadi dalam sekejap.
              </p>
            </div>

            <ol className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
              <div
                className="hidden md:block absolute inset-x-[16%] top-8 h-px border-t border-dashed border-[#A9822E]/50"
                aria-hidden="true"
              />
              {steps.map((s) => (
                <li key={s.step} className="relative flex flex-col items-center text-center">
                  <span
                    className="flex items-center justify-center w-16 h-16 rounded-full bg-[#17233D] text-lg font-bold text-[#F2EAD3] ring-2 ring-[#A9822E]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {s.step}
                  </span>
                  <h3 className="mt-5 font-semibold text-[#17233D]">{s.title}</h3>
                  <p className="mt-2 text-sm text-[#17233D]/70">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Harga */}
        <section id="pricing" className="py-20">
          <div className="max-w-[1140px] mx-auto px-6 md:px-12">
            <div className="max-w-xl mb-14">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[#A9822E]">
                Harga
              </div>
              <h2
                className="mt-3 text-3xl md:text-4xl font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Sederhana dan transparan
              </h2>
            </div>

            <div className="grid max-w-3xl grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={
                    plan.highlight
                      ? "relative rounded-xl bg-[#8C2F39] p-8 text-[#F2EAD3] shadow-2xl md:scale-105"
                      : "rounded-xl border border-[#17233D]/10 bg-white p-8 shadow-sm"
                  }
                >
                  {plan.highlight && (
                    <div className="absolute right-4 top-4 rounded-full bg-[#A9822E] px-3 py-1 text-[10px] font-bold uppercase text-[#17233D]">
                      Populer
                    </div>
                  )}
                  <div
                    className={
                      plan.highlight
                        ? "text-sm font-semibold uppercase tracking-wide text-[#F2EAD3]/70"
                        : "text-sm font-semibold uppercase tracking-wide text-[#17233D]/60"
                    }
                  >
                    {plan.name}
                  </div>
                  <div className={plan.highlight ? "mt-2 text-4xl font-bold" : "mt-2 text-4xl font-bold text-[#17233D]"}>
                    {plan.price}
                  </div>
                  <ul className="mt-6 flex flex-col gap-3">
                    {plan.perks.map((perk) => (
                      <li
                        key={perk}
                        className={
                          plan.highlight
                            ? "flex items-center gap-2 text-sm text-[#F2EAD3]/90"
                            : "flex items-center gap-2 text-sm text-[#17233D]/80"
                        }
                      >
                        <Check className="size-4 text-[#A9822E]" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={
                      plan.highlight
                        ? "mt-6 inline-block w-full rounded-full bg-[#F2EAD3] px-5 py-2.5 text-center text-sm font-semibold text-[#8C2F39] hover:bg-white transition-colors"
                        : "mt-6 inline-block w-full rounded-full border border-[#17233D]/20 px-5 py-2.5 text-center text-sm font-semibold text-[#17233D] hover:bg-[#17233D]/[0.04] transition-colors"
                    }
                  >
                    {plan.highlight ? "Pilih Premium" : "Mulai Gratis"}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-y border-[#17233D]/10 bg-[#FCFAF2] py-20">
          <div className="max-w-[1140px] mx-auto px-6 md:px-12">
            <div className="max-w-xl mb-14">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[#A9822E]">
                FAQ
              </div>
              <h2
                className="mt-3 text-3xl md:text-4xl font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Pertanyaan yang sering diajukan
              </h2>
              <p className="mt-4 text-[#17233D]/70">Punya pertanyaan lain? Kami siap membantu.</p>
            </div>

            <dl className="grid max-w-4xl grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {faqs.map((item, i) => (
                <div
                  key={item.q}
                  className={
                    i < faqs.length - 2
                      ? "flex items-start justify-between gap-4 border-b border-[#17233D]/10 pb-6"
                      : "flex items-start justify-between gap-4 pb-6"
                  }
                >
                  <div>
                    <dt className="font-semibold text-[#17233D]">{item.q}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-[#17233D]/70">{item.a}</dd>
                  </div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#A9822E] text-[#A9822E]">
                    <Plus className="size-4" />
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Blog */}
        <section id="blog-preview" className="py-20">
          <div className="max-w-[1140px] mx-auto px-6 md:px-12">
            <div className="max-w-xl mb-14">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[#A9822E]">
                Blog
              </div>
              <h2
                className="mt-3 text-3xl md:text-4xl font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Dari blog kami
              </h2>
              <p className="mt-4 text-[#17233D]/70">
                Baca tips dan panduan terbaru seputar dunia sertifikat.
              </p>
            </div>

            <div className="grid max-w-4xl grid-cols-1 md:grid-cols-2 gap-8">
              {posts.map((post) => (
                <Link
                  key={post.href}
                  href={post.href}
                  className="rounded-xl border border-[#17233D]/10 bg-white p-7 shadow-sm hover:border-[#A9822E] transition-colors"
                >
                  <div className="inline-flex w-fit rounded-full border border-[#A9822E]/40 bg-[#F2EAD3] px-3 py-1 text-xs font-semibold text-[#A9822E]">
                    {post.tag}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-[#17233D]">{post.title}</h3>
                  <p className="mt-2 text-sm text-[#17233D]/70">{post.excerpt}</p>
                  <span className="mt-4 inline-block text-sm font-bold text-[#8C2F39]">
                    Baca selengkapnya →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden border-y-2 border-[#A9822E]/50 bg-[#17233D] py-20 text-[#F2EAD3]">
          <div
            className="absolute left-1/2 top-1/2 h-64 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#A9822E]/25 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative max-w-[1140px] mx-auto px-6 md:px-12 text-center">
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Siap mengubah cara Anda membuat sertifikat?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[#F2EAD3]/70">
              Daftar sekarang dan rasakan kemudahan manajemen sertifikat di
              ujung jari Anda. Gratis untuk memulai.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-block rounded-full bg-[#F2EAD3] px-7 py-3.5 text-base font-bold text-[#17233D] shadow-lg hover:bg-white transition-colors"
            >
              Coba SertiGen Sekarang
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#17233D]/10 bg-[#F2EAD3]">
        <div className="max-w-[1140px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 px-6 md:px-12 py-12">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-[#A9822E] text-xs font-bold text-[#A9822E]">
                SG
              </span>
              <span
                className="text-xl font-bold text-[#17233D] tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                SertiGen
              </span>
            </div>
            <p className="mt-4 text-sm text-[#17233D]/60">
              Generator sertifikat otomatis untuk webinar dan acara.
            </p>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-[#17233D]">Produk</div>
            <ul className="mt-4 flex flex-col gap-2 text-sm text-[#17233D]/70">
              <li><Link href="/#features" className="hover:text-[#8C2F39] transition-colors">Fitur</Link></li>
              <li><Link href="/#pricing" className="hover:text-[#8C2F39] transition-colors">Harga</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-[#8C2F39] transition-colors">Cara Kerja</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-[#17233D]">Perusahaan</div>
            <ul className="mt-4 flex flex-col gap-2 text-sm text-[#17233D]/70">
              <li><Link href="/blog" className="hover:text-[#8C2F39] transition-colors">Blog</Link></li>
              <li><Link href="/tentang" className="hover:text-[#8C2F39] transition-colors">Tentang</Link></li>
              <li><Link href="/kontak" className="hover:text-[#8C2F39] transition-colors">Kontak</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold text-[#17233D]">
              Dapatkan tips seputar sertifikat
            </div>
            <form className="mt-4 flex gap-2">
              <label htmlFor="newsletter-email" className="sr-only">
                Alamat email
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                placeholder="Email Anda"
                className="w-full rounded-md border border-[#17233D]/20 bg-white px-3 py-2 text-sm text-[#17233D] placeholder:text-[#17233D]/40 focus:outline-none focus:ring-2 focus:ring-[#A9822E]"
              />
              <button
                type="submit"
                className="shrink-0 rounded-md bg-[#8C2F39] px-4 py-2 text-sm font-semibold text-[#F2EAD3] hover:bg-[#742531] transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-[#17233D]/10">
          <div className="max-w-[1140px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 px-6 md:px-12 py-6">
            <span className="text-sm text-[#17233D]/55">
              © {new Date().getFullYear()} SertiGen. Hak cipta dilindungi.
            </span>
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#A9822E] text-[#A9822E] hover:bg-[#A9822E]/10 transition-colors"
                >
                  <s.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
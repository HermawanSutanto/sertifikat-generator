"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Fraunces, Public_Sans } from "next/font/google";
import {
  ArrowRight,
  Award,
  Check,
  Mail,
  Medal,
  MessageCircle,
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

// CATATAN: metadata (title/description/OG/dsb) tidak bisa lagi diekspor dari
// file ini karena sekarang jadi Client Component (perlu useState untuk FAQ
// accordion & form newsletter yang fungsional). Pindahkan blok `metadata`
// yang sebelumnya ada di sini ke layout.tsx/layout.jsx terdekat, atau buat
// page.jsx ini jadi server component pembungkus yang meng-import komponen
// client terpisah (mis. `<LandingPageClient />`) supaya metadata tetap bisa
// diekspor di level page/layout.

const faqs = [
  {
    q: "Apakah SertiGen gratis?",
    a: "Iya, 100% gratis buat sekarang — belum ada paket berbayar. Kamu bisa generate sampai 50 sertifikat per hari, dan kuotanya reset otomatis tiap hari (bukan jatah sekali habis).",
  },
  {
    q: "Format file apa yang didukung?",
    a: "Template sertifikat bisa kamu upload dalam format JPG atau PNG. Hasil akhirnya di-export dalam format JPEG resolusi tinggi — tajam buat dicetak maupun dibagikan digital.",
  },
  {
    q: "Berapa banyak sertifikat yang bisa saya buat?",
    a: "Sampai 50 sertifikat per hari, gratis, dan kuotanya balik lagi tiap hari otomatis. SertiGen masih terus dikembangkan — kalau ada paket dengan kuota lebih besar ke depannya, bakal kami umumin di sini duluan.",
  },
  {
    q: "Apakah data saya aman?",
    a: "Ya. Daftar nama yang Anda unggah hanya digunakan untuk proses pembuatan sertifikat dan tidak akan dibagikan ke pihak lain.",
  },
];

// Structured data untuk FAQ rich-snippet. Pindahkan <script> ini ke server
// component (mis. layout) kalau page ini dijadikan client component, karena
// dangerouslySetInnerHTML tetap boleh di client tapi idealnya JSON-LD statis
// dirender dari server.
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
    desc: "Export JPEG resolusi tinggi — detailnya tetap tajam, nggak pecah, siap dibagikan digital.",
    icon: Medal,
  },
  {
    title: "Siap Cetak & Digital",
    desc: "File JPEG tajam pas dicetak, dan ukurannya ringan buat dibagikan online.",
    icon: Printer,
  },
];

// Framing jujur "produk baru" karena belum ada user/testimoni asli.
// Jangan tambahkan lagi avatar/angka/kutipan buatan di section manapun —
// begitu ada user & testimoni asli, ganti section ini dengan yang riil.
const earlyPerks = [
  {
    title: "Baru rilis, masih anget",
    desc: "SertiGen baru aja diluncurkan. Belum ada testimoni bombastis di sini — yang ada cuma produk yang beneran kami pakai sendiri buat nyelesain masalah generate sertifikat manual yang ribet.",
    icon: Award,
  },
  {
    title: "Feedback kamu didengar langsung",
    desc: "Jadi early user artinya suara kamu paling kenceng. Nemu bug atau ada fitur yang kamu pengen? Langsung reach out, biasanya direspon cepat.",
    icon: MessageCircle,
  },
  {
    title: "Terus di-update",
    desc: "Kita masih aktif development — perbaikan kualitas render, fitur kustomisasi baru, dan lainnya bakal terus nambah dari waktu ke waktu.",
    icon: SlidersHorizontal,
  },
];

const steps = [
  { step: "01", title: "Unggah Template", desc: "Gunakan desain sertifikat Anda dalam format JPG atau PNG." },
  { step: "02", title: "Masukkan Nama", desc: "Salin-tempel daftar nama, lalu sesuaikan posisi dan gaya teks." },
  { step: "03", title: "Generate & Unduh", desc: "Klik \u201cGenerate\u201d dan semua sertifikat siap diunduh." },
];

// Sistem pembayaran belum diimplementasikan di backend, jadi jangan pasang
// harga/plan berbayar di sini sampai benar-benar siap.
const freePerks = [
  "50 sertifikat gratis per hari",
  "Kuota reset otomatis tiap hari",
  "Semua fitur kustomisasi bisa dipakai",
  "Export JPEG resolusi tinggi",
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

function NewsletterForm() {
  // TODO: sambungkan ke endpoint/list provider (mis. Resend, Mailchimp, atau
  // API internal) sebelum publish. Sampai itu ada, form ini jujur bilang
  // belum aktif, bukan pura-pura submit ke mana-mana (R-26).
  return (
    <div className="mt-4">
      <label htmlFor="newsletter-email" className="sr-only">
        Alamat email
      </label>
      <div className="flex gap-2">
        <input
          id="newsletter-email"
          type="email"
          disabled
          placeholder="email@kamu.com"
          className="w-full cursor-not-allowed rounded-md border border-[#17233D]/20 bg-white px-3 py-2 text-sm text-[#17233D] placeholder:text-[#17233D]/40"
        />
        <button
          type="button"
          disabled
          className="shrink-0 cursor-not-allowed rounded-md bg-[#8C2F39]/50 px-4 py-2 text-sm font-semibold text-[#F2EAD3]"
        >
          Segera hadir
        </button>
      </div>
      <p className="mt-2 text-xs text-[#17233D]/50">
        Newsletter belum aktif. Untuk sekarang, hubungi kami langsung lewat kontak di footer.
      </p>
    </div>
  );
}

function FaqItem({ q, a }) {
  return (
    <details className="group border-b border-[#17233D]/10 pb-6 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
        <span className="font-semibold text-[#17233D]">{q}</span>
        <span
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-lg font-bold text-[#A9822E] transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <p className="mt-2 text-sm leading-relaxed text-[#17233D]/70">{a}</p>
    </details>
  );
}

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
            <img src="/logo.svg" alt="Logo SertiGen" style={{ maxWidth: "40pt" }} className="site-logo" />
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
              Akses
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
              <h1
                className="text-4xl md:text-[3.4rem] leading-[1.08] font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Ratusan sertifikat, <em className="italic text-[#8C2F39]">satu template</em>, lima menit.
              </h1>

              <p className="mt-6 max-w-md text-lg leading-relaxed text-[#17233D]/70">
                Udahan capek input data manual satu-satu. Upload template
                kamu, tempel daftar nama, biarin SertiGen yang cetakin
                sertifikat rapi — otomatis, nggak pakai ribet.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-[#8C2F39] px-7 py-3.5 text-base font-semibold text-[#F2EAD3] shadow-lg hover:bg-[#742531] transition-colors"
                >
                  Coba Gratis, Gas!
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/#how-it-works"
                  className="rounded-full px-7 py-3.5 text-base font-semibold text-[#17233D] hover:bg-[#17233D]/[0.06] transition-colors"
                >
                  Lihat Cara Kerja
                </Link>
              </div>

              <p className="mt-6 text-sm text-[#17233D]/60">
                Baru rilis · Gratis 50 sertifikat/hari, reset otomatis tiap hari · Tanpa kartu kredit
              </p>
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

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Fitur unggulan: satu blok besar, bukan kartu seragam */}
              <div className="lg:col-span-2 rounded-2xl bg-[#17233D] p-8 text-[#F2EAD3] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border border-[#A9822E] text-[#A9822E]">
                    <Target className="size-6" />
                  </div>
                  <h3
                    className="mt-6 text-2xl font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {features[0].title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#F2EAD3]/75">
                    {features[0].desc}
                  </p>
                </div>
                <div className="mt-8 h-px w-full bg-[#F2EAD3]/15" />
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#A9822E]">
                  Alasan utama orang pindah dari cara manual
                </p>
              </div>

              {/* Fitur pendukung: list ringkas, bukan kartu terpisah */}
              <div className="lg:col-span-3 divide-y divide-[#17233D]/10 rounded-2xl bg-white shadow-sm">
                {features.slice(1).map((item) => (
                  <div key={item.title} className="flex items-start gap-4 p-6">
                    <div className="flex shrink-0 items-center justify-center w-10 h-10 rounded-full border border-[#A9822E] text-[#A9822E]">
                      <item.icon className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#17233D]">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-[#17233D]/70">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Kenapa SertiGen dibuat */}
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
                &ldquo;Kami capek generate sertifikat manual satu-satu, jadi kami bikin SertiGen.&rdquo;
              </blockquote>
              <p className="mt-4 text-sm font-medium text-[#17233D]/70">
                Kenapa SertiGen ada
              </p>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-[#17233D]/70">
                Nggak ada testimoni bombastis di sini — soalnya SertiGen
                literally baru aja rilis. Yang ada cuma tool yang beneran
                kami butuhin sendiri, sekarang kami buka buat siapa aja yang
                punya masalah sama: ratusan nama, satu template, dan waktu
                yang mepet.
              </p>
            </div>
          </div>
        </section>

        {/* Kenapa coba sekarang */}
        <section id="testimonials" className="py-20">
          <div className="max-w-[1140px] mx-auto px-6 md:px-12">
            <div className="max-w-xl mb-14">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[#A9822E]">
                Status
              </div>
              <h2
                className="mt-3 text-3xl md:text-4xl font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Belum rame, tapi justru itu untungnya buat kamu
              </h2>
              <p className="mt-4 text-[#17233D]/70">
                Jujur aja — ini masih early. Nggak ada ribuan testimoni buat
                dipajang. Tapi ini yang kamu dapetin dengan gabung sekarang.
              </p>
            </div>

            <div className="max-w-3xl divide-y divide-[#17233D]/10 border-y border-[#17233D]/10">
              {earlyPerks.map((item) => (
                <div key={item.title} className="flex flex-col gap-2 py-6 sm:flex-row sm:items-start sm:gap-6">
                  <div className="flex shrink-0 items-center gap-3 sm:w-56">
                    <item.icon className="size-5 text-[#A9822E]" aria-hidden="true" />
                    <h3 className="font-semibold text-[#17233D]">{item.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-[#17233D]/70">{item.desc}</p>
                </div>
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

            <ol className="max-w-2xl">
              {steps.map((s, i) => (
                <li
                  key={s.step}
                  className={`flex items-baseline gap-6 border-b border-[#17233D]/10 py-8 last:border-b-0 ${
                    i % 2 === 1 ? "flex-row-reverse text-right" : ""
                  }`}
                >
                  <span
                    className="shrink-0 text-5xl font-bold text-[#A9822E]/40"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {s.step}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-[#17233D]">{s.title}</h3>
                    <p className="mt-2 text-sm text-[#17233D]/70">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Akses */}
        <section id="pricing" className="py-20">
          <div className="max-w-[1140px] mx-auto px-6 md:px-12">
            <div className="max-w-xl mb-14">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[#A9822E]">
                Akses
              </div>
              <h2
                className="mt-3 text-3xl md:text-4xl font-bold text-[#17233D]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Gratis buat semua, nggak pakai drama
              </h2>
              <p className="mt-4 text-[#17233D]/70">
                Masih tahap awal, jadi belum ada paket berbayar. Semua fitur
                inti bisa kamu pakai sekarang, gratis.
              </p>
            </div>

            <div className="grid max-w-3xl grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              <div className="relative rounded-xl bg-[#8C2F39] p-8 text-[#F2EAD3] shadow-2xl">
                <div className="absolute right-4 top-4 rounded-full bg-[#A9822E] px-3 py-1 text-[10px] font-bold uppercase text-[#17233D]">
                  Aktif Sekarang
                </div>
                <div className="text-sm font-semibold uppercase tracking-wide text-[#F2EAD3]/70">
                  Gratis
                </div>
                <div className="mt-2 text-4xl font-bold">Rp0</div>
                <ul className="mt-6 flex flex-col gap-3">
                  {freePerks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm text-[#F2EAD3]/90">
                      <Check className="size-4 text-[#A9822E]" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="mt-6 inline-block w-full rounded-full bg-[#F2EAD3] px-5 py-2.5 text-center text-sm font-semibold text-[#8C2F39] hover:bg-white transition-colors"
                >
                  Mulai Gratis
                </Link>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-dashed border-[#17233D]/25 bg-white p-8">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-[#17233D]/60">
                    Paket Lanjutan
                  </div>
                  <div className="mt-2 text-2xl font-bold text-[#17233D]">
                    Lagi disiapin
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-[#17233D]/70">
                    Kalau nanti ada kebutuhan kuota lebih gede atau fitur
                    tambahan, bakal kami rilis di sini duluan — belum ada
                    harga atau tanggal pasti, jadi kami nggak mau janji-janji
                    dulu sebelum bener-bener siap.
                  </p>
                </div>
                <Link
                  href="/register"
                  className="mt-6 inline-block w-full rounded-full border border-[#17233D]/20 px-5 py-2.5 text-center text-sm font-semibold text-[#17233D] hover:bg-[#17233D]/[0.04] transition-colors"
                >
                  Pakai yang Gratis Dulu
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ — accordion asli, bukan ikon plus dekoratif */}
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

            <div className="grid max-w-4xl grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {faqs.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
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
                    Baca selengkapnya
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
              Udah siap ninggalin cara manual?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[#F2EAD3]/70">
              Gabung sekarang, jadi salah satu user pertama SertiGen. Gratis
              50 sertifikat per hari, reset otomatis tiap hari — nggak perlu
              kartu kredit.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-block rounded-full bg-[#F2EAD3] px-7 py-3.5 text-base font-bold text-[#17233D] shadow-lg hover:bg-white transition-colors"
            >
              Coba SertiGen, Gratis
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
              <li><Link href="/#pricing" className="hover:text-[#8C2F39] transition-colors">Akses</Link></li>
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
            <div className="text-sm font-semibold text-[#17233D] flex items-center gap-2">
              <Mail className="size-4 text-[#A9822E]" aria-hidden="true" />
              Dapatkan tips seputar sertifikat
            </div>
            <NewsletterForm />
          </div>
        </div>

        <div className="border-t border-[#17233D]/10">
          <div className="max-w-[1140px] mx-auto flex justify-center px-6 md:px-12 py-6">
            <span className="text-sm text-[#17233D]/55">
              © {new Date().getFullYear()} SertiGen. Hak cipta dilindungi.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
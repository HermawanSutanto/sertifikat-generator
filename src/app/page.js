"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Archivo_Black, Inter, JetBrains_Mono } from "next/font/google";
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
import AuthNav from "./AuthNav";

// Substitusi font untuk mendekati PP Neue Corp Tight Ultrabold & PP Neue Montreal
const displayFont = Archivo_Black({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-mono",
});

const faqs = [
  {
    q: "Apakah SertiGen gratis?",
    a: "Iya, 100% gratis buat sekarang, belum ada paket berbayar. Kamu bisa generate sampai 50 sertifikat per hari, dan kuotanya reset otomatis tiap hari.",
  },
  {
    q: "Format file apa yang didukung?",
    a: "Template sertifikat bisa kamu upload dalam format JPG atau PNG. Hasil akhirnya di-export dalam format JPEG resolusi tinggi, tajam untuk dicetak maupun dibagikan digital.",
  },
  {
    q: "Berapa banyak sertifikat yang bisa saya buat?",
    a: "Sampai 50 sertifikat per hari secara gratis, dan kuotanya kembali terisi otomatis setiap hari. SertiGen masih terus dikembangkan.",
  },
  {
    q: "Apakah data saya aman?",
    a: "Ya. Daftar nama yang Anda unggah hanya digunakan untuk proses pembuatan sertifikat dan tidak akan dibagikan ke pihak lain.",
  },
];

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
    desc: "Export JPEG resolusi tinggi, detailnya tetap tajam dan siap dibagikan digital.",
    icon: Medal,
  },
  {
    title: "Siap Cetak & Digital",
    desc: "File JPEG tajam saat dicetak dan ukurannya ringan untuk dibagikan online.",
    icon: Printer,
  },
];

const earlyPerks = [
  {
    title: "Baru rilis",
    desc: "SertiGen baru saja diluncurkan. Tidak ada testimoni bombastis di sini, yang ada hanya produk yang kami pakai sendiri untuk menyelesaikan masalah generate sertifikat manual.",
    icon: Award,
  },
  {
    title: "Umpan balik didengar langsung",
    desc: "Menjadi early user berarti suara Anda paling didengar. Menemukan bug atau butuh fitur baru? Langsung hubungi kami.",
    icon: MessageCircle,
  },
  {
    title: "Terus diperbarui",
    desc: "Kami masih aktif melakukan pengembangan. Perbaikan kualitas render dan fitur kustomisasi baru akan terus bertambah.",
    icon: SlidersHorizontal,
  },
];

const steps = [
  { step: "01", title: "Unggah Template", desc: "Gunakan desain sertifikat Anda dalam format JPG atau PNG." },
  { step: "02", title: "Masukkan Nama", desc: "Salin-tempel daftar nama, lalu sesuaikan posisi dan gaya teks." },
  { step: "03", title: "Generate & Unduh", desc: "Klik \u201cGenerate\u201d dan semua sertifikat siap diunduh." },
];

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
    title: "10 Font Terbaik untuk Desain Sertifikat Resmi",
    excerpt: "Memilih font yang tepat adalah kunci untuk desain sertifikat yang terlihat profesional.",
  },
  {
    href: "/blog/cara-membuat-sertifikat-webinar",
    tag: "Panduan",
    title: "5 Langkah Mudah Membuat Sertifikat Webinar",
    excerpt: "Saatnya memberikan apresiasi kepada peserta webinar Anda dengan sertifikat yang rapi.",
  },
];

function NewsletterForm() {
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
          className="w-full cursor-not-allowed rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2 text-[14px] text-[#111111] placeholder:text-[#555555]"
        />
        <button
          type="button"
          disabled
          className="shrink-0 cursor-not-allowed rounded-[4px] bg-[#EBE9E4] px-4 py-2 text-[14px] font-semibold text-[#555555] border border-[#E5E7EB]"
        >
          Segera hadir
        </button>
      </div>
      <p className="mt-2 text-[12px] text-[#555555] font-mono">
        // Fitur newsletter sedang dalam pengembangan.
      </p>
    </div>
  );
}

function FaqItem({ q, a }) {
  return (
    <details className="group border-t border-[#111111] py-6 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE] focus-visible:ring-offset-4 focus-visible:ring-offset-[#EBE9E4]">
        <span className="text-[28px] font-medium leading-tight text-[#111111]">{q}</span>
        <span
          aria-hidden="true"
          className="mt-1 shrink-0 text-2xl font-bold text-[#0000EE] transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <p className="mt-6 text-[18px] leading-[28px] text-[#555555] max-w-2xl">{a}</p>
    </details>
  );
}

export default function LandingPage() {
  return (
    <div
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} bg-[#EBE9E4] text-[#111111] w-full min-h-screen selection:bg-[#0000EE] selection:text-white`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:bg-[#0000EE] focus:text-white focus:px-4 focus:py-2 focus:rounded-[4px] focus:outline-none"
      >
        Lewati ke konten
      </a>

      {/* Header - Flat, Minimal Chrome */}
      <header className="sticky top-0 z-50 bg-[#EBE9E4] border-b border-[#E5E7EB]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-4 flex justify-between items-center">
          <Link 
            href="/" 
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE] focus-visible:ring-offset-4 focus-visible:ring-offset-[#EBE9E4]"
          >
            <span
              className="text-2xl font-bold text-[#111111] tracking-tight uppercase"
              style={{ fontFamily: "var(--font-display)" }}
            >
              SertiGen.
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[14px] font-semibold tracking-[0.02em] text-[#555555]">
            <Link href="/#features" className="hover:text-[#0000EE] transition-colors focus-visible:outline-none focus-visible:text-[#0000EE]">
              FITUR
            </Link>
            <Link href="/#how-it-works" className="hover:text-[#0000EE] transition-colors focus-visible:outline-none focus-visible:text-[#0000EE]">
              ALUR KERJA
            </Link>
            <Link href="/#pricing" className="hover:text-[#0000EE] transition-colors focus-visible:outline-none focus-visible:text-[#0000EE]">
              AKSES
            </Link>
            <Link href="/blog" className="hover:text-[#0000EE] transition-colors focus-visible:outline-none focus-visible:text-[#0000EE]">
              BLOG
            </Link>
          </nav>

          <Suspense fallback={<div className="h-11 w-[100px]" aria-hidden="true" />}>
            <AuthNav />
          </Suspense>
        </div>
      </header>

      <main id="konten-utama">
        {/* Hero - Oversized Typography */}
        <section className="pt-[100px] pb-[100px] md:pt-[128px] md:pb-[128px]">
          <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-8">
              <h1
                className="text-[53px] md:text-[100px] leading-[1.1] font-bold text-[#111111] uppercase"
                style={{ fontFamily: "var(--font-display)" }}
              >
                RATUSAN SERTIFIKAT. SATU TEMPLATE. LIMA MENIT.
              </h1>

              <p className="mt-8 max-w-2xl text-[28px] leading-[42px] text-[#555555] font-medium">
                Hentikan input data manual satu per satu. Unggah template, tempel daftar nama, biarkan sistem yang memprosesnya. Cepat dan presisi.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-[4px] bg-[#111111] px-6 py-3 min-h-[44px] text-[14px] font-semibold tracking-[0.02em] text-[#FFFFFF] hover:bg-[#0000EE] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE] focus-visible:ring-offset-4 focus-visible:ring-offset-[#EBE9E4] uppercase"
                >
                  Mulai Akses
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/#how-it-works"
                  className="inline-flex items-center gap-2 rounded-[4px] bg-transparent border border-[#555555] px-6 py-3 min-h-[44px] text-[14px] font-semibold tracking-[0.02em] text-[#555555] hover:text-[#111111] hover:border-[#111111] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE] focus-visible:ring-offset-4 focus-visible:ring-offset-[#EBE9E4] uppercase"
                >
                  Lihat Alur Kerja
                </Link>
              </div>
            </div>

            {/* Flat Editorial Graphic replacing bubbly mockup */}
            <div className="lg:col-span-4 lg:mt-[32px]">
              <div className="w-full aspect-[4/3] bg-[#FFFFFF] border-2 border-[#111111] flex flex-col p-6 justify-between">
                <div className="flex justify-between items-start border-b-2 border-[#111111] pb-4">
                  <span className="font-mono text-[12px] uppercase text-[#111111]">No. 001/26</span>
                  <Award className="size-6 text-[#111111]" />
                </div>
                <div className="space-y-4 my-8">
                  <div className="h-[2px] w-full bg-[#111111]" />
                  <div className="h-[2px] w-3/4 bg-[#111111]" />
                  <div className="h-[2px] w-1/2 bg-[#555555]" />
                </div>
                <div className="font-mono text-[12px] uppercase text-[#0000EE] flex justify-end">
                  [ PROSES SELESAI ]
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fitur - Flat Cards */}
        <section id="features" className="py-[100px] border-t border-[#111111]">
          <div className="max-w-[1440px] mx-auto px-6 md:px-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-[100px]">
              <h2
                className="text-[53px] leading-[64px] font-bold text-[#111111] uppercase max-w-2xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                DIRANCANG UNTUK EFISIENSI KERJA.
              </h2>
              <span className="font-mono text-[12px] uppercase text-[#555555] tracking-tight">
                [ SPESIFIKASI FITUR ]
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((item) => (
                <div key={item.title} className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-8 flex flex-col gap-6">
                  <item.icon className="size-8 text-[#0000EE]" />
                  <div>
                    <h3 className="text-[18px] font-semibold text-[#111111] mb-2">{item.title}</h3>
                    <p className="text-[16px] leading-[24px] text-[#555555]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Kenapa Coba Sekarang - Editorial text layout */}
        <section id="status" className="py-[100px] border-t border-[#111111]">
          <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <h2
                className="text-[53px] leading-[64px] font-bold text-[#111111] uppercase"
                style={{ fontFamily: "var(--font-display)" }}
              >
                PRODUK TAHAP AWAL.
              </h2>
              <p className="mt-6 text-[28px] leading-[42px] text-[#555555]">
                Jujur saja, ini masih awal. Tidak ada ribuan testimoni untuk dipajang. Namun ini yang Anda dapatkan jika bergabung sekarang.
              </p>
            </div>

            <div className="lg:col-span-6 lg:col-start-7 flex flex-col gap-8">
              {earlyPerks.map((item, i) => (
                <div key={item.title} className="border-t border-[#E5E7EB] pt-8 flex gap-6">
                  <span className="font-mono text-[14px] text-[#0000EE]">0{i + 1}</span>
                  <div>
                    <h3 className="text-[18px] font-semibold text-[#111111] mb-2">{item.title}</h3>
                    <p className="text-[16px] leading-[24px] text-[#555555]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cara Kerja - Stark Rhythm */}
        <section id="how-it-works" className="py-[100px] border-t border-[#111111] bg-[#111111] text-[#EBE9E4]">
          <div className="max-w-[1440px] mx-auto px-6 md:px-12">
            <h2
              className="text-[53px] md:text-[73px] leading-[80px] font-bold uppercase mb-[100px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ALUR PROSES.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-[#555555]">
              {steps.map((s) => (
                <div key={s.step} className="pt-8 flex flex-col gap-6">
                  <span 
                    className="text-[73px] font-bold text-[#555555]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {s.step}
                  </span>
                  <div>
                    <h3 className="text-[28px] font-medium text-[#EBE9E4] mb-3">{s.title}</h3>
                    <p className="text-[16px] leading-[24px] text-[#EBE9E4]/70">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Akses - Flat Comparison */}
        <section id="pricing" className="py-[100px]">
          <div className="max-w-[1440px] mx-auto px-6 md:px-12">
            <h2
              className="text-[53px] leading-[64px] font-bold text-[#111111] uppercase mb-[100px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              AKSES TERBUKA.
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Gratis Panel */}
              <div className="bg-[#111111] text-[#EBE9E4] border border-[#111111] rounded-[8px] p-10 flex flex-col justify-between min-h-[400px]">
                <div>
                  <div className="flex justify-between items-start mb-10">
                    <span className="font-mono text-[12px] uppercase tracking-wide">Fase Terbuka</span>
                    <span className="bg-[#0000EE] text-[#FFFFFF] rounded-[9999px] px-3 py-1 text-[12px] font-semibold uppercase">Aktif</span>
                  </div>
                  <div className="text-[73px] font-bold leading-none mb-8" style={{ fontFamily: "var(--font-display)" }}>Rp0</div>
                  <ul className="flex flex-col gap-4">
                    {freePerks.map((perk) => (
                      <li key={perk} className="flex items-center gap-3 text-[16px]">
                        <Check className="size-5 text-[#0000EE]" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/register"
                  className="mt-12 w-fit inline-flex items-center gap-2 rounded-[4px] bg-[#0000EE] px-6 py-3 text-[14px] font-semibold tracking-[0.02em] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#111111] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE] focus-visible:ring-offset-4 focus-visible:ring-offset-[#111111] uppercase"
                >
                  Mulai Otomatisasi
                </Link>
              </div>

              {/* Lanjutan Panel */}
              <div className="bg-[#FFFFFF] text-[#111111] border border-[#E5E7EB] rounded-[8px] p-10 flex flex-col justify-between min-h-[400px]">
                <div>
                  <div className="font-mono text-[12px] uppercase tracking-wide text-[#555555] mb-10">
                    Pembaruan Mendatang
                  </div>
                  <div className="text-[53px] font-bold leading-none mb-8" style={{ fontFamily: "var(--font-display)" }}>
                    DIKEMBANGKAN
                  </div>
                  <p className="text-[18px] leading-[28px] text-[#555555]">
                    Jika nanti ada kebutuhan volume lebih besar atau fitur korporat, kami akan merilisnya di sini. Kami belum berjanji sebelum sistem benar-benar stabil.
                  </p>
                </div>
                <Link
                  href="/register"
                  className="mt-12 w-fit inline-flex items-center gap-2 rounded-[4px] bg-transparent border border-[#555555] px-6 py-3 text-[14px] font-semibold tracking-[0.02em] text-[#555555] hover:text-[#111111] hover:border-[#111111] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FFFFFF] uppercase"
                >
                  Gunakan Akses Gratis
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ - Editorial Accordion */}
        <section id="faq" className="py-[100px] border-t border-[#111111]">
          <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <h2
                className="text-[53px] leading-[64px] font-bold text-[#111111] uppercase sticky top-24"
                style={{ fontFamily: "var(--font-display)" }}
              >
                F.A.Q.
              </h2>
            </div>
            <div className="lg:col-span-8 flex flex-col border-b border-[#111111]">
              {faqs.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* Blog - Minimal Cards */}
        <section id="blog-preview" className="py-[100px] border-t border-[#111111]">
          <div className="max-w-[1440px] mx-auto px-6 md:px-12">
            <h2
              className="text-[53px] leading-[64px] font-bold text-[#111111] uppercase mb-[100px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              JURNAL.
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {posts.map((post) => (
                <Link
                  key={post.href}
                  href={post.href}
                  className="group flex flex-col border border-[#E5E7EB] bg-[#FFFFFF] rounded-[8px] p-8 hover:border-[#111111] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE]"
                >
                  <div className="mb-6 font-mono text-[12px] uppercase tracking-wide text-[#0000EE]">
                    [ {post.tag} ]
                  </div>
                  <h3 className="text-[28px] leading-[42px] font-medium text-[#111111] mb-4">
                    {post.title}
                  </h3>
                  <p className="text-[16px] leading-[24px] text-[#555555] mb-8">
                    {post.excerpt}
                  </p>
                  <span className="mt-auto font-semibold text-[14px] uppercase tracking-wide text-[#111111] group-hover:text-[#0000EE] flex items-center gap-2">
                    Membaca Artikel <ArrowRight className="size-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Solid & Sharp */}
      <footer className="bg-[#111111] text-[#EBE9E4] pt-[100px] pb-[32px]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-[#555555] pb-[100px]">
          <div className="md:col-span-2">
            <span
              className="text-[53px] font-bold text-[#EBE9E4] tracking-tight uppercase leading-none block mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              SERTIGEN.
            </span>
            <p className="text-[18px] text-[#EBE9E4]/70 max-w-sm">
              Generator sertifikat otomatis. Solusi presisi untuk volume tinggi.
            </p>
          </div>

          <div>
            <div className="text-[14px] font-bold uppercase tracking-[0.02em] text-[#FFFFFF] mb-6">Navigasi Utama</div>
            <ul className="flex flex-col gap-4 text-[16px] text-[#EBE9E4]/70">
              <li><Link href="/#features" className="hover:text-[#0000EE] transition-colors focus-visible:outline-none focus-visible:text-[#0000EE]">Fitur Fungsional</Link></li>
              <li><Link href="/#pricing" className="hover:text-[#0000EE] transition-colors focus-visible:outline-none focus-visible:text-[#0000EE]">Akses Platform</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-[#0000EE] transition-colors focus-visible:outline-none focus-visible:text-[#0000EE]">Alur Proses</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-[14px] font-bold uppercase tracking-[0.02em] text-[#FFFFFF] mb-6">Pembaruan</div>
            <p className="text-[14px] text-[#EBE9E4]/70 mb-4">Menerima log teknis dan artikel panduan.</p>
            <NewsletterForm />
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center px-6 md:px-12 mt-8 font-mono text-[12px] text-[#EBE9E4]/50">
          <span>© {new Date().getFullYear()} SERTIGEN SYSTEM</span>
          <span>ALL RIGHTS RESERVED</span>
        </div>
      </footer>
    </div>
  );
}
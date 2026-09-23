"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Archivo_Black, Inter, JetBrains_Mono } from "next/font/google";
import {
  ArrowRight,
  Award,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Layers,
  Monitor,
  Printer,
  RefreshCw,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from "lucide-react";
import AuthNav from "./AuthNav";

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
  weight: ["400", "500"],
  variable: "--font-mono",
});

const faqs = [
  {
    q: "Apakah SertiGen benar-benar gratis?",
    a: "Ya, 100% gratis untuk saat ini karena belum ada paket berbayar yang dibuka. Anda bisa membuat hingga 50 sertifikat per hari, dan kuota akan otomatis terisi kembali setiap 24 jam.",
  },
  {
    q: "Format berkas apa yang didukung untuk template?",
    a: "Template dapat diunggah dalam format PNG atau JPG resolusi tinggi. Hasil generasi akan diekspor dalam format JPEG berkualitas cetak tajam.",
  },
  {
    q: "Bagaimana cara memasukkan puluhan hingga ratusan nama?",
    a: "Cukup salin satu kolom daftar nama langsung dari Microsoft Excel atau Google Sheets, lalu tempel ke dalam kotak isian. Sistem akan otomatis memisahkan baris nama.",
  },
  {
    q: "Apakah daftar nama peserta yang diunggah disimpan di server?",
    a: "Tidak. Proses perenderan dilakukan langsung di peramban pengguna menggunakan teknologi Canvas HTML5, sehingga data nama tidak disimpan secara permanen di server kami.",
  },
  {
    q: "Bisa mengatur posisi dan warna teks nama?",
    a: "Bisa. Anda memiliki kendali penuh atas ukuran teks, perataan, jenis font, serta koordinat penempatan nama di atas lembar sertifikat.",
  },
];

const technicalSpecs = [
  { label: "Mesin Render", value: "Client-side HTML5 Canvas API", desc: "Pemrosesan lokal di peramban, aman dan cepat" },
  { label: "Format Template Masukan", value: "PNG, JPG (Maks. 10 MB)", desc: "Mendukung rasio aspek standar 16:9 dan A4 Landscape" },
  { label: "Format Berkas Keluaran", value: "JPEG Standar Arsip Cetak", desc: "Kerapatan 300 DPI siap cetak fisik maupun web" },
  { label: "Kapasitas Harian", value: "50 Sertifikat / 24 Jam", desc: "Reset otomatis setiap hari tanpa biaya tersembunyi" },
  { label: "Waktu Proses Rata-rata", value: "< 0.4 Detik per Berkas", desc: "Menggunakan thread rendering optimal peramban modern" },
];

const useCases = [
  {
    id: "webinar",
    badge: "EVENT DIGITAL",
    title: "Webinar & Seminar Online",
    desc: "Cepat buatkan bukti kehadiran bagi ratusan peserta yang mendaftar secara daring dalam satu klik.",
  },
  {
    id: "workshop",
    badge: "PELATIHAN",
    title: "Lokakarya & Pelatihan Mandiri",
    desc: "Sertifikat kompetensi dengan nomor seri berurutan untuk peserta kursus intensif Anda.",
  },
  {
    id: "academic",
    badge: "PENDIDIKAN",
    title: "Institusi Sekolah & Kampus",
    desc: "Piagam penghargaan kelulusan ekstrakurikuler, lomba internal, maupun ujian praktek.",
  },
  {
    id: "community",
    badge: "KOMUNITAS",
    title: "Komunitas Kreatif & Relawan",
    desc: "Beri apresiasi nyata kepada seluruh relawan yang telah mendedikasikan waktu mereka.",
  },
];

const journalPosts = [
  {
    tag: "TUTORIAL",
    date: "SEP 2026",
    title: "Panduan Memilih Resolusi Template Sertifikat Agar Tidak Pecah Saat Dicetak",
    desc: "Memahami perbedaan DPI layar dan cetak fisik agar garis tanda tangan serta teks tetap tajam.",
  },
  {
    tag: "TIPS TIPOGRAFI",
    date: "AGT 2026",
    title: "Kombinasi Font Formal yang Tepat untuk Piagam Kelulusan Resmi",
    desc: "Eksplorasi pasangan font serif klasik dan sans-serif kontemporer untuk estetika profesional.",
  },
];

export default function LandingPage() {
  const [sampleName, setSampleName] = useState("Alexander Pratama, M.Kom");
  const [fontSize, setFontSize] = useState(24);
  const [fontFamilyType, setFontFamilyType] = useState("font-serif");
  const [isGenerating, setIsGenerating] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const copySampleNames = () => {
    const list = "Alexander Pratama, M.Kom\nNadia Safitri, S.Ds\nBudi Santoso\nSiti Rahmawati, S.E\nDimas Anggara";
    navigator.clipboard.writeText(list);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const triggerSimulatedGeneration = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 1000);
  };

  return (
    <div
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} bg-[#EBE9E4] text-[#111111] min-h-screen selection:bg-[#0000EE] selection:text-white antialiased`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Aksesibilitas Keyboard */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[#0000EE] focus:text-white focus:px-4 focus:py-2 focus:rounded-[4px] focus:outline-none"
      >
        Lewati ke konten utama
      </a>

      {/* Top Banner Ticker */}
      <div className="bg-[#111111] text-[#EBE9E4] text-xs font-mono py-2.5 px-6 border-b border-[#333333]">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#0000EE]" />
            SERTIGEN RENDER SYSTEM: AKTIF (VERSI PUBLIC STABLE)
          </span>
          <div className="flex gap-6 text-[#EBE9E4]/60">
            <span>KUOTA: 50/HARI GRATIS</span>
            <span className="hidden md:inline">FORMAT: PNG/JPG KE HIGH-RES JPEG</span>
          </div>
        </div>
      </div>

      {/* Header Utama */}
      <header className="sticky top-0 z-40 bg-[#EBE9E4]/95 border-b border-[#111111] backdrop-blur-sm transition-all">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-20 flex justify-between items-center">
          <Link
            href="/"
            className="text-2xl font-bold uppercase tracking-tight text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SERTIGEN.
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-[13px] font-mono tracking-wider text-[#555555]">
            <a href="#simulator" className="hover:text-[#0000EE] transition-colors">
              [ 01. SIMULATOR ]
            </a>
            <a href="#specs" className="hover:text-[#0000EE] transition-colors">
              [ 02. SPESIFIKASI ]
            </a>
            <a href="#use-cases" className="hover:text-[#0000EE] transition-colors">
              [ 03. PENGGUNAAN ]
            </a>
            <a href="#workflow" className="hover:text-[#0000EE] transition-colors">
              [ 04. ALUR ]
            </a>
            <a href="#faq" className="hover:text-[#0000EE] transition-colors">
              [ 05. FAQ ]
            </a>
          </nav>

          <Suspense fallback={<div className="h-10 w-24 bg-[#E5E7EB] animate-pulse rounded-[4px]" />}>
            <AuthNav />
          </Suspense>
        </div>
      </header>

      <main id="main-content">
        {/* HERO SECTION: Poster Editorial + Live Simulator Studio */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28 px-6 md:px-12 border-b border-[#111111]">
          <div className="max-w-[1440px] mx-auto grid lg:grid-cols-12 gap-12 items-start">
            
            <div className="lg:col-span-7 flex flex-col">
              <div className="inline-flex items-center gap-2 mb-6 font-mono text-xs text-[#0000EE] uppercase">
                <Zap className="size-4" />
                <span>Mesin Generator Dokumen Otomatis</span>
              </div>

              <h1
                className="text-5xl sm:text-7xl lg:text-[92px] leading-[0.92] font-bold text-[#111111] uppercase tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                SATU TEMPLATE. RATUSAN NAMA. SIAP CETAK.
              </h1>

              <p className="mt-8 text-xl sm:text-2xl text-[#555555] max-w-xl leading-relaxed">
                Tinggalkan proses pengeditan manual satu per satu. Pasang template, masukkan daftar penerima, dan proses puluhan sertifikat dalam hitungan detik.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-3 bg-[#111111] text-[#FFFFFF] px-8 py-4 rounded-[4px] font-semibold text-sm tracking-wide uppercase hover:bg-[#0000EE] transition-all transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE]"
                >
                  Mulai Buat Sekarang
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <a
                  href="#specs"
                  className="inline-flex items-center gap-2 border border-[#111111] bg-transparent text-[#111111] px-6 py-4 rounded-[4px] font-semibold text-sm tracking-wide uppercase hover:bg-[#FFFFFF] transition-all"
                >
                  Lihat Spesifikasi Mesin
                </a>
              </div>

              {/* Data Summary Ringkas */}
              <div className="mt-16 pt-8 border-t border-[#111111] grid grid-cols-3 gap-6 font-mono">
                <div>
                  <div className="text-2xl font-bold text-[#111111]">50/HARI</div>
                  <div className="text-xs text-[#555555] uppercase mt-1">Kuota Gratis Penuh</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111111]">300 DPI</div>
                  <div className="text-xs text-[#555555] uppercase mt-1">Kualitas Berkas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#0000EE]">INSTAN</div>
                  <div className="text-xs text-[#555555] uppercase mt-1">Render di Peramban</div>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Studio Interaktif Simulator */}
            <div id="simulator" className="lg:col-span-5">
              <div className="bg-[#FFFFFF] border-2 border-[#111111] rounded-[8px] p-6 shadow-[10px_10px_0px_0px_#111111] transition-transform hover:-translate-y-1">
                <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4 mb-6 font-mono text-xs text-[#555555]">
                  <span>INTERACTIVE STAGING ENGINE</span>
                  <span className="text-[#0000EE] font-bold">[ LIVE PREVIEW ]</span>
                </div>

                {/* Sertifikat Simulative Kanvas */}
                <div className="bg-[#EBE9E4] border-2 border-[#111111] p-6 rounded-[4px] relative flex flex-col items-center justify-center text-center aspect-[16/10] overflow-hidden">
                  <div className="absolute top-3 left-3 flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#111111]" />
                    <span className="w-2 h-2 rounded-full bg-[#555555]" />
                  </div>
                  
                  <div className="uppercase font-mono text-[9px] tracking-widest text-[#555555] mb-2">
                    SERTIFIKAT PENGHARGAAN RESMI
                  </div>

                  {/* Render Nama Dinamis */}
                  <div
                    className={`${fontFamilyType} text-[#111111] my-3 transition-all duration-200 font-bold px-4 break-words max-w-full`}
                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.15 }}
                  >
                    {sampleName || "Nama Peserta Di Sini"}
                  </div>

                  <p className="text-[10px] text-[#555555] max-w-[260px] leading-tight mt-1">
                    Telah menyelesaikan program pelatihan teknis dengan kualifikasi memuaskan.
                  </p>

                  <div className="mt-4 pt-2 border-t border-[#111111]/30 w-40 flex justify-between text-[8px] font-mono text-[#555555]">
                    <span>REG: SG-2026-X</span>
                    <span>STATUS: VALID</span>
                  </div>

                  {/* Efek Animasi Generasi */}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-[#111111]/80 text-white flex flex-col items-center justify-center font-mono text-xs gap-2">
                      <RefreshCw className="size-6 animate-spin text-[#0000EE]" />
                      <span>MEMPROSES BERKAS SIMULASI...</span>
                    </div>
                  )}
                </div>

                {/* Kontrol Simulator Interaktif */}
                <div className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="interactive-name" className="block text-xs font-mono uppercase text-[#555555] mb-1">
                      Ketik Nama Penerima:
                    </label>
                    <input
                      id="interactive-name"
                      type="text"
                      value={sampleName}
                      onChange={(e) => setSampleName(e.target.value)}
                      placeholder="Masukkan nama..."
                      className="w-full bg-[#EBE9E4] border border-[#111111] rounded-[4px] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#0000EE]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase text-[#555555] mb-1">
                        Gaya Huruf:
                      </label>
                      <select
                        value={fontFamilyType}
                        onChange={(e) => setFontFamilyType(e.target.value)}
                        className="w-full bg-[#EBE9E4] border border-[#111111] rounded-[4px] px-2 py-1.5 text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#0000EE]"
                      >
                        <option value="font-serif">Serif Elegan</option>
                        <option value="font-sans">Sans-Serif Bersih</option>
                        <option value="font-mono">Monospace Teknis</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-[#555555] mb-1">
                        Ukuran ({fontSize}px):
                      </label>
                      <input
                        type="range"
                        min="16"
                        max="36"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full mt-2 accent-[#0000EE] cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={copySampleNames}
                      className="text-xs font-mono text-[#0000EE] hover:underline inline-flex items-center gap-1.5"
                    >
                      <Copy className="size-3.5" />
                      {copiedNotification ? "Daftar Tersalin!" : "Salin 5 Contoh Nama"}
                    </button>

                    <button
                      type="button"
                      onClick={triggerSimulatedGeneration}
                      disabled={isGenerating}
                      className="w-full sm:w-auto bg-[#111111] text-[#FFFFFF] text-xs font-mono uppercase px-4 py-2 rounded-[4px] hover:bg-[#0000EE] transition-colors"
                    >
                      Uji Render 1 Detik
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* SPESIFIKASI TEKNIS: Tabular Engine Details */}
        <section id="specs" className="py-24 px-6 md:px-12 border-b border-[#111111] bg-[#FFFFFF]">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
              <div>
                <span className="font-mono text-xs text-[#0000EE] uppercase tracking-wider block mb-2">
                  [ STANDARISASI ]
                </span>
                <h2
                  className="text-4xl sm:text-6xl font-bold uppercase text-[#111111]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  SPESIFIKASI TEKNIS ENGINE.
                </h2>
              </div>
              <p className="text-[#555555] max-w-md text-base">
                Transparan tanpa klaim bombastis. Parameter berikut adalah kapabilitas sistem saat ini.
              </p>
            </div>

            {/* List Spesifikasi Garis Tegas */}
            <div className="border-t-2 border-[#111111] divide-y divide-[#E5E7EB]">
              {technicalSpecs.map((spec, idx) => (
                <div
                  key={spec.label}
                  className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline hover:bg-[#EBE9E4]/40 px-4 transition-colors"
                >
                  <div className="md:col-span-1 font-mono text-xs text-[#0000EE]">
                    0{idx + 1}
                  </div>
                  <div className="md:col-span-4 font-mono text-sm uppercase text-[#555555]">
                    {spec.label}
                  </div>
                  <div className="md:col-span-4 text-xl font-bold text-[#111111]">
                    {spec.value}
                  </div>
                  <div className="md:col-span-3 text-xs text-[#555555] font-mono">
                    {spec.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PENGGUNAAN KASUS NYATA (USE CASES) */}
        <section id="use-cases" className="py-24 px-6 md:px-12 border-b border-[#111111]">
          <div className="max-w-[1440px] mx-auto">
            <div className="mb-16">
              <span className="font-mono text-xs text-[#0000EE] uppercase tracking-wider block mb-2">
                [ IMPLEMENTASI ]
              </span>
              <h2
                className="text-4xl sm:text-6xl font-bold uppercase text-[#111111]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                SKENARIO PENGGUNAAN.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {useCases.map((uc) => (
                <div
                  key={uc.id}
                  className="bg-[#FFFFFF] border-2 border-[#111111] p-8 rounded-[4px] flex flex-col justify-between hover:shadow-[6px_6px_0px_0px_#111111] hover:-translate-y-1 transition-all duration-200"
                >
                  <div>
                    <span className="inline-block font-mono text-[10px] uppercase tracking-wider text-[#0000EE] border border-[#0000EE] px-2 py-0.5 rounded-[2px] mb-6">
                      {uc.badge}
                    </span>
                    <h3 className="text-2xl font-bold uppercase text-[#111111] mb-4">
                      {uc.title}
                    </h3>
                    <p className="text-sm text-[#555555] leading-relaxed">
                      {uc.desc}
                    </p>
                  </div>
                  <div className="mt-8 pt-4 border-t border-[#E5E7EB] flex items-center gap-2 font-mono text-xs text-[#111111] font-bold">
                    <span>COCOK UNTUK INI</span>
                    <Check className="size-4 text-[#0000EE]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ALUR KERJA: Step Flow Kontras Gelap */}
        <section id="workflow" className="py-24 px-6 md:px-12 bg-[#111111] text-[#EBE9E4] border-b border-[#111111]">
          <div className="max-w-[1440px] mx-auto">
            <div className="mb-20">
              <span className="font-mono text-xs text-[#0000EE] uppercase tracking-wider block mb-2">
                [ ALUR SISTEM ]
              </span>
              <h2
                className="text-4xl sm:text-6xl font-bold uppercase"
                style={{ fontFamily: "var(--font-display)" }}
              >
                TIGA LANGKAH KERJA MANDIRI.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "UNGGAH TEMPLATE",
                  desc: "Masukkan lembar sertifikat kosong berformat PNG atau JPG. Pastikan bagian nama dikosongkan.",
                },
                {
                  step: "02",
                  title: "TEMPEL DAFTAR NAMA",
                  desc: "Salin kolom nama dari lembar kerja Excel atau Google Sheets Anda dan tempel tanpa perlu format khusus.",
                },
                {
                  step: "03",
                  title: "GENERATE & UNDUH",
                  desc: "Sistem memproses halaman satu per satu dan mengemas seluruh sertifikat siap pakai untuk Anda.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="border-t border-[#333333] pt-8 flex flex-col justify-between group hover:border-[#0000EE] transition-colors"
                >
                  <div>
                    <span
                      className="text-6xl font-bold text-[#333333] group-hover:text-[#0000EE] transition-colors block mb-6"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {item.step}
                    </span>
                    <h3 className="text-xl font-bold uppercase mb-4 text-[#EBE9E4]">{item.title}</h3>
                    <p className="text-sm text-[#EBE9E4]/70 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRATINJAU JURNAL TEKNIS */}
        <section className="py-24 px-6 md:px-12 border-b border-[#111111] bg-[#FFFFFF]">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
              <div>
                <span className="font-mono text-xs text-[#0000EE] uppercase tracking-wider block mb-2">
                  [ DOKUMENTASI & JURNAL ]
                </span>
                <h2
                  className="text-4xl sm:text-6xl font-bold uppercase text-[#111111]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  CATATAN PENGEMBANGAN.
                </h2>
              </div>
              <Link href="/blog" className="font-mono text-xs text-[#0000EE] font-bold hover:underline flex items-center gap-1">
                LIHAT SEMUA ARTIKEL <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {journalPosts.map((post) => (
                <div
                  key={post.title}
                  className="border-2 border-[#111111] p-8 rounded-[4px] flex flex-col justify-between hover:bg-[#EBE9E4]/30 transition-colors"
                >
                  <div>
                    <div className="flex justify-between items-center font-mono text-xs text-[#555555] mb-6">
                      <span className="text-[#0000EE] font-bold">[ {post.tag} ]</span>
                      <span>{post.date}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-[#111111] mb-4 uppercase leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-sm text-[#555555] leading-relaxed">
                      {post.desc}
                    </p>
                  </div>
                  <div className="mt-8 pt-4 border-t border-[#E5E7EB]">
                    <span className="font-mono text-xs font-bold text-[#111111] flex items-center gap-2">
                      BACA DOKUMEN <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION INTERAKTIF */}
        <section id="faq" className="py-24 px-6 md:px-12 border-b border-[#111111]">
          <div className="max-w-[1440px] mx-auto grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <span className="font-mono text-xs text-[#0000EE] uppercase tracking-wider block mb-2">
                [ TANYA JAWAB ]
              </span>
              <h2
                className="text-4xl sm:text-6xl font-bold uppercase text-[#111111]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                PERTANYAAN UMUM.
              </h2>
              <p className="mt-6 text-[#555555] text-base leading-relaxed">
                Jawaban langsung mengenai kapabilitas, batasan kuota harian, serta jaminan keamanan data berkas Anda.
              </p>
            </div>

            <div className="lg:col-span-7 divide-y divide-[#111111] border-y border-[#111111]">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="py-6 transition-colors">
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex justify-between items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE]"
                    >
                      <span className="text-xl font-bold text-[#111111] pr-4">{faq.q}</span>
                      <ChevronDown
                        className={`size-6 text-[#0000EE] shrink-0 transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        isOpen ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="text-base text-[#555555] leading-relaxed">{faq.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CALL TO ACTION TEGAS */}
        <section className="py-24 px-6 md:px-12 bg-[#EBE9E4] text-center">
          <div className="max-w-4xl mx-auto border-4 border-[#111111] p-10 sm:p-16 bg-[#FFFFFF] rounded-[8px] shadow-[12px_12px_0px_0px_#111111]">
            <h2
              className="text-4xl sm:text-6xl font-bold uppercase text-[#111111] mb-6 tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              MULAI GENERATE SEKARANG.
            </h2>
            <p className="text-lg text-[#555555] max-w-xl mx-auto mb-10">
              Tanpa kartu kredit, tanpa formulir berbelit. Akses kuota 50 berkas setiap hari secara langsung.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-3 bg-[#0000EE] text-[#FFFFFF] px-10 py-5 rounded-[4px] font-bold text-base uppercase tracking-wider hover:bg-[#111111] transition-all transform active:scale-95 shadow-md"
            >
              Daftar Akun Gratis
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER EDITORIAL SOLID */}
      <footer className="bg-[#111111] text-[#EBE9E4] py-14 px-6 md:px-12 border-t border-[#111111]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-[#333333] pb-12">
          <div className="md:col-span-2">
            <span
              className="text-3xl font-bold text-[#EBE9E4] tracking-tight uppercase leading-none block mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              SERTIGEN.
            </span>
            <p className="text-sm text-[#EBE9E4]/70 max-w-sm">
              Sistem otomatisasi pembuatan sertifikat massal. Presisi tinggi untuk penyelenggara acara, pengajar, dan institusi.
            </p>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF] mb-4 font-mono">
              [ NAVIGASI ]
            </div>
            <ul className="flex flex-col gap-2.5 text-sm text-[#EBE9E4]/70 font-mono">
              <li><a href="#simulator" className="hover:text-[#0000EE] transition-colors">Simulator</a></li>
              <li><a href="#specs" className="hover:text-[#0000EE] transition-colors">Spesifikasi</a></li>
              <li><a href="#use-cases" className="hover:text-[#0000EE] transition-colors">Skenario</a></li>
              <li><a href="#faq" className="hover:text-[#0000EE] transition-colors">Tanya Jawab</a></li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF] mb-4 font-mono">
              [ STATUS SISTEM ]
            </div>
            <p className="text-xs text-[#EBE9E4]/70 font-mono mb-2">Versi Mesin: 1.0.4-beta</p>
            <p className="text-xs text-[#0000EE] font-mono font-bold">Kapasitas Server: Optimal</p>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mt-8 font-mono text-xs text-[#EBE9E4]/40">
          <span>© {new Date().getFullYear()} SERTIGEN PLATFORM. SELURUH HAK CIPTA DILINDUNGI.</span>
          <span>DIBANGUN TANPA SLOP</span>
        </div>
      </footer>
    </div>
  );
}
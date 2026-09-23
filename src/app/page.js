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
  ExternalLink,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Target,
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
    a: "Ya, sepenuhnya gratis untuk saat ini karena belum ada paket langganan berbayar. Anda dapat menghasilkan hingga 50 sertifikat per hari, dan kuota akan direset otomatis setiap 24 jam.",
  },
  {
    q: "Format berkas apa yang didukung untuk template?",
    a: "Anda dapat mengunggah template dasar dalam format PNG atau JPG resolusi tinggi. Hasil generasi akan diekspor dalam format JPEG berkualitas cetak tajam.",
  },
  {
    q: "Bagaimana cara memasukkan ratusan nama peserta?",
    a: "Cukup salin dan tempel daftar nama langsung dari spreadsheet (Excel/Google Sheets) ke dalam kolom input. Sistem akan memisahkan baris secara otomatis.",
  },
  {
    q: "Apakah privasi data nama peserta terjamin aman?",
    a: "Daftar nama dan berkas yang diproses hanya digunakan untuk perenderan sertifikat dan tidak pernah dibagikan atau dijual ke pihak ketiga.",
  },
];

const featureHighlights = [
  {
    id: "speed",
    label: "Kecepatan Render",
    title: "50 Sertifikat Dalam Hitungan Detik",
    desc: "Mesin perender berbasis kanvas memproses puluhan sertifikat sekaligus tanpa membebani memori peramban Anda.",
    tag: "KINERJA",
  },
  {
    id: "typography",
    label: "Tipografi Presisi",
    title: "Penyesuaian Font dan Tata Letak Fleksibel",
    desc: "Pilih gaya font, atur ukuran proporsional, serta sesuaikan koordinat posisi teks hingga satuan piksel terkecil.",
    tag: "KUSTOMISASI",
  },
  {
    id: "export",
    label: "Kualitas Berkas",
    title: "Resolusi Tinggi untuk Kebutuhan Cetak",
    desc: "Hasil akhir diekspor dengan kerapatan piksel optimal sehingga tidak pecah saat dicetak di kertas sertifikat fisik.",
    tag: "OUTPUT",
  },
];

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [sampleName, setSampleName] = useState("Alexander Pratama");
  const [openFaq, setOpenFaq] = useState(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const copySampleList = () => {
    const names = "Alexander Pratama\nNadia Safitri\nBudi Santoso\nSiti Rahmawati";
    navigator.clipboard.writeText(names);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <div
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} bg-[#EBE9E4] text-[#111111] min-h-screen selection:bg-[#0000EE] selection:text-white antialiased`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Aksesibilitas: Lompat ke konten utama */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[#0000EE] focus:text-white focus:px-4 focus:py-2 focus:rounded-[4px] focus:outline-none"
      >
        Lewati ke konten utama
      </a>

      {/* Top Banner Status Bar */}
      <div className="bg-[#111111] text-[#EBE9E4] text-xs font-mono py-2 px-6 border-b border-[#333333]">
        <div className="max-w-[1440px] mx-auto flex justify-between items-center">
          <span className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#0000EE]" />
            SERTIGEN ENGINE V1.0 (BETA TERBUKA)
          </span>
          <span className="hidden sm:inline text-[#EBE9E4]/60">KUOTA HARIAN: 50/HARI GRATIS</span>
        </div>
      </div>

      {/* Navbar Minimalis */}
      <header className="sticky top-0 z-40 bg-[#EBE9E4]/95 border-b border-[#111111] backdrop-blur-sm transition-all">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-20 flex justify-between items-center">
          <Link
            href="/"
            className="text-2xl font-bold uppercase tracking-tight text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SERTIGEN.
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[13px] font-mono tracking-wider text-[#555555]">
            <a href="#simulator" className="hover:text-[#0000EE] transition-colors">
              [ SIMULATOR ]
            </a>
            <a href="#features" className="hover:text-[#0000EE] transition-colors">
              [ FITUR ]
            </a>
            <a href="#workflow" className="hover:text-[#0000EE] transition-colors">
              [ ALUR ]
            </a>
            <a href="#faq" className="hover:text-[#0000EE] transition-colors">
              [ PERTANYAAN ]
            </a>
          </nav>

          <Suspense fallback={<div className="h-10 w-24 bg-[#E5E7EB] animate-pulse rounded-[4px]" />}>
            <AuthNav />
          </Suspense>
        </div>
      </header>

      <main id="main-content">
        {/* HERO SECTION: Poster Editorial + Interactive Live Staging */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-32 px-6 md:px-12 border-b border-[#111111]">
          <div className="max-w-[1440px] mx-auto grid lg:grid-cols-12 gap-12 items-start">
            
            {/* Sisi Kiri: Tipografi Raksasa */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="inline-flex items-center gap-2 mb-6 font-mono text-xs text-[#0000EE] uppercase">
                <Zap className="size-4" />
                <span>Otomatisasi Dokumen & Sertifikat</span>
              </div>

              <h1
                className="text-5xl sm:text-7xl lg:text-[88px] leading-[0.95] font-bold text-[#111111] uppercase tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                PROSES RATUSAN SERTIFIKAT TANPA RIBET.
              </h1>

              <p className="mt-8 text-xl sm:text-2xl text-[#555555] max-w-xl leading-relaxed">
                Tinggalkan cara manual menempel nama satu per satu. Unggah template, tempel daftar nama, dan unduh berkas berkualitas tinggi dalam hitungan menit.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-3 bg-[#111111] text-[#FFFFFF] px-8 py-4 rounded-[4px] font-semibold text-sm tracking-wide uppercase hover:bg-[#0000EE] transition-all transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE]"
                >
                  Mulai Sekarang Gratis
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <a
                  href="#simulator"
                  className="inline-flex items-center gap-2 border border-[#111111] bg-transparent text-[#111111] px-6 py-4 rounded-[4px] font-semibold text-sm tracking-wide uppercase hover:bg-[#FFFFFF] transition-all"
                >
                  Coba Pratinjau
                </a>
              </div>
            </div>

            {/* Sisi Kanan: Live Interactive Simulator Card */}
            <div id="simulator" className="lg:col-span-5">
              <div className="bg-[#FFFFFF] border-2 border-[#111111] rounded-[8px] p-6 shadow-[8px_8px_0px_0px_#111111] transition-transform hover:-translate-y-1">
                <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4 mb-6 font-mono text-xs text-[#555555]">
                  <span>INTERACTIVE STAGING</span>
                  <span className="text-[#0000EE]">[ LIVE RENDERING ]</span>
                </div>

                {/* Sertifikat Display Simulative */}
                <div className="bg-[#EBE9E4] border border-[#111111] p-6 rounded-[4px] relative flex flex-col items-center justify-center text-center aspect-[16/10] overflow-hidden">
                  <div className="absolute top-3 left-3 flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#111111]" />
                    <span className="w-2 h-2 rounded-full bg-[#555555]" />
                  </div>
                  
                  <div className="uppercase font-mono text-[10px] tracking-widest text-[#555555] mb-2">
                    Sertifikat Penghargaan
                  </div>

                  {/* Dynamic Name Replacement */}
                  <div className="font-serif italic text-2xl sm:text-3xl text-[#111111] my-2 transition-all duration-300 font-bold">
                    {sampleName || "Nama Peserta Disini"}
                  </div>

                  <p className="text-[10px] sm:text-xs text-[#555555] max-w-[240px] leading-tight">
                    Atas partisipasi aktif dalam program pelatihan resmi berskala nasional.
                  </p>

                  <div className="mt-4 pt-2 border-t border-[#111111]/20 w-32 flex justify-between text-[8px] font-mono text-[#555555]">
                    <span>TERVERIFIKASI</span>
                    <span>2026</span>
                  </div>
                </div>

                {/* Kontrol Interaktif */}
                <div className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="interactive-name" className="block text-xs font-mono uppercase text-[#555555] mb-1">
                      Ubah Nama untuk Simulasi:
                    </label>
                    <input
                      id="interactive-name"
                      type="text"
                      value={sampleName}
                      onChange={(e) => setSampleName(e.target.value)}
                      placeholder="Ketik nama di sini..."
                      className="w-full bg-[#EBE9E4] border border-[#111111] rounded-[4px] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#0000EE]"
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs font-mono pt-2">
                    <button
                      type="button"
                      onClick={copySampleList}
                      className="text-[#0000EE] hover:underline inline-flex items-center gap-1"
                    >
                      <Copy className="size-3" />
                      {copiedNotification ? "Tersalin ke Clipboard!" : "Salin Contoh 4 Nama"}
                    </button>
                    <span className="text-[#555555]">Status: Siap Export</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* FEATURE HIGHLIGHT: Interactive Tabs with Clean Editorial Layout */}
        <section id="features" className="py-24 px-6 md:px-12 border-b border-[#111111]">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
              <div>
                <span className="font-mono text-xs text-[#0000EE] uppercase tracking-wider block mb-2">
                  [ SPESIFIKASI ]
                </span>
                <h2
                  className="text-4xl sm:text-6xl font-bold uppercase text-[#111111]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  FITUR UTAMA SISTEM.
                </h2>
              </div>
              <p className="text-[#555555] max-w-md text-base">
                Fokus utama kami adalah kecepatan dan keakuratan data tanpa dekorasi berlebihan yang memperlambat alur kerja Anda.
              </p>
            </div>

            {/* Interactive Feature Switcher */}
            <div className="grid lg:grid-cols-12 gap-8 items-stretch">
              {/* Tab Navigasi */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                {featureHighlights.map((feat, index) => {
                  const isActive = activeFeature === index;
                  return (
                    <button
                      key={feat.id}
                      onClick={() => setActiveFeature(index)}
                      className={`text-left p-6 border rounded-[4px] transition-all duration-200 ${
                        isActive
                          ? "bg-[#111111] text-[#EBE9E4] border-[#111111] shadow-[4px_4px_0px_0px_#0000EE]"
                          : "bg-[#FFFFFF] text-[#111111] border-[#E5E7EB] hover:border-[#111111]"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className={`font-mono text-xs ${isActive ? "text-[#0000EE]" : "text-[#555555]"}`}>
                          0{index + 1} // {feat.tag}
                        </span>
                        {isActive && <span className="w-2 h-2 rounded-full bg-[#0000EE]" />}
                      </div>
                      <h3 className="text-xl font-bold uppercase">{feat.label}</h3>
                    </button>
                  );
                })}
              </div>

              {/* Showcase Detail Reaktif */}
              <div className="lg:col-span-7 bg-[#FFFFFF] border-2 border-[#111111] rounded-[4px] p-8 md:p-12 flex flex-col justify-between">
                <div>
                  <div className="inline-block bg-[#EBE9E4] text-[#111111] font-mono text-xs px-3 py-1 rounded-[2px] uppercase mb-6">
                    {featureHighlights[activeFeature].tag} ENGINE
                  </div>
                  <h4
                    className="text-3xl sm:text-4xl font-bold uppercase text-[#111111] mb-6"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {featureHighlights[activeFeature].title}
                  </h4>
                  <p className="text-lg text-[#555555] leading-relaxed mb-8">
                    {featureHighlights[activeFeature].desc}
                  </p>
                </div>

                <div className="pt-6 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-[#555555]">
                  <span>PENGUJIAN VALID TERSTANDARISASI</span>
                  <Link href="/register" className="text-[#0000EE] font-bold hover:underline flex items-center gap-1">
                    UJI SEKARANG <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW: Stark Editorial Step Flow */}
        <section id="workflow" className="py-24 px-6 md:px-12 bg-[#111111] text-[#EBE9E4] border-b border-[#111111]">
          <div className="max-w-[1440px] mx-auto">
            <div className="mb-20">
              <span className="font-mono text-xs text-[#0000EE] uppercase tracking-wider block mb-2">
                [ ALUR KERJA ]
              </span>
              <h2
                className="text-4xl sm:text-6xl font-bold uppercase"
                style={{ fontFamily: "var(--font-display)" }}
              >
                TIGA TAHAP GENERASI.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "UNGGAH TEMPLATE",
                  desc: "Masukkan desain piagam atau sertifikat dalam bentuk berkas PNG atau JPG beresolusi tajam.",
                },
                {
                  step: "02",
                  title: "TEMPEL NAMA",
                  desc: "Salin daftar nama peserta langsung dari tabel kerja Anda tanpa perlu format ulang rumit.",
                },
                {
                  step: "03",
                  title: "UNDUH SEMUA",
                  desc: "Sistem memproses setiap halaman secara mandiri dan siap Anda unduh dalam satu paket arsip.",
                },
              ].map((item, index) => (
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

        {/* FAQ SECTION: Interactive Accordion */}
        <section id="faq" className="py-24 px-6 md:px-12 border-b border-[#111111]">
          <div className="max-w-[1440px] mx-auto grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <span className="font-mono text-xs text-[#0000EE] uppercase tracking-wider block mb-2">
                [ BANTUAN ]
              </span>
              <h2
                className="text-4xl sm:text-6xl font-bold uppercase text-[#111111]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                PERTANYAAN UMUM.
              </h2>
              <p className="mt-6 text-[#555555] text-base leading-relaxed">
                Jawaban langsung tanpa manipulasi klaim. Jika Anda membutuhkan bantuan lebih lanjut, tim pengembang kami siap membantu.
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

        {/* CALL TO ACTION: High Impact Editorial Banner */}
        <section className="py-24 px-6 md:px-12 bg-[#EBE9E4] text-center">
          <div className="max-w-4xl mx-auto border-4 border-[#111111] p-10 sm:p-16 bg-[#FFFFFF] rounded-[8px] shadow-[12px_12px_0px_0px_#111111]">
            <h2
              className="text-4xl sm:text-6xl font-bold uppercase text-[#111111] mb-6 tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              MULAI BUAT SERTIFIKAT SEKARANG.
            </h2>
            <p className="text-lg text-[#555555] max-w-xl mx-auto mb-10">
              Tanpa kartu kredit, tanpa formulir bertele-tele. Akses kuota 50 berkas setiap hari secara langsung.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-3 bg-[#0000EE] text-[#FFFFFF] px-10 py-5 rounded-[4px] font-bold text-base uppercase tracking-wider hover:bg-[#111111] transition-all transform active:scale-95 shadow-md"
            >
              Akses Sekarang
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER: Minimal Solid */}
      <footer className="bg-[#111111] text-[#EBE9E4] py-12 px-6 md:px-12 border-t border-[#111111]">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 font-mono text-xs">
          <div className="flex items-center gap-4">
            <span className="font-bold text-base uppercase text-[#FFFFFF]">SERTIGEN.</span>
            <span className="text-[#EBE9E4]/40">|</span>
            <span className="text-[#EBE9E4]/60">SISTEM GENERATOR OTOMATIS</span>
          </div>

          <div className="flex gap-8 text-[#EBE9E4]/70">
            <a href="#simulator" className="hover:text-[#0000EE] transition-colors">
              SIMULATOR
            </a>
            <a href="#features" className="hover:text-[#0000EE] transition-colors">
              FITUR
            </a>
            <a href="#faq" className="hover:text-[#0000EE] transition-colors">
              FAQ
            </a>
          </div>

          <div className="text-[#EBE9E4]/40">
            © {new Date().getFullYear()} SERTIGEN PLATFORM
          </div>
        </div>
      </footer>
    </div>
  );
}
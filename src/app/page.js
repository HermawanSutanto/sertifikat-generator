"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  FileSpreadsheet,
  FileText,
  Lock,
  Menu,
  Printer,
  Sliders,
  Type,
  X,
  Zap,
} from "lucide-react";
import AuthNav from "./AuthNav";

const headingFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-heading",
});

const sansFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const faqs = [
  {
    id: "faq-pricing",
    q: "Berapa biaya penggunaannya dan apa beda tiap paket?",
    a: "Mode Trial dapat digunakan langsung tanpa login (bebas watermark hingga 50 sertifikat per sesi). Akun Cloud Gratis memberikan 1 slot penyimpanan event aktif di cloud tanpa batas kuota peserta, tautan unduh mandiri, dan simpan template permanen. Paket Premium (Segera Hadir) disiapkan untuk multi-event simultan tanpa batas dan kustomisasi branding mandiri.",
  },
  {
    id: "faq-cancellation",
    q: "Bagaimana kebijakan pembatalan dan privasi data jika event dihapus?",
    a: "SertiGen tidak memungut biaya langganan berulang otomatis. Anda dapat berhenti menggunakan layanan atau menghapus event kapan saja. Saat event dihapus dari dashboard, seluruh berkas template dan database peserta di penyimpanan cloud akan langsung dimusnahkan secara permanen.",
  },
  {
    id: "faq-integration",
    q: "Apakah membutuhkan integrasi API atau plugin tambahan?",
    a: "Tidak. SertiGen sengaja didesain mandiri di peramban klien tanpa ketergantungan API pihak ketiga. Anda cukup mengekspor data nama dari Microsoft Excel, Google Sheets, atau Notion ke format berkas CSV universal.",
  },
  {
    id: "faq-privacy",
    q: "Apakah data nama peserta dikirim ke server luar?",
    a: "Pada mode Trial dan Studio Mandiri, seluruh proses penggabungan teks ke PDF dikerjakan secara lokal di memori RAM komputer Anda melalui Rust WebAssembly. Tidak ada transmisi data nama ke server pihak ketiga mana pun.",
  },
  {
    id: "faq-typography",
    q: "Bisakah mengatur posisi koordinat dan jenis font sendiri?",
    a: "Bisa. Anda bebas menggeser kotak elemen secara visual, mengunci simetri dengan smart-snap, menggeser mikro per 1 titik (arrow keys), memilih koleksi font bawaan, atau mengunggah berkas font kustom (.ttf / .otf).",
  },
];

const technicalSpecs = [
  {
    label: "Mesin Render",
    value: "Rust WebAssembly",
    desc: "Kompilasi lokal di browser, dokumen selesai tanpa antre di server",
  },
  {
    label: "Format Input",
    value: "PDF Vector + CSV Universal",
    desc: "Kompatibel dengan ekspor Google Sheets, Excel, dan LibreOffice",
  },
  {
    label: "Format Output",
    value: "PDF Siap Cetak (Arsip ZIP)",
    desc: "Menghasilkan berkas PDF terpisah per nama dengan teks berbasis kurva",
  },
  {
    label: "Kebutuhan Perangkat",
    value: "RAM 4 GB+ (Disarankan 8 GB)",
    desc: "Optimal pada Chrome, Edge, atau Brave untuk ekspor massal 1.000+ lembar",
  },
  {
    label: "Biaya & Komitmen",
    value: "Rp 0 (Freemium Mandiri)",
    desc: "Tanpa tagihan berulang, bebas hapus data dan akun kapan saja",
  },
];

const useCases = [
  {
    title: "Webinar & Seminar Online",
    desc: "Terbitkan ratusan piagam kehadiran pasca acara tanpa repot menyalin nama satu demi satu.",
    tag: "Event Digital",
  },
  {
    title: "Lembaga Kursus & Bootcamp",
    desc: "Cetak sertifikat kelulusan terstandarisasi lengkap dengan nomor surat dan predikat peserta.",
    tag: "Pelatihan",
  },
  {
    title: "Sekolah & Kampus",
    desc: "Solusi cepat untuk kepanitiaan lomba, piagam ekstrakurikuler, dan sertifikat workshop tahunan.",
    tag: "Pendidikan",
  },
  {
    title: "Komunitas & Panitia Mandiri",
    desc: "Cocok untuk panitia yang butuh alat praktis tanpa harus membuka software grafis yang berat.",
    tag: "Organisasi",
  },
];

const sampleNames = [
  "Alexander Pratama, M.Kom",
  "Nadia Safitri, S.Ds",
  "Budi Santoso",
  "Siti Rahmawati, S.E",
  "Dimas Anggara, S.T",
];

const canvasInteractiveModes = [
  { id: "select", label: "01. Pilih Elemen", note: "Klik kotak teks untuk mengaktifkan titik transformasi." },
  { id: "drag", label: "02. Geser Posisi", note: "Tarik elemen ke posisi yang diinginkan di lembar kerja." },
  { id: "snap", label: "03. Smart Snap", note: "Garis bantu magnetik mengunci posisi horizontal & vertikal tepat di tengah." },
  { id: "nudge", label: "04. Geser Mikro (1pt)", note: "Tekan tombol panah keyboard untuk presisi cetak milimeter." },
];

export default function LandingPage() {
  const [activeName, setActiveName] = useState("Alexander Pratama, M.Kom");
  const [fontSize, setFontSize] = useState(24);
  const [fontStyle, setFontStyle] = useState("serif");
  const [textAlign, setTextAlign] = useState("center");
  const [openFaq, setOpenFaq] = useState(null);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Studio Interactive Preview State
  const [studioMode, setStudioMode] = useState("snap");

  // Dynamic Size Compression Calculator
  const [simScale, setSimScale] = useState(1.5);
  const [simQuality, setSimQuality] = useState(0.8);
  const baseSizeMB = 12.5;

  const optimizedSizeMB = useMemo(() => {
    const ratio = (simScale / 2.0) * simQuality;
    return Math.max(0.6, baseSizeMB * ratio * 0.22).toFixed(1);
  }, [simScale, simQuality]);

  const savingsPercent = Math.round((1 - parseFloat(optimizedSizeMB) / baseSizeMB) * 100);

  const copySampleNames = () => {
    navigator.clipboard.writeText(sampleNames.join("\n"));
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const jsonLdData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "SertiGen",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web Browser",
        url: "https://cert.krovida.my.id",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "IDR",
          availability: "https://schema.org/InStock",
          description: "Mode Trial bebas biaya dan Akun Cloud Gratis dengan kuota 1 event aktif tersimpan.",
        },
        description:
          "Generator sertifikat massal otomatis dari tabel CSV/Excel dan template PDF berbasis Rust WebAssembly.",
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.a,
          },
        })),
      },
    ],
  };

  return (
    <div
      className={`${headingFont.variable} ${sansFont.variable} bg-[#FAFAFA] text-[#18181B] min-h-screen selection:bg-[#18181B] selection:text-white antialiased`}
      style={{ fontFamily: "var(--font-sans), sans-serif" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />

      {/* Top Banner Notice */}
      <div className="border-b border-[#E4E4E7] bg-[#FFFFFF] text-[#71717A] text-xs py-2 px-4 sm:px-6">
        <div className="max-w-[1240px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium text-[#27272A]">Mesin Komputasi Lokal Aktif</span>
            <span className="text-[#D4D4D8]">•</span>
            <span>Data peserta diproses langsung di memori perangkat</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[#71717A]">
            <span>Mendukung CSV & Excel</span>
            <span className="text-[#D4D4D8]">/</span>
            <span>Bebas Biaya Berulang</span>
          </div>
        </div>
      </div>

      {/* Header Navigation */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/90 border-b border-[#E4E4E7] backdrop-blur-md">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-15 flex justify-between items-center">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-[#18181B] flex items-center gap-2"
            style={{ fontFamily: "var(--font-heading), sans-serif" }}
          >
            <span className="w-5 h-5 bg-[#18181B] text-white flex items-center justify-center rounded text-xs font-mono font-bold">
              S
            </span>
            <span>SertiGen</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-[13px] text-[#71717A] font-medium">
            <a href="#alur" className="hover:text-[#18181B] transition-colors">
              Alur Kerja
            </a>
            <a href="#simulator" className="hover:text-[#18181B] transition-colors">
              Simulator
            </a>
            <a href="#fitur" className="hover:text-[#18181B] transition-colors">
              Presisi Kanvas
            </a>
            <a href="#perbandingan" className="hover:text-[#18181B] transition-colors">
              Paket & Biaya
            </a>
            <a href="#spesifikasi" className="hover:text-[#18181B] transition-colors">
              Spesifikasi
            </a>
            <a href="#faq" className="hover:text-[#18181B] transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Suspense fallback={<div className="h-8 w-16 bg-[#F4F4F5] rounded" />}>
              <AuthNav />
            </Suspense>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded border border-[#E4E4E7] text-[#18181B] hover:bg-[#F4F4F5] transition-colors"
              aria-label={mobileMenuOpen ? "Tutup Menu" : "Buka Menu"}
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#E4E4E7] bg-[#FFFFFF] px-4 py-3 space-y-2">
            <div className="grid grid-cols-2 gap-1.5 text-xs text-[#52525B] font-medium">
              <a href="#alur" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-[#F4F4F5]">Alur Kerja</a>
              <a href="#simulator" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-[#F4F4F5]">Simulator</a>
              <a href="#fitur" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-[#F4F4F5]">Presisi Kanvas</a>
              <a href="#perbandingan" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-[#F4F4F5]">Paket & Biaya</a>
              <a href="#spesifikasi" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-[#F4F4F5]">Spesifikasi</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-[#F4F4F5]">FAQ & Refund</a>
            </div>
            <div className="pt-2 border-t border-[#E4E4E7]">
              <Link
                href="/trial"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center bg-[#18181B] text-white py-2 px-3 rounded text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Zap className="size-3.5 text-amber-400" />
                <span>Buka Mode Trial Langsung</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {}
      <main id="main-content">
        <section className="pt-12 sm:pt-16 pb-16 px-4 sm:px-6 md:px-8 border-b border-[#E4E4E7] bg-[#FFFFFF]">
          <div className="max-w-[1240px] mx-auto grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left Narrative */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#F4F4F5] border border-[#E4E4E7] w-fit mb-5">
                <span className="text-[11px] font-medium text-[#52525B]">
                  Bukan Mail Merge yang bergeser. Bukan salin-tempel di Canva.
                </span>
              </div>

              <h1
                className="text-3xl sm:text-4xl lg:text-[46px] font-bold leading-[1.15] tracking-tight text-[#18181B]"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                Cetak ratusan sertifikat PDF dari tabel Excel & CSV tanpa menyalin nama manual.
              </h1>

              <p className="mt-4 text-sm sm:text-base text-[#71717A] leading-relaxed max-w-xl font-normal">
                Unggah desain sertifikat dalam format PDF, masukkan file CSV daftar peserta, atur letak kotak nama dengan presisi magnetik, dan biarkan komputer Anda menyusun arsip ZIP siap cetak dalam hitungan detik.
              </p>

              {/* Action Buttons */}
              <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/trial"
                  className="inline-flex items-center justify-center gap-2 bg-[#18181B] text-white px-5 py-2.5 rounded text-xs font-semibold uppercase tracking-wider hover:bg-[#27272A] transition-colors"
                >
                  <Zap className="size-3.5 text-amber-400" />
                  Coba Trial Tanpa Login
                  <ArrowRight className="size-3.5" />
                </Link>

                <Link
                  href="/register"
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded border border-[#E4E4E7] bg-transparent text-[#18181B] text-xs font-semibold uppercase tracking-wider hover:bg-[#F4F4F5] transition-colors"
                >
                  Daftar Akun Cloud
                </Link>
              </div>

              {/* Assurance Notes */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#71717A]">
                <span>✓ Bebas watermark (s.d. 50 lembar pada trial)</span>
                <span className="text-[#D4D4D8] hidden sm:inline">•</span>
                <span>✓ Tanpa kartu kredit</span>
                <span className="text-[#D4D4D8] hidden sm:inline">•</span>
                <span>✓ Kompilasi Rust WebAssembly lokal</span>
              </div>

              {/* Functional Highlights */}
              <div className="mt-10 pt-6 border-t border-[#E4E4E7] grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs uppercase font-medium text-[#71717A]">Kurva Vektor</div>
                  <div className="text-sm font-semibold text-[#18181B] mt-0.5">Teks Tajam Standar Cetak</div>
                </div>
                <div>
                  <div className="text-xs uppercase font-medium text-[#71717A]">Privasi Berkas</div>
                  <div className="text-sm font-semibold text-[#18181B] mt-0.5">Nol Transmisi Server</div>
                </div>
                <div>
                  <div className="text-xs uppercase font-medium text-[#71717A]">Biaya Layanan</div>
                  <div className="text-sm font-semibold text-emerald-700 mt-0.5">Rp 0 (Freemium Mandiri)</div>
                </div>
              </div>
            </div>

            {/* Right Interactive Simulator */}
            <div id="simulator" className="lg:col-span-5 w-full">
              <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-lg p-4 sm:p-5 shadow-sm">
                <div className="flex justify-between items-center border-b border-[#E4E4E7] pb-2.5 mb-3 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-[#71717A] text-[11px]">
                    Simulasi Pratinjau Kanvas
                  </span>
                  <span className="text-emerald-700 font-medium text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Mode Interaktif
                  </span>
                </div>

                {/* SVG Native Certificate Mockup */}
                <div className="relative aspect-[16/10] overflow-hidden border border-[#E4E4E7] rounded bg-[#FAFAFA] flex flex-col justify-between p-4 sm:p-5 select-none shadow-inner">
                  {/* Subtle Vector Background Border */}
                  <div className="absolute inset-2 border border-[#E4E4E7] pointer-events-none rounded-[2px]" />
                  <div className="absolute inset-3 border border-dashed border-[#E4E4E7]/70 pointer-events-none rounded-[2px]" />

                  {/* Header of Mockup Certificate */}
                  <div className="relative z-10 text-center pt-1">
                    <div className="text-[9px] uppercase tracking-widest text-[#71717A] font-semibold">
                      LEMBAGA SERTIFIKASI & PELATIHAN
                    </div>
                    <div
                      className="text-xs sm:text-sm font-semibold text-[#18181B] uppercase tracking-wider mt-0.5"
                      style={{ fontFamily: "var(--font-heading), sans-serif" }}
                    >
                      Sertifikat Kelulusan Resmi
                    </div>
                  </div>

                  {/* Dynamic Name Area */}
                  <div className="relative z-10 my-auto text-center px-3 py-2">
                    <div className="text-[10px] text-[#71717A] mb-1 font-medium">Diberikan secara sah kepada:</div>
                    <div
                      className={`break-words max-w-full font-bold transition-all duration-150 text-[#18181B] ${
                        fontStyle === "serif" ? "font-serif" : "font-sans"
                      }`}
                      style={{
                        fontSize: `${fontSize}px`,
                        textAlign: textAlign,
                      }}
                    >
                      {activeName || "Nama Peserta Tertera"}
                    </div>
                    <p className="text-[10px] text-[#71717A] mt-1 leading-snug max-w-xs mx-auto">
                      Telah memenuhi standar evaluasi materi dengan hasil kelulusan sangat memuaskan.
                    </p>
                  </div>

                  {/* Footer of Mockup Certificate */}
                  <div className="relative z-10 flex justify-between items-end border-t border-[#E4E4E7] pt-2 text-[9px] text-[#71717A]">
                    <div>
                      <span>No: REG-2026-081</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-[#18181B]">Dokumen Terverifikasi</span>
                    </div>
                  </div>
                </div>

                {/* Control Panel for Live Simulator */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-[11px] uppercase font-semibold text-[#71717A] mb-1">
                      Ketik Nama Penerima:
                    </label>
                    <input
                      type="text"
                      value={activeName}
                      onChange={(e) => setActiveName(e.target.value)}
                      placeholder="Masukkan nama peserta..."
                      className="w-full bg-[#FFFFFF] border border-[#E4E4E7] rounded px-3 py-1.5 text-xs text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-medium text-[#71717A] mb-1">
                        Jenis Huruf:
                      </label>
                      <select
                        value={fontStyle}
                        onChange={(e) => setFontStyle(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#E4E4E7] rounded px-2 py-1 text-xs text-[#18181B] focus:outline-none"
                      >
                        <option value="serif">Serif (Formal)</option>
                        <option value="sans">Sans (Modern)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-medium text-[#71717A] mb-1">
                        Posisi Teks:
                      </label>
                      <select
                        value={textAlign}
                        onChange={(e) => setTextAlign(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#E4E4E7] rounded px-2 py-1 text-xs text-[#18181B] focus:outline-none"
                      >
                        <option value="center">Tengah</option>
                        <option value="left">Kiri</option>
                        <option value="right">Kanan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-medium text-[#71717A] mb-1">
                        Ukuran ({fontSize}pt):
                      </label>
                      <input
                        type="range"
                        min="16"
                        max="32"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full mt-1.5 accent-[#18181B] cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E4E4E7]">
                    <button
                      type="button"
                      onClick={copySampleNames}
                      className="text-xs text-[#71717A] hover:text-[#18181B] inline-flex items-center gap-1 font-medium"
                    >
                      <Copy className="size-3" />
                      {copiedNotice ? "5 Nama Tersalin!" : "Salin 5 Nama Sampel"}
                    </button>

                    <Link
                      href="/trial"
                      className="text-xs font-semibold text-[#18181B] hover:underline inline-flex items-center gap-1"
                    >
                      Buka Kanvas Penuh →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {}
        {/* Workflow Section */}
        <section id="alur" className="py-16 sm:py-20 px-4 sm:px-6 md:px-8 border-b border-[#E4E4E7] bg-[#FAFAFA]">
          <div className="max-w-[1240px] mx-auto">
            <div className="mb-10 text-center max-w-xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A] block mb-1">
                Alur Operasional
              </span>
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18181B]"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                Tiga tahap dari data tabel menjadi berkas siap cetak.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#FFFFFF] border border-[#E4E4E7] p-5 sm:p-6 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-[#71717A] block mb-2">01 / INPUT</span>
                  <h3 className="text-base font-semibold text-[#18181B] mb-1.5">Unggah Template Dokumen</h3>
                  <p className="text-xs text-[#71717A] leading-relaxed">
                    Gunakan file desain sertifikat dalam format PDF (A4 Landscape atau Portrait). Halaman multi-page juga didukung penuh.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#E4E4E7] flex items-center gap-1.5 text-xs font-medium text-[#18181B]">
                  <Check className="size-3.5 text-emerald-600" />
                  <span>Dukungan PDF Standar</span>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E4E4E7] p-5 sm:p-6 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-[#71717A] block mb-2">02 / MAPPING</span>
                  <h3 className="text-base font-semibold text-[#18181B] mb-1.5">Impor Tabel Data CSV</h3>
                  <p className="text-xs text-[#71717A] leading-relaxed">
                    Unggah daftar nama penerima yang diekspor dari Excel atau Google Sheets. Kolom terdeteksi otomatis baris demi baris.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#E4E4E7] flex items-center gap-1.5 text-xs font-medium text-[#18181B]">
                  <Check className="size-3.5 text-emerald-600" />
                  <span>Deteksi Header Kolom</span>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E4E4E7] p-5 sm:p-6 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-[#71717A] block mb-2">03 / EXPORT</span>
                  <h3 className="text-base font-semibold text-[#18181B] mb-1.5">Unduh Kumpulan PDF (ZIP)</h3>
                  <p className="text-xs text-[#71717A] leading-relaxed">
                    Browser Anda menggabungkan teks ke PDF dan mengemasnya dalam arsip ZIP rapi, siap didistribusikan ke peserta.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#E4E4E7] flex items-center gap-1.5 text-xs font-medium text-[#18181B]">
                  <Check className="size-3.5 text-emerald-600" />
                  <span>Arsip ZIP Terpecah Otomatis</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {}
        {/* Canvas Studio Precision Section */}
        <section id="fitur" className="py-16 sm:py-20 px-4 sm:px-6 md:px-8 border-b border-[#E4E4E7] bg-[#FFFFFF]">
          <div className="max-w-[1240px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A] block mb-1">
                  Kontrol Tipografi
                </span>
                <h2
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18181B]"
                  style={{ fontFamily: "var(--font-heading), sans-serif" }}
                >
                  Penataan posisi teks dengan akurasi 1 titik (pt).
                </h2>
              </div>
              <p className="text-[#71717A] text-xs sm:text-sm max-w-md font-normal leading-relaxed">
                Tidak perlu menebak koordinat. Manfaatkan garis bantu magnetik (*smart snap*) dan tombol panah keyboard (*nudge*) untuk hasil cetak yang simetris sempurna.
              </p>
            </div>

            {/* Interactive Functional Preview */}
            <div className="border border-[#E4E4E7] rounded-lg overflow-hidden bg-[#FAFAFA] shadow-xs">
              <div className="border-b border-[#E4E4E7] px-4 py-2.5 bg-[#FFFFFF] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sliders className="size-3.5 text-[#18181B]" />
                  <span className="font-semibold text-[#18181B]">Kanvas Inspektor SertiGen</span>
                  <span className="text-[#D4D4D8]">|</span>
                  <span className="text-[#71717A]">Demonstrasi Fitur Penataan</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#71717A]">
                  <span>Skala: 100% (A4)</span>
                </div>
              </div>

              {/* Mode Selector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#E4E4E7] bg-[#FFFFFF] text-xs">
                {canvasInteractiveModes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setStudioMode(mode.id)}
                    className={`py-2 px-3 text-left border-r border-[#E4E4E7] last:border-r-0 transition-colors ${
                      studioMode === mode.id
                        ? "bg-[#F4F4F5] text-[#18181B] font-semibold"
                        : "text-[#71717A] hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <div>{mode.label}</div>
                  </button>
                ))}
              </div>

              <div className="p-6 sm:p-8 flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden">
                {/* Visual Canvas Paper */}
                <div className="relative w-full max-w-[500px] aspect-[16/10] bg-[#FFFFFF] border border-[#E4E4E7] rounded shadow-xs flex flex-col justify-between p-4 overflow-hidden">
                  {/* Center Line Guides for Snap mode */}
                  {studioMode === "snap" && (
                    <>
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#18181B] opacity-50 z-20" />
                      <div className="absolute left-0 right-0 top-1/2 h-px bg-[#18181B] opacity-50 z-20" />
                      <div className="absolute top-2 right-2 text-[10px] font-medium bg-[#18181B] text-white px-2 py-0.5 rounded z-30">
                        Smart Snap: Terkunci di Sumbu Tengah
                      </div>
                    </>
                  )}

                  <div className="text-center pt-1 text-[9px] uppercase tracking-wider text-[#A1A1AA] font-semibold">
                    Lembaga Pendidikan Nasional
                  </div>

                  {/* Bounding Box that responds to mode */}
                  <div
                    className={`relative mx-auto transition-all duration-300 z-10 px-4 py-1.5 rounded ${
                      studioMode === "select"
                        ? "border border-dashed border-[#18181B] bg-[#F4F4F5]"
                        : studioMode === "drag"
                        ? "border border-solid border-[#18181B] bg-white shadow-md translate-x-3 translate-y-1"
                        : studioMode === "snap"
                        ? "border border-solid border-[#18181B] bg-white shadow-xs translate-x-0 translate-y-0"
                        : "border border-solid border-[#18181B] bg-white -translate-y-2.5"
                    }`}
                  >
                    <span className="font-serif font-bold text-sm text-[#18181B]">
                      Dr. Rian Hermawan, M.Kom
                    </span>
                  </div>

                  <div className="flex justify-between items-end text-[9px] text-[#A1A1AA] border-t border-[#E4E4E7] pt-1">
                    <span>No: CERT-2026-001</span>
                    <span>Tanda Tangan Tersemat</span>
                  </div>
                </div>

                <div className="mt-4 text-center text-xs text-[#71717A] max-w-md">
                  {canvasInteractiveModes.find((m) => m.id === studioMode)?.note}
                </div>
              </div>
            </div>
          </div>
        </section>

        {}
        {/* Target Segments Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 md:px-8 border-b border-[#E4E4E7] bg-[#FAFAFA]">
          <div className="max-w-[1240px] mx-auto">
            <div className="mb-10 text-center max-w-xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A] block mb-1">
                Kebutuhan Penggunaan
              </span>
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18181B]"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                Dirancang untuk berbagai jenis acara.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {useCases.map((uc, idx) => (
                <div key={idx} className="bg-[#FFFFFF] border border-[#E4E4E7] p-5 rounded-lg flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F4F4F5] text-[#52525B] inline-block mb-2.5">
                      {uc.tag}
                    </span>
                    <h3 className="text-sm font-semibold text-[#18181B] mb-1.5">{uc.title}</h3>
                    <p className="text-xs text-[#71717A] leading-relaxed">{uc.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#E4E4E7] flex items-center gap-1.5 text-xs font-medium text-[#18181B]">
                    <Check className="size-3 text-emerald-600" />
                    <span>Teruji Efisien</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {}
        {/* Pricing & Plan Comparison Section (SEO Optimized) */}
        <section id="perbandingan" className="py-16 sm:py-20 px-4 sm:px-6 md:px-8 border-b border-[#E4E4E7] bg-[#FFFFFF]">
          <div className="max-w-[1240px] mx-auto">
            <div className="mb-10 text-center max-w-xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A] block mb-1">
                Transparansi Biaya
              </span>
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18181B]"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                Struktur paket tanpa biaya tersembunyi.
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#71717A]">
                SertiGen beroperasi dengan model akses gratis mandiri. Gunakan mode uji coba instan atau akun cloud untuk penyimpanan acara Anda.
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-lg overflow-hidden max-w-4xl mx-auto shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] bg-[#FAFAFA] text-xs font-semibold uppercase text-[#71717A]">
                      <th className="p-3.5 font-semibold">Fitur & Kapasitas</th>
                      <th className="p-3.5 font-semibold w-40">Mode Trial (Tamu)</th>
                      <th className="p-3.5 font-semibold w-48 text-[#18181B] bg-black/5">Akun Cloud Gratis</th>
                      <th className="p-3.5 font-semibold w-48 text-amber-900 bg-amber-500/10">
                        <div className="flex items-center gap-1.5">
                          <span>Paket Premium</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-600 text-white font-bold tracking-wider">
                            COMING SOON
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7]">
                    {[
                      {
                        feature: "Biaya Layanan (Harga)",
                        trial: "Rp 0 (Gratis)",
                        cloud: "Rp 0 (Gratis Selamanya)",
                        premium: "Segera Diumumkan",
                      },
                      {
                        feature: "Kapasitas Event Tersimpan",
                        trial: "1 Sesi Sementara di Browser",
                        cloud: "1 Event Aktif di Cloud (Bebas Ganti)",
                        premium: "Multi-Event Simultan Tanpa Batas",
                      },
                      {
                        feature: "Kewajiban Login",
                        trial: "Tanpa Daftar (Instan)",
                        cloud: "Daftar Akun / Google",
                        premium: "Akun Terverifikasi",
                      },
                      {
                        feature: "Batas Bebas Watermark",
                        trial: "Hingga 50 Sertifikat / Sesi",
                        cloud: "Tanpa Batas (Unlimited)",
                        premium: "Tanpa Batas (Unlimited)",
                      },
                      {
                        feature: "Penyimpanan Template & Aset",
                        trial: "Sementara di Browser (IndexedDB)",
                        cloud: "Cloud Storage (1 Event Aktif)",
                        premium: "Cloud Multi-Event & Arsip Permanen",
                      },
                      {
                        feature: "Portal Unduh Mandiri Peserta",
                        trial: "Tidak Termasuk",
                        cloud: "Tautan Publik per Acara",
                        premium: "Tautan Publik + Kustom Branding Penuh",
                      },
                      {
                        feature: "Analitik Unduhan Peserta",
                        trial: "Tidak Termasuk",
                        cloud: "Riwayat Status Dasar",
                        premium: "Rekapitulasi Lengkap & Laporan Unduh",
                      },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="p-3.5 text-[#18181B] font-medium">{row.feature}</td>
                        <td className="p-3.5 text-[#71717A]">{row.trial}</td>
                        <td className="p-3.5 text-[#18181B] font-semibold bg-black/5">{row.cloud}</td>
                        <td className="p-3.5 text-amber-900 font-semibold bg-amber-500/5">{row.premium}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Explicit Refund & Cancellation Terms */}
              <div className="bg-[#FAFAFA] border-t border-[#E4E4E7] p-4 text-xs space-y-2 text-[#52525B]">
                <div className="flex items-start gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Kebijakan Pembatalan & Pengembalian Dana:</strong> SertiGen beroperasi tanpa tagihan berulang (*no recurring subscription fees*). Anda dapat berhenti menggunakan layanan dan menghapus data acara sewaktu-waktu dari dashboard tanpa denda maupun penalti finansial.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Roadmap Paket Premium (Segera Hadir):</strong> Dikhususkan bagi institusi atau *event organizer* yang memerlukan pengelolaan banyak acara sekaligus secara simultan tanpa harus menghapus event sebelumnya, serta membutuhkan kustomisasi branding eksklusif pada portal peserta.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-center text-[11px] text-[#A1A1AA] mt-2 sm:hidden">
              ← Geser tabel ke samping untuk melihat detail paket →
            </p>
          </div>
        </section>

        {}
        {/* PDF Background Compression Calculator */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 md:px-8 border-b border-[#E4E4E7] bg-[#FAFAFA]">
          <div className="max-w-[1240px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A] block mb-1">
                  Efisiensi Memori
                </span>
                <h2
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18181B]"
                  style={{ fontFamily: "var(--font-heading), sans-serif" }}
                >
                  Arsip ZIP tetap ringan untuk ribuan dokumen.
                </h2>
              </div>
              <p className="text-[#71717A] text-xs sm:text-sm max-w-md font-normal leading-relaxed">
                Template grafis berukuran besar membuat file unduhan bengkak jika dikalikan ratusan peserta. Atur kualitas kompresi latar dokumen secara mandiri sebelum diekspor.
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E4E4E7] p-5 sm:p-6 rounded-lg">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                      <span className="text-[#71717A]">Skala Resample Kanvas</span>
                      <span className="text-[#18181B] font-bold">{simScale.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={simScale}
                      onChange={(e) => setSimScale(Number(e.target.value))}
                      className="w-full accent-[#18181B] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                      <span className="text-[#71717A]">Kualitas Gambar Latar</span>
                      <span className="text-[#18181B] font-bold">{Math.round(simQuality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={simQuality}
                      onChange={(e) => setSimQuality(Number(e.target.value))}
                      className="w-full accent-[#18181B] cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-[#FAFAFA] rounded border border-[#E4E4E7] text-xs">
                    <span className="text-[#71717A] block text-[10px] uppercase font-semibold mb-0.5">Simulasi Ukuran Berkas:</span>
                    <span className="text-[#18181B]">
                      Ukuran rata-rata dokumen menyusut dari <strong>{baseSizeMB} MB</strong> menjadi <strong>{optimizedSizeMB} MB</strong>.
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-6 grid grid-cols-2 gap-3">
                  <div className="bg-[#FAFAFA] border border-[#E4E4E7] p-4 rounded-lg flex flex-col justify-between">
                    <span className="text-xs text-[#71717A] block mb-1">Ukuran Asli</span>
                    <div
                      className="text-2xl font-bold text-[#18181B]"
                      style={{ fontFamily: "var(--font-heading), sans-serif" }}
                    >
                      {baseSizeMB} MB
                    </div>
                  </div>

                  <div className="bg-[#FFFFFF] border border-[#18181B] p-4 rounded-lg flex flex-col justify-between">
                    <span className="text-xs text-[#18181B] font-bold block mb-1">Setelah Dioptimasi</span>
                    <div
                      className="text-2xl font-bold text-[#18181B]"
                      style={{ fontFamily: "var(--font-heading), sans-serif" }}
                    >
                      {optimizedSizeMB} MB
                    </div>
                    <span className="text-[11px] text-[#71717A] mt-2 pt-1 border-t border-[#E4E4E7]">
                      Penghematan: <strong className="text-[#18181B]">{savingsPercent}%</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Specs Section */}
        <section id="spesifikasi" className="py-16 sm:py-20 px-4 sm:px-6 md:px-8 border-b border-[#E4E4E7] bg-[#FFFFFF]">
          <div className="max-w-[1240px] mx-auto">
            <div className="mb-8">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A] block mb-1">
                Kesesuaian Sistem
              </span>
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18181B]"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                Spesifikasi perangkat & kompatibilitas data.
              </h2>
            </div>

            <div className="border-t border-[#E4E4E7] divide-y divide-[#E4E4E7]">
              {technicalSpecs.map((spec, idx) => (
                <div
                  key={spec.label}
                  className="py-3.5 grid grid-cols-1 md:grid-cols-12 gap-2 items-baseline text-xs"
                >
                  <div className="md:col-span-1 font-bold text-[#71717A]">0{idx + 1}</div>
                  <div className="md:col-span-3 font-semibold text-[#52525B] uppercase text-[11px]">
                    {spec.label}
                  </div>
                  <div className="md:col-span-4 font-semibold text-[#18181B]">{spec.value}</div>
                  <div className="md:col-span-4 text-[#71717A]">{spec.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {}
        {/* FAQ Section */}
        <section id="faq" className="py-16 sm:py-20 px-4 sm:px-6 md:px-8 border-b border-[#E4E4E7] bg-[#FAFAFA]">
          <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A] block mb-1">
                Pusat Bantuan
              </span>
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18181B]"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                Pertanyaan umum & kebijakan produk.
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#71717A] leading-relaxed">
                Jawaban ringkas seputar kepemilikan data, format file yang didukung, ketiadaan tagihan berulang, dan mekanisme kerja mesin lokal.
              </p>
            </div>

            <div className="lg:col-span-7 divide-y divide-[#E4E4E7] border-y border-[#E4E4E7] bg-[#FFFFFF] px-4 sm:px-6 rounded-lg">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={faq.id} className="py-4">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="w-full flex justify-between items-center text-left py-0.5"
                    >
                      <span className="text-xs sm:text-sm font-semibold text-[#18181B] pr-3">{faq.q}</span>
                      <ChevronDown
                        className={`size-4 text-[#71717A] shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-[#18181B]" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="mt-2 pt-1 text-xs text-[#71717A] leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#FFFFFF] py-10 px-4 sm:px-6 md:px-8 text-xs text-[#71717A]">
        <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-[#E4E4E7] pb-8">
          <div>
            <span
              className="text-base font-bold text-[#18181B] block mb-1"
              style={{ fontFamily: "var(--font-heading), sans-serif" }}
            >
              SertiGen
            </span>
            <p className="text-xs text-[#71717A]">
              Platform Pembuat Sertifikat Massal Otomatis Berbasis Rust WebAssembly.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 sm:gap-6 text-xs font-medium">
            <a href="#alur" className="hover:text-[#18181B]">Alur Kerja</a>
            <a href="#simulator" className="hover:text-[#18181B]">Simulator</a>
            <a href="#fitur" className="hover:text-[#18181B]">Presisi Kanvas</a>
            <a href="#perbandingan" className="hover:text-[#18181B]">Paket & Biaya</a>
            <a href="#faq" className="hover:text-[#18181B]">FAQ & Refund</a>
            <a href="/llms.txt" target="_blank" className="hover:text-[#18181B]">llms.txt</a>
          </div>
        </div>

        <div className="max-w-[1240px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 text-xs text-center sm:text-left">
          <span>© {new Date().getFullYear()} SertiGen. Seluruh hak cipta dilindungi.</span>
          <div className="flex items-center gap-3 text-[#71717A]">
            <span>Komputasi Lokal di Browser</span>
            <span className="text-[#D4D4D8]">•</span>
            <span>Bebas Tagihan Berulang</span>
            <span className="text-[#D4D4D8]">•</span>
            <span>Kebijakan Privasi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
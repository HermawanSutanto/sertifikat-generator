"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileSpreadsheet,
  Folder,
  HelpCircle,
  Menu,
  MousePointer,
  Pause,
  Play,
  Printer,
  RefreshCw,
  Sliders,
  Sparkles,
  Type,
  X,
  Zap,
} from "lucide-react";
import AuthNav from "./AuthNav";

const headingFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading",
});

const sansFont = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

const faqs = [
  {
    q: "Berapa biaya langganan SertiGen dan apa saja paket yang tersedia?",
    a: "SertiGen saat ini 100% GRATIS (Rp 0). Tersedia Mode Trial (tanpa login, bebas watermark hingga 50 lembar pertama per sesi) dan Akun Cloud Gratis (diberikan 1 akses penyimpanan event aktif di cloud, bebas watermark tanpa batas kuota peserta per acara, penyimpanan template permanen, serta portal unduh mandiri untuk peserta). Anda dapat menghapus atau mengganti event tersebut kapan saja untuk mengadakan acara baru. Selain itu, Paket Premium (Coming Soon / Segera Hadir) sedang dipersiapkan untuk pengguna yang membutuhkan pengelolaan multi-event aktif simultan tanpa batas, custom branding, dan integrasi webhook otomatis.",
  },
  {
    q: "Bagaimana kebijakan pembatalan akun dan pengembalian dana (Refund Policy)?",
    a: "Karena SertiGen beroperasi dengan model akses gratis (Rp 0) tanpa biaya langganan berulang otomatis (no recurring fees), pengguna dapat berhenti menggunakan layanan atau menghapus akun beserta data acaranya sewaktu-waktu dari dashboard tanpa penalti, denda, atau potongan finansial apa pun. Saat acara dihapus, seluruh database peserta dan aset berkas di penyimpanan awan akan dibersihkan secara permanen. Jika di masa depan tersedia add-on berbayar prioritas, garansi pengembalian dana 7 hari kerja berlaku apabila terjadi kendala teknis sistem.",
  },
  {
    q: "Apakah SertiGen menyediakan API publik atau integrasi pihak ketiga?",
    a: "Saat ini SertiGen beroperasi secara mandiri di sisi peramban klien (client-side) dan belum membuka Public REST API terbuka. Untuk integrasi data, SertiGen mendukung penuh seluruh berkas CSV hasil ekspor dari Microsoft Excel, Google Sheets, LibreOffice Calc, dan Notion Database. Integrasi otomatis via webhook formulir (Google Forms, Typeform, Zapier) dan plugin LMS sedang dalam peta jalan (roadmap) pembaruan berikutnya.",
  },
  {
    q: "Apakah SertiGen benar-benar bisa dicoba gratis tanpa daftar?",
    a: "Ya! Anda bisa langsung mencoba membuat sertifikat secara massal tanpa perlu mendaftar akun terlebih dahulu pada mode uji coba (Trial). Mode uji coba ini bebas watermark hingga 50 lembar pertama dan diproses murni di memori browser lokal Anda.",
  },
  {
    q: "Format file apa saja yang didukung untuk template dan data?",
    a: "Template utama menggunakan format dokumen PDF (A4 Landscape atau Portrait), sementara daftar nama peserta diimpor menggunakan file CSV (tabel berpemisah koma atau titik koma yang bisa diekspor dari Microsoft Excel, Google Sheets, atau aplikasi spreadsheet lainnya).",
  },
  {
    q: "Bagaimana cara memasukkan ratusan nama peserta sekaligus?",
    a: "Cukup simpan tabel daftar nama dari Excel ke format CSV, lalu unggah ke SertiGen. Sistem akan otomatis mendeteksi kolom nama baris demi baris tanpa perlu copy-paste manual satu per satu ke lembar desain.",
  },
  {
    q: "Apakah data nama dan file saya aman dari pihak ketiga?",
    a: "Sangat aman. Pada mode Trial dan Studio Mandiri, seluruh proses penggabungan dokumen berjalan murni di dalam memori komputer Anda (WebAssembly) dan tidak ada transmisi data nama atau email peserta ke server pihak ketiga.",
  },
  {
    q: "Bisakah saya mengatur posisi, jenis huruf, dan warna teks?",
    a: "Tentu. Anda memiliki kendali penuh untuk menggeser letak teks langsung di kanvas, mengatur garis bantu magnetik (smart snap), pergeseran mikro per 1 titik (keyboard nudge), ukuran font, perataan, warna tinta, hingga menggunakan koleksi font bawaan atau mengunggah font kustom sendiri (.ttf/.otf).",
  },
];

const technicalSpecs = [
  {
    label: "Mesin Komputasi",
    value: "Rust WebAssembly & Web Worker",
    desc: "Pemrosesan lokal di memori browser agar komputer tidak ngadat",
  },
  {
    label: "Rekomendasi Browser",
    value: "Google Chrome, Microsoft Edge, Brave",
    desc: "Performa paling optimal dengan dukungan penuh multi-threading",
  },
  {
    label: "Spesifikasi RAM",
    value: "Minimal 4 GB (Disarankan 8 GB+)",
    desc: "Dibutuhkan untuk merender arsip ZIP massal 1.000+ lembar dokumen",
  },
  {
    label: "Dukungan Integrasi Data",
    value: "CSV dari Excel, Google Sheets, Notion",
    desc: "Kompatibel dengan seluruh aplikasi spreadsheet standar",
  },
  {
    label: "Format Input & Output",
    value: "Template PDF → ZIP Siap Cetak",
    desc: "Menghasilkan file PDF terpisah per peserta dalam satu folder ZIP",
  },
  {
    label: "Biaya Layanan & Pembatalan",
    value: "Rp 0 (Bebas Batalkan Kapan Saja)",
    desc: "Tanpa langganan berulang, penghapusan akun instan tanpa penalti",
  },
];

const useCases = [
  {
    id: "webinar",
    badge: "EVENT DIGITAL",
    title: "Webinar & Seminar Online",
    desc: "Kirim sertifikat kehadiran untuk ratusan peserta tepat waktu tanpa lelah salin-tempel nama manual.",
  },
  {
    id: "workshop",
    badge: "PELATIHAN",
    title: "Lembaga Kursus & Pelatihan",
    desc: "Cetak sertifikat kelulusan profesional lengkap dengan nomor urut dan predikat peserta yang rapi.",
  },
  {
    id: "academic",
    badge: "PENDIDIKAN",
    title: "Sekolah & Kampus",
    desc: "Kelola piagam kegiatan ekstrakurikuler, kepanitiaan, atau lomba antar kelas dalam hitungan menit.",
  },
  {
    id: "community",
    badge: "KOMUNITAS",
    title: "Komunitas & Panitia Acara",
    desc: "Solusi cepat buat panitia yang butuh bikin piagam massal tanpa aplikasi desain yang berat.",
  },
];

const sampleBatchNames = [
  "Alexander Pratama, M.Kom",
  "Nadia Safitri, S.Ds",
  "Budi Santoso",
  "Siti Rahmawati, S.E",
  "Dimas Anggara, S.T",
];

const studioSteps = [
  {
    id: 0,
    title: "Pilih Kolom Nama",
    action: "Klik Kotak Elemen",
    inspectorVal: "Nama (Aktif)",
    coord: "X: 355pt | Y: 245pt",
    guide: "Klik kotak teks pada sertifikat untuk mengatur ukuran dan posisi letak nama.",
  },
  {
    id: 1,
    title: "Geser Posisi",
    action: "Seret ke Tengah",
    inspectorVal: "Nama (Digeser)",
    coord: "X: 390pt | Y: 278pt",
    guide: "Pindahkan posisi nama ke area kosong yang pas dengan gerakan mouse atau jari.",
  },
  {
    id: 2,
    title: "Garis Bantu Otomatis",
    action: "Terkunci di Tengah",
    inspectorVal: "Nama (Terkunci)",
    coord: "X: 421pt | Y: 298pt",
    guide: "Garis bantu magnetik otomatis mengunci posisi teks agar pas di tengah-tengah.",
  },
  {
    id: 3,
    title: "Geser Mikro (Nudge)",
    action: "Pakai Tombol Panah",
    inspectorVal: "Nama (Presisi)",
    coord: "X: 421pt | Y: 288pt",
    guide: "Tekan tombol panah di keyboard untuk menggeser posisi teks setitik demi setitik.",
  },
  {
    id: 4,
    title: "Ganti Font",
    action: "Pilih Gaya Huruf",
    inspectorVal: "Playfair Display",
    coord: "X: 421pt | Y: 288pt",
    guide: "Pilih jenis huruf yang cocok dari daftar koleksi atau upload font sendiri.",
  },
];

const STEP_DURATION_MS = 3500;

export default function LandingPage() {
  const [sampleName, setSampleName] = useState("Alexander Pratama, M.Kom");
  const [fontSize, setFontSize] = useState(24);
  const [fontFamilyType, setFontFamilyType] = useState("font-serif");
  const [isGenerating, setIsGenerating] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [printedSheets, setPrintedSheets] = useState([]);
  const [currentPrintIndex, setCurrentPrintIndex] = useState(0);

  const [editorStep, setEditorStep] = useState(0);
  const [isEditorPaused, setIsEditorPaused] = useState(false);

  const [simScale, setSimScale] = useState(1.5);
  const [simQuality, setSimQuality] = useState(0.8);
  const baseOriginalSizeMB = 12.5;

  const calculateOptimizedSize = () => {
    const ratio = (simScale / 2.0) * simQuality;
    const result = Math.max(0.6, baseOriginalSizeMB * ratio * 0.22);
    return result.toFixed(1);
  };
  const optimizedSizeMB = calculateOptimizedSize();
  const savingsPercent = Math.round((1 - optimizedSizeMB / baseOriginalSizeMB) * 100);

  useEffect(() => {
    if (isEditorPaused) return;

    const timer = setInterval(() => {
      setEditorStep((prev) => (prev + 1) % studioSteps.length);
    }, STEP_DURATION_MS);

    return () => clearInterval(timer);
  }, [isEditorPaused, editorStep]);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const copySampleNames = () => {
    const list = sampleBatchNames.join("\n");
    navigator.clipboard.writeText(list);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const triggerSimulatedGeneration = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setPrintedSheets([]);
    setCurrentPrintIndex(0);

    sampleBatchNames.forEach((name, index) => {
      setTimeout(() => {
        setSampleName(name);
        setCurrentPrintIndex(index + 1);

        setPrintedSheets((prev) => [
          ...prev,
          {
            id: index,
            name,
            offsetY: -((index + 1) * 3),
          },
        ]);

        if (index === sampleBatchNames.length - 1) {
          setTimeout(() => {
            setIsGenerating(false);
          }, 400);
        }
      }, index * 240);
    });
  };

  const currentStepData = studioSteps[editorStep] || studioSteps[0];

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
          description: "Akses gratis selamanya untuk Mode Trial dan Akun Cloud (1 event aktif tersimpan di cloud) tanpa biaya langganan berulang.",
        },
        description:
          "Platform pembuat sertifikat massal otomatis dari file CSV/Excel dan template PDF bertenaga Rust WebAssembly. Cepat, aman, dan tanpa biaya langganan.",
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
      className={`${headingFont.variable} ${sansFont.variable} bg-[#FFFFFF] text-[#111111] min-h-screen selection:bg-[#111111] selection:text-white antialiased overflow-x-hidden`}
      style={{ fontFamily: "var(--font-sans), sans-serif" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />
      <style>{`@keyframes stepProgressFill { from { width: 0%; } to { width: 100%; } }`}</style>

      {/* Top Utility Bar */}
      <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280] text-[11px] sm:text-xs py-2 px-4 sm:px-6">
        <div className="max-w-[1320px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-4 font-normal">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">Pemrosesan lokal aktif di browser • Tanpa biaya langganan</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[#6B7280]">
            <span>Mendukung Excel / CSV</span>
            <span className="text-[#D1D5DB]">/</span>
            <span>Bebas Batal Kapan Saja</span>
          </div>
        </div>
      </div>

      {/* Main Sticky Header with Mobile Navigation Drawer */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 border-b border-[#E5E7EB] backdrop-blur-md">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <Link
            href="/"
            className="text-lg sm:text-xl font-bold tracking-tight text-[#111111]"
            style={{ fontFamily: "var(--font-heading), sans-serif" }}
          >
            SertiGen
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-7 text-[13px] text-[#6B7280] font-medium">
            <a href="#cara-kerja" className="hover:text-[#111111] transition-colors">
              Cara Kerja
            </a>
            <a href="#simulator" className="hover:text-[#111111] transition-colors">
              Simulator
            </a>
            <a href="#studio" className="hover:text-[#111111] transition-colors">
              Fitur Kanvas
            </a>
            <a href="#perbandingan" className="hover:text-[#111111] transition-colors">
              Paket & Harga
            </a>
            <a href="#optimizer" className="hover:text-[#111111] transition-colors">
              Kompresi
            </a>
            <a href="#faq" className="hover:text-[#111111] transition-colors">
              FAQ & Kebijakan
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Suspense fallback={<div className="h-8 w-16 bg-[#F5F5F5] rounded-[4px]" />}>
              <AuthNav />
            </Suspense>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md border border-[#E5E7EB] text-[#111111] hover:bg-[#F9FAFB] transition-colors"
              aria-label={mobileMenuOpen ? "Tutup Menu" : "Buka Menu"}
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-[#E5E7EB] bg-[#FFFFFF] px-4 py-4 space-y-3 shadow-lg">
            <div className="grid grid-cols-2 gap-2 text-xs font-medium text-[#4B5563]">
              <a
                href="#cara-kerja"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-md hover:bg-[#F3F4F6] transition-colors"
              >
                Cara Kerja
              </a>
              <a
                href="#simulator"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-md hover:bg-[#F3F4F6] transition-colors"
              >
                Simulator
              </a>
              <a
                href="#studio"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-md hover:bg-[#F3F4F6] transition-colors"
              >
                Fitur Kanvas
              </a>
              <a
                href="#perbandingan"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-md hover:bg-[#F3F4F6] transition-colors"
              >
                Paket & Harga
              </a>
              <a
                href="#optimizer"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-md hover:bg-[#F3F4F6] transition-colors"
              >
                Kompresi
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-md hover:bg-[#F3F4F6] transition-colors"
              >
                Tanya Jawab (FAQ)
              </a>
            </div>

            <div className="pt-2 border-t border-[#E5E7EB] flex flex-col gap-2">
              <Link
                href="/trial"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center bg-[#111111] text-white py-2.5 px-4 rounded-md text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Zap className="size-3.5 text-amber-400" />
                <span>Coba Trial Langsung (Gratis)</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      <main id="main-content">
        {/* HERO SECTION */}
        <section className="pt-10 sm:pt-16 pb-16 sm:pb-20 px-4 sm:px-6 md:px-12 border-b border-[#E5E7EB]">
          <div className="max-w-[1320px] mx-auto grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <div className="lg:col-span-7 flex flex-col pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] w-fit mb-4 sm:mb-5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] sm:text-xs font-medium text-[#4B5563]">
                  100% Gratis • Bebas Watermark • Tanpa Langganan
                </span>
              </div>

              <h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-bold leading-[1.14] tracking-[-0.8px] sm:tracking-[-1.2px] text-[#111111]"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                Cara gampang cetak ratusan sertifikat dari Excel & CSV tanpa ribet ganti nama manual.
              </h1>

              <p className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg text-[#6B7280] font-normal max-w-xl leading-relaxed">
                Capek salin nama satu demi satu di Canva atau pusing karena tata letak Mail Merge Word sering bergeser? Cukup upload template PDF, masukkan file CSV dari Excel atau Google Sheets, dan biarkan browser Anda merender ratusan sertifikat siap cetak seketika.
              </p>

              {/* Action Buttons */}
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/trial"
                  className="inline-flex items-center justify-center gap-2 bg-[#111111] text-white px-5 py-3 rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-[#333333] transition-colors"
                >
                  <Zap className="size-3.5 text-amber-400" />
                  Coba Trial Tanpa Login (Rp 0)
                  <ArrowRight className="size-3.5" />
                </Link>

                <Link
                  href="/register"
                  className="inline-flex items-center justify-center px-4 py-3 rounded-md border border-[#E5E7EB] bg-transparent text-[#111111] text-xs font-semibold uppercase tracking-wider hover:bg-[#F9FAFB] transition-colors"
                >
                  Daftar Akun Cloud Gratis
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-[#6B7280] font-normal">
                <span>✓ Bebas watermark hingga 50 lembar pada mode trial</span>
                <span className="text-[#D1D5DB] hidden sm:inline">•</span>
                <span>✓ Tanpa kartu kredit / biaya tersembunyi</span>
                <span className="text-[#D1D5DB] hidden sm:inline">•</span>
                <span>✓ Diproses lokal di memori perangkat</span>
              </div>

              {/* Value Metrics Grid */}
              <div className="mt-10 sm:mt-12 pt-6 border-t border-[#E5E7EB] grid grid-cols-3 gap-3 sm:gap-6">
                <div>
                  <div className="text-sm sm:text-base font-semibold text-[#111111]" style={{ fontFamily: "var(--font-heading), sans-serif" }}>Vektor Tajam</div>
                  <div className="text-[11px] sm:text-xs text-[#6B7280] mt-0.5">Teks nama jernih dicetak</div>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-semibold text-[#111111]" style={{ fontFamily: "var(--font-heading), sans-serif" }}>Biaya Layanan</div>
                  <div className="text-[11px] sm:text-xs text-emerald-700 font-semibold mt-0.5">Rp 0 (Selamanya)</div>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-semibold text-[#111111]" style={{ fontFamily: "var(--font-heading), sans-serif" }}>Privasi Aman</div>
                  <div className="text-[11px] sm:text-xs text-[#6B7280] mt-0.5">Data aman di browser</div>
                </div>
              </div>
            </div>

            {/* Right Side: Interactive Simulator */}
            <div id="simulator" className="lg:col-span-5 w-full">
              <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg p-4 sm:p-5 shadow-xs">
                <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-2.5 mb-3 sm:mb-4 text-xs font-medium text-[#6B7280]">
                  <span className="uppercase tracking-wider text-[11px] sm:text-xs">Simulasi Cetak Nama</span>
                  <span className="text-[#111111] font-semibold text-[11px] sm:text-xs">
                    {isGenerating ? `Mencetak 0${currentPrintIndex}/05` : "Uji Coba Langsung"}
                  </span>
                </div>

                <div className="relative aspect-[16/10] overflow-hidden border border-[#E5E7EB] rounded-md bg-[#F9FAFB]">
                  {/* Background Template Asli */}
                  <img
                    src="/background.webp"
                    alt="Background Template Sertifikat"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
                    onError={(e) => {
                      if (!e.currentTarget.src.endsWith(".png")) {
                        e.currentTarget.src = "/templates/template_01_preview.png";
                      } else {
                        e.currentTarget.style.display = "none";
                      }
                    }}
                  />

                  {printedSheets.map((sheet, idx) => (
                    <div
                      key={sheet.id}
                      style={{
                        transform: `translateY(${sheet.offsetY}px)`,
                        zIndex: 10 + idx,
                      }}
                      className="absolute inset-0 bg-[#FFFFFF]/95 backdrop-blur-[1px] border border-[#E5E7EB] p-3 sm:p-4 rounded-md flex flex-col justify-between transition-all overflow-hidden"
                    >
                      <img
                        src="/background.webp"
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-90 select-none z-0"
                        onError={(e) => {
                          if (!e.currentTarget.src.endsWith(".png")) {
                            e.currentTarget.src = "/templates/template_01_preview.png";
                          } else {
                            e.currentTarget.style.display = "none";
                          }
                        }}
                      />

                      <div className="relative z-10 flex justify-between items-center text-[10px] sm:text-xs text-[#6B7280] border-b border-[#E5E7EB]/80 pb-1">
                        <span>Lembar #0{sheet.id + 1}</span>
                        <span className="text-emerald-700 font-semibold">SELESAI</span>
                      </div>

                      <div className="relative z-10 text-center my-auto">
                        <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#6B7280] mb-0.5 sm:mb-1 font-medium">
                          Sertifikat Pelatihan
                        </div>
                        <div className="text-sm sm:text-base font-semibold text-[#111111] truncate px-2">
                          {sheet.name}
                        </div>
                      </div>

                      <div className="relative z-10 flex justify-between items-center text-[10px] sm:text-xs text-[#6B7280] pt-1 border-t border-[#E5E7EB]/80">
                        <span>PDF Siap Cetak</span>
                        <span>Lokal</span>
                      </div>
                    </div>
                  ))}

                  <div className="relative z-10 p-4 sm:p-5 h-full flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] sm:text-xs uppercase tracking-wider text-[#6B7280] mb-1 font-medium">
                      Pratinjau Sertifikat Pelatihan
                    </div>

                    <div
                      className={`${fontFamilyType} text-[#111111] my-1 sm:my-2 font-semibold px-2 sm:px-4 break-words max-w-full leading-tight`}
                      style={{ fontSize: `${Math.max(16, fontSize - 4)}px` }}
                    >
                      {sampleName || "Nama Peserta"}
                    </div>

                    <p className="text-[10px] sm:text-xs text-[#6B7280] max-w-[240px] sm:max-w-[260px] leading-relaxed mt-0.5">
                      Telah mengikuti dan menyelesaikan kegiatan dengan baik.
                    </p>

                    <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-[#E5E7EB] w-40 sm:w-48 flex justify-between text-[10px] sm:text-xs text-[#6B7280]">
                      <span>Format: PDF</span>
                      <span className="text-emerald-700 font-medium">Status: Siap</span>
                    </div>

                    {isGenerating && (
                      <div className="absolute inset-0 bg-[#FFFFFF]/90 text-[#111111] flex flex-col items-center justify-center text-xs gap-2 z-40 font-medium">
                        <RefreshCw className="size-4 animate-spin text-[#111111]" />
                        <span>Menyusun sertifikat...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Simulator Controls */}
                <div className="mt-3 sm:mt-4 space-y-3">
                  <div>
                    <label
                      htmlFor="interactive-name"
                      className="block text-[11px] sm:text-xs uppercase font-medium text-[#6B7280] mb-1"
                    >
                      Coba Ubah Nama Peserta:
                    </label>
                    <input
                      id="interactive-name"
                      type="text"
                      value={sampleName}
                      onChange={(e) => setSampleName(e.target.value)}
                      placeholder="Masukkan nama..."
                      className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-md px-3 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div>
                      <label className="block text-[11px] sm:text-xs uppercase font-medium text-[#6B7280] mb-1">
                        Gaya Huruf:
                      </label>
                      <select
                        value={fontFamilyType}
                        onChange={(e) => setFontFamilyType(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-md px-2 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                      >
                        <option value="font-serif">Serif (Klasik & Formal)</option>
                        <option value="font-sans">Sans (Bersih & Modern)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] sm:text-xs uppercase font-medium text-[#6B7280] mb-1">
                        Ukuran ({fontSize}pt):
                      </label>
                      <input
                        type="range"
                        min="16"
                        max="36"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full mt-1.5 accent-[#111111] cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={copySampleNames}
                      className="text-xs text-[#6B7280] hover:text-[#111111] inline-flex items-center justify-center gap-1.5 font-medium py-1"
                    >
                      <Copy className="size-3" />
                      {copiedNotification ? "Tersalin!" : "Salin 5 Nama Sampel"}
                    </button>

                    <button
                      type="button"
                      onClick={triggerSimulatedGeneration}
                      disabled={isGenerating}
                      className="bg-[#111111] text-white text-xs font-medium uppercase px-3.5 py-2 sm:py-1.5 rounded-md hover:bg-[#333333] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      <Printer className="size-3" />
                      Uji Cetak 5 Lembar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="cara-kerja" className="py-16 sm:py-20 px-4 sm:px-6 md:px-12 border-b border-[#E5E7EB] bg-[#FAFAFA]">
          <div className="max-w-[1320px] mx-auto">
            <div className="mb-10 sm:mb-12 text-center max-w-xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5 sm:mb-2">
                Alur Pembuatan
              </span>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#111111]"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                Cara buat ratusan sertifikat dalam 3 langkah.
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#6B7280] font-normal">
                Tidak perlu pusing ngoding atau edit satu-satu. Sistem langsung menyusun semuanya dari data tabel Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {[
                { step: "01", title: "Upload Template PDF", desc: "Masukkan file desain sertifikat Anda dalam format PDF standar." },
                { step: "02", title: "Masukkan Daftar CSV", desc: "Upload file CSV berisi nama-nama peserta dari Excel, Google Sheets, atau Notion." },
                { step: "03", title: "Download ZIP", desc: "Browser otomatis menyusun ratusan file PDF siap cetak dalam satu folder arsip ZIP." },
              ].map((step) => (
                <div
                  key={step.step}
                  className="bg-[#FFFFFF] border border-[#E5E7EB] p-5 sm:p-6 rounded-lg flex flex-col justify-between"
                >
                  <div>
                    <span
                      className="text-xl sm:text-2xl font-bold text-[#111111] block mb-2 sm:mb-3"
                      style={{ fontFamily: "var(--font-heading), sans-serif" }}
                    >
                      {step.step}
                    </span>
                    <h3 className="text-sm sm:text-base font-semibold text-[#111111] mb-1.5 sm:mb-2">
                      {step.title}
                    </h3>
                    <p className="text-xs text-[#6B7280] leading-relaxed font-normal">
                      {step.desc}
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-6 pt-3 border-t border-[#E5E7EB] flex items-center gap-1.5 text-xs font-medium text-[#111111]">
                    <Check className="size-3.5 text-emerald-600" />
                    <span>Otomatis & Cepat</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STUDIO CANVAS SECTION */}
        <section id="studio" className="py-16 sm:py-20 px-4 sm:px-6 md:px-12 border-b border-[#E5E7EB]">
          <div className="max-w-[1320px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 sm:mb-10 gap-3 sm:gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5 sm:mb-2">
                  Pengaturan Kanvas
                </span>
                <h2
                  className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#111111]"
                  style={{ fontFamily: "var(--font-heading), sans-serif" }}
                >
                  Atur posisi nama dengan presisi tinggi.
                </h2>
              </div>
              <p className="text-[#6B7280] max-w-md text-xs sm:text-sm font-normal leading-relaxed">
                Tarik kotak nama langsung di lembar kerja, pakai garis bantu otomatis (smart snap), atau geser pakai tombol panah keyboard untuk kerapian sempurna.
              </p>
            </div>

            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden bg-[#FFFFFF] shadow-xs">
              <div className="h-10 sm:h-11 border-b border-[#E5E7EB] px-3 sm:px-4 flex items-center justify-between text-xs bg-[#FFFFFF]">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="flex items-center gap-1 sm:gap-1.5 mr-1 shrink-0">
                    <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#E5E7EB]" />
                    <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#E5E7EB]" />
                    <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#E5E7EB]" />
                  </div>
                  <span className="text-[#111111] font-semibold text-xs shrink-0">SertiGen Studio</span>
                  <span className="text-[#D1D5DB]">/</span>
                  <span className="text-[#6B7280] text-xs truncate">template_sertifikat.pdf</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditorPaused(!isEditorPaused)}
                    className="text-[11px] sm:text-xs text-[#6B7280] hover:text-[#111111] inline-flex items-center gap-1 border border-[#E5E7EB] bg-[#F9FAFB] px-2 sm:px-2.5 py-1 rounded-md font-medium"
                  >
                    {isEditorPaused ? (
                      <>
                        <Play className="size-2.5 fill-current" />
                        <span className="hidden sm:inline">Lanjut Simulasi</span>
                      </>
                    ) : (
                      <>
                        <Pause className="size-2.5 fill-current" />
                        <span className="hidden sm:inline">Jeda</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Progress Line */}
              <div className="w-full bg-[#E5E7EB] h-[2px] overflow-hidden">
                <div
                  key={`${editorStep}-${isEditorPaused}`}
                  style={{
                    animation: isEditorPaused ? "none" : "stepProgressFill 3.4s linear forwards",
                    width: isEditorPaused ? "100%" : undefined,
                  }}
                  className="h-full bg-[#111111]"
                />
              </div>

              {/* Studio Body - Responsive on Mobile */}
              <div className="flex flex-col md:grid md:grid-cols-12 min-h-[300px] sm:min-h-[380px]">
                {/* Mobile Top Tabs or Desktop Left Dock */}
                <div className="border-b md:border-b-0 md:border-r border-[#E5E7EB] py-2 md:py-3 px-3 md:px-0 flex md:flex-col items-center justify-around md:justify-start gap-2 bg-[#FFFFFF] md:col-span-1">
                  {[
                    { id: "files", label: "Berkas", icon: Folder },
                    { id: "elements", label: "Elemen", icon: Sliders },
                    { id: "fonts", label: "Font", icon: Type },
                    { id: "presets", label: "Preset", icon: Bookmark },
                  ].map((tab) => {
                    const isTabActive =
                      (editorStep === 4 && tab.id === "fonts") ||
                      (editorStep !== 4 && tab.id === "elements");
                    return (
                      <div
                        key={tab.id}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center transition-colors ${
                          isTabActive ? "bg-[#111111] text-white" : "text-[#9CA3AF]"
                        }`}
                        title={tab.label}
                      >
                        <tab.icon className="size-3.5" />
                      </div>
                    );
                  })}
                </div>

                {/* Left Inspector (Desktop only) */}
                <div className="hidden md:flex md:col-span-3 border-r border-[#E5E7EB] p-4 flex-col justify-between bg-[#FFFFFF] text-xs">
                  <div className="space-y-3.5">
                    <div className="border-b border-[#E5E7EB] pb-2">
                      <span className="text-[10px] text-[#6B7280] uppercase block font-semibold">Pengaturan Elemen</span>
                      <span className="text-xs font-semibold text-[#111111] mt-0.5 block">{currentStepData.inspectorVal}</span>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#6B7280] uppercase block mb-1 font-medium">Kolom Data CSV</label>
                      <div className="p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md text-xs text-[#111111] font-medium">
                        [CSV] Nama Peserta
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#6B7280] uppercase block mb-1 font-medium">Titik Koordinat (X & Y)</label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md font-medium text-center">
                          X: {editorStep >= 2 ? "421pt" : "375pt"}
                        </div>
                        <div className="p-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md font-medium text-center">
                          Y: {editorStep === 3 || editorStep === 4 ? "288pt" : editorStep === 2 ? "298pt" : "260pt"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5E7EB] text-xs text-[#6B7280]">
                    Status: <span className="text-[#111111] font-semibold">{currentStepData.action}</span>
                  </div>
                </div>

                {/* Right Interactive Canvas Sheet */}
                <div className="flex-1 md:col-span-8 bg-[#F9FAFB] p-3 sm:p-6 flex flex-col items-center justify-between relative overflow-hidden select-none">
                  <div className="w-full flex justify-between items-center text-[11px] sm:text-xs text-[#6B7280] mb-2 font-medium">
                    <span className="truncate">842 × 595 pt (A4 Landscape)</span>
                    <span className="border border-[#E5E7EB] bg-white px-2 py-0.5 rounded-md shrink-0">100%</span>
                  </div>

                  <div className="relative w-full max-w-[480px] aspect-[16/10] bg-white border border-[#E5E7EB] rounded-md shadow-sm flex flex-col justify-between p-3.5 sm:p-5 overflow-hidden">
                    {/* Background Template Asli di Mockup Studio */}
                    <img
                      src="/background.webp"
                      alt="Background Template Kanvas"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
                      onError={(e) => {
                        if (!e.currentTarget.src.endsWith(".png")) {
                          e.currentTarget.src = "/templates/template_01_preview.png";
                        } else {
                          e.currentTarget.style.display = "none";
                        }
                      }}
                    />

                    {editorStep === 2 && (
                      <>
                        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#111111] z-20 opacity-70" />
                        <div className="absolute left-0 right-0 top-1/2 h-px bg-[#111111] z-20 opacity-70" />
                        <div className="absolute top-1.5 right-1.5 text-[9px] sm:text-[10px] font-medium bg-[#111111] text-white px-1.5 py-0.5 rounded z-30">
                          Terkunci di Tengah
                        </div>
                      </>
                    )}

                    <div className="text-center pt-0.5 z-10">
                      <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-[#9CA3AF] font-semibold">
                        Lembaga Pelatihan Nasional
                      </div>
                      <div
                        className="text-[11px] sm:text-sm font-semibold text-[#111111] uppercase tracking-wider mt-0.5"
                        style={{ fontFamily: "var(--font-heading), sans-serif" }}
                      >
                        Sertifikat Kelulusan
                      </div>
                    </div>

                    <div
                      className={`relative mx-auto border transition-all duration-700 ease-out z-20 flex flex-col items-center px-3 sm:px-4 py-1 sm:py-1.5 rounded-md shadow-xs ${
                        editorStep === 0
                          ? "border-[#111111] bg-white/95 border-dashed"
                          : editorStep === 1
                          ? "border-[#111111] bg-white shadow-md border-solid scale-[1.01]"
                          : editorStep === 2
                          ? "border-[#111111] bg-white/95 ring-1 ring-[#111111]/20"
                          : "border-[#111111] bg-white"
                      }`}
                      style={{
                        transform:
                          editorStep === 0
                            ? "translate(-30px, 10px)"
                            : editorStep === 1
                            ? "translate(-12px, 4px)"
                            : editorStep === 2
                            ? "translate(0px, 0px)"
                            : "translate(0px, -6px)",
                      }}
                    >
                      <span
                        className={`block text-[11px] sm:text-sm text-[#111111] transition-all duration-300 ${
                          editorStep === 4
                            ? "font-serif tracking-wider font-semibold"
                            : "font-sans font-medium"
                        }`}
                      >
                        Dr. Rian Hermawan, M.Kom
                      </span>
                    </div>

                    <div className="flex justify-between items-end pb-0.5 text-[8px] sm:text-[10px] text-[#9CA3AF] border-t border-[#E5E7EB] pt-1 z-10 font-medium">
                      <span>No: SG-2026-081</span>
                      <span>Dokumen Resmi</span>
                    </div>
                  </div>

                  <div className="w-full flex justify-between items-center text-[11px] sm:text-xs text-[#6B7280] mt-2 font-medium">
                    <span className="text-[#111111] font-semibold">{currentStepData.coord}</span>
                    <span>{currentStepData.action}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stepper Navigator Controls */}
            <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#F9FAFB] border border-[#E5E7EB] p-3.5 sm:p-4 rounded-lg">
              <div className="text-xs text-[#111111]">
                <strong className="uppercase text-[10px] text-[#6B7280] block mb-0.5 font-semibold">
                  Langkah {editorStep + 1} dari 5: {currentStepData.title}
                </strong>
                {currentStepData.guide}
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 self-end sm:self-center">
                {studioSteps.map((step, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setEditorStep(idx)}
                    className={`py-1 px-2.5 text-xs font-semibold rounded-md border transition-colors ${
                      editorStep === idx
                        ? "bg-[#111111] text-white border-[#111111]"
                        : "bg-white text-[#6B7280] border-[#E5E7EB] hover:text-[#111111]"
                    }`}
                  >
                    0{idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TARGET AUDIENCES SECTION */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 md:px-12 border-b border-[#E5E7EB] bg-[#FAFAFA]">
          <div className="max-w-[1320px] mx-auto">
            <div className="mb-10 sm:mb-12 text-center max-w-xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5 sm:mb-2">
                Cocok Untuk Siapa?
              </span>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#111111]"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                Solusi praktis untuk berbagai kegiatan.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {useCases.map((aud) => (
                <div
                  key={aud.id}
                  className="bg-[#FFFFFF] border border-[#E5E7EB] p-5 sm:p-6 rounded-lg flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F3F4F6] text-[#4B5563] inline-block mb-2.5">
                      {aud.badge}
                    </span>
                    <h3 className="text-sm sm:text-base font-semibold text-[#111111] mb-1.5">{aud.title}</h3>
                    <p className="text-xs text-[#6B7280] font-normal leading-relaxed">{aud.desc}</p>
                  </div>
                  <div className="mt-4 sm:mt-5 pt-3 border-t border-[#E5E7EB] flex items-center gap-1.5 text-xs font-medium text-[#111111]">
                    <Check className="size-3 text-emerald-600" />
                    <span>Teruji Praktis</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PLAN COMPARISON & PRICING SECTION (AI-SEO OPTIMIZED) */}
        <section id="perbandingan" className="py-16 sm:py-20 px-4 sm:px-6 md:px-12 border-b border-[#E5E7EB] bg-[#FFFFFF]">
          <div className="max-w-[1320px] mx-auto">
            <div className="mb-8 sm:mb-10 text-center max-w-xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5 sm:mb-2">
                Struktur Harga & Paket
              </span>
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                Transparan tanpa biaya tersembunyi.
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#6B7280] font-normal">
                SertiGen beroperasi dengan model akses gratis (Rp 0). Pilih mode instan tanpa daftar atau akun cloud gratis untuk pengelolaan jangka panjang.
              </p>
            </div>

            {}
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg overflow-hidden max-w-4xl mx-auto shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[720px]">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-xs font-semibold uppercase text-[#6B7280]">
                      <th className="p-3 sm:p-3.5 font-semibold">Fitur & Spesifikasi</th>
                      <th className="p-3 sm:p-3.5 font-semibold w-36 sm:w-40">Mode Trial (Tamu)</th>
                      <th className="p-3 sm:p-3.5 font-semibold w-44 sm:w-48 text-[#111111] bg-black/5">Akun Cloud Gratis</th>
                      <th className="p-3 sm:p-3.5 font-semibold w-44 sm:w-48 text-[#111111] bg-amber-500/10">
                        <div className="flex items-center gap-1.5">
                          <span>Premium</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold tracking-wider">
                            COMING SOON
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
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
                        cloud: "1 Event Aktif di Cloud (Bebas Ganti/Hapus)",
                        premium: "Multi-Event Tanpa Batas (Unlimited)",
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
                        cloud: "Tanpa Batas (Unlimited per Event)",
                        premium: "Tanpa Batas (Unlimited)",
                      },
                      {
                        feature: "Penyimpanan Template & Draf",
                        trial: "Sementara di Browser (IndexedDB)",
                        cloud: "Penyimpanan Cloud Permanen (1 Event)",
                        premium: "Cloud Multi-Event & Arsip Permanen",
                      },
                      {
                        feature: "Manajemen Database Peserta",
                        trial: "Satu Kali Cetak",
                        cloud: "Tersimpan di Cloud, Cari & Filter",
                        premium: "Multi-Acara, Filter Lanjutan & Ekspor",
                      },
                      {
                        feature: "Portal Unduh Mandiri Peserta",
                        trial: "Tidak Termasuk",
                        cloud: "Tautan Publik per Acara",
                        premium: "Tautan Publik + Kustom Branding",
                      },
                      {
                        feature: "Dukungan API & Integrasi",
                        trial: "Belum Tersedia (CSV Saja)",
                        cloud: "Belum Tersedia (Roadmap)",
                        premium: "Webhook Otomatis (Forms/Zapier) & LMS",
                      },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="p-3 sm:p-3.5 text-[#111111] font-medium">{row.feature}</td>
                        <td className="p-3 sm:p-3.5 text-[#6B7280] font-normal">{row.trial}</td>
                        <td className="p-3 sm:p-3.5 text-[#111111] font-semibold bg-black/5">{row.cloud}</td>
                        <td className="p-3 sm:p-3.5 text-amber-900 font-semibold bg-amber-500/5">
                          {row.premium}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Callout Info Tambahan Paket & Pembatalan */}
              <div className="bg-[#F9FAFB] border-t border-[#E5E7EB] p-4 text-xs space-y-2 text-[#4B5563]">
                <div className="flex items-start gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Kebijakan Pembatalan & Refund:</strong> Tidak ada biaya langganan berulang bulanan (*no recurring subscription fees*). Anda bebas berhenti menggunakan layanan atau menghapus data acara sewaktu-waktu tanpa konsekuensi finansial atau denda pemotongan.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Paket Premium (Coming Soon):</strong> Ditujukan untuk organisasi, event organizer, atau institusi yang mengelola lebih dari 1 acara secara bersamaan, membutuhkan integrasi webhook formulir otomatis (Google Forms/Typeform), serta kustomisasi branding mandiri.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-center text-[11px] text-[#9CA3AF] mt-2 sm:hidden">
              ← Geser tabel ke samping untuk melihat detail paket →
            </p>
          </div>
        </section>

        {/* OPTIMIZER SECTION */}
        <section id="optimizer" className="py-16 sm:py-20 px-4 sm:px-6 md:px-12 border-b border-[#E5E7EB] bg-[#FAFAFA]">
          <div className="max-w-[1320px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 sm:mb-10 gap-3 sm:gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5 sm:mb-2">
                  Kompresi Dokumen
                </span>
                <h2
                  className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#111111]"
                  style={{ fontFamily: "var(--font-heading), sans-serif" }}
                >
                  File ZIP tetap ringan walau cetak ribuan lembar.
                </h2>
              </div>
              <p className="text-[#6B7280] max-w-md text-xs sm:text-sm font-normal leading-relaxed">
                Template ukuran besar bikin hasil download bengkak kalau dikalikan ratusan peserta. Atur kualitas kompresi latar dokumen dengan mudah sebelum didownload.
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E5E7EB] p-5 sm:p-8 rounded-lg">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
                <div className="lg:col-span-6 space-y-4 sm:space-y-5">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                      <span className="text-[#6B7280]">Skala Kompresi Kanvas</span>
                      <span className="text-[#111111] font-bold">{simScale.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={simScale}
                      onChange={(e) => setSimScale(Number(e.target.value))}
                      className="w-full accent-[#111111] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                      <span className="text-[#6B7280]">Kualitas Gambar Latar</span>
                      <span className="text-[#111111] font-bold">{Math.round(simQuality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={simQuality}
                      onChange={(e) => setSimQuality(Number(e.target.value))}
                      className="w-full accent-[#111111] cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 bg-[#F9FAFB] rounded-md border border-[#E5E7EB] text-xs">
                    <span className="text-[#6B7280] block text-[10px] uppercase font-semibold mb-0.5">Simulasi Ukuran Berkas:</span>
                    <span className="text-xs text-[#111111] font-medium">
                      Ukuran per file menyusut dari <strong>12.5 MB</strong> jadi <strong>{optimizedSizeMB} MB</strong>.
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-6 grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-4 sm:p-5 rounded-lg flex flex-col justify-between">
                    <span className="text-[11px] sm:text-xs text-[#6B7280] block mb-1 font-medium">Ukuran Asli</span>
                    <div
                      className="text-xl sm:text-3xl font-bold text-[#111111]"
                      style={{ fontFamily: "var(--font-heading), sans-serif" }}
                    >
                      12.5 MB
                    </div>
                  </div>

                  <div className="bg-[#FFFFFF] border border-[#111111] p-4 sm:p-5 rounded-lg flex flex-col justify-between">
                    <span className="text-[11px] sm:text-xs text-[#111111] font-bold block mb-1">Setelah Diatur</span>
                    <div
                      className="text-xl sm:text-3xl font-bold text-[#111111]"
                      style={{ fontFamily: "var(--font-heading), sans-serif" }}
                    >
                      {optimizedSizeMB} MB
                    </div>
                    <span className="text-[10px] sm:text-xs text-[#6B7280] mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-[#E5E7EB] font-medium">
                      Penghematan: <strong className="text-[#111111]">{savingsPercent}%</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY & PRIVACY SECTION */}
        <section id="security" className="py-16 sm:py-20 px-4 sm:px-6 md:px-12 border-b border-[#E5E7EB] bg-[#FFFFFF]">
          <div className="max-w-[1320px] mx-auto">
            <div className="mb-10 sm:mb-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5 sm:mb-2">
                Privasi Data
              </span>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#111111]"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                Data peserta aman karena diproses di komputer Anda.
              </h2>
              <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-[#6B7280] max-w-xl font-normal leading-relaxed">
                Pada mode Trial dan Studio Mandiri, daftar nama peserta diproses langsung di perangkat Anda tanpa dikirim ke server luar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-[#FFFFFF] border border-[#E5E7EB] p-5 sm:p-6 rounded-lg flex flex-col justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#111111] mb-1.5">
                    Mesin WebAssembly
                  </h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed font-normal">
                    Proses penyusunan dokumen dijalankan dengan teknologi WebAssembly berkecepatan tinggi langsung di browser.
                  </p>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E5E7EB] p-5 sm:p-6 rounded-lg flex flex-col justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#111111] mb-1.5">
                    Pemulihan Sesi Otomatis
                  </h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed font-normal">
                    Posisi tata letak dan data peserta tersimpan otomatis di penyimpanan lokal browser (IndexedDB) kalau tidak sengaja tertutup.
                  </p>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E5E7EB] p-5 sm:p-6 rounded-lg flex flex-col justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#111111] mb-1.5">
                    Latar Belakang Lancar
                  </h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed font-normal">
                    Proses packing file ZIP dikerjakan di background agar browser Anda tidak ngadat atau freeze saat kerja berat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TECHNICAL SPECS SECTION */}
        <section id="specs" className="py-16 sm:py-20 px-4 sm:px-6 md:px-12 border-b border-[#E5E7EB] bg-[#FAFAFA]">
          <div className="max-w-[1320px] mx-auto">
            <div className="mb-8 sm:mb-10">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5 sm:mb-2">
                Spesifikasi & Kompatibilitas
              </span>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#111111]"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                Rekomendasi perangkat & format berkas.
              </h2>
            </div>

            <div className="border-t border-[#E5E7EB] divide-y divide-[#E5E7EB]">
              {technicalSpecs.map((spec, idx) => (
                <div
                  key={spec.label}
                  className="py-3.5 sm:py-4.5 grid grid-cols-1 md:grid-cols-12 gap-1.5 sm:gap-3 items-baseline"
                >
                  <div className="md:col-span-1 text-xs font-bold text-[#6B7280]">
                    0{idx + 1}
                  </div>
                  <div className="md:col-span-4 text-xs uppercase font-semibold text-[#6B7280]">
                    {spec.label}
                  </div>
                  <div className="md:col-span-4 text-xs sm:text-sm font-semibold text-[#111111]">
                    {spec.value}
                  </div>
                  <div className="md:col-span-3 text-[11px] sm:text-xs text-[#6B7280] font-normal">
                    {spec.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ SECTION (AI-SEO & AUDIT DIRECT ANSWERS) */}
        <section id="faq" className="py-16 sm:py-20 px-4 sm:px-6 md:px-12 border-b border-[#E5E7EB] bg-[#FFFFFF]">
          <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            <div className="lg:col-span-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5 sm:mb-2">
                Pusat Bantuan & FAQ
              </span>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#111111]"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                Pertanyaan umum, harga, & kebijakan.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-[#6B7280] font-normal leading-relaxed">
                Jawaban langsung mengenai biaya pemakaian, kebijakan pembatalan, keamanan data, ketersediaan API, dan fitur sertifikat massal.
              </p>
            </div>

            <div className="lg:col-span-7 divide-y divide-[#E5E7EB] border-y border-[#E5E7EB] bg-[#FFFFFF] px-3 sm:px-6 rounded-lg">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="py-4 sm:py-4.5">
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      aria-expanded={isOpen}
                      className="w-full flex justify-between items-center text-left py-1"
                    >
                      <span className="text-xs sm:text-sm font-semibold text-[#111111] pr-3">{faq.q}</span>
                      <ChevronDown
                        className={`size-4 text-[#6B7280] shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-[#111111]" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="mt-2 pt-1 text-xs text-[#6B7280] font-normal leading-relaxed">
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

      {/* FOOTER */}
      <footer className="border-t border-[#E5E7EB] bg-[#FFFFFF] py-10 sm:py-12 px-4 sm:px-6 md:px-12 text-xs text-[#6B7280]">
        <div className="max-w-[1320px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-[#E5E7EB] pb-8">
          <div>
            <span
              className="text-base font-bold text-[#111111] block mb-1"
              style={{ fontFamily: "var(--font-heading), sans-serif" }}
            >
              SertiGen
            </span>
            <p className="text-xs text-[#6B7280] font-normal">
              Generator Sertifikat Massal Otomatis dari Excel & CSV • Bebas Biaya Langganan.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 sm:gap-6 text-xs font-medium">
            <a href="#cara-kerja" className="hover:text-[#111111]">Cara Kerja</a>
            <a href="#simulator" className="hover:text-[#111111]">Simulator</a>
            <a href="#studio" className="hover:text-[#111111]">Fitur Kanvas</a>
            <a href="#perbandingan" className="hover:text-[#111111]">Paket & Harga</a>
            <a href="#faq" className="hover:text-[#111111]">FAQ & Refund</a>
            <a href="/llms.txt" target="_blank" className="hover:text-[#111111]">llms.txt</a>
          </div>
        </div>

        <div className="max-w-[1320px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 text-xs text-center sm:text-left">
          <span>© {new Date().getFullYear()} SertiGen. Hak cipta dilindungi.</span>
          <div className="flex items-center gap-3 sm:gap-4 text-[#6B7280]">
            <span>Pemrosesan PDF Lokal</span>
            <span className="text-[#D1D5DB]">•</span>
            <span>Rp 0 Bebas Batal</span>
            <span className="text-[#D1D5DB]">•</span>
            <span>Kebijakan Privasi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
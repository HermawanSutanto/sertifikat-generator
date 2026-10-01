"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileSpreadsheet,
  Folder,
  MousePointer,
  Pause,
  Play,
  Printer,
  RefreshCw,
  Sliders,
  Sparkles,
  Type,
  Zap,
} from "lucide-react";
import AuthNav from "./AuthNav";

const sansFont = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

const faqs = [
  {
    q: "Apakah SertiGen benar-benar gratis?",
    a: "Ya, 100% gratis untuk saat ini tanpa batasan kuota harian yang memberatkan. Anda bisa membuat ratusan sertifikat dalam sekali proses.",
  },
  {
    q: "Format file apa saja yang didukung untuk template?",
    a: "Sistem mendukung file Vector PDF (termasuk multi-halaman bolak-balik). Hasil akhir diunduh dalam bentuk file ZIP berisi kumpulan PDF siap cetak.",
  },
  {
    q: "Bagaimana cara memasukkan puluhan hingga ratusan nama?",
    a: "Cukup simpan daftar nama dari Microsoft Excel atau Google Sheets ke format file CSV, lalu upload ke SertiGen. Sistem otomatis memasukkan nama satu per satu.",
  },
  {
    q: "Apakah data nama peserta yang diunggah aman?",
    a: "Aman. Pada mode Trial, semua proses berjalan murni di dalam memori komputer atau HP kamu sendiri dan tidak dikirim ke server luar.",
  },
  {
    q: "Bisa mengatur posisi, jenis huruf, dan warna teks nama?",
    a: "Bisa. Kamu punya kendali penuh untuk menggeser posisi teks di kanvas, mengganti ukuran font, perataan, warna tinta, hingga menggunakan font kustom sendiri.",
  },
];

const technicalSpecs = [
  {
    label: "Mesin Komputasi",
    value: "Rust WebAssembly & Web Worker",
    desc: "Pemrosesan lokal di memori browser tanpa bikin server ngadat",
  },
  {
    label: "Rekomendasi Browser",
    value: "Chrome, Edge, Brave (Chromium v103+)",
    desc: "Performa optimal dengan dukungan penuh multi-threading",
  },
  {
    label: "Spesifikasi RAM Minimum",
    value: "4 GB (Disarankan: 8 GB+)",
    desc: "Dibutuhkan untuk merender arsip ZIP massal 1.000+ lembar dokumen",
  },
  {
    label: "Dukungan Perangkat",
    value: "Laptop / Komputer (Windows, macOS, Linux)",
    desc: "Paling nyaman pakai mouse & keyboard untuk atur posisi kanvas",
  },
  {
    label: "Format Input & Output",
    value: "Vector PDF → ZIP Siap Cetak",
    desc: "Menghasilkan file PDF terpisah per peserta dalam satu folder ZIP",
  },
  {
    label: "Penyimpanan Draf",
    value: "IndexedDB Auto-Recovery",
    desc: "Sesi kerja otomatis tersimpan aman di browser jika tak sengaja tertutup",
  },
];

const useCases = [
  {
    id: "webinar",
    badge: "EVENT DIGITAL",
    title: "Webinar & Seminar Online",
    desc: "Kirim sertifikat kehadiran untuk ratusan peserta tepat waktu tanpa capek copy-paste nama manual satu per satu.",
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
    title: "Admin & Komunitas",
    desc: "Solusi cepat buat panitia acara yang butuh bikin dokumen masal tanpa aplikasi desain yang berat.",
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

  const [printedSheets, setPrintedSheets] = useState([]);
  const [currentPrintIndex, setCurrentPrintIndex] = useState(0);

  const [editorStep, setEditorStep] = useState(0);
  const [isEditorPaused, setIsEditorPaused] = useState(false);

  const [simScale, setSimScale] = useState(1.5);
  const [simQuality, setSimQuality] = useState(0.8);
  const baseOriginalSizeMB = 12.5;

  const [dragOver, setDragOver] = useState(false);
  const [droppedFileName, setDroppedFileName] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState("Tarik file ke sini");

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

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    setDroppedFileName("peserta_webinar_nasional.csv");
    setWorkflowStatus("File CSV Berhasil Diterapkan!");
    setSampleName("Dr. Rian Hermawan, S.Kom");
  };

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
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "IDR",
        },
        description:
          "Cara gampang cetak ratusan sertifikat otomatis dari file CSV dan template PDF langsung di browser.",
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
      className={`${sansFont.variable} ${monoFont.variable} bg-[#FFFFFF] text-[#111111] min-h-screen selection:bg-[#111111] selection:text-white antialiased`}
      style={{ fontFamily: "var(--font-sans), sans-serif" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />
      <style>{`@keyframes stepProgressFill { from { width: 0%; } to { width: 100%; } }`}</style>

      {/* Utility Bar */}
      <div className="border-b border-[#E5E7EB] bg-[#F5F5F5] text-[#6B7280] text-xs py-2 px-6">
        <div className="max-w-[1320px] mx-auto flex justify-between items-center font-mono text-[11px]">
          <div className="flex items-center gap-3">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Mesin pemroses lokal aktif</span>
            <span className="text-[#B0B6C3]">/</span>
            <span>Berjalan langsung di memori komputer kamu</span>
          </div>
          <div className="flex items-center gap-4 text-[#6B7280]">
            <span>Hasil PDF Tajam</span>
            <span className="text-[#B0B6C3] hidden sm:inline">/</span>
            <span className="hidden sm:inline">Tanpa Antrean Server</span>
          </div>
        </div>
      </div>

      {/* Main Sticky Header (Tanpa tombol trial berlebih) */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 border-b border-[#E5E7EB] backdrop-blur-md">
        <div className="max-w-[1320px] mx-auto px-6 h-16 flex justify-between items-center">
          <Link
            href="/"
            className="text-lg font-medium tracking-tight text-[#111111]"
          >
            SertiGen
          </Link>

          <nav className="hidden lg:flex items-center gap-7 text-[13px] text-[#6B7280]">
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
              Paket & Batasan
            </a>
            <a href="#optimizer" className="hover:text-[#111111] transition-colors">
              Kompresi
            </a>
            <a href="#faq" className="hover:text-[#111111] transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Suspense fallback={<div className="h-8 w-20 bg-[#F5F5F5] rounded-[4px]" />}>
              <AuthNav />
            </Suspense>
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* HERO SECTION */}
        <section className="pt-16 pb-20 px-6 md:px-12 border-b border-[#E5E7EB]">
          <div className="max-w-[1320px] mx-auto grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7 flex flex-col pt-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#F5F5F5] border border-[#E5E7EB] w-fit mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-mono text-[#6B7280]">
                  Satu Template PDF • Ratusan Nama Penerima
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.08] tracking-[-1.5px] text-[#111111]">
                Cara gampang cetak ratusan sertifikat dari Excel & CSV tanpa ribet ganti nama manual.
              </h1>

              <p className="mt-6 text-base sm:text-lg text-[#6B7280] font-light max-w-xl leading-relaxed">
                Capek salin nama satu demi satu di Canva atau pusing karena tata letak Mail Merge Word sering bergeser? Cukup upload template PDF, masukkan file CSV dari Excel, dan biarkan browser kamu merender ratusan sertifikat siap cetak dalam waktu yang singkat.
              </p>

              {/* Primary Trial CTA button (Eksklusif hanya di Hero) */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/trial"
                  className="inline-flex items-center gap-2 bg-[#111111] text-white px-5 py-2.5 rounded-[4px] text-xs font-mono uppercase tracking-wider hover:bg-[#333333] transition-colors"
                >
                  <Zap className="size-3.5 text-amber-400" />
                  Coba Trial Tanpa Login
                  <ArrowRight className="size-3.5" />
                </Link>

                <Link
                  href="/register"
                  className="inline-flex items-center px-4 py-2.5 rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] text-xs font-mono uppercase tracking-wider hover:bg-[#F5F5F5] transition-colors"
                >
                  Daftar Akun Cloud
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-mono text-[#6B7280]">
                <span>✓ Bebas watermark hingga 50 lembar pada mode trial</span>
                <span className="text-[#B0B6C3]">•</span>
                <span>✓ Diproses langsung di komputer kamu</span>
              </div>

              {/* Value Metrics */}
              <div className="mt-14 pt-6 border-t border-[#E5E7EB] grid grid-cols-3 gap-6 font-mono">
                <div>
                  <div className="text-lg font-medium text-[#111111]">Vektor Tajam</div>
                  <div className="text-[11px] text-[#6B7280] mt-0.5">Teks nama jernih dicetak</div>
                </div>
                <div>
                  <div className="text-lg font-medium text-[#111111]">Latar Belakang</div>
                  <div className="text-[11px] text-[#6B7280] mt-0.5">Kompresi kualitas pas</div>
                </div>
                <div>
                  <div className="text-lg font-medium text-[#111111]">Data Aman</div>
                  <div className="text-[11px] text-[#6B7280] mt-0.5">File aman di perangkat</div>
                </div>
              </div>
            </div>

            {/* Right Side: Interactive Simulator */}
            <div id="simulator" className="lg:col-span-5">
              <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-5 shadow-xs">
                <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-2.5 mb-4 font-mono text-[11px] text-[#6B7280]">
                  <span>SIMULASI CETAK NAMA</span>
                  <span className="text-[#111111] font-medium">
                    {isGenerating ? `Mencetak 0${currentPrintIndex}/05` : "Uji Coba Langsung"}
                  </span>
                </div>

                <div className="relative aspect-[16/10] overflow-hidden border border-[#E5E7EB] rounded-[4px] bg-[#F5F5F5]">
                  {printedSheets.map((sheet, idx) => (
                    <div
                      key={sheet.id}
                      style={{
                        transform: `translateY(${sheet.offsetY}px)`,
                        zIndex: 10 + idx,
                      }}
                      className="absolute inset-0 bg-[#FFFFFF] border border-[#E5E7EB] p-4 rounded-[4px] flex flex-col justify-between transition-all"
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono text-[#6B7280] border-b border-[#E5E7EB] pb-1">
                        <span>LEMBAR #0{sheet.id + 1}</span>
                        <span className="text-[#111111] font-medium">SELESAI</span>
                      </div>

                      <div className="text-center my-auto">
                        <div className="text-[9px] font-mono uppercase tracking-wider text-[#6B7280] mb-1">
                          Sertifikat Pelatihan
                        </div>
                        <div className="text-sm font-medium text-[#111111] truncate px-2">
                          {sheet.name}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-mono text-[#6B7280] pt-1 border-t border-[#E5E7EB]">
                        <span>PDF SIAP CETAK</span>
                        <span>LOKAL</span>
                      </div>
                    </div>
                  ))}

                  <div className="relative z-0 p-5 h-full flex flex-col items-center justify-center text-center">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-[#6B7280] mb-1.5">
                      Pratinjau Sertifikat Pelatihan
                    </div>

                    <div
                      className={`${fontFamilyType} text-[#111111] my-2 font-medium px-4 break-words max-w-full leading-tight`}
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {sampleName || "Nama Peserta"}
                    </div>

                    <p className="text-[11px] text-[#6B7280] max-w-[240px] leading-relaxed mt-0.5">
                      Telah mengikuti dan menyelesaikan kegiatan dengan baik.
                    </p>

                    <div className="mt-3 pt-2 border-t border-[#E5E7EB] w-44 flex justify-between text-[9px] font-mono text-[#6B7280]">
                      <span>FORMAT: PDF</span>
                      <span>STATUS: SIAP</span>
                    </div>

                    {isGenerating && (
                      <div className="absolute inset-0 bg-[#FFFFFF]/90 text-[#111111] flex flex-col items-center justify-center font-mono text-xs gap-2 z-40">
                        <RefreshCw className="size-4 animate-spin text-[#111111]" />
                        <span>Menyusun sertifikat...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Simulator Controls */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label
                      htmlFor="interactive-name"
                      className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1"
                    >
                      Coba Ubah Nama Peserta:
                    </label>
                    <input
                      id="interactive-name"
                      type="text"
                      value={sampleName}
                      onChange={(e) => setSampleName(e.target.value)}
                      placeholder="Masukkan nama..."
                      className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] px-3 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                        Gaya Huruf:
                      </label>
                      <select
                        value={fontFamilyType}
                        onChange={(e) => setFontFamilyType(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] px-2 py-1 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                      >
                        <option value="font-serif">Serif (Formal)</option>
                        <option value="font-sans">Sans (Modern)</option>
                        <option value="font-mono">Mono (Kode)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
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

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={copySampleNames}
                      className="text-[11px] font-mono text-[#6B7280] hover:text-[#111111] inline-flex items-center gap-1.5"
                    >
                      <Copy className="size-3" />
                      {copiedNotification ? "Tersalin!" : "Salin 5 Nama Sampel"}
                    </button>

                    <button
                      type="button"
                      onClick={triggerSimulatedGeneration}
                      disabled={isGenerating}
                      className="bg-[#111111] text-white text-xs font-mono uppercase px-3.5 py-1.5 rounded-[4px] hover:bg-[#333333] transition-colors flex items-center gap-1.5 disabled:opacity-40"
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
        <section id="cara-kerja" className="py-20 px-6 md:px-12 border-b border-[#E5E7EB] bg-[#FAFAFA]">
          <div className="max-w-[1320px] mx-auto">
            <div className="mb-12 text-center max-w-xl mx-auto">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#6B7280] block mb-2">
                Alur Pembuatan
              </span>
              <h2 className="text-2xl sm:text-4xl font-normal tracking-tight text-[#111111]">
                Cara buat 500+ sertifikat dalam 3 langkah.
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#6B7280] font-light">
                Tidak perlu pusing ngoding atau edit satu-satu. Sistem langsung menyusun semuanya.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { step: "01", title: "Upload Template PDF", desc: "Masukkan file desain sertifikat kamu dalam format PDF." },
                { step: "02", title: "Masukkan Daftar CSV", desc: "Upload file CSV berisi nama-nama peserta dari Excel atau Google Sheets." },
                { step: "03", title: "Download ZIP", desc: "Browser otomatis menyusun ratusan file PDF siap cetak dalam satu folder ZIP." },
              ].map((step) => (
                <div
                  key={step.step}
                  className="bg-[#FFFFFF] border border-[#E5E7EB] p-6 rounded-md flex flex-col justify-between"
                >
                  <div>
                    <span className="font-mono text-2xl font-light text-[#111111] block mb-3">
                      {step.step}
                    </span>
                    <h3 className="text-base font-medium text-[#111111] mb-2">
                      {step.title}
                    </h3>
                    <p className="text-xs text-[#6B7280] leading-relaxed font-light">
                      {step.desc}
                    </p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-[#E5E7EB] flex items-center gap-1.5 text-[11px] font-mono text-[#111111]">
                    <Check className="size-3.5 text-emerald-600" />
                    <span>Otomatis & Cepat</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STUDIO CANVAS SECTION */}
        <section id="studio" className="py-20 px-6 md:px-12 border-b border-[#E5E7EB]">
          <div className="max-w-[1320px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#6B7280] block mb-2">
                  Pengaturan Kanvas
                </span>
                <h2 className="text-2xl sm:text-4xl font-normal tracking-tight text-[#111111]">
                  Atur posisi nama dengan presisi tinggi.
                </h2>
              </div>
              <p className="text-[#6B7280] max-w-md text-xs sm:text-sm font-light leading-relaxed">
                Tarik kotak nama langsung di lembar kerja, pakai garis bantu otomatis (smart snap), atau geser pakai tombol panah keyboard untuk kerapian sempurna.
              </p>
            </div>

            <div className="border border-[#E5E7EB] rounded-md overflow-hidden bg-[#FFFFFF] shadow-xs">
              <div className="h-10 border-b border-[#E5E7EB] px-4 flex items-center justify-between text-xs font-mono bg-[#FFFFFF]">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 mr-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]" />
                  </div>
                  <span className="text-[#111111] font-medium text-[11px]">SertiGen Studio</span>
                  <span className="text-[#D1D5DB]">/</span>
                  <span className="text-[#6B7280] text-[10px]">template_sertifikat.pdf</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditorPaused(!isEditorPaused)}
                    className="text-[10px] font-mono text-[#6B7280] hover:text-[#111111] inline-flex items-center gap-1 border border-[#E5E7EB] bg-[#F5F5F5] px-2 py-0.5 rounded-[3px]"
                  >
                    {isEditorPaused ? (
                      <>
                        <Play className="size-2.5 fill-current" />
                        <span>Lanjut Simulasi</span>
                      </>
                    ) : (
                      <>
                        <Pause className="size-2.5 fill-current" />
                        <span>Jeda</span>
                      </>
                    )}
                  </button>

                  <span className="text-[10px] font-mono text-[#6B7280] border border-[#E5E7EB] bg-[#FAFAFA] px-2 py-0.5 rounded-[3px] hidden sm:inline">
                    Mode Kanvas Aktif
                  </span>
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

              <div className="grid grid-cols-12 min-h-[380px]">
                <div className="col-span-1 border-r border-[#E5E7EB] py-3 flex flex-col items-center gap-2 bg-[#FFFFFF]">
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
                        className={`w-7 h-7 rounded-[4px] flex items-center justify-center ${
                          isTabActive ? "bg-[#111111] text-white" : "text-[#9CA3AF]"
                        }`}
                        title={tab.label}
                      >
                        <tab.icon className="size-3.5" />
                      </div>
                    );
                  })}
                </div>

                <div className="hidden md:flex md:col-span-3 border-r border-[#E5E7EB] p-3.5 flex-col justify-between bg-[#FFFFFF] font-mono text-xs">
                  <div className="space-y-3">
                    <div className="border-b border-[#E5E7EB] pb-2">
                      <span className="text-[10px] text-[#6B7280] uppercase block">Pengaturan Elemen</span>
                      <span className="text-xs font-medium text-[#111111]">{currentStepData.inspectorVal}</span>
                    </div>

                    <div>
                      <label className="text-[9px] text-[#6B7280] uppercase block mb-1">Kolom Data CSV</label>
                      <div className="p-1.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-[3px] text-[10px] text-[#111111]">
                        [CSV] Nama Peserta
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] text-[#6B7280] uppercase block mb-1">Titik Koordinat (X & Y)</label>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div className="p-1 bg-[#F5F5F5] border border-[#E5E7EB] rounded-[3px]">
                          X: {editorStep >= 2 ? "421pt" : "375pt"}
                        </div>
                        <div className="p-1 bg-[#F5F5F5] border border-[#E5E7EB] rounded-[3px]">
                          Y: {editorStep === 3 || editorStep === 4 ? "288pt" : editorStep === 2 ? "298pt" : "260pt"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5E7EB] text-[9px] text-[#6B7280]">
                    Status: <span className="text-[#111111] font-medium">{currentStepData.action}</span>
                  </div>
                </div>

                <div className="col-span-11 md:col-span-8 bg-[#F5F5F5] p-5 flex flex-col items-center justify-between relative overflow-hidden select-none">
                  <div className="w-full flex justify-between items-center text-[10px] font-mono text-[#6B7280] mb-2">
                    <span>UKURAN: 842 × 595 pt (A4 Landscape)</span>
                    <span className="border border-[#E5E7EB] bg-white px-2 py-0.5 rounded-[3px]">Zoom: 100%</span>
                  </div>

                  <div className="relative w-full max-w-[500px] aspect-[16/10] bg-white border border-[#E5E7EB] rounded-[2px] shadow-sm flex flex-col justify-between p-5 overflow-hidden">
                    {editorStep === 2 && (
                      <>
                        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#111111] z-20 opacity-70" />
                        <div className="absolute left-0 right-0 top-1/2 h-px bg-[#111111] z-20 opacity-70" />
                        <div className="absolute top-2 right-2 text-[8px] font-mono bg-[#111111] text-white px-1.5 py-0.5 rounded-[2px] z-30">
                          Terkunci di Tengah
                        </div>
                      </>
                    )}

                    <div className="text-center pt-1 z-0">
                      <div className="text-[8px] font-mono uppercase tracking-widest text-[#9CA3AF]">
                        LEMBAGA PELATIHAN NASIONAL
                      </div>
                      <div className="text-xs sm:text-sm font-light text-[#111111] uppercase tracking-wider mt-0.5">
                        SERTIFIKAT KELULUSAN
                      </div>
                    </div>

                    <div
                      className={`relative mx-auto border transition-all duration-700 ease-out z-10 flex flex-col items-center px-4 py-1.5 rounded-[2px] ${
                        editorStep === 0
                          ? "border-[#111111] bg-[#F5F5F5] border-dashed"
                          : editorStep === 1
                          ? "border-[#111111] bg-white shadow-md border-solid scale-[1.01]"
                          : editorStep === 2
                          ? "border-[#111111] bg-[#F5F5F5] ring-1 ring-[#111111]/20"
                          : "border-[#111111] bg-white"
                      }`}
                      style={{
                        transform:
                          editorStep === 0
                            ? "translate(-40px, 15px)"
                            : editorStep === 1
                            ? "translate(-15px, 6px)"
                            : editorStep === 2
                            ? "translate(0px, 0px)"
                            : "translate(0px, -8px)",
                      }}
                    >
                      <span
                        className={`block text-xs sm:text-sm text-[#111111] transition-all duration-300 ${
                          editorStep === 4
                            ? "font-serif tracking-wider font-semibold"
                            : "font-sans font-normal"
                        }`}
                      >
                        Dr. Rian Hermawan, M.Kom
                      </span>
                    </div>

                    <div className="flex justify-between items-end pb-1 text-[8px] font-mono text-[#9CA3AF] border-t border-[#E5E7EB] pt-1 z-0">
                      <span>NO: SG-2026-081</span>
                      <span>DOKUMEN RESMI</span>
                    </div>
                  </div>

                  <div className="w-full flex justify-between items-center text-[10px] font-mono text-[#6B7280] mt-2">
                    <span className="text-[#111111] font-medium">{currentStepData.coord}</span>
                    <span>{currentStepData.action}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#F5F5F5] border border-[#E5E7EB] p-3.5 rounded-md">
              <div className="text-xs text-[#111111]">
                <strong className="font-mono uppercase text-[10px] text-[#6B7280] block mb-0.5">
                  Langkah {editorStep + 1} dari 5: {currentStepData.title}
                </strong>
                {currentStepData.guide}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {studioSteps.map((step, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setEditorStep(idx)}
                    className={`py-0.5 px-2 font-mono text-[10px] rounded-[3px] border transition-colors ${
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
        <section className="py-20 px-6 md:px-12 border-b border-[#E5E7EB] bg-[#FAFAFA]">
          <div className="max-w-[1320px] mx-auto">
            <div className="mb-12 text-center max-w-xl mx-auto">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#6B7280] block mb-2">
                Cocok Untuk Siapa?
              </span>
              <h2 className="text-2xl sm:text-4xl font-normal tracking-tight text-[#111111]">
                Solusi praktis untuk berbagai kegiatan.
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Panitia Webinar & Event", desc: "Kirim sertifikat kehadiran untuk ratusan peserta tepat waktu tanpa capek copy-paste nama manual satu per satu." },
                { title: "Lembaga Kursus & Pelatihan", desc: "Cetak sertifikat kelulusan profesional lengkap dengan nomor urut dan predikat peserta yang rapi." },
                { title: "Sekolah & Kampus", desc: "Kelola piagam kegiatan ekstrakurikuler, kepanitiaan, atau lomba antar kelas dalam hitungan menit." },
                { title: "Admin & Komunitas", desc: "Solusi cepat buat panitia acara yang butuh bikin dokumen masal tanpa aplikasi desain yang berat." },
              ].map((aud) => (
                <div
                  key={aud.title}
                  className="bg-[#FFFFFF] border border-[#E5E7EB] p-6 rounded-md flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-sm font-medium text-[#111111] mb-2">{aud.title}</h3>
                    <p className="text-xs text-[#6B7280] font-light leading-relaxed">{aud.desc}</p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-[#E5E7EB] flex items-center gap-1.5 font-mono text-[11px] text-[#111111]">
                    <Check className="size-3 text-emerald-600" />
                    <span>Teruji Praktis</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PLAN COMPARISON SECTION */}
        <section id="perbandingan" className="py-20 px-6 md:px-12 border-b border-[#E5E7EB] bg-[#FFFFFF]">
          <div className="max-w-[1320px] mx-auto">
            <div className="mb-10 text-center max-w-xl mx-auto">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#6B7280] block mb-2">
                Pilihan Penggunaan
              </span>
              <h2 className="text-2xl sm:text-3xl font-normal tracking-tight text-[#111111]">
                Pilih cara yang paling pas buat kamu.
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#6B7280] font-light">
                Coba langsung tanpa daftar untuk kebutuhan kilat, atau buat akun gratis untuk menyimpan template dan data acara secara permanen.
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md overflow-hidden max-w-3xl mx-auto shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[560px]">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] font-mono text-[11px] uppercase text-[#6B7280]">
                      <th className="p-3.5 font-medium">Fitur & Kapasitas</th>
                      <th className="p-3.5 font-medium w-48">Mode Trial (Tanpa Daftar)</th>
                      <th className="p-3.5 font-medium w-48 text-[#111111] bg-black/5">Akun Cloud Gratis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {[
                      { feature: "Cara Akses", trial: "Tanpa Daftar (Instan)", cloud: "Akun Cloud Gratis" },
                      { feature: "Batas Bebas Watermark", trial: "Hingga 50 Sertifikat / Sesi", cloud: "Tanpa Batas" },
                      { feature: "Penyimpanan Draf", trial: "Lokal di Komputer", cloud: "Disimpan di Cloud" },
                      { feature: "Pengelolaan Data", trial: "Sekali Pakai", cloud: "Database & Riwayat Acara" },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="p-3.5 text-[#111111] font-normal">{row.feature}</td>
                        <td className="p-3.5 text-[#6B7280] font-mono">{row.trial}</td>
                        <td className="p-3.5 text-[#111111] font-mono font-medium bg-black/5">{row.cloud}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* OPTIMIZER SECTION */}
        <section id="optimizer" className="py-20 px-6 md:px-12 border-b border-[#E5E7EB] bg-[#FAFAFA]">
          <div className="max-w-[1320px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#6B7280] block mb-2">
                  Kompresi Dokumen
                </span>
                <h2 className="text-2xl sm:text-4xl font-normal tracking-tight text-[#111111]">
                  File ZIP tetap ringan walau cetak ribuan lembar.
                </h2>
              </div>
              <p className="text-[#6B7280] max-w-md text-xs sm:text-sm font-light leading-relaxed">
                Template ukuran besar bikin hasil download bengkak kalau dikalikan ratusan peserta. Atur kualitas kompresi latar dokumen dengan mudah sebelum didownload.
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E5E7EB] p-6 sm:p-8 rounded-md">
              <div className="grid lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-5">
                  <div>
                    <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                      <span className="text-[#6B7280]">Skala Kompresi Kanvas</span>
                      <span className="text-[#111111] font-medium">{simScale.toFixed(1)}x</span>
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
                    <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                      <span className="text-[#6B7280]">Kualitas Gambar Latar</span>
                      <span className="text-[#111111] font-medium">{Math.round(simQuality * 100)}%</span>
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

                  <div className="p-3.5 bg-[#F5F5F5] rounded-[4px] border border-[#E5E7EB] font-mono text-xs">
                    <span className="text-[#6B7280] block text-[10px] uppercase mb-0.5">Simulasi Ukuran Berkas:</span>
                    <span className="text-xs text-[#111111]">
                      Ukuran per file menyusut dari <strong>12.5 MB</strong> jadi <strong>{optimizedSizeMB} MB</strong>.
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-6 grid grid-cols-2 gap-4">
                  <div className="bg-[#F5F5F5] border border-[#E5E7EB] p-5 rounded-md flex flex-col justify-between">
                    <span className="text-xs font-mono text-[#6B7280] block mb-1">Ukuran Asli</span>
                    <div className="text-2xl sm:text-3xl font-light text-[#111111]">
                      12.5 MB
                    </div>
                  </div>

                  <div className="bg-[#FFFFFF] border border-[#111111] p-5 rounded-md flex flex-col justify-between">
                    <span className="text-xs font-mono text-[#111111] font-medium block mb-1">Setelah Diatur</span>
                    <div className="text-2xl sm:text-3xl font-light text-[#111111]">
                      {optimizedSizeMB} MB
                    </div>
                    <span className="text-[10px] font-mono text-[#6B7280] mt-3 pt-2 border-t border-[#E5E7EB]">
                      Penghematan: <strong>{savingsPercent}%</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY & PRIVACY SECTION */}
        <section id="security" className="py-20 px-6 md:px-12 border-b border-[#E5E7EB] bg-[#FFFFFF]">
          <div className="max-w-[1320px] mx-auto">
            <div className="mb-12">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#6B7280] block mb-2">
                Privasi Data
              </span>
              <h2 className="text-2xl sm:text-4xl font-normal tracking-tight text-[#111111]">
                Data peserta aman karena diproses di komputer kamu.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-[#6B7280] max-w-xl font-light leading-relaxed">
                Pada mode Trial dan Studio Mandiri, daftar nama peserta diproses langsung di perangkatmu tanpa dikirim ke server luar.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-[#FFFFFF] border border-[#E5E7EB] p-5 rounded-md flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[#111111] mb-1.5">
                    Mesin WebAssembly
                  </h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed font-light">
                    Proses penyusunan dokumen dijalankan dengan teknologi WebAssembly berkecepatan tinggi langsung di browser.
                  </p>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E5E7EB] p-5 rounded-md flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[#111111] mb-1.5">
                    Pemulihan Sesi Otomatis
                  </h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed font-light">
                    Posisi tata letak dan data peserta tersimpan otomatis di penyimpanan lokal browser (IndexedDB) kalau tidak sengaja tertutup.
                  </p>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E5E7EB] p-5 rounded-md flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[#111111] mb-1.5">
                    Latar Belakang Lancar
                  </h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed font-light">
                    Proses packing file ZIP dikerjakan di background agar browser kamu tidak ngadat atau freeze saat kerja berat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TECHNICAL SPECS SECTION */}
        <section id="specs" className="py-20 px-6 md:px-12 border-b border-[#E5E7EB] bg-[#FAFAFA]">
          <div className="max-w-[1320px] mx-auto">
            <div className="mb-10">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#6B7280] block mb-2">
                Spesifikasi
              </span>
              <h2 className="text-2xl sm:text-4xl font-normal tracking-tight text-[#111111]">
                Rekomendasi perangkat.
              </h2>
            </div>

            <div className="border-t border-[#E5E7EB] divide-y divide-[#E5E7EB]">
              {[
                { label: "Mesin Komputasi", value: "Rust WebAssembly", desc: "Berjalan cepat di dalam memori komputer" },
                { label: "Browser Rekomendasi", value: "Google Chrome, Edge, Brave", desc: "Mendukung fitur font lokal dan worker" },
                { label: "Memori RAM", value: "Minimal 4 GB (Disarankan 8 GB)", desc: "Aman untuk menyusun ribuan lembar PDF" },
                { label: "Perangkat", value: "Laptop atau Komputer", desc: "Paling nyaman pakai keyboard dan mouse" },
              ].map((spec, idx) => (
                <div
                  key={spec.label}
                  className="py-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-baseline"
                >
                  <div className="md:col-span-1 font-mono text-xs text-[#6B7280]">
                    0{idx + 1}
                  </div>
                  <div className="md:col-span-4 font-mono text-xs uppercase text-[#6B7280]">
                    {spec.label}
                  </div>
                  <div className="md:col-span-4 text-sm font-normal text-[#111111]">
                    {spec.value}
                  </div>
                  <div className="md:col-span-3 text-xs text-[#6B7280] font-light">
                    {spec.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-20 px-6 md:px-12 border-b border-[#E5E7EB] bg-[#FFFFFF]">
          <div className="max-w-[1320px] mx-auto grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#6B7280] block mb-2">
                Tanya Jawab
              </span>
              <h2 className="text-2xl sm:text-4xl font-normal tracking-tight text-[#111111]">
                Pertanyaan yang sering ditanyakan.
              </h2>
            </div>

            <div className="lg:col-span-7 divide-y divide-[#E5E7EB] border-y border-[#E5E7EB] bg-[#FFFFFF] px-6 rounded-md">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="py-4">
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      aria-expanded={isOpen}
                      className="w-full flex justify-between items-center text-left"
                    >
                      <span className="text-sm font-normal text-[#111111] pr-4">{faq.q}</span>
                      <ChevronDown
                        className={`size-4 text-[#6B7280] shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-[#111111]" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="mt-2.5 pt-1 text-xs text-[#6B7280] font-light leading-relaxed">
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
      <footer className="border-t border-[#E5E7EB] bg-[#FFFFFF] py-12 px-6 md:px-12 text-xs font-mono text-[#6B7280]">
        <div className="max-w-[1320px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-[#E5E7EB] pb-8">
          <div>
            <span className="text-sm font-medium text-[#111111] block mb-1">
              SertiGen
            </span>
            <p className="text-[11px] text-[#6B7280]">
              Generator Sertifikat Massal Otomatis dari Excel & CSV.
            </p>
          </div>

          <div className="flex flex-wrap gap-5 text-[11px]">
            <a href="#cara-kerja" className="hover:text-[#111111]">Cara Kerja</a>
            <a href="#simulator" className="hover:text-[#111111]">Simulator</a>
            <a href="#studio" className="hover:text-[#111111]">Fitur Kanvas</a>
            <a href="#perbandingan" className="hover:text-[#111111]">Paket</a>
            <a href="#faq" className="hover:text-[#111111]">FAQ</a>
          </div>
        </div>

        <div className="max-w-[1320px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 text-[10px]">
          <span>© {new Date().getFullYear()} SertiGen. Hak cipta dilindungi.</span>
          <div className="flex items-center gap-4 text-[#6B7280]">
            <span>Pemrosesan PDF Lokal</span>
            <span className="text-[#B0B6C3]">•</span>
            <span>Kebijakan Privasi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Archivo_Black, Inter, JetBrains_Mono } from "next/font/google";
import {
  ArrowRight,
  Award,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
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
    a: "Ya, 100% gratis untuk saat ini tanpa batasan kuota harian yang memberatkan. Anda dapat membuat ratusan sertifikat dalam satu kali proses.",
  },
  {
    q: "Format berkas apa yang didukung untuk template?",
    a: "Sistem mendukung berkas Vector PDF (termasuk multi-halaman bolak-balik) serta gambar resolusi tinggi PNG atau JPG. Hasil akhir diekspor dalam bentuk arsip ZIP berisi berkas PDF atau JPEG siap cetak tajam 300 DPI.",
  },
  {
    q: "Bagaimana cara memasukkan puluhan hingga ratusan nama?",
    a: "Cukup unggah file CSV atau salin satu kolom daftar nama langsung dari Microsoft Excel atau Google Sheets. Sistem otomatis memetakan nama baris per baris.",
  },
  {
    q: "Apakah daftar nama peserta yang diunggah disimpan di server?",
    a: "Tidak sama sekali. Pemrosesan dilakukan murni di peramban pengguna menggunakan mesin Rust WebAssembly dan Web Worker lokal. Berkas dan data nama tidak pernah dikirim ke server kami.",
  },
  {
    q: "Bisa mengatur posisi, jenis huruf, dan warna teks nama?",
    a: "Bisa. Anda memiliki kendali penuh atas tata letak presisi (nudge per point), perataan, warna tinta, ukuran font, letter spacing, line height, hingga penggunaan font lokal sistem Anda via Chromium Local Font API.",
  },
];

const technicalSpecs = [
  { 
    label: "Mesin Komputasi", 
    value: "Rust WebAssembly & Web Worker", 
    desc: "Multi-threaded rendering lokal di memori browser tanpa beban server" 
  },
  { 
    label: "Rekomendasi Peramban", 
    value: "Chrome, Edge, Brave (Chromium v103+)", 
    desc: "Wajib Chromium untuk fitur Local Font API; Firefox/Safari didukung terbatas" 
  },
  { 
    label: "Spesifikasi RAM Minimum", 
    value: "4 GB (Rekomendasi: 8 GB+)", 
    desc: "Dibutuhkan untuk alokasi buffer ZIP massal 1.000+ lembar dokumen" 
  },
  { 
    label: "Dukungan Perangkat", 
    value: "Desktop / Laptop (Win, macOS, Linux)", 
    desc: "Optimal pada keyboard + mouse untuk fitur canvas snap & point nudge" 
  },
  { 
    label: "Format Input & Output", 
    value: "Vector PDF / Multi-Page → ZIP 300 DPI", 
    desc: "Mendukung kompresi resample instan dan ekspor chunking otomatis" 
  },
  { 
    label: "Ketahanan Data", 
    value: "IndexedDB Auto-Recovery", 
    desc: "Sesi koordinat dan baris peserta tersimpan aman di storage lokal" 
  },
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

const sampleBatchNames = [
  "Alexander Pratama, M.Kom",
  "Nadia Safitri, S.Ds",
  "Budi Santoso",
  "Siti Rahmawati, S.E",
  "Dimas Anggara, S.T",
];

export default function LandingPage() {
  // 1. State Input & Simulator Hero
  const [sampleName, setSampleName] = useState("Alexander Pratama, M.Kom");
  const [fontSize, setFontSize] = useState(24);
  const [fontFamilyType, setFontFamilyType] = useState("font-serif");
  const [isGenerating, setIsGenerating] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // 2. State Tumpukan Cetak Kertas Bertahap
  const [printedSheets, setPrintedSheets] = useState([]);
  const [currentPrintIndex, setCurrentPrintIndex] = useState(0);

  // 3. State 3D Tilt & Magnetic Button
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [foilPos, setFoilPos] = useState({ x: 50, y: 50 });
  const cardRef = useRef(null);

  const magneticBtnRef = useRef(null);
  const [magneticPos, setMagneticPos] = useState({ x: 0, y: 0 });

  // 4. State Counter Dinamis
  const specsRef = useRef(null);
  const [counterCount, setCounterCount] = useState(0);
  const [counterTime, setCounterTime] = useState(1.0);

  // 5. State Animasi Kursor Mockup Editor
  const [editorStep, setEditorStep] = useState(0);

  // 6. State Simulator Kompresi PDF
  const [simScale, setSimScale] = useState(1.5);
  const [simQuality, setSimQuality] = useState(0.8);
  const baseOriginalSizeMB = 18.4;

  // 7. State Drag & Drop Alur
  const [dragOver, setDragOver] = useState(false);
  const [droppedFileName, setDroppedFileName] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState("Tarik file ke sini");

  // Perhitungan Kompresi Dinamis
  const calculateCompressedSize = () => {
    const ratio = (simScale / 2.0) * simQuality;
    const compressed = Math.max(0.4, baseOriginalSizeMB * ratio * 0.15);
    return compressed.toFixed(1);
  };
  const compressedSizeMB = calculateCompressedSize();
  const savingsPercent = Math.round((1 - compressedSizeMB / baseOriginalSizeMB) * 100);

  // Mouse Move Tilt Parallax
  const handleMouseMove = (e) => {
    if (!cardRef.current || isGenerating) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    setTilt({ x: rotateX, y: rotateY });
    setFoilPos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setFoilPos({ x: 50, y: 50 });
  };

  // Magnetic Button Move
  const handleMagneticMove = (e) => {
    if (!magneticBtnRef.current) return;
    const rect = magneticBtnRef.current.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    setMagneticPos({ x: x * 0.25, y: y * 0.25 });
  };

  const handleMagneticLeave = () => {
    setMagneticPos({ x: 0, y: 0 });
  };

  // Efek Timer Editor Step Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setEditorStep((prev) => (prev + 1) % 4);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Efek Counter Observer (Memory-safe)
  useEffect(() => {
    let countTimer = null;
    let timeTimer = null;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        if (entries[0].isIntersecting) {
          obs.unobserve(entries[0].target);

          let countStart = 0;
          countTimer = setInterval(() => {
            countStart += 5;
            if (countStart >= 100) {
              clearInterval(countTimer);
            }
            setCounterCount(countStart);
          }, 25);

          let timeStart = 1.0;
          timeTimer = setInterval(() => {
            timeStart -= 0.05;
            if (timeStart <= 0.38) {
              timeStart = 0.38;
              clearInterval(timeTimer);
            }
            setCounterTime(parseFloat(timeStart.toFixed(2)));
          }, 35);
        }
      },
      { threshold: 0.2 }
    );

    if (specsRef.current) observer.observe(specsRef.current);

    return () => {
      observer.disconnect();
      if (countTimer) clearInterval(countTimer);
      if (timeTimer) clearInterval(timeTimer);
    };
  }, []);

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
            rotation: (Math.random() * 8 - 4).toFixed(1),
            offsetX: (Math.random() * 10 - 5).toFixed(1),
            offsetY: -((index + 1) * 3),
          },
        ]);

        if (index === sampleBatchNames.length - 1) {
          setTimeout(() => {
            setIsGenerating(false);
          }, 600);
        }
      }, index * 260);
    });
  };

  return (
    <div
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} bg-[#EBE9E4] text-[#111111] min-h-screen selection:bg-[#0000EE] selection:text-white antialiased overflow-x-hidden`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      <style jsx global>{`
        @keyframes marqueeScroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes paperDispense {
          0% {
            transform: translateY(-90px) scale(0.9);
            opacity: 0;
          }
          60% {
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        .animate-marquee {
          display: inline-flex;
          width: max-content;
          animation: marqueeScroll 24s linear infinite;
        }
        .animate-paper-dispense {
          animation: paperDispense 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.1) forwards;
        }
      `}</style>

      {/* Aksesibilitas Keyboard */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[#0000EE] focus:text-white focus:px-4 focus:py-2 focus:rounded-[4px] focus:outline-none"
      >
        Lewati ke konten utama
      </a>

      {/* Infinite Marquee Ticker */}
      <div className="bg-[#111111] text-[#EBE9E4] text-xs font-mono py-2.5 border-b border-[#333333] overflow-hidden whitespace-nowrap">
        <div className="animate-marquee gap-8">
          <span className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#0000EE]" />
            SISTEM RENDER RUST WASM: AKTIF
          </span>
          <span className="text-[#EBE9E4]/60">·</span>
          <span>12.430 SERTIFIKAT DIPROSES BULAN INI</span>
          <span className="text-[#EBE9E4]/60">·</span>
          <span className="text-[#0000EE] font-bold">AKSES TERBUKA TANPA BATAS KUOTA</span>
          <span className="text-[#EBE9E4]/60">·</span>
          <span>FORMAT DUKUNGAN: VECTOR PDF, PNG, JPG</span>
          <span className="text-[#EBE9E4]/60">·</span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#0000EE]" />
            SISTEM RENDER RUST WASM: AKTIF
          </span>
          <span className="text-[#EBE9E4]/60">·</span>
          <span>12.430 SERTIFIKAT DIPROSES BULAN INI</span>
          <span className="text-[#EBE9E4]/60">·</span>
          <span className="text-[#0000EE] font-bold">AKSES TERBUKA TANPA BATAS KUOTA</span>
        </div>
      </div>

      {/* Header Utama dengan Link Lengkap */}
      <header className="sticky top-0 z-40 bg-[#EBE9E4]/95 border-b border-[#111111] backdrop-blur-sm transition-all">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-20 flex justify-between items-center">
          <Link
            href="/"
            className="text-2xl font-bold uppercase tracking-tight text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SERTIGEN.
          </Link>

          <nav className="hidden xl:flex items-center gap-6 text-[12px] font-mono tracking-wider text-[#555555]">
            <a href="#simulator" className="hover:text-[#0000EE] transition-colors">
              [ 01. SIMULATOR ]
            </a>
            <a href="#studio" className="hover:text-[#0000EE] transition-colors">
              [ 02. KENDALI STUDIO ]
            </a>
            <a href="#optimizer" className="hover:text-[#0000EE] transition-colors">
              [ 03. RESAMPLE ]
            </a>
            <a href="#security" className="hover:text-[#0000EE] transition-colors">
              [ 04. PRIVASI ]
            </a>
            <a href="#workflow" className="hover:text-[#0000EE] transition-colors">
              [ 05. ALUR ]
            </a>
            <a href="#faq" className="hover:text-[#0000EE] transition-colors">
              [ 06. FAQ ]
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
                <span>Mesin Generator Dokumen Berbasis WebAssembly</span>
              </div>

              <h1
                className="text-5xl sm:text-7xl lg:text-[92px] leading-[0.92] font-bold text-[#111111] uppercase tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                SATU TEMPLATE. RATUSAN NAMA. SIAP CETAK.
              </h1>

              <p className="mt-8 text-xl sm:text-2xl text-[#555555] max-w-xl leading-relaxed">
                Tinggalkan proses pengeditan manual satu per satu. Pasang template PDF, masukkan daftar penerima, dan proses ribuan sertifikat langsung di peramban.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <div
                  onMouseMove={handleMagneticMove}
                  onMouseLeave={handleMagneticLeave}
                  className="inline-block p-1"
                >
                  <Link
                    ref={magneticBtnRef}
                    href="/register"
                    style={{
                      transform: `translate(${magneticPos.x}px, ${magneticPos.y}px)`,
                    }}
                    className="group inline-flex items-center gap-3 bg-[#111111] text-[#FFFFFF] px-8 py-4 rounded-[4px] font-semibold text-sm tracking-wide uppercase hover:bg-[#0000EE] transition-transform duration-100 shadow-[6px_6px_0px_0px_#0000EE] active:shadow-[1px_1px_0px_0px_#0000EE] active:translate-x-1 active:translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000EE]"
                  >
                    Buka Studio Sekarang
                    <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <a
                  href="#specs"
                  className="inline-flex items-center gap-2 border-2 border-[#111111] bg-transparent text-[#111111] px-6 py-4 rounded-[4px] font-semibold text-sm tracking-wide uppercase hover:bg-[#FFFFFF] shadow-[4px_4px_0px_0px_#111111] active:shadow-[1px_1px_0px_0px_#111111] active:translate-x-1 active:translate-y-1 transition-all"
                >
                  Lihat Spesifikasi Mesin
                </a>
              </div>

              <div className="mt-16 pt-8 border-t border-[#111111] grid grid-cols-3 gap-6 font-mono">
                <div>
                  <div className="text-2xl font-bold text-[#111111]">UNLIMITED</div>
                  <div className="text-xs text-[#555555] uppercase mt-1">Tanpa Batas Kuota</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111111]">300 DPI</div>
                  <div className="text-xs text-[#555555] uppercase mt-1">Kualitas Berkas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#0000EE]">RUST WASM</div>
                  <div className="text-xs text-[#555555] uppercase mt-1">Biner Client-Side</div>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Studio Simulator dengan Output Printer Fisik */}
            <div id="simulator" className="lg:col-span-5 [perspective:1000px]">
              <div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                  transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                  transition: isGenerating ? "all 0.3s ease" : "transform 0.1s ease-out",
                }}
                className="bg-[#FFFFFF] border-2 border-[#111111] rounded-[8px] p-6 shadow-[10px_10px_0px_0px_#111111] active:shadow-[2px_2px_0px_0px_#111111] active:translate-x-2 active:translate-y-2 transition-all relative overflow-hidden"
              >
                <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4 mb-6 font-mono text-xs text-[#555555]">
                  <span>INTERACTIVE STAGING ENGINE</span>
                  <span className="text-[#0000EE] font-bold">
                    {isGenerating ? `[ MENCETAK 0${currentPrintIndex}/05 ]` : "[ LIVE 3D TILT ]"}
                  </span>
                </div>

                {/* Slot Roller Pengeluaran Kertas */}
                <div className="w-full h-2 bg-[#111111] rounded-t-sm mb-1 opacity-70" />

                {/* Area Baki Penampung Kertas */}
                <div className="relative aspect-[16/10] overflow-visible">
                  
                  {/* Tumpukan Lembaran yang Terakumulasi Keluar Bertahap */}
                  {printedSheets.map((sheet, idx) => (
                    <div
                      key={sheet.id}
                      style={{
                        transform: `translate(${sheet.offsetX}px, ${sheet.offsetY}px) rotate(${sheet.rotation}deg)`,
                        zIndex: 10 + idx,
                      }}
                      className="animate-paper-dispense absolute inset-0 bg-[#FAF8F5] border-2 border-[#111111] p-5 rounded-[4px] shadow-md flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center text-[8px] font-mono text-[#555555] border-b border-[#111111]/20 pb-1">
                        <span className="text-[#0000EE] font-bold">LEMBAR RESMI #0{sheet.id + 1}</span>
                        <span>STATUS: TERCETAK</span>
                      </div>

                      <div className="text-center my-auto">
                        <div className="uppercase font-mono text-[8px] tracking-widest text-[#555555] mb-1">
                          SERTIFIKAT KELULUSAN
                        </div>
                        <div className="text-sm font-bold text-[#111111] truncate px-2">
                          {sheet.name}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[7px] font-mono text-[#555555] pt-1 border-t border-[#111111]/20">
                        <span>FORMAT: 300 DPI</span>
                        <span>VERIFIED BY SERTIGEN</span>
                      </div>
                    </div>
                  ))}

                  {/* Kanvas Template Dasar Utama */}
                  <div className="relative z-0 bg-[#EBE9E4] border-2 border-[#111111] p-6 rounded-[4px] h-full flex flex-col items-center justify-center text-center overflow-hidden">
                    <div className="absolute top-3 left-3 flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#111111]" />
                      <span className="w-2 h-2 rounded-full bg-[#555555]" />
                    </div>

                    {/* Cap Holografik Berkilau */}
                    <div
                      style={{
                        background: `radial-gradient(circle at ${foilPos.x}% ${foilPos.y}%, #FFF3A1 0%, #D4AF37 40%, #AA771C 75%, #8B6508 100%)`,
                      }}
                      className="absolute top-3 right-3 w-10 h-10 rounded-full border-2 border-[#111111] flex items-center justify-center shadow-md transition-all duration-75"
                    >
                      <Award className="size-5 text-[#111111]" />
                    </div>
                    
                    <div className="uppercase font-mono text-[9px] tracking-widest text-[#555555] mb-2">
                      SERTIFIKAT PENGHARGAAN RESMI
                    </div>

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

                    {isGenerating && (
                      <div className="absolute inset-0 bg-[#111111]/85 text-white flex flex-col items-center justify-center font-mono text-xs gap-2 z-40">
                        <RefreshCw className="size-6 animate-spin text-[#0000EE]" />
                        <span>MEMUTAR ROLLER CETAK...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Kontrol Simulator */}
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
                      className="w-full sm:w-auto bg-[#111111] text-[#FFFFFF] text-xs font-mono uppercase px-4 py-2 rounded-[4px] hover:bg-[#0000EE] active:translate-x-0.5 active:translate-y-0.5 shadow-[3px_3px_0px_0px_#0000EE] active:shadow-none transition-all flex items-center justify-center gap-1.5"
                    >
                      <Printer className="size-3.5" />
                      Uji Cetak 5 Lembar
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* =========================================================================
            SEKSI 1: FITUR KONTROL STUDIO + ANIMASI KURSOR MOCKUP EDITOR
           ========================================================================= */}
        <section id="studio" className="py-24 px-6 md:px-12 border-b border-[#111111] bg-[#FFFFFF]">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
              <div>
                <span className="font-mono text-xs text-[#0000EE] uppercase tracking-wider block mb-2">
                  [ KENDALI TINGKAT STUDIO ]
                </span>
                <h2
                  className="text-4xl sm:text-6xl font-bold uppercase text-[#111111]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  PRESISI SAMPAI SATUAN TITIK.
                </h2>
              </div>
              <p className="text-[#555555] max-w-md text-base">
                Bukan sekadar form tempel teks biasa. Seluruh fleksibilitas aplikasi desain grafis desktop kini berjalan langsung di peramban Anda.
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Kolom Kiri: Mockup Editor Bergerak Otomatis dengan Kursor */}
              <div className="lg:col-span-6 bg-[#111111] text-[#EBE9E4] border-2 border-[#111111] rounded-[8px] p-6 shadow-[8px_8px_0px_0px_#0000EE] flex flex-col justify-between relative overflow-hidden min-h-[460px]">
                <div className="flex justify-between items-center border-b border-[#333333] pb-3 font-mono text-xs text-[#AAAAAA]">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0000EE]" />
                    LIVE EDITOR WORKSPACE
                  </span>
                  <span className="text-[#0000EE] font-bold">
                    {editorStep === 0 && "[ STATE: MEMILIH ELEMEN ]"}
                    {editorStep === 1 && "[ STATE: MENGGESER KE TENGAH ]"}
                    {editorStep === 2 && "[ STATE: SMART SNAP ACTIVE ]"}
                    {editorStep === 3 && "[ STATE: MENERAPKAN FONT ]"}
                  </span>
                </div>

                <div className="relative my-auto bg-[#EBE9E4] border-2 border-[#111111] rounded-[4px] aspect-[16/10] overflow-hidden flex flex-col items-center justify-center p-4 select-none">
                  
                  {/* Garis Bidik Smart Snap Guides */}
                  {(editorStep === 1 || editorStep === 2) && (
                    <>
                      <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-[#0000EE] z-20" />
                      <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-[#0000EE] z-20" />
                    </>
                  )}

                  <div className="text-[8px] font-mono tracking-widest text-[#555555] mb-2">
                    PIAGAM PENGHARGAAN RESMI
                  </div>

                  <div
                    className={`border-2 border-dashed px-4 py-2 rounded transition-all duration-700 ease-out z-10 ${
                      editorStep === 2
                        ? "border-[#0000EE] bg-[#0000EE]/10 scale-105"
                        : "border-[#111111] bg-white/40"
                    }`}
                    style={{
                      transform:
                        editorStep === 0
                          ? "translate(-35px, 20px)"
                          : editorStep === 1
                          ? "translate(0px, 0px)"
                          : editorStep === 2
                          ? "translate(0px, 0px)"
                          : "translate(0px, 0px)",
                    }}
                  >
                    <span
                      className={`block font-bold text-sm sm:text-base text-[#111111] transition-all duration-300 ${
                        editorStep === 3 ? "font-serif tracking-widest" : "font-sans"
                      }`}
                    >
                      Dr. Rian Hermawan, M.Kom
                    </span>
                  </div>

                  <div className="text-[8px] font-mono text-[#555555] mt-3">
                    KOORDINAT: {editorStep >= 1 ? "X: 420pt (CENTER) | Y: 298pt" : "X: 385pt | Y: 318pt"}
                  </div>

                  {/* Kursor Pointer yang Bergerak Nyata */}
                  <div
                    className="absolute z-30 transition-all duration-700 ease-in-out pointer-events-none"
                    style={{
                      top:
                        editorStep === 0
                          ? "60%"
                          : editorStep === 1
                          ? "50%"
                          : editorStep === 2
                          ? "50%"
                          : "46%",
                      left:
                        editorStep === 0
                          ? "40%"
                          : editorStep === 1
                          ? "52%"
                          : editorStep === 2
                          ? "52%"
                          : "55%",
                    }}
                  >
                    <svg
                      className="w-6 h-6 text-[#111111] drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M4 2l16 12-7.5 1.5L9 22 4 2z" />
                    </svg>
                    <span className="bg-[#0000EE] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] ml-4 -mt-2 block shadow">
                      {editorStep === 0 && "Drag"}
                      {editorStep === 1 && "Snap"}
                      {editorStep === 2 && "Locked"}
                      {editorStep === 3 && "Apply"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono text-[#AAAAAA] pt-3 border-t border-[#333333]">
                  <span>SHORTCUT: [ SHIFT + PANAH ] = 10PT NUDGE</span>
                  <span className="text-[#0000EE] font-bold">UNDO / REDO 50 SNAPSHOT</span>
                </div>
              </div>

              {/* Kolom Kanan: Grid 4 Fitur Presisi Studio */}
              <div className="lg:col-span-6 grid sm:grid-cols-2 gap-4">
                {[
                  {
                    tag: "01. PANDUAN PUSAT",
                    title: "Smart Snap Guides",
                    desc: "Sumbu tengah otomatis (X & Y) mengunci posisi elemen tepat di titik simetris lembar tanpa butuh penggaris manual.",
                  },
                  {
                    tag: "02. AKSES PERANGKAT",
                    title: "Chromium Local Font API",
                    desc: "Pindai dan gunakan seluruh font sistem komputer Anda langsung tanpa repot upload berkas TTF/OTF.",
                  },
                  {
                    tag: "03. DOKUMEN BOLAK-BALIK",
                    title: "Multi-Page Mapping",
                    desc: "Petakan teks ke lembar sertifikat halaman 1 atau 2 secara mandiri untuk format kelulusan dua sisi.",
                  },
                  {
                    tag: "04. KOLABORASI TIM",
                    title: "JSON Preset Portability",
                    desc: "Simpan dan bagikan tata letak koordinat dalam satu file .json ringan ke seluruh panitia acara.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="border-2 border-[#111111] p-6 rounded-[4px] bg-[#FFFFFF] shadow-[5px_5px_0px_0px_#111111] flex flex-col justify-between"
                  >
                    <div>
                      <span className="font-mono text-[10px] font-bold text-[#0000EE] block mb-2">
                        {item.tag}
                      </span>
                      <h3 className="text-xl font-bold uppercase text-[#111111] mb-2">{item.title}</h3>
                      <p className="text-xs text-[#555555] leading-relaxed">{item.desc}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#E5E7EB] font-mono text-[10px] text-[#111111] font-bold flex items-center justify-between">
                      <span>FITUR TERSEDIA</span>
                      <Check className="size-3.5 text-[#0000EE]" />
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* =========================================================================
            SEKSI 2: SIMULATOR KOMPRESI PDF INTERAKTIF (PDF RESAMPLE WIDGET)
           ========================================================================= */}
        <section id="optimizer" className="py-24 px-6 md:px-12 border-b border-[#111111] bg-[#EBE9E4]">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
              <div>
                <span className="font-mono text-xs text-[#0000EE] uppercase tracking-wider block mb-2">
                  [ MESIN OPTIMASI ARSIP ]
                </span>
                <h2
                  className="text-4xl sm:text-6xl font-bold uppercase text-[#111111]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  HEMAT GIGABYTE RUANG DISK.
                </h2>
              </div>
              <p className="text-[#555555] max-w-md text-base">
                Cegah ukuran berkas ZIP unduhan membengkak. Atur skala resolusi dan kualitas kompresi secara instan sebelum diekspor massal.
              </p>
            </div>

            <div className="bg-[#FFFFFF] border-4 border-[#111111] p-8 md:p-12 rounded-[8px] shadow-[10px_10px_0px_0px_#111111]">
              <div className="grid lg:grid-cols-12 gap-10 items-center">
                
                <div className="lg:col-span-6 space-y-6">
                  <div className="font-mono text-xs uppercase tracking-wider text-[#0000EE] font-bold">
                    [ UJI COBA MESIN RESAMPLE ]
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-mono font-bold mb-2">
                      <span>SKALA RESAMPLE KANVAS:</span>
                      <span className="text-[#0000EE] bg-[#EBE9E4] px-2 py-0.5 border border-[#111111]">{simScale.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={simScale}
                      onChange={(e) => setSimScale(Number(e.target.value))}
                      className="w-full accent-[#0000EE] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[#555555] mt-1">
                      <span>0.5x (Draft Cepat)</span>
                      <span>1.5x (Ideal Web/Cetak)</span>
                      <span>2.5x (Ultra High-Res)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-mono font-bold mb-2">
                      <span>KUALITAS JPEG KOMPRESI:</span>
                      <span className="text-[#0000EE] bg-[#EBE9E4] px-2 py-0.5 border border-[#111111]">{Math.round(simQuality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={simQuality}
                      onChange={(e) => setSimQuality(Number(e.target.value))}
                      className="w-full accent-[#0000EE] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[#555555] mt-1">
                      <span>20% (Ringan)</span>
                      <span>80% (Standar Tajam)</span>
                      <span>100% (Lossless)</span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#EBE9E4] border-2 border-[#111111] rounded-[4px] font-mono text-xs">
                    <span className="text-[#555555] block mb-1">DAMPAK PADA 1.000 SERTIFIKAT:</span>
                    <span className="text-sm font-bold text-[#111111]">
                      Dari {(baseOriginalSizeMB * 1).toFixed(1)} GB menyusut drastis ke {(compressedSizeMB * 1).toFixed(1)} GB siap unduh!
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-6 grid grid-cols-2 gap-4">
                  <div className="bg-[#EBE9E4] border-2 border-[#111111] p-6 rounded-[4px] flex flex-col justify-between shadow-[4px_4px_0px_0px_#111111]">
                    <span className="text-xs font-mono text-[#555555] uppercase block mb-2">Ukuran Asli File</span>
                    <div className="text-3xl sm:text-4xl font-bold text-[#111111]">
                      {baseOriginalSizeMB} MB
                    </div>
                    <span className="text-[10px] font-mono text-[#555555] mt-4 block border-t border-[#111111]/20 pt-2">
                      SEBELUM OPTIMASI
                    </span>
                  </div>

                  <div className="bg-white border-2 border-[#0000EE] p-6 rounded-[4px] flex flex-col justify-between shadow-[4px_4px_0px_0px_#0000EE]">
                    <span className="text-xs font-mono text-[#0000EE] uppercase font-bold block mb-2">Setelah Dioptimasi</span>
                    <div className="text-3xl sm:text-4xl font-bold text-[#0000EE]">
                      {compressedSizeMB} MB
                    </div>
                    <span className="text-[10px] font-mono text-[#0000EE] font-bold mt-4 block border-t border-[#0000EE]/30 pt-2">
                      PENGHEMATAN UKURAN: {savingsPercent}%
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SEKSI 3: ARSITEKTUR & INTEGRITAS DATA (ZERO SERVER STORAGE)
           ========================================================================= */}
        <section id="security" className="py-24 px-6 md:px-12 bg-[#111111] text-[#EBE9E4] border-b border-[#111111]">
          <div className="max-w-[1440px] mx-auto">
            <div className="mb-16">
              <span className="font-mono text-xs text-[#0000EE] uppercase tracking-wider block mb-2">
                [ ARSITEKTUR KOMPUTASI LOKAL ]
              </span>
              <h2
                className="text-4xl sm:text-6xl font-bold uppercase text-[#FFFFFF]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                PRIVASI PENUH. TANPA TRANSMISI SERVER.
              </h2>
              <p className="mt-4 text-[#AAAAAA] max-w-2xl text-base leading-relaxed">
                Seluruh data peserta dan berkas dokumen berharga Anda tidak pernah meninggalkan komputer lokal.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="border-t border-[#333333] pt-6 flex flex-col justify-between">
                <div>
                  <span className="font-mono text-3xl font-bold text-[#0000EE] block mb-4">01</span>
                  <h3 className="text-xl font-bold uppercase text-[#FFFFFF] mb-3">
                    Rust WebAssembly Core
                  </h3>
                  <p className="text-sm text-[#AAAAAA] leading-relaxed">
                    Mesin pencetak disusun dengan kompilasi biner WebAssembly tingkat rendah yang memberikan performa setara aplikasi desktop C++ langsung di peramban.
                  </p>
                </div>
                <div className="mt-6 p-3 bg-[#1A1A1A] border border-[#333333] font-mono text-xs text-[#EBE9E4]/70">
                  TEKNOLOGI: wasm-bindgen
                </div>
              </div>

              <div className="border-t border-[#333333] pt-6 flex flex-col justify-between">
                <div>
                  <span className="font-mono text-3xl font-bold text-[#0000EE] block mb-4">02</span>
                  <h3 className="text-xl font-bold uppercase text-[#FFFFFF] mb-3">
                    IndexedDB Session Guard
                  </h3>
                  <p className="text-sm text-[#AAAAAA] leading-relaxed">
                    Tak perlu panik saat laptop mati mendadak atau browser tertutup. Seluruh koordinat dan baris nama tersimpan secara lokal dan otomatis dipulihkan.
                  </p>
                </div>
                <div className="mt-6 p-3 bg-[#1A1A1A] border border-[#333333] font-mono text-xs text-[#EBE9E4]/70">
                  KETAHANAN: Offline Auto-Restore
                </div>
              </div>

              <div className="border-t border-[#333333] pt-6 flex flex-col justify-between">
                <div>
                  <span className="font-mono text-3xl font-bold text-[#0000EE] block mb-4">03</span>
                  <h3 className="text-xl font-bold uppercase text-[#FFFFFF] mb-3">
                    Web Worker Multi-Thread
                  </h3>
                  <p className="text-sm text-[#AAAAAA] leading-relaxed">
                    Proses render berjalan di thread terpisah. Tampilan antarmuka tetap lancar tanpa macet (zero freeze), bahkan saat mengemas 1.000 sertifikat dalam ZIP.
                  </p>
                </div>
                <div className="mt-6 p-3 bg-[#1A1A1A] border border-[#333333] font-mono text-xs text-[#EBE9E4]/70">
                  KAPASITAS: 1.000 Berkas / Chunk
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SPESIFIKASI TEKNIS & REKOMENDASI PERANGKAT */}
        <section ref={specsRef} id="specs" className="py-24 px-6 md:px-12 border-b border-[#111111] bg-[#FFFFFF]">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
              <div>
                <span className="font-mono text-xs text-[#0000EE] uppercase tracking-wider block mb-2">
                  [ STANDARISASI & PERSYARATAN SISTEM ]
                </span>
                <h2
                  className="text-4xl sm:text-6xl font-bold uppercase text-[#111111]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  SPESIFIKASI TEKNIS & PERANGKAT.
                </h2>
              </div>
              <p className="text-[#555555] max-w-md text-base">
                Karena pemrosesan berkas berjalan penuh di sisi komputer Anda, pastikan lingkungan kerja memenuhi rekomendasi berikut untuk performa maksimal.
              </p>
            </div>

            {/* Tabel Parameter Garis Tegas */}
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

            {/* Kotak Panduan Kompatibilitas Perangkat (Neo-Brutalism Callout) */}
            <div className="mt-16 grid md:grid-cols-3 gap-6">
              <div className="border-2 border-[#111111] p-6 rounded-[4px] bg-[#EBE9E4] shadow-[6px_6px_0px_0px_#111111]">
                <div className="font-mono text-xs font-bold text-[#0000EE] mb-2 uppercase">[ PERAMBAN IDEAL ]</div>
                <h3 className="text-xl font-bold uppercase text-[#111111] mb-2">Chromium Desktop</h3>
                <p className="text-xs text-[#555555] leading-relaxed">
                  Gunakan Google Chrome atau Microsoft Edge versi 103 ke atas untuk membuka akses penuh ke <em>Chromium Local Font Access API</em> (membaca font sistem komputer secara langsung).
                </p>
              </div>

              <div className="border-2 border-[#111111] p-6 rounded-[4px] bg-[#EBE9E4] shadow-[6px_6px_0px_0px_#111111]">
                <div className="font-mono text-xs font-bold text-[#0000EE] mb-2 uppercase">[ MEMORI KERJA ]</div>
                <h3 className="text-xl font-bold uppercase text-[#111111] mb-2">RAM 8 GB Disarankan</h3>
                <p className="text-xs text-[#555555] leading-relaxed">
                  Meskipun RAM 4 GB dapat berjalan normal, RAM 8 GB+ sangat disarankan ketika mencetak di atas 1.000 sertifikat beresolusi 300 DPI agar browser tidak mengalami <em>out-of-memory</em>.
                </p>
              </div>

              <div className="border-2 border-[#111111] p-6 rounded-[4px] bg-[#EBE9E4] shadow-[6px_6px_0px_0px_#111111]">
                <div className="font-mono text-xs font-bold text-[#0000EE] mb-2 uppercase">[ KENDALI STUDIO ]</div>
                <h3 className="text-xl font-bold uppercase text-[#111111] mb-2">PC / Laptop Mouse</h3>
                <p className="text-xs text-[#555555] leading-relaxed">
                  Dirancang untuk produktivitas desktop. Fitur pemindahan teks presisi 1pt via tombol panah dan pintasan keyboard (Undo/Redo) memerlukan perangkat fisik keyboard dan kursor.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* USE CASES */}
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
                  className="bg-[#FFFFFF] border-2 border-[#111111] p-8 rounded-[4px] flex flex-col justify-between hover:shadow-[8px_8px_0px_0px_#111111] hover:-translate-x-1 hover:-translate-y-1 transition-all duration-200"
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

        {/* ALUR SISTEM KERJA (Tiga Langkah Mandiri) */}
        <section id="workflow" className="py-24 px-6 md:px-12 bg-[#111111] text-[#EBE9E4] border-b border-[#111111]">
          <div className="max-w-[1440px] mx-auto">
            <div className="mb-20">
              <span className="font-mono text-xs text-[#0000EE] uppercase tracking-wider block mb-2">
                [ ALUR SISTEM INTERAKTIF ]
              </span>
              <h2
                className="text-4xl sm:text-6xl font-bold uppercase"
                style={{ fontFamily: "var(--font-display)" }}
              >
                TIGA LANGKAH KERJA MANDIRI.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="border-t border-[#333333] pt-8 flex flex-col justify-between group hover:border-[#0000EE] transition-colors">
                <div>
                  <span
                    className="text-6xl font-bold text-[#333333] group-hover:text-[#0000EE] transition-colors block mb-6"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    01
                  </span>
                  <h3 className="text-xl font-bold uppercase mb-4 text-[#EBE9E4]">UNGGAH TEMPLATE</h3>
                  <p className="text-sm text-[#EBE9E4]/70 leading-relaxed mb-6">
                    Masukkan template sertifikat dalam format Vector PDF atau gambar PNG/JPG kosong.
                  </p>
                </div>
                <div className="p-4 bg-[#1A1A1A] border border-[#333333] rounded-[4px] font-mono text-xs text-[#0000EE]">
                  [ STATUS: DUKUNGAN MULTI-PAGE PDF ]
                </div>
              </div>

              <div className="border-t border-[#333333] pt-8 flex flex-col justify-between group hover:border-[#0000EE] transition-colors">
                <div>
                  <span
                    className="text-6xl font-bold text-[#333333] group-hover:text-[#0000EE] transition-colors block mb-6"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    02
                  </span>
                  <h3 className="text-xl font-bold uppercase mb-4 text-[#EBE9E4]">TEMPEL / GESER DATA</h3>
                  <p className="text-sm text-[#EBE9E4]/70 leading-relaxed mb-4">
                    Uji coba geser kartu CSV tiruan di bawah ini ke dalam kotak zona peletakan:
                  </p>

                  <div
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", "peserta.csv")}
                    className="cursor-grab active:cursor-grabbing p-3 mb-3 bg-[#222222] border border-[#0000EE] rounded-[4px] flex items-center justify-between font-mono text-xs text-white"
                  >
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet className="size-4 text-[#0000EE]" />
                      peserta_seminar.csv
                    </span>
                    <span className="text-[10px] text-[#EBE9E4]/60">[TARIK SAYA]</span>
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`p-5 border-2 border-dashed rounded-[4px] text-center font-mono text-xs transition-all ${
                      dragOver
                        ? "border-[#0000EE] bg-[#0000EE]/10 text-white"
                        : "border-[#444444] bg-[#161616] text-[#EBE9E4]/70"
                    }`}
                  >
                    {droppedFileName ? (
                      <span className="text-[#0000EE] font-bold flex items-center justify-center gap-1">
                        <Check className="size-4" /> {droppedFileName} Diterima!
                      </span>
                    ) : (
                      workflowStatus
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#333333] pt-8 flex flex-col justify-between group hover:border-[#0000EE] transition-colors">
                <div>
                  <span
                    className="text-6xl font-bold text-[#333333] group-hover:text-[#0000EE] transition-colors block mb-6"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    03
                  </span>
                  <h3 className="text-xl font-bold uppercase mb-4 text-[#EBE9E4]">GENERATE & UNDUH</h3>
                  <p className="text-sm text-[#EBE9E4]/70 leading-relaxed mb-6">
                    Rust WASM memproses dokumen secara paralel dan mengemasnya dalam ZIP otomatis per 1.000 berkas.
                  </p>
                </div>
                <div className="p-4 bg-[#1A1A1A] border border-[#333333] rounded-[4px] font-mono text-xs text-[#EBE9E4]/80 flex justify-between items-center">
                  <span>EKSPOR ZIP MULTI-CHUNK</span>
                  <Download className="size-4 text-[#0000EE]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRATINJAU JURNAL */}
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
                  className="border-2 border-[#111111] p-8 rounded-[4px] flex flex-col justify-between hover:bg-[#EBE9E4]/30 hover:shadow-[6px_6px_0px_0px_#111111] transition-all"
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
                Jawaban langsung mengenai kapabilitas mesin, dukungan berkas PDF, serta jaminan privasi data di peramban Anda.
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

        {/* CALL TO ACTION */}
        <section className="py-24 px-6 md:px-12 bg-[#EBE9E4] text-center">
          <div className="max-w-4xl mx-auto border-4 border-[#111111] p-10 sm:p-16 bg-[#FFFFFF] rounded-[8px] shadow-[12px_12px_0px_0px_#111111] active:shadow-[4px_4px_0px_0px_#111111] active:translate-x-2 active:translate-y-2 transition-all">
            <h2
              className="text-4xl sm:text-6xl font-bold uppercase text-[#111111] mb-6 tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              MULAI GENERATE SEKARANG.
            </h2>
            <p className="text-lg text-[#555555] max-w-xl mx-auto mb-10">
              Tanpa kartu kredit, tanpa batasan kuota. Akses studio perenderan dokumen berkecepatan tinggi langsung dari komputer Anda.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-3 bg-[#0000EE] text-[#FFFFFF] px-10 py-5 rounded-[4px] font-bold text-base uppercase tracking-wider hover:bg-[#111111] shadow-[6px_6px_0px_0px_#111111] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
            >
              Buka Studio Gratis
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
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
              Sistem otomatisasi pembuatan sertifikat massal bertenaga Rust WebAssembly. Presisi tinggi untuk penyelenggara acara, pengajar, dan institusi.
            </p>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF] mb-4 font-mono">
              [ NAVIGASI ]
            </div>
            <ul className="flex flex-col gap-2.5 text-sm text-[#EBE9E4]/70 font-mono">
              <li><a href="#simulator" className="hover:text-[#0000EE] transition-colors">Simulator</a></li>
              <li><a href="#studio" className="hover:text-[#0000EE] transition-colors">Kendali Studio</a></li>
              <li><a href="#optimizer" className="hover:text-[#0000EE] transition-colors">Resample PDF</a></li>
              <li><a href="#security" className="hover:text-[#0000EE] transition-colors">Privasi & Rust</a></li>
              <li><a href="#workflow" className="hover:text-[#0000EE] transition-colors">Alur Sistem</a></li>
              <li><a href="#faq" className="hover:text-[#0000EE] transition-colors">Tanya Jawab</a></li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF] mb-4 font-mono">
              [ STATUS SISTEM ]
            </div>
            <p className="text-xs text-[#EBE9E4]/70 font-mono mb-2">Engine: Rust WASM Worker v1.0.4</p>
            <p className="text-xs text-[#0000EE] font-mono font-bold">Client-Side Memory: Terisolasi</p>
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
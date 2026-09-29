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
desc: "Multi-threaded rendering lokal di memori browser tanpa beban server",
},
{
label: "Rekomendasi Peramban",
value: "Chrome, Edge, Brave (Chromium v103+)",
desc: "Wajib Chromium untuk fitur Local Font API; Firefox/Safari didukung terbatas",
},
{
label: "Spesifikasi RAM Minimum",
value: "4 GB (Rekomendasi: 8 GB+)",
desc: "Dibutuhkan untuk alokasi buffer ZIP massal 1.000+ lembar dokumen",
},
{
label: "Dukungan Perangkat",
value: "Desktop / Laptop (Win, macOS, Linux)",
desc: "Optimal pada keyboard + mouse untuk fitur canvas snap & point nudge",
},
{
label: "Format Input & Output",
value: "Vector PDF / Multi-Page → ZIP 300 DPI",
desc: "Mendukung kompresi resample instan dan ekspor chunking otomatis",
},
{
label: "Ketahanan Data",
value: "IndexedDB Auto-Recovery",
desc: "Sesi koordinat dan baris peserta tersimpan aman di storage lokal",
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

const studioSteps = [
{
id: 0,
tab: "elements",
title: "Pilih Elemen",
action: "Klik Kotak Elemen",
inspectorVal: "Nama (Aktif)",
align: "left",
font: "Sans Netral",
coord: "X: 355pt | Y: 245pt",
guide: "Kursor mengklik bounding box elemen teks penerima sertifikat untuk mengaktifkan 8 titik kontrol pengatur posisi.",
},
{
id: 1,
tab: "elements",
title: "Seret Bebas",
action: "Kursor Menggeser Objek",
inspectorVal: "Nama (Menyeret)",
align: "left",
font: "Sans Netral",
coord: "X: 390pt | Y: 278pt",
guide: "Kotak teks digeser menuju area tengah kanvas dengan kalkulasi koordinat numerik yang berjalan secara langsung.",
},
{
id: 2,
tab: "elements",
title: "Smart Snap",
action: "Terkunci di Titik Tengah",
inspectorVal: "Nama (Terkunci)",
align: "center",
font: "Sans Netral",
coord: "X: 421pt (Center) | Y: 298pt (Center)",
guide: "Garis panduan magnetik sumbu X dan Y otomatis mengunci posisi simetris lembar dengan jarak tepi yang seimbang.",
},
{
id: 3,
tab: "elements",
title: "Nudge Presisi",
action: "Shift + Panah Atas (-10pt)",
inspectorVal: "Nama (Nudge)",
align: "center",
font: "Sans Netral",
coord: "X: 421pt | Y: 288pt (ΔY: -10pt)",
guide: "Pintasan keyboard Shift + Panah memindahkan vertikal tepat 10pt tanpa menggeser sumbu horizontal.",
},
{
id: 4,
tab: "fonts",
title: "Ganti Font",
action: "Inspektor Tipografi Instan",
inspectorVal: "Playfair (Serif)",
align: "center",
font: "Serif Formal",
coord: "X: 421pt | Y: 288pt (Serif Formal)",
guide: "Pilihan font Serif langsung terpasang di kanvas dokumen via kompilasi WebAssembly tingkat lokal.",
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
const baseOriginalSizeMB = 18.4;

const [dragOver, setDragOver] = useState(false);
const [droppedFileName, setDroppedFileName] = useState("");
const [workflowStatus, setWorkflowStatus] = useState("Tarik file ke sini");

const calculateCompressedSize = () => {
const ratio = (simScale / 2.0) * simQuality;
const compressed = Math.max(0.4, baseOriginalSizeMB * ratio * 0.15);
return compressed.toFixed(1);
};
const compressedSizeMB = calculateCompressedSize();
const savingsPercent = Math.round((1 - compressedSizeMB / baseOriginalSizeMB) * 100);

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
      }, 500);
    }
  }, index * 260);
});


};

const currentStepData = studioSteps[editorStep] || studioSteps[0];

return (
<div
className={`${sansFont.variable} ${monoFont.variable} bg-[#FFFFFF] text-[#111111] min-h-screen selection:bg-[#111111] selection:text-white antialiased`}
style={{ fontFamily: "var(--font-sans), sans-serif" }}
>
<style>{`@keyframes stepProgressFill { from { width: 0%; } to { width: 100%; } }`}</style>

  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[#111111] focus:text-white focus:px-4 focus:py-2 focus:rounded-[4px] focus:outline-none text-xs"
  >
    Lewati ke konten utama
  </a>

  {/* Utility Bar */}
  <div className="border-b border-[#E5E7EB] bg-[#F5F5F5] text-[#6B7280] text-xs py-2 px-6">
    <div className="max-w-[1360px] mx-auto flex justify-between items-center font-mono text-[11px]">
      <div className="flex items-center gap-3">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#111111]" />
        <span>Mesin render Rust WebAssembly aktif</span>
        <span className="text-[#B0B6C3]">/</span>
        <span>Pemrosesan lokal di memori peramban</span>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-[#6B7280]">
        <span>Output 300 DPI</span>
        <span>Tanpa batas kuota</span>
      </div>
    </div>
  </div>

  {/* Header Utama */}
  <header className="sticky top-0 z-40 bg-[#FFFFFF]/90 border-b border-[#E5E7EB] backdrop-blur-md">
    <div className="max-w-[1360px] mx-auto px-6 h-16 flex justify-between items-center">
      <Link
        href="/"
        className="text-lg font-medium tracking-tight text-[#111111] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111]"
      >
        SertiGen
      </Link>

      <nav className="hidden lg:flex items-center gap-8 text-[13px] text-[#6B7280]">
        <a href="#simulator" className="hover:text-[#111111] transition-colors">
          Simulator
        </a>
        <a href="#studio" className="hover:text-[#111111] transition-colors">
          Kendali Studio
        </a>
        <a href="#optimizer" className="hover:text-[#111111] transition-colors">
          Resample
        </a>
        <a href="#security" className="hover:text-[#111111] transition-colors">
          Privasi
        </a>
        <a href="#workflow" className="hover:text-[#111111] transition-colors">
          Alur
        </a>
        <a href="#faq" className="hover:text-[#111111] transition-colors">
          FAQ
        </a>
        {/* <a href="#blog" className="hover:text-[#111111] transition-colors">
          Blog
        </a> */}
      </nav>

      <Suspense fallback={<div className="h-9 w-20 bg-[#F5F5F5] rounded-[4px]" />}>
        <AuthNav />
      </Suspense>
    </div>
  </header>

  <main id="main-content">
    {/* HERO SECTION */}
    <section className="pt-20 pb-24 px-6 md:px-12 border-b border-[#E5E7EB]">
      <div className="max-w-[1360px] mx-auto grid lg:grid-cols-12 gap-16 items-start">
        <div className="lg:col-span-7 flex flex-col">
          <span className="text-[12px] font-mono uppercase tracking-[0.08em] text-[#6B7280] mb-6">
            Generator Dokumen Sisi Klien
          </span>

          <h1 className="text-5xl sm:text-6xl lg:text-[72px] font-light leading-[1.04] tracking-[-2.5px] text-[#111111]">
            Satu template. Ratusan nama. Siap cetak.
          </h1>

          <p className="mt-8 text-lg sm:text-xl text-[#6B7280] font-light max-w-xl leading-relaxed">
            Tinggalkan proses pengeditan manual satu per satu. Pasang template PDF, masukkan daftar penerima, dan proses ribuan sertifikat langsung di peramban.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 bg-[#111111] text-[#FFFFFF] px-5 py-2.5 h-10 rounded-[4px] font-normal text-sm hover:bg-[#333333] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111]"
            >
              Buka Studio
              <ArrowRight className="size-4" />
            </Link>

            <a
              href="#specs"
              className="inline-flex items-center px-5 py-2.5 h-10 rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] font-normal text-sm hover:bg-[#F5F5F5] transition-colors"
            >
              Spesifikasi Teknis
            </a>
          </div>

          <div className="mt-16 pt-8 border-t border-[#E5E7EB] grid grid-cols-3 gap-6 font-mono">
            <div>
              <div className="text-xl font-normal text-[#111111]">Unlimited</div>
              <div className="text-[11px] text-[#6B7280] mt-1">Tanpa batas kuota</div>
            </div>
            <div>
              <div className="text-xl font-normal text-[#111111]">300 DPI</div>
              <div className="text-[11px] text-[#6B7280] mt-1">Standar siap cetak</div>
            </div>
            <div>
              <div className="text-xl font-normal text-[#111111]">Rust WASM</div>
              <div className="text-[11px] text-[#6B7280] mt-1">Pemrosesan lokal</div>
            </div>
          </div>
        </div>

        {/* Sisi Kanan: Studio Simulator */}
        <div id="simulator" className="lg:col-span-5">
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-6">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3 mb-5 font-mono text-[11px] text-[#6B7280]">
              <span>STAGING SIMULATOR</span>
              <span className="text-[#111111]">
                {isGenerating ? `Mencetak 0${currentPrintIndex}/05` : "Pratinjau Interaktif"}
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
                  className="absolute inset-0 bg-[#FFFFFF] border border-[#E5E7EB] p-5 rounded-[4px] flex flex-col justify-between transition-all"
                >
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#6B7280] border-b border-[#E5E7EB] pb-1">
                    <span>LEMBAR #0{sheet.id + 1}</span>
                    <span>TERCETAK</span>
                  </div>

                  <div className="text-center my-auto">
                    <div className="text-[9px] font-mono uppercase tracking-wider text-[#6B7280] mb-1">
                      Sertifikat Kelulusan
                    </div>
                    <div className="text-sm font-medium text-[#111111] truncate px-2">
                      {sheet.name}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[9px] font-mono text-[#6B7280] pt-1 border-t border-[#E5E7EB]">
                    <span>300 DPI</span>
                    <span>VERIFIKASI LOKAL</span>
                  </div>
                </div>
              ))}

              <div className="relative z-0 p-6 h-full flex flex-col items-center justify-center text-center">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#6B7280] mb-2">
                  Sertifikat Penghargaan
                </div>

                <div
                  className={`${fontFamilyType} text-[#111111] my-2 transition-all duration-150 font-medium px-4 break-words max-w-full`}
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.2 }}
                >
                  {sampleName || "Nama Peserta"}
                </div>

                <p className="text-[11px] text-[#6B7280] max-w-[260px] leading-relaxed mt-1">
                  Telah menyelesaikan program pelatihan teknis dengan kualifikasi memuaskan.
                </p>

                <div className="mt-4 pt-2 border-t border-[#E5E7EB] w-48 flex justify-between text-[9px] font-mono text-[#6B7280]">
                  <span>ID: SG-2026-X</span>
                  <span>STATUS: VALID</span>
                </div>

                {isGenerating && (
                  <div className="absolute inset-0 bg-[#FFFFFF]/90 text-[#111111] flex flex-col items-center justify-center font-mono text-xs gap-2 z-40">
                    <RefreshCw className="size-4 animate-spin text-[#111111]" />
                    <span>Memproses antrean render...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="interactive-name" className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1">
                  Nama Penerima:
                </label>
                <input
                  id="interactive-name"
                  type="text"
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  placeholder="Masukkan nama..."
                  className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1">
                    Jenis Huruf:
                  </label>
                  <select
                    value={fontFamilyType}
                    onChange={(e) => setFontFamilyType(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] px-2 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  >
                    <option value="font-serif">Serif Formal</option>
                    <option value="font-sans">Sans Netral</option>
                    <option value="font-mono">Monospace</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1">
                    Ukuran ({fontSize}px):
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="36"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full mt-2 accent-[#111111] cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={copySampleNames}
                  className="text-xs font-mono text-[#6B7280] hover:text-[#111111] inline-flex items-center gap-1.5"
                >
                  <Copy className="size-3.5" />
                  {copiedNotification ? "Tersalin ke clipboard" : "Salin 5 contoh nama"}
                </button>

                <button
                  type="button"
                  onClick={triggerSimulatedGeneration}
                  disabled={isGenerating}
                  className="w-full sm:w-auto bg-[#111111] text-[#FFFFFF] text-xs font-normal px-4 py-2 rounded-[4px] hover:bg-[#333333] transition-colors flex items-center justify-center gap-2"
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

    {/* SEKSI 1: FITUR KONTROL STUDIO (MINIATUR REALISTIS ANTARMUKA CANVAS CETAK LOKAL) */}
    <section id="studio" className="py-20 px-6 md:px-12 border-b border-[#E5E7EB]">
      <div className="max-w-[1360px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B7280] block mb-2.5">
              Kendali Studio
            </span>
            <h2 className="text-3xl sm:text-5xl font-light tracking-[-1.5px] text-[#111111]">
              Presisi hingga satuan titik.
            </h2>
          </div>
          <p className="text-[#6B7280] max-w-md text-sm sm:text-base font-light leading-relaxed">
            Bukan sekadar form tempel teks biasa. Seluruh fleksibilitas penataan dokumen desktop berjalan langsung di peramban Anda.
          </p>
        </div>

        {/* Mockup Antarmuka Penuh Studio Kanvas */}
        <div className="border border-[#E5E7EB] rounded-md overflow-hidden bg-[#FFFFFF] shadow-xs">
          {/* Studio Mockup Top Header */}
          <div className="h-11 border-b border-[#E5E7EB] px-4 flex items-center justify-between text-xs font-mono bg-[#FFFFFF]">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 mr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB] border border-[#D1D5DB]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB] border border-[#D1D5DB]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB] border border-[#D1D5DB]" />
              </div>
              <span className="text-[#111111] font-medium text-[11px]">SertiGen</span>
              <span className="text-[#D1D5DB]">/</span>
              <span className="text-[#6B7280] uppercase text-[10px] hidden sm:inline">Studio Mandiri</span>
              <span className="text-[#D1D5DB] hidden sm:inline">/</span>
              <span className="text-[#111111] text-[10px] truncate max-w-[180px]">
                template_sertifikat_2026.pdf
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditorPaused(!isEditorPaused)}
                className="text-[10px] font-mono text-[#6B7280] hover:text-[#111111] inline-flex items-center gap-1 border border-[#E5E7EB] bg-[#F5F5F5] px-2 py-0.5 rounded-[3px] transition-colors"
                title={isEditorPaused ? "Mulai simulasi" : "Jeda simulasi"}
              >
                {isEditorPaused ? (
                  <>
                    <Play className="size-2.5 fill-current" />
                    <span>Putar</span>
                  </>
                ) : (
                  <>
                    <Pause className="size-2.5 fill-current" />
                    <span>Jeda</span>
                  </>
                )}
              </button>

              <span className="text-[10px] font-mono text-white bg-[#111111] px-2.5 py-0.5 rounded-[3px] flex items-center gap-1.5">
                <Zap className="size-3" />
                <span>Cetak ZIP (150)</span>
              </span>
            </div>
          </div>

          {/* Progress Line Indikator Siklus Langkah Otomatis */}
          <div className="w-full bg-[#E5E7EB] h-[2px] overflow-hidden">
            <div
              key={`${editorStep}-${isEditorPaused}`}
              style={{
                animation: isEditorPaused ? "none" : "stepProgressFill 3.5s linear forwards",
                width: isEditorPaused ? "100%" : undefined,
              }}
              className="h-full bg-[#111111]"
            />
          </div>

          {/* Studio Body: Dok Kiri + Panel Inspektor + Kanvas Stage */}
          <div className="grid grid-cols-12 min-h-[380px] sm:min-h-[430px]">
            {/* 1. Dok Toolbar Ikon Kiri (Mini Dock) */}
            <div className="col-span-1 sm:col-span-1 border-r border-[#E5E7EB] py-3 flex flex-col items-center gap-2 bg-[#FFFFFF]">
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
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] flex flex-col items-center justify-center transition-colors ${
                      isTabActive
                        ? "bg-[#111111] text-white"
                        : "text-[#9CA3AF] hover:text-[#111111]"
                    }`}
                    title={tab.label}
                  >
                    <tab.icon className="size-3 sm:size-3.5" />
                  </div>
                );
              })}
            </div>

            {/* 2. Mini Inspector Panel (Menampilkan Pengaturan Elemen Aktif yang Sinkron) */}
            <div className="hidden md:flex md:col-span-3 border-r border-[#E5E7EB] p-3.5 flex-col justify-between bg-[#FFFFFF] font-mono text-xs">
              <div className="space-y-3.5">
                <div className="border-b border-[#E5E7EB] pb-2">
                  <span className="text-[10px] text-[#6B7280] uppercase block">Inspektor Properti</span>
                  <span className="text-xs font-medium text-[#111111]">{currentStepData.inspectorVal}</span>
                </div>

                <div>
                  <label className="text-[9px] text-[#6B7280] uppercase block mb-1">Target Elemen</label>
                  <div className="p-1.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-[3px] text-[10px] text-[#111111]">
                    [KOLOM] Nama Peserta
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-[#6B7280] uppercase block mb-1">Koordinat (X & Y)</label>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="p-1 bg-[#F5F5F5] border border-[#E5E7EB] rounded-[3px]">
                      X: {editorStep >= 2 ? "421pt" : "375pt"}
                    </div>
                    <div className="p-1 bg-[#F5F5F5] border border-[#E5E7EB] rounded-[3px]">
                      Y: {editorStep === 3 || editorStep === 4 ? "288pt" : editorStep === 2 ? "298pt" : "260pt"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-[#6B7280] uppercase block mb-1">Perataan Teks</label>
                  <div className="grid grid-cols-3 gap-1 text-[9px] text-center">
                    <span className={`p-1 rounded-[2px] border ${currentStepData.align === "left" ? "bg-[#111111] text-white border-[#111111]" : "border-[#E5E7EB] text-[#6B7280]"}`}>Kiri</span>
                    <span className={`p-1 rounded-[2px] border ${currentStepData.align === "center" ? "bg-[#111111] text-white border-[#111111]" : "border-[#E5E7EB] text-[#6B7280]"}`}>Tengah</span>
                    <span className="p-1 rounded-[2px] border border-[#E5E7EB] text-[#6B7280]">Kanan</span>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-[#6B7280] uppercase block mb-1">Font Aktif</label>
                  <div className="p-1.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-[3px] text-[10px] text-[#111111] truncate">
                    {currentStepData.font}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5E7EB] text-[9px] text-[#6B7280]">
                Status: <span className="text-[#111111] font-medium">{currentStepData.action}</span>
              </div>
            </div>

            {/* 3. Main Stage Kanvas Sertifikat Realistis */}
            <div className="col-span-11 md:col-span-8 bg-[#F5F5F5] p-4 sm:p-6 flex flex-col items-center justify-between relative overflow-hidden select-none">
              {/* Top Bar Pengukur Kanvas */}
              <div className="w-full flex justify-between items-center text-[10px] font-mono text-[#6B7280] mb-2">
                <span>KANVAS: 842 × 595 pt (A4 Landscape)</span>
                <div className="flex items-center gap-1 border border-[#E5E7EB] bg-white px-2 py-0.5 rounded-[3px]">
                  <span>Skala: 100%</span>
                </div>
              </div>

              {/* Kertas Sertifikat Putih */}
              <div className="relative w-full max-w-[540px] aspect-[16/10] bg-white border border-[#E5E7EB] rounded-[2px] shadow-sm flex flex-col justify-between p-5 overflow-hidden">
                {/* Grid Tekstur Kanvas Halus */}
                <div
                  className="absolute inset-0 opacity-[0.03] pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#111111 1px, transparent 1px)",
                    backgroundSize: "14px 14px",
                  }}
                />

                {/* Sumbu Smart Snap Magnetik (Aktif saat Tahap 2: Smart Snap) */}
                {editorStep === 2 && (
                  <>
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#111111] z-20 opacity-80" />
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-[#111111] z-20 opacity-80" />
                    <div className="absolute top-2 right-2 text-[8px] font-mono bg-[#111111] text-white px-1.5 py-0.5 rounded-[2px] z-30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Snap Tengah Sempurna
                    </div>
                  </>
                )}

                {/* Template Kop Sertifikat */}
                <div className="text-center pt-1 z-0">
                  <div className="text-[8px] font-mono uppercase tracking-[0.14em] text-[#9CA3AF]">
                    LEMBAGA PELATIHAN & TEKNOLOGI NASIONAL
                  </div>
                  <div className="text-xs sm:text-sm font-light text-[#111111] uppercase tracking-wider mt-0.5">
                    SERTIFIKAT KOMPETENSI
                  </div>
                  <div className="w-10 h-px bg-[#E5E7EB] mx-auto mt-1" />
                </div>

                {/* Floating Shortcut Badge saat Nudge (Tahap 3) */}
                {editorStep === 3 && (
                  <div
                    className="absolute z-30 bg-white border border-[#111111] text-[#111111] px-2 py-0.5 rounded-[3px] font-mono text-[9px] flex items-center gap-1 shadow-xs transition-all duration-300"
                    style={{ transform: "translate(120px, 35px)" }}
                  >
                    <kbd className="px-1 py-0.2 bg-[#F5F5F5] border border-[#E5E7EB] rounded text-[8px] font-medium">Shift</kbd>
                    <span>+</span>
                    <kbd className="px-1 py-0.2 bg-[#F5F5F5] border border-[#E5E7EB] rounded text-[8px] font-medium">↑</kbd>
                    <span className="text-[#6B7280] text-[8px] ml-0.5">ΔY: -10pt</span>
                  </div>
                )}

                {/* Floating Font Badge saat Ganti Font (Tahap 4) */}
                {editorStep === 4 && (
                  <div
                    className="absolute z-30 bg-[#111111] text-white px-2.5 py-1 rounded-[3px] font-mono text-[9px] flex items-center gap-2 shadow-xs transition-all duration-300"
                    style={{ transform: "translate(80px, 32px)" }}
                  >
                    <span className="text-[#9CA3AF]">Font:</span>
                    <span className="font-serif font-medium underline underline-offset-2">Serif Formal (Playfair)</span>
                    <span className="text-emerald-400">0.4ms</span>
                  </div>
                )}

                {/* Bounding Box Teks Nama Peserta (Bergerak Sesuai Tahap) */}
                <div
                  className={`relative mx-auto border transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] z-10 flex flex-col items-center px-4 py-1.5 rounded-[2px] ${
                    editorStep === 0
                      ? "border-[#111111] bg-[#F5F5F5] border-dashed"
                      : editorStep === 1
                      ? "border-[#111111] bg-white shadow-md border-solid rotate-[-1deg] scale-[1.02]"
                      : editorStep === 2
                      ? "border-[#111111] bg-[#F5F5F5] ring-1 ring-[#111111]/20 scale-100"
                      : "border-[#111111] bg-white"
                  }`}
                  style={{
                    transform:
                      editorStep === 0
                        ? "translate(-50px, 20px)"
                        : editorStep === 1
                        ? "translate(-18px, 8px)"
                        : editorStep === 2
                        ? "translate(0px, 0px)"
                        : "translate(0px, -10px)",
                  }}
                >
                  {/* 8 Handles Titik Sudut */}
                  {editorStep <= 3 && (
                    <>
                      <span className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-white border border-[#111111] rounded-[1px]" />
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white border border-[#111111] rounded-[1px]" />
                      <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-white border border-[#111111] rounded-[1px]" />
                      <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-white border border-[#111111] rounded-[1px]" />
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white border border-[#111111] rounded-[1px]" />
                      <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-white border border-[#111111] rounded-[1px]" />
                    </>
                  )}

                  <span
                    className={`block text-xs sm:text-sm text-[#111111] transition-all duration-300 ${
                      editorStep === 4
                        ? "font-serif tracking-widest font-semibold text-[15px]"
                        : "font-sans font-normal"
                    }`}
                  >
                    Dr. Rian Hermawan, M.Kom
                  </span>
                </div>

                {/* Kursor Mouse Virtual yang Bergerak Nyata */}
                <div
                  className="absolute z-40 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                  style={{
                    top:
                      editorStep === 0
                        ? "64%"
                        : editorStep === 1
                        ? "52%"
                        : editorStep === 2
                        ? "48%"
                        : editorStep === 3
                        ? "42%"
                        : "38%",
                    left:
                      editorStep === 0
                        ? "38%"
                        : editorStep === 1
                        ? "46%"
                        : editorStep === 2
                        ? "50%"
                        : editorStep === 3
                        ? "50%"
                        : "58%",
                  }}
                >
                  {editorStep === 0 && (
                    <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full border border-[#111111] animate-ping opacity-60 pointer-events-none" />
                  )}

                  {editorStep === 1 ? (
                    <div className="text-[#111111] flex items-center">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M10 2a2 2 0 00-2 2v6.2l-.7-.4a2.2 2.2 0 00-3.1.6 2.2 2.2 0 00.5 3.1l6.7 5.4a4 4 0 002.6.9h4a4 4 0 004-4V8a2 2 0 00-2-2 2 2 0 00-2 2v-.8a2 2 0 00-2-2 2 2 0 00-2 2V3a2 2 0 00-2-2z" />
                      </svg>
                      <span className="bg-[#111111] text-white text-[8px] font-mono px-1 py-0.5 rounded-[2px] ml-1 whitespace-nowrap">
                        Menyeret...
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-[#111111] shrink-0"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M4 2l16 12-7.5 1.5L9 22 4 2z" />
                      </svg>
                      <span className="bg-[#111111] text-white text-[8px] font-mono px-1.5 py-0.5 rounded-[2px] ml-1 -mt-1 whitespace-nowrap">
                        {editorStep === 0 && "Klik Elemen"}
                        {editorStep === 2 && "Snap Terkunci"}
                        {editorStep === 3 && "Nudge 10pt"}
                        {editorStep === 4 && "Font Terpasang"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Template Footer Sertifikat */}
                <div className="flex justify-between items-end pb-1 text-[8px] font-mono text-[#9CA3AF] border-t border-[#E5E7EB] pt-1.5 z-0">
                  <div>
                    <span>NO: SG-2026-0081</span>
                  </div>
                  <div className="text-right">
                    <span>TANDA TANGAN RESMI</span>
                  </div>
                </div>
              </div>

              {/* Keterangan Koordinat di Kaki Kanvas */}
              <div className="w-full flex justify-between items-center text-[10px] font-mono text-[#6B7280] mt-2">
                <span className="text-[#111111] font-medium">{currentStepData.coord}</span>
                <span>{currentStepData.action}</span>
              </div>
            </div>
          </div>

          {/* Studio Mockup Bottom Status Bar */}
          <div className="h-7 border-t border-[#E5E7EB] px-4 flex items-center justify-between text-[10px] font-mono bg-[#FFFFFF] text-[#6B7280]">
            <div className="flex items-center gap-3">
              <span>CSV: <strong className="text-[#111111] font-normal">150 Baris</strong></span>
              <span className="text-[#E5E7EB]">/</span>
              <span>Template: <strong className="text-[#111111] font-normal">1.4 MB</strong></span>
              <span className="text-[#E5E7EB]">/</span>
              <span>Zoom: <strong className="text-[#111111] font-normal">100%</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[#111111]">WASM Worker Siap</span>
            </div>
          </div>
        </div>

        {/* Stepper Navigasi dan Deskripsi Langkah */}
        <div className="mt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#F5F5F5] border border-[#E5E7EB] p-4 rounded-md">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-[#6B7280] block">
              Tahap {editorStep + 1} dari 5: {currentStepData.title}
            </span>
            <p className="text-xs text-[#111111] leading-relaxed">
              {currentStepData.guide}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {studioSteps.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setEditorStep(idx)}
                className={`py-1 px-2.5 text-center font-mono text-[10px] rounded-[3px] border transition-colors ${
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

        {/* Grid 4 Fitur Presisi Studio */}
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              num: "01",
              title: "Smart Snap Guides",
              desc: "Sumbu tengah otomatis (X & Y) mengunci posisi elemen tepat di titik simetris lembar tanpa butuh penggaris manual.",
            },
            {
              num: "02",
              title: "Nudge Tombol Panah",
              desc: "Gunakan tombol panah keyboard untuk geseran mikro 1pt, atau tahan Shift untuk memindahkan 10pt dalam sekali tekan.",
            },
            {
              num: "03",
              title: "Chromium Font API",
              desc: "Pindai dan gunakan seluruh font sistem komputer Anda langsung tanpa repot upload berkas TTF atau OTF.",
            },
            {
              num: "04",
              title: "Multi-Page Mapping",
              desc: "Petakan teks ke halaman 1 atau 2 sertifikat, lalu ekspor koordinat dalam berkas JSON ringan untuk dibagikan ke panitia.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="border border-[#E5E7EB] p-4.5 rounded-md bg-[#FFFFFF] flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-[11px] text-[#6B7280] block mb-1.5">
                  {item.num}
                </span>
                <h3 className="text-sm font-medium text-[#111111] mb-1">{item.title}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed font-light">{item.desc}</p>
              </div>
              <div className="mt-3.5 pt-2.5 border-t border-[#E5E7EB] font-mono text-[10px] text-[#111111] flex items-center justify-between">
                <span>Dukungan Presisi</span>
                <Check className="size-3.5 text-[#111111]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* SEKSI 2: RESAMPLE & OPTIMASI BERKAS */}
    <section id="optimizer" className="py-24 px-6 md:px-12 border-b border-[#E5E7EB] bg-[#F5F5F5]">
      <div className="max-w-[1360px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <div>
            <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B7280] block mb-3">
              Optimasi Berkas
            </span>
            <h2 className="text-3xl sm:text-5xl font-light tracking-[-1.5px] text-[#111111]">
              Hemat ruang penyimpanan.
            </h2>
          </div>
          <p className="text-[#6B7280] max-w-md text-sm sm:text-base font-light leading-relaxed">
            Cegah ukuran berkas ZIP unduhan membengkak. Atur skala resolusi dan kualitas kompresi secara instan sebelum diekspor massal.
          </p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E7EB] p-8 md:p-12 rounded-md">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="flex justify-between items-center text-xs font-mono mb-2">
                  <span className="text-[#6B7280]">Skala Resample Kanvas</span>
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
                <div className="flex justify-between text-[11px] font-mono text-[#6B7280] mt-1">
                  <span>0.5x (Draft)</span>
                  <span>1.5x (Standar)</span>
                  <span>2.5x (High-Res)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-mono mb-2">
                  <span className="text-[#6B7280]">Kualitas Kompresi JPEG</span>
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
                <div className="flex justify-between text-[11px] font-mono text-[#6B7280] mt-1">
                  <span>20% (Ringan)</span>
                  <span>80% (Standar Tajam)</span>
                  <span>100% (Lossless)</span>
                </div>
              </div>

              <div className="p-4 bg-[#F5F5F5] rounded-[4px] border border-[#E5E7EB] font-mono text-xs">
                <span className="text-[#6B7280] block mb-1">Estimasi 1.000 Sertifikat</span>
                <span className="text-sm font-normal text-[#111111]">
                  Dari {(baseOriginalSizeMB * 1).toFixed(1)} GB menyusut menjadi {(compressedSizeMB * 1).toFixed(1)} GB.
                </span>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              <div className="bg-[#F5F5F5] border border-[#E5E7EB] p-6 rounded-md flex flex-col justify-between">
                <span className="text-xs font-mono text-[#6B7280] block mb-2">Ukuran Awal</span>
                <div className="text-3xl font-light tracking-tight text-[#111111]">
                  {baseOriginalSizeMB} MB
                </div>
                <span className="text-[11px] font-mono text-[#6B7280] mt-4 block border-t border-[#E5E7EB] pt-2">
                  Sebelum optimasi
                </span>
              </div>

              <div className="bg-[#FFFFFF] border border-[#111111] p-6 rounded-md flex flex-col justify-between">
                <span className="text-xs font-mono text-[#111111] block mb-2">Hasil Optimasi</span>
                <div className="text-3xl font-light tracking-tight text-[#111111]">
                  {compressedSizeMB} MB
                </div>
                <span className="text-[11px] font-mono text-[#6B7280] mt-4 block border-t border-[#E5E7EB] pt-2">
                  Penghematan: {savingsPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* SEKSI 3: PRIVASI & ARSITEKTUR LOKAL */}
    <section id="security" className="py-24 px-6 md:px-12 border-b border-[#E5E7EB]">
      <div className="max-w-[1360px] mx-auto">
        <div className="mb-16">
          <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B7280] block mb-3">
            Arsitektur Komputasi Lokal
          </span>
          <h2 className="text-3xl sm:text-5xl font-light tracking-[-1.5px] text-[#111111]">
            Privasi penuh tanpa transmisi server.
          </h2>
          <p className="mt-4 text-[#6B7280] max-w-2xl text-sm sm:text-base font-light leading-relaxed">
            Seluruh data peserta dan berkas dokumen berharga Anda tidak pernah meninggalkan komputer lokal.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="border-t border-[#E5E7EB] pt-6 flex flex-col justify-between">
            <div>
              <span className="font-mono text-2xl font-light text-[#111111] block mb-4">01</span>
              <h3 className="text-lg font-normal text-[#111111] mb-2">
                Rust WebAssembly Core
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed font-light">
                Mesin pencetak disusun dengan kompilasi biner WebAssembly tingkat rendah yang memberikan performa setara aplikasi desktop C++ langsung di peramban.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-[#E5E7EB] font-mono text-[11px] text-[#6B7280]">
              Teknologi: wasm-bindgen
            </div>
          </div>

          <div className="border-t border-[#E5E7EB] pt-6 flex flex-col justify-between">
            <div>
              <span className="font-mono text-2xl font-light text-[#111111] block mb-4">02</span>
              <h3 className="text-lg font-normal text-[#111111] mb-2">
                IndexedDB Session Guard
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed font-light">
                Sesi aman jika peramban tidak sengaja tertutup. Seluruh koordinat dan baris nama tersimpan secara lokal dan otomatis dipulihkan.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-[#E5E7EB] font-mono text-[11px] text-[#6B7280]">
              Penyimpanan: Offline Auto-Restore
            </div>
          </div>

          <div className="border-t border-[#E5E7EB] pt-6 flex flex-col justify-between">
            <div>
              <span className="font-mono text-2xl font-light text-[#111111] block mb-4">03</span>
              <h3 className="text-lg font-normal text-[#111111] mb-2">
                Web Worker Multi-Thread
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed font-light">
                Proses render berjalan di thread terpisah. Antarmuka tetap responsif bahkan saat memproses dan mengemas 1.000 sertifikat dalam arsip ZIP.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-[#E5E7EB] font-mono text-[11px] text-[#6B7280]">
              Kapasitas: 1.000 Berkas per chunk
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* SPESIFIKASI TEKNIS */}
    <section id="specs" className="py-24 px-6 md:px-12 border-b border-[#E5E7EB]">
      <div className="max-w-[1360px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <div>
            <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B7280] block mb-3">
              Persyaratan Sistem
            </span>
            <h2 className="text-3xl sm:text-5xl font-light tracking-[-1.5px] text-[#111111]">
              Spesifikasi perangkat.
            </h2>
          </div>
          <p className="text-[#6B7280] max-w-md text-sm sm:text-base font-light leading-relaxed">
            Karena pemrosesan berkas berjalan penuh di komputer Anda, pastikan perangkat memenuhi rekomendasi berikut untuk efisiensi maksimal.
          </p>
        </div>

        <div className="border-t border-[#E5E7EB] divide-y divide-[#E5E7EB]">
          {technicalSpecs.map((spec, idx) => (
            <div
              key={spec.label}
              className="py-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline"
            >
              <div className="md:col-span-1 font-mono text-xs text-[#6B7280]">
                0{idx + 1}
              </div>
              <div className="md:col-span-4 font-mono text-xs uppercase text-[#6B7280]">
                {spec.label}
              </div>
              <div className="md:col-span-4 text-base font-normal text-[#111111]">
                {spec.value}
              </div>
              <div className="md:col-span-3 text-xs text-[#6B7280] font-light">
                {spec.desc}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="border border-[#E5E7EB] p-6 rounded-md bg-[#FFFFFF]">
            <div className="font-mono text-[11px] text-[#6B7280] mb-2 uppercase">Peramban Rekomendasi</div>
            <h3 className="text-base font-normal text-[#111111] mb-2">Chromium Desktop</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed font-light">
              Google Chrome atau Microsoft Edge versi 103 ke atas membuka akses ke Chromium Local Font API untuk memuat font internal sistem.
            </p>
          </div>

          <div className="border border-[#E5E7EB] p-6 rounded-md bg-[#FFFFFF]">
            <div className="font-mono text-[11px] text-[#6B7280] mb-2 uppercase">Memori Kerja</div>
            <h3 className="text-base font-normal text-[#111111] mb-2">RAM 8 GB Disarankan</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed font-light">
              Meskipun RAM 4 GB mencukupi untuk kebutuhan standar, kapasitas 8 GB disarankan untuk ekspor ZIP di atas 1.000 lembar dokumen beresolusi 300 DPI.
            </p>
          </div>

          <div className="border border-[#E5E7EB] p-6 rounded-md bg-[#FFFFFF]">
            <div className="font-mono text-[11px] text-[#6B7280] mb-2 uppercase">Antarmuka Masukan</div>
            <h3 className="text-base font-normal text-[#111111] mb-2">Keyboard & Mouse</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed font-light">
              Dirancang untuk presisi desktop dengan dukungan pintasan keyboard, geser kanvas, serta perpindahan per 1 titik menggunakan tombol panah.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* USE CASES */}
    <section id="use-cases" className="py-24 px-6 md:px-12 border-b border-[#E5E7EB] bg-[#F5F5F5]">
      <div className="max-w-[1360px] mx-auto">
        <div className="mb-16">
          <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B7280] block mb-3">
            Implementasi
          </span>
          <h2 className="text-3xl sm:text-5xl font-light tracking-[-1.5px] text-[#111111]">
            Skenario penggunaan.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((uc) => (
            <div
              key={uc.id}
              className="bg-[#FFFFFF] border border-[#E5E7EB] p-6 rounded-md flex flex-col justify-between"
            >
              <div>
                <span className="inline-block font-mono text-[10px] tracking-wider text-[#6B7280] bg-[#F5F5F5] px-2 py-0.5 rounded-[2px] mb-4">
                  {uc.badge}
                </span>
                <h3 className="text-lg font-normal text-[#111111] mb-2">
                  {uc.title}
                </h3>
                <p className="text-xs text-[#6B7280] leading-relaxed font-light">
                  {uc.desc}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#E5E7EB] flex items-center justify-between font-mono text-[11px] text-[#111111]">
                <span>Sesuai kebutuhan</span>
                <Check className="size-3.5 text-[#111111]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ALUR KERJA TIGA LANGKAH */}
    <section id="workflow" className="py-24 px-6 md:px-12 border-b border-[#E5E7EB]">
      <div className="max-w-[1360px] mx-auto">
        <div className="mb-16">
          <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B7280] block mb-3">
            Alur Sistem
          </span>
          <h2 className="text-3xl sm:text-5xl font-light tracking-[-1.5px] text-[#111111]">
            Tiga langkah kerja.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="border-t border-[#E5E7EB] pt-6 flex flex-col justify-between">
            <div>
              <span className="text-4xl font-light text-[#B0B6C3] block mb-4">01</span>
              <h3 className="text-lg font-normal mb-2 text-[#111111]">Unggah Template</h3>
              <p className="text-xs sm:text-sm text-[#6B7280] font-light leading-relaxed mb-6">
                Masukkan template sertifikat dalam format Vector PDF atau gambar PNG/JPG kosong.
              </p>
            </div>
            <div className="py-2 border-t border-[#E5E7EB] font-mono text-[11px] text-[#6B7280]">
              Dukungan dokumen multi-halaman
            </div>
          </div>

          <div className="border-t border-[#E5E7EB] pt-6 flex flex-col justify-between">
            <div>
              <span className="text-4xl font-light text-[#B0B6C3] block mb-4">02</span>
              <h3 className="text-lg font-normal mb-2 text-[#111111]">Masukkan Daftar Data</h3>
              <p className="text-xs sm:text-sm text-[#6B7280] font-light leading-relaxed mb-4">
                Uji coba geser kartu CSV tiruan di bawah ini ke dalam kotak peletakan:
              </p>

              <div
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", "peserta.csv")}
                className="cursor-grab active:cursor-grabbing p-2.5 mb-3 bg-[#F5F5F5] border border-[#E5E7EB] rounded-[4px] flex items-center justify-between font-mono text-xs text-[#111111]"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="size-3.5 text-[#6B7280]" />
                  peserta_seminar.csv
                </span>
                <span className="text-[10px] text-[#6B7280]">[Tarik File]</span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`p-4 border border-dashed rounded-[4px] text-center font-mono text-xs transition-colors ${
                  dragOver
                    ? "border-[#111111] bg-[#F5F5F5] text-[#111111]"
                    : "border-[#E5E7EB] text-[#6B7280]"
                }`}
              >
                {droppedFileName ? (
                  <span className="text-[#111111] flex items-center justify-center gap-1.5">
                    <Check className="size-3.5 text-[#111111]" /> {droppedFileName} diterima
                  </span>
                ) : (
                  workflowStatus
                )}
              </div>
            </div>
            <div className="py-2 border-t border-[#E5E7EB] font-mono text-[11px] text-[#6B7280] mt-4">
              Pemetaan kolom baris per baris
            </div>
          </div>

          <div className="border-t border-[#E5E7EB] pt-6 flex flex-col justify-between">
            <div>
              <span className="text-4xl font-light text-[#B0B6C3] block mb-4">03</span>
              <h3 className="text-lg font-normal mb-2 text-[#111111]">Generate & Unduh</h3>
              <p className="text-xs sm:text-sm text-[#6B7280] font-light leading-relaxed mb-6">
                Rust WASM memproses dokumen secara paralel dan mengemasnya dalam ZIP otomatis per 1.000 berkas.
              </p>
            </div>
            <div className="py-2 border-t border-[#E5E7EB] font-mono text-[11px] text-[#6B7280] flex justify-between items-center">
              <span>Ekspor ZIP multi-chunk</span>
              <Download className="size-3.5 text-[#111111]" />
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* PRATINJAU JURNAL */}
    <section className="py-24 px-6 md:px-12 border-b border-[#E5E7EB] bg-[#F5F5F5]">
      <div className="max-w-[1360px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <div>
            <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B7280] block mb-3">
              Dokumentasi
            </span>
            <h2 className="text-3xl sm:text-5xl font-light tracking-[-1.5px] text-[#111111]">
              Catatan teknis.
            </h2>
          </div>
          <Link href="/blog" className="text-xs font-mono text-[#111111] hover:text-[#6B7280] flex items-center gap-1.5 transition-colors">
            Lihat semua artikel <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {journalPosts.map((post) => (
            <div
              key={post.title}
              className="border border-[#E5E7EB] bg-[#FFFFFF] p-8 rounded-md flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center font-mono text-xs text-[#6B7280] mb-4">
                  <span>{post.tag}</span>
                  <span>{post.date}</span>
                </div>
                <h3 className="text-xl font-normal text-[#111111] mb-3 leading-snug">
                  {post.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#6B7280] font-light leading-relaxed">
                  {post.desc}
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-[#E5E7EB]">
                <span className="font-mono text-xs text-[#111111] flex items-center gap-1.5">
                  Baca panduan <ArrowRight className="size-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* FAQ ACCORDION */}
    <section id="faq" className="py-24 px-6 md:px-12 border-b border-[#E5E7EB]">
      <div className="max-w-[1360px] mx-auto grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B7280] block mb-3">
            Tanya Jawab
          </span>
          <h2 className="text-3xl sm:text-5xl font-light tracking-[-1.5px] text-[#111111]">
            Pertanyaan umum.
          </h2>
          <p className="mt-4 text-[#6B7280] text-sm sm:text-base font-light leading-relaxed">
            Informasi langsung mengenai kemampuan mesin perender, format berkas, serta integritas data di peramban Anda.
          </p>
        </div>

        <div className="lg:col-span-7 divide-y divide-[#E5E7EB] border-y border-[#E5E7EB]">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-5">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex justify-between items-center text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111]"
                >
                  <span className="text-base font-normal text-[#111111] pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`size-4 text-[#6B7280] shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#111111]" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-xs sm:text-sm text-[#6B7280] font-light leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>

    {/* CALL TO ACTION */}
    <section className="py-24 px-6 md:px-12 bg-[#F5F5F5] text-center">
      <div className="max-w-3xl mx-auto border border-[#E5E7EB] p-12 sm:p-16 bg-[#FFFFFF] rounded-md">
        <h2 className="text-3xl sm:text-5xl font-light tracking-[-1.5px] text-[#111111] mb-4">
          Mulai buat sertifikat.
        </h2>
        <p className="text-sm sm:text-base text-[#6B7280] font-light max-w-lg mx-auto mb-8 leading-relaxed">
          Tanpa pendaftaran berbayar, tanpa batasan kuota. Akses studio pembuatan sertifikat berkecepatan tinggi langsung dari komputer Anda.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 bg-[#111111] text-[#FFFFFF] px-6 py-2.5 h-10 rounded-[4px] font-normal text-sm hover:bg-[#333333] transition-colors"
        >
          Buka Studio Gratis
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  </main>

  {/* FOOTER */}
  <footer className="border-t border-[#E5E7EB] bg-[#FFFFFF] py-16 px-6 md:px-12">
    <div className="max-w-[1360px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-[#E5E7EB] pb-12">
      <div className="md:col-span-2">
        <span className="text-base font-medium text-[#111111] block mb-3">
          SertiGen
        </span>
        <p className="text-xs text-[#6B7280] font-light leading-relaxed max-w-sm">
          Sistem otomatisasi pembuatan sertifikat massal bertenaga Rust WebAssembly. Presisi tinggi untuk penyelenggara acara, pengajar, dan institusi.
        </p>
      </div>

      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#111111] mb-3">
          Navigasi
        </div>
        <ul className="flex flex-col gap-2 text-xs text-[#6B7280]">
          <li><a href="#simulator" className="hover:text-[#111111] transition-colors">Simulator</a></li>
          <li><a href="#studio" className="hover:text-[#111111] transition-colors">Kendali Studio</a></li>
          <li><a href="#optimizer" className="hover:text-[#111111] transition-colors">Resample Berkas</a></li>
          <li><a href="#security" className="hover:text-[#111111] transition-colors">Privasi & WebAssembly</a></li>
          <li><a href="#workflow" className="hover:text-[#111111] transition-colors">Alur Sistem</a></li>
          <li><a href="#faq" className="hover:text-[#111111] transition-colors">Tanya Jawab</a></li>
        </ul>
      </div>

      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#111111] mb-3">
          Status Sistem
        </div>
        <p className="text-xs text-[#6B7280] font-mono mb-1">Rust WASM Worker v1.0.4</p>
        <p className="text-xs text-[#111111] font-mono">Memori Klien: Terisolasi</p>
      </div>
    </div>

    <div className="max-w-[1360px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mt-8 font-mono text-[11px] text-[#6B7280]">
      <span>© {new Date().getFullYear()} SertiGen. Seluruh hak cipta dilindungi.</span>
      <span>Sistem Komputasi Klien</span>
    </div>
  </footer>
</div>


);
}
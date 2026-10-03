"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Rnd } from "react-rnd";
import { PDFDocument } from "pdf-lib";
import { ensurePdfTemplate, normalizeImageToPng } from "@/lib/templateConverter";
import { FILE_LIMITS, validateUploadFile } from "@/lib/fileValidators";
import { parseParticipantSpreadsheet } from "@/lib/spreadsheetParser";

const BUILT_IN_TEMPLATES = [
  {
    id: "template1",
    name: "Template Sertifikat 1",
    pdfPath: "/templates/template_01.pdf",
    layoutPath: "/layout-templates/template_01.json",
  },
  {
    id: "template2",
    name: "Template Sertifikat 2",
    pdfPath: "/templates/template_02.pdf",
    layoutPath: "/layout-templates/template_02.json",
  },
  {
    id: "template3",
    name: "Template Sertifikat 3",
    pdfPath: "/templates/template_03.pdf",
    layoutPath: "/layout-templates/template_03.json",
  },
  {
    id: "template4",
    name: "Template Sertifikat 4",
    pdfPath: "/templates/template_04.pdf",
    layoutPath: "/layout-templates/template_04.json",
  },
];

const BUILT_IN_FONTS = [
  { id: "roboto", name: "Roboto (Bold)", file: "/fonts/Roboto-Bold.ttf", family: "Roboto-Bold" },
  { id: "poppins", name: "Poppins (Bold)", file: "/fonts/Poppins-Bold.ttf", family: "Poppins-Bold" },
  { id: "montserrat", name: "Montserrat (Bold)", file: "/fonts/Montserrat-Bold.ttf", family: "Montserrat-Bold" },
  { id: "playfair", name: "Playfair (Bold)", file: "/fonts/Playfair-Bold.ttf", family: "Playfair-Bold" },
  { id: "lora", name: "Lora (Bold)", file: "/fonts/Lora-Bold.ttf", family: "Lora-Bold" },
  { id: "caveat", name: "Caveat (Bold)", file: "/fonts/Caveat-Bold.ttf", family: "Caveat-Bold" },
  { id: "pacifico", name: "Pacifico (Regular)", file: "/fonts/Pacifico-Regular.ttf", family: "Pacifico-Regular" },
];

const Spinner = ({ className = "w-3.5 h-3.5 text-current", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...props}>
    <path fill="currentColor" d="M12,23a9.63,9.63,0,0,1-8-9.5,9.51,9.51,0,0,1,6.79-9.1A1,1,0,0,1,12,5.19a8.4,8.4,0,0,0-6.1,8.31,8.44,8.44,0,0,0,8.38,8.38A1,1,0,0,1,12,23Z">
      <animateTransform attributeName="transform" type="rotate" dur="0.75s" from="0 12 12" to="360 12 12" repeatCount="indefinite" />
    </path>
  </svg>
);

const IconFolder = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 7.5A1.5 1.5 0 015.25 6h4.19a1.5 1.5 0 011.06.44l1.5 1.5h6.75a1.5 1.5 0 011.5 1.5v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V7.5z" />
  </svg>
);

const IconEdit = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
  </svg>
);

const IconType = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 4.5h9M12 4.5v15M8.25 19.5h7.5" />
  </svg>
);

const IconBookmark = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75v13.5l-5.25-3-5.25 3V6.75a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25z" />
  </svg>
);

const IconBolt = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.75 3L4.5 13.5h6l-1.5 7.5 8.25-10.5h-6l1.5-7.5z" />
  </svg>
);

const IconCheck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const IconAlertTriangle = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const IconHelp = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.007v.008H12V18z" />
    <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
  </svg>
);

const IconSparkles = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);

const sanitizeName = (nama) => {
  return (nama || "")
    .trim()
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");
};

const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const extractPdfFromZip = (zipBytes) => {
  const u8 = zipBytes instanceof Uint8Array ? zipBytes : new Uint8Array(zipBytes);
  if (u8.length >= 30 && u8[0] === 0x50 && u8[1] === 0x4b && u8[2] === 0x03 && u8[3] === 0x04) {
    const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const uncompressedSize = view.getUint32(22, true);
    const fileNameLen = view.getUint16(26, true);
    const extraFieldLen = view.getUint16(28, true);
    const dataStart = 30 + fileNameLen + extraFieldLen;
    if (uncompressedSize > 0 && dataStart + uncompressedSize <= u8.length) {
      return u8.slice(dataStart, dataStart + uncompressedSize);
    }
  }

  for (let i = 0; i < u8.length - 5; i++) {
    if (u8[i] === 0x25 && u8[i + 1] === 0x50 && u8[i + 2] === 0x44 && u8[i + 3] === 0x46 && u8[i + 4] === 0x2d) {
      for (let j = u8.length - 5; j >= i; j--) {
        if (u8[j] === 0x25 && u8[j + 1] === 0x25 && u8[j + 2] === 0x45 && u8[j + 3] === 0x4f && u8[j + 4] === 0x46) {
          let end = j + 5;
          while (end < u8.length && (u8[end] === 0x0a || u8[end] === 0x0d || u8[end] === 0x20)) {
            end++;
          }
          return u8.slice(i, end);
        }
      }
      return u8.slice(i);
    }
  }
  return u8;
};

const openPdfInNewTab = (pdfBytes) => {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

const generateWatermarkImageDataUrl = (width = 842, height = 595) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 8);

  ctx.font = "bold 26px sans-serif";
  ctx.fillStyle = "rgba(17, 17, 17, 0.16)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SERTIGEN DEMO • LEBIH DARI 50 DOKUMEN", 0, -18);

  ctx.font = "14px monospace";
  ctx.fillStyle = "rgba(17, 17, 17, 0.13)";
  ctx.fillText("Daftar akun gratis di sertigen.com untuk cetak tanpa watermark", 0, 18);
  ctx.restore();

  ctx.fillStyle = "rgba(17, 17, 17, 0.08)";
  ctx.fillRect(0, height - 32, width, 32);
  ctx.font = "bold 11px monospace";
  ctx.fillStyle = "rgba(17, 17, 17, 0.45)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Dibuat menggunakan SertiGen Demo (Batas cetak gratis >50 sertifikat)", width / 2, height - 16);

  return canvas.toDataURL("image/png");
};

const Notification = ({ message, type, show }) => {
  const isSuccess = type === "success";
  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-2.5 rounded-[4px] border transition-all duration-150 ${
        show ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"
      } ${
        isSuccess
          ? "bg-[#FFFFFF] text-[#111111] border-[#111111]"
          : "bg-[#FFFFFF] text-amber-600 border-amber-600"
      }`}
    >
      <span className="font-mono text-[11px] uppercase tracking-wider">
        {isSuccess ? "[ OK ]" : "[ PERINGATAN ]"}
      </span>
      <span className="text-xs font-normal">{message}</span>
    </div>
  );
};

const ValidationModal = ({ isOpen, warnings, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="border border-[#E5E7EB] rounded-md max-w-md w-full p-6 space-y-4 bg-[#FFFFFF]">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-[4px] shrink-0">
            <IconAlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium tracking-tight text-[#111111]">
              Peringatan Validasi Cetak
            </h3>
            <p className="text-xs mt-0.5 text-[#6B7280]">
              Periksa catatan berikut sebelum memulai proses render
            </p>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-2 text-xs p-3 rounded-[4px] border border-[#E5E7EB] font-mono bg-[#F5F5F5] text-[#111111]">
          {warnings.map((warn, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-amber-600 font-medium">[!]</span>
              <span className="leading-normal">{warn}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#6B7280]">
          Apakah Anda ingin mengabaikan catatan ini dan melanjutkan proses pembuatan sertifikat?
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E7EB]">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="px-3.5 py-1.5 text-xs rounded-[4px] text-white bg-[#111111] hover:bg-[#333333] transition-colors"
          >
            Lanjutkan Cetak
          </button>
        </div>
      </div>
    </div>
  );
};

const TutorialModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "1. Pemilihan Template & Data Peserta",
      tab: "Berkas",
      desc: "Pilih salah satu 'Template Bawaan' yang telah tersedia atau unggah berkas PDF sertifikat Anda sendiri. Untuk data nama penerima, unggah berkas CSV atau klik tombol 'Coba Data Sampel' di bilah atas untuk uji coba instan.",
    },
    {
      title: "2. Menata Letak & Elemen Desain",
      tab: "Elemen",
      desc: "Buka panel 'Elemen' untuk menambahkan teks statis bebas atau menempel logo dan tanda tangan transparan. Anda dapat menyeret (drag) langsung di kanvas, mengubah ukuran huruf, dan mengatur perataan teks.",
    },
    {
      title: "3. Pilihan Tipografi & Font",
      tab: "Font",
      desc: "Tersedia koleksi font bawaan pilihan di folder proyek, dukungan unggah berkas font mandiri (.ttf / .otf), serta kemampuan mendeteksi font yang terpasang di sistem operasi komputer Anda.",
    },
    {
      title: "4. Aturan Watermark & Batas Cetak",
      tab: "Lisensi Demo",
      desc: "Mode uji coba ini 100% gratis! Pencetakan 1 hingga 50 lembar sertifikat sepenuhnya BEBAS WATERMARK. Jika data melebihi 50 dokumen, cap watermark demo akan otomatis disematkan.",
    },
    {
      title: "5. Pratinjau & Ekspor Massal ZIP",
      tab: "Ekspor",
      desc: "• Klik tombol 'Pratinjau' di bilah atas untuk mengunduh 1 lembar sampel pengujian.\n• Klik 'Cetak ZIP' untuk merender seluruh data peserta menjadi kumpulan PDF siap cetak 300 DPI.",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="border border-[#E5E7EB] rounded-md max-w-lg w-full p-6 space-y-5 bg-[#FFFFFF] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#F5F5F5] text-[#111111] border border-[#E5E7EB] rounded-[4px]">
              <IconHelp className="w-4 h-4" />
            </span>
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#111111]">
              Panduan Penggunaan Studio
            </h3>
          </div>
          <span className="text-xs font-mono text-[#6B7280]">
            {currentStep + 1} / {steps.length}
          </span>
        </div>

        <div className="space-y-3 min-h-[140px]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-amber-50 text-amber-800 border border-amber-200">
              {steps[currentStep].tab}
            </span>
            <h4 className="text-xs font-medium text-[#111111]">
              {steps[currentStep].title}
            </h4>
          </div>
          <p className="text-xs text-[#6B7280] leading-relaxed whitespace-pre-line font-light">
            {steps[currentStep].desc}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 py-1">
          {steps.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              className={`h-1 transition-all rounded-full ${
                currentStep === idx ? "w-6 bg-[#111111]" : "w-2 bg-[#E5E7EB] hover:bg-[#B0B6C3]"
              }`}
              title={`Langkah ${idx + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="px-3.5 py-1.5 text-xs rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] transition-colors disabled:opacity-30"
          >
            Kembali
          </button>

          <div className="flex items-center gap-2">
            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="px-4 py-1.5 text-xs rounded-[4px] text-white bg-[#111111] hover:bg-[#333333] transition-colors"
              >
                Lanjut
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs rounded-[4px] text-white bg-[#111111] hover:bg-[#333333] transition-colors"
              >
                Mulai Studio
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function StudioDemoPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("files");

  // State Berkas PDF & CSV Peserta
  const [csvFile, setCsvFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [longestRowSample, setLongestRowSample] = useState({});
  const [templateFile, setTemplateFile] = useState(null);
  const [originalTemplateRawFile, setOriginalTemplateRawFile] = useState(null);
  const [originalTemplateSize, setOriginalTemplateSize] = useState(0);
  const [compressionScale, setCompressionScale] = useState(1.5);
  const [compressionQuality, setCompressionQuality] = useState(0.8);
  const [isRecompressing, setIsRecompressing] = useState(false);

  const [selectedBuiltInTemplateId, setSelectedBuiltInTemplateId] = useState("");
  const [isLoadingBuiltIn, setIsLoadingBuiltIn] = useState(false);

  // Pola Penamaan Berkas & Rentang Baris
  const [filenamePattern, setFilenamePattern] = useState("sertifikat_{Nama}_{index}");
  const [sliceMode, setSliceMode] = useState("all");
  const [sliceStart, setSliceStart] = useState(1);
  const [sliceEnd, setSliceEnd] = useState(1);

  // Optimasi RAM & Pengelompokan ZIP
  const [deviceRamGb, setDeviceRamGb] = useState(8);
  const [maxCertsPerZip, setMaxCertsPerZip] = useState(1000);
  const [zipGroupingMode, setZipGroupingMode] = useState("chunk");
  const [selectedZipGroupColumn, setSelectedZipGroupColumn] = useState("");

  // State Font (Bawaan, Upload Kustom, Sistem OS)
  const [localFontApiSupported, setLocalFontApiSupported] = useState(false);
  const [isDetectingFonts, setIsDetectingFonts] = useState(false);
  const [localFontsRaw, setLocalFontsRaw] = useState([]);
  const [localFontFamilies, setLocalFontFamilies] = useState([]);
  const [selectedLocalFontFamily, setSelectedLocalFontFamily] = useState("");
  const [selectedFontBytes, setSelectedFontBytes] = useState(null);
  const [selectedFontStyle, setSelectedFontStyle] = useState("");
  const [isLoadingFontBytes, setIsLoadingFontBytes] = useState(false);
  const [fontDetectionError, setFontDetectionError] = useState("");

  // Kanvas & Tata Letak
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfPreviewSize, setPdfPreviewSize] = useState({ width: 842, height: 595 });
  const [pageSizes, setPageSizes] = useState({});

  const [configs, setConfigs] = useState([]);
  const [activeColumn, setActiveColumn] = useState("");
  const [savedPresets, setSavedPresets] = useState([]);
  const [presetName, setPresetName] = useState("");
  const [activeSnapGuides, setActiveSnapGuides] = useState({ x: false, y: false });
  const [historyState, setHistoryState] = useState({ past: [], future: [] });

  // Status Rendering & Notifikasi
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isLoadingSampleData, setIsLoadingSampleData] = useState(false);
  const [progress, setProgress] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Zoom & Referensi DOM
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const stageScrollRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const imageUploadInputRef = useRef(null);
  const fontUploadInputRef = useRef(null);
  const renderTaskRef = useRef(null);
  const configsRef = useRef(configs);

  useEffect(() => {
    configsRef.current = configs;
  }, [configs]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    try {
      let detectedRam = 8;
      if ("deviceMemory" in navigator && typeof navigator.deviceMemory === "number") {
        detectedRam = navigator.deviceMemory;
      } else if ("hardwareConcurrency" in navigator && typeof navigator.hardwareConcurrency === "number") {
        detectedRam = navigator.hardwareConcurrency <= 4 ? 4 : 8;
      }
      setDeviceRamGb(detectedRam);
      setMaxCertsPerZip(detectedRam <= 4 ? 500 : 1000);
    } catch {
      setDeviceRamGb(8);
      setMaxCertsPerZip(1000);
    }

    try {
      setLocalFontApiSupported("queryLocalFonts" in window);
    } catch {
      setLocalFontApiSupported(false);
    }
  }, []);

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => setNotification((n) => ({ ...n, show: false })), 3500);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  useEffect(() => {
    try {
      const hasSeenTutorial = localStorage.getItem("sertigen_trial_tutorial_seen");
      if (!hasSeenTutorial) {
        setIsTutorialOpen(true);
      }
    } catch {
      setIsTutorialOpen(true);
    }
  }, []);

  const handleCloseTutorial = () => {
    setIsTutorialOpen(false);
    try {
      localStorage.setItem("sertigen_trial_tutorial_seen", "true");
    } catch {
      // Abaikan jika storage dinonaktifkan
    }
  };

  // 1. Memuat Font Bawaan dari public/fonts
  const handleSelectBuiltInFont = async (fontId) => {
    if (!fontId) {
      handleResetFont();
      return;
    }

    const chosen = BUILT_IN_FONTS.find((f) => f.id === fontId);
    if (!chosen) return;

    setIsLoadingFontBytes(true);
    setFontDetectionError("");

    try {
      const res = await fetch(chosen.file);
      if (!res.ok) throw new Error(`Berkas font tidak ditemukan (${res.status})`);
      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const fontFace = new FontFace(chosen.family, arrayBuffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      setSelectedFontBytes(bytes);
      setSelectedLocalFontFamily(chosen.family);
      setSelectedFontStyle("Regular");

      setNotification({
        show: true,
        message: `Font bawaan "${chosen.name}" berhasil diterapkan.`,
        type: "success",
      });
    } catch (err) {
      console.error("Gagal memuat font bawaan:", err);
      setFontDetectionError(`Gagal memuat font: ${err.message}`);
      setNotification({ show: true, message: `Gagal memuat font: ${err.message}`, type: "error" });
    } finally {
      setIsLoadingFontBytes(false);
    }
  };

  // 2. Unggah Font Mandiri (.ttf / .otf) dari Komputer Pengguna
  const handleUploadCustomFont = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (!["ttf", "otf"].includes(ext)) {
      setNotification({
        show: true,
        message: "Format tidak didukung. Harap pilih berkas .ttf atau .otf.",
        type: "error",
      });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setNotification({ show: true, message: "Ukuran berkas font maksimal 15 MB.", type: "error" });
      return;
    }

    setIsLoadingFontBytes(true);
    setFontDetectionError("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const rawName = file.name.substring(0, file.name.lastIndexOf(".")) || "CustomFont";
      const cleanFamilyName = rawName.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim() || "UploadedFont";

      const fontFace = new FontFace(cleanFamilyName, arrayBuffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      setSelectedFontBytes(bytes);
      setSelectedLocalFontFamily(cleanFamilyName);
      setSelectedFontStyle("Regular");

      setNotification({
        show: true,
        message: `Font "${cleanFamilyName}" siap digunakan di kanvas.`,
        type: "success",
      });
    } catch (err) {
      console.error("Gagal memproses font kustom:", err);
      setFontDetectionError(err.message);
      setNotification({ show: true, message: `Gagal memuat font: ${err.message}`, type: "error" });
    } finally {
      setIsLoadingFontBytes(false);
      if (e.target) e.target.value = "";
    }
  };

  // 3. Pindai Font Lokal Sistem Operasi
  const handleDetectLocalFonts = async () => {
    setFontDetectionError("");
    setIsDetectingFonts(true);
    try {
      const fonts = await window.queryLocalFonts();
      setLocalFontsRaw(fonts);
      const uniqueFamilies = Array.from(new Set(fonts.map((f) => f.family))).sort((a, b) =>
        a.localeCompare(b)
      );
      setLocalFontFamilies(uniqueFamilies);
      if (uniqueFamilies.length === 0) {
        setFontDetectionError("Tidak ada font yang terdeteksi di perangkat ini.");
      } else {
        setNotification({
          show: true,
          message: `Terdeteksi ${uniqueFamilies.length} font lokal dari sistem operasi.`,
          type: "success",
        });
      }
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        setFontDetectionError("Akses font lokal ditolak oleh izin peramban.");
      } else {
        setFontDetectionError(`Gagal mendeteksi font: ${err.message}`);
      }
    } finally {
      setIsDetectingFonts(false);
    }
  };

  const handleSelectLocalFont = async (family) => {
    setSelectedLocalFontFamily(family);
    setSelectedFontBytes(null);
    setSelectedFontStyle("");
    setFontDetectionError("");
    if (!family) return;

    setIsLoadingFontBytes(true);
    try {
      const candidates = localFontsRaw.filter((f) => f.family === family);
      const chosen = candidates.find((f) => f.style === "Regular") || candidates[0];
      if (!chosen) throw new Error("Font tidak ditemukan.");

      const blob = await chosen.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const fontFace = new FontFace(family, arrayBuffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      setSelectedFontBytes(bytes);
      setSelectedFontStyle(chosen.style || "Regular");
    } catch (err) {
      setFontDetectionError(`Gagal memuat font "${family}": ${err.message}`);
      setSelectedLocalFontFamily("");
    } finally {
      setIsLoadingFontBytes(false);
    }
  };

  const handleResetFont = () => {
    setSelectedLocalFontFamily("");
    setSelectedFontBytes(null);
    setSelectedFontStyle("");
    setNotification({
      show: true,
      message: "Font dikembalikan ke standar (Helvetica-Bold).",
      type: "success",
    });
  };

  const scanLongestRowSample = (rows, headers) => {
    const sample = {};
    headers.forEach((header) => {
      let longestStr = "";
      rows.forEach((row) => {
        const val = row[header] ? String(row[header]) : "";
        if (val.length > longestStr.length) {
          longestStr = val;
        }
      });
      sample[header] = longestStr || `[${header}]`;
    });
    return sample;
  };

  const compressPdfTemplate = async (originalFile, scale = 1.5, quality = 0.8) => {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;

    const arrayBuffer = await originalFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const compressedPdfDoc = await PDFDocument.create();

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      const imgDataUrl = canvas.toDataURL("image/jpeg", quality);
      const imgBytes = await fetch(imgDataUrl).then((res) => res.arrayBuffer());

      const embeddedImage = await compressedPdfDoc.embedJpg(imgBytes);
      const origViewport = page.getViewport({ scale: 1.0 });
      const newPage = compressedPdfDoc.addPage([origViewport.width, origViewport.height]);
      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: origViewport.width,
        height: origViewport.height,
      });
    }

    const compressedPdfBytes = await compressedPdfDoc.save();
    return new File([compressedPdfBytes], "compressed_template.pdf", {
      type: "application/pdf",
    });
  };

  const processAndSetPdfTemplate = async (file) => {
    setOriginalTemplateRawFile(file);
    setOriginalTemplateSize(file.size);

    try {
      const compressedFile = await compressPdfTemplate(file, compressionScale, compressionQuality);
      setTemplateFile(compressedFile);

      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);

      const sizes = {};
      for (let p = 1; p <= pdf.numPages; p++) {
        const pg = await pdf.getPage(p);
        const vp = pg.getViewport({ scale: 1.0 });
        sizes[p] = { width: vp.width, height: vp.height };
      }
      setPageSizes(sizes);
    } catch (err) {
      console.error("Gagal memuat PDF:", err);
      setNotification({ show: true, message: `Gagal memuat PDF: ${err.message}`, type: "error" });
    }
  };

  const handleTemplateChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateUploadFile(file, FILE_LIMITS.TEMPLATE);
    if (!validation.valid) {
      setNotification({ show: true, message: validation.error, type: "error" });
      e.target.value = "";
      return;
    }

    setSelectedBuiltInTemplateId("");
    try {
      const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|svg)$/i.test(file.name);
      if (isImage) {
        setNotification({
          show: true,
          message: "Mengonversi gambar template ke format PDF beresolusi tinggi...",
          type: "info",
        });
      }
      const pdfFile = await ensurePdfTemplate(file);
      await processAndSetPdfTemplate(pdfFile);
      if (isImage) {
        setNotification({
          show: true,
          message: `Gambar template "${file.name}" berhasil dikonversi dan diterapkan.`,
          type: "success",
        });
      }
    } catch (err) {
      console.error("Gagal memproses template:", err);
      setNotification({
        show: true,
        message: `Gagal memproses template: ${err.message}`,
        type: "error",
      });
    }
  };

  const handleSelectBuiltInTemplate = async (templateId) => {
    setSelectedBuiltInTemplateId(templateId);
    if (!templateId) return;

    const chosen = BUILT_IN_TEMPLATES.find((t) => t.id === templateId);
    if (!chosen) return;

    setIsLoadingBuiltIn(true);
    try {
      const res = await fetch(chosen.pdfPath);
      if (!res.ok) throw new Error(`Berkas PDF tidak ditemukan (${res.status})`);
      const blob = await res.blob();
      const fileName = chosen.pdfPath.split("/").pop();
      const file = new File([blob], fileName, { type: "application/pdf" });

      await processAndSetPdfTemplate(file);

      if (chosen.layoutPath) {
        try {
          const jsonRes = await fetch(chosen.layoutPath);
          if (jsonRes.ok) {
            const layoutJson = await jsonRes.json();
            const targetConfigs = Array.isArray(layoutJson)
              ? layoutJson
              : Array.isArray(layoutJson.configs)
              ? layoutJson.configs
              : null;

            if (targetConfigs) {
              setConfigs(targetConfigs);
              if (targetConfigs.length > 0) setActiveColumn(targetConfigs[0].column_name);
            }
          }
        } catch (e) {
          console.warn("Gagal memuat layout bawaan:", e);
        }
      }

      setNotification({
        show: true,
        message: `Template "${chosen.name}" berhasil diterapkan.`,
        type: "success",
      });
    } catch (err) {
      setNotification({
        show: true,
        message: `Gagal memuat template bawaan: ${err.message}`,
        type: "error",
      });
      setSelectedBuiltInTemplateId("");
    } finally {
      setIsLoadingBuiltIn(false);
    }
  };

  const handleCsvChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { headers: fields, rows } = await parseParticipantSpreadsheet(file);
      setCsvFile(file);
      setCsvRows(rows);
      setSliceStart(1);
      setSliceEnd(rows.length);

      if (fields && fields.length > 0) {
        setCsvHeaders(fields);
        setFilenamePattern(`sertifikat_{${fields[0]}}_{index}`);

        const scannedLongest = scanLongestRowSample(rows, fields);
        setLongestRowSample(scannedLongest);

        if (configs.length === 0) {
          const initialConfigs = fields.map((header, idx) => ({
            column_name: header,
            static_text: "",
            x: (pdfPreviewSize.width - 400) / 2,
            y: 150 + idx * 60,
            font_size: 28,
            line_height: 1.2,
            letter_spacing: 0,
            max_width: 400,
            align: "center",
            enabled: true,
            page_number: 1,
          }));
          setConfigs(initialConfigs);
          setActiveColumn(fields[0]);
        } else {
          const firstCsvField = fields[0];
          const updatedConfigs = [...configs];
          let nameMapped = false;

          for (let i = 0; i < updatedConfigs.length; i++) {
            if (
              updatedConfigs[i].type !== "image" &&
              !updatedConfigs[i].static_text &&
              /nama|name|peserta/i.test(updatedConfigs[i].column_name)
            ) {
              updatedConfigs[i].column_name = firstCsvField;
              nameMapped = true;
              break;
            }
          }

          if (!nameMapped && updatedConfigs.length > 0 && updatedConfigs[0].type !== "image") {
            updatedConfigs[0].column_name = firstCsvField;
          }

          const existingColumns = new Set(updatedConfigs.map((c) => c.column_name));
          fields.forEach((field, fIdx) => {
            if (!existingColumns.has(field)) {
              updatedConfigs.push({
                column_name: field,
                static_text: "",
                x: (pdfPreviewSize.width - 350) / 2,
                y: 180 + fIdx * 45,
                font_size: 22,
                line_height: 1.2,
                letter_spacing: 0,
                max_width: 350,
                align: "center",
                enabled: true,
                page_number: 1,
              });
              existingColumns.add(field);
            }
          });

          setConfigs(updatedConfigs);
          setActiveColumn(firstCsvField);
        }
      }

      setNotification({
        show: true,
        message: `Berhasil memuat ${rows.length} peserta dari berkas "${file.name}".`,
        type: "success",
      });
    } catch (err) {
      console.error("Gagal membaca berkas peserta:", err);
      setNotification({
        show: true,
        message: `Gagal membaca berkas: ${err.message}`,
        type: "error",
      });
      e.target.value = "";
    }
  };

  // Muat data sampel instan untuk pengunjung agar langsung bisa coba kanvas tanpa file
  const handleLoadSampleData = async () => {
    setIsLoadingSampleData(true);
    try {
      const sampleRows = [
        { "Nama Peserta": "Budi Santoso, S.Kom.", "Predikat": "Peserta Terbaik", "Nomor Registrasi": "REG/2026/001" },
        { "Nama Peserta": "Siti Nurhaliza, M.Pd.", "Predikat": "Sangat Memuaskan", "Nomor Registrasi": "REG/2026/002" },
        { "Nama Peserta": "Andi Pratama, B.Eng.", "Predikat": "Lulus dengan Pujian", "Nomor Registrasi": "REG/2026/003" },
        { "Nama Peserta": "Dewi Lestari, S.Si.", "Predikat": "Peserta Teraktif", "Nomor Registrasi": "REG/2026/004" },
        { "Nama Peserta": "Eko Prasetyo, M.T.", "Predikat": "Sangat Memuaskan", "Nomor Registrasi": "REG/2026/005" },
      ];

      setCsvRows(sampleRows);
      const fields = Object.keys(sampleRows[0]);
      setCsvHeaders(fields);
      setSliceStart(1);
      setSliceEnd(sampleRows.length);
      setFilenamePattern("sertifikat_{Nama Peserta}_{index}");
      setLongestRowSample(scanLongestRowSample(sampleRows, fields));

      if (!templateFile) {
        await handleSelectBuiltInTemplate("template1");
      }

      setNotification({
        show: true,
        message: "Data sampel 5 peserta berhasil dimuat ke kanvas.",
        type: "success",
      });
    } finally {
      setIsLoadingSampleData(false);
    }
  };

  const renderPdfPage = async (pdf, pageNum) => {
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      setPdfPreviewSize({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const task = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;
        if (renderTaskRef.current === task) renderTaskRef.current = null;
      }
    } catch (err) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("Gagal render halaman:", err);
      }
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPdfPage(pdfDoc, currentPage);
    }
  }, [pdfDoc, currentPage]);

  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 2;
  const ZOOM_STEP = 0.1;
  const clampZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  const handleZoomIn = () => setZoomLevel((z) => clampZoom(Math.round((z + ZOOM_STEP) * 100) / 100));
  const handleZoomOut = () => setZoomLevel((z) => clampZoom(Math.round((z - ZOOM_STEP) * 100) / 100));
  const handleZoomReset = () => setZoomLevel(1);

  const handleStageWheel = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    setZoomLevel((z) => clampZoom(Math.round((z - e.deltaY * 0.001) * 100) / 100));
  };

  const pushHistorySnapshot = (snapshot) => {
    setHistoryState((h) => ({
      past: [...h.past.slice(-49), snapshot],
      future: [],
    }));
  };

  const commitConfigs = (updaterFn) => {
    pushHistorySnapshot(configsRef.current);
    setConfigs(updaterFn);
  };

  const handleUndo = () => {
    setHistoryState((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      setConfigs(previous);
      return { past: h.past.slice(0, -1), future: [configsRef.current, ...h.future] };
    });
  };

  const handleRedo = () => {
    setHistoryState((h) => {
      if (h.future.length === 0) return h;
      const next = h.future[0];
      setConfigs(next);
      return { past: [...h.past, configsRef.current], future: h.future.slice(1) };
    });
  };

  const updateConfig = (colName, newProps) => {
    setConfigs((prev) =>
      prev.map((cfg) => (cfg.column_name === colName ? { ...cfg, ...newProps } : cfg))
    );
  };

  const handleAddStaticText = () => {
    const staticId = `static_text_${Date.now()}`;
    const newConfig = {
      column_name: staticId,
      static_text: "Teks Statis Tambahan",
      x: (pdfPreviewSize.width - 300) / 2,
      y: 100,
      font_size: 24,
      line_height: 1.2,
      letter_spacing: 0,
      max_width: 300,
      align: "center",
      enabled: true,
      page_number: currentPage,
    };
    commitConfigs((prev) => [...prev, newConfig]);
    setActiveColumn(staticId);
  };

  const handleAddImageElement = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateUploadFile(file, FILE_LIMITS.IMAGE_ELEMENT);
    if (!validation.valid) {
      setNotification({ show: true, message: validation.error, type: "error" });
      e.target.value = "";
      return;
    }

    try {
      const normalizedFile = await normalizeImageToPng(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        const img = new Image();
        img.onload = () => {
          const aspect = img.width / img.height || 1;
          const initialWidth = Math.min(180, pdfPreviewSize.width * 0.4);
          const initialHeight = initialWidth / aspect;

          const imgId = `image_${Date.now()}`;
          const newConfig = {
            type: "image",
            column_name: imgId,
            image_name: normalizedFile.name,
            data_url: dataUrl,
            mime_type: "image/png",
            x: (pdfPreviewSize.width - initialWidth) / 2,
            y: 150,
            max_width: Math.round(initialWidth),
            height: Math.round(initialHeight),
            enabled: true,
            page_number: currentPage,
          };

          commitConfigs((prev) => [...prev, newConfig]);
          setActiveColumn(imgId);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(normalizedFile);
    } catch (err) {
      console.error("Gagal menambahkan gambar:", err);
      setNotification({
        show: true,
        message: `Gagal memproses gambar: ${err.message}`,
        type: "error",
      });
    }
    e.target.value = "";
  };

  const getTargetRows = () => {
    if (sliceMode === "all") {
      return { rows: csvRows, offset: 0 };
    }
    const start = Math.max(1, parseInt(sliceStart, 10) || 1) - 1;
    const end = Math.min(csvRows.length, parseInt(sliceEnd, 10) || csvRows.length);
    const validEnd = Math.max(start + 1, end);
    return {
      rows: csvRows.slice(start, validEnd),
      offset: start,
    };
  };

  const bakeImagesAndWatermarkIntoPdf = async (baseFile, isOverFiftyLimit) => {
    const imageConfigs = configs.filter((c) => c.enabled && c.type === "image" && c.data_url);
    const templateArrayBuffer = await baseFile.arrayBuffer();
    const pdfDocLib = await PDFDocument.load(templateArrayBuffer);

    // 1. Tempel seluruh elemen gambar pengguna (logo, ttd, ornamen)
    for (const imgCfg of imageConfigs) {
      const pageIndex = Math.max(0, (imgCfg.page_number || 1) - 1);
      const page = pdfDocLib.getPage(pageIndex);
      const { height: pageH } = page.getSize();

      const res = await fetch(imgCfg.data_url);
      const imgBytes = await res.arrayBuffer();

      let embedded;
      if (imgCfg.mime_type?.includes("jpeg") || imgCfg.mime_type?.includes("jpg")) {
        embedded = await pdfDocLib.embedJpg(imgBytes);
      } else {
        embedded = await pdfDocLib.embedPng(imgBytes);
      }

      const pdfY = pageH - Number(imgCfg.y) - Number(imgCfg.height);

      page.drawImage(embedded, {
        x: Number(imgCfg.x),
        y: pdfY,
        width: Number(imgCfg.max_width),
        height: Number(imgCfg.height),
      });
    }

    // 2. Tempel gambar watermark jika jumlah cetak melebihi batas 50 lembar
    if (isOverFiftyLimit) {
      for (let pIdx = 0; pIdx < pdfDocLib.getPageCount(); pIdx++) {
        const page = pdfDocLib.getPage(pIdx);
        const { width: pW, height: pH } = page.getSize();

        const watermarkDataUrl = generateWatermarkImageDataUrl(pW, pH);
        const watermarkRes = await fetch(watermarkDataUrl);
        const watermarkBytes = await watermarkRes.arrayBuffer();
        const embeddedWatermark = await pdfDocLib.embedPng(watermarkBytes);

        page.drawImage(embeddedWatermark, {
          x: 0,
          y: 0,
          width: pW,
          height: pH,
        });
      }
    }

    const bakedBytes = await pdfDocLib.save();
    return new Uint8Array(bakedBytes);
  };

  const buildFormattedConfigs = () =>
    configs
      .filter((c) => c.enabled && c.type !== "image")
      .map((c) => {
        const page = c.page_number || 1;
        const size = pageSizes[page] || pdfPreviewSize;
        return {
          column_name: c.column_name,
          static_text: c.static_text || null,
          x: Number(c.x),
          y: Number(c.y),
          font_size: parseFloat(c.font_size || 24),
          line_height: parseFloat(c.line_height || 1.2),
          letter_spacing: parseFloat(c.letter_spacing || 0),
          max_width: parseFloat(c.max_width),
          align: c.align || "left",
          page_number: page,
          page_height: size.height,
          color: c.color || "#111111",
        };
      });

  const handleDownloadPreview = async () => {
    if (!templateFile) {
      setNotification({ show: true, message: "Pilih template terlebih dahulu.", type: "error" });
      return;
    }

    setIsLoadingPreview(true);
    try {
      setNotification({ show: true, message: "Menyusun pratinjau PDF...", type: "success" });

      const templateUint8 = await bakeImagesAndWatermarkIntoPdf(templateFile, false);
      const formattedConfigs = buildFormattedConfigs();

      const wasm = await import("@/rust_wasm/pkg/pdf_cert_wasm.js");
      await wasm.default();

      const zipBytes = wasm.generate_certificates_chunk(
        templateUint8,
        [longestRowSample],
        formattedConfigs,
        0,
        selectedFontBytes || undefined,
        filenamePattern.trim() || undefined
      );

      // Ekstraksi berkas PDF murni tanpa ZIP dan buka di tab baru
      const pdfBytes = extractPdfFromZip(zipBytes);
      openPdfInNewTab(pdfBytes);

      setNotification({ show: true, message: "Pratinjau PDF berhasil dibuka di tab baru.", type: "success" });
    } catch (err) {
      setNotification({ show: true, message: `Gagal pratinjau: ${err.message}`, type: "error" });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleStartGenerate = () => {
    if (csvRows.length === 0 || !templateFile || configs.length === 0) {
      setNotification({ show: true, message: "Lengkapi data CSV, PDF, dan tata letak.", type: "error" });
      return;
    }

    const { rows } = getTargetRows();
    const warnings = [];

    if (rows.length > 50) {
      warnings.push(
        `Anda memproses ${rows.length} sertifikat (>50 berkas). Sistem otomatis menyematkan cap watermark SertiGen Demo pada dokumen PDF.`
      );
    }

    if (warnings.length > 0) {
      setValidationWarnings(warnings);
      setIsValidationModalOpen(true);
    } else {
      executeBatchRendering();
    }
  };

  const executeBatchRendering = async () => {
    setIsValidationModalOpen(false);
    setIsProcessing(true);

    const { rows: selectedRows, offset } = getTargetRows();
    const isOverFifty = selectedRows.length > 50;

    setProgress({ current: 0, total: selectedRows.length });

    try {
      const templateUint8 = await bakeImagesAndWatermarkIntoPdf(templateFile, isOverFifty);
      const formattedConfigs = buildFormattedConfigs();

      const wasm = await import("@/rust_wasm/pkg/pdf_cert_wasm.js");
      await wasm.default();

      const zipBytes = wasm.generate_certificates_chunk(
        templateUint8,
        selectedRows,
        formattedConfigs,
        offset,
        selectedFontBytes || undefined,
        filenamePattern.trim() || undefined
      );

      const blob = new Blob([zipBytes], { type: "application/zip" });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `sertifikat_demo_${selectedRows.length}_peserta_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setIsProcessing(false);
      setProgress(null);
      setNotification({
        show: true,
        message: isOverFifty
          ? `Selesai (${selectedRows.length} sertifikat). Watermark tersemat karena > 50 berkas.`
          : `Selesai! Seluruh ${selectedRows.length} sertifikat berhasil diunduh tanpa watermark.`,
        type: "success",
      });
    } catch (err) {
      console.error("Gagal rendering batch demo:", err);
      setIsProcessing(false);
      setProgress(null);
      setNotification({ show: true, message: `Kendala: ${err.message}`, type: "error" });
    }
  };

  const targetData = getTargetRows();
  const certCount = targetData.rows.length;
  const isOverFiftyLimit = certCount > 50;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-sans antialiased bg-[#FFFFFF] text-[#111111]">
      <Notification {...notification} />
      <ValidationModal
        isOpen={isValidationModalOpen}
        warnings={validationWarnings}
        onConfirm={executeBatchRendering}
        onCancel={() => setIsValidationModalOpen(false)}
      />
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
      />

      <input
        type="file"
        ref={imageUploadInputRef}
        accept={FILE_LIMITS.IMAGE_ELEMENT.acceptAttribute}
        onChange={handleAddImageElement}
        className="hidden"
      />
      <input
        type="file"
        ref={fontUploadInputRef}
        accept={FILE_LIMITS.CUSTOM_FONT.acceptAttribute}
        onChange={handleUploadCustomFont}
        className="hidden"
      />

      {/* HEADER UTAMA DEMO */}
      <header className="h-14 border-b border-[#E5E7EB] px-6 flex items-center justify-between shrink-0 z-30 bg-[#FFFFFF]">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium tracking-tight text-[#111111]">
            SertiGen
          </Link>
          <span className="text-[#E5E7EB]">/</span>
          <span className="text-xs font-mono uppercase bg-[#F5F5F5] text-[#111111] px-2 py-0.5 rounded-[2px] border border-[#E5E7EB] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Mode Uji Coba Publik
          </span>
          <span className="text-[#E5E7EB]">/</span>
          <span className="text-xs font-mono text-[#6B7280]">
            Bebas Watermark Maks. 50 Dokumen
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsTutorialOpen(true)}
            className="px-2.5 py-1.5 text-xs font-mono uppercase rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] transition-colors flex items-center gap-1.5"
            title="Buka panduan penggunaan studio"
          >
            <IconHelp className="w-3.5 h-3.5 text-[#111111]" />
            <span className="hidden sm:inline">Panduan</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSampleData}
            disabled={isLoadingSampleData}
            className="px-3 py-1.5 text-xs font-mono uppercase rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] disabled:opacity-50 transition-colors flex items-center gap-1.5"
            title="Coba langsung dengan 5 peserta sampel"
          >
            {isLoadingSampleData ? (
              <>
                <Spinner className="w-3.5 h-3.5" />
                <span>Memuat Sampel...</span>
              </>
            ) : (
              <>
                <IconSparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Coba Data Sampel</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadPreview}
            disabled={isProcessing || !templateFile || isLoadingPreview}
            className="px-3 py-1.5 text-xs font-mono uppercase rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] disabled:opacity-40 transition-colors flex items-center gap-1.5"
            title="Buka pratinjau PDF di tab baru"
          >
            {isLoadingPreview ? (
              <>
                <Spinner className="w-3.5 h-3.5" />
                <span>Menyiapkan...</span>
              </>
            ) : (
              <span>Pratinjau PDF</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleStartGenerate}
            disabled={isProcessing || csvRows.length === 0 || !templateFile}
            className={`px-4 py-1.5 text-xs font-mono uppercase rounded-[4px] text-white flex items-center gap-2 transition-colors disabled:opacity-40 ${
              isOverFiftyLimit ? "bg-amber-600 hover:bg-amber-700" : "bg-[#111111] hover:bg-[#333333]"
            }`}
          >
            {isProcessing ? (
              <Spinner className="w-3.5 h-3.5" />
            ) : (
              <IconBolt className="w-3.5 h-3.5" />
            )}
            <span>
              {isProcessing
                ? "Merender..."
                : isOverFiftyLimit
                ? `Cetak ZIP (${certCount} - Watermark)`
                : `Cetak ZIP (${certCount})`}
            </span>
          </button>

          <Link
            href="/login"
            className="px-3 py-1.5 text-xs font-mono uppercase rounded-[4px] border border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white transition-colors ml-1"
          >
            Masuk / Buat Akun
          </Link>
        </div>
      </header>

      {/* STRIP PROGRESS PROSES */}
      {isProcessing && (
        <div className="h-6 border-b border-[#E5E7EB] px-6 flex items-center gap-4 shrink-0 z-20 bg-[#F5F5F5]">
          <div className="flex-1 h-1 bg-[#E5E7EB] overflow-hidden rounded-full">
            <div className="h-full bg-[#111111] animate-pulse w-full" />
          </div>
          <span className="text-[11px] font-mono text-[#111111]">
            Memproses sertifikat di peramban tanpa server...
          </span>
        </div>
      )}

      {/* WORKSPACE AREA */}
      <div className="flex-1 flex overflow-hidden">
        {/* NAVIGASI TAB KIRI */}
        <aside className="w-14 border-r border-[#E5E7EB] flex flex-col items-center py-4 gap-2 shrink-0 z-20 bg-[#FFFFFF]">
          {[
            { id: "files", label: "Berkas", Icon: IconFolder },
            { id: "elements", label: "Elemen", Icon: IconEdit },
            { id: "fonts", label: "Font", Icon: IconType },
            { id: "presets", label: "Pola", Icon: IconBookmark },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-10 h-10 rounded-[4px] flex flex-col items-center justify-center transition-colors ${
                activeTab === tab.id
                  ? "bg-[#111111] text-white"
                  : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F5F5]"
              }`}
              title={tab.label}
            >
              <tab.Icon className="w-4 h-4" />
              <span className="text-[8px] font-mono mt-0.5">{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* PANEL INSPEKTOR */}
        <div className="w-80 border-r border-[#E5E7EB] flex flex-col shrink-0 z-10 overflow-y-auto bg-[#FFFFFF]">
          <div className="p-5 space-y-6">
            {}
            {/* PANEL: FILES */}
            {activeTab === "files" && (
              <div className="space-y-5">
                <div className="border-b border-[#E5E7EB] pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#111111]">
                    Berkas & Template
                  </h2>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    Pilih template dan masukkan data peserta
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="border border-[#E5E7EB] rounded-md p-3.5 space-y-2 bg-[#F5F5F5]">
                    <label className="block text-[10px] font-mono uppercase text-[#6B7280]">
                      Template Bawaan
                    </label>
                    <select
                      value={selectedBuiltInTemplateId}
                      onChange={(e) => handleSelectBuiltInTemplate(e.target.value)}
                      disabled={isLoadingBuiltIn}
                      className="w-full p-2 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                    >
                      <option value="">Pilih Template Bawaan</option>
                      {BUILT_IN_TEMPLATES.map((tmpl) => (
                        <option key={tmpl.id} value={tmpl.id}>
                          {tmpl.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#111111] mb-1.5">
                      Data Peserta (.csv, .xlsx, .xls)
                    </label>
                    <input
                      type="file"
                      accept={FILE_LIMITS.PARTICIPANT_DATA.acceptAttribute}
                      onChange={handleCsvChange}
                      className="block w-full text-[11px] font-mono rounded-[4px] p-2 border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111] file:mr-3 file:py-1 file:px-2.5 file:rounded-[2px] file:border file:border-[#E5E7EB] file:bg-[#F5F5F5] file:text-[#111111] file:font-mono file:text-[10px] file:uppercase"
                    />
                    {csvRows.length > 0 && (
                      <p className="text-[11px] text-[#111111] font-mono mt-2 flex items-center gap-1.5">
                        <IconCheck className="w-3.5 h-3.5 shrink-0" />
                        Terbaca {csvRows.length} baris peserta
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#111111] mb-1.5">
                      Unggah Template Kustom (PDF, PNG, JPG, WEBP, SVG)
                    </label>
                    <input
                      type="file"
                      accept={FILE_LIMITS.TEMPLATE.acceptAttribute}
                      onChange={handleTemplateChange}
                      className="block w-full text-[11px] font-mono rounded-[4px] p-2 border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111] file:mr-3 file:py-1 file:px-2.5 file:rounded-[2px] file:border file:border-[#E5E7EB] file:bg-[#F5F5F5] file:text-[#111111] file:font-mono file:text-[10px] file:uppercase"
                    />
                  </div>
                </div>

                {/* BANNER ATURAN WATERMARK (AMBER / KUNING) */}
                <div className={`p-3 rounded-md border text-xs font-mono space-y-1 ${
                  isOverFiftyLimit
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-[#F5F5F5] border-[#E5E7EB] text-[#111111]"
                }`}>
                  <div className="font-medium uppercase flex items-center justify-between">
                    <span>Status Watermark:</span>
                    <span className={isOverFiftyLimit ? "text-amber-700 font-bold" : ""}>
                      {isOverFiftyLimit ? "AKTIF" : "NONAKTIF"}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#6B7280] leading-relaxed">
                    {isOverFiftyLimit
                      ? "Total cetak melebihi 50 dokumen. Watermark otomatis disematkan pada setiap sertifikat."
                      : "Cetak 1-50 dokumen bebas watermark sepenuhnya."}
                  </p>
                </div>
              </div>
            )}

            {}
            {/* PANEL: ELEMENTS */}
            {activeTab === "elements" && (
              <div className="space-y-5">
                <div className="border-b border-[#E5E7EB] pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#111111]">
                    Elemen Desain
                  </h2>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={historyState.past.length === 0}
                      className="px-2.5 py-1 text-xs font-mono rounded-[2px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] disabled:opacity-30"
                    >
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={historyState.future.length === 0}
                      className="px-2.5 py-1 text-xs font-mono rounded-[2px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] disabled:opacity-30"
                    >
                      Redo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleAddStaticText}
                    className="py-1.5 text-[11px] font-mono uppercase rounded-[4px] border border-[#111111] bg-[#111111] text-white hover:bg-[#333333]"
                  >
                    + Teks Bebas
                  </button>
                  <button
                    type="button"
                    onClick={() => imageUploadInputRef.current?.click()}
                    className="py-1.5 text-[11px] font-mono uppercase rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5]"
                  >
                    + Tempel Logo/TTD
                  </button>
                </div>

                {configs.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#111111] mb-1.5">
                      Pilih Elemen Aktif
                    </label>
                    <select
                      value={activeColumn}
                      onChange={(e) => setActiveColumn(e.target.value)}
                      className="w-full p-2 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                    >
                      {configs.filter((c) => c.enabled).map((c) => (
                        <option key={c.column_name} value={c.column_name}>
                          {c.type === "image" ? `[GAMBAR] ${c.image_name || c.column_name}` : c.column_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {configs
                  .filter((c) => c.column_name === activeColumn)
                  .map((cfg) => (
                    <div key={cfg.column_name} className="space-y-4 p-4 rounded-md border border-[#E5E7EB] bg-[#F5F5F5]">
                      {cfg.type === "image" ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                              Lebar (pt)
                            </label>
                            <input
                              type="number"
                              value={cfg.max_width}
                              onChange={(e) => updateConfig(cfg.column_name, { max_width: Number(e.target.value) })}
                              className="w-full p-1.5 text-xs font-mono rounded border border-[#E5E7EB] bg-white text-[#111111]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                              Tinggi (pt)
                            </label>
                            <input
                              type="number"
                              value={cfg.height}
                              onChange={(e) => updateConfig(cfg.column_name, { height: Number(e.target.value) })}
                              className="w-full p-1.5 text-xs font-mono rounded border border-[#E5E7EB] bg-white text-[#111111]"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                              Isi Teks / Konten
                            </label>
                            <textarea
                              rows={2}
                              value={cfg.static_text || ""}
                              onChange={(e) => updateConfig(cfg.column_name, { static_text: e.target.value })}
                              placeholder="Ketik teks kustom atau biarkan kosong untuk mengikuti data CSV..."
                              className="w-full p-2 text-xs font-mono rounded border border-[#E5E7EB] bg-white text-[#111111]"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                                Ukuran Font (pt)
                              </label>
                              <input
                                type="number"
                                value={cfg.font_size}
                                onChange={(e) => updateConfig(cfg.column_name, { font_size: Number(e.target.value) })}
                                className="w-full p-1.5 text-xs font-mono rounded border border-[#E5E7EB] bg-white text-[#111111]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                                Lebar Kotak (pt)
                              </label>
                              <input
                                type="number"
                                value={cfg.max_width}
                                onChange={(e) => updateConfig(cfg.column_name, { max_width: Number(e.target.value) })}
                                className="w-full p-1.5 text-xs font-mono rounded border border-[#E5E7EB] bg-white text-[#111111]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                              Warna Tinta
                            </label>
                            <input
                              type="color"
                              value={cfg.color || "#111111"}
                              onChange={(e) => updateConfig(cfg.column_name, { color: e.target.value })}
                              className="h-7 w-9 p-0.5 bg-transparent border border-[#E5E7EB] rounded cursor-pointer"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* PANEL: FONTS */}
            {activeTab === "fonts" && (
              <div className="space-y-6">
                <div className="border-b border-[#E5E7EB] pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#111111]">
                    Pilihan Tipografi
                  </h2>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    Gunakan font bawaan, unggah font sendiri, atau ambil dari OS
                  </p>
                </div>

                <div className="border border-[#E5E7EB] rounded-md p-3.5 space-y-2 bg-[#F5F5F5]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#6B7280]">
                      Font Aktif
                    </span>
                    {selectedLocalFontFamily && (
                      <button
                        type="button"
                        onClick={handleResetFont}
                        className="text-[10px] font-mono text-amber-600 hover:underline"
                      >
                        Reset Standar
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-mono font-medium text-[#111111] truncate">
                    {selectedLocalFontFamily || "Standar (Helvetica-Bold)"}
                  </p>
                </div>

                {/* Opsi 1: Font Bawaan */}
                <div className="border border-[#E5E7EB] rounded-md p-3.5 space-y-2 bg-[#FFFFFF]">
                  <label className="block text-[11px] font-mono uppercase text-[#111111] font-medium">
                    1. Font Bawaan ({BUILT_IN_FONTS.length})
                  </label>
                  <select
                    value={
                      BUILT_IN_FONTS.some((f) => f.family === selectedLocalFontFamily)
                        ? BUILT_IN_FONTS.find((f) => f.family === selectedLocalFontFamily)?.id
                        : ""
                    }
                    onChange={(e) => handleSelectBuiltInFont(e.target.value)}
                    disabled={isLoadingFontBytes}
                    className="w-full p-2 text-xs font-mono rounded border border-[#E5E7EB] bg-white text-[#111111]"
                  >
                    <option value="">Pilih Font Bawaan</option>
                    {BUILT_IN_FONTS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Opsi 2: Unggah Mandiri */}
                <div className="border border-[#E5E7EB] rounded-md p-3.5 space-y-2 bg-[#FFFFFF]">
                  <label className="block text-[11px] font-mono uppercase text-[#111111] font-medium">
                    2. Unggah Font (.ttf / .otf)
                  </label>
                  <button
                    type="button"
                    onClick={() => fontUploadInputRef.current?.click()}
                    disabled={isLoadingFontBytes}
                    className="w-full py-2 text-xs font-mono uppercase rounded border border-[#111111] bg-[#111111] text-white hover:bg-[#333333] transition-colors"
                  >
                    {isLoadingFontBytes ? "Memuat..." : "Pilih Berkas Font"}
                  </button>
                </div>

                {/* Opsi 3: Deteksi OS */}
                <div className="border border-[#E5E7EB] rounded-md p-3.5 space-y-2 bg-[#FFFFFF]">
                  <label className="block text-[11px] font-mono uppercase text-[#111111] font-medium">
                    3. Pindai Font Sistem Operasi
                  </label>
                  {!localFontApiSupported ? (
                    <p className="text-[11px] text-[#6B7280]">
                      Pemindaian otomatis font OS hanya tersedia pada Chrome/Edge desktop.
                    </p>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleDetectLocalFonts}
                        disabled={isDetectingFonts}
                        className="w-full py-1.5 text-xs font-mono uppercase rounded border border-[#E5E7EB] hover:bg-[#F5F5F5] transition-colors"
                      >
                        {isDetectingFonts ? "Memindai..." : "Pindai Font dari Komputer"}
                      </button>
                      {localFontFamilies.length > 0 && (
                        <select
                          value={selectedLocalFontFamily}
                          onChange={(e) => handleSelectLocalFont(e.target.value)}
                          className="w-full p-2 text-xs font-mono rounded border border-[#E5E7EB] bg-white text-[#111111] mt-2"
                        >
                          <option value="">Pilih Font Terdeteksi ({localFontFamilies.length})</option>
                          {localFontFamilies.map((fam) => (
                            <option key={fam} value={fam}>{fam}</option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                  {fontDetectionError && (
                    <p className="text-xs font-mono text-amber-600 pt-1">
                      [!] {fontDetectionError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {}
            {/* PANEL: PRESETS */}
            {activeTab === "presets" && (
              <div className="space-y-5">
                <div className="border-b border-[#E5E7EB] pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#111111]">
                    Pola Ekspor Berkas
                  </h2>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    Tentukan format nama berkas sertifikat
                  </p>
                </div>

                <div className="border border-[#E5E7EB] rounded-md p-3 space-y-2 bg-[#F5F5F5]">
                  <label className="block text-[10px] font-mono uppercase text-[#6B7280]">
                    Pola Nama Berkas (.pdf)
                  </label>
                  <input
                    type="text"
                    value={filenamePattern}
                    onChange={(e) => setFilenamePattern(e.target.value)}
                    placeholder="sertifikat_{Nama}_{index}"
                    className="w-full p-2 text-xs font-mono rounded border border-[#E5E7EB] bg-white text-[#111111]"
                  />
                </div>

                {csvRows.length > 0 && (
                  <div className="border border-[#E5E7EB] rounded-md p-3 space-y-3 bg-[#F5F5F5]">
                    <label className="text-[10px] font-mono uppercase text-[#6B7280] block">
                      Rentang Baris ({csvRows.length} total)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSliceMode("all")}
                        className={`py-1 text-[10px] font-mono uppercase rounded border ${
                          sliceMode === "all" ? "bg-[#111111] text-white" : "bg-white text-[#6B7280]"
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setSliceMode("custom")}
                        className={`py-1 text-[10px] font-mono uppercase rounded border ${
                          sliceMode === "custom" ? "bg-[#111111] text-white" : "bg-white text-[#6B7280]"
                        }`}
                      >
                        Pilih Rentang
                      </button>
                    </div>

                    {sliceMode === "custom" && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="number"
                          min={1}
                          max={csvRows.length}
                          value={sliceStart}
                          onChange={(e) => setSliceStart(Number(e.target.value))}
                          className="w-full p-1.5 text-xs font-mono rounded border border-[#E5E7EB] bg-white text-[#111111]"
                        />
                        <span className="text-xs font-mono text-[#6B7280]">-</span>
                        <input
                          type="number"
                          min={1}
                          max={csvRows.length}
                          value={sliceEnd}
                          onChange={(e) => setSliceEnd(Number(e.target.value))}
                          className="w-full p-1.5 text-xs font-mono rounded border border-[#E5E7EB] bg-white text-[#111111]"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* WORKSPACE CANVAS PRATINJAU */}
        <div
          ref={stageScrollRef}
          onWheel={handleStageWheel}
          className="flex-1 p-8 flex flex-col items-center justify-start overflow-auto relative bg-[#F5F5F5]"
        >
          <div className="w-full max-w-4xl flex items-center justify-between mb-4 text-xs font-mono">
            <span className="text-[#6B7280]">
              Kanvas Pratinjau Interaktif (Tarik & Atur Letak)
            </span>
            <div className="flex items-center gap-1 border border-[#E5E7EB] px-1.5 py-1 rounded-[4px] bg-[#FFFFFF]">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= ZOOM_MIN}
                className="w-5 h-5 flex items-center justify-center font-mono rounded text-[#6B7280] hover:text-[#111111]"
              >
                -
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                className="px-1.5 h-5 text-xs font-mono text-[#111111] tabular-nums"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= ZOOM_MAX}
                className="w-5 h-5 flex items-center justify-center font-mono rounded text-[#6B7280] hover:text-[#111111]"
              >
                +
              </button>
            </div>
          </div>

          <div
            style={{
              width: pdfPreviewSize.width * zoomLevel,
              height: pdfPreviewSize.height * zoomLevel,
            }}
            className="shrink-0"
          >
            <div
              ref={containerRef}
              className="relative bg-white border border-[#E5E7EB] rounded-[2px] overflow-hidden shrink-0 origin-top-left shadow-sm"
              style={{
                width: pdfPreviewSize.width,
                height: pdfPreviewSize.height,
                transform: `scale(${zoomLevel})`,
              }}
            >
              <canvas ref={canvasRef} className="absolute top-0 left-0 z-0 pointer-events-none" />

              {configs
                .filter((cfg) => cfg.enabled && (cfg.page_number || 1) === currentPage)
                .map((cfg) => {
                  const displayText = cfg.static_text || longestRowSample[cfg.column_name] || `[${cfg.column_name}]`;
                  const isSelected = activeColumn === cfg.column_name;
                  const isImage = cfg.type === "image";

                  const lineHeightVal = cfg.line_height || 1.2;
                  let elementHeight = isImage ? cfg.height : cfg.font_size * lineHeightVal;

                  if (!isImage) {
                    const rawLines = String(displayText || "").split("\n");
                    const approxCharWidth = (cfg.font_size || 24) * 0.52;
                    const maxCharsPerLine = Math.max(1, Math.floor((cfg.max_width || 200) / approxCharWidth));
                    let visualLines = 0;
                    rawLines.forEach((l) => {
                      visualLines += Math.max(1, Math.ceil((l.length || 1) / maxCharsPerLine));
                    });
                    elementHeight = Math.max(cfg.font_size * lineHeightVal, visualLines * cfg.font_size * lineHeightVal);
                  }

                  return (
                    <Rnd
                      key={cfg.column_name}
                      bounds="parent"
                      scale={zoomLevel}
                      size={{ width: cfg.max_width, height: elementHeight }}
                      enableResizing={isImage ? true : { left: true, right: true }}
                      position={{ x: cfg.x, y: cfg.y }}
                      onDrag={(e, d) => updateConfig(cfg.column_name, { x: d.x, y: d.y })}
                      onResizeStop={(e, dir, ref, delta, pos) => {
                        updateConfig(cfg.column_name, {
                          max_width: parseFloat(ref.style.width),
                          ...(isImage ? { height: parseFloat(ref.style.height) } : {}),
                          x: pos.x,
                          y: pos.y,
                        });
                        setActiveColumn(cfg.column_name);
                      }}
                      onClick={() => setActiveColumn(cfg.column_name)}
                      className="absolute cursor-move z-10 flex items-start justify-center overflow-visible"
                      style={{
                        outline: isSelected ? "1px solid #111111" : "1px dashed #B0B6C3",
                        backgroundColor: isSelected ? "rgba(17,17,17,0.03)" : "transparent",
                      }}
                    >
                      {isImage ? (
                        <img
                          src={cfg.data_url}
                          alt="logo"
                          className="w-full h-full object-contain pointer-events-none select-none"
                        />
                      ) : (
                        <span
                          className="select-none"
                          style={{
                            display: "block",
                            width: "100%",
                            fontSize: `${cfg.font_size}px`,
                            lineHeight: lineHeightVal,
                            textAlign: cfg.align || "left",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            color: cfg.color || "#111111",
                            fontFamily: selectedLocalFontFamily
                              ? `"${selectedLocalFontFamily}", Helvetica, Arial, sans-serif`
                              : 'Helvetica, Arial, "Liberation Sans", sans-serif',
                          }}
                        >
                          {displayText}
                        </span>
                      )}
                    </Rnd>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {}
      {/* FOOTER INFORMASI STATUS */}
      <footer className="h-8 border-t border-[#E5E7EB] px-6 flex items-center justify-between text-xs font-mono shrink-0 z-30 bg-[#FFFFFF] text-[#6B7280]">
        <div className="flex items-center gap-4">
          <span>Peserta: <strong className="text-[#111111]">{csvRows.length} Baris</strong></span>
          <span className="text-[#E5E7EB]">/</span>
          <span>Template: <strong className="text-[#111111]">{templateFile ? formatBytes(templateFile.size) : "Belum Ada"}</strong></span>
        </div>
        <div className="flex items-center gap-4">
          <span>
            Watermark:{" "}
            <strong className={isOverFiftyLimit ? "text-amber-600 font-semibold" : "text-emerald-600"}>
              {isOverFiftyLimit ? "Aktif (>50 dokumen)" : "Bebas Watermark (≤50 dokumen)"}
            </strong>
          </span>
        </div>
      </footer>
    </div>
  );
}
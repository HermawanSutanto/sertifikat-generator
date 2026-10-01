"use client";
import "es-iterator-helpers/auto";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Inter, JetBrains_Mono } from "next/font/google";
import { useAuth } from "../../../context/AuthContext";
import Papa from "papaparse";
import { Rnd } from "react-rnd";
import { PDFDocument } from "pdf-lib";
import {
  AUTOSAVE_KEYS,
  idbSet,
  readAutosaveMeta,
  readFullAutosave,
  clearAutosave,
} from "./idbStorage";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);
const ASSET_BUCKET = "project-assets";

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

// Koleksi font bawaan yang tersedia di folder public/fonts
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

const sanitizeName = (nama) => {
  return (nama || "")
    .trim()
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");
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
          : "bg-[#FFFFFF] text-[#D92D20] border-[#D92D20]"
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
          <div className="p-2 bg-[#F5F5F5] text-[#D92D20] border border-[#E5E7EB] rounded-[4px] shrink-0">
            <IconAlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium tracking-tight text-[#111111]">
              Peringatan Validasi
            </h3>
            <p className="text-xs mt-0.5 text-[#6B7280]">
              Ditemukan catatan sebelum proses cetak
            </p>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-2 text-xs p-3 rounded-[4px] border border-[#E5E7EB] font-mono bg-[#F5F5F5] text-[#111111]">
          {warnings.map((warn, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-[#D92D20] font-medium">[!]</span>
              <span className="leading-normal">{warn}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#6B7280]">
          Apakah Anda ingin mengabaikan catatan ini dan tetap memproses berkas?
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
      desc: "Buka panel 'Berkas' di bilah kiri. Anda dapat memilih Template Bawaan yang sudah dilengkapi tata letak, atau mengunggah template PDF mandiri beserta file CSV peserta.",
    },
    {
      title: "2. Menambahkan Elemen Desain",
      tab: "Elemen",
      desc: "Tersedia elemen teks statis, teks variabel mandiri, serta integrasi aset resmi (Logo & Tanda Tangan) dari profil organisasi Anda yang dapat dipasang ke kanvas dalam satu klik.",
    },
    {
      title: "3. Cara Kerja Teks Variabel",
      tab: "Variabel",
      desc: "Teks Variabel memungkinkan Anda membuat kolom baru secara fleksibel:\n• Tentukan nama variabel (contoh: 'prodi') dan daftarnya (contoh: 'Informatika, Mesin').\n• Jika jumlah kata sama dengan baris peserta, nilainya diisi berurutan per peserta.\n• Jika berbeda, sistem otomatis memakai nilai pertama untuk semua peserta.",
    },
    {
      title: "4. Pengelompokan Berkas ZIP & Optimasi RAM",
      tab: "Pengelompokan",
      desc: "Di tab 'Preset', Anda dapat memilih cara pemecahan arsip ZIP:\n• Berdasarkan Jumlah: Memecah arsip ZIP sesuai kuota kapasitas memori perangkat.\n• Berdasarkan Kolom: Memecah arsip ZIP per kategori otomatis (misal: per Prodi).\n• Sistem otomatis men-stream berkas langsung ke disk untuk menjaga konsumsi RAM rendah.",
    },
    {
      title: "5. Sinkronisasi Cloud & Pintasan Kanvas",
      tab: "Cloud & Shortcut",
      desc: "Saat membuka event dari dashboard, klik tombol 'Simpan ke Event' di header atas untuk mengunggah template PDF, peserta, dan tata letak langsung ke database Cloud.\n• Tombol Panah: Geser elemen 1pt (Shift = 10pt)\n• Ctrl/Cmd + D: Duplikat elemen aktif\n• Ctrl/Cmd + Z / Y: Urungkan (Undo) atau Ulangi (Redo)",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="border border-[#E5E7EB] rounded-md max-w-lg w-full p-6 space-y-5 bg-[#FFFFFF]">
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

        <div className="space-y-3 min-h-[155px]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-[#F5F5F5] text-[#111111] border border-[#E5E7EB]">
              {steps[currentStep].tab}
            </span>
            <h4 className="text-xs font-medium text-[#111111]">
              {steps[currentStep].title}
            </h4>
          </div>
          <p className="text-xs text-[#6B7280] leading-relaxed whitespace-pre-line">
            {steps[currentStep].desc}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 py-1">
          {steps.map((_, idx) => (
            <button
              key={idx}
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
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="px-3.5 py-1.5 text-xs rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] transition-colors disabled:opacity-30"
          >
            Kembali
          </button>

          <div className="flex items-center gap-2">
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="px-4 py-1.5 text-xs rounded-[4px] text-white bg-[#111111] hover:bg-[#333333] transition-colors"
              >
                Lanjut
              </button>
            ) : (
              <button
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

export default function CetakLokal() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams?.get("eventId");

  const [eventData, setEventData] = useState(null);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [cloudSaveStatus, setCloudSaveStatus] = useState("");
  const [hasNewCsvUpload, setHasNewCsvUpload] = useState(false);

  const [orgBranding, setOrgBranding] = useState({
    logoUrl: "",
    capStempelUrl: "",
    namaOrganisasi: "",
    tipeOrganisasi: "personal",
  });
  const [isLoadingOrgBranding, setIsLoadingOrgBranding] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("files");

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

  const [filenamePattern, setFilenamePattern] = useState("sertifikat_{Nama}_{index}");
  const [sliceMode, setSliceMode] = useState("all");
  const [sliceStart, setSliceStart] = useState(1);
  const [sliceEnd, setSliceEnd] = useState(1);

  const [deviceRamGb, setDeviceRamGb] = useState(8);
  const [maxCertsPerZip, setMaxCertsPerZip] = useState(1000);
  const [zipGroupingMode, setZipGroupingMode] = useState("chunk");
  const [selectedZipGroupColumn, setSelectedZipGroupColumn] = useState("");

  // State Font Management (3 Opsi: Bawaan, Kustom Upload, Sistem OS)
  const [localFontApiSupported, setLocalFontApiSupported] = useState(false);
  const [isDetectingFonts, setIsDetectingFonts] = useState(false);
  const [localFontsRaw, setLocalFontsRaw] = useState([]);
  const [localFontFamilies, setLocalFontFamilies] = useState([]);
  const [selectedLocalFontFamily, setSelectedLocalFontFamily] = useState("");
  const [selectedFontBytes, setSelectedFontBytes] = useState(null);
  const [selectedFontStyle, setSelectedFontStyle] = useState("");
  const [isLoadingFontBytes, setIsLoadingFontBytes] = useState(false);
  const [isUploadingFontCloud, setIsUploadingFontCloud] = useState(false);
  const [fontDetectionError, setFontDetectionError] = useState("");

  const imageUploadInputRef = useRef(null);
  const fontUploadInputRef = useRef(null);

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
    } catch (err) {
      console.warn("Gagal mendeteksi spesifikasi memori:", err);
      setDeviceRamGb(8);
      setMaxCertsPerZip(1000);
    }

    try {
      setLocalFontApiSupported("queryLocalFonts" in window);
    } catch {
      setLocalFontApiSupported(false);
    }
  }, []);

  // 1. OPSI: MEMUAT FONT BAWAAN DARI PUBLIC/FONTS
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

      // Muat ke DOM peramban agar langsung terlihat pada kanvas
      const fontFace = new FontFace(chosen.family, arrayBuffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      setSelectedFontBytes(bytes);
      setSelectedLocalFontFamily(chosen.family);
      setSelectedFontStyle("Regular");

      // Simpan ke Supabase jika sedang berada dalam mode Cloud Event
      if (eventId && user) {
        setIsUploadingFontCloud(true);
        const fontPath = `${user.uid}/${eventId}/font_${chosen.family}.ttf`;
        const fontBlob = new Blob([bytes], { type: "font/ttf" });

        const { error: uploadErr } = await supabase.storage
          .from(ASSET_BUCKET)
          .upload(fontPath, fontBlob, { contentType: "font/ttf", upsert: true });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(fontPath);
          const meta = { path: fontPath, url: urlData.publicUrl, familyName: chosen.family };

          await updateDoc(doc(db, "events", eventId), {
            "storageRefs.customFont": meta,
            diperbaruiPada: serverTimestamp(),
          });

          setEventData((prev) => ({
            ...prev,
            storageRefs: { ...(prev?.storageRefs || {}), customFont: meta },
          }));
        }
        setIsUploadingFontCloud(false);
      }

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

  // 2. OPSI: UNGGAH FONT MANDIRI (.TTF / .OTF) DARI KOMPUTER PENGGUNA
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

      // Simpan langsung ke Supabase Storage jika dalam mode Cloud Event
      if (eventId && user) {
        setIsUploadingFontCloud(true);
        const fontPath = `${user.uid}/${eventId}/font_${cleanFamilyName.replace(/\s+/g, "_")}.${ext}`;

        const { error: fontUploadErr } = await supabase.storage
          .from(ASSET_BUCKET)
          .upload(fontPath, file, {
            contentType: ext === "otf" ? "font/otf" : "font/ttf",
            upsert: true,
          });

        if (fontUploadErr) throw new Error(fontUploadErr.message);

        const { data: fontUrlData } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(fontPath);
        const meta = { path: fontPath, url: fontUrlData.publicUrl, familyName: cleanFamilyName };

        await updateDoc(doc(db, "events", eventId), {
          "storageRefs.customFont": meta,
          diperbaruiPada: serverTimestamp(),
        });

        setEventData((prev) => ({
          ...prev,
          storageRefs: { ...(prev?.storageRefs || {}), customFont: meta },
        }));

        setNotification({
          show: true,
          message: `Font "${cleanFamilyName}" berhasil diunggah & disimpan di Cloud.`,
          type: "success",
        });
      } else {
        setNotification({
          show: true,
          message: `Font "${cleanFamilyName}" siap digunakan di kanvas.`,
          type: "success",
        });
      }
    } catch (err) {
      console.error("Gagal memproses font kustom:", err);
      setFontDetectionError(err.message);
      setNotification({ show: true, message: `Gagal memuat font: ${err.message}`, type: "error" });
    } finally {
      setIsLoadingFontBytes(false);
      setIsUploadingFontCloud(false);
      if (e.target) e.target.value = "";
    }
  };

  // 3. OPSI: PINDAI FONT DARI SISTEM OPERASI (CHROMIUM LOCAL FONT API)
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

  // Reset Font ke Standar (Helvetica-Bold)
  const handleResetFont = async () => {
    setSelectedLocalFontFamily("");
    setSelectedFontBytes(null);
    setSelectedFontStyle("");

    if (eventId && user) {
      try {
        await updateDoc(doc(db, "events", eventId), {
          "storageRefs.customFont": null,
          diperbaruiPada: serverTimestamp(),
        });
        setEventData((prev) => ({
          ...prev,
          storageRefs: { ...(prev?.storageRefs || {}), customFont: null },
        }));
      } catch (err) {
        console.warn("Gagal mereset font event:", err);
      }
    }

    setNotification({
      show: true,
      message: "Font dikembalikan ke standar (Helvetica-Bold).",
      type: "success",
    });
  };

  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfPreviewSize, setPdfPreviewSize] = useState({ width: 842, height: 595 });
  const [pageSizes, setPageSizes] = useState({});

  const [configs, setConfigs] = useState([]);
  const [activeColumn, setActiveColumn] = useState("");

  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState([]);
  const [activeSnapGuides, setActiveSnapGuides] = useState({ x: false, y: false });
  const [historyState, setHistoryState] = useState({ past: [], future: [] });
  const historyBurstActiveRef = useRef(false);
  const historyBurstTimerRef = useRef(null);
  const configsRef = useRef(configs);
  useEffect(() => {
    configsRef.current = configs;
  }, [configs]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  const [validationWarnings, setValidationWarnings] = useState([]);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);

  const [autosaveMeta, setAutosaveMeta] = useState(null);
  const [isRestoreBannerOpen, setIsRestoreBannerOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const hasCheckedAutosaveRef = useRef(false);
  const configsSaveTimerRef = useRef(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const stageScrollRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);

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

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => setNotification((n) => ({ ...n, show: false })), 3500);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const local = localStorage.getItem("sertigen_presets");
    if (local) {
      try {
        setSavedPresets(JSON.parse(local));
      } catch (e) {
        console.error("Gagal membaca preset:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const loadOrgBranding = async () => {
      setIsLoadingOrgBranding(true);
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let targetOrgId = null;
        if (userSnap.exists()) {
          targetOrgId = userSnap.data().activeOrgId;
        }

        if (targetOrgId) {
          const orgRef = doc(db, "organizations", targetOrgId);
          const orgSnap = await getDoc(orgRef);
          if (orgSnap.exists() && isMounted) {
            const o = orgSnap.data();
            setOrgBranding({
              logoUrl: o.branding?.logoUrl || "",
              capStempelUrl: o.branding?.capStempelUrl || "",
              namaOrganisasi: o.namaOrganisasi || "",
              tipeOrganisasi: o.tipeOrganisasi || "personal",
            });
          }
        }
      } catch (err) {
        console.warn("Gagal memuat branding dari profil:", err);
      } finally {
        if (isMounted) setIsLoadingOrgBranding(false);
      }
    };

    loadOrgBranding();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!eventId || !user) return;

    let isMounted = true;
    const loadEventFromCloud = async () => {
      try {
        setNotification({
          show: true,
          message: "Sinkronisasi data event dari cloud...",
          type: "success",
        });

        const docRef = doc(db, "events", eventId);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
          setNotification({
            show: true,
            message: "Event tidak ditemukan di database cloud.",
            type: "error",
          });
          return;
        }

        const data = snap.data();
        if (data.userId && data.userId !== user.uid) {
          setNotification({
            show: true,
            message: "Akses ditolak: Dokumen ini bukan milik Anda.",
            type: "error",
          });
          return;
        }

        if (!isMounted) return;
        setEventData({ id: snap.id, ...data });

        if (data.configs && Array.isArray(data.configs) && data.configs.length > 0) {
          setConfigs(data.configs);
          if (data.configs[0]?.column_name) {
            setActiveColumn(data.configs[0].column_name);
          }
        }

        if (data.filenamePattern) {
          setFilenamePattern(data.filenamePattern);
        }

        if (data.storageRefs?.templatePdf?.url) {
          const res = await fetch(data.storageRefs.templatePdf.url);
          if (res.ok) {
            const blob = await res.blob();
            const file = new File([blob], "template_cloud.pdf", { type: "application/pdf" });
            await processAndSetPdfTemplate(file);
          }
        }

        // Muat font tersimpan di Cloud
        if (data.storageRefs?.customFont?.url) {
          try {
            const fontRes = await fetch(data.storageRefs.customFont.url);
            if (fontRes.ok) {
              const fontBlob = await fontRes.blob();
              const arrayBuf = await fontBlob.arrayBuffer();
              const bytes = new Uint8Array(arrayBuf);
              const familyName = data.storageRefs.customFont.familyName || "CustomCloudFont";

              const fontFace = new FontFace(familyName, arrayBuf);
              await fontFace.load();
              document.fonts.add(fontFace);

              setSelectedFontBytes(bytes);
              setSelectedLocalFontFamily(familyName);
              setSelectedFontStyle("Regular");
            }
          } catch (fontErr) {
            console.warn("Gagal memuat font cloud:", fontErr);
          }
        }

        try {
          const pesertaColRef = collection(db, `events/${eventId}/peserta`);
          const pesertaSnap = await getDocs(pesertaColRef);
          if (!pesertaSnap.empty) {
            const list = pesertaSnap.docs.map((d) => d.data());
            list.sort((a, b) => (a.nomorUrut || 0) - (b.nomorUrut || 0));
            const rows = list.map((p) => p.attributes || { Nama: p.nama, Email: p.email || "" });
            setCsvFile(new File([], "peserta_cloud.csv", { type: "text/csv" }));
            setCsvRows(rows);
            setSliceStart(1);
            setSliceEnd(rows.length);
            if (rows.length > 0) {
              const detectedFields = Object.keys(rows[0]);
              setCsvHeaders(detectedFields);
              const scanned = scanLongestRowSample(rows, detectedFields);
              setLongestRowSample(scanned);
            }
          }
        } catch (pesertaErr) {
          console.warn("Gagal memuat daftar peserta dari Firestore:", pesertaErr);
        }

        setNotification({
          show: true,
          message: `Event "${data.namaEvent}" siap diedit.`,
          type: "success",
        });
      } catch (err) {
        console.error("Gagal sinkronisasi cloud:", err);
        setNotification({
          show: true,
          message: "Gagal memuat event dari cloud: " + err.message,
          type: "error",
        });
      }
    };

    loadEventFromCloud();
    return () => {
      isMounted = false;
    };
  }, [eventId, user]);

  const handleSaveToCloud = async () => {
    if (!eventId || !user) return;

    setIsCloudSaving(true);
    setCloudSaveStatus("Menyimpan aset ke Cloud...");

    try {
      const storageUpdates = {
        templatePdf: eventData?.storageRefs?.templatePdf || null,
        customFont: eventData?.storageRefs?.customFont || null,
        images: eventData?.storageRefs?.images || [],
      };

      if (templateFile && originalTemplateRawFile) {
        setCloudSaveStatus("Mengunggah template PDF...");
        const pdfPath = `${user.uid}/${eventId}/template.pdf`;
        const { error: uploadPdfErr } = await supabase.storage
          .from(ASSET_BUCKET)
          .upload(pdfPath, templateFile, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadPdfErr) {
          throw new Error(`Supabase PDF Upload: ${uploadPdfErr.message}`);
        }

        const { data: pdfUrlData } = supabase.storage
          .from(ASSET_BUCKET)
          .getPublicUrl(pdfPath);

        storageUpdates.templatePdf = {
          path: pdfPath,
          url: pdfUrlData.publicUrl,
          size: templateFile.size,
          updatedAt: Date.now(),
        };
      }

      if (selectedFontBytes && selectedLocalFontFamily) {
        setCloudSaveStatus("Mengunggah font kustom...");
        const fontPath = `${user.uid}/${eventId}/font_${selectedLocalFontFamily.replace(/\s+/g, "_")}.ttf`;
        const fontBlob = new Blob([selectedFontBytes], { type: "font/ttf" });

        const { error: fontUploadErr } = await supabase.storage
          .from(ASSET_BUCKET)
          .upload(fontPath, fontBlob, {
            contentType: "font/ttf",
            upsert: true,
          });

        if (!fontUploadErr) {
          const { data: fontUrlData } = supabase.storage
            .from(ASSET_BUCKET)
            .getPublicUrl(fontPath);

          storageUpdates.customFont = {
            path: fontPath,
            url: fontUrlData.publicUrl,
            familyName: selectedLocalFontFamily,
          };
        }
      }

      const imageConfigs = configs.filter((c) => c.enabled && c.type === "image" && c.data_url);
      if (imageConfigs.length > 0) {
        setCloudSaveStatus("Mengunggah elemen gambar...");
        const uploadedImages = [];

        for (const imgCfg of imageConfigs) {
          if (imgCfg.data_url.startsWith("data:")) {
            const res = await fetch(imgCfg.data_url);
            const blob = await res.blob();
            const ext = imgCfg.mime_type?.includes("jpeg") ? "jpg" : "png";
            const imgPath = `${user.uid}/${eventId}/images/${imgCfg.column_name}.${ext}`;

            const { error: imgErr } = await supabase.storage
              .from(ASSET_BUCKET)
              .upload(imgPath, blob, {
                contentType: imgCfg.mime_type || "image/png",
                upsert: true,
              });

            if (!imgErr) {
              const { data: imgUrlData } = supabase.storage
                .from(ASSET_BUCKET)
                .getPublicUrl(imgPath);

              uploadedImages.push({
                elementId: imgCfg.column_name,
                path: imgPath,
                url: imgUrlData.publicUrl,
              });
            }
          }
        }

        if (uploadedImages.length > 0) {
          storageUpdates.images = uploadedImages;
        }
      }

      if (hasNewCsvUpload && csvRows && csvRows.length > 0) {
        setCloudSaveStatus(`Menyimpan ${csvRows.length} data peserta...`);
        setHasNewCsvUpload(false);
        const pesertaColRef = collection(db, `events/${eventId}/peserta`);
        const existingSnap = await getDocs(pesertaColRef);

        if (!existingSnap.empty) {
          const existingDocs = existingSnap.docs;
          for (let i = 0; i < existingDocs.length; i += 400) {
            const delBatch = writeBatch(db);
            const chunk = existingDocs.slice(i, i + 400);
            chunk.forEach((d) => delBatch.delete(d.ref));
            await delBatch.commit();
          }
        }

        for (let i = 0; i < csvRows.length; i += 400) {
          const addBatch = writeBatch(db);
          const chunk = csvRows.slice(i, i + 400);
          chunk.forEach((row, chunkIdx) => {
            const globalIdx = i + chunkIdx + 1;
            const newDocRef = doc(pesertaColRef);
            const nama = row.Nama || row.nama || row.NAME || `Peserta ${globalIdx}`;
            const email = row.Email || row.email || "";

            addBatch.set(newDocRef, {
              nomorUrut: globalIdx,
              nama: String(nama).trim(),
              email: String(email).trim(),
              attributes: row,
              diunduh: false,
              dibuatPada: serverTimestamp(),
            });
          });
          await addBatch.commit();
        }
      }

      setCloudSaveStatus("Menyimpan tata letak...");
      const docRef = doc(db, "events", eventId);
      await updateDoc(docRef, {
        configs: configs,
        filenamePattern: filenamePattern || "sertifikat_{Nama}_{index}",
        storageRefs: storageUpdates,
        totalPeserta: csvRows ? csvRows.length : 0,
        diperbaruiPada: serverTimestamp(),
      });

      setNotification({
        show: true,
        message: "Perubahan berhasil disinkronkan ke Cloud.",
        type: "success",
      });
    } catch (err) {
      console.error("Gagal simpan ke cloud:", err);
      setNotification({
        show: true,
        message: "Gagal simpan ke cloud: " + err.message,
        type: "error",
      });
    } finally {
      setIsCloudSaving(false);
      setCloudSaveStatus("");
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPdfPage(pdfDoc, currentPage);
    }
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    if (loading || !user || hasCheckedAutosaveRef.current) return;
    hasCheckedAutosaveRef.current = true;

    if (eventId) return;

    (async () => {
      const meta = await readAutosaveMeta();
      if (meta && (meta.templateName || meta.csvName)) {
        setAutosaveMeta(meta);
        setIsRestoreBannerOpen(true);
      }
    })();
  }, [loading, user, eventId]);

  useEffect(() => {
    if (isRestoring || isRestoreBannerOpen) return;
    if (configsSaveTimerRef.current) clearTimeout(configsSaveTimerRef.current);

    configsSaveTimerRef.current = setTimeout(async () => {
      try {
        await idbSet(AUTOSAVE_KEYS.CONFIGS, configs);
        if (configs.length > 0) await saveAutosaveMeta({});
      } catch (err) {
        console.error("Gagal autosave tata letak:", err);
      }
    }, 800);

    return () => clearTimeout(configsSaveTimerRef.current);
  }, [configs, isRestoring, isRestoreBannerOpen]);

  useEffect(() => {
    const isEditableTarget = (target) => {
      const tag = target?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;
    };

    const onKeyDown = (e) => {
      if (isEditableTarget(e.target)) return;

      const isMeta = e.ctrlKey || e.metaKey;

      if (isMeta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if (isMeta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (!activeColumn) return;

      if (isMeta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDuplicateElement(activeColumn);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const cfg = configsRef.current.find((c) => c.column_name === activeColumn);
        if (cfg?.static_text !== undefined || cfg?.is_custom_var || cfg?.type === "image") {
          e.preventDefault();
          handleHideElement(activeColumn);
        }
        return;
      }

      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleNudgeActive(0, -step);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleNudgeActive(0, step);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleNudgeActive(-step, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNudgeActive(step, 0);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeColumn]);

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

  const saveAutosaveMeta = async (patch) => {
    try {
      const prev = (await readAutosaveMeta()) || {};
      const next = { ...prev, ...patch, savedAt: Date.now() };
      await idbSet(AUTOSAVE_KEYS.META, next);
    } catch (err) {
      console.error("Gagal menyimpan metadata autosave:", err);
    }
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

      try {
        await idbSet(AUTOSAVE_KEYS.TEMPLATE, compressedFile);
        await saveAutosaveMeta({ templateName: file.name, templateSize: compressedFile.size });
      } catch (err) {
        console.error("Gagal autosave template:", err);
      }
    } catch (err) {
      console.error("Gagal memuat PDF:", err);
      setNotification({ show: true, message: `Gagal memuat PDF: ${err.message}`, type: "error" });
    }
  };

  const handleTemplateChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedBuiltInTemplateId("");
    await processAndSetPdfTemplate(file);
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
              pushHistorySnapshot(configsRef.current);
              setConfigs(targetConfigs);
              if (targetConfigs.length > 0) setActiveColumn(targetConfigs[0].column_name);
            }
          }
        } catch (e) {
          console.warn("Gagal memuat preset layout bawaan:", e);
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

  const handleCsvChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setHasNewCsvUpload(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        setCsvRows(rows);
        setSliceStart(1);
        setSliceEnd(rows.length);

        if (rows.length > 2000 && deviceRamGb <= 4) {
          setSliceMode("custom");
          setSliceStart(1);
          setSliceEnd(Math.min(rows.length, 1000));
          setNotification({
            show: true,
            message: `Terdeteksi ${rows.length} data. Mode Rentang otomatis aktif demi stabilitas RAM.`,
            type: "success",
          });
        }

        if (results.meta && results.meta.fields) {
          const fields = results.meta.fields;
          setCsvHeaders(fields);

          if (fields.length > 0) {
            setFilenamePattern(`sertifikat_{${fields[0]}}_{index}`);
          }

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
            if (fields.length > 0) setActiveColumn(fields[0]);
          }
        }

        (async () => {
          try {
            await idbSet(AUTOSAVE_KEYS.CSV, {
              headers: results.meta?.fields || [],
              rows,
            });
            await saveAutosaveMeta({ csvName: file.name, csvRowCount: rows.length });
          } catch (err) {
            console.error("Gagal autosave CSV:", err);
          }
        })();
      },
      error: (err) => {
        setNotification({ show: true, message: `Gagal membaca CSV: ${err.message}`, type: "error" });
      },
    });
  };

  const renderTaskRef = useRef(null);

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
        console.error("Gagal merender halaman PDF:", err);
      }
    }
  };

  const handleRecompress = async () => {
    if (!originalTemplateRawFile) return;

    setIsRecompressing(true);
    try {
      const recompressedFile = await compressPdfTemplate(
        originalTemplateRawFile,
        compressionScale,
        compressionQuality
      );
      setTemplateFile(recompressedFile);
      setNotification({
        show: true,
        message: `Template dikompresi: ${formatBytes(recompressedFile.size)}`,
        type: "success",
      });

      try {
        await idbSet(AUTOSAVE_KEYS.TEMPLATE, recompressedFile);
        await saveAutosaveMeta({ templateSize: recompressedFile.size });
      } catch (err) {
        console.error("Gagal autosave template:", err);
      }
    } catch (err) {
      setNotification({ show: true, message: `Gagal kompresi: ${err.message}`, type: "error" });
    } finally {
      setIsRecompressing(false);
    }
  };

  const handleRestoreSession = async () => {
    setIsRestoring(true);
    try {
      const { template, csv, configs: savedConfigs } = await readFullAutosave();

      if (csv && Array.isArray(csv.rows)) {
        setCsvFile(new File([], autosaveMeta?.csvName || "data_tersimpan.csv"));
        setCsvRows(csv.rows);
        setCsvHeaders(csv.headers || []);
        setSliceStart(1);
        setSliceEnd(csv.rows.length);
        if (csv.headers && csv.headers.length > 0) {
          setFilenamePattern(`sertifikat_{${csv.headers[0]}}_{index}`);
        }
        const scannedLongest = scanLongestRowSample(csv.rows, csv.headers || []);
        setLongestRowSample(scannedLongest);
      }

      if (Array.isArray(savedConfigs)) {
        setConfigs(savedConfigs);
        if (savedConfigs.length > 0) setActiveColumn(savedConfigs[0].column_name);
      }

      if (template) {
        setTemplateFile(template);
        setOriginalTemplateRawFile(null);
        setOriginalTemplateSize(template.size);

        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;

        const arrayBuffer = await template.arrayBuffer();
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
      }

      setIsRestoreBannerOpen(false);
      setHistoryState({ past: [], future: [] });
      setNotification({ show: true, message: "Sesi tersimpan berhasil dipulihkan.", type: "success" });
    } catch (err) {
      console.error("Gagal memulihkan sesi:", err);
      setNotification({ show: true, message: `Gagal memulihkan sesi: ${err.message}`, type: "error" });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDiscardAutosave = async () => {
    await clearAutosave();
    setAutosaveMeta(null);
    setIsRestoreBannerOpen(false);
  };

  const HISTORY_LIMIT = 50;
  const HISTORY_BURST_MS = 700;

  const pushHistorySnapshot = (snapshot) => {
    setHistoryState((h) => ({
      past: [...h.past.slice(-(HISTORY_LIMIT - 1)), snapshot],
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

  const canUndo = historyState.past.length > 0;
  const canRedo = historyState.future.length > 0;

  const handleAddStaticText = () => {
    const staticId = `static_text_${Date.now()}`;
    const newConfig = {
      column_name: staticId,
      static_text: "Teks Statis {Nama}",
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

  const handleAddCustomVar = () => {
    const varName = `variabel_${Date.now().toString().slice(-4)}`;
    const newConfig = {
      column_name: varName,
      is_custom_var: true,
      custom_var_name: varName,
      custom_var_values: "Nilai 1, Nilai 2, Nilai 3",
      x: (pdfPreviewSize.width - 300) / 2,
      y: 120,
      font_size: 24,
      line_height: 1.2,
      letter_spacing: 0,
      max_width: 300,
      align: "center",
      enabled: true,
      page_number: currentPage,
    };

    commitConfigs((prev) => [...prev, newConfig]);
    setActiveColumn(varName);
  };

  const handleAddImageElement = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          image_name: file.name,
          data_url: dataUrl,
          mime_type: file.type || "image/png",
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
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleInsertProfileAsset = async (assetType) => {
    const isLogo = assetType === "logo";
    const url = isLogo ? orgBranding.logoUrl : orgBranding.capStempelUrl;
    const label = isLogo
      ? orgBranding.tipeOrganisasi === "personal"
        ? "Logo Jenama"
        : "Logo Lembaga"
      : orgBranding.tipeOrganisasi === "personal"
      ? "Tanda Tangan Digital"
      : "Cap Stempel Resmi";

    if (!url) {
      setNotification({
        show: true,
        message: `${label} belum diunggah di pengaturan profil.`,
        type: "error",
      });
      return;
    }

    try {
      setNotification({
        show: true,
        message: `Memasang ${label} ke kanvas...`,
        type: "success",
      });

      let finalDataUrl = url;
      let mimeType = "image/png";

      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          mimeType = blob.type || "image/png";
          finalDataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }
      } catch (fetchErr) {
        console.warn("Direct blob fetch failed, fallback ke URL publik:", fetchErr);
        finalDataUrl = url;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const aspect = img.width / img.height || 1;
        const initialWidth = Math.min(160, pdfPreviewSize.width * 0.35);
        const initialHeight = initialWidth / aspect;

        const imgId = `${isLogo ? "logo_profil" : "ttd_profil"}_${Date.now()}`;
        const newConfig = {
          type: "image",
          column_name: imgId,
          image_name: label,
          data_url: finalDataUrl,
          mime_type: mimeType,
          x: isLogo ? 60 : Math.max(0, Math.round(pdfPreviewSize.width - initialWidth - 60)),
          y: isLogo ? 60 : Math.max(0, Math.round(pdfPreviewSize.height - initialHeight - 60)),
          max_width: Math.round(initialWidth),
          height: Math.round(initialHeight),
          enabled: true,
          page_number: currentPage,
        };

        commitConfigs((prev) => [...prev, newConfig]);
        setActiveColumn(imgId);
        setNotification({
          show: true,
          message: `${label} berhasil ditambahkan ke kanvas.`,
          type: "success",
        });
      };

      img.onerror = () => {
        setNotification({
          show: true,
          message: `Gagal memuat visual ${label}.`,
          type: "error",
        });
      };

      img.src = finalDataUrl;
    } catch (err) {
      console.error("Gagal memasang aset profil:", err);
      setNotification({
        show: true,
        message: `Gagal memasang aset: ${err.message}`,
        type: "error",
      });
    }
  };

  const handleDuplicateElement = (colName) => {
    const source = configsRef.current.find((c) => c.column_name === colName);
    if (!source || (source.static_text === undefined && !source.is_custom_var && source.type !== "image")) return;

    const newId = `${source.type === "image" ? "image" : source.is_custom_var ? "variabel" : "static_text"}_${Date.now()}`;
    const duplicated = {
      ...source,
      column_name: newId,
      ...(source.is_custom_var ? { custom_var_name: newId } : {}),
      x: Math.min(source.x + 16, Math.max(pdfPreviewSize.width - source.max_width, 0)),
      y: Math.min(
        source.y + 16,
        Math.max(
          pdfPreviewSize.height - (source.type === "image" ? source.height : source.font_size * (source.line_height || 1.2)),
          0
        )
      ),
    };

    commitConfigs((prev) => [...prev, duplicated]);
    setActiveColumn(newId);
  };

  const handleHideElement = (colName) => {
    commitConfigs((prev) =>
      prev.map((c) => (c.column_name === colName ? { ...c, enabled: false } : c))
    );
    const remainingActive = configsRef.current.filter((c) => c.enabled && c.column_name !== colName);
    setActiveColumn(remainingActive[0]?.column_name || "");
  };

  const handleRestoreElement = (colName) => {
    commitConfigs((prev) =>
      prev.map((c) => (c.column_name === colName ? { ...c, enabled: true } : c))
    );
    setActiveColumn(colName);
  };

  const updateConfig = (colName, newProps) => {
    if (!historyBurstActiveRef.current) {
      pushHistorySnapshot(configsRef.current);
      historyBurstActiveRef.current = true;
    }
    if (historyBurstTimerRef.current) clearTimeout(historyBurstTimerRef.current);
    historyBurstTimerRef.current = setTimeout(() => {
      historyBurstActiveRef.current = false;
    }, HISTORY_BURST_MS);

    setConfigs((prev) =>
      prev.map((cfg) => (cfg.column_name === colName ? { ...cfg, ...newProps } : cfg))
    );
  };

  const handleNudgeActive = (dx, dy) => {
    const cfg = configsRef.current.find((c) => c.column_name === activeColumn);
    if (!cfg) return;
    const height = cfg.type === "image" ? cfg.height : cfg.font_size * (cfg.line_height || 1.2);
    const nextX = Math.min(Math.max(cfg.x + dx, 0), Math.max(pdfPreviewSize.width - cfg.max_width, 0));
    const nextY = Math.min(Math.max(cfg.y + dy, 0), Math.max(pdfPreviewSize.height - height, 0));
    updateConfig(activeColumn, { x: nextX, y: nextY });
  };

  const handleDrag = (colName, x, y, width) => {
    const snapThreshold = 6;
    const centerX = pdfPreviewSize.width / 2;
    const centerY = pdfPreviewSize.height / 2;

    const elementCenterX = x + width / 2;
    let snappedX = x;
    let snappedY = y;

    let isSnapX = false;
    let isSnapY = false;

    if (Math.abs(elementCenterX - centerX) < snapThreshold) {
      snappedX = centerX - width / 2;
      isSnapX = true;
    }

    if (Math.abs(y - centerY) < snapThreshold) {
      snappedY = centerY;
      isSnapY = true;
    }

    setActiveSnapGuides({ x: isSnapX, y: isSnapY });
    return { x: snappedX, y: snappedY };
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      setNotification({ show: true, message: "Masukkan nama preset.", type: "error" });
      return;
    }

    const newPreset = { id: Date.now(), name: presetName.trim(), configs };
    const updated = [...savedPresets.filter((p) => p.name !== presetName.trim()), newPreset];
    setSavedPresets(updated);
    localStorage.setItem("sertigen_presets", JSON.stringify(updated));
    setPresetName("");
    setNotification({ show: true, message: `Preset "${newPreset.name}" disimpan.`, type: "success" });
  };

  const handleLoadPreset = (presetId) => {
    const target = savedPresets.find((p) => p.id === Number(presetId));
    if (target) {
      pushHistorySnapshot(configsRef.current);
      setConfigs(target.configs);
      if (target.configs.length > 0) setActiveColumn(target.configs[0].column_name);
      setNotification({ show: true, message: `Preset "${target.name}" dimuat.`, type: "success" });
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(configs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `preset_layout_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        const targetConfigs = Array.isArray(imported)
          ? imported
          : Array.isArray(imported.configs)
          ? imported.configs
          : null;

        if (targetConfigs) {
          pushHistorySnapshot(configsRef.current);
          setConfigs(targetConfigs);
          if (targetConfigs.length > 0) setActiveColumn(targetConfigs[0].column_name);
          setNotification({ show: true, message: "Preset JSON berhasil diimpor.", type: "success" });
        }
      } catch (err) {
        setNotification({ show: true, message: "File JSON tidak valid.", type: "error" });
      }
    };
    reader.readAsText(file);
  };

  const renderPreviewText = (cfg) => {
    if (cfg.is_custom_var) {
      const parts = (cfg.custom_var_values || "").split(",").map((s) => s.trim());
      return parts[0] || `[${cfg.custom_var_name || cfg.column_name}]`;
    }

    if (cfg.static_text !== undefined && cfg.static_text !== "") {
      let text = cfg.static_text;

      configs
        .filter((c) => c.enabled && c.is_custom_var)
        .forEach((cVar) => {
          const varKey = cVar.custom_var_name || cVar.column_name;
          const parts = (cVar.custom_var_values || "").split(",").map((s) => s.trim());
          const sampleVal = parts[0] || `[${varKey}]`;
          text = text.replaceAll(`{${varKey}}`, sampleVal);
          text = text.replaceAll(`{${varKey}:uppercase}`, sampleVal.toUpperCase());
        });

      const matches = text.match(/\{([^}]+)\}/g);
      if (matches) {
        matches.forEach((match) => {
          const rawKey = match.replace("{", "").replace("}", "");
          const isUpper = rawKey.endsWith(":uppercase");
          const key = isUpper ? rawKey.replace(":uppercase", "") : rawKey;

          const sampleVal = longestRowSample[key] || match;
          const finalVal = isUpper ? sampleVal.toUpperCase() : sampleVal;
          text = text.replace(match, finalVal);
        });
      }
      return text;
    }

    return longestRowSample[cfg.column_name] || `[Kolom ${cfg.column_name}]`;
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

  const enrichRowsWithCustomVariables = (rows) => {
    const customVarConfigs = configs.filter((c) => c.enabled && c.is_custom_var);
    if (customVarConfigs.length === 0) return rows;

    return rows.map((row, idx) => {
      const cloned = { ...row };
      customVarConfigs.forEach((cVar) => {
        const varKey = cVar.custom_var_name || cVar.column_name;
        const parts = (cVar.custom_var_values || "").split(",").map((s) => s.trim());
        if (parts.length === rows.length) {
          cloned[varKey] = parts[idx] !== undefined ? parts[idx] : parts[0] || "";
        } else {
          cloned[varKey] = parts[0] || "";
        }
      });
      return cloned;
    });
  };

  const bakeImagesIntoPdfTemplate = async (baseFile) => {
    const imageConfigs = configs.filter((c) => c.enabled && c.type === "image" && c.data_url);
    if (imageConfigs.length === 0) {
      const ab = await baseFile.arrayBuffer();
      return new Uint8Array(ab);
    }

    const templateArrayBuffer = await baseFile.arrayBuffer();
    const pdfDocLib = await PDFDocument.load(templateArrayBuffer);

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

    const bakedBytes = await pdfDocLib.save();
    return new Uint8Array(bakedBytes);
  };

  const runPreflightValidation = () => {
    const warnings = [];
    const { rows: selectedRows } = getTargetRows();

    if (selectedRows.length === 0) {
      warnings.push("Rentang baris yang dipilih tidak memuat data yang valid.");
    }

    if (selectedRows.length > 2500 && deviceRamGb <= 4) {
      warnings.push(
        `Anda memproses ${selectedRows.length} baris dengan memori perangkat rendah (~${deviceRamGb} GB). Disarankan menggunakan 'Pilih Rentang' bertahap.`
      );
    }

    configs
      .filter((c) => c.enabled)
      .forEach((cfg) => {
        const targetPage = cfg.page_number || 1;
        if (targetPage > totalPages) {
          const label =
            cfg.type === "image"
              ? `Gambar "${cfg.image_name || cfg.column_name}"`
              : cfg.is_custom_var
              ? `Variabel "${cfg.custom_var_name || cfg.column_name}"`
              : cfg.static_text !== undefined
              ? `Teks statis "${cfg.static_text}"`
              : `Kolom "${cfg.column_name}"`;
          warnings.push(
            `${label} menargetkan Halaman ${targetPage}, tetapi template hanya memiliki ${totalPages} halaman.`
          );
        }

        if (cfg.static_text && cfg.type !== "image") {
          const matches = cfg.static_text.match(/\{([^}]+)\}/g);
          if (matches) {
            matches.forEach((match) => {
              const rawKey = match.replace("{", "").replace("}", "");
              const key = rawKey.endsWith(":uppercase") ? rawKey.replace(":uppercase", "") : rawKey;

              const isCsvHeader = csvHeaders.includes(key);
              const isCustomVar = configs.some(
                (c) => c.enabled && c.is_custom_var && (c.custom_var_name === key || c.column_name === key)
              );

              if (!isCsvHeader && !isCustomVar) {
                warnings.push(`Placeholder "${match}" tidak ditemukan pada CSV ataupun Teks Variabel.`);
              }
            });
          }
        }

        if (!cfg.static_text && !cfg.is_custom_var && cfg.type !== "image" && csvHeaders.includes(cfg.column_name)) {
          let emptyCount = 0;
          selectedRows.forEach((row) => {
            if (!row[cfg.column_name] || String(row[cfg.column_name]).trim() === "") {
              emptyCount++;
            }
          });

          if (emptyCount > 0) {
            warnings.push(`Ditemukan ${emptyCount} baris data kosong di kolom "${cfg.column_name}".`);
          }
        }
      });

    return warnings;
  };

  const buildFormattedConfigs = () =>
    configs
      .filter((c) => c.enabled && c.type !== "image")
      .map((c) => {
        const page = c.page_number || 1;
        const size = pageSizes[page] || pdfPreviewSize;
        const colName = c.is_custom_var ? c.custom_var_name || c.column_name : c.column_name;

        return {
          column_name: colName,
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
      setNotification({ show: true, message: "Unggah template PDF terlebih dahulu.", type: "error" });
      return;
    }

    try {
      setNotification({ show: true, message: "Menyusun pratinjau PDF...", type: "success" });

      const templateUint8 = await bakeImagesIntoPdfTemplate(templateFile);
      const enrichedSample = enrichRowsWithCustomVariables([longestRowSample]);
      const formattedConfigs = buildFormattedConfigs();

      const wasm = await import("@/rust_wasm/pkg/pdf_cert_wasm.js");
      await wasm.default();

      const zipBytes = wasm.generate_certificates_chunk(
        templateUint8,
        enrichedSample,
        formattedConfigs,
        0,
        selectedFontBytes || undefined,
        filenamePattern.trim() || undefined
      );

      // Ekstrak berkas PDF murni tanpa ZIP dan buka langsung di tab baru
      const pdfBytes = extractPdfFromZip(zipBytes);
      openPdfInNewTab(pdfBytes);

      setNotification({ show: true, message: "Pratinjau PDF berhasil dibuka di tab baru.", type: "success" });
    } catch (err) {
      setNotification({ show: true, message: `Gagal pratinjau: ${err.message || String(err)}`, type: "error" });
    }
  };

  const handleStartGenerate = () => {
    const hasCsvData = csvFile || csvRows.length > 0;
    if (!hasCsvData || !templateFile || configs.length === 0) {
      setNotification({ show: true, message: "Unggah CSV, PDF, dan tentukan letak teks.", type: "error" });
      return;
    }

    if (zipGroupingMode === "column" && !selectedZipGroupColumn) {
      setNotification({ show: true, message: "Pilih kolom pengelompokan ZIP terlebih dahulu.", type: "error" });
      return;
    }

    const warnings = runPreflightValidation();
    if (warnings.length > 0) {
      setValidationWarnings(warnings);
      setIsValidationModalOpen(true);
    } else {
      executeBatchRendering();
    }
  };

  const saveZipResult = async (zipBytes, filename, dirHandle = null) => {
    if (dirHandle) {
      try {
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(zipBytes);
        await writable.close();
        return;
      } catch (err) {
        console.warn("Gagal menulis via DirectoryHandle, fallback ke unduhan:", err);
      }
    }

    const blob = new Blob([zipBytes], { type: "application/zip" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  };

  const processBatchWithFreshWorker = (batchItem, templateUint8, formattedConfigs) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL("./pdfWorker.js", import.meta.url));
      const batchTemplateBuffer = templateUint8.slice().buffer;

      worker.postMessage(
        {
          templateUint8: new Uint8Array(batchTemplateBuffer),
          groupName: batchItem.groupName,
          rows: batchItem.rows,
          startOffset: batchItem.startOffset,
          configs: formattedConfigs,
          fontBytes: selectedFontBytes || undefined,
          filenamePattern: filenamePattern.trim() || undefined,
        },
        [batchTemplateBuffer]
      );

      worker.onmessage = (e) => {
        const { type, zipBytes, groupName, processedCount, error } = e.data;
        if (type === "BATCH_COMPLETE") {
          worker.terminate();
          resolve({ zipBytes, groupName, processedCount });
        } else if (type === "ERROR") {
          worker.terminate();
          reject(new Error(error || "Gagal pada Worker"));
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(new Error(err.message || "Worker runtime crash"));
      };
    });
  };

  const executeBatchRendering = async () => {
    setIsValidationModalOpen(false);
    setIsProcessing(true);

    const { rows: selectedRows, offset } = getTargetRows();
    if (selectedRows.length === 0) {
      setNotification({ show: true, message: "Rentang baris tidak memuat data yang valid.", type: "error" });
      setIsProcessing(false);
      return;
    }

    const enrichedRows = enrichRowsWithCustomVariables(selectedRows);
    setProgress({ current: 0, total: enrichedRows.length });

    const CHUNK_LIMIT = Math.max(100, parseInt(maxCertsPerZip, 10) || 1000);

    const batchQueue = [];
    if (zipGroupingMode === "column") {
      const groups = {};
      enrichedRows.forEach((row, idx) => {
        const rawVal = row[selectedZipGroupColumn];
        const groupKey = rawVal && String(rawVal).trim() !== "" ? String(rawVal).trim() : "Lainnya";
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push({ row, globalIndex: offset + idx + 1 });
      });

      Object.entries(groups).forEach(([groupName, items]) => {
        const cleanGroupName = sanitizeName(groupName);
        if (items.length <= CHUNK_LIMIT) {
          batchQueue.push({
            groupName: cleanGroupName,
            rows: items.map((it) => it.row),
            startOffset: items[0].globalIndex - 1,
          });
        } else {
          for (let p = 0; p < items.length; p += CHUNK_LIMIT) {
            const subItems = items.slice(p, p + CHUNK_LIMIT);
            const partIdx = Math.floor(p / CHUNK_LIMIT) + 1;
            batchQueue.push({
              groupName: `${cleanGroupName}_part_${partIdx}`,
              rows: subItems.map((it) => it.row),
              startOffset: subItems[0].globalIndex - 1,
            });
          }
        }
      });
    } else {
      for (let i = 0; i < enrichedRows.length; i += CHUNK_LIMIT) {
        batchQueue.push({
          groupName: `part_${Math.floor(i / CHUNK_LIMIT) + 1}`,
          rows: enrichedRows.slice(i, i + CHUNK_LIMIT),
          startOffset: offset + i,
        });
      }
    }

    let directoryHandle = null;
    if (batchQueue.length > 1 && typeof window !== "undefined" && "showDirectoryPicker" in window) {
      try {
        directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      } catch {
        directoryHandle = null;
      }
    }

    try {
      const templateUint8 = await bakeImagesIntoPdfTemplate(templateFile);
      const formattedConfigs = buildFormattedConfigs();

      let totalProcessed = 0;

      for (let b = 0; b < batchQueue.length; b++) {
        const batchItem = batchQueue[b];

        const { zipBytes, groupName, processedCount } = await processBatchWithFreshWorker(
          batchItem,
          templateUint8,
          formattedConfigs
        );

        totalProcessed += processedCount;
        setProgress({ current: totalProcessed, total: enrichedRows.length });

        const filename = `sertifikat_${groupName}_${Date.now()}.zip`;
        await saveZipResult(zipBytes, filename, directoryHandle);
      }

      setIsProcessing(false);
      setProgress(null);
      setNotification({ show: true, message: "Seluruh berkas ZIP selesai diproses.", type: "success" });
    } catch (error) {
      console.error("Kesalahan batch rendering:", error);
      setNotification({ show: true, message: `Kendala: ${error.message}`, type: "error" });
      setIsProcessing(false);
      setProgress(null);
    }
  };

  if (loading || !user) {
    return (
      <div className={`${sansFont.variable} ${monoFont.variable} flex items-center justify-center min-h-screen bg-[#FFFFFF] font-sans`}>
        <Spinner className="w-6 h-6 text-[#111111]" />
      </div>
    );
  }

  const targetData = getTargetRows();
  const estimatedCertCount = targetData.rows.length;
  const CHUNK_LIMIT_COUNT = Math.max(100, parseInt(maxCertsPerZip, 10) || 1000);
  const estimatedZipParts = estimatedCertCount > 0 ? Math.ceil(estimatedCertCount / CHUNK_LIMIT_COUNT) : 0;
  const estimatedPerFileBytes = templateFile ? templateFile.size : 0;
  const estimatedTotalBytes = estimatedCertCount * estimatedPerFileBytes;
  
  const disabledReasons = [];
  if (!templateFile) disabledReasons.push("Template PDF belum dimuat");
  if (!csvFile && csvRows.length === 0) disabledReasons.push("File CSV peserta belum diunggah");
  if (estimatedCertCount === 0) disabledReasons.push("Rentang baris data peserta kosong (0 berkas)");
  if (zipGroupingMode === "column" && !selectedZipGroupColumn) disabledReasons.push("Kolom pengelompokan ZIP belum dipilih");

  const isGenerateDisabled = disabledReasons.length > 0;
  const previewFontWeight = selectedLocalFontFamily
    ? /bold|black|heavy|semibold/i.test(`${selectedFontStyle} ${selectedLocalFontFamily}`)
      ? 700
      : 400
    : 700;
  const previewFontStyle = /italic|oblique/i.test(`${selectedFontStyle} ${selectedLocalFontFamily}`) ? "italic" : "normal";

  return (
    <div
      className={`${sansFont.variable} ${monoFont.variable} h-screen w-screen flex flex-col overflow-hidden font-sans antialiased bg-[#FFFFFF] text-[#111111] selection:bg-[#111111] selection:text-white`}
      style={{ fontFamily: "var(--font-sans), sans-serif" }}
    >
      <Notification {...notification} />
      <ValidationModal
        isOpen={isValidationModalOpen}
        warnings={validationWarnings}
        onConfirm={executeBatchRendering}
        onCancel={() => setIsValidationModalOpen(false)}
      />

      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* Input Berkas Gambar Tersembunyi */}
      <input
        type="file"
        ref={imageUploadInputRef}
        accept="image/png, image/jpeg, image/jpg"
        onChange={handleAddImageElement}
        className="hidden"
      />

      {/* Input Berkas Font Kustom Tersembunyi */}
      <input
        type="file"
        ref={fontUploadInputRef}
        accept=".ttf,.otf,font/ttf,font/otf"
        onChange={handleUploadCustomFont}
        className="hidden"
      />

      {isRestoreBannerOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="border border-[#E5E7EB] rounded-md max-w-md w-full p-6 space-y-4 bg-[#FFFFFF]">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#F5F5F5] rounded-[4px] text-[#111111] border border-[#E5E7EB] shrink-0">
                <IconFolder className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-tight text-[#111111]">
                  Sesi Tersimpan Ditemukan
                </h3>
                <p className="text-xs mt-0.5 font-mono text-[#6B7280]">
                  {autosaveMeta?.templateName ? `Template: ${autosaveMeta.templateName}` : "Tanpa template"}
                  {autosaveMeta?.csvName ? ` / CSV: ${autosaveMeta.csvName}` : ""}
                  {autosaveMeta?.csvRowCount ? ` (${autosaveMeta.csvRowCount} baris)` : ""}
                </p>
                {autosaveMeta?.savedAt && (
                  <p className="text-[10px] mt-0.5 font-mono text-[#6B7280]">
                    Waktu simpan: {new Date(autosaveMeta.savedAt).toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-[#6B7280] leading-relaxed">
              Pulihkan sesi untuk melanjutkan tata letak sebelumnya, atau mulai baru untuk menghapus riwayat penyimpanan lokal.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E7EB]">
              <button
                onClick={handleDiscardAutosave}
                disabled={isRestoring}
                className="px-3.5 py-1.5 text-xs rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] transition-colors disabled:opacity-40"
              >
                Mulai Baru
              </button>
              <button
                onClick={handleRestoreSession}
                disabled={isRestoring}
                className="px-4 py-1.5 text-xs rounded-[4px] text-white bg-[#111111] hover:bg-[#333333] transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                {isRestoring ? <Spinner className="w-3.5 h-3.5" /> : null}
                {isRestoring ? "Memulihkan..." : "Pulihkan Sesi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER UTAMA */}
      <header className="h-14 border-b border-[#E5E7EB] px-6 flex items-center justify-between shrink-0 z-30 bg-[#FFFFFF]">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-medium tracking-tight text-[#111111] hover:text-[#6B7280] transition-colors"
          >
            SertiGen
          </Link>
          <span className="text-[#E5E7EB]">/</span>
          <span className="text-xs font-mono uppercase text-[#6B7280]">
            {eventId ? "Mode Event Cloud" : "Studio Mandiri"}
          </span>
          {eventId && (
            <>
              <span className="text-[#E5E7EB]">/</span>
              <span className="text-xs font-mono font-medium text-[#111111] bg-[#F5F5F5] px-2 py-0.5 rounded-[2px] border border-[#E5E7EB]">
                {eventData?.namaEvent || eventId}
              </span>
            </>
          )}
          <span className="text-[#E5E7EB]">/</span>
          <span className="text-xs font-mono truncate max-w-xs text-[#6B7280]">
            {templateFile ? templateFile.name : "Tanpa Template"}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {eventId && (
            <button
              type="button"
              onClick={handleSaveToCloud}
              disabled={isCloudSaving}
              className="px-3 py-1.5 text-xs font-mono uppercase rounded-[4px] border border-[#111111] bg-[#111111] text-white hover:bg-[#333333] disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {isCloudSaving ? <Spinner /> : null}
              <span>{isCloudSaving ? cloudSaveStatus || "Menyimpan..." : "Simpan ke Event"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsTutorialOpen(true)}
            className="p-1.5 rounded-[4px] border border-[#E5E7EB] text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F5F5] transition-colors"
            title="Panduan Penggunaan"
            aria-label="Panduan Penggunaan"
          >
            <IconHelp className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleDownloadPreview}
            disabled={isProcessing || !templateFile}
            className="px-3 py-1.5 text-xs font-mono uppercase rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] disabled:opacity-40 transition-colors"
            title="Buka pratinjau PDF di tab baru"
          >
            Pratinjau PDF
          </button>

          <div className="relative group inline-block">
            <button
              type="button"
              onClick={handleStartGenerate}
              disabled={isProcessing || (!csvFile && csvRows.length === 0) || !templateFile || estimatedCertCount === 0}
              className="px-4 py-1.5 text-xs font-mono uppercase rounded-[4px] bg-[#111111] text-white hover:bg-[#333333] disabled:bg-[#F5F5F5] disabled:text-[#B0B6C3] disabled:border-[#E5E7EB] transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Spinner className="w-3.5 h-3.5" />
                  <span>
                    {progress ? `Memproses ${progress.current}/${progress.total}...` : "Memproses..."}
                  </span>
                </>
              ) : (
                <>
                  <IconBolt className="w-3.5 h-3.5" />
                  <span>Cetak ZIP ({estimatedCertCount})</span>
                </>
              )}
            </button>

            {!isProcessing && isGenerateDisabled && (
              <div className="absolute bottom-full right-0 mb-2 w-64 p-3 rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
                <div className="text-[10px] font-mono font-medium text-[#D92D20] uppercase tracking-wider mb-1.5 border-b border-[#E5E7EB] pb-1">
                  Persyaratan Belum Lengkap
                </div>
                <ul className="space-y-1">
                  {disabledReasons.map((reason, idx) => (
                    <li key={idx} className="text-[10px] text-[#6B7280] font-mono flex items-start gap-1.5 leading-snug">
                      <span className="text-[#D92D20]">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Link
            href={eventId ? `/dashboard/events/${eventId}` : "/dashboard"}
            className="px-3 py-1.5 text-xs font-mono uppercase text-[#6B7280] hover:text-[#111111] rounded-[4px] border border-transparent hover:border-[#E5E7EB] transition-colors ml-1"
          >
            {eventId ? "Ke Event" : "Keluar"}
          </Link>
        </div>
      </header>

      {/* STRIP PROGRESS PROSES */}
      {isProcessing && (
        <div className="h-6 border-b border-[#E5E7EB] px-6 flex items-center gap-4 shrink-0 z-20 bg-[#F5F5F5]">
          <div className="flex-1 h-1 bg-[#E5E7EB] overflow-hidden rounded-full">
            <div
              className="h-full bg-[#111111] transition-all duration-150 ease-out"
              style={{
                width: progress && progress.total > 0
                  ? `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%`
                  : "8%",
              }}
            />
          </div>
          <span className="text-[11px] font-mono text-[#111111] tabular-nums shrink-0">
            {progress && progress.total > 0
              ? `${progress.current}/${progress.total} (${Math.min(100, Math.round((progress.current / progress.total) * 100))}%)`
              : "Menyiapkan buffer..."}
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
            { id: "presets", label: "Preset", Icon: IconBookmark },
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
            {/* PANEL: FILES */}
            {activeTab === "files" && (
              <div className="space-y-5">
                <div className="border-b border-[#E5E7EB] pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#111111]">
                    Sumber Data
                  </h2>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    Unggah daftar CSV dan lembar PDF
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
                      className="w-full p-2 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111] focus:outline-none focus:border-[#111111]"
                    >
                      <option value="">Pilih Template Tersedia</option>
                      {BUILT_IN_TEMPLATES.map((tmpl) => (
                        <option key={tmpl.id} value={tmpl.id}>
                          {tmpl.name}
                        </option>
                      ))}
                    </select>

                    {isLoadingBuiltIn && (
                      <p className="text-[10px] font-mono text-[#6B7280] flex items-center gap-1.5">
                        <Spinner /> Memuat berkas template...
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#111111] mb-1.5">
                      Data Peserta (.csv)
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvChange}
                      className="block w-full text-[11px] font-mono rounded-[4px] p-2 border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111] file:mr-3 file:py-1 file:px-2.5 file:rounded-[2px] file:border file:border-[#E5E7EB] file:bg-[#F5F5F5] file:text-[#111111] file:font-mono file:text-[10px] file:uppercase hover:file:bg-[#E5E7EB]"
                    />
                    {csvRows.length > 0 && (
                      <p className="text-[11px] text-[#111111] font-mono mt-2 flex items-center gap-1.5">
                        <IconCheck className="w-3.5 h-3.5 shrink-0" />
                        Terbaca {csvRows.length} baris ({csvHeaders.length} kolom)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#111111] mb-1.5">
                      Template Kustom (.pdf)
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleTemplateChange}
                      className="block w-full text-[11px] font-mono rounded-[4px] p-2 border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111] file:mr-3 file:py-1 file:px-2.5 file:rounded-[2px] file:border file:border-[#E5E7EB] file:bg-[#F5F5F5] file:text-[#111111] file:font-mono file:text-[10px] file:uppercase hover:file:bg-[#E5E7EB]"
                    />
                  </div>
                </div>

                {templateFile && (
                  <div className="border border-[#E5E7EB] rounded-md p-4 space-y-3 bg-[#F5F5F5]">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="uppercase text-[#111111]">Kompresi PDF</span>
                      <span className="text-[11px] text-[#6B7280]">
                        {formatBytes(originalTemplateSize)} ke <strong className="text-[#111111]">{formatBytes(templateFile.size)}</strong>
                      </span>
                    </div>

                    <div className="space-y-3 pt-1">
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-[#6B7280] mb-1">
                          <span>Skala Resample</span>
                          <span>{compressionScale.toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="3"
                          step="0.1"
                          value={compressionScale}
                          onChange={(e) => setCompressionScale(Number(e.target.value))}
                          className="w-full accent-[#111111] h-1 bg-[#E5E7EB] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-[#6B7280] mb-1">
                          <span>Kualitas JPEG</span>
                          <span>{Math.round(compressionQuality * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={compressionQuality}
                          onChange={(e) => setCompressionQuality(Number(e.target.value))}
                          className="w-full accent-[#111111] h-1 bg-[#E5E7EB] cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-2">
                      {[
                        { label: "Ringan", scale: 1.0, quality: 0.6 },
                        { label: "Sedang", scale: 1.5, quality: 0.8 },
                        { label: "Tinggi", scale: 2.0, quality: 0.9 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setCompressionScale(preset.scale);
                            setCompressionQuality(preset.quality);
                          }}
                          className={`py-1 text-[10px] font-mono uppercase rounded-[2px] border transition-colors ${
                            compressionScale === preset.scale && compressionQuality === preset.quality
                              ? "bg-[#111111] text-white border-[#111111]"
                              : "bg-[#FFFFFF] text-[#6B7280] border-[#E5E7EB] hover:text-[#111111]"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleRecompress}
                      disabled={isRecompressing || !originalTemplateRawFile}
                      className="w-full py-1.5 text-xs font-mono uppercase rounded-[4px] border border-[#111111] bg-[#111111] text-white hover:bg-[#333333] transition-colors flex items-center justify-center gap-2 mt-2"
                    >
                      {isRecompressing ? <Spinner /> : "Terapkan Kompresi"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PANEL: ELEMENTS */}
            {activeTab === "elements" && (
              <div className="space-y-5">
                <div className="border-b border-[#E5E7EB] pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#111111]">
                    Elemen Tata Letak
                  </h2>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={!canUndo}
                      title="Urungkan (Ctrl+Z)"
                      className="px-2.5 py-1 text-xs font-mono rounded-[2px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] transition-colors disabled:opacity-30"
                    >
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={!canRedo}
                      title="Ulangi (Ctrl+Shift+Z)"
                      className="px-2.5 py-1 text-xs font-mono rounded-[2px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] transition-colors disabled:opacity-30"
                    >
                      Redo
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleAddStaticText}
                      className="w-full py-1.5 text-[11px] font-mono uppercase rounded-[4px] border border-[#111111] bg-[#111111] text-white hover:bg-[#333333] transition-colors"
                    >
                      + Teks Statis
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomVar}
                      className="w-full py-1.5 text-[11px] font-mono uppercase rounded-[4px] border border-[#111111] bg-[#111111] text-white hover:bg-[#333333] transition-colors"
                    >
                      + Teks Variabel
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => imageUploadInputRef.current?.click()}
                    className="w-full py-1.5 text-[11px] font-mono uppercase rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] transition-colors"
                  >
                    + Unggah Gambar
                  </button>
                </div>

                {/* ASET DARI PROFIL */}
                <div className="border border-[#E5E7EB] rounded-md p-3 space-y-2 bg-[#F5F5F5]">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-mono uppercase text-[#6B7280]">
                      Aset Resmi Profil
                    </label>
                    {orgBranding.namaOrganisasi && (
                      <span className="text-[9px] font-mono text-[#111111] truncate max-w-[130px]">
                        {orgBranding.namaOrganisasi}
                      </span>
                    )}
                  </div>

                  {isLoadingOrgBranding ? (
                    <div className="py-2 flex items-center justify-center gap-1.5 text-xs font-mono text-[#6B7280]">
                      <Spinner />
                      <span>Mengecek profil...</span>
                    </div>
                  ) : orgBranding.logoUrl || orgBranding.capStempelUrl ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={!orgBranding.logoUrl}
                        onClick={() => handleInsertProfileAsset("logo")}
                        className={`p-2 rounded-[4px] border text-left flex flex-col justify-between gap-1.5 transition-all ${
                          !orgBranding.logoUrl
                            ? "opacity-40 cursor-not-allowed border-dashed border-[#E5E7EB]"
                            : "bg-[#FFFFFF] border-[#E5E7EB] hover:border-[#111111]"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-mono uppercase text-[#111111]">
                            {orgBranding.tipeOrganisasi === "personal" ? "Logo Jenama" : "Logo Lembaga"}
                          </span>
                          {orgBranding.logoUrl && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
                          )}
                        </div>
                        <div className="h-8 w-full flex items-center justify-center overflow-hidden">
                          {orgBranding.logoUrl ? (
                            <img
                              src={orgBranding.logoUrl}
                              alt="Logo"
                              className="max-h-full max-w-full object-contain pointer-events-none"
                            />
                          ) : (
                            <span className="text-[9px] font-mono text-[#6B7280]">Kosong</span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-[#111111] text-center w-full">
                          + Pasang Logo
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={!orgBranding.capStempelUrl}
                        onClick={() => handleInsertProfileAsset("stempel")}
                        className={`p-2 rounded-[4px] border text-left flex flex-col justify-between gap-1.5 transition-all ${
                          !orgBranding.capStempelUrl
                            ? "opacity-40 cursor-not-allowed border-dashed border-[#E5E7EB]"
                            : "bg-[#FFFFFF] border-[#E5E7EB] hover:border-[#111111]"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-mono uppercase text-[#111111]">
                            {orgBranding.tipeOrganisasi === "personal" ? "Tanda Tangan" : "Cap Stempel"}
                          </span>
                          {orgBranding.capStempelUrl && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
                          )}
                        </div>
                        <div className="h-8 w-full flex items-center justify-center overflow-hidden">
                          {orgBranding.capStempelUrl ? (
                            <img
                              src={orgBranding.capStempelUrl}
                              alt="Cap/TTD"
                              className="max-h-full max-w-full object-contain pointer-events-none"
                            />
                          ) : (
                            <span className="text-[9px] font-mono text-[#6B7280]">Kosong</span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-[#111111] text-center w-full">
                          + Pasang TTD
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-2 space-y-1">
                      <p className="text-[10px] font-mono text-[#6B7280]">
                        Belum ada logo atau tanda tangan diatur.
                      </p>
                      <Link
                        href="/dashboard/profile"
                        target="_blank"
                        className="text-[10px] font-mono text-[#111111] hover:underline inline-block"
                      >
                        Atur di Profil & Lembaga
                      </Link>
                    </div>
                  )}
                </div>

                {configs.some((c) => !c.enabled) && (
                  <div className="border border-[#E5E7EB] rounded-md p-3 space-y-2 bg-[#F5F5F5]">
                    <label className="block text-[10px] font-mono uppercase text-[#6B7280]">
                      Elemen Non-Aktif ({configs.filter((c) => !c.enabled).length})
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {configs
                        .filter((c) => !c.enabled)
                        .map((cfg) => (
                          <button
                            key={cfg.column_name}
                            type="button"
                            onClick={() => handleRestoreElement(cfg.column_name)}
                            className="px-2 py-0.5 text-[10px] font-mono rounded-[2px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#6B7280] hover:text-[#111111] transition-colors flex items-center gap-1"
                          >
                            <span>+</span>
                            {cfg.type === "image"
                              ? `[IMG] ${cfg.image_name || cfg.column_name}`
                              : cfg.is_custom_var
                              ? `[VAR] ${cfg.custom_var_name || cfg.column_name}`
                              : cfg.static_text !== undefined && cfg.static_text !== ""
                              ? cfg.static_text
                              : cfg.column_name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {configs.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#111111] mb-1.5">
                      Elemen Aktif
                    </label>
                    <select
                      value={activeColumn}
                      onChange={(e) => setActiveColumn(e.target.value)}
                      className="w-full p-2 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111] focus:outline-none focus:border-[#111111]"
                    >
                      {configs.filter((c) => c.enabled).map((c) => (
                        <option key={c.column_name} value={c.column_name}>
                          {c.type === "image"
                            ? `[GAMBAR] ${c.image_name || c.column_name}`
                            : c.is_custom_var
                            ? `[VARIABEL] ${c.custom_var_name || c.column_name}`
                            : c.static_text !== undefined && c.static_text !== ""
                            ? `[STATIS] ${c.static_text}`
                            : `[KOLOM] ${c.column_name}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {configs
                  .filter((c) => c.column_name === activeColumn)
                  .map((cfg) => (
                    <div
                      key={cfg.column_name}
                      className="space-y-4 p-4 rounded-md border border-[#E5E7EB] bg-[#F5F5F5]"
                    >
                      {cfg.type === "image" && (
                        <>
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                              Nama Berkas Gambar
                            </label>
                            <input
                              type="text"
                              disabled
                              value={cfg.image_name || cfg.column_name}
                              className="w-full p-2 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#6B7280] opacity-80"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                                Lebar (pt)
                              </label>
                              <input
                                type="number"
                                value={cfg.max_width}
                                onChange={(e) => updateConfig(cfg.column_name, { max_width: Number(e.target.value) })}
                                className="w-full p-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
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
                                className="w-full p-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {cfg.is_custom_var && (
                        <>
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                              Nama Variabel
                            </label>
                            <input
                              type="text"
                              value={cfg.custom_var_name || ""}
                              onChange={(e) => updateConfig(cfg.column_name, { custom_var_name: e.target.value })}
                              placeholder="contoh: kota"
                              className="w-full p-2 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                              Daftar Nilai (Pisahkan koma)
                            </label>
                            <textarea
                              rows={3}
                              value={cfg.custom_var_values || ""}
                              onChange={(e) => updateConfig(cfg.column_name, { custom_var_values: e.target.value })}
                              placeholder="Jakarta, Surabaya, Bandung..."
                              className="w-full p-2 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                            />
                            <p className="text-[10px] font-mono text-[#6B7280] mt-1">
                              Total: {(cfg.custom_var_values || "").split(",").filter((s) => s.trim().length > 0).length} nilai.
                            </p>
                          </div>
                        </>
                      )}

                      {}
                      {cfg.static_text !== undefined && !cfg.is_custom_var && cfg.type !== "image" && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[10px] font-mono uppercase text-[#6B7280]">
                              Isi Teks Statis
                            </label>
                            <span className="text-[9px] font-mono text-[#6B7280]">
                              (Mendukung Enter / Baris Baru)
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            value={cfg.static_text}
                            onChange={(e) => updateConfig(cfg.column_name, { static_text: e.target.value })}
                            placeholder="Ketik teks... (Tekan Enter untuk membuat baris baru)"
                            className="w-full p-2 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111] leading-relaxed"
                          />
                        </div>
                      )}

                      {totalPages > 1 && (
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                            Target Halaman
                          </label>
                          <select
                            value={cfg.page_number || 1}
                            onChange={(e) => updateConfig(cfg.column_name, { page_number: Number(e.target.value) })}
                            className="w-full p-2 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                          >
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                              <option key={num} value={num}>Halaman {num}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {cfg.type !== "image" && (
                        <>
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                              Perataan Teks
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { id: "left", label: "Kiri" },
                                { id: "center", label: "Tengah" },
                                { id: "right", label: "Kanan" },
                              ].map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => updateConfig(cfg.column_name, { align: item.id })}
                                  className={`py-1 text-[10px] font-mono uppercase rounded-[2px] border transition-colors ${
                                    cfg.align === item.id
                                      ? "bg-[#111111] text-white border-[#111111]"
                                      : "bg-[#FFFFFF] text-[#6B7280] border-[#E5E7EB] hover:text-[#111111]"
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
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
                                className="w-full p-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
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
                                className="w-full p-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                                Line Height
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0.5"
                                max="3.0"
                                value={cfg.line_height !== undefined ? cfg.line_height : 1.2}
                                onChange={(e) => updateConfig(cfg.column_name, { line_height: parseFloat(e.target.value) })}
                                className="w-full p-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                                Letter Spacing (pt)
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                min="-5"
                                max="20"
                                value={cfg.letter_spacing !== undefined ? cfg.letter_spacing : 0}
                                onChange={(e) => updateConfig(cfg.column_name, { letter_spacing: parseFloat(e.target.value) })}
                                className="w-full p-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-mono uppercase text-[#6B7280] mb-1">
                              Warna Tinta
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={cfg.color || "#111111"}
                                onChange={(e) => updateConfig(cfg.column_name, { color: e.target.value })}
                                className="h-7 w-9 p-0.5 bg-transparent border border-[#E5E7EB] rounded-[2px] cursor-pointer"
                              />
                              <span className="text-xs font-mono text-[#111111]">
                                {cfg.color || "#111111"}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateConfig(cfg.column_name, { color: "#111111" })}
                                className="ml-auto px-2 py-0.5 text-[10px] font-mono uppercase rounded-[2px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#6B7280] hover:text-[#111111]"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {(cfg.static_text !== undefined || cfg.is_custom_var || cfg.type === "image") && (
                        <div className="flex items-center gap-2 pt-2 border-t border-[#E5E7EB]">
                          <button
                            type="button"
                            onClick={() => handleDuplicateElement(cfg.column_name)}
                            title="Duplikat (Ctrl+D)"
                            className="flex-1 py-1.5 text-xs font-mono uppercase rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111] hover:bg-[#F5F5F5] transition-colors"
                          >
                            Duplikat
                          </button>
                          <button
                            type="button"
                            onClick={() => handleHideElement(cfg.column_name)}
                            className="flex-1 py-1.5 text-xs font-mono uppercase rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#D92D20] hover:bg-[#FFFFFF] transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* PANEL: FONTS (3 OPSI) */}
            {activeTab === "fonts" && (
              <div className="space-y-6">
                <div className="border-b border-[#E5E7EB] pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#111111]">
                    Tipografi & Font
                  </h2>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    Gunakan koleksi bawaan, unggah berkas font, atau pindai dari sistem.
                  </p>
                </div>

                {/* INDIKATOR STATUS FONT AKTIF */}
                <div className="border border-[#E5E7EB] rounded-md p-3.5 space-y-2 bg-[#F5F5F5]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#6B7280]">
                      Font Kanvas Aktif
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#FFFFFF] border border-[#E5E7EB] text-[#111111]">
                      {selectedLocalFontFamily ? "Kustom" : "Default"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="truncate pr-2">
                      <p className="text-xs font-mono font-medium text-[#111111] truncate">
                        {selectedLocalFontFamily || "Standar (Helvetica-Bold)"}
                      </p>
                      {selectedLocalFontFamily && (
                        <p className="text-[10px] font-mono text-[#6B7280] mt-0.5">
                          {eventId ? "Tersimpan di Cloud Event" : "Aktif pada sesi lokal"}
                        </p>
                      )}
                    </div>

                    {selectedLocalFontFamily && (
                      <button
                        type="button"
                        onClick={handleResetFont}
                        className="px-2 py-1 text-[10px] font-mono uppercase rounded-[2px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#6B7280] hover:text-[#D92D20] transition-colors shrink-0"
                        title="Kembalikan ke font bawaan"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* OPSI 1: FONT KOLEKSI BAWAAN (/public/fonts) */}
                <div className="border border-[#E5E7EB] rounded-md p-3.5 space-y-2.5 bg-[#FFFFFF]">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-mono uppercase text-[#111111] font-medium">
                      1. Font Bawaan SertiGen
                    </label>
                    <span className="text-[9px] font-mono text-[#6B7280] bg-[#F5F5F5] px-1.5 py-0.5 rounded-[2px]">
                      {BUILT_IN_FONTS.length} Pilihan
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">
                    Pilihan font siap pakai dari server tanpa perlu mengunggah berkas.
                  </p>
                  <select
                    value={
                      BUILT_IN_FONTS.some((f) => f.family === selectedLocalFontFamily)
                        ? BUILT_IN_FONTS.find((f) => f.family === selectedLocalFontFamily)?.id
                        : ""
                    }
                    onChange={(e) => handleSelectBuiltInFont(e.target.value)}
                    disabled={isLoadingFontBytes}
                    className="w-full p-2 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111] focus:outline-none focus:border-[#111111]"
                  >
                    <option value="">Pilih Font Bawaan</option>
                    {BUILT_IN_FONTS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* OPSI 2: UNGGAH FONT MANDIRI (.TTF / .OTF) */}
                <div className="border border-[#E5E7EB] rounded-md p-3.5 space-y-2.5 bg-[#FFFFFF]">
                  <label className="block text-[11px] font-mono uppercase text-[#111111] font-medium">
                    2. Unggah Font Kustom
                  </label>
                  <p className="text-[11px] text-[#6B7280] leading-relaxed">
                    Gunakan font jenama sendiri. Mendukung format TrueType (.ttf) dan OpenType (.otf) hingga 15 MB.
                  </p>

                  <button
                    type="button"
                    onClick={() => fontUploadInputRef.current?.click()}
                    disabled={isLoadingFontBytes || isUploadingFontCloud}
                    className="w-full py-2 text-xs font-mono uppercase rounded-[4px] border border-[#111111] bg-[#111111] text-white hover:bg-[#333333] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoadingFontBytes || isUploadingFontCloud ? (
                      <>
                        <Spinner />
                        <span>{isUploadingFontCloud ? "Menyimpan ke Cloud..." : "Membaca Berkas..."}</span>
                      </>
                    ) : (
                      <>
                        <IconType className="w-3.5 h-3.5" />
                        <span>Pilih Berkas Font (.ttf / .otf)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* OPSI 3: DETEKSI FONT LOKAL SISTEM OPERASI */}
                <div className="border border-[#E5E7EB] rounded-md p-3.5 space-y-2.5 bg-[#FFFFFF]">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-mono uppercase text-[#111111] font-medium">
                      3. Pindai Font Sistem Operasi
                    </label>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] border ${
                        localFontApiSupported
                          ? "bg-[#FFFFFF] text-[#111111] border-[#111111]"
                          : "bg-[#FFFFFF] text-[#6B7280] border-[#E5E7EB]"
                      }`}
                    >
                      {localFontApiSupported ? "Didukung" : "Tidak Didukung"}
                    </span>
                  </div>

                  {!localFontApiSupported ? (
                    <p className="text-[11px] text-[#6B7280] leading-relaxed">
                      Fitur pemindaian font OS hanya tersedia pada Chrome / Edge desktop. Gunakan Opsi 1 atau Opsi 2 untuk browser lainnya.
                    </p>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleDetectLocalFonts}
                        disabled={isDetectingFonts}
                        className="w-full py-1.5 text-xs font-mono uppercase rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                      >
                        {isDetectingFonts ? <Spinner /> : "Pindai Font dari Komputer"}
                      </button>

                      {localFontFamilies.length > 0 && (
                        <div className="pt-1">
                          <select
                            value={selectedLocalFontFamily}
                            onChange={(e) => handleSelectLocalFont(e.target.value)}
                            disabled={isLoadingFontBytes}
                            className="w-full p-2 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111] focus:outline-none focus:border-[#111111]"
                          >
                            <option value="">Pilih Font dari Hasil Pindai ({localFontFamilies.length})</option>
                            {localFontFamilies.map((family) => (
                              <option key={family} value={family}>
                                {family}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {fontDetectionError && (
                  <p className="text-xs font-mono text-[#D92D20] p-2.5 rounded-[4px] bg-red-50 border border-red-200 leading-snug">
                    [!] {fontDetectionError}
                  </p>
                )}
              </div>
            )}

            {/* PANEL: PRESETS */}
            {activeTab === "presets" && (
              <div className="space-y-5">
                <div className="border-b border-[#E5E7EB] pb-3">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#111111]">
                    Preset & Ekspor
                  </h2>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    Konfigurasi pola nama berkas dan rentang ekspor
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
                    placeholder="Contoh: {Nama}_{index}"
                    className="w-full p-2 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                  />
                  <p className="text-[10px] font-mono text-[#6B7280] leading-relaxed">
                    Format: {`{index}`}, nama kolom CSV, atau teks variabel.
                  </p>
                </div>

                {/* PENGELOMPOKAN ZIP */}
                <div className="border border-[#E5E7EB] rounded-md p-3 space-y-3 bg-[#F5F5F5]">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase text-[#6B7280]">
                      Pengelompokan Berkas ZIP
                    </label>
                    <span className="text-[9px] font-mono text-[#6B7280]">
                      RAM: ~{deviceRamGb} GB
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setZipGroupingMode("chunk")}
                      className={`py-1 text-[10px] font-mono uppercase rounded-[2px] border transition-colors ${
                        zipGroupingMode === "chunk"
                          ? "bg-[#111111] text-white border-[#111111]"
                          : "bg-[#FFFFFF] text-[#6B7280] border-[#E5E7EB]"
                      }`}
                    >
                      Berdasarkan Jumlah
                    </button>
                    <button
                      type="button"
                      onClick={() => setZipGroupingMode("column")}
                      className={`py-1 text-[10px] font-mono uppercase rounded-[2px] border transition-colors ${
                        zipGroupingMode === "column"
                          ? "bg-[#111111] text-white border-[#111111]"
                          : "bg-[#FFFFFF] text-[#6B7280] border-[#E5E7EB]"
                      }`}
                    >
                      Berdasarkan Kolom
                    </button>
                  </div>

                  {zipGroupingMode === "column" && (
                    <div className="pt-1">
                      <label className="block text-[9px] font-mono uppercase text-[#6B7280] mb-1">
                        Pilih Kolom Pengelompokan
                      </label>
                      <select
                        value={selectedZipGroupColumn}
                        onChange={(e) => setSelectedZipGroupColumn(e.target.value)}
                        className="w-full p-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                      >
                        <option value="">Pilih Kolom</option>
                        {csvHeaders.map((header) => (
                          <option key={header} value={header}>
                            [CSV] {header}
                          </option>
                        ))}
                        {configs
                          .filter((c) => c.enabled && c.is_custom_var)
                          .map((cVar) => {
                            const vName = cVar.custom_var_name || cVar.column_name;
                            return (
                              <option key={vName} value={vName}>
                                [VAR] {vName}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#E5E7EB]">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[9px] font-mono uppercase text-[#6B7280]">
                        Batas per 1 Berkas ZIP
                      </label>
                      <span className="text-[10px] font-mono text-[#111111] font-medium">{maxCertsPerZip} Berkas</span>
                    </div>
                    <select
                      value={maxCertsPerZip}
                      onChange={(e) => setMaxCertsPerZip(Number(e.target.value))}
                      className="w-full p-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                    >
                      <option value={250}>250 Berkas</option>
                      <option value={500}>500 Berkas</option>
                      <option value={1000}>1.000 Berkas</option>
                      <option value={1500}>1.500 Berkas</option>
                    </select>
                  </div>
                </div>

                {csvRows.length > 0 && (
                  <div className="border border-[#E5E7EB] rounded-md p-3 space-y-3 bg-[#F5F5F5]">
                    <label className="text-[10px] font-mono uppercase text-[#6B7280] block">
                      Rentang Baris Data
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSliceMode("all")}
                        className={`py-1 text-[10px] font-mono uppercase rounded-[2px] border transition-colors ${
                          sliceMode === "all"
                            ? "bg-[#111111] text-white border-[#111111]"
                            : "bg-[#FFFFFF] text-[#6B7280] border-[#E5E7EB]"
                        }`}
                      >
                        Semua ({csvRows.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSliceMode("custom")}
                        className={`py-1 text-[10px] font-mono uppercase rounded-[2px] border transition-colors ${
                          sliceMode === "custom"
                            ? "bg-[#111111] text-white border-[#111111]"
                            : "bg-[#FFFFFF] text-[#6B7280] border-[#E5E7EB]"
                        }`}
                      >
                        Pilih Rentang
                      </button>
                    </div>

                    {sliceMode === "custom" && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex-1">
                          <label className="block text-[9px] font-mono uppercase text-[#6B7280]">
                            Mulai
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={csvRows.length}
                            value={sliceStart}
                            onChange={(e) => setSliceStart(Number(e.target.value))}
                            className="w-full p-1.5 text-xs font-mono rounded border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                          />
                        </div>
                        <span className="text-xs font-mono text-[#6B7280] pt-3">-</span>
                        <div className="flex-1">
                          <label className="block text-[9px] font-mono uppercase text-[#6B7280]">
                            Sampai
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={csvRows.length}
                            value={sliceEnd}
                            onChange={(e) => setSliceEnd(Number(e.target.value))}
                            className="w-full p-1.5 text-xs font-mono rounded border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nama Preset..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="w-full p-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                    />
                    <button
                      type="button"
                      onClick={handleSavePreset}
                      className="px-3 py-1.5 text-xs font-mono uppercase rounded-[4px] border border-[#111111] bg-[#111111] text-white hover:bg-[#333333] transition-colors shrink-0"
                    >
                      Simpan
                    </button>
                  </div>

                  {savedPresets.length > 0 && (
                    <select
                      onChange={(e) => handleLoadPreset(e.target.value)}
                      defaultValue=""
                      className="w-full p-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111111]"
                    >
                      <option value="" disabled>Pilih Preset Tersimpan</option>
                      {savedPresets.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="py-1.5 text-xs font-mono uppercase rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] transition-colors"
                    >
                      Ekspor JSON
                    </button>
                    <label className="py-1.5 text-xs font-mono uppercase text-center rounded-[4px] border border-[#E5E7EB] bg-transparent text-[#111111] hover:bg-[#F5F5F5] transition-colors cursor-pointer">
                      Impor JSON
                      <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                    </label>
                  </div>
                </div>

                {csvFile && templateFile && estimatedCertCount > 0 && (
                  <div className="border-t border-[#E5E7EB] pt-4 space-y-3">
                    <label className="block text-[10px] font-mono uppercase text-[#6B7280]">
                      Estimasi Pemrosesan
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="border border-[#E5E7EB] rounded-md p-3 bg-[#F5F5F5]">
                        <div className="text-[10px] text-[#6B7280]">Dokumen</div>
                        <div className="mt-1 text-[#111111] font-medium">
                          {estimatedCertCount.toLocaleString("id-ID")} Berkas
                        </div>
                      </div>
                      <div className="border border-[#E5E7EB] rounded-md p-3 bg-[#F5F5F5]">
                        <div className="text-[10px] text-[#6B7280]">Arsip ZIP</div>
                        <div className="mt-1 text-[#111111] font-medium">
                          {zipGroupingMode === "column" ? "Dinamis" : `${estimatedZipParts} Bagian`}
                        </div>
                      </div>
                      <div className="border border-[#E5E7EB] rounded-md p-3 col-span-2 bg-[#F5F5F5]">
                        <div className="text-[10px] text-[#6B7280]">Ukuran Total</div>
                        <div className="mt-1 text-[#111111] font-medium">{formatBytes(estimatedTotalBytes)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* WORKSPACE CANVAS */}
        <div
          ref={stageScrollRef}
          onWheel={handleStageWheel}
          className="flex-1 p-8 flex flex-col items-center justify-start overflow-auto relative bg-[#F5F5F5]"
        >
          <div className="w-full max-w-4xl flex items-center justify-between mb-4 text-xs font-mono">
            <span className="text-[#6B7280]">
              Kanvas Pratinjau
            </span>
            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <div className="flex items-center gap-1 border border-[#E5E7EB] px-2 py-1 rounded-[4px] bg-[#FFFFFF]">
                  <span className="text-[11px] mr-1 text-[#6B7280]">Halaman:</span>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-1.5 py-0.5 text-xs rounded-[2px] font-mono transition-colors ${
                        currentPage === pageNum
                          ? "bg-[#111111] text-white"
                          : "text-[#6B7280] hover:text-[#111111]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1 border border-[#E5E7EB] px-1.5 py-1 rounded-[4px] bg-[#FFFFFF]">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= ZOOM_MIN}
                  title="Perkecil"
                  className="w-5 h-5 flex items-center justify-center font-mono rounded-[2px] text-[#6B7280] hover:text-[#111111] disabled:opacity-30"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  title="Reset ke 100%"
                  className="px-1.5 h-5 text-xs font-mono text-[#111111] tabular-nums"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= ZOOM_MAX}
                  title="Perbesar"
                  className="w-5 h-5 flex items-center justify-center font-mono rounded-[2px] text-[#6B7280] hover:text-[#111111] disabled:opacity-30"
                >
                  +
                </button>
              </div>
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

              {activeSnapGuides.x && (
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#111111] z-20 pointer-events-none opacity-40" />
              )}
              {activeSnapGuides.y && (
                <div className="absolute left-0 right-0 top-1/2 h-px bg-[#111111] z-20 pointer-events-none opacity-40" />
              )}

              {configs
                .filter((cfg) => cfg.enabled && (cfg.page_number || 1) === currentPage)
                .map((cfg) => {
                  const displayText = renderPreviewText(cfg);
                  const isSelected = activeColumn === cfg.column_name;
                  const isImage = cfg.type === "image";

                  const outlineStyle = isSelected
                    ? "1px solid #111111"
                    : "1px dashed #B0B6C3";

                  const lineHeightVal = cfg.line_height !== undefined ? cfg.line_height : 1.2;
                  const letterSpacingVal = cfg.letter_spacing !== undefined ? `${cfg.letter_spacing}px` : "0px";

                  // Hitung estimasi ketinggian dinamis agar teks yang melipat / enter tidak terpotong
                  let elementHeight = cfg.font_size * lineHeightVal;
                  if (isImage) {
                    elementHeight = cfg.height;
                  } else {
                    const rawLines = String(displayText || "").split("\n");
                    const approxCharWidth = (cfg.font_size || 24) * 0.52;
                    const maxCharsPerLine = Math.max(1, Math.floor((cfg.max_width || 200) / approxCharWidth));
                    
                    let totalVisualLines = 0;
                    rawLines.forEach((line) => {
                      totalVisualLines += Math.max(1, Math.ceil((line.length || 1) / maxCharsPerLine));
                    });
                    
                    elementHeight = Math.max(cfg.font_size * lineHeightVal, totalVisualLines * cfg.font_size * lineHeightVal);
                  }

                  return (
                    <Rnd
                      key={cfg.column_name}
                      bounds="parent"
                      scale={zoomLevel}
                      size={{ width: cfg.max_width, height: elementHeight }}
                      enableResizing={isImage ? true : { left: true, right: true }}
                      position={{ x: cfg.x, y: cfg.y }}
                      onDrag={(e, d) => {
                        const { x, y } = handleDrag(cfg.column_name, d.x, d.y, cfg.max_width);
                        updateConfig(cfg.column_name, { x, y });
                      }}
                      onDragStop={() => setActiveSnapGuides({ x: false, y: false })}
                      onResizeStop={(e, dir, ref, delta, pos) => {
                        const newWidth = parseFloat(ref.style.width);
                        const newHeight = parseFloat(ref.style.height);
                        updateConfig(cfg.column_name, {
                          max_width: newWidth,
                          ...(isImage ? { height: newHeight } : {}),
                          x: pos.x,
                          y: pos.y,
                        });
                        setActiveColumn(cfg.column_name);
                      }}
                      onClick={() => setActiveColumn(cfg.column_name)}
                      className="absolute cursor-move z-10 flex items-start justify-center overflow-visible"
                      style={{
                        outline: outlineStyle,
                        backgroundColor: isSelected ? "rgba(17,17,17,0.03)" : "transparent",
                      }}
                    >
                      {}
                      {isImage ? (
                        <img
                          src={cfg.data_url}
                          alt={cfg.image_name || "logo"}
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
                            letterSpacing: letterSpacingVal,
                            textAlign: cfg.align || "left",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            fontKerning: "none",
                            fontVariantLigatures: "none",
                            color: cfg.color || "#111111",
                            fontWeight: previewFontWeight,
                            fontStyle: previewFontStyle,
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

      {/* FOOTER INFORMASI STATUS */}
      <footer className="h-8 border-t border-[#E5E7EB] px-6 flex items-center justify-between text-xs font-mono shrink-0 z-30 bg-[#FFFFFF] text-[#6B7280]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${csvRows.length > 0 ? "bg-[#111111]" : "bg-[#E5E7EB]"}`} />
            CSV: <strong className="text-[#111111] font-normal">{csvRows.length} Baris</strong>
          </span>
          <span className="text-[#E5E7EB]">/</span>
          <span className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${templateFile ? "bg-[#111111]" : "bg-[#E5E7EB]"}`} />
            Template: <strong className="text-[#111111] font-normal">
              {templateFile ? formatBytes(templateFile.size) : "Belum Dimuat"}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>
            Status: <strong className="text-[#111111] font-normal">
              {isProcessing
                ? (progress && progress.total > 0
                    ? `Memproses ${progress.current}/${progress.total}`
                    : "Memproses...")
                : "Siap"}
            </strong>
          </span>
          <span className="text-[#E5E7EB]">/</span>
          <span>
            Estimasi: <strong className="text-[#111111] font-normal">
              {formatBytes(estimatedTotalBytes)}
            </strong>
          </span>
        </div>
      </footer>
    </div>
  );
}
"use client";
import "es-iterator-helpers/auto";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const DEFAULT_TEXT_COLOR = "#111111";

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

const Notification = ({ message, type, show }) => {
  const isSuccess = type === "success";
  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-[4px] border transition-all duration-150 ${
        show ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"
      } ${
        isSuccess
          ? "bg-[#111111] text-[#FFFFFF] border-[#0000EE]"
          : "bg-[#B3261E] text-[#FFFFFF] border-[#B3261E]"
      }`}
    >
      <span className="font-mono text-[10px] uppercase tracking-wider">
        {isSuccess ? "[ OK ]" : "[ PERINGATAN ]"}
      </span>
      <span className="text-xs font-mono">{message}</span>
    </div>
  );
};

const ValidationModal = ({ isOpen, warnings, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#111111]/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111111] border-2 border-[#E5E7EB] rounded-[4px] max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#B3261E]/20 text-[#B3261E] border border-[#B3261E]/40 rounded-[2px] shrink-0">
            <IconAlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#FFFFFF]">Peringatan Validasi</h3>
            <p className="text-xs text-[#EBE9E4]/60 mt-0.5 font-mono">Ditemukan potensi inkonsistensi sebelum proses cetak</p>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-2 text-xs bg-[#1A1A1A] p-3 rounded-[2px] border border-[#333333] text-[#EBE9E4] font-mono">
          {warnings.map((warn, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-[#B3261E] font-bold">[!]</span>
              <span className="leading-normal">{warn}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#EBE9E4]/70">
          Apakah Anda ingin mengabaikan peringatan ini dan tetap memproses dokumen?
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#333333]">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-mono uppercase font-semibold text-[#EBE9E4] hover:text-[#FFFFFF] bg-[#222222] hover:bg-[#333333] rounded-[4px] transition-colors"
          >
            Batal & Perbaiki
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-mono uppercase font-semibold text-[#FFFFFF] bg-[#B3261E] hover:bg-[#B3261E]/80 rounded-[4px] transition-colors"
          >
            Lanjutkan Cetak
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CetakLokal() {
  const { user, loading } = useAuth();
  const router = useRouter();

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

  const [localFontApiSupported, setLocalFontApiSupported] = useState(false);
  const [isDetectingFonts, setIsDetectingFonts] = useState(false);
  const [localFontsRaw, setLocalFontsRaw] = useState([]);
  const [localFontFamilies, setLocalFontFamilies] = useState([]);
  const [selectedLocalFontFamily, setSelectedLocalFontFamily] = useState("");
  const [selectedFontBytes, setSelectedFontBytes] = useState(null);
  const [selectedFontStyle, setSelectedFontStyle] = useState("");
  const [isLoadingFontBytes, setIsLoadingFontBytes] = useState(false);
  const [fontDetectionError, setFontDetectionError] = useState("");

  useEffect(() => {
    setLocalFontApiSupported(typeof window !== "undefined" && "queryLocalFonts" in window);
  }, []);

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
          message: `Terdeteksi ${uniqueFamilies.length} font lokal.`,
          type: "success",
        });
      }
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        setFontDetectionError("Akses font lokal ditolak oleh browser.");
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
    if (pdfDoc) {
      renderPdfPage(pdfDoc, currentPage);
    }
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    if (loading || !user || hasCheckedAutosaveRef.current) return;
    hasCheckedAutosaveRef.current = true;

    (async () => {
      const meta = await readAutosaveMeta();
      if (meta && (meta.templateName || meta.csvName)) {
        setAutosaveMeta(meta);
        setIsRestoreBannerOpen(true);
      }
    })();
  }, [loading, user]);

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
        if (cfg?.static_text !== undefined) {
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

  const handleCsvChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        setCsvRows(rows);

        if (results.meta && results.meta.fields) {
          const fields = results.meta.fields;
          setCsvHeaders(fields);

          const scannedLongest = scanLongestRowSample(rows, fields);
          setLongestRowSample(scannedLongest);

          const initialConfigs = fields.map((header, idx) => ({
            column_name: header,
            static_text: "",
            x: (pdfPreviewSize.width - 400) / 2,
            y: 150 + idx * 60,
            font_size: 28,
            max_width: 400,
            align: "center",
            enabled: true,
            page_number: 1,
          }));
          setConfigs(initialConfigs);
          if (fields.length > 0) setActiveColumn(fields[0]);
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
            setNotification({ show: true, message: "Autosave data peserta gagal.", type: "error" });
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

  const handleTemplateChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        setNotification({ show: true, message: "Autosave template gagal.", type: "error" });
      }
    } catch (err) {
      console.error("Gagal memuat PDF:", err);
      setNotification({ show: true, message: `Gagal memuat PDF: ${err.message}`, type: "error" });
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
      max_width: 300,
      align: "center",
      enabled: true,
      page_number: currentPage,
    };

    commitConfigs((prev) => [...prev, newConfig]);
    setActiveColumn(staticId);
  };

  const handleDuplicateElement = (colName) => {
    const source = configsRef.current.find((c) => c.column_name === colName);
    if (!source || source.static_text === undefined) return;

    const newId = `static_text_${Date.now()}`;
    const duplicated = {
      ...source,
      column_name: newId,
      x: Math.min(source.x + 16, Math.max(pdfPreviewSize.width - source.max_width, 0)),
      y: Math.min(source.y + 16, Math.max(pdfPreviewSize.height - source.font_size * 1.2, 0)),
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
    const height = cfg.font_size * 1.2;
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
        if (Array.isArray(imported)) {
          pushHistorySnapshot(configsRef.current);
          setConfigs(imported);
          if (imported.length > 0) setActiveColumn(imported[0].column_name);
          setNotification({ show: true, message: "Preset JSON berhasil diimpor.", type: "success" });
        }
      } catch (err) {
        setNotification({ show: true, message: "File JSON tidak valid.", type: "error" });
      }
    };
    reader.readAsText(file);
  };

  const renderPreviewText = (cfg) => {
    if (cfg.static_text !== undefined && cfg.static_text !== "") {
      let text = cfg.static_text;
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

  const runPreflightValidation = () => {
    const warnings = [];

    configs.filter((c) => c.enabled).forEach((cfg) => {
      const targetPage = cfg.page_number || 1;
      if (targetPage > totalPages) {
        const label = cfg.static_text !== undefined
          ? `Teks statis "${cfg.static_text}"`
          : `Kolom "${cfg.column_name}"`;
        warnings.push(
          `${label} menargetkan Halaman ${targetPage}, tetapi template hanya memiliki ${totalPages} halaman.`
        );
      }

      if (cfg.static_text) {
        const matches = cfg.static_text.match(/\{([^}]+)\}/g);
        if (matches) {
          matches.forEach((match) => {
            const rawKey = match.replace("{", "").replace("}", "");
            const key = rawKey.endsWith(":uppercase") ? rawKey.replace(":uppercase", "") : rawKey;

            if (!csvHeaders.includes(key)) {
              warnings.push(`Placeholder "${match}" tidak ditemukan pada CSV.`);
            }
          });
        }
      }

      if (!cfg.static_text && csvHeaders.includes(cfg.column_name)) {
        let emptyCount = 0;
        csvRows.forEach((row) => {
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
      .filter((c) => c.enabled)
      .map((c) => {
        const page = c.page_number || 1;
        const size = pageSizes[page] || pdfPreviewSize;
        return {
          column_name: c.column_name,
          static_text: c.static_text || null,
          x: Number(c.x),
          y: Number(c.y),
          font_size: parseFloat(c.font_size),
          max_width: parseFloat(c.max_width),
          align: c.align || "left",
          page_number: page,
          page_height: size.height,
          color: c.color || DEFAULT_TEXT_COLOR,
        };
      });

  const handleDownloadPreview = async () => {
    if (!templateFile) {
      setNotification({ show: true, message: "Unggah template PDF terlebih dahulu.", type: "error" });
      return;
    }

    try {
      setNotification({ show: true, message: "Menyusun pratinjau...", type: "success" });

      const templateArrayBuffer = await templateFile.arrayBuffer();
      const templateUint8 = new Uint8Array(templateArrayBuffer);
      const sampleCsvRow = [longestRowSample];
      const formattedConfigs = buildFormattedConfigs();

      const wasm = await import("@/rust_wasm/pkg/pdf_cert_wasm.js");
      await wasm.default();

      const zipBytes = wasm.generate_certificates_chunk(
        templateUint8,
        sampleCsvRow,
        formattedConfigs,
        0,
        selectedFontBytes || undefined
      );

      const blob = new Blob([zipBytes], { type: "application/zip" });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `preview_sampel_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setNotification({ show: true, message: "Sampel pratinjau diunduh.", type: "success" });
    } catch (err) {
      setNotification({ show: true, message: `Gagal pratinjau: ${err.message || String(err)}`, type: "error" });
    }
  };

  const handleStartGenerate = () => {
    if (!csvFile || !templateFile || configs.length === 0) {
      setNotification({ show: true, message: "Unggah CSV, PDF, dan atur tata letak.", type: "error" });
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

  const executeBatchRendering = async () => {
    setIsValidationModalOpen(false);
    setIsProcessing(true);
    setProgress({ current: 0, total: csvRows.length });

    try {
      const templateArrayBuffer = await templateFile.arrayBuffer();
      const templateUint8 = new Uint8Array(templateArrayBuffer);
      const formattedConfigs = buildFormattedConfigs();

      const worker = new Worker(new URL("./pdfWorker.js", import.meta.url));

      worker.postMessage(
        {
          templateUint8,
          csvRows,
          configs: formattedConfigs,
          chunkSize: 1000,
          fontBytes: selectedFontBytes || undefined,
        },
        [templateUint8.buffer]
      );

      worker.onmessage = (e) => {
        const { type, zipBytes, part, progress: workerProgress, error } = e.data;

        if (type === "CHUNK_COMPLETE") {
          setProgress(workerProgress);
          const blob = new Blob([zipBytes], { type: "application/zip" });
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = `sertifikat_part_${part}_${Date.now()}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
        }

        if (type === "ALL_COMPLETE") {
          setIsProcessing(false);
          setProgress(null);
          setNotification({ show: true, message: "Proses pencetakan selesai.", type: "success" });
          worker.terminate();
        }

        if (type === "ERROR") {
          setNotification({ show: true, message: `Error Worker: ${error}`, type: "error" });
          setIsProcessing(false);
          setProgress(null);
          worker.terminate();
        }
      };

      worker.onerror = (err) => {
        setNotification({ show: true, message: `Gagal memuat Worker: ${err.message}`, type: "error" });
        setIsProcessing(false);
        setProgress(null);
        worker.terminate();
      };
    } catch (error) {
      setNotification({ show: true, message: `Terjadi kesalahan: ${error.message}`, type: "error" });
      setIsProcessing(false);
      setProgress(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#111111]">
        <Spinner className="w-8 h-8 text-[#0000EE]" />
      </div>
    );
  }

  const GENERATION_CHUNK_SIZE = 1000;
  const estimatedCertCount = csvRows.length;
  const estimatedZipParts = estimatedCertCount > 0 ? Math.ceil(estimatedCertCount / GENERATION_CHUNK_SIZE) : 0;
  const estimatedPerFileBytes = templateFile ? templateFile.size : 0;
  const estimatedTotalBytes = estimatedCertCount * estimatedPerFileBytes;

  const previewFontWeight = selectedLocalFontFamily
    ? (/bold|black|heavy|semibold/i.test(selectedFontStyle) ? 700 : 400)
    : 700;
  const previewFontStyle = /italic|oblique/i.test(selectedFontStyle) ? "italic" : "normal";

  return (
    <div className="h-screen w-screen bg-[#111111] text-[#EBE9E4] flex flex-col overflow-hidden font-sans antialiased selection:bg-[#0000EE] selection:text-white">
      <Notification {...notification} />
      <ValidationModal
        isOpen={isValidationModalOpen}
        warnings={validationWarnings}
        onConfirm={executeBatchRendering}
        onCancel={() => setIsValidationModalOpen(false)}
      />

      {/* BANNER RESTORE SESI TERSIMPAN */}
      {isRestoreBannerOpen && (
        <div className="fixed inset-0 bg-[#111111]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border-2 border-[#E5E7EB] rounded-[4px] max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#0000EE]/10 rounded-[2px] text-[#0000EE] border border-[#0000EE]/30 shrink-0">
                <IconFolder className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#FFFFFF]">Sesi Tersimpan Ditemukan</h3>
                <p className="text-xs text-[#EBE9E4]/60 mt-0.5 font-mono">
                  {autosaveMeta?.templateName ? `Template: ${autosaveMeta.templateName}` : "Tanpa template"}
                  {autosaveMeta?.csvName ? ` • CSV: ${autosaveMeta.csvName}` : ""}
                  {autosaveMeta?.csvRowCount ? ` (${autosaveMeta.csvRowCount} baris)` : ""}
                </p>
                {autosaveMeta?.savedAt && (
                  <p className="text-[10px] text-[#555555] mt-0.5 font-mono">
                    Waktu simpan: {new Date(autosaveMeta.savedAt).toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-[#EBE9E4]/70">
              Pulihkan sesi untuk melanjutkan tata letak sebelumnya, atau mulai baru untuk menghapus riwayat cache.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#333333]">
              <button
                onClick={handleDiscardAutosave}
                disabled={isRestoring}
                className="px-4 py-2 text-xs font-mono uppercase font-semibold text-[#EBE9E4] hover:text-[#FFFFFF] bg-[#222222] hover:bg-[#333333] rounded-[4px] transition-colors disabled:opacity-40"
              >
                Mulai Baru
              </button>
              <button
                onClick={handleRestoreSession}
                disabled={isRestoring}
                className="px-4 py-2 text-xs font-mono uppercase font-semibold text-[#FFFFFF] bg-[#0000EE] hover:bg-[#0000EE]/80 rounded-[4px] transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                {isRestoring ? <Spinner className="w-3.5 h-3.5" /> : null}
                {isRestoring ? "Memulihkan..." : "Pulihkan Sesi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER STUDIO BAR */}
      <header className="h-14 border-b border-[#262626] bg-[#111111] px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-base font-bold uppercase tracking-tight text-[#FFFFFF] hover:text-[#0000EE] transition-colors"
          >
            SERTIGEN.
          </Link>
          <span className="text-[#333333] font-mono">|</span>
          <span className="text-xs font-mono uppercase tracking-wider text-[#555555]">STUDIO ENGINE</span>
          <span className="text-[#333333] font-mono">/</span>
          <span className="text-xs text-[#EBE9E4]/70 font-mono truncate max-w-xs">
            {templateFile ? templateFile.name : "[ TANPA TEMPLATE ]"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPreview}
            disabled={isProcessing || !templateFile}
            className="px-4 py-2 text-xs font-mono uppercase font-semibold text-[#EBE9E4] bg-transparent hover:bg-[#222222] border border-[#444444] rounded-[4px] transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            Pratinjau Sampel
          </button>

          <button
            onClick={handleStartGenerate}
            disabled={isProcessing || !csvFile || !templateFile}
            className="px-5 py-2 text-xs font-mono uppercase font-bold text-[#FFFFFF] bg-[#0000EE] hover:bg-[#0000EE]/90 disabled:bg-[#222222] disabled:text-[#555555] rounded-[4px] transition-colors flex items-center gap-2"
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

          <Link
            href="/dashboard"
            className="px-3 py-2 text-xs font-mono uppercase text-[#555555] hover:text-[#FFFFFF] border border-transparent hover:border-[#333333] rounded-[4px] transition-colors ml-1"
            title="Kembali ke Dashboard"
          >
            Keluar
          </Link>
        </div>
      </header>

      {/* STRIP PROGRESS PROSES CETAK */}
      {isProcessing && (
        <div className="h-7 bg-[#1A1A1A] border-b border-[#262626] px-6 flex items-center gap-4 shrink-0 z-20">
          <div className="flex-1 h-1 bg-[#111111] rounded-none overflow-hidden">
            <div
              className="h-full bg-[#0000EE] transition-[width] duration-150 ease-out"
              style={{
                width: progress && progress.total > 0
                  ? `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%`
                  : "8%",
              }}
            />
          </div>
          <span className="text-xs font-mono text-[#EBE9E4]/80 tabular-nums shrink-0">
            {progress && progress.total > 0
              ? `STATUS: ${progress.current}/${progress.total} (${Math.min(100, Math.round((progress.current / progress.total) * 100))}%)`
              : "MENYIAPKAN BUFFER..."}
          </span>
        </div>
      )}

      {/* STUDIO BODY WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 1. LEFT TOOLBAR DOCK */}
        <aside className="w-14 bg-[#111111] border-r border-[#262626] flex flex-col items-center py-4 gap-3 shrink-0 z-20">
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
                  ? "bg-[#222222] text-[#FFFFFF] border-2 border-[#0000EE]"
                  : "text-[#555555] hover:text-[#EBE9E4] hover:bg-[#1A1A1A]"
              }`}
              title={tab.label}
            >
              <tab.Icon className="w-4 h-4" />
              <span className="text-[8px] font-mono uppercase mt-0.5">{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* 2. CONTEXTUAL INSPECTOR PANEL */}
        <div className="w-80 bg-[#161616] border-r border-[#262626] flex flex-col shrink-0 z-10 overflow-y-auto">
          <div className="p-5 space-y-6">
            
            {/* PANEL: FILES */}
            {activeTab === "files" && (
              <div className="space-y-5">
                <div className="border-b border-[#262626] pb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF] font-mono">[ 01. SUMBER DATA ]</h2>
                  <p className="text-[11px] text-[#555555] font-mono mt-1">Unggah daftar CSV dan lembar PDF</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#EBE9E4]/80 mb-2">
                      Data Peserta (.csv)
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvChange}
                      className="block w-full text-[11px] text-[#555555] font-mono file:mr-3 file:py-1.5 file:px-3 file:rounded-[2px] file:border-0 file:text-[10px] file:font-mono file:uppercase file:bg-[#222222] file:text-[#EBE9E4] hover:file:bg-[#333333] border border-[#262626] rounded-[4px] p-1.5 bg-[#111111]"
                    />
                    {csvRows.length > 0 && (
                      <p className="text-[10px] text-[#0000EE] font-mono mt-2 flex items-center gap-1.5">
                        <IconCheck className="w-3.5 h-3.5 shrink-0" />
                        Terbaca {csvRows.length} baris ({csvHeaders.length} kolom)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#EBE9E4]/80 mb-2">
                      Template Sertifikat (.pdf)
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleTemplateChange}
                      className="block w-full text-[11px] text-[#555555] font-mono file:mr-3 file:py-1.5 file:px-3 file:rounded-[2px] file:border-0 file:text-[10px] file:font-mono file:uppercase file:bg-[#222222] file:text-[#EBE9E4] hover:file:bg-[#333333] border border-[#262626] rounded-[4px] p-1.5 bg-[#111111]"
                    />
                  </div>
                </div>

                {templateFile && (
                  <div className="bg-[#111111] border border-[#262626] rounded-[4px] p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-[#FFFFFF] uppercase">Kompresi PDF</span>
                      <span className="text-[#555555] text-[10px]">
                        {formatBytes(originalTemplateSize)} → <span className="text-[#0000EE]">{formatBytes(templateFile.size)}</span>
                      </span>
                    </div>

                    <div className="space-y-3 pt-1">
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-[#555555] mb-1">
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
                          className="w-full accent-[#0000EE] h-1 bg-[#222222] rounded-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-[#555555] mb-1">
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
                          className="w-full accent-[#0000EE] h-1 bg-[#222222] rounded-none cursor-pointer"
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
                              ? "bg-[#222222] text-[#0000EE] border-[#0000EE]"
                              : "bg-[#161616] text-[#555555] border-[#262626] hover:bg-[#222222]"
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
                      className="w-full py-2 text-xs font-mono uppercase font-semibold text-[#FFFFFF] bg-[#222222] hover:bg-[#333333] disabled:opacity-40 rounded-[4px] border border-[#333333] transition-colors flex items-center justify-center gap-2 mt-2"
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
                <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF] font-mono">[ 02. ELEMEN TEKS ]</h2>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={!canUndo}
                      title="Urungkan (Ctrl+Z)"
                      className="px-2 py-1 text-xs font-mono text-[#EBE9E4] hover:text-white bg-[#111111] hover:bg-[#222222] border border-[#262626] rounded-[2px] transition-colors disabled:opacity-30"
                    >
                      UNDO
                    </button>
                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={!canRedo}
                      title="Ulangi (Ctrl+Shift+Z)"
                      className="px-2 py-1 text-xs font-mono text-[#EBE9E4] hover:text-white bg-[#111111] hover:bg-[#222222] border border-[#262626] rounded-[2px] transition-colors disabled:opacity-30"
                    >
                      REDO
                    </button>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleAddStaticText}
                    className="w-full py-2 text-xs font-mono uppercase font-semibold text-[#FFFFFF] bg-[#222222] hover:bg-[#333333] border border-[#333333] rounded-[4px] transition-colors"
                  >
                    + Tambah Teks Statis
                  </button>
                </div>

                {configs.some((c) => !c.enabled) && (
                  <div className="bg-[#111111] border border-[#262626] rounded-[4px] p-3 space-y-2">
                    <label className="block text-[10px] font-mono uppercase text-[#555555]">
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
                            className="px-2 py-1 text-[10px] font-mono bg-[#222222] text-[#EBE9E4] hover:text-white border border-[#333333] rounded-[2px] transition-colors flex items-center gap-1"
                          >
                            <span>+</span>
                            {cfg.static_text !== undefined && cfg.static_text !== ""
                              ? cfg.static_text
                              : cfg.column_name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {configs.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#EBE9E4]/80 mb-2">Pilih Elemen Aktif</label>
                    <select
                      value={activeColumn}
                      onChange={(e) => setActiveColumn(e.target.value)}
                      className="w-full p-2 text-xs font-mono border border-[#262626] rounded-[4px] bg-[#111111] text-[#FFFFFF]"
                    >
                      {configs.filter((c) => c.enabled).map((c) => (
                        <option key={c.column_name} value={c.column_name}>
                          {c.static_text !== undefined && c.static_text !== ""
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
                    <div key={cfg.column_name} className="space-y-4 bg-[#111111] p-4 rounded-[4px] border border-[#262626]">
                      {cfg.static_text !== undefined && (
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-[#555555] mb-1.5">Isi Teks Statis</label>
                          <input
                            type="text"
                            value={cfg.static_text}
                            onChange={(e) => updateConfig(cfg.column_name, { static_text: e.target.value })}
                            className="w-full p-2 text-xs font-mono border border-[#262626] rounded-[4px] bg-[#161616] text-[#FFFFFF]"
                          />
                        </div>
                      )}

                      {totalPages > 1 && (
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-[#555555] mb-1.5">Target Halaman</label>
                          <select
                            value={cfg.page_number || 1}
                            onChange={(e) => updateConfig(cfg.column_name, { page_number: Number(e.target.value) })}
                            className="w-full p-2 text-xs font-mono border border-[#262626] rounded-[4px] bg-[#161616] text-[#FFFFFF]"
                          >
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                              <option key={num} value={num}>Halaman {num}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#555555] mb-1.5">Perataan Teks</label>
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
                              className={`py-1.5 text-[10px] font-mono uppercase rounded-[2px] border transition-colors ${
                                cfg.align === item.id
                                  ? "bg-[#222222] text-[#0000EE] border-[#0000EE]"
                                  : "bg-[#161616] text-[#555555] border-[#262626] hover:bg-[#222222]"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-[#555555] mb-1.5">Ukuran (pt)</label>
                          <input
                            type="number"
                            value={cfg.font_size}
                            onChange={(e) => updateConfig(cfg.column_name, { font_size: Number(e.target.value) })}
                            className="w-full p-2 text-xs font-mono border border-[#262626] rounded-[4px] bg-[#161616] text-[#FFFFFF]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono uppercase text-[#555555] mb-1.5">Lebar Kotak (pt)</label>
                          <input
                            type="number"
                            value={cfg.max_width}
                            onChange={(e) => updateConfig(cfg.column_name, { max_width: Number(e.target.value) })}
                            className="w-full p-2 text-xs font-mono border border-[#262626] rounded-[4px] bg-[#161616] text-[#FFFFFF]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#555555] mb-1.5">Warna Tinta</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={cfg.color || DEFAULT_TEXT_COLOR}
                            onChange={(e) => updateConfig(cfg.column_name, { color: e.target.value })}
                            className="h-8 w-10 p-0.5 bg-[#161616] border border-[#262626] rounded-[2px] cursor-pointer"
                          />
                          <span className="text-xs font-mono text-[#555555] uppercase">
                            {cfg.color || DEFAULT_TEXT_COLOR}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateConfig(cfg.column_name, { color: DEFAULT_TEXT_COLOR })}
                            className="ml-auto px-2.5 py-1 text-[10px] font-mono uppercase text-[#555555] hover:text-[#FFFFFF] bg-[#161616] border border-[#262626] rounded-[2px] transition-colors"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {cfg.static_text !== undefined && (
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => handleDuplicateElement(cfg.column_name)}
                            title="Duplikat (Ctrl+D)"
                            className="flex-1 py-1.5 text-xs font-mono uppercase text-[#EBE9E4] bg-[#222222] hover:bg-[#333333] border border-[#333333] rounded-[4px] transition-colors"
                          >
                            Duplikat
                          </button>
                          <button
                            type="button"
                            onClick={() => handleHideElement(cfg.column_name)}
                            className="flex-1 py-1.5 text-xs font-mono uppercase text-[#B3261E] bg-[#111111] hover:bg-[#B3261E]/10 border border-[#B3261E]/40 rounded-[4px] transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* PANEL: FONTS */}
            {activeTab === "fonts" && (
              <div className="space-y-5">
                <div className="border-b border-[#262626] pb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF] font-mono">[ 03. FONT SISTEM ]</h2>
                  <p className="text-[11px] text-[#555555] font-mono mt-1">Gunakan font lokal perangkat Anda</p>
                </div>

                <div className="flex items-center justify-between gap-2 bg-[#111111] border border-[#262626] rounded-[4px] p-3">
                  <span className="text-xs font-mono text-[#555555]">Local Font API</span>
                  {localFontApiSupported ? (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-[#0000EE]/10 text-[#0000EE] border border-[#0000EE]/30">
                      Aktif
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-[#222222] text-[#555555] border border-[#333333]">
                      Tidak Didukung
                    </span>
                  )}
                </div>

                {!localFontApiSupported ? (
                  <p className="text-xs font-mono text-[#555555] leading-relaxed">
                    Fitur pemindaian font lokal membutuhkan peramban desktop berbasis Chromium seperti Chrome atau Edge.
                  </p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleDetectLocalFonts}
                      disabled={isDetectingFonts}
                      className="w-full py-2.5 text-xs font-mono uppercase font-semibold text-[#FFFFFF] bg-[#222222] hover:bg-[#333333] border border-[#333333] rounded-[4px] transition-colors flex items-center justify-center gap-2"
                    >
                      {isDetectingFonts ? <Spinner /> : "Pindai Font Lokal"}
                    </button>

                    {fontDetectionError && (
                      <p className="text-xs font-mono text-[#B3261E]">{fontDetectionError}</p>
                    )}

                    {localFontFamilies.length > 0 && (
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-[#EBE9E4]/80 mb-2">
                          Pilih Font ({localFontFamilies.length})
                        </label>
                        <select
                          value={selectedLocalFontFamily}
                          onChange={(e) => handleSelectLocalFont(e.target.value)}
                          disabled={isLoadingFontBytes}
                          className="w-full p-2 text-xs font-mono border border-[#262626] rounded-[4px] bg-[#111111] text-[#FFFFFF]"
                        >
                          <option value="">-- Standar (Helvetica-Bold) --</option>
                          {localFontFamilies.map((family) => (
                            <option key={family} value={family}>{family}</option>
                          ))}
                        </select>

                        {isLoadingFontBytes && (
                          <p className="text-xs font-mono text-[#555555] mt-2 flex items-center gap-2">
                            <Spinner /> Memuat berkas font...
                          </p>
                        )}

                        {selectedFontBytes && !isLoadingFontBytes && (
                          <p className="text-xs font-mono text-[#0000EE] mt-2 flex items-center gap-1.5">
                            <IconCheck className="w-3.5 h-3.5 shrink-0" />
                            "{selectedLocalFontFamily}" siap diterapkan
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* PANEL: PRESETS */}
            {activeTab === "presets" && (
              <div className="space-y-5">
                <div className="border-b border-[#262626] pb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFFFFF] font-mono">[ 04. PRESET LAYOUT ]</h2>
                  <p className="text-[11px] text-[#555555] font-mono mt-1">Ekspor dan impor tata letak koordinat</p>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nama Preset..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="w-full p-2 text-xs font-mono border border-[#262626] rounded-[4px] bg-[#111111] text-[#FFFFFF]"
                    />
                    <button
                      type="button"
                      onClick={handleSavePreset}
                      className="px-4 py-2 text-xs font-mono uppercase font-semibold text-[#FFFFFF] bg-[#0000EE] hover:bg-[#0000EE]/90 rounded-[4px] shrink-0 transition-colors"
                    >
                      Simpan
                    </button>
                  </div>

                  {savedPresets.length > 0 && (
                    <select
                      onChange={(e) => handleLoadPreset(e.target.value)}
                      defaultValue=""
                      className="w-full p-2 text-xs font-mono border border-[#262626] rounded-[4px] bg-[#111111] text-[#FFFFFF]"
                    >
                      <option value="" disabled>-- Muat Preset Tersimpan --</option>
                      {savedPresets.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="py-2 text-xs font-mono uppercase text-[#EBE9E4] bg-[#222222] hover:bg-[#333333] border border-[#333333] rounded-[4px] transition-colors"
                    >
                      Ekspor JSON
                    </button>
                    <label className="py-2 text-xs font-mono uppercase text-center text-[#EBE9E4] bg-[#222222] hover:bg-[#333333] border border-[#333333] rounded-[4px] cursor-pointer transition-colors">
                      Impor JSON
                      <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                    </label>
                  </div>
                </div>

                {csvFile && templateFile && estimatedCertCount > 0 && (
                  <div className="border-t border-[#262626] pt-4 space-y-3">
                    <label className="block text-[10px] font-mono uppercase text-[#555555]">
                      Estimasi Pemrosesan
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-[#111111] border border-[#262626] rounded-[4px] p-3">
                        <div className="text-[10px] text-[#555555]">Dokumen</div>
                        <div className="font-bold text-[#FFFFFF] mt-1">{estimatedCertCount.toLocaleString("id-ID")} Berkas</div>
                      </div>
                      <div className="bg-[#111111] border border-[#262626] rounded-[4px] p-3">
                        <div className="text-[10px] text-[#555555]">Arsip ZIP</div>
                        <div className="font-bold text-[#FFFFFF] mt-1">{estimatedZipParts} Bagian</div>
                      </div>
                      <div className="bg-[#111111] border border-[#262626] rounded-[4px] p-3 col-span-2">
                        <div className="text-[10px] text-[#555555]">Ukuran Total</div>
                        <div className="font-bold text-[#0000EE] mt-1">{formatBytes(estimatedTotalBytes)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. WORKSPACE CANVAS STAGE */}
        <div
          ref={stageScrollRef}
          onWheel={handleStageWheel}
          className="flex-1 bg-[#EBE9E4] p-8 flex flex-col items-center justify-start overflow-auto relative"
        >
          {/* Top Canvas Toolbar */}
          <div className="w-full max-w-4xl flex items-center justify-between mb-4 text-xs font-mono text-[#555555]">
            <span>
              [ KANVAS PRATINJAU INTERAKTIF ]
            </span>
            <div className="flex items-center gap-3">
              {totalPages > 1 && (
                <div className="flex items-center gap-1 bg-[#FFFFFF] border border-[#E5E7EB] px-2 py-1 rounded-[4px]">
                  <span className="text-[11px] mr-1 text-[#555555]">Halaman:</span>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-2 py-0.5 text-xs rounded-[2px] font-mono transition-colors ${
                        currentPage === pageNum ? "bg-[#111111] text-white font-bold" : "text-[#555555] hover:text-[#111111]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
              )}

              {/* Kontrol Zoom */}
              <div className="flex items-center gap-1 bg-[#FFFFFF] border border-[#E5E7EB] px-1.5 py-1 rounded-[4px]">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= ZOOM_MIN}
                  title="Perkecil"
                  className="w-6 h-6 flex items-center justify-center font-mono text-[#111111] hover:bg-[#EBE9E4] rounded-[2px] transition-colors disabled:opacity-30"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  title="Reset ke 100%"
                  className="px-2 h-6 text-xs font-mono font-bold text-[#111111] hover:bg-[#EBE9E4] rounded-[2px] transition-colors tabular-nums"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= ZOOM_MAX}
                  title="Perbesar"
                  className="w-6 h-6 flex items-center justify-center font-mono text-[#111111] hover:bg-[#EBE9E4] rounded-[2px] transition-colors disabled:opacity-30"
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
            {/* Canvas Container */}
            <div
              ref={containerRef}
              className="relative bg-white shadow-2xl rounded-[2px] overflow-hidden shrink-0 border-2 border-[#111111] origin-top-left"
              style={{
                width: pdfPreviewSize.width,
                height: pdfPreviewSize.height,
                transform: `scale(${zoomLevel})`,
              }}
            >
              <canvas ref={canvasRef} className="absolute top-0 left-0 z-0 pointer-events-none" />

              {/* Snap Guides */}
              {activeSnapGuides.x && (
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[#0000EE] z-20 pointer-events-none" />
              )}
              {activeSnapGuides.y && (
                <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-[#0000EE] z-20 pointer-events-none" />
              )}

              {/* Render Dynamic Elements */}
              {configs
                .filter((cfg) => cfg.enabled && (cfg.page_number || 1) === currentPage)
                .map((cfg) => {
                  const displayText = renderPreviewText(cfg);
                  const isSelected = activeColumn === cfg.column_name;
                  const isStatic = cfg.static_text !== undefined;
                  const outlineColor = isSelected ? "#0000EE" : isStatic ? "#555555" : "#111111";
                  const boxBg = isSelected
                    ? "rgba(0,0,238,0.06)"
                    : isStatic
                    ? "rgba(85,85,85,0.04)"
                    : "rgba(17,17,17,0.04)";

                  return (
                    <Rnd
                      key={cfg.column_name}
                      bounds="parent"
                      scale={zoomLevel}
                      size={{ width: cfg.max_width, height: cfg.font_size * 1.2 }}
                      enableResizing={{ left: true, right: true }}
                      position={{ x: cfg.x, y: cfg.y }}
                      onDrag={(e, d) => {
                        const { x, y } = handleDrag(cfg.column_name, d.x, d.y, cfg.max_width);
                        updateConfig(cfg.column_name, { x, y });
                      }}
                      onDragStop={() => setActiveSnapGuides({ x: false, y: false })}
                      onResizeStop={(e, dir, ref, delta, pos) => {
                        updateConfig(cfg.column_name, {
                          max_width: parseFloat(ref.style.width),
                          x: pos.x,
                          y: pos.y,
                        });
                        setActiveColumn(cfg.column_name);
                      }}
                      onClick={() => setActiveColumn(cfg.column_name)}
                      className="absolute cursor-move z-10"
                      style={{ outline: `1.5px dashed ${outlineColor}`, backgroundColor: boxBg }}
                    >
                      <span
                        className="select-none"
                        style={{
                          display: "block",
                          width: "100%",
                          fontSize: `${cfg.font_size}px`,
                          lineHeight: 1.2,
                          textAlign: cfg.align || "left",
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          fontKerning: "none",
                          fontVariantLigatures: "none",
                          color: cfg.color || DEFAULT_TEXT_COLOR,
                          fontWeight: previewFontWeight,
                          fontStyle: previewFontStyle,
                          fontFamily: selectedLocalFontFamily
                            ? `"${selectedLocalFontFamily}", Helvetica, Arial, sans-serif`
                            : 'Helvetica, Arial, "Liberation Sans", sans-serif',
                        }}
                      >
                        {displayText}
                      </span>
                    </Rnd>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER REAL-TIME STATUS BAR */}
      <footer className="h-8 bg-[#111111] border-t border-[#262626] px-6 flex items-center justify-between text-xs font-mono text-[#555555] shrink-0 z-30">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${csvRows.length > 0 ? "bg-[#0000EE]" : "bg-[#333333]"}`} />
            CSV: <strong className="text-[#EBE9E4] font-medium">{csvRows.length} Baris</strong>
          </span>
          <span className="text-[#262626]">|</span>
          <span className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${templateFile ? "bg-[#0000EE]" : "bg-[#333333]"}`} />
            TEMPLATE: <strong className="text-[#EBE9E4] font-medium">{templateFile ? formatBytes(templateFile.size) : "Belum Dimuat"}</strong>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>STATUS WORKER: <strong className={isProcessing ? "text-[#0000EE] font-bold" : "text-[#EBE9E4]"}>
            {isProcessing
              ? (progress && progress.total > 0
                  ? `MEMPROSES ${progress.current}/${progress.total}`
                  : "MEMPROSES...")
              : "SIAP"}
          </strong></span>
          <span className="text-[#262626]">|</span>
          <span>ESTIMASI: <strong className="text-[#EBE9E4]">{formatBytes(estimatedTotalBytes)}</strong></span>
        </div>
      </footer>
    </div>
  );
}
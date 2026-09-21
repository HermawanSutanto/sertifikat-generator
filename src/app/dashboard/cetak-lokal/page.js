"use client";
import "es-iterator-helpers/auto";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import Papa from "papaparse";
import { Rnd } from "react-rnd";
import { PDFDocument } from "pdf-lib";

const DEFAULT_TEXT_COLOR = "#1A1A1A";

const Spinner = ({ className = "w-5 h-5 text-current", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...props}>
    <path fill="currentColor" d="M12,23a9.63,9.63,0,0,1-8-9.5,9.51,9.51,0,0,1,6.79-9.1A1,1,0,0,1,12,5.19a8.4,8.4,0,0,0-6.1,8.31,8.44,8.44,0,0,0,8.38,8.38A1,1,0,0,1,12,23Z">
      <animateTransform attributeName="transform" type="rotate" dur="0.75s" from="0 12 12" to="360 12 12" repeatCount="indefinite" />
    </path>
  </svg>
);

/* Ikon vektor bawaan aplikasi — pengganti emoji sistem, konsisten satu bahasa visual (stroke 1.8–2, viewBox 24x24) */
const IconFolder = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7a1 1 0 011-1h4.4l1.6 1.6H19a1 1 0 011 1V17a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" />
  </svg>
);

const IconEdit = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 20l.9-3.6L15.3 6c.8-.8 2.2-.8 3 0 .8.8.8 2.2 0 3L7.9 19.4 4 20z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.5 7.5l3 3" />
  </svg>
);

const IconType = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 19L9.6 6h.8L15 19M6.6 14.5h6.8" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.5 19v-5.8a2.2 2.2 0 014.5 0V19" />
  </svg>
);

const IconBookmark = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.5 4.5h11a1 1 0 011 1V20l-6.5-3.7L5.5 20V5.5a1 1 0 011-1z" />
  </svg>
);

const IconBolt = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M13 2L4 14h6.2l-1.1 8L20 10h-6.2l-.8-8z" />
  </svg>
);

const IconLightbulb = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 18.5a5 5 0 116 0c-.6.5-1 1.2-1 2v.5h-4v-.5c0-.8-.4-1.5-1-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M10.3 21.5h3.4M12 3v1.4M4.5 6.5l1 1M19.5 6.5l-1 1M3 12h1.4M19.6 12H21" />
  </svg>
);

const IconCheck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

const IconAlertTriangle = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 3.5h.01M10.3 4.3a2 2 0 013.4 0l7.7 12.9a2 2 0 01-1.7 3H4.3a2 2 0 01-1.7-3L10.3 4.3z" />
  </svg>
);

const IconInfo = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <circle cx="12" cy="12" r="9" strokeWidth={1.6} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 11v5.5M12 8v.01" />
  </svg>
);

const Notification = ({ message, type, show }) => {
  const isSuccess = type === "success";
  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-2xl transition-all duration-300 transform ${
        show ? "translate-x-0 opacity-100 scale-100" : "translate-x-10 opacity-0 scale-95"
      } ${isSuccess ? "bg-emerald-600 border border-emerald-500" : "bg-rose-600 border border-rose-500"}`}
    >
      <div className="p-1 rounded-full bg-white/20">
        {isSuccess ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <span className="text-xs font-medium">{message}</span>
    </div>
  );
};

const ValidationModal = ({ isOpen, warnings, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-200">
        <div className="flex items-center gap-3 text-amber-500">
          <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <IconAlertTriangle className="w-6 h-6 shrink-0" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Pre-Flight Validation Warning</h3>
            <p className="text-xs text-slate-400">Pemeriksaan otomatis mendeteksi masalah berikut</p>
          </div>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-2 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-amber-300">
          {warnings.map((warn, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="font-bold text-amber-500 mt-0.5">•</span>
              <span className="leading-relaxed">{warn}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 font-medium">
          Apakah Anda yakin ingin tetap melanjutkan proses pencetakan sertifikat?
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
          >
            Batal & Perbaiki
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#8C2F39] hover:bg-[#742531] rounded-xl shadow-lg transition-all"
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

  // Tab Active State untuk Left Toolbar Dock
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

  // Deteksi & Seleksi Font Lokal
  const [localFontApiSupported, setLocalFontApiSupported] = useState(false);
  const [isDetectingFonts, setIsDetectingFonts] = useState(false);
  const [localFontsRaw, setLocalFontsRaw] = useState([]);
  const [localFontFamilies, setLocalFontFamilies] = useState([]);
  const [selectedLocalFontFamily, setSelectedLocalFontFamily] = useState("");
  const [selectedFontBytes, setSelectedFontBytes] = useState(null);
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
          message: `Ditemukan ${uniqueFamilies.length} font terinstal di perangkat Anda.`,
          type: "success",
        });
      }
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        setFontDetectionError("Akses ke font lokal ditolak. Izinkan lewat pengaturan browser.");
      } else {
        setFontDetectionError(`Gagal mendeteksi font: ${err.message}`);
      }
      console.error("Gagal query local fonts:", err);
    } finally {
      setIsDetectingFonts(false);
    }
  };

  const handleSelectLocalFont = async (family) => {
    setSelectedLocalFontFamily(family);
    setSelectedFontBytes(null);
    setFontDetectionError("");
    if (!family) return;

    setIsLoadingFontBytes(true);
    try {
      const candidates = localFontsRaw.filter((f) => f.family === family);
      const chosen = candidates.find((f) => f.style === "Regular") || candidates[0];
      if (!chosen) throw new Error("Font tidak ditemukan di hasil deteksi.");

      const blob = await chosen.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const fontFace = new FontFace(family, arrayBuffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      setSelectedFontBytes(bytes);
    } catch (err) {
      setFontDetectionError(`Gagal memuat data font "${family}": ${err.message}`);
      setSelectedLocalFontFamily("");
    } finally {
      setIsLoadingFontBytes(false);
    }
  };

  // PDF Preview & Multi-Page States
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

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  const [validationWarnings, setValidationWarnings] = useState([]);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => setNotification((n) => ({ ...n, show: false })), 4000);
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
        console.error("Gagal membaca presets:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (pdfDoc) {
      renderPdfPage(pdfDoc, currentPage);
    }
  }, [pdfDoc, currentPage]);

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, idx);
    return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
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
      },
      error: (err) => {
        setNotification({ show: true, message: `Gagal membaca CSV: ${err.message}`, type: "error" });
      }
    });
  };

  const renderPdfPage = async (pdf, pageNum) => {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      setPdfPreviewSize({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
      }
    } catch (err) {
      console.error("Gagal merender halaman PDF:", err);
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

      await renderPdfPage(pdf, 1);
    } catch (err) {
      console.error("Gagal memuat preview PDF:", err);
      setNotification({ show: true, message: `Gagal memuat preview PDF: ${err.message}`, type: "error" });
    }
  };

  const handleRecompress = async () => {
    if (!originalTemplateRawFile) {
      setNotification({ show: true, message: "Unggah template PDF terlebih dahulu.", type: "error" });
      return;
    }

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
        message: `Template dikompres ulang: ${formatBytes(recompressedFile.size)} (dari ${formatBytes(originalTemplateSize)} asli)`,
        type: "success",
      });
    } catch (err) {
      console.error("Gagal mengompres ulang template:", err);
      setNotification({ show: true, message: `Gagal mengompres ulang template: ${err.message}`, type: "error" });
    } finally {
      setIsRecompressing(false);
    }
  };

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

    setConfigs((prev) => [...prev, newConfig]);
    setActiveColumn(staticId);
  };

  const handleHideElement = (colName) => {
    setConfigs((prev) =>
      prev.map((c) => (c.column_name === colName ? { ...c, enabled: false } : c))
    );
    const remainingActive = configs.filter((c) => c.enabled && c.column_name !== colName);
    setActiveColumn(remainingActive[0]?.column_name || "");
  };

  const handleRestoreElement = (colName) => {
    setConfigs((prev) =>
      prev.map((c) => (c.column_name === colName ? { ...c, enabled: true } : c))
    );
    setActiveColumn(colName);
  };

  const updateConfig = (colName, newProps) => {
    setConfigs((prev) =>
      prev.map((cfg) => (cfg.column_name === colName ? { ...cfg, ...newProps } : cfg))
    );
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
      setNotification({ show: true, message: "Masukkan nama preset terlebih dahulu.", type: "error" });
      return;
    }

    const newPreset = {
      id: Date.now(),
      name: presetName.trim(),
      configs,
    };

    const updated = [...savedPresets.filter((p) => p.name !== presetName.trim()), newPreset];
    setSavedPresets(updated);
    localStorage.setItem("sertigen_presets", JSON.stringify(updated));
    setPresetName("");
    setNotification({ show: true, message: `Preset "${newPreset.name}" berhasil disimpan!`, type: "success" });
  };

  const handleLoadPreset = (presetId) => {
    const target = savedPresets.find((p) => p.id === Number(presetId));
    if (target) {
      setConfigs(target.configs);
      if (target.configs.length > 0) setActiveColumn(target.configs[0].column_name);
      setNotification({ show: true, message: `Preset "${target.name}" dimuat!`, type: "success" });
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
          setConfigs(imported);
          if (imported.length > 0) setActiveColumn(imported[0].column_name);
          setNotification({ show: true, message: "Preset JSON berhasil diimpor!", type: "success" });
        }
      } catch (err) {
        setNotification({ show: true, message: "File JSON preset tidak valid.", type: "error" });
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
      if (cfg.static_text) {
        const matches = cfg.static_text.match(/\{([^}]+)\}/g);
        if (matches) {
          matches.forEach((match) => {
            const rawKey = match.replace("{", "").replace("}", "");
            const key = rawKey.endsWith(":uppercase") ? rawKey.replace(":uppercase", "") : rawKey;

            if (!csvHeaders.includes(key)) {
              warnings.push(
                `Placeholder "${match}" di Teks Statis tidak ditemukan pada header CSV. (Headers CSV: ${csvHeaders.join(", ")})`
              );
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
          warnings.push(`Terdapat ${emptyCount} baris data kosong di kolom "${cfg.column_name}".`);
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
      setNotification({
        show: true,
        message: "Harap unggah template PDF terlebih dahulu.",
        type: "error",
      });
      return;
    }

    try {
      setNotification({
        show: true,
        message: "Menyusun sertifikat preview...",
        type: "success",
      });

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
      link.download = `preview_sertifikat_sampel_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setNotification({
        show: true,
        message: "Berhasil mengunduh sampel preview sertifikat!",
        type: "success",
      });
    } catch (err) {
      console.error("Gagal mendownload preview:", err);
      setNotification({
        show: true,
        message: `Gagal mendownload preview: ${err.message || String(err)}`,
        type: "error",
      });
    }
  };

  const handleStartGenerate = () => {
    if (!csvFile || !templateFile || configs.length === 0) {
      setNotification({ show: true, message: "Harap unggah CSV, template PDF, dan atur tata letak terlebih dahulu.", type: "error" });
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

      worker.postMessage({
        templateUint8,
        csvRows,
        configs: formattedConfigs,
        chunkSize: 1000,
        fontBytes: selectedFontBytes || undefined,
      });

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
          setNotification({ show: true, message: `Berhasil mencetak seluruh sertifikat!`, type: "success" });
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
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <Spinner className="w-10 h-10 text-rose-500" />
      </div>
    );
  }

  const GENERATION_CHUNK_SIZE = 1000;
  const estimatedCertCount = csvRows.length;
  const estimatedZipParts = estimatedCertCount > 0 ? Math.ceil(estimatedCertCount / GENERATION_CHUNK_SIZE) : 0;
  const estimatedPerFileBytes = templateFile ? templateFile.size : 0;
  const estimatedTotalBytes = estimatedCertCount * estimatedPerFileBytes;

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans antialiased">
      <Notification {...notification} />
      <ValidationModal
        isOpen={isValidationModalOpen}
        warnings={validationWarnings}
        onConfirm={executeBatchRendering}
        onCancel={() => setIsValidationModalOpen(false)}
      />

      {/* TOP HEADER STUDIO BAR */}
      <header className="h-14 bg-slate-900 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#8C2F39] to-rose-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
            S
          </div>
          <span className="text-sm font-bold tracking-wide text-white">SertiGen Studio</span>
          <span className="text-slate-700">|</span>
          <span className="text-xs text-slate-400 font-medium">
            {templateFile ? templateFile.name : "Belum ada template diunggah"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPreview}
            disabled={isProcessing || !templateFile}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Pratinjau 1 PDF
          </button>

          <button
            onClick={handleStartGenerate}
            disabled={isProcessing || !csvFile || !templateFile}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#8C2F39] hover:bg-[#742531] disabled:bg-slate-800 disabled:text-slate-500 rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            {isProcessing ? (
              <>
                <Spinner className="w-3.5 h-3.5" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <IconBolt className="w-3.5 h-3.5" />
                <span>Generate ZIP ({estimatedCertCount})</span>
              </>
            )}
          </button>

          <Link
            href="/dashboard"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all ml-2"
            title="Keluar ke Dashboard"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </Link>
        </div>
      </header>

      {/* STUDIO BODY WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 1. LEFT TOOLBAR DOCK (Ikon Akses Cepat) */}
        <aside className="w-14 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-3 gap-3 shrink-0 z-20">
          {[
            { id: "files", label: "Files", Icon: IconFolder },
            { id: "elements", label: "Elements", Icon: IconEdit },
            { id: "fonts", label: "Fonts", Icon: IconType },
            { id: "presets", label: "Presets", Icon: IconBookmark },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all ${
                activeTab === tab.id
                  ? "bg-[#8C2F39] text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
              title={tab.label}
            >
              <tab.Icon className="w-4 h-4" />
              <span className="text-[9px] font-semibold mt-0.5">{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* 2. CONTEXTUAL INSPECTOR PANEL (Sidebar Kiri) */}
        <div className="w-80 bg-slate-900/90 border-r border-slate-800/80 flex flex-col shrink-0 z-10 overflow-y-auto">
          <div className="p-4 space-y-5">
            
            {/* PANEL: FILES */}
            {activeTab === "files" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="border-b border-slate-800 pb-2">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Data & Template</h2>
                  <p className="text-[11px] text-slate-400">Unggah sumber file CSV dan PDF</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">CSV Peserta</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvChange}
                      className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 border border-slate-800 rounded-xl p-1 bg-slate-950"
                    />
                    {csvRows.length > 0 && (
                      <p className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                        <IconCheck className="w-3 h-3 shrink-0" />
                        {csvRows.length} baris ({csvHeaders.length} kolom) siap diproses
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Template PDF</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleTemplateChange}
                      className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 border border-slate-800 rounded-xl p-1 bg-slate-950"
                    />
                  </div>
                </div>

                {templateFile && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Kompresi PDF</span>
                      <span className="text-[10px] text-slate-400">
                        {formatBytes(originalTemplateSize)} → <span className="font-bold text-rose-400">{formatBytes(templateFile.size)}</span>
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                          <span>Resolusi (≈{Math.round(compressionScale * 100)} DPI)</span>
                          <span>{compressionScale.toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="3"
                          step="0.1"
                          value={compressionScale}
                          onChange={(e) => setCompressionScale(Number(e.target.value))}
                          className="w-full accent-[#8C2F39]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
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
                          className="w-full accent-[#8C2F39]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: "Hemat", scale: 1.0, quality: 0.6 },
                        { label: "Seimbang", scale: 1.5, quality: 0.8 },
                        { label: "Tajam", scale: 2.0, quality: 0.9 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setCompressionScale(preset.scale);
                            setCompressionQuality(preset.quality);
                          }}
                          className={`py-1 text-[10px] font-semibold rounded-lg border transition-all ${
                            compressionScale === preset.scale && compressionQuality === preset.quality
                              ? "bg-[#8C2F39] text-white border-[#8C2F39]"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
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
                      className="w-full py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      {isRecompressing ? (
                        <>
                          <Spinner className="w-3.5 h-3.5" />
                          Mengompres Ulang...
                        </>
                      ) : (
                        "Terapkan Kompresi"
                      )}
                    </button>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Ubah preset atau geser slider, lalu tekan "Terapkan Kompresi" untuk memperbarui ukuran file dan estimasi hasil ekspor.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PANEL: ELEMENTS */}
            {activeTab === "elements" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Tata Letak Elemen</h2>
                  <button
                    type="button"
                    onClick={handleAddStaticText}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all"
                  >
                    + Teks Statis
                  </button>
                </div>

                {configs.some((c) => !c.enabled) && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5 space-y-2">
                    <label className="block text-[11px] font-bold text-amber-400">
                      Elemen Disembunyikan ({configs.filter((c) => !c.enabled).length})
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {configs
                        .filter((c) => !c.enabled)
                        .map((cfg) => (
                          <button
                            key={cfg.column_name}
                            type="button"
                            onClick={() => handleRestoreElement(cfg.column_name)}
                            className="px-2 py-1 text-[11px] font-semibold bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center gap-1 transition-all"
                          >
                            <span className="text-amber-400">+</span>
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
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Pilih Elemen Aktif</label>
                    <select
                      value={activeColumn}
                      onChange={(e) => setActiveColumn(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-800 rounded-xl bg-slate-950 text-slate-200 font-medium"
                    >
                      {configs.filter((c) => c.enabled).map((c) => (
                        <option key={c.column_name} value={c.column_name}>
                          {c.static_text !== undefined && c.static_text !== ""
                            ? `[Teks Statis] ${c.static_text}`
                            : `[CSV] Kolom: ${c.column_name}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Form Editor Elemen Aktif */}
                {configs
                  .filter((c) => c.column_name === activeColumn)
                  .map((cfg) => (
                    <div key={cfg.column_name} className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      {cfg.static_text !== undefined && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Isi Teks Statis</label>
                          <input
                            type="text"
                            value={cfg.static_text}
                            onChange={(e) => updateConfig(cfg.column_name, { static_text: e.target.value })}
                            className="w-full p-2 text-xs border border-slate-800 rounded-lg bg-slate-900 text-white"
                          />
                        </div>
                      )}

                      {totalPages > 1 && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Halaman Target</label>
                          <select
                            value={cfg.page_number || 1}
                            onChange={(e) => updateConfig(cfg.column_name, { page_number: Number(e.target.value) })}
                            className="w-full p-2 text-xs border border-slate-800 rounded-xl bg-slate-950 text-slate-200"
                          >
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                              <option key={num} value={num}>Halaman {num}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Perataan Teks</label>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { id: "left", label: "Kiri" },
                            { id: "center", label: "Tengah" },
                            { id: "right", label: "Kanan" },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => updateConfig(cfg.column_name, { align: item.id })}
                              className={`py-1 text-xs font-semibold rounded-lg border transition-all ${
                                cfg.align === item.id
                                  ? "bg-[#8C2F39] text-white border-[#8C2F39]"
                                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Ukuran (pt)</label>
                          <input
                            type="number"
                            value={cfg.font_size}
                            onChange={(e) => updateConfig(cfg.column_name, { font_size: Number(e.target.value) })}
                            className="w-full p-1.5 text-xs border border-slate-800 rounded-lg bg-slate-900 text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Lebar (pt)</label>
                          <input
                            type="number"
                            value={cfg.max_width}
                            onChange={(e) => updateConfig(cfg.column_name, { max_width: Number(e.target.value) })}
                            className="w-full p-1.5 text-xs border border-slate-800 rounded-lg bg-slate-900 text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Warna Teks</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={cfg.color || DEFAULT_TEXT_COLOR}
                            onChange={(e) => updateConfig(cfg.column_name, { color: e.target.value })}
                            className="h-8 w-10 p-0.5 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer"
                          />
                          <span className="text-xs font-mono text-slate-400 uppercase">
                            {cfg.color || DEFAULT_TEXT_COLOR}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateConfig(cfg.column_name, { color: DEFAULT_TEXT_COLOR })}
                            className="ml-auto px-2 py-1 text-[10px] font-semibold text-slate-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-all"
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const picked = cfg.color || DEFAULT_TEXT_COLOR;
                              setConfigs((prev) => prev.map((c) => ({ ...c, color: picked })));
                            }}
                            className="px-2 py-1 text-[10px] font-semibold text-[#e8a0a8] bg-[#8C2F39]/10 hover:bg-[#8C2F39]/20 border border-[#8C2F39]/20 rounded-lg transition-all"
                          >
                            Samakan Semua
                          </button>
                        </div>
                      </div>

                      {cfg.static_text !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleHideElement(cfg.column_name)}
                          className="w-full py-1 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 border border-rose-900/50 rounded-lg transition-all"
                        >
                          Hapus Elemen
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* PANEL: FONTS */}
            {activeTab === "fonts" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="border-b border-slate-800 pb-2">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Font Perangkat</h2>
                  <p className="text-[11px] text-slate-400">Deteksi & terapkan font lokal</p>
                </div>

                <div className="flex items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                  <span className="text-[11px] font-medium text-slate-300">Local Font Access API</span>
                  {localFontApiSupported ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                      Didukung
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold border border-slate-700">
                      Tidak Didukung
                    </span>
                  )}
                </div>

                {!localFontApiSupported ? (
                  <p className="text-[11px] text-slate-400 flex items-start gap-1.5 leading-relaxed">
                    <IconInfo className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
                    Fitur ini hanya tersedia di Chrome/Edge desktop. Sertifikat akan tetap dicetak memakai font bawaan Helvetica-Bold.
                  </p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleDetectLocalFonts}
                      disabled={isDetectingFonts}
                      className="w-full py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      {isDetectingFonts ? (
                        <>
                          <Spinner className="w-3.5 h-3.5" />
                          Memindai Font...
                        </>
                      ) : (
                        "Pindai Font Sistem"
                      )}
                    </button>

                    {fontDetectionError && (
                      <p className="text-[11px] text-rose-400 flex items-start gap-1.5 leading-relaxed">
                        <IconAlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        {fontDetectionError}
                      </p>
                    )}

                    {localFontFamilies.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Pilih Font ({localFontFamilies.length} ditemukan)
                        </label>
                        <select
                          value={selectedLocalFontFamily}
                          onChange={(e) => handleSelectLocalFont(e.target.value)}
                          disabled={isLoadingFontBytes}
                          className="w-full p-2 text-xs border border-slate-800 rounded-xl bg-slate-950 text-slate-200"
                        >
                          <option value="">-- Bawaan (Helvetica-Bold) --</option>
                          {localFontFamilies.map((family) => (
                            <option key={family} value={family}>
                              {family}
                            </option>
                          ))}
                        </select>

                        {isLoadingFontBytes && (
                          <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                            <Spinner className="w-3 h-3" />
                            Memuat data font...
                          </p>
                        )}

                        {selectedFontBytes && !isLoadingFontBytes && (
                          <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1.5">
                            <IconCheck className="w-3 h-3 shrink-0" />
                            "{selectedLocalFontFamily}" siap dipakai ({formatBytes(selectedFontBytes.length)})
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
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="border-b border-slate-800 pb-2">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Preset Layout</h2>
                  <p className="text-[11px] text-slate-400">Simpan atau impor konfigurasi</p>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nama Preset..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="w-full p-1.5 text-xs border border-slate-800 rounded-lg bg-slate-950 text-white"
                    />
                    <button
                      type="button"
                      onClick={handleSavePreset}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shrink-0"
                    >
                      Simpan
                    </button>
                  </div>

                  {savedPresets.length > 0 && (
                    <select
                      onChange={(e) => handleLoadPreset(e.target.value)}
                      defaultValue=""
                      className="w-full p-2 text-xs border border-slate-800 rounded-xl bg-slate-950 text-slate-200"
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
                      className="py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
                    >
                      Export JSON
                    </button>
                    <label className="py-1.5 text-xs font-semibold text-center text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer">
                      Import JSON
                      <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                    </label>
                  </div>
                </div>

                {csvFile && templateFile && estimatedCertCount > 0 && (
                  <div className="border-t border-slate-800 pt-3.5 space-y-2">
                    <label className="block text-xs font-bold text-white uppercase tracking-wider">
                      Ringkasan Sebelum Cetak
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide">Sertifikat</div>
                        <div className="text-sm font-bold text-white">{estimatedCertCount.toLocaleString("id-ID")}</div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide">File ZIP</div>
                        <div className="text-sm font-bold text-white">{estimatedZipParts} bagian</div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide">Per Berkas</div>
                        <div className="text-sm font-bold text-white">{formatBytes(estimatedPerFileBytes)}</div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide">Estimasi Total</div>
                        <div className="text-sm font-bold text-rose-400">{formatBytes(estimatedTotalBytes)}</div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Dihitung dari ukuran template terkompresi × jumlah baris CSV. Ukuran akhir bisa sedikit berbeda tergantung panjang teks tiap sertifikat.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. DARK WORKSPACE STAGE (Canvas Area Utama) */}
        <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-start overflow-auto relative">
          
          {/* Header Bar Canvas */}
          <div className="w-full max-w-5xl flex items-center justify-between mb-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <IconLightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Tarik kotak teks di atas canvas untuk menyesuaikan posisi
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
                <span>Halaman:</span>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-2 py-0.5 font-bold rounded ${
                      currentPage === pageNum ? "bg-[#8C2F39] text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Canvas Container */}
          <div
            ref={containerRef}
            className="relative bg-white shadow-2xl rounded-xs overflow-hidden shrink-0 border border-slate-800"
            style={{ width: pdfPreviewSize.width, height: pdfPreviewSize.height }}
          >
            <canvas ref={canvasRef} className="absolute top-0 left-0 z-0 pointer-events-none" />

            {/* Snap Guides */}
            {activeSnapGuides.x && (
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-rose-500 border-r border-dashed border-rose-500 z-20 pointer-events-none" />
            )}
            {activeSnapGuides.y && (
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-rose-500 border-b border-dashed border-rose-500 z-20 pointer-events-none" />
            )}

            {/* Elements */}
            {configs
              .filter((cfg) => cfg.enabled && (cfg.page_number || 1) === currentPage)
              .map((cfg) => {
                const displayText = renderPreviewText(cfg);
                const isSelected = activeColumn === cfg.column_name;
                const isStatic = cfg.static_text !== undefined;
                const outlineColor = isSelected ? "#8C2F39" : isStatic ? "#10b981" : "#3b82f6";
                const boxBg = isSelected
                  ? "rgba(140,47,57,0.15)"
                  : isStatic
                  ? "rgba(16,185,129,0.10)"
                  : "rgba(59,130,246,0.10)";

                return (
                  <Rnd
                    key={cfg.column_name}
                    bounds="parent"
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
                    style={{ outline: `2px dashed ${outlineColor}`, backgroundColor: boxBg }}
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
                        fontWeight: selectedLocalFontFamily ? 400 : 700,
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

      {/* FOOTER REAL-TIME STATUS BAR */}
      <footer className="h-8 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between text-[11px] text-slate-400 shrink-0 z-30">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${csvRows.length > 0 ? "bg-emerald-500" : "bg-slate-600"}`} />
            CSV: <strong className="text-slate-200">{csvRows.length} Baris</strong>
          </span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${templateFile ? "bg-emerald-500" : "bg-slate-600"}`} />
            Template: <strong className="text-slate-200">{templateFile ? formatBytes(templateFile.size) : "Kosong"}</strong>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>Worker Engine: <strong className="text-emerald-400">Ready</strong></span>
          <span className="text-slate-700">|</span>
          <span>Estimasi ZIP: <strong className="text-rose-400">≈ {formatBytes(estimatedTotalBytes)}</strong></span>
        </div>
      </footer>
    </div>
  );
}
"use client";
import "es-iterator-helpers/auto";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import Papa from "papaparse";
import { Rnd } from "react-rnd";
import { PDFDocument } from "pdf-lib";

const Spinner = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {...props}>
    <path fill="currentColor" d="M12,23a9.63,9.63,0,0,1-8-9.5,9.51,9.51,0,0,1,6.79-9.1A1,1,0,0,1,12,5.19a8.4,8.4,0,0,0-6.1,8.31,8.44,8.44,0,0,0,8.38,8.38A1,1,0,0,1,12,23Z">
      <animateTransform attributeName="transform" type="rotate" dur="0.75s" from="0 12 12" to="360 12 12" repeatCount="indefinite" />
    </path>
  </svg>
);

const Notification = ({ message, type, show }) => {
  const bgColor = type === "success" ? "bg-green-600" : "bg-red-600";
  return (
    <div className={`fixed top-5 right-0 p-4 rounded-lg text-white shadow-lg transition-transform transform ${show ? "translate-x-0" : "translate-x-full"} ${bgColor}`} style={{ zIndex: 1000 }}>
      {message}
    </div>
  );
};

const ValidationModal = ({ isOpen, warnings, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
        <div className="flex items-center gap-3 text-amber-600">
          <svg className="w-7 h-7 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900">Peringatan Pre-Flight Validation</h3>
        </div>

        <p className="text-xs text-gray-600">
          Sistem menemukan beberapa potensi masalah pada template atau data CSV kamu sebelum proses cetak dimulai:
        </p>

        <div className="max-h-60 overflow-y-auto space-y-2 text-xs bg-amber-50 p-3 rounded-xl border border-amber-200">
          {warnings.map((warn, idx) => (
            <div key={idx} className="flex items-start gap-2 text-amber-900">
              <span className="font-bold text-amber-600">•</span>
              <span>{warn}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 font-medium">
          Apakah kamu ingin tetap melanjutkan proses pencetakan sertifikat?
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Batal & Perbaiki
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#8C2F39] hover:bg-[#742531] rounded-lg shadow-sm transition-colors"
          >
            Tetap Lanjutkan Cetak
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CetakLokal() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
        setFontDetectionError("Akses ke font lokal ditolak. Anda bisa mengizinkannya lewat pengaturan situs di browser.");
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

      // Load font ke DOM Browser untuk Live Preview Canvas
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

      const formattedConfigs = configs
        .filter((c) => c.enabled)
        .map((c) => ({
          column_name: c.column_name,
          static_text: c.static_text || null,
          x: c.x,
          y: pdfPreviewSize.height - c.y - c.font_size,
          font_size: parseFloat(c.font_size),
          max_width: parseFloat(c.max_width),
          align: c.align || "left",
          page_number: c.page_number || 1,
        }));

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
      <div className="flex items-center justify-center min-h-screen bg-[#F2EAD3]">
        <Spinner className="w-8 h-8 text-[#8C2F39]" />
      </div>
    );
  }

  const GENERATION_CHUNK_SIZE = 1000;
  const estimatedCertCount = csvRows.length;
  const estimatedZipParts = estimatedCertCount > 0 ? Math.ceil(estimatedCertCount / GENERATION_CHUNK_SIZE) : 0;
  const estimatedPerFileBytes = templateFile ? templateFile.size : 0;
  const estimatedTotalBytes = estimatedCertCount * estimatedPerFileBytes;

  return (
    <>
      <Notification {...notification} />
      <ValidationModal
        isOpen={isValidationModalOpen}
        warnings={validationWarnings}
        onConfirm={executeBatchRendering}
        onCancel={() => setIsValidationModalOpen(false)}
      />

      <header className="w-full bg-white shadow-sm border-b border-[#17233D]/10 sticky top-0 z-40">
        <div className="container mx-auto flex justify-between items-center px-6 py-3">
          <h1 className="text-xl font-bold text-[#17233D]">SertiGen — Visual Layout Generator</h1>
          <Link href="/dashboard" className="px-4 py-2 text-sm font-semibold text-white bg-[#8C2F39] rounded-lg shadow-sm hover:bg-[#742531] transition-colors">
            Kembali ke Dashboard
          </Link>
        </div>
      </header>

      <main className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen bg-[#F2EAD3] text-[#17233D]">
        {/* Panel Kontrol Kiri */}
        <div className="w-full lg:w-1/3 space-y-6 bg-[#FCFAF2] p-6 rounded-2xl shadow-md border border-[#17233D]/10">
          <h2 className="text-xl font-bold">1. Unggah File</h2>

          <div>
            <label className="block text-sm font-semibold mb-1">Upload CSV Peserta</label>
            <input type="file" accept=".csv" onChange={handleCsvChange} className="w-full text-sm p-2 border rounded-lg bg-white" />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Upload Template PDF</label>
            <input type="file" accept="application/pdf" onChange={handleTemplateChange} className="w-full text-sm p-2 border rounded-lg bg-white" />
          </div>

          {templateFile && (
            <div className="bg-[#17233D]/5 border border-[#17233D]/10 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#17233D]">Pengaturan Kompresi Template</span>
                <span className="text-[10px] text-gray-500">
                  {formatBytes(originalTemplateSize)} → <span className="font-semibold text-[#8C2F39]">{formatBytes(templateFile.size)}</span>
                </span>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-medium text-gray-600 mb-1">
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
                <div className="flex justify-between text-[9px] text-gray-400">
                  <span>Kecil (buram)</span>
                  <span>Besar (tajam)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-medium text-gray-600 mb-1">
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
                <div className="flex justify-between text-[9px] text-gray-400">
                  <span>Kecil (buram)</span>
                  <span>Besar (tajam)</span>
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
                    className={`py-1.5 text-[11px] font-semibold rounded-lg border transition-colors ${
                      compressionScale === preset.scale && compressionQuality === preset.quality
                        ? "bg-[#8C2F39] text-white border-[#8C2F39]"
                        : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
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
                className="w-full py-2 text-xs font-semibold text-white bg-[#17233D] rounded-lg shadow-sm hover:bg-[#0f1729] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
              <p className="text-[10px] text-gray-500">
                Ubah resolusi/kualitas lalu tekan "Terapkan Kompresi" untuk memperbarui ukuran template dan estimasi hasil ekspor. Perubahan tidak otomatis diterapkan saat slider digeser.
              </p>
            </div>
          )}

          {/* Panel Deteksi & Seleksi Font Lokal */}
          <div className="p-4 rounded-lg border border-dashed border-[#17233D]/20 bg-[#17233D]/[0.03] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#17233D]">Font dari Komputer Lokal (Opsional)</span>
              {localFontApiSupported ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  Didukung
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-medium">
                  Tidak Didukung
                </span>
              )}
            </div>

            {!localFontApiSupported ? (
              <p className="text-[10px] text-gray-500">
                Hanya tersedia di Chrome/Edge desktop. Browser ini akan memakai font Helvetica-Bold bawaan.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDetectLocalFonts}
                  disabled={isDetectingFonts}
                  className="w-full py-2 text-xs font-semibold text-[#17233D] bg-white border border-[#17233D]/20 rounded-lg hover:bg-[#17233D]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isDetectingFonts ? (
                    <>
                      <Spinner className="w-3.5 h-3.5" />
                      Memindai Font...
                    </>
                  ) : (
                    "Deteksi Font di Perangkat Saya"
                  )}
                </button>

                {fontDetectionError && <p className="text-[10px] text-red-600">{fontDetectionError}</p>}

                {localFontFamilies.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      Pilih Font ({localFontFamilies.length} ditemukan)
                    </label>
                    <select
                      value={selectedLocalFontFamily}
                      onChange={(e) => handleSelectLocalFont(e.target.value)}
                      disabled={isLoadingFontBytes}
                      className="w-full p-2 text-sm border rounded-lg bg-white"
                    >
                      <option value="">-- Pakai font bawaan (Helvetica-Bold) --</option>
                      {localFontFamilies.map((family) => (
                        <option key={family} value={family}>
                          {family}
                        </option>
                      ))}
                    </select>
                    {isLoadingFontBytes && (
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <Spinner className="w-3 h-3" /> Memuat data font...
                      </p>
                    )}
                    {selectedFontBytes && !isLoadingFontBytes && (
                      <p className="text-[10px] text-green-600 mt-1">
                        Font "{selectedLocalFontFamily}" siap dipakai ({formatBytes(selectedFontBytes.length)}).
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Preset Manager Section */}
          <div className="pt-4 border-t border-[#17233D]/10 space-y-3">
            <h2 className="text-sm font-bold">Preset Layout Manager</h2>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nama Preset..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="w-full p-1.5 text-xs border rounded-lg bg-white"
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
                className="w-full p-1.5 text-xs border rounded-lg bg-white"
              >
                <option value="" disabled>-- Muat Preset Tersimpan --</option>
                {savedPresets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportJson}
                className="w-1/2 py-1 text-xs font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Export JSON
              </button>
              <label className="w-1/2 py-1 text-xs font-semibold text-center text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg cursor-pointer">
                Import JSON
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>
          </div>

          {/* Tata Letak Elemen */}
          <div className="space-y-4 pt-4 border-t border-[#17233D]/10">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">2. Tata Letak Elemen</h2>
              <button
                type="button"
                onClick={handleAddStaticText}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-green-700 hover:bg-green-800 rounded-lg shadow-sm transition-colors"
              >
                + Teks Statis
              </button>
            </div>

            {configs.length > 0 && (
              <div>
                <label className="block text-xs font-semibold mb-1">Pilih Elemen Aktif</label>
                <select
                  value={activeColumn}
                  onChange={(e) => setActiveColumn(e.target.value)}
                  className="w-full p-2 text-sm border rounded-lg bg-white font-medium"
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

            {/* Daftar Elemen Nonaktif / Tersedia untuk Dipanggil */}
            {configs.some((c) => !c.enabled) && (
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 space-y-2">
                <label className="block text-xs font-bold text-amber-900">
                  Elemen/Kolom yang Disembunyikan ({configs.filter((c) => !c.enabled).length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {configs
                    .filter((c) => !c.enabled)
                    .map((cfg) => (
                      <button
                        key={cfg.column_name}
                        type="button"
                        onClick={() => handleRestoreElement(cfg.column_name)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white text-gray-700 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-sm flex items-center gap-1 transition-colors"
                      >
                        <span>+</span>
                        <span>
                          {cfg.static_text !== undefined && cfg.static_text !== ""
                            ? cfg.static_text
                            : cfg.column_name}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {configs
              .filter((c) => c.column_name === activeColumn)
              .map((cfg) => (
                <div key={cfg.column_name} className="space-y-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  {cfg.static_text !== undefined && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold">Isi Teks Statis</label>
                        <span className="text-[10px] text-gray-500">Gunakan {"{Nama}"}</span>
                      </div>
                      <input
                        type="text"
                        value={cfg.static_text}
                        onChange={(e) => updateConfig(cfg.column_name, { static_text: e.target.value })}
                        className="w-full p-2 text-sm border rounded-lg font-medium"
                      />
                    </div>
                  )}

                  {totalPages > 1 && (
                    <div>
                      <label className="block text-xs font-semibold mb-1">Ditempatkan di Halaman Target</label>
                      <select
                        value={cfg.page_number || 1}
                        onChange={(e) => updateConfig(cfg.column_name, { page_number: Number(e.target.value) })}
                        className="w-full p-2 text-sm border rounded-lg bg-white"
                      >
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num}>Halaman {num}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold mb-1">Perataan Teks (Alignment)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "left", label: "Kiri" },
                        { id: "center", label: "Tengah" },
                        { id: "right", label: "Kanan" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => updateConfig(cfg.column_name, { align: item.id })}
                          className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            cfg.align === item.id
                              ? "bg-[#8C2F39] text-white border-[#8C2F39]"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-300"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Ukuran Font (pt)</label>
                      <input
                        type="number"
                        value={cfg.font_size}
                        onChange={(e) => updateConfig(cfg.column_name, { font_size: Number(e.target.value) })}
                        className="w-full p-2 text-sm border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Lebar Box (pt)</label>
                      <input
                        type="number"
                        value={cfg.max_width}
                        onChange={(e) => updateConfig(cfg.column_name, { max_width: Number(e.target.value) })}
                        className="w-full p-2 text-sm border rounded-lg"
                      />
                    </div>
                  </div>

                  {cfg.static_text !== undefined && (
                    <button
                      type="button"
                      onClick={() => handleHideElement(cfg.column_name)}
                      className="w-full py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                    >
                      Hapus Elemen Ini
                    </button>
                  )}
                </div>
              ))}
          </div>

          {progress && (
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span>Memproses sertifikat (Web Worker)...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full h-2 bg-[#17233D]/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#8C2F39] transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
              </div>
            </div>
          )}

          {!isProcessing && csvFile && templateFile && estimatedCertCount > 0 && (
            <div className="bg-[#17233D]/5 border border-[#17233D]/10 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#17233D]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                <span>Ringkasan Sebelum Cetak</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-700">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Sertifikat</div>
                  <div className="font-semibold">{estimatedCertCount.toLocaleString("id-ID")} berkas</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">File ZIP</div>
                  <div className="font-semibold">{estimatedZipParts} bagian</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Estimasi Ukuran</div>
                  <div className="font-semibold">≈ {formatBytes(estimatedTotalBytes)}</div>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 pt-1">
                Estimasi berdasarkan ukuran template terkompresi × jumlah baris data. Ukuran aktual bisa sedikit berbeda tergantung panjang teks.
              </p>
            </div>
          )}

          <button
            onClick={handleStartGenerate}
            disabled={isProcessing || !csvFile || !templateFile}
            className="w-full py-3 text-sm font-semibold text-white bg-[#8C2F39] rounded-lg shadow-sm hover:bg-[#742531] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? "Memproses dalam Worker..." : "Cetak & Download ZIP"}
          </button>
        </div>

        {/* Panel Preview Layout Canvas */}
        <div className="w-full lg:w-2/3 flex flex-col items-center bg-[#FCFAF2] p-6 rounded-2xl shadow-md border border-[#17233D]/10 overflow-auto">
          {/* Header Preview & Multi-Page Switcher */}
          <div className="w-full flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-gray-500">
              💡 Drag elemen untuk mengatur posisi. Kotak akan otomatis snap ke tengah canvas.
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border shadow-sm">
                <span className="text-xs font-bold text-gray-700">Halaman:</span>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-2 py-0.5 text-xs font-bold rounded ${
                      currentPage === pageNum ? "bg-[#8C2F39] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            ref={containerRef}
            className="relative border border-gray-400 bg-white shadow-lg rounded-sm overflow-hidden"
            style={{ width: pdfPreviewSize.width, height: pdfPreviewSize.height }}
          >
            <canvas ref={canvasRef} className="absolute top-0 left-0 z-0 pointer-events-none" />

            {/* Center Snap Guides (Visual Only) */}
            {activeSnapGuides.x && (
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-red-500 border-r border-dashed border-red-500 z-20 pointer-events-none" />
            )}
            {activeSnapGuides.y && (
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-red-500 border-b border-dashed border-red-500 z-20 pointer-events-none" />
            )}

            {/* Render Elemen Khusus Halaman Aktif */}
            {configs
              .filter((cfg) => cfg.enabled && (cfg.page_number || 1) === currentPage)
              .map((cfg) => {
                const displayText = renderPreviewText(cfg);
                const isSelected = activeColumn === cfg.column_name;
                const isStatic = cfg.static_text !== undefined;

                return (
                  <Rnd
                    key={cfg.column_name}
                    bounds="parent"
                    size={{ width: cfg.max_width, height: cfg.font_size * 1.5 }}
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
                    className={`absolute flex items-center border-2 border-dashed px-2 cursor-move z-10 transition-colors ${
                      isSelected
                        ? "border-[#8C2F39] bg-[#8C2F39]/15"
                        : isStatic
                        ? "border-green-500 bg-green-500/10"
                        : "border-blue-400 bg-blue-400/10"
                    } ${
                      cfg.align === "center" ? "justify-center text-center" : cfg.align === "right" ? "justify-end text-right" : "justify-start text-left"
                    }`}
                  >
                    <span
                      style={{
                        fontSize: `${cfg.font_size * 0.75}px`,
                        fontFamily: selectedLocalFontFamily ? `"${selectedLocalFontFamily}", sans-serif` : "sans-serif",
                      }}
                      className="truncate font-bold text-gray-800 select-none w-full"
                    >
                      {displayText}
                    </span>
                  </Rnd>
                );
              })}
          </div>
        </div>
      </main>
    </>
  );
}
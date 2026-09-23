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

const DEFAULT_TEXT_COLOR = "#1A1A1A";

const Spinner = ({ className = "w-4 h-4 text-current", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...props}>
    <path fill="currentColor" d="M12,23a9.63,9.63,0,0,1-8-9.5,9.51,9.51,0,0,1,6.79-9.1A1,1,0,0,1,12,5.19a8.4,8.4,0,0,0-6.1,8.31,8.44,8.44,0,0,0,8.38,8.38A1,1,0,0,1,12,23Z">
      <animateTransform attributeName="transform" type="rotate" dur="0.75s" from="0 12 12" to="360 12 12" repeatCount="indefinite" />
    </path>
  </svg>
);

const IconFolder = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.75 7.5A1.5 1.5 0 015.25 6h4.19a1.5 1.5 0 011.06.44l1.5 1.5h6.75a1.5 1.5 0 011.5 1.5v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V7.5z" />
  </svg>
);

const IconEdit = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
  </svg>
);

const IconType = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7.5 4.5h9M12 4.5v15M8.25 19.5h7.5" />
  </svg>
);

const IconBookmark = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.25 6.75v13.5l-5.25-3-5.25 3V6.75a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25z" />
  </svg>
);

const IconBolt = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.75 3L4.5 13.5h6l-1.5 7.5 8.25-10.5h-6l1.5-7.5z" />
  </svg>
);

const IconCheck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const IconAlertTriangle = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const Notification = ({ message, type, show }) => {
  const isSuccess = type === "success";
  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-slate-100 shadow-xl border backdrop-blur-md transition-all duration-200 transform ${
        show ? "translate-y-0 opacity-100 scale-100" : "-translate-y-2 opacity-0 scale-95 pointer-events-none"
      } ${isSuccess ? "bg-slate-900/90 border-emerald-500/40" : "bg-slate-900/90 border-rose-500/40"}`}
    >
      <div className={`w-2 h-2 rounded-full ${isSuccess ? "bg-emerald-400" : "bg-rose-400"}`} />
      <span className="text-xs font-medium">{message}</span>
    </div>
  );
};

const ValidationModal = ({ isOpen, warnings, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20 shrink-0">
            <IconAlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Peringatan Validasi</h3>
            <p className="text-xs text-slate-400 mt-0.5">Ditemukan beberapa potensi masalah sebelum pencetakan</p>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 text-slate-300">
          {warnings.map((warn, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span className="leading-normal">{warn}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400">
          Apakah Anda ingin tetap melanjutkan proses pencetakan sertifikat?
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Batal & Perbaiki
          </button>
          <button
            onClick={onConfirm}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-rose-700 hover:bg-rose-600 rounded-lg shadow transition-colors"
          >
            Tetap Cetak
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

  // Cek apakah ada sesi tersimpan (autosave) saat pengguna sudah login.
  // Ditampilkan sebagai banner konfirmasi, bukan auto-restore diam-diam,
  // karena data CSV berisi informasi peserta.
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

  // Autosave tata letak (debounced) setiap kali configs berubah.
  // Tidak berjalan saat proses restore sedang berlangsung, dan tidak
  // menyimpan konfigurasi kosong di atas sesi yang mungkin baru dipulihkan.
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

        // Autosave: timpa data peserta tersimpan setiap kali CSV baru diunggah.
        (async () => {
          try {
            await idbSet(AUTOSAVE_KEYS.CSV, {
              headers: results.meta?.fields || [],
              rows,
            });
            await saveAutosaveMeta({ csvName: file.name, csvRowCount: rows.length });
          } catch (err) {
            console.error("Gagal autosave CSV:", err);
            setNotification({ show: true, message: "Autosave data peserta gagal (penyimpanan mungkin penuh).", type: "error" });
          }
        })();
      },
      error: (err) => {
        setNotification({ show: true, message: `Gagal membaca CSV: ${err.message}`, type: "error" });
      }
    });
  };

  const renderTaskRef = useRef(null);

  const renderPdfPage = async (pdf, pageNum) => {
    // Batalkan render sebelumnya (kalau masih berjalan) sebelum memulai yang baru,
    // supaya tidak ada dua render() berjalan bersamaan di canvas yang sama.
    // Chrome melempar error untuk kasus ini; Firefox lebih toleran sehingga
    // masalahnya tidak terlihat di sana.
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
      // Render yang dibatalkan (task.cancel()) melempar RenderingCancelledException —
      // ini bukan error sungguhan, hanya efek dari render baru yang menggantikannya.
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

      // Render pertama ditangani oleh useEffect([pdfDoc, currentPage]) di atas —
      // tidak dipanggil manual di sini lagi supaya tidak terjadi dua render()
      // bersamaan di canvas yang sama (lihat renderTaskRef di renderPdfPage).

      // Autosave: timpa template tersimpan setiap kali template baru diunggah.
      try {
        await idbSet(AUTOSAVE_KEYS.TEMPLATE, compressedFile);
        await saveAutosaveMeta({ templateName: file.name, templateSize: compressedFile.size });
      } catch (err) {
        console.error("Gagal autosave template:", err);
        setNotification({ show: true, message: "Autosave template gagal (penyimpanan mungkin penuh).", type: "error" });
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
        console.error("Gagal autosave template (recompress):", err);
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
        // Render ditangani oleh useEffect([pdfDoc, currentPage]) — tidak dipanggil
        // manual di sini agar tidak bertabrakan dengan render yang sama.
      }

      setIsRestoreBannerOpen(false);
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
          warnings.push(`Ada ${emptyCount} baris data kosong di kolom "${cfg.column_name}".`);
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
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <Spinner className="w-8 h-8 text-rose-500" />
      </div>
    );
  }

  const GENERATION_CHUNK_SIZE = 1000;
  const estimatedCertCount = csvRows.length;
  const estimatedZipParts = estimatedCertCount > 0 ? Math.ceil(estimatedCertCount / GENERATION_CHUNK_SIZE) : 0;
  const estimatedPerFileBytes = templateFile ? templateFile.size : 0;
  const estimatedTotalBytes = estimatedCertCount * estimatedPerFileBytes;

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans antialiased selection:bg-rose-500/30 selection:text-rose-200">
      <Notification {...notification} />
      <ValidationModal
        isOpen={isValidationModalOpen}
        warnings={validationWarnings}
        onConfirm={executeBatchRendering}
        onCancel={() => setIsValidationModalOpen(false)}
      />

      {/* BANNER RESTORE SESI TERSIMPAN */}
      {isRestoreBannerOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20 shrink-0">
                <IconFolder className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Sesi Tersimpan Ditemukan</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {autosaveMeta?.templateName ? `Template: ${autosaveMeta.templateName}` : "Tanpa template"}
                  {autosaveMeta?.csvName ? ` • CSV: ${autosaveMeta.csvName}` : ""}
                  {autosaveMeta?.csvRowCount ? ` (${autosaveMeta.csvRowCount} baris)` : ""}
                </p>
                {autosaveMeta?.savedAt && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Terakhir disimpan: {new Date(autosaveMeta.savedAt).toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Pulihkan sesi ini untuk melanjutkan pekerjaan sebelumnya, atau mulai baru untuk menghapus data tersimpan.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleDiscardAutosave}
                disabled={isRestoring}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40"
              >
                Mulai Baru
              </button>
              <button
                onClick={handleRestoreSession}
                disabled={isRestoring}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-rose-700 hover:bg-rose-600 rounded-lg shadow transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                {isRestoring ? <Spinner className="w-3.5 h-3.5" /> : null}
                {isRestoring ? "Memulihkan..." : "Pulihkan Sesi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER STUDIO BAR */}
      <header className="h-13 border-b border-slate-800/80 bg-slate-950/90 px-4 flex items-center justify-between shrink-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-rose-700 to-rose-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            S
          </div>
          <span className="text-xs font-semibold tracking-wide text-slate-200">SertiGen Studio</span>
          <span className="text-slate-800">|</span>
          <span className="text-xs text-slate-400 font-normal truncate max-w-xs">
            {templateFile ? templateFile.name : "Belum ada template"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPreview}
            disabled={isProcessing || !templateFile}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.036 12c1.07-4.516 5.03-8 9.964-8s8.894 3.484 9.964 8c-1.07 4.516-5.03 8-9.964 8s-8.894-3.484-9.964-8z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Pratinjau
          </button>

          <button
            onClick={handleStartGenerate}
            disabled={isProcessing || !csvFile || !templateFile}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-rose-700 hover:bg-rose-600 disabled:bg-slate-900 disabled:text-slate-600 border border-rose-600/30 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            {isProcessing ? (
              <>
                <Spinner className="w-3.5 h-3.5" />
                <span>Memproses...</span>
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
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors ml-1"
            title="Kembali ke Dashboard"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </Link>
        </div>
      </header>

      {/* STUDIO BODY WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 1. LEFT TOOLBAR DOCK */}
        <aside className="w-13 bg-slate-950 border-r border-slate-800/80 flex flex-col items-center py-3 gap-2 shrink-0 z-20">
          {[
            { id: "files", label: "Berkas", Icon: IconFolder },
            { id: "elements", label: "Elemen", Icon: IconEdit },
            { id: "fonts", label: "Font", Icon: IconType },
            { id: "presets", label: "Preset", Icon: IconBookmark },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center transition-colors ${
                activeTab === tab.id
                  ? "bg-slate-800/90 text-rose-400 border border-slate-700/80"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
              }`}
              title={tab.label}
            >
              <tab.Icon className="w-4 h-4" />
              <span className="text-[9px] font-medium mt-0.5">{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* 2. CONTEXTUAL INSPECTOR PANEL */}
        <div className="w-72 bg-slate-900/60 border-r border-slate-800/80 flex flex-col shrink-0 z-10 overflow-y-auto">
          <div className="p-3.5 space-y-4">
            
            {/* PANEL: FILES */}
            {activeTab === "files" && (
              <div className="space-y-4">
                <div className="border-b border-slate-800/80 pb-2">
                  <h2 className="text-xs font-semibold text-slate-200">Sumber Berkas</h2>
                  <p className="text-[11px] text-slate-400">Unggah CSV data dan PDF template</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Data Peserta (.csv)</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvChange}
                      className="block w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 border border-slate-800 rounded-lg p-1 bg-slate-950/50"
                    />
                    {csvRows.length > 0 && (
                      <p className="text-[10px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                        <IconCheck className="w-3 h-3 shrink-0" />
                        {csvRows.length} baris ({csvHeaders.length} kolom)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Template Sertifikat (.pdf)</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleTemplateChange}
                      className="block w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 border border-slate-800 rounded-lg p-1 bg-slate-950/50"
                    />
                  </div>
                </div>

                {templateFile && (
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-300">Kompresi PDF</span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {formatBytes(originalTemplateSize)} → <span className="text-rose-400">{formatBytes(templateFile.size)}</span>
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
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
                          className="w-full accent-rose-600 h-1 bg-slate-800 rounded"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
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
                          className="w-full accent-rose-600 h-1 bg-slate-800 rounded"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1">
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
                          className={`py-1 text-[10px] font-medium rounded border transition-colors ${
                            compressionScale === preset.scale && compressionQuality === preset.quality
                              ? "bg-slate-800 text-rose-400 border-slate-700"
                              : "bg-slate-900/50 text-slate-400 border-slate-800/80 hover:bg-slate-800"
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
                      className="w-full py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded transition-colors flex items-center justify-center gap-1.5 mt-1"
                    >
                      {isRecompressing ? <Spinner /> : "Terapkan Kompresi"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PANEL: ELEMENTS */}
            {activeTab === "elements" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h2 className="text-xs font-semibold text-slate-200">Tata Letak Teks</h2>
                  <button
                    type="button"
                    onClick={handleAddStaticText}
                    className="px-2 py-0.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition-colors"
                  >
                    + Teks Statis
                  </button>
                </div>

                {configs.some((c) => !c.enabled) && (
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 space-y-1.5">
                    <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Elemen Tersembunyi ({configs.filter((c) => !c.enabled).length})
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {configs
                        .filter((c) => !c.enabled)
                        .map((cfg) => (
                          <button
                            key={cfg.column_name}
                            type="button"
                            onClick={() => handleRestoreElement(cfg.column_name)}
                            className="px-2 py-0.5 text-[10px] font-medium bg-slate-900 text-slate-300 hover:text-white border border-slate-800 rounded transition-colors flex items-center gap-1"
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
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Pilih Elemen</label>
                    <select
                      value={activeColumn}
                      onChange={(e) => setActiveColumn(e.target.value)}
                      className="w-full p-1.5 text-xs border border-slate-800 rounded-lg bg-slate-950 text-slate-200"
                    >
                      {configs.filter((c) => c.enabled).map((c) => (
                        <option key={c.column_name} value={c.column_name}>
                          {c.static_text !== undefined && c.static_text !== ""
                            ? `[Statis] ${c.static_text}`
                            : `[CSV] ${c.column_name}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Form Editor Elemen */}
                {configs
                  .filter((c) => c.column_name === activeColumn)
                  .map((cfg) => (
                    <div key={cfg.column_name} className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                      {cfg.static_text !== undefined && (
                        <div>
                          <label className="block text-[10px] font-medium text-slate-400 mb-1">Konten Teks Statis</label>
                          <input
                            type="text"
                            value={cfg.static_text}
                            onChange={(e) => updateConfig(cfg.column_name, { static_text: e.target.value })}
                            className="w-full p-1.5 text-xs border border-slate-800 rounded bg-slate-900 text-slate-100"
                          />
                        </div>
                      )}

                      {totalPages > 1 && (
                        <div>
                          <label className="block text-[10px] font-medium text-slate-400 mb-1">Target Halaman</label>
                          <select
                            value={cfg.page_number || 1}
                            onChange={(e) => updateConfig(cfg.column_name, { page_number: Number(e.target.value) })}
                            className="w-full p-1.5 text-xs border border-slate-800 rounded bg-slate-900 text-slate-200"
                          >
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                              <option key={num} value={num}>Halaman {num}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">Perataan Teks</label>
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
                              className={`py-1 text-[10px] font-medium rounded border transition-colors ${
                                cfg.align === item.id
                                  ? "bg-slate-800 text-rose-400 border-slate-700"
                                  : "bg-slate-900 text-slate-400 border-slate-800/80 hover:bg-slate-800"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-400 mb-1">Ukuran (pt)</label>
                          <input
                            type="number"
                            value={cfg.font_size}
                            onChange={(e) => updateConfig(cfg.column_name, { font_size: Number(e.target.value) })}
                            className="w-full p-1.5 text-xs border border-slate-800 rounded bg-slate-900 text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-slate-400 mb-1">Lebar (pt)</label>
                          <input
                            type="number"
                            value={cfg.max_width}
                            onChange={(e) => updateConfig(cfg.column_name, { max_width: Number(e.target.value) })}
                            className="w-full p-1.5 text-xs border border-slate-800 rounded bg-slate-900 text-slate-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">Warna Teks</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={cfg.color || DEFAULT_TEXT_COLOR}
                            onChange={(e) => updateConfig(cfg.column_name, { color: e.target.value })}
                            className="h-7 w-8 p-0.5 bg-slate-900 border border-slate-800 rounded cursor-pointer"
                          />
                          <span className="text-[11px] font-mono text-slate-400 uppercase">
                            {cfg.color || DEFAULT_TEXT_COLOR}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateConfig(cfg.column_name, { color: DEFAULT_TEXT_COLOR })}
                            className="ml-auto px-2 py-0.5 text-[10px] font-medium text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded transition-colors"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {cfg.static_text !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleHideElement(cfg.column_name)}
                          className="w-full py-1 text-[11px] font-medium text-rose-400 hover:bg-rose-950/30 border border-rose-900/40 rounded transition-colors"
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
              <div className="space-y-4">
                <div className="border-b border-slate-800/80 pb-2">
                  <h2 className="text-xs font-semibold text-slate-200">Font Sistem Perangkat</h2>
                  <p className="text-[11px] text-slate-400">Pindai dan gunakan font lokal</p>
                </div>

                <div className="flex items-center justify-between gap-2 bg-slate-950/60 border border-slate-800/80 rounded-lg px-2.5 py-2">
                  <span className="text-[10px] font-medium text-slate-400">Local Font API</span>
                  {localFontApiSupported ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                      Didukung
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium border border-slate-700/80">
                      Tidak Didukung
                    </span>
                  )}
                </div>

                {!localFontApiSupported ? (
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Fitur pemindaian font lokal tersedia di browser berbasis Chromium (Chrome/Edge Desktop).
                  </p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleDetectLocalFonts}
                      disabled={isDetectingFonts}
                      className="w-full py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isDetectingFonts ? <Spinner /> : "Pindai Font Lokal"}
                    </button>

                    {fontDetectionError && (
                      <p className="text-[11px] text-rose-400 leading-normal">{fontDetectionError}</p>
                    )}

                    {localFontFamilies.length > 0 && (
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Pilih Font ({localFontFamilies.length})
                        </label>
                        <select
                          value={selectedLocalFontFamily}
                          onChange={(e) => handleSelectLocalFont(e.target.value)}
                          disabled={isLoadingFontBytes}
                          className="w-full p-1.5 text-xs border border-slate-800 rounded-lg bg-slate-950 text-slate-200"
                        >
                          <option value="">-- Standard (Helvetica-Bold) --</option>
                          {localFontFamilies.map((family) => (
                            <option key={family} value={family}>{family}</option>
                          ))}
                        </select>

                        {isLoadingFontBytes && (
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <Spinner /> Memuat data font...
                          </p>
                        )}

                        {selectedFontBytes && !isLoadingFontBytes && (
                          <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                            <IconCheck className="w-3 h-3 shrink-0" />
                            "{selectedLocalFontFamily}" Siap digunakan
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
              <div className="space-y-4">
                <div className="border-b border-slate-800/80 pb-2">
                  <h2 className="text-xs font-semibold text-slate-200">Preset Tata Letak</h2>
                  <p className="text-[11px] text-slate-400">Simpan atau ekspor konfigurasi</p>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Nama Preset..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="w-full p-1.5 text-xs border border-slate-800 rounded-lg bg-slate-950 text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={handleSavePreset}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-rose-700 hover:bg-rose-600 rounded-lg shrink-0 transition-colors"
                    >
                      Simpan
                    </button>
                  </div>

                  {savedPresets.length > 0 && (
                    <select
                      onChange={(e) => handleLoadPreset(e.target.value)}
                      defaultValue=""
                      className="w-full p-1.5 text-xs border border-slate-800 rounded-lg bg-slate-950 text-slate-200"
                    >
                      <option value="" disabled>-- Muat Preset --</option>
                      {savedPresets.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Ekspor JSON
                    </button>
                    <label className="py-1.5 text-xs font-medium text-center text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors">
                      Impor JSON
                      <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                    </label>
                  </div>
                </div>

                {csvFile && templateFile && estimatedCertCount > 0 && (
                  <div className="border-t border-slate-800/80 pt-3 space-y-2">
                    <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Ringkasan Ekspor
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2">
                        <div className="text-[10px] text-slate-500">Sertifikat</div>
                        <div className="font-semibold text-slate-200">{estimatedCertCount.toLocaleString("id-ID")}</div>
                      </div>
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2">
                        <div className="text-[10px] text-slate-500">Berkas ZIP</div>
                        <div className="font-semibold text-slate-200">{estimatedZipParts} Bagian</div>
                      </div>
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 col-span-2">
                        <div className="text-[10px] text-slate-500">Estimasi Ukuran</div>
                        <div className="font-semibold text-rose-400">{formatBytes(estimatedTotalBytes)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. WORKSPACE CANVAS STAGE */}
        <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-start overflow-auto relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
          
          {/* Top Canvas Toolbar */}
          <div className="w-full max-w-4xl flex items-center justify-between mb-3 text-xs text-slate-400">
            <span className="text-[11px] text-slate-400">
              Geser elemen teks di atas canvas untuk mengatur tata letak
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                <span className="text-[11px] mr-1">Halaman:</span>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      currentPage === pageNum ? "bg-rose-700 text-white font-medium" : "text-slate-400 hover:text-white"
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
            className="relative bg-white shadow-xl rounded overflow-hidden shrink-0 border border-slate-800"
            style={{ width: pdfPreviewSize.width, height: pdfPreviewSize.height }}
          >
            <canvas ref={canvasRef} className="absolute top-0 left-0 z-0 pointer-events-none" />

            {/* Snap Guides */}
            {activeSnapGuides.x && (
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-rose-500 z-20 pointer-events-none opacity-80" />
            )}
            {activeSnapGuides.y && (
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-rose-500 z-20 pointer-events-none opacity-80" />
            )}

            {/* Render Dynamic Elements */}
            {configs
              .filter((cfg) => cfg.enabled && (cfg.page_number || 1) === currentPage)
              .map((cfg) => {
                const displayText = renderPreviewText(cfg);
                const isSelected = activeColumn === cfg.column_name;
                const isStatic = cfg.static_text !== undefined;
                const outlineColor = isSelected ? "#be123c" : isStatic ? "#059669" : "#2563eb";
                const boxBg = isSelected
                  ? "rgba(190,18,60,0.08)"
                  : isStatic
                  ? "rgba(5,150,105,0.06)"
                  : "rgba(37,99,235,0.06)";

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
                    className="absolute cursor-move z-10 transition-shadow"
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
      <footer className="h-7 bg-slate-950 border-t border-slate-800/80 px-4 flex items-center justify-between text-[10px] text-slate-400 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${csvRows.length > 0 ? "bg-emerald-400" : "bg-slate-600"}`} />
            CSV: <strong className="text-slate-200 font-medium">{csvRows.length} Baris</strong>
          </span>
          <span className="text-slate-800">|</span>
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${templateFile ? "bg-emerald-400" : "bg-slate-600"}`} />
            Template: <strong className="text-slate-200 font-medium">{templateFile ? formatBytes(templateFile.size) : "Kosong"}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>Worker Engine: <strong className="text-emerald-400 font-medium">Siap</strong></span>
          <span className="text-slate-800">|</span>
          <span>Estimasi Output: <strong className="text-rose-400 font-medium">≈ {formatBytes(estimatedTotalBytes)}</strong></span>
        </div>
      </footer>
    </div>
  );
}
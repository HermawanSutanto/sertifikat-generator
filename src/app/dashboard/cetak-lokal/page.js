"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import Papa from "papaparse";
import { Rnd } from "react-rnd";

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

// Modal Pre-flight Validation Component
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
  const [longestRowSample, setLongestRowSample] = useState({}); // Stores longest string samples
  const [templateFile, setTemplateFile] = useState(null);
  const [pdfPreviewSize, setPdfPreviewSize] = useState({ width: 842, height: 595 });

  const [configs, setConfigs] = useState([]);
  const [activeColumn, setActiveColumn] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  // Validation Modal States
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

  // Longest Data Scanner: Find longest string per column in CSV
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

          // Scan samples terpanjang
          const scannedLongest = scanLongestRowSample(rows, fields);
          setLongestRowSample(scannedLongest);

          const initialConfigs = fields.map((header, idx) => ({
            column_name: header,
            static_text: "",
            x: 100,
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

  const handleTemplateChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTemplateFile(file);

    try {
      const pdfjsLib = await import("pdfjs-dist/build/pdf");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);

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
      console.error("Gagal memuat preview PDF:", err);
      setNotification({ show: true, message: `Gagal memuat preview PDF: ${err.message}`, type: "error" });
    }
  };

  const handleAddStaticText = () => {
    const staticId = `static_text_${Date.now()}`;
    const newConfig = {
      column_name: staticId,
      static_text: "Teks Statis {Nama}",
      x: 150,
      y: 100,
      font_size: 24,
      max_width: 300,
      align: "center",
      enabled: true,
      page_number: 1,
    };

    setConfigs((prev) => [...prev, newConfig]);
    setActiveColumn(staticId);
  };

  const handleDeleteElement = (colName) => {
    setConfigs((prev) => prev.filter((c) => c.column_name !== colName));
    setActiveColumn(configs[0]?.column_name || "");
  };

  const updateConfig = (colName, newProps) => {
    setConfigs((prev) =>
      prev.map((cfg) => (cfg.column_name === colName ? { ...cfg, ...newProps } : cfg))
    );
  };

  // Interpolasi String Template untuk Canvas Live Preview
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

  // Pre-flight Validation Runner
  const runPreflightValidation = () => {
    const warnings = [];

    configs.filter((c) => c.enabled).forEach((cfg) => {
      // 1. Cek Typo Placeholder {Variabel} di Teks Statis
      if (cfg.static_text) {
        const matches = cfg.static_text.match(/\{([^}]+)\}/g);
        if (matches) {
          matches.forEach((match) => {
            const rawKey = match.replace("{", "").replace("}", "");
            const key = rawKey.endsWith(":uppercase") ? rawKey.replace(":uppercase", "") : rawKey;

            if (!csvHeaders.includes(key)) {
              warnings.push(
                `Placeholder "${match}" di elemen Teks Statis tidak ditemukan pada header CSV. (Headers CSV yang ada: ${csvHeaders.join(", ")})`
              );
            }
          });
        }
      }

      // 2. Cek Data Kosong pada CSV untuk Kolom Aktif
      if (!cfg.static_text && csvHeaders.includes(cfg.column_name)) {
        let emptyCount = 0;
        csvRows.forEach((row) => {
          if (!row[cfg.column_name] || String(row[cfg.column_name]).trim() === "") {
            emptyCount++;
          }
        });

        if (emptyCount > 0) {
          warnings.push(
            `Terdapat ${emptyCount} baris data yang kosong di kolom "${cfg.column_name}".`
          );
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

          <div className="space-y-4 pt-4 border-t border-[#17233D]/10">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">2. Tata Letak Elemen</h2>
              <button
                type="button"
                onClick={handleAddStaticText}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-green-700 hover:bg-green-800 rounded-lg shadow-sm transition-colors"
              >
                + Tambah Teks Statis
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
                  {configs.map((c) => (
                    <option key={c.column_name} value={c.column_name}>
                      {c.static_text !== undefined && c.static_text !== ""
                        ? `[Teks Statis] ${c.static_text}`
                        : `[CSV] Kolom: ${c.column_name}`}
                    </option>
                  ))}
                </select>
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
                        <span className="text-[10px] text-gray-500">Gunakan {"{Nama}"} atau {"{Nama:uppercase}"}</span>
                      </div>
                      <input
                        type="text"
                        value={cfg.static_text}
                        onChange={(e) => updateConfig(cfg.column_name, { static_text: e.target.value })}
                        className="w-full p-2 text-sm border rounded-lg font-medium"
                        placeholder="Contoh: Diberikan kepada {Nama}"
                      />
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
                      onClick={() => handleDeleteElement(cfg.column_name)}
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
          <div className="w-full flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-gray-500">
              💡 Smart Live Preview: Menampilkan data terpanjang dari CSV
            </span>
          </div>

          <div
            ref={containerRef}
            className="relative border border-gray-400 bg-white shadow-lg rounded-sm"
            style={{ width: pdfPreviewSize.width, height: pdfPreviewSize.height }}
          >
            <canvas ref={canvasRef} className="absolute top-0 left-0 z-0 pointer-events-none" />

            {configs.map((cfg) => {
              const displayText = renderPreviewText(cfg);
              const isSelected = activeColumn === cfg.column_name;
              const isStatic = cfg.static_text !== undefined;

              return (
                <Rnd
                  key={cfg.column_name}
                  bounds="parent"
                  size={{ width: cfg.max_width, height: cfg.font_size * 1.5 }}
                  position={{ x: cfg.x, y: cfg.y }}
                  onDragStop={(e, d) => {
                    updateConfig(cfg.column_name, { x: d.x, y: d.y });
                    setActiveColumn(cfg.column_name);
                  }}
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
                    style={{ fontSize: `${cfg.font_size * 0.75}px` }}
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
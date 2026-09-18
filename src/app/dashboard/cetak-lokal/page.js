"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import Papa from "papaparse";

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

export default function CetakLokal() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [csvFile, setCsvFile] = useState(null);
  const [csvRowCount, setCsvRowCount] = useState(0);
  const [templateFile, setTemplateFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

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

  const handleCsvChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => setCsvRowCount(results.data.length),
      error: (err) => {
        setNotification({ show: true, message: `Gagal membaca CSV: ${err.message}`, type: "error" });
      }
    });
  };

  const handleTemplateChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setTemplateFile(file);
  };

  const handleGenerateAndDownloadZip = async () => {
    if (!csvFile || !templateFile) {
      setNotification({ show: true, message: "Harap unggah CSV peserta dan template PDF terlebih dahulu.", type: "error" });
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: csvRowCount });
    setNotification({ show: true, message: "Memulai pemrosesan via Web Worker...", type: "success" });

    try {
      // 1. Baca data CSV
      const parseResult = await new Promise((resolve, reject) => {
        Papa.parse(csvFile, { header: true, skipEmptyLines: true, complete: resolve, error: reject });
      });

      const allData = parseResult.data;
      if (allData.length === 0) {
        throw new Error("File CSV kosong atau tidak valid.");
      }

      const names = allData.map((row, i) => row["Nama"] || row["nama"] || `Peserta_${i + 1}`);
      const templateArrayBuffer = await templateFile.arrayBuffer();
      const templateUint8 = new Uint8Array(templateArrayBuffer);

      // 2. Inisialisasi Web Worker dari folder public
      // KODE BARU (BISA DI-BUNDEL NEXT.JS):
      const worker = new Worker(new URL("./pdfWorker.js", import.meta.url));

      // 3. Kirim data ke Web Worker
      worker.postMessage({
        templateUint8,
        names,
        chunkSize: 1000 // Mengelompokkan per 1000 sertifikat per file ZIP
      });

      // 4. Tangani sinyal balasan dari Web Worker
      worker.onmessage = (e) => {
        const { type, zipBytes, part, progress: workerProgress, error } = e.data;

        if (type === "CHUNK_COMPLETE") {
          // Update progress UI secara real-time (bebas lag)
          setProgress(workerProgress);

          // Unduh ZIP batch yang baru selesai
          const blob = new Blob([zipBytes], { type: "application/zip" });
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = `sertifikat_massal_part_${part}_${Date.now()}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
        }

        if (type === "ALL_COMPLETE") {
          setIsProcessing(false);
          setProgress(null);
          setNotification({
            show: true,
            message: `Berhasil! Seluruh ${names.length} sertifikat selesai diproses.`,
            type: "success"
          });
          worker.terminate(); // Matikan worker setelah selesai
        }

        if (type === "ERROR") {
          console.error("Worker error:", error);
          setNotification({ show: true, message: `Error Worker: ${error}`, type: "error" });
          setIsProcessing(false);
          setProgress(null);
          worker.terminate();
        }
      };

      worker.onerror = (err) => {
        console.error("Worker Execution Error:", err);
        setNotification({ show: true, message: `Gagal menjalankan Web Worker: ${err.message}`, type: "error" });
        setIsProcessing(false);
        setProgress(null);
        worker.terminate();
      };

    } catch (error) {
      console.error("Gagal memproses sertifikat:", error);
      setNotification({ show: true, message: `Terjadi kesalahan: ${error.message || error}`, type: "error" });
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

      <header className="w-full bg-white shadow-sm border-b border-[#17233D]/10 sticky top-0 z-40">
        <div className="container mx-auto flex justify-between items-center px-6 py-3">
          <h1 className="text-xl font-bold text-[#17233D] tracking-tight">SertiGen — Generasi ZIP Massal</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="px-4 py-2 text-sm font-semibold text-white bg-[#8C2F39] rounded-lg shadow-sm hover:bg-[#742531] transition-colors">
              Kembali ke Dashboard
            </Link>
            <div className="h-6 w-px bg-[#17233D]/10 hidden md:block"></div>
            <p className="hidden md:block text-sm text-[#17233D]/50">
              Login sebagai: <strong className="font-medium text-[#17233D]/80">{user.email}</strong>
            </p>
          </div>
        </div>
      </header>

      <main className="flex flex-col items-center min-h-screen bg-[#F2EAD3] p-4 md:p-8 text-[#17233D]">
        <div className="w-full max-w-2xl">
          <div className="w-full p-8 space-y-6 bg-[#FCFAF2] rounded-2xl shadow-lg border border-[#17233D]/10">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" aria-label="Kembali ke dashboard" className="p-2 rounded-lg text-[#17233D] hover:bg-[#A9822E]/10 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 111.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <h2 className="flex-1 text-3xl font-bold text-center text-[#17233D]">Generate ZIP Sertifikat</h2>
              <div className="w-9" aria-hidden="true"></div>
            </div>

            <p className="text-sm text-[#17233D]/60 text-center">
              Seluruh proses perenderan PDF dan pengompresan file ZIP diproses di <strong>Web Worker Thread (Rust WASM)</strong> tanpa membuat UI terhenti.
            </p>

            <div>
              <label className="block text-sm font-semibold text-[#17233D] mb-2">1. Unggah CSV Peserta</label>
              <input id="csv-upload" type="file" accept=".csv" className="sr-only" onChange={handleCsvChange} />
              <label htmlFor="csv-upload" className="w-full flex justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer bg-[#A9822E]/10 border-[#A9822E]/40 hover:border-[#8C2F39] transition-colors">
                <span className="text-sm text-[#17233D]">{csvFile ? `${csvFile.name} (${csvRowCount} baris)` : "Pilih file CSV (kolom: Nama)"}</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#17233D] mb-2">2. Unggah Template PDF</label>
              <input id="template-upload" type="file" accept="application/pdf" className="sr-only" onChange={handleTemplateChange} />
              <label htmlFor="template-upload" className="w-full flex justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer bg-[#A9822E]/10 border-[#A9822E]/40 hover:border-[#8C2F39] transition-colors">
                <span className="text-sm text-[#17233D]">{templateFile ? templateFile.name : "Pilih template PDF"}</span>
              </label>
            </div>

            {progress && (
              <div>
                <div className="flex justify-between text-xs text-[#17233D]/60 mb-1">
                  <span>Memproses sertifikat (Web Worker)...</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#17233D]/10 overflow-hidden">
                  <div className="h-full bg-[#8C2F39] transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={handleGenerateAndDownloadZip}
              disabled={isProcessing || !csvFile || !templateFile}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[#8C2F39] rounded-lg shadow-sm hover:bg-[#742531] disabled:bg-[#17233D]/20 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <>
                  <Spinner className="w-4 h-4" />
                  <span>Memproses via Background Worker...</span>
                </>
              ) : (
                <span>Cetak Semua &amp; Download (.zip)</span>
              )}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
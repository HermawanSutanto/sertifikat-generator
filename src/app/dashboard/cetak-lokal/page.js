"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import Papa from "papaparse";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Notifikasi & Spinner (dipertahankan sama)
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
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmModule, setWasmModule] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  const printFrameRef = useRef(null);

  // Inisialisasi WASM Engine saat komponen di-mount
  useEffect(() => {
    async function loadWasm() {
      try {
        const wasm = await import("@/../pkg/pdf_cert_wasm.js");
        await wasm.default();
        setWasmModule(wasm);
        setWasmReady(true);
      } catch (err) {
        console.error("Gagal memuat Rust WASM:", err);
      }
    }
    loadWasm();
  }, []);

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

  const handleCetakLokal = async () => {
    if (!csvFile || !templateFile) {
      setNotification({ show: true, message: "Harap unggah CSV peserta dan template PDF terlebih dahulu.", type: "error" });
      return;
    }

    setIsProcessing(true);
    setNotification({ show: true, message: "Membaca file template...", type: "success" });

    try {
      const templateArrayBuffer = await templateFile.arrayBuffer();

      const parseResult = await new Promise((resolve, reject) => {
        Papa.parse(csvFile, { header: true, skipEmptyLines: true, complete: resolve, error: reject });
      });

      const allData = parseResult.data;
      if (allData.length === 0) {
        throw new Error("File CSV kosong atau tidak valid.");
      }

      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < allData.length; i++) {
        setProgress({ current: i + 1, total: allData.length });
        const row = allData[i];
        const rawNama = row["Nama"] || row["nama"] || `Peserta_${i + 1}`;

        // 1. Gunakan Rust WASM untuk sanitasi nama jika module siap
        const nama = wasmReady && wasmModule ? wasmModule.sanitize_name(rawNama) : rawNama;

        const pdfDoc = await PDFDocument.load(templateArrayBuffer);
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();

        // 2. Kalkulasi Tata Letak menggunakan Rust WASM Engine
        let xPos, yPos, fontSize;
        if (wasmReady && wasmModule) {
          const layout = wasmModule.calculate_text_layout(nama, width, height);
          xPos = layout.x;
          yPos = layout.y;
          fontSize = layout.font_size;
        } else {
          // Fallback JavaScript lokal
          fontSize = 32;
          const textWidth = font.widthOfTextAtSize(nama, fontSize);
          xPos = (width - textWidth) / 2;
          yPos = height / 2 - 20;
        }

        firstPage.drawText(nama, {
          x: xPos,
          y: yPos,
          size: fontSize,
          font: font,
          color: rgb(0.1, 0.1, 0.1)
        });

        const [copiedPage] = await mergedPdf.copyPages(pdfDoc, [0]);
        mergedPdf.addPage(copiedPage);
      }

      setNotification({ show: true, message: "Menyiapkan pratinjau cetak...", type: "success" });

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);

      const frame = printFrameRef.current;
      frame.onload = () => {
        setNotification({
          show: true,
          message: `Selesai! ${allData.length} sertifikat siap dicetak. Membuka dialog print...`,
          type: "success"
        });
        setTimeout(() => {
          frame.contentWindow.focus();
          frame.contentWindow.print();
          setIsProcessing(false);
          setProgress(null);
        }, 300);
      };
      frame.src = blobUrl;
    } catch (error) {
      console.error("Gagal memproses cetak lokal:", error);
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

      <header className="w-full bg-white shadow-sm border-b border-[#17233D]/10 sticky top-0 z-40">
        <div className="container mx-auto flex justify-between items-center px-6 py-3">
          <h1 className="text-xl font-bold text-[#17233D] tracking-tight">SertiGen — Cetak Lokal</h1>
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
              <h2 className="flex-1 text-3xl font-bold text-center text-[#17233D]">Cetak Sertifikat Lokal</h2>
              <div className="w-9" aria-hidden="true"></div>
            </div>

            <p className="text-sm text-[#17233D]/60 text-center">
              Semua sertifikat digabung jadi satu file PDF via WASM-accelerated layout, lalu dialog print browser terbuka otomatis.
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
                  <span>Memproses sertifikat...</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#17233D]/10 overflow-hidden">
                  <div className="h-full bg-[#8C2F39] transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={handleCetakLokal}
              disabled={isProcessing || !csvFile || !templateFile}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[#8C2F39] rounded-lg shadow-sm hover:bg-[#742531] disabled:bg-[#17233D]/20 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <>
                  <Spinner className="w-4 h-4" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Gabung &amp; Cetak Semua (Print Lokal)</span>
              )}
            </button>
          </div>
        </div>
      </main>

      <iframe ref={printFrameRef} style={{ display: "none" }} title="print-frame" />
    </>
  );
}
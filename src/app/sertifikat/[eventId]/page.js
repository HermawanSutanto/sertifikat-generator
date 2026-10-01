"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Inter, JetBrains_Mono } from "next/font/google";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  limit,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { PDFDocument } from "pdf-lib";

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

const IconSearch = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const IconDownload = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const IconCheck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const IconExternalLink = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0021 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

const IconAlertCircle = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01" />
  </svg>
);

const Spinner = ({ className = "w-4 h-4 text-current", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...props}>
    <path fill="currentColor" d="M12,23a9.63,9.63,0,0,1-8-9.5,9.51,9.51,0,0,1,6.79-9.1A1,1,0,0,1,12,5.19a8.4,8.4,0,0,0-6.1,8.31,8.44,8.44,0,0,0,8.38,8.38A1,1,0,0,1,12,23Z">
      <animateTransform attributeName="transform" type="rotate" dur="0.75s" from="0 12 12" to="360 12 12" repeatCount="indefinite" />
    </path>
  </svg>
);

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

export default function ParticipantCertificateViewer() {
  const params = useParams();
  const searchParams = useSearchParams();

  // Membaca ID event dan peserta langsung dari URL
  const eventId = params?.eventId || searchParams?.get("eventId") || searchParams?.get("id");
  const directParticipantId = searchParams?.get("p") || searchParams?.get("pesertaId");

  const [eventData, setEventData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notification, setNotification] = useState({ show: false, text: "", type: "info" });

  const [isRenderingPdf, setIsRenderingPdf] = useState(false);
  const [isPreviewDrawing, setIsPreviewDrawing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportNote, setReportNote] = useState("");
  const [reportSent, setReportSent] = useState(false);

  const canvasRef = useRef(null);
  const templateCacheRef = useRef({ url: null, buffer: null });
  const fontCacheRef = useRef({ url: null, bytes: null });

  const notify = (text, type = "info") => {
    setNotification({ show: true, text, type });
    setTimeout(() => {
      setNotification({ show: false, text: "", type: "info" });
    }, 3800);
  };

  useEffect(() => {
    if (!eventId) {
      setIsLoadingEvent(false);
      setErrorMessage("Tautan acara tidak lengkap. Pastikan ID acara terisi pada URL.");
      return;
    }

    let isMounted = true;
    const fetchEventInfo = async () => {
      setIsLoadingEvent(true);
      setErrorMessage("");

      try {
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);

        if (!eventSnap.exists()) {
          if (isMounted) {
            setErrorMessage("Acara tidak ditemukan atau telah ditutup oleh panitia.");
            setIsLoadingEvent(false);
          }
          return;
        }

        const data = { id: eventSnap.id, ...eventSnap.data() };
        if (isMounted) setEventData(data);

        // Ambil daftar peserta untuk pencarian instan
        const pesertaColRef = collection(db, `events/${eventId}/peserta`);
        const pesertaSnap = await getDocs(pesertaColRef);

        const list = pesertaSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        list.sort((a, b) => (a.nomorUrut || 0) - (b.nomorUrut || 0));
        if (isMounted) {
          setParticipants(list);

          // Jika ada tautan langsung dengan parameter peserta (?p=id)
          if (directParticipantId) {
            const found = list.find((p) => p.id === directParticipantId);
            if (found) {
              setSelectedParticipant(found);
            }
          } else if (list.length > 0) {
            // Default pilih peserta pertama sebagai sampel preview awal
            setSelectedParticipant(list[0]);
          }
        }
      } catch (err) {
        console.error("Gagal memuat event:", err);
        if (isMounted) setErrorMessage("Kendala saat mengambil data acara: " + err.message);
      } finally {
        if (isMounted) setIsLoadingEvent(false);
      }
    };

    fetchEventInfo();
    return () => {
      isMounted = false;
    };
  }, [eventId, directParticipantId]);

  const searchResults = useMemo(() => {
    if (!searchKeyword.trim()) return [];
    const q = searchKeyword.toLowerCase().trim();
    return participants.filter(
      (p) =>
        (p.nama && p.nama.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
    ).slice(0, 8); // Tampilkan maksimal 8 saran teratas
  }, [participants, searchKeyword]);

  const renderInterpolatedText = (cfg, participant) => {
    if (cfg.is_custom_var) {
      const parts = (cfg.custom_var_values || "").split(",").map((s) => s.trim());
      return parts[0] || `[${cfg.custom_var_name || cfg.column_name}]`;
    }

    const row = participant?.attributes || {
      Nama: participant?.nama || "Nama Peserta",
      Email: participant?.email || "",
    };

    if (cfg.static_text !== undefined && cfg.static_text !== "") {
      let text = cfg.static_text;
      Object.entries(row).forEach(([k, v]) => {
        const valStr = String(v ?? "");
        text = text.replaceAll(`{${k}}`, valStr);
        text = text.replaceAll(`{${k}:uppercase}`, valStr.toUpperCase());
      });
      return text;
    }

    return row[cfg.column_name] ? String(row[cfg.column_name]) : participant?.nama || `[${cfg.column_name}]`;
  };

  const getTemplateBuffer = async (url) => {
    if (templateCacheRef.current.url === url && templateCacheRef.current.buffer) {
      return templateCacheRef.current.buffer;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("Gagal mengunduh template PDF.");
    const buffer = await res.arrayBuffer();
    templateCacheRef.current = { url, buffer };
    return buffer;
  };

  const drawPreviewCanvas = useCallback(async () => {
    const templateUrl = eventData?.storageRefs?.templatePdf?.url;
    if (!templateUrl || !selectedParticipant || !canvasRef.current) return;

    setIsPreviewDrawing(true);
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      }

      const buffer = await getTemplateBuffer(templateUrl);
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      // Render dengan skala 1.25x agar teks dan pratinjau sangat tajam di layar Retina/Ponsel
      const displayScale = 1.25;
      const viewport = page.getViewport({ scale: displayScale });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Gambar elemen teks dan gambar di atas kanvas
      if (Array.isArray(eventData.configs)) {
        for (const cfg of eventData.configs) {
          if (cfg.enabled === false) continue;
          if (cfg.page_number && cfg.page_number !== 1) continue;

          if (cfg.type === "image" && cfg.data_url) {
            await new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                ctx.drawImage(
                  img,
                  (cfg.x || 0) * displayScale,
                  (cfg.y || 0) * displayScale,
                  (cfg.max_width || 120) * displayScale,
                  (cfg.height || 70) * displayScale
                );
                resolve();
              };
              img.onerror = () => resolve();
              img.src = cfg.data_url;
            });
            continue;
          }

          const text = renderInterpolatedText(cfg, selectedParticipant);
          const scaledFontSize = Math.round((cfg.font_size || 24) * displayScale);

          ctx.save();
          ctx.fillStyle = cfg.color || "#111111";
          ctx.font = `600 ${scaledFontSize}px sans-serif`;
          ctx.textAlign = cfg.align || "left";

          let xPos = (cfg.x || 0) * displayScale;
          if (cfg.align === "center") {
            xPos += ((cfg.max_width || 200) * displayScale) / 2;
          } else if (cfg.align === "right") {
            xPos += (cfg.max_width || 200) * displayScale;
          }

          const yPos = ((cfg.y || 100) + (cfg.font_size || 24) * 0.95) * displayScale;
          const lines = String(text || "").split("\n");
          const lineHeight = (cfg.line_height || 1.2) * scaledFontSize;

          lines.forEach((line, lIdx) => {
            ctx.fillText(line, xPos, yPos + lIdx * lineHeight);
          });
          ctx.restore();
        }
      }
    } catch (err) {
      console.warn("Gagal menggambar pratinjau sertifikat:", err);
    } finally {
      setIsPreviewDrawing(false);
    }
  }, [eventData, selectedParticipant]);

  useEffect(() => {
    if (eventData && selectedParticipant) {
      drawPreviewCanvas();
    }
  }, [eventData, selectedParticipant, drawPreviewCanvas]);

  const handleOpenPdfDirectly = async () => {
    const templateUrl = eventData?.storageRefs?.templatePdf?.url;
    if (!templateUrl || !selectedParticipant) {
      notify("Data sertifikat belum lengkap untuk diunduh.", "error");
      return;
    }

    setIsRenderingPdf(true);
    try {
      notify(`Merender berkas PDF untuk ${selectedParticipant.nama}...`, "info");

      const templateRawBuffer = await getTemplateBuffer(templateUrl);
      const pdfDocLib = await PDFDocument.load(templateRawBuffer);

      // Tempel elemen gambar (logo / tanda tangan)
      const imageConfigs = (eventData.configs || []).filter(
        (c) => c.enabled !== false && c.type === "image" && c.data_url
      );

      for (const imgCfg of imageConfigs) {
        const pageIndex = Math.max(0, (imgCfg.page_number || 1) - 1);
        const page = pdfDocLib.getPage(pageIndex);
        const { height: pageH } = page.getSize();

        const res = await fetch(imgCfg.data_url);
        const imgBytes = await res.arrayBuffer();

        const embedded = imgCfg.mime_type?.includes("jpeg") || imgCfg.mime_type?.includes("jpg")
          ? await pdfDocLib.embedJpg(imgBytes)
          : await pdfDocLib.embedPng(imgBytes);

        const pdfY = pageH - Number(imgCfg.y) - Number(imgCfg.height);
        page.drawImage(embedded, {
          x: Number(imgCfg.x),
          y: pdfY,
          width: Number(imgCfg.max_width),
          height: Number(imgCfg.height),
        });
      }

      const bakedBytes = await pdfDocLib.save();

      // Gunakan modul WASM untuk rendering teks kurva tajam
      const wasm = await import("@/rust_wasm/pkg/pdf_cert_wasm.js");
      await wasm.default();

      let customFontBytes = undefined;
      if (eventData.storageRefs?.customFont?.url) {
        try {
          const fontRes = await fetch(eventData.storageRefs.customFont.url);
          if (fontRes.ok) {
            const fontBuf = await fontRes.arrayBuffer();
            customFontBytes = new Uint8Array(fontBuf);
          }
        } catch (e) {
          console.warn("Font cloud dilewati:", e);
        }
      }

      const rowPayload = [
        selectedParticipant.attributes || {
          Nama: selectedParticipant.nama,
          Email: selectedParticipant.email || "",
        },
      ];

      const formattedConfigs = (eventData.configs || [])
        .filter((c) => c.enabled !== false && c.type !== "image")
        .map((c) => ({
          column_name: c.is_custom_var ? c.custom_var_name || c.column_name : c.column_name,
          static_text: c.static_text || null,
          x: Number(c.x),
          y: Number(c.y),
          font_size: parseFloat(c.font_size || 24),
          line_height: parseFloat(c.line_height || 1.2),
          letter_spacing: parseFloat(c.letter_spacing || 0),
          max_width: parseFloat(c.max_width),
          align: c.align || "left",
          page_number: c.page_number || 1,
          page_height: 595,
          color: c.color || "#111111",
        }));

      const zipBytes = wasm.generate_certificates_chunk(
        new Uint8Array(bakedBytes),
        rowPayload,
        formattedConfigs,
        (selectedParticipant.nomorUrut || 1) - 1,
        customFontBytes,
        eventData.filenamePattern || "sertifikat_{Nama}_{index}"
      );

      const pdfBytes = extractPdfFromZip(zipBytes);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // Buka PDF di tab baru peramban
      const newTab = window.open(url, "_blank");
      if (!newTab) {
        // Fallback jika pop-up diblokir
        const a = document.createElement("a");
        a.href = url;
        a.download = `Sertifikat_${selectedParticipant.nama.replace(/\s+/g, "_")}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      notify(`Sertifikat ${selectedParticipant.nama} berhasil dibuka.`, "success");
    } catch (err) {
      console.error("Gagal ekspor PDF:", err);
      notify("Gagal membuka PDF: " + err.message, "error");
    } finally {
      setIsRenderingPdf(false);
    }
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    if (!reportNote.trim() || !selectedParticipant || !eventId) return;

    try {
      await addDoc(collection(db, `events/${eventId}/revisi_nama`), {
        participantId: selectedParticipant.id,
        namaLama: selectedParticipant.nama,
        email: selectedParticipant.email || "",
        namaBaru: reportNote.trim(),
        status: "pending",
        dibuatPada: serverTimestamp(),
      });

      setReportSent(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSent(false);
        setReportNote("");
        notify("Laporan perbaikan ejaan berhasil dikirim ke panitia.", "success");
      }, 1500);
    } catch (err) {
      console.error("Gagal mengirim laporan perbaikan:", err);
      notify("Gagal mengirim laporan: " + err.message, "error");
    }
  };

  return (
    <div
      className={`${sansFont.variable} ${monoFont.variable} min-h-screen bg-[#FFFFFF] text-[#111111] font-sans antialiased selection:bg-[#111111] selection:text-white pb-20`}
      style={{ fontFamily: "var(--font-sans), sans-serif" }}
    >
      {/* Toast Notification */}
      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-[4px] border text-xs font-mono transition-all ${
            notification.type === "error"
              ? "bg-[#FFFFFF] text-[#D92D20] border-[#D92D20]"
              : notification.type === "success"
              ? "bg-[#111111] text-white border-[#111111]"
              : "bg-[#FFFFFF] text-[#111111] border-[#E5E7EB]"
          }`}
        >
          {notification.text}
        </div>
      )}

      {/* Header Utama Publik */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/90 border-b border-[#E5E7EB] backdrop-blur-md px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-base font-medium tracking-tight text-[#111111]">
            SertiGen
          </Link>
          <span className="text-[#E5E7EB]">/</span>
          <span className="text-xs font-mono uppercase text-[#6B7280]">
            Portal Penerima Sertifikat
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/trial"
            className="text-xs font-mono text-[#6B7280] hover:text-[#111111] transition-colors"
          >
            Buat Sertifikat Sendiri →
          </Link>
        </div>
      </header>

      {/* Konten Halaman */}
      <main className="max-w-[1040px] mx-auto px-6 pt-10 space-y-8">
        {/* Banner Informasi Acara */}
        <div className="border border-[#E5E7EB] rounded-md p-6 bg-[#FFFFFF] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] font-mono uppercase bg-[#F5F5F5] text-[#111111] px-2.5 py-1 rounded-[2px] border border-[#E5E7EB]">
              {eventData?.tanggalEvent ? `Tanggal: ${eventData.tanggalEvent}` : "Dokumen Resmi Terverifikasi"}
            </span>

            <span className="text-xs font-mono text-[#6B7280]">
              Total Penerima: <strong className="text-[#111111] font-normal">{participants.length} Orang</strong>
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-[-0.5px] text-[#111111]">
              {isLoadingEvent ? "Memuat informasi acara..." : eventData?.namaEvent || "Sertifikat Pelatihan"}
            </h1>
            <p className="text-xs text-[#6B7280] mt-1.5 font-light leading-relaxed">
              Cari nama Anda pada formulir di bawah ini untuk melihat pratinjau lembar sertifikat secara langsung dan mengunduh berkas PDF siap cetak.
            </p>
          </div>

          {/* Kotak Pencarian Nama / Email Peserta */}
          <div className="pt-2 relative">
            <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
              Cari Nama Lengkap atau Email Peserta:
            </label>
            <div className="relative">
              <IconSearch className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Ketik nama lengkap Anda untuk mencari sertifikat..."
                className="w-full pl-10 pr-4 py-2.5 text-xs font-mono border border-[#E5E7EB] rounded-[4px] outline-none focus:border-[#111111] transition-colors"
              />
            </div>

            {/* Menu Hasil Dropdown Pencarian */}
            {searchKeyword.trim() !== "" && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] shadow-lg z-50 overflow-hidden divide-y divide-[#E5E7EB]">
                {searchResults.length === 0 ? (
                  <div className="p-3 text-xs font-mono text-[#6B7280] text-center">
                    Tidak ditemukan peserta dengan kata kunci "{searchKeyword}".
                  </div>
                ) : (
                  searchResults.map((peserta) => (
                    <button
                      key={peserta.id}
                      type="button"
                      onClick={() => {
                        setSelectedParticipant(peserta);
                        setSearchKeyword("");
                      }}
                      className="w-full p-3 text-left hover:bg-[#F5F5F5] transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-normal text-[#111111] block">
                          {peserta.nama}
                        </span>
                        {peserta.email && (
                          <span className="text-[11px] font-mono text-[#6B7280]">
                            {peserta.email}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono uppercase text-[#111111] border border-[#E5E7EB] bg-white px-2 py-0.5 rounded-[2px]">
                        Lihat Pratinjau
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Panel Pratinjau Sertifikat Utama */}
        {errorMessage ? (
          <div className="border border-[#E5E7EB] rounded-md p-12 text-center space-y-3 bg-[#FFFFFF]">
            <IconAlertCircle className="w-8 h-8 text-[#D92D20] mx-auto" />
            <h2 className="text-sm font-medium text-[#111111]">Pemberitahuan</h2>
            <p className="text-xs font-mono text-[#6B7280]">{errorMessage}</p>
          </div>
        ) : selectedParticipant ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#6B7280]">
                  Sertifikat Atas Nama:
                </span>
                <h2 className="text-lg font-normal text-[#111111]">
                  {selectedParticipant.nama}
                </h2>
              </div>

              {/* Aksi Unduh PDF & Laporkan Nama */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="px-3 py-2 text-xs font-mono border border-[#E5E7EB] hover:bg-[#F5F5F5] rounded-[4px] text-[#6B7280] hover:text-[#111111] transition-colors"
                >
                  Ada Typo Nama?
                </button>

                <button
                  type="button"
                  onClick={handleOpenPdfDirectly}
                  disabled={isRenderingPdf}
                  className="px-4 py-2 text-xs font-mono uppercase bg-[#111111] hover:bg-[#333333] text-white rounded-[4px] flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isRenderingPdf ? (
                    <Spinner className="w-3.5 h-3.5" />
                  ) : (
                    <IconDownload className="w-3.5 h-3.5" />
                  )}
                  <span>{isRenderingPdf ? "Menyiapkan PDF..." : "Unduh / Buka PDF"}</span>
                </button>
              </div>
            </div>

            {/* Kotak Render Kanvas Sertifikat Langsung */}
            <div className="border border-[#E5E7EB] rounded-md p-4 sm:p-6 bg-[#F5F5F5] flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
              {isPreviewDrawing && (
                <div className="absolute inset-0 bg-[#FFFFFF]/80 z-20 flex flex-col items-center justify-center gap-2 text-xs font-mono text-[#6B7280]">
                  <Spinner className="w-5 h-5 text-[#111111]" />
                  <span>Merender visual sertifikat...</span>
                </div>
              )}

              <div className="w-full flex justify-end items-center mb-2.5 text-[10px] font-mono text-[#6B7280]">
                <span>Pratinjau Interaktif • 100% Sesuai Cetak</span>
              </div>

              <div className="max-w-full overflow-auto p-1 flex justify-center">
                <canvas
                  ref={canvasRef}
                  className="border border-[#E5E7EB] rounded-[2px] bg-white shadow-md max-w-full h-auto pointer-events-none"
                />
              </div>

              <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-2 mt-4 pt-3 border-t border-[#E5E7EB] text-[10px] font-mono text-[#6B7280]">
                <span>Format: PDF Vektor (Teks Nama Tajam)</span>
                <span>Diproses langsung di memori browser Anda</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-[#E5E7EB] rounded-md p-16 text-center space-y-2 bg-[#F5F5F5]/40">
            <p className="text-xs font-mono text-[#6B7280]">
              Belum ada peserta yang dipilih.
            </p>
            <p className="text-xs text-[#111111]">
              Gunakan kotak pencarian di atas untuk menemukan sertifikat Anda.
            </p>
          </div>
        )}
      </main>

      {/* Modal Laporkan Kesalahan Nama */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md max-w-sm w-full p-6 space-y-4">
            <div className="border-b border-[#E5E7EB] pb-2.5">
              <h3 className="text-sm font-normal text-[#111111]">Laporkan Perbaikan Nama</h3>
              <p className="text-xs text-[#6B7280] font-mono mt-0.5">
                Nama saat ini: <strong className="text-[#111111]">{selectedParticipant?.nama}</strong>
              </p>
            </div>

            {reportSent ? (
              <div className="py-6 text-center text-xs font-mono text-emerald-600 flex flex-col items-center gap-2">
                <IconCheck className="w-6 h-6" />
                <span>Laporan berhasil dikirim ke panitia!</span>
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1">
                    Ejaan Nama yang Benar:
                  </label>
                  <input
                    type="text"
                    required
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder="Contoh: Dr. Budi Santoso, M.Kom."
                    className="w-full text-xs border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-3 py-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] text-[#6B7280] hover:text-[#111111]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-mono uppercase bg-[#111111] hover:bg-[#333333] text-white rounded-[4px]"
                  >
                    Kirim Perbaikan
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { PDFDocument } from "pdf-lib";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  getDocFromCache,
  updateDoc,
  collection,
  getDocs,
  writeBatch,
  deleteDoc,
  addDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";

// Helper batas waktu agar permintaan ke Firestore tidak macet saat jaringan bermasalah
const withTimeout = (promise, ms = 6000, errorMsg = "Koneksi ke Firestore timeout (jaringan terhambat).") => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
};

// Helper ekstraksi berkas PDF murni dari arsip ZIP (metode Stored/uncompressed WASM)
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

  // Fallback: pencarian pola header %PDF- dan trailer %%EOF
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

// Membuka berkas PDF langsung di tab baru peramban
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

const IconSearch = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const IconPlus = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const IconTrash = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const IconDownload = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const IconChevronLeft = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const IconChevronRight = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const IconAlertTriangle = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

export default function EventDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  // Deteksi fleksibel ID event dari parameter path atau URL query string
  const rawParamValue = params?.id || params?.eventId || (params ? Object.values(params)[0] : null);
  const queryParamValue = searchParams?.get("id") || searchParams?.get("eventId");
  const eventId = rawParamValue || queryParamValue;

  // State Data Event & Peserta
  const [eventData, setEventData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [pageSizes, setPageSizes] = useState({ 1: { width: 842, height: 595 } });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  // State Pilihan Checkbox Peserta
  const [selectedIds, setSelectedIds] = useState(new Set());

  // State Pencarian dan Paginasi
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // State Modal Tambah Peserta Manual
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);

  // State Dialog Konfirmasi Hapus Dinamis
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    mode: "single", // "single" | "selected" | "all"
    participantId: null,
    participantName: "",
    isDeleting: false,
  });

  // State Laporan Revisi Nama dari Peserta Publik
  const [revisions, setRevisions] = useState([]);
  const [showRevisionsModal, setShowRevisionsModal] = useState(false);
  const [isProcessingRevision, setIsProcessingRevision] = useState(false);

  // State Bagikan ke Peserta
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSavingShare, setIsSavingShare] = useState(false);
  const [isExportingLinks, setIsExportingLinks] = useState(false);

  // State Pemrosesan Render Wasm Sisi Klien
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(null);

  // State Status Loading & Error Khusus Thumbnail Pratinjau
  const [isThumbnailLoading, setIsThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState("");

  const csvInputRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Cache memori internal untuk menghindari download berulang kali
  const templateBufferCacheRef = useRef({ url: null, buffer: null });
  const fontBytesCacheRef = useRef({ url: null, bytes: null });
  const wasmModuleRef = useRef(null);
  const loadedPdfDocRef = useRef({ url: null, doc: null });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const notify = (text, type = "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: "", type: "" });
    }, 4000);
  };

  // Pengambilan buffer template PDF dengan memori cache (hanya unduh sekali)
  const getCachedTemplateBuffer = async (url) => {
    if (!url) throw new Error("URL template PDF tidak tersedia.");
    if (templateBufferCacheRef.current.url === url && templateBufferCacheRef.current.buffer) {
      return templateBufferCacheRef.current.buffer;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("Gagal mengambil file template PDF dari storage.");
    const buffer = await res.arrayBuffer();
    templateBufferCacheRef.current = { url, buffer };
    return buffer;
  };

  // Pengambilan bytes font kustom dengan memori cache (hanya unduh sekali)
  const getCachedFontBytes = async (url) => {
    if (!url) return null;
    if (fontBytesCacheRef.current.url === url && fontBytesCacheRef.current.bytes) {
      return fontBytesCacheRef.current.bytes;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      const bytes = new Uint8Array(ab);
      fontBytesCacheRef.current = { url, bytes };
      return bytes;
    } catch (e) {
      console.warn("Gagal memuat font cache:", e);
      return null;
    }
  };

  // Inisialisasi modul Rust WASM dengan memoization (hanya compile sekali)
  const getInitializedWasm = async () => {
    if (!wasmModuleRef.current) {
      const wasm = await import("@/rust_wasm/pkg/pdf_cert_wasm.js");
      await wasm.default();
      wasmModuleRef.current = wasm;
    }
    return wasmModuleRef.current;
  };

  const fetchEventAndParticipants = useCallback(async () => {
    if (!user || !eventId) {
      if (!loading && (!user || !eventId)) {
        setIsLoading(false);
        setLoadError("ID Event tidak terdeteksi di URL.");
      }
      return;
    }

    setIsLoading(true);
    setLoadError("");

    try {
      // 1. Ambil data dokumen event utama
      const eventDocRef = doc(db, "events", eventId);
      let eventSnap;
      try {
        eventSnap = await withTimeout(getDoc(eventDocRef), 6000);
      } catch (timeoutErr) {
        console.warn("Fetch Firestore timeout, beralih ke cache lokal...", timeoutErr.message);
        try {
          eventSnap = await getDocFromCache(eventDocRef);
        } catch {
          throw new Error("Gagal menghubungi Firestore dalam 6 detik. Periksa koneksi internet.");
        }
      }

      if (!eventSnap || !eventSnap.exists()) {
        notify("Event tidak ditemukan atau telah dihapus.", "error");
        setLoadError("Dokumen event tidak ditemukan di database.");
        setIsLoading(false);
        return;
      }

      const eventPayload = { id: eventSnap.id, ...eventSnap.data() };

      if (eventPayload.userId && eventPayload.userId !== user.uid) {
        notify("Anda tidak memiliki hak akses ke event ini.", "error");
        setLoadError("Akses ditolak: Dokumen ini bukan milik akun Anda.");
        setIsLoading(false);
        return;
      }

      setEventData(eventPayload);

      // 2. Ambil data peserta dari subkoleksi event
      try {
        const pesertaColRef = collection(db, `events/${eventId}/peserta`);
        const pesertaSnap = await withTimeout(getDocs(pesertaColRef), 5000);

        const list = pesertaSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        list.sort((a, b) => (a.nomorUrut || 0) - (b.nomorUrut || 0));
        setParticipants(list);
        setSelectedIds(new Set());
      } catch (subErr) {
        console.warn("Subkoleksi peserta kosong atau gagal dibaca:", subErr.message);
        setParticipants([]);
      }

      // 3. Ambil data usulan revisi nama dari peserta publik
      try {
        const revisiColRef = collection(db, `events/${eventId}/revisi_nama`);
        const revisiSnap = await getDocs(revisiColRef);
        const revList = revisiSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => r.status !== "approved" && r.status !== "rejected");
        setRevisions(revList);
      } catch (revErr) {
        console.warn("Tidak ada laporan revisi:", revErr);
        setRevisions([]);
      }
    } catch (err) {
      console.error("Gagal memuat data event:", err);
      setLoadError(err.message || "Gagal memuat data event.");
      notify("Gagal: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, eventId, loading]);

  useEffect(() => {
    if (user && eventId) {
      fetchEventAndParticipants();
    }
  }, [user, eventId, fetchEventAndParticipants]);

  // ---- Bagikan ke peserta (akses publik dikendalikan lewat pengaturan di dokumen event) ----
  const sharing = {
    cariMandiri: eventData?.sharing?.cariMandiri === true,
    perPeserta: eventData?.sharing?.perPeserta === true,
    epoch: Number.isInteger(eventData?.sharing?.epoch) ? eventData.sharing.epoch : 1,
  };

  const publicShareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/sertifikat/${eventId}` : "";

  const updateSharing = async (patch, successText) => {
    const next = { ...sharing, ...patch };
    setIsSavingShare(true);
    try {
      await updateDoc(doc(db, "events", eventId), { sharing: next });
      setEventData((prev) => ({ ...prev, sharing: next }));
      if (successText) notify(successText, "success");
    } catch (err) {
      notify("Gagal menyimpan pengaturan berbagi: " + err.message, "error");
    } finally {
      setIsSavingShare(false);
    }
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicShareUrl);
      notify("Tautan pencarian mandiri berhasil disalin.", "success");
    } catch {
      notify("Gagal menyalin. Salin manual dari kolom tautan.", "error");
    }
  };

  const exportParticipantLinks = async () => {
    setIsExportingLinks(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/events/${eventId}/links`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal membuat daftar tautan.");

      const csv =
        "\uFEFF" +
        Papa.unparse(data.links.map((l) => ({ Nama: l.nama, Email: l.email, Tautan: l.url })));
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tautan-peserta-${eventId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify(`Daftar ${data.links.length} tautan peserta berhasil diunduh.`, "success");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setIsExportingLinks(false);
    }
  };

  const resetParticipantLinks = async () => {
    if (!window.confirm("Semua tautan per peserta yang sudah dibagikan akan berhenti berfungsi. Lanjutkan?")) return;
    await updateSharing(
      { epoch: sharing.epoch + 1 },
      "Semua tautan lama dinonaktifkan. Unduh daftar tautan baru untuk dibagikan."
    );
  };
const revokeParticipantLink = async (p) => {
  if (!window.confirm(`Tautan lama ${p.nama} akan berhenti berfungsi dan tautan baru dibuat. Lanjutkan?`)) return;
  try {
    await updateDoc(doc(db, `events/${eventId}/peserta`, p.id), { tv: increment(1) });
    setParticipants((prev) => prev.map((x) => (x.id === p.id ? { ...x, tv: (x.tv || 0) + 1 } : x)));

    const idToken = await user.getIdToken();
    const res = await fetch(`/api/events/${eventId}/links?id=${encodeURIComponent(p.id)}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Gagal membuat tautan baru.");

    const url = data.links[0].url;
    try {
      await navigator.clipboard.writeText(url);
      notify(`Tautan lama ${p.nama} dicabut. Tautan baru disalin.`, "success");
    } catch {
      window.prompt("Tautan lama dicabut. Salin tautan baru:", url);
    }
  } catch (err) {
    notify(err.message, "error");
  }
};
  const renderInterpolatedText = (cfg, row) => {
    if (cfg.is_custom_var) {
      const parts = (cfg.custom_var_values || "").split(",").map((s) => s.trim());
      return parts[0] || `[${cfg.custom_var_name || cfg.column_name}]`;
    }

    if (cfg.static_text !== undefined && cfg.static_text !== "") {
      let text = cfg.static_text;
      if (row) {
        Object.entries(row).forEach(([k, v]) => {
          const valStr = String(v ?? "");
          text = text.replaceAll(`{${k}}`, valStr);
          text = text.replaceAll(`{${k}:uppercase}`, valStr.toUpperCase());
        });
      }
      return text;
    }

    return (row && row[cfg.column_name]) ? String(row[cfg.column_name]) : `[${cfg.column_name}]`;
  };

  // Hanya ambil nama pertama sebagai sampel teks; hindari re-render thumbnail saat daftar peserta bertambah/berubah
  const sampleParticipantName = participants[0]?.nama || "Contoh Nama Peserta";

  useEffect(() => {
    const templateUrl = eventData?.storageRefs?.templatePdf?.url;
    // Jangan proses jika sedang loading global atau template belum diunggah
    if (isLoading || !templateUrl) return;

    let isSubscribed = true;

    const renderThumbnail = async () => {
      // Batalkan render task sebelumnya jika masih berjalan pada kanvas yang sama
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
        renderTaskRef.current = null;
      }

      const canvas = previewCanvasRef.current;
      if (!canvas) return;

      setIsThumbnailLoading(true);
      setThumbnailError("");

      try {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }

        // Ambil array buffer dari cache memori agar tidak terkena CORS Range streaming
        const templateRawBuffer = await getCachedTemplateBuffer(templateUrl);
        if (!isSubscribed) return;

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(templateRawBuffer.slice(0)),
        });
        const pdf = await loadingTask.promise;

        const page = await pdf.getPage(1);
        if (!isSubscribed) return;

        // Ekstrak dimensi halaman asli dari viewport PDF.js
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        setPageSizes((prev) => ({
          ...prev,
          1: { width: unscaledViewport.width, height: unscaledViewport.height },
        }));

        const viewport = page.getViewport({ scale: 0.35 });
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderTask = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;

        if (eventData?.configs && Array.isArray(eventData.configs) && isSubscribed) {
          const sampleRow = participants[0]?.attributes || {
            Nama: sampleParticipantName,
            Email: participants[0]?.email || "peserta@example.com",
          };

          eventData.configs.forEach((cfg) => {
            if (cfg.enabled === false) return;
            if (cfg.page_number && cfg.page_number !== 1) return;

            if (cfg.type === "image" && cfg.data_url) {
              const img = new Image();
              img.onload = () => {
                if (isSubscribed) {
                  ctx.drawImage(
                    img,
                    (cfg.x || 0) * 0.35,
                    (cfg.y || 0) * 0.35,
                    (cfg.max_width || 100) * 0.35,
                    (cfg.height || 60) * 0.35
                  );
                }
              };
              img.src = cfg.data_url;
              return;
            }

            const text = renderInterpolatedText(cfg, sampleRow);
            const fontSizeScaled = Math.round((cfg.font_size || 24) * 0.35);
            ctx.font = `${fontSizeScaled}px sans-serif`;
            ctx.fillStyle = cfg.color || "#111111";
            ctx.textAlign = cfg.align || "left";

            let xPos = (cfg.x || 0) * 0.35;
            if (cfg.align === "center") xPos += ((cfg.max_width || 200) * 0.35) / 2;
            if (cfg.align === "right") xPos += (cfg.max_width || 200) * 0.35;

            const yPos = ((cfg.y || 100) + (cfg.font_size || 24)) * 0.35;
            const lines = String(text || "").split("\n");
            const lineHeight = (cfg.line_height || 1.2) * fontSizeScaled;

            lines.forEach((line, lIdx) => {
              ctx.fillText(line, xPos, yPos + lIdx * lineHeight);
            });
          });
        }
      } catch (err) {
        if (err?.name !== "RenderingCancelledException") {
          console.warn("Pratinjau canvas tidak dapat dimuat:", err?.message || err);
          if (isSubscribed) {
            setThumbnailError("Gagal merender pratinjau desain.");
          }
        }
      } finally {
        if (isSubscribed) {
          setIsThumbnailLoading(false);
        }
      }
    };

    renderThumbnail();

    return () => {
      isSubscribed = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
        renderTaskRef.current = null;
      }
    };
  }, [isLoading, eventData?.storageRefs?.templatePdf?.url, eventData?.configs, sampleParticipantName]);

  const handleImportCsv = (e) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;

    notify("Membaca berkas CSV...", "info");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        if (!rows || rows.length === 0) {
          notify("Berkas CSV tidak memuat data yang valid.", "error");
          return;
        }

        try {
          notify(`Menyimpan ${rows.length} peserta ke database...`, "info");
          const colRef = collection(db, `events/${eventId}/peserta`);
          const currentCount = participants.length;

          // Deteksi dinamis kolom pertama dan kolom email
          const fields = results.meta?.fields || (rows[0] ? Object.keys(rows[0]) : []);
          const firstCol = fields[0] || "Nama";
          const emailCol = fields.find((f) => /email|e-mail|surel|mail/i.test(f)) || "Email";

          const newParticipantsList = [];

          for (let i = 0; i < rows.length; i += 400) {
            const batch = writeBatch(db);
            const chunk = rows.slice(i, i + 400);

            chunk.forEach((row, chunkIdx) => {
              const globalIdx = currentCount + i + chunkIdx + 1;
              const newDocRef = doc(colRef);

              const rawName = row[firstCol] || row.Nama || row.nama || row.NAME || `Peserta ${globalIdx}`;
              const rawEmail = row[emailCol] || row.Email || row.email || "";

              const participantItem = {
                id: newDocRef.id,
                nomorUrut: globalIdx,
                nama: String(rawName).trim(),
                email: String(rawEmail).trim(),
                attributes: row,
                diunduh: false,
                dibuatPada: new Date(),
              };

              batch.set(newDocRef, {
                ...participantItem,
                dibuatPada: serverTimestamp(),
              });

              newParticipantsList.push(participantItem);
            });

            await batch.commit();
          }

          // Sinkronisasi totalPeserta ke dokumen induk
          await updateDoc(doc(db, "events", eventId), {
            totalPeserta: currentCount + rows.length,
            diperbaruiPada: serverTimestamp(),
          });

          // Optimistic UI Update: perbarui state lokal secara langsung tanpa re-read ribuan dokumen dari Firestore
          setParticipants((prev) => [...prev, ...newParticipantsList]);
          setEventData((prev) => ({
            ...prev,
            totalPeserta: (prev?.totalPeserta || 0) + rows.length,
          }));

          notify(`Berhasil mengimpor ${rows.length} peserta baru.`, "success");
        } catch (err) {
          console.error("Gagal impor CSV:", err);
          notify("Gagal mengimpor data peserta: " + err.message, "error");
        }
      },
      error: (err) => {
        notify("Gagal membaca CSV: " + err.message, "error");
      },
    });

    e.target.value = "";
  };

  const handleAddManualParticipant = async (e) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    setIsAddingParticipant(true);
    try {
      const colRef = collection(db, `events/${eventId}/peserta`);
      const nextNumber = participants.length + 1;

      const newParticipantData = {
        nomorUrut: nextNumber,
        nama: manualName.trim(),
        email: manualEmail.trim(),
        attributes: {
          Nama: manualName.trim(),
          Email: manualEmail.trim(),
        },
        diunduh: false,
        dibuatPada: new Date(),
      };

      const docRef = await addDoc(colRef, {
        ...newParticipantData,
        dibuatPada: serverTimestamp(),
      });

      await updateDoc(doc(db, "events", eventId), {
        totalPeserta: increment(1),
        diperbaruiPada: serverTimestamp(),
      });

      // Optimistic update
      setParticipants((prev) => [...prev, { id: docRef.id, ...newParticipantData }]);
      setEventData((prev) => ({ ...prev, totalPeserta: (prev?.totalPeserta || 0) + 1 }));

      setManualName("");
      setManualEmail("");
      setShowAddModal(false);
      notify("Peserta berhasil ditambahkan.", "success");
    } catch (err) {
      console.error("Gagal menambah peserta:", err);
      notify("Gagal menambah peserta: " + err.message, "error");
    } finally {
      setIsAddingParticipant(false);
    }
  };

  const confirmDeleteSingleParticipant = async () => {
    const { participantId } = deleteDialog;
    if (!participantId) return;

    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));
    try {
      await deleteDoc(doc(db, `events/${eventId}/peserta`, participantId));
      await updateDoc(doc(db, "events", eventId), {
        totalPeserta: increment(-1),
        diperbaruiPada: serverTimestamp(),
      });

      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
      setEventData((prev) => ({
        ...prev,
        totalPeserta: Math.max(0, (prev?.totalPeserta || 1) - 1),
      }));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(participantId);
        return next;
      });
      notify("Peserta berhasil dihapus.", "success");
      setDeleteDialog({ isOpen: false, mode: "single", participantId: null, participantName: "", isDeleting: false });
    } catch (err) {
      notify("Gagal menghapus peserta: " + err.message, "error");
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const confirmDeleteSelectedParticipants = async () => {
    if (!eventId || selectedIds.size === 0) return;

    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));
    try {
      notify(`Menghapus ${selectedIds.size} peserta terpilih...`, "info");
      const idsToDelete = Array.from(selectedIds);

      for (let i = 0; i < idsToDelete.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = idsToDelete.slice(i, i + 400);
        chunk.forEach((id) => {
          batch.delete(doc(db, `events/${eventId}/peserta`, id));
        });
        await batch.commit();
      }

      const count = idsToDelete.length;
      await updateDoc(doc(db, "events", eventId), {
        totalPeserta: increment(-count),
        diperbaruiPada: serverTimestamp(),
      });

      setParticipants((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setEventData((prev) => ({
        ...prev,
        totalPeserta: Math.max(0, (prev?.totalPeserta || count) - count),
      }));
      setSelectedIds(new Set());
      notify(`Berhasil menghapus ${count} peserta.`, "success");
      setDeleteDialog({ isOpen: false, mode: "single", participantId: null, participantName: "", isDeleting: false });
    } catch (err) {
      console.error("Gagal menghapus peserta terpilih:", err);
      notify("Gagal menghapus data: " + err.message, "error");
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const confirmDeleteAllParticipants = async () => {
    if (!eventId) return;

    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));
    try {
      notify("Mengosongkan seluruh data peserta event...", "info");
      const colRef = collection(db, `events/${eventId}/peserta`);
      const snap = await getDocs(colRef);
      const docs = snap.docs;

      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      await updateDoc(doc(db, "events", eventId), {
        totalPeserta: 0,
        diperbaruiPada: serverTimestamp(),
      });

      setParticipants([]);
      setEventData((prev) => ({ ...prev, totalPeserta: 0 }));
      setSelectedIds(new Set());
      notify("Seluruh data peserta berhasil dibersihkan.", "success");
      setDeleteDialog({ isOpen: false, mode: "single", participantId: null, participantName: "", isDeleting: false });
    } catch (err) {
      console.error("Gagal mengosongkan peserta:", err);
      notify("Gagal mengosongkan data: " + err.message, "error");
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleConfirmDelete = () => {
    if (deleteDialog.mode === "all") {
      confirmDeleteAllParticipants();
    } else if (deleteDialog.mode === "selected") {
      confirmDeleteSelectedParticipants();
    } else {
      confirmDeleteSingleParticipant();
    }
  };

  // Menyetujui dan langsung menerapkan nama baru peserta ke database
  const handleApproveRevision = async (rev) => {
    setIsProcessingRevision(true);
    try {
      // 1. Update nama pada dokumen peserta
      const pesertaRef = doc(db, `events/${eventId}/peserta`, rev.participantId);
      await updateDoc(pesertaRef, {
        nama: rev.namaBaru,
        "attributes.Nama": rev.namaBaru,
        diperbaruiPada: serverTimestamp(),
      });

      // 2. Hapus atau update status di subkoleksi revisi
      await deleteDoc(doc(db, `events/${eventId}/revisi_nama`, rev.id));

      // 3. Optimistic UI update
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === rev.participantId
            ? { ...p, nama: rev.namaBaru, attributes: { ...(p.attributes || {}), Nama: rev.namaBaru } }
            : p
        )
      );
      setRevisions((prev) => prev.filter((r) => r.id !== rev.id));
      notify(`Nama berhasil diperbarui menjadi "${rev.namaBaru}".`, "success");
    } catch (err) {
      console.error("Gagal menyetujui revisi:", err);
      notify("Gagal memperbarui nama: " + err.message, "error");
    } finally {
      setIsProcessingRevision(false);
    }
  };

  // Menolak laporan perbaikan nama
  const handleRejectRevision = async (revId) => {
    try {
      await deleteDoc(doc(db, `events/${eventId}/revisi_nama`, revId));
      setRevisions((prev) => prev.filter((r) => r.id !== revId));
      notify("Laporan perbaikan telah diabaikan.", "info");
    } catch (err) {
      notify("Gagal menolak revisi: " + err.message, "error");
    }
  };

  // Filter pencarian peserta berdasarkan nama atau email
  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return participants;
    const queryLower = searchQuery.toLowerCase().trim();
    return participants.filter(
      (p) =>
        (p.nama && p.nama.toLowerCase().includes(queryLower)) ||
        (p.email && p.email.toLowerCase().includes(queryLower))
    );
  }, [participants, searchQuery]);

  const totalFilteredPages = Math.max(1, Math.ceil(filteredParticipants.length / pageSize));

  // Ambil hanya subset peserta halaman aktif untuk rendering tabel DOM super cepat
  const paginatedParticipants = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredParticipants.slice(startIdx, startIdx + pageSize);
  }, [filteredParticipants, currentPage, pageSize]);

  // Reset ke halaman 1 jika filter pencarian diubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  const toggleSelectAll = () => {
    const allFilteredSelected =
      filteredParticipants.length > 0 &&
      filteredParticipants.every((p) => selectedIds.has(p.id));

    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredParticipants.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildFormattedConfigs = (rawConfigs) => {
    return (rawConfigs || [])
      .filter((c) => c.enabled !== false && c.type !== "image")
      .map((c) => {
        const page = c.page_number || 1;
        const size = pageSizes[page] || { height: 595 };
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
  };

  const bakeImagesIntoPdf = async (baseArrayBuffer, rawConfigs) => {
    const imageConfigs = (rawConfigs || []).filter((c) => c.enabled !== false && c.type === "image" && c.data_url);
    if (imageConfigs.length === 0) {
      return new Uint8Array(baseArrayBuffer);
    }

    const pdfDocLib = await PDFDocument.load(baseArrayBuffer);

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

  const handleDownloadSingle = async (peserta) => {
    const templateUrl = eventData?.storageRefs?.templatePdf?.url;
    if (!templateUrl) {
      notify("Template PDF belum diunggah. Silakan klik 'Edit Desain' untuk mengatur template.", "error");
      return;
    }

    try {
      notify(`Merender pratinjau PDF ${peserta.nama}...`, "info");

      // Gunakan buffer template yang tersimpan di memori cache (tanpa re-fetch)
      const templateRawBuffer = await getCachedTemplateBuffer(templateUrl);
      const templateUint8 = await bakeImagesIntoPdf(templateRawBuffer, eventData.configs);

      // Gunakan bytes font yang tersimpan di memori cache
      const fontBytes = await getCachedFontBytes(eventData.storageRefs?.customFont?.url);

      // Gunakan instance WASM yang sudah diinisialisasi
      const wasm = await getInitializedWasm();

      const rowPayload = [peserta.attributes || { Nama: peserta.nama, Email: peserta.email || "" }];
      const formattedConfigs = buildFormattedConfigs(eventData.configs);

      const zipBytes = wasm.generate_certificates_chunk(
        templateUint8,
        rowPayload,
        formattedConfigs,
        (peserta.nomorUrut || 1) - 1,
        fontBytes || undefined,
        eventData.filenamePattern || "sertifikat_{Nama}_{index}"
      );

      // Ekstraksi berkas PDF murni dan buka langsung di tab baru
      const pdfBytes = extractPdfFromZip(zipBytes);
      openPdfInNewTab(pdfBytes);

      notify(`Pratinjau PDF ${peserta.nama} berhasil dibuka di tab baru.`, "success");
    } catch (err) {
      console.error("Gagal render sertifikat satuan:", err);
      notify("Gagal membuka pratinjau PDF: " + err.message, "error");
    }
  };

  const handlePreviewSample = async () => {
    const sampleRow = participants[0] || {
      nama: sampleParticipantName,
      email: "peserta@example.com",
      attributes: {
        Nama: sampleParticipantName,
        Email: "peserta@example.com",
      },
    };
    await handleDownloadSingle(sampleRow);
  };

  const handleDownloadSelectedBatch = async () => {
    if (selectedIds.size === 0) return;

    const templateUrl = eventData?.storageRefs?.templatePdf?.url;
    if (!templateUrl) {
      notify("Template PDF belum dikonfigurasi. Atur template terlebih dahulu di Studio.", "error");
      return;
    }

    const selectedList = participants.filter((p) => selectedIds.has(p.id));
    setIsRendering(true);
    setRenderProgress({ current: 0, total: selectedList.length });

    try {
      notify(`Mempersiapkan batch untuk ${selectedList.length} peserta...`, "info");

      // Mengambil berkas dari cache memori
      const templateRawBuffer = await getCachedTemplateBuffer(templateUrl);
      const templateUint8 = await bakeImagesIntoPdf(templateRawBuffer, eventData.configs);
      const fontBytes = await getCachedFontBytes(eventData.storageRefs?.customFont?.url);

      const rows = selectedList.map((p) => p.attributes || { Nama: p.nama, Email: p.email || "" });
      const formattedConfigs = buildFormattedConfigs(eventData.configs);

      const worker = new Worker(new URL("../../cetak-lokal/pdfWorker.js", import.meta.url));

      worker.postMessage(
        {
          templateUint8,
          groupName: "terpilih",
          rows,
          startOffset: 0,
          configs: formattedConfigs,
          fontBytes: fontBytes || undefined,
          filenamePattern: eventData.filenamePattern || "sertifikat_{Nama}_{index}",
        },
        [templateUint8.buffer]
      );

      worker.onmessage = (e) => {
        const { type, zipBytes, error } = e.data;
        if (type === "BATCH_COMPLETE") {
          const blob = new Blob([zipBytes], { type: "application/zip" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `batch_sertifikat_${selectedList.length}_peserta_${Date.now()}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          setIsRendering(false);
          setRenderProgress(null);
          worker.terminate();
          notify(`Berhasil mengunduh ${selectedList.length} sertifikat dalam berkas ZIP.`, "success");
        } else if (type === "ERROR") {
          worker.terminate();
          setIsRendering(false);
          setRenderProgress(null);
          notify("Terjadi kesalahan pada worker: " + error, "error");
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        setIsRendering(false);
        setRenderProgress(null);
        notify("Worker crash: " + err.message, "error");
      };
    } catch (err) {
      console.error("Gagal eksekusi batch:", err);
      notify("Gagal memulai batch rendering: " + err.message, "error");
      setIsRendering(false);
      setRenderProgress(null);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center p-6 text-[#111111]">
        <div className="max-w-md w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-6 text-center space-y-4">
          <div className="w-10 h-10 mx-auto bg-[#F5F5F5] text-[#D92D20] border border-[#E5E7EB] rounded-full flex items-center justify-center font-mono font-medium text-lg">
            !
          </div>
          <h2 className="text-sm font-medium text-[#111111]">Kendala Memuat Event</h2>
          <p className="text-xs font-mono text-[#6B7280] bg-[#F5F5F5] p-3 rounded-[4px] text-left break-words">
            {loadError}
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={() => fetchEventAndParticipants()}
              className="bg-[#111111] hover:bg-[#333333] text-white text-xs font-mono px-4 py-2 rounded-[4px] transition-colors"
            >
              Coba Muat Ulang
            </button>
            <Link
              href="/dashboard"
              className="border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#111111] text-xs font-mono px-4 py-2 rounded-[4px] transition-colors"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex flex-col items-center justify-center font-mono text-xs text-[#6B7280] space-y-3">
        <div className="w-5 h-5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
        <p>Memuat data acara dan daftar peserta...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#111111] font-sans antialiased pb-20">
      {statusMessage.text && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-[4px] border text-xs font-mono transition-all duration-150 ${
            statusMessage.type === "error"
              ? "bg-[#FFFFFF] text-[#D92D20] border-[#D92D20]"
              : statusMessage.type === "success"
              ? "bg-[#111111] text-[#FFFFFF] border-[#111111]"
              : "bg-[#FFFFFF] text-[#111111] border-[#E5E7EB]"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Header Navigasi */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF]/90 border-b border-[#E5E7EB] backdrop-blur-md px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/dashboard" className="text-sm font-medium tracking-tight text-[#111111] hover:text-[#6B7280] transition-colors">
            SertiGen
          </Link>
          <span className="text-[#B0B6C3]">/</span>
          <Link href="/dashboard" className="text-xs font-mono text-[#6B7280] uppercase tracking-wider hover:text-[#111111] transition-colors">
            Event
          </Link>
          <span className="text-[#B0B6C3]">/</span>
          <span className="text-xs font-mono font-medium text-[#111111] truncate max-w-xs">
            {eventData?.namaEvent || "Detail Acara"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="px-3 py-1.5 border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#111111] text-xs font-mono uppercase rounded-[4px] transition-colors flex items-center gap-1.5"
            title="Atur cara peserta mengakses sertifikatnya"
          >
            <span>Bagikan ke Peserta</span>
            {(sharing.cariMandiri || sharing.perPeserta) && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          <Link
            href={`/dashboard/cetak-lokal?eventId=${eventId}`}
            className="px-3.5 py-1.5 bg-[#111111] hover:bg-[#333333] text-white text-xs font-mono uppercase rounded-[4px] transition-colors flex items-center gap-1.5"
          >
            <span>Edit Desain di Studio</span>
          </Link>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="max-w-[1200px] mx-auto px-6 pt-10 space-y-10">
        {/* Ringkasan Acara & Pratinjau Desain */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-6 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase bg-[#F5F5F5] text-[#111111] px-2 py-0.5 rounded-[2px] border border-[#E5E7EB]">
                  {eventData?.tanggalEvent || "Tanpa Tanggal"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-light tracking-[-0.5px] text-[#111111] mt-3">
                {eventData?.namaEvent}
              </h1>

              <div className="mt-4 pt-4 border-t border-[#E5E7EB] grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono text-[#6B7280]">
                <div>
                  <span className="block text-[10px] uppercase text-[#6B7280]">Total Peserta</span>
                  <strong className="text-sm font-normal text-[#111111] mt-0.5 block">
                    {participants.length} Orang
                  </strong>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[#6B7280]">Elemen Desain</span>
                  <strong className="text-sm font-normal text-[#111111] mt-0.5 block">
                    {eventData?.configs?.length || 0} Elemen
                  </strong>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[#6B7280]">Template PDF</span>
                  <strong className="text-sm font-normal text-[#111111] mt-0.5 block">
                    {eventData?.storageRefs?.templatePdf?.url ? "Tersimpan" : "Belum diatur"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Aksi Cepat Impor, Tambah, dan Bersihkan */}
            <div className="pt-4 border-t border-[#E5E7EB] flex flex-wrap items-center gap-2.5">
              <input
                type="file"
                ref={csvInputRef}
                accept=".csv"
                onChange={handleImportCsv}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="px-3.5 py-2 text-xs font-mono uppercase bg-[#111111] hover:bg-[#333333] text-white rounded-[4px] transition-colors flex items-center gap-1.5"
              >
                <span>Impor CSV Peserta</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 text-xs font-mono uppercase border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#111111] rounded-[4px] transition-colors flex items-center gap-1.5"
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>Tambah Manual</span>
              </button>

              {}
              {revisions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRevisionsModal(true)}
                  className="px-3 py-2 text-xs font-mono uppercase border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-[4px] transition-colors flex items-center gap-1.5"
                  title="Lihat permintaan perbaikan ejaan nama dari peserta"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Revisi Nama ({revisions.length})</span>
                </button>
              )}

              {participants.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setDeleteDialog({
                      isOpen: true,
                      mode: "all",
                      participantId: null,
                      participantName: "",
                      isDeleting: false,
                    })
                  }
                  className="px-3 py-2 text-xs font-mono uppercase border border-transparent hover:border-[#E5E7EB] text-[#6B7280] hover:text-[#D92D20] rounded-[4px] transition-colors"
                  title="Hapus semua peserta agar bisa impor ulang berkas CSV"
                >
                  Kosongkan Data
                </button>
              )}

              <Link
                href={`/dashboard/cetak-lokal?eventId=${eventId}`}
                className="ml-auto text-xs font-mono text-[#6B7280] hover:text-[#111111] transition-colors underline underline-offset-2"
              >
                Buka di Canvas Studio →
              </Link>
            </div>
          </div>

          {/* Kotak Pratinjau Desain */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-4 flex flex-col items-center justify-between text-center">
            {}
            <div className="w-full flex items-center justify-between border-b border-[#E5E7EB] pb-2 text-[10px] font-mono uppercase text-[#6B7280]">
              <span>Pratinjau Desain</span>
              {eventData?.storageRefs?.templatePdf?.url && (
                <button
                  type="button"
                  onClick={handlePreviewSample}
                  className="hover:text-[#111111] transition-colors underline flex items-center gap-1 cursor-pointer"
                  title="Buka pratinjau dokumen PDF di tab baru"
                >
                  <span>Buka PDF ↗</span>
                </button>
              )}
            </div>

            <div className="my-auto py-3 w-full flex items-center justify-center">
              {eventData?.storageRefs?.templatePdf?.url ? (
                <div className="relative border border-[#E5E7EB] rounded-[2px] overflow-hidden min-h-[140px] max-h-44 w-full flex items-center justify-center bg-[#F5F5F5] shadow-xs">
                  {isThumbnailLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F5F5F5]/85 z-10 font-mono text-[10px] text-[#6B7280] space-y-1.5">
                      <div className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                      <span>Memuat pratinjau...</span>
                    </div>
                  )}

                  {thumbnailError ? (
                    <div className="p-4 text-center space-y-2">
                      <p className="text-[11px] font-mono text-[#D92D20]">{thumbnailError}</p>
                      <Link
                        href={`/dashboard/cetak-lokal?eventId=${eventId}`}
                        className="text-[10px] font-mono underline text-[#111111] block"
                      >
                        Buka di Studio
                      </Link>
                    </div>
                  ) : null}

                  <canvas ref={previewCanvasRef} className="max-w-full h-auto pointer-events-none" />
                </div>
              ) : (
                <div className="border border-dashed border-[#E5E7EB] rounded-md p-6 w-full text-center space-y-2 bg-[#F5F5F5]/40">
                  <p className="text-xs text-[#6B7280] font-mono">Template PDF belum diatur</p>
                  <Link
                    href={`/dashboard/cetak-lokal?eventId=${eventId}`}
                    className="text-xs font-mono text-[#111111] underline underline-offset-2 block"
                  >
                    Atur Template di Studio →
                  </Link>
                </div>
              )}
            </div>

            <span className="text-[10px] font-mono text-[#6B7280]">
              Format: {eventData?.filenamePattern || "sertifikat_{Nama}_{index}"}
            </span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md overflow-hidden">
          {/* Bar Kontrol Tabel: Pencarian, Seleksi, dan Aksi Batch */}
          <div className="p-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4 bg-[#FFFFFF]">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <div className="relative w-full max-w-xs">
                <IconSearch className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Cari nama atau email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-[#E5E7EB] rounded-[4px] outline-none focus:border-[#111111] transition-colors"
                />
              </div>

              <span className="text-xs font-mono text-[#6B7280] shrink-0">
                {filteredParticipants.length} dari {participants.length} data
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {selectedIds.size > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteDialog({
                        isOpen: true,
                        mode: "selected",
                        participantId: null,
                        participantName: "",
                        isDeleting: false,
                      })
                    }
                    className="px-3 py-1.5 border border-[#E5E7EB] text-[#D92D20] hover:bg-[#F5F5F5] text-xs font-mono uppercase rounded-[4px] transition-colors"
                  >
                    Hapus Terpilih ({selectedIds.size})
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSelectedBatch}
                    disabled={isRendering}
                    className="px-3.5 py-1.5 bg-[#111111] hover:bg-[#333333] text-white text-xs font-mono uppercase rounded-[4px] flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isRendering ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <IconDownload className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isRendering
                        ? `Merender (${renderProgress?.current || 0}/${renderProgress?.total || 0})...`
                        : `Unduh ZIP (${selectedIds.size})`}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Isi Tabel Peserta */}
          {participants.length === 0 ? (
            <div className="p-16 text-center text-xs font-mono text-[#6B7280] space-y-3">
              <p>Belum ada data peserta untuk acara ini.</p>
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="text-xs font-mono text-[#111111] underline underline-offset-2"
              >
                Klik di sini untuk mengimpor berkas CSV
              </button>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-[#6B7280]">
              Tidak ditemukan data peserta yang cocok dengan kata kunci "{searchQuery}".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F5F5F5] text-[#6B7280] font-mono text-[11px] uppercase tracking-wider">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredParticipants.length > 0 &&
                          filteredParticipants.every((p) => selectedIds.has(p.id))
                        }
                        onChange={toggleSelectAll}
                        className="cursor-pointer accent-[#111111]"
                      />
                    </th>
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3">Nama Lengkap</th>
                    <th className="p-3">Email Kontak</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {paginatedParticipants.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-[#F5F5F5]/60 transition-colors">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelectOne(p.id)}
                          className="cursor-pointer accent-[#111111]"
                        />
                      </td>
                      <td className="p-3 text-center font-mono text-[#6B7280]">
                        {p.nomorUrut || (currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="p-3 font-normal text-[#111111]">
                        {p.nama}
                      </td>
                      <td className="p-3 text-[#6B7280] font-mono">
                        {p.email || "-"}
                      </td>
                      {}
                      <td className="p-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(p)}
                          className="px-2.5 py-1 bg-[#FFFFFF] border border-[#E5E7EB] hover:border-[#111111] text-[#111111] rounded-[3px] font-mono text-[11px] uppercase transition-colors"
                          title="Buka PDF peserta di tab baru"
                        >
                          Pratinjau PDF
                        </button>

                        {sharing.perPeserta && (
                          <button
                            type="button"
                            onClick={() => revokeParticipantLink(p)}
                            className="px-2 py-1 text-[#6B7280] hover:text-[#111111] font-mono text-[11px] uppercase transition-colors"
                            title="Cabut tautan lama peserta ini dan buat tautan baru"
                          >
                            Cabut Tautan
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteDialog({
                              isOpen: true,
                              mode: "single",
                              participantId: p.id,
                              participantName: p.nama,
                              isDeleting: false,
                            })
                          }
                          className="px-2 py-1 text-[#6B7280] hover:text-[#D92D20] font-mono text-[11px] uppercase transition-colors"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredParticipants.length > 0 && (
            <div className="p-3.5 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 text-xs font-mono bg-[#FFFFFF]">
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280]">Tampilkan:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="p-1 border border-[#E5E7EB] rounded-[3px] bg-[#FFFFFF] text-[#111111] outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-[#6B7280] ml-1">
                  Baris {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, filteredParticipants.length)} dari{" "}
                  {filteredParticipants.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-[#E5E7EB] rounded-[3px] text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F5F5] transition-colors disabled:opacity-30"
                  title="Halaman Sebelumnya"
                >
                  <IconChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="px-2 text-[#111111] tabular-nums">
                  {currentPage} / {totalFilteredPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalFilteredPages, p + 1))}
                  disabled={currentPage >= totalFilteredPages}
                  className="p-1.5 border border-[#E5E7EB] rounded-[3px] text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F5F5] transition-colors disabled:opacity-30"
                  title="Halaman Selanjutnya"
                >
                  <IconChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md max-w-sm w-full p-6 space-y-4">
            <div className="border-b border-[#E5E7EB] pb-2.5">
              <h3 className="text-sm font-normal text-[#111111]">Tambah Peserta Manual</h3>
              <p className="text-xs text-[#6B7280] font-mono mt-0.5">
                Masukkan data nama dan kontak peserta secara langsung.
              </p>
            </div>

            <form onSubmit={handleAddManualParticipant} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full text-xs border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  placeholder="budi@example.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full text-xs font-mono border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111] transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F5F5] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingParticipant}
                  className="px-4 py-1.5 text-xs font-mono uppercase bg-[#111111] hover:bg-[#333333] text-white rounded-[4px] transition-colors disabled:opacity-40"
                >
                  {isAddingParticipant ? "Menyimpan..." : "Simpan Peserta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteDialog.isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#F5F5F5] text-[#D92D20] border border-[#E5E7EB] rounded-[4px] shrink-0">
                <IconAlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-normal text-[#D92D20]">
                  {deleteDialog.mode === "all"
                    ? "Kosongkan Seluruh Peserta?"
                    : deleteDialog.mode === "selected"
                    ? `Hapus ${selectedIds.size} Peserta Terpilih?`
                    : "Hapus Peserta?"}
                </h3>
                <p className="text-xs text-[#6B7280] leading-relaxed mt-1">
                  {deleteDialog.mode === "all" ? (
                    <>
                      Apakah Anda yakin ingin mengosongkan seluruh{" "}
                      <strong className="text-[#111111]">{participants.length} data peserta</strong> dari acara ini? Tindakan ini tidak dapat dibatalkan.
                    </>
                  ) : deleteDialog.mode === "selected" ? (
                    <>
                      Apakah Anda yakin ingin menghapus{" "}
                      <strong className="text-[#111111]">{selectedIds.size} peserta</strong> yang dipilih?
                    </>
                  ) : (
                    <>
                      Apakah Anda yakin ingin menghapus peserta{" "}
                      <strong className="text-[#111111]">{deleteDialog.participantName}</strong>?
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                disabled={deleteDialog.isDeleting}
                onClick={() =>
                  setDeleteDialog({
                    isOpen: false,
                    mode: "single",
                    participantId: null,
                    participantName: "",
                    isDeleting: false,
                  })
                }
                className="px-3.5 py-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F5F5] transition-colors disabled:opacity-40"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteDialog.isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-mono uppercase bg-[#D92D20] hover:bg-[#D92D20]/90 text-white rounded-[4px] transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {deleteDialog.isDeleting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : deleteDialog.mode === "all" ? (
                  "Kosongkan Semua"
                ) : (
                  "Hapus"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {/* Modal Daftar Laporan Revisi Nama dari Peserta */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-sm font-medium text-[#111111]">Bagikan ke Peserta</h3>
                <p className="text-xs text-[#6B7280] font-mono mt-0.5">
                  Secara default peserta tidak bisa mengakses apa pun. Aktifkan opsi yang Anda perlukan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-xs font-mono text-[#6B7280] hover:text-[#111111]"
              >
                Tutup
              </button>
            </div>

            {/* Opsi 1: pencarian mandiri */}
            <div className="border border-[#E5E7EB] rounded-[4px] p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={sharing.cariMandiri}
                  disabled={isSavingShare}
                  onChange={(e) =>
                    updateSharing(
                      { cariMandiri: e.target.checked },
                      e.target.checked ? "Pencarian mandiri diaktifkan." : "Pencarian mandiri dinonaktifkan."
                    )
                  }
                />
                <span>
                  <span className="block text-sm text-[#111111]">Pencarian mandiri (satu tautan untuk semua)</span>
                  <span className="block text-xs text-[#6B7280] mt-0.5 leading-relaxed">
                    Peserta mengetik nama mereka sendiri lalu mengunduh sertifikat. Hasil pencarian hanya menampilkan
                    nama, tanpa email. <strong className="text-[#111111] font-medium">Siapa pun yang memegang tautan ini
                    dapat mencari dan mengunduh sertifikat semua peserta.</strong>
                  </span>
                </span>
              </label>
              {sharing.cariMandiri && (
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={publicShareUrl}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 text-xs font-mono border border-[#E5E7EB] rounded-[4px] px-2.5 py-2 bg-[#F5F5F5] text-[#111111]"
                  />
                  <button
                    type="button"
                    onClick={copyShareUrl}
                    className="px-3 py-2 text-xs font-mono uppercase bg-[#111111] hover:bg-[#333333] text-white rounded-[4px]"
                  >
                    Salin
                  </button>
                </div>
              )}
            </div>

            {/* Opsi 2: tautan per peserta */}
            <div className="border border-[#E5E7EB] rounded-[4px] p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={sharing.perPeserta}
                  disabled={isSavingShare}
                  onChange={(e) =>
                    updateSharing(
                      { perPeserta: e.target.checked },
                      e.target.checked ? "Tautan per peserta diaktifkan." : "Tautan per peserta dinonaktifkan."
                    )
                  }
                />
                <span>
                  <span className="block text-sm text-[#111111]">Tautan per peserta</span>
                  <span className="block text-xs text-[#6B7280] mt-0.5 leading-relaxed">
                    Setiap peserta mendapat tautan unik yang hanya membuka sertifikatnya sendiri. Unduh daftar tautan
                    (CSV) untuk dikirim lewat email atau WhatsApp. Tautan tidak bisa menampilkan sertifikat peserta lain.
                  </span>
                </span>
              </label>
              {sharing.perPeserta && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportParticipantLinks}
                    disabled={isExportingLinks || participants.length === 0}
                    className="px-3 py-2 text-xs font-mono uppercase bg-[#111111] hover:bg-[#333333] text-white rounded-[4px] disabled:opacity-50"
                  >
                    {isExportingLinks ? "Menyiapkan..." : "Unduh Daftar Tautan (CSV)"}
                  </button>
                  <button
                    type="button"
                    onClick={resetParticipantLinks}
                    disabled={isSavingShare}
                    className="px-3 py-2 text-xs font-mono border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#6B7280] hover:text-[#111111] rounded-[4px] disabled:opacity-50"
                  >
                    Reset Semua Tautan
                  </button>
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#6B7280] font-mono leading-relaxed">
              Menonaktifkan opsi akan langsung menutup akses lewat tautan yang sudah dibagikan.
            </p>
          </div>
        </div>
      )}

      {showRevisionsModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-sm font-medium text-[#111111]">Laporan Revisi Ejaan Nama</h3>
                <p className="text-xs text-[#6B7280] font-mono mt-0.5">
                  Permintaan perbaikan nama yang diajukan oleh peserta melalui link publik.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRevisionsModal(false)}
                className="text-xs font-mono text-[#6B7280] hover:text-[#111111]"
              >
                Tutup ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#E5E7EB] pr-1">
              {revisions.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-[#6B7280]">
                  Semua laporan perbaikan nama telah diproses.
                </div>
              ) : (
                revisions.map((rev) => (
                  <div key={rev.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-200 line-through">
                          {rev.namaLama}
                        </span>
                        <span className="text-[#6B7280]">→</span>
                        <strong className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {rev.namaBaru}
                        </strong>
                      </div>
                      {rev.email && (
                        <p className="text-[10px] font-mono text-[#6B7280] truncate">
                          Email: {rev.email}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isProcessingRevision}
                        onClick={() => handleRejectRevision(rev.id)}
                        className="px-2.5 py-1 text-[11px] font-mono rounded-[3px] border border-[#E5E7EB] text-[#6B7280] hover:text-red-600 hover:bg-[#F5F5F5] transition-colors"
                      >
                        Abaikan
                      </button>
                      <button
                        type="button"
                        disabled={isProcessingRevision}
                        onClick={() => handleApproveRevision(rev)}
                        className="px-3 py-1 text-[11px] font-mono uppercase bg-[#111111] hover:bg-[#333333] text-white rounded-[3px] transition-colors disabled:opacity-40"
                      >
                        Terapkan
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#E5E7EB] flex justify-end">
              <button
                type="button"
                onClick={() => setShowRevisionsModal(false)}
                className="px-4 py-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] text-[#111111] hover:bg-[#F5F5F5]"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
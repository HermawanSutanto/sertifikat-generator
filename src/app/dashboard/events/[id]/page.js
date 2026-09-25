"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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

// Helper batas waktu agar Firestore query tidak menggantung
const withTimeout = (promise, ms = 6000, errorMsg = "Koneksi ke Firestore timeout (jaringan terhambat).") => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
};

export default function EventDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  // Deteksi fleksibel ID event dari params maupun query
  const rawParamValue = params?.id || params?.eventId || (params ? Object.values(params)[0] : null);
  const queryParamValue = searchParams?.get("id") || searchParams?.get("eventId");
  const eventId = rawParamValue || queryParamValue;

  // State Event & Peserta
  const [eventData, setEventData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [pageSizes, setPageSizes] = useState({ 1: { width: 842, height: 595 } });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  // State Pilihan Checkbox Peserta
  const [selectedIds, setSelectedIds] = useState(new Set());

  // State Modal Tambah Peserta Manual
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);

  // State Dialog Konfirmasi Hapus
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    participantId: null,
    participantName: "",
  });

  // State Rendering Wasm Client-Side
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(null);

  // Refs
  const csvInputRef = useRef(null);
  const previewCanvasRef = useRef(null);

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
      // 1. Ambil dokumen induk event
      const eventDocRef = doc(db, "events", eventId);
      let eventSnap;
      try {
        eventSnap = await withTimeout(getDoc(eventDocRef), 6000);
      } catch (timeoutErr) {
        console.warn("Fetch Firestore timeout, mencoba mengambil dari cache...", timeoutErr.message);
        try {
          eventSnap = await getDocFromCache(eventDocRef);
        } catch {
          throw new Error("Gagal menghubungi server Firestore dalam 6 detik. Periksa koneksi internet atau Rules.");
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

      // 2. Ambil ukuran dimensi halaman PDF dari Supabase Storage jika ada
      if (eventPayload.storageRefs?.templatePdf?.url) {
        try {
          const res = await fetch(eventPayload.storageRefs.templatePdf.url);
          if (res.ok) {
            const ab = await res.arrayBuffer();
            const pdfDoc = await PDFDocument.load(ab);
            const sizes = {};
            pdfDoc.getPages().forEach((p, idx) => {
              const { width, height } = p.getSize();
              sizes[idx + 1] = { width, height };
            });
            setPageSizes(sizes);
          }
        } catch (e) {
          console.warn("Gagal membaca ukuran halaman PDF:", e);
        }
      }

      // 3. Ambil data subkoleksi peserta
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
        console.warn("Subkoleksi peserta kosong:", subErr.message);
        setParticipants([]);
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

  useEffect(() => {
    if (!eventData?.storageRefs?.templatePdf?.url || !previewCanvasRef.current) return;

    let isSubscribed = true;

    const renderThumbnail = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument(eventData.storageRefs.templatePdf.url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        if (!isSubscribed) return;

        const viewport = page.getViewport({ scale: 0.35 });
        const canvas = previewCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;

        if (eventData.configs && Array.isArray(eventData.configs)) {
          const sampleRow = participants[0]?.attributes || {
            Nama: participants[0]?.nama || "Contoh Nama Peserta",
            Email: participants[0]?.email || "peserta@example.com",
          };

          eventData.configs.forEach((cfg) => {
            if (cfg.enabled === false) return;
            if (cfg.page_number && cfg.page_number !== 1) return;

            if (cfg.type === "image" && cfg.data_url) {
              const img = new Image();
              img.onload = () => {
                ctx.drawImage(
                  img,
                  (cfg.x || 0) * 0.35,
                  (cfg.y || 0) * 0.35,
                  (cfg.max_width || 100) * 0.35,
                  (cfg.height || 60) * 0.35
                );
              };
              img.src = cfg.data_url;
              return;
            }

            const text = renderInterpolatedText(cfg, sampleRow);
            ctx.font = `${Math.round((cfg.font_size || 24) * 0.35)}px sans-serif`;
            ctx.fillStyle = cfg.color || "#111111";
            ctx.textAlign = cfg.align || "left";

            let xPos = (cfg.x || 0) * 0.35;
            if (cfg.align === "center") xPos += ((cfg.max_width || 200) * 0.35) / 2;
            if (cfg.align === "right") xPos += (cfg.max_width || 200) * 0.35;

            const yPos = ((cfg.y || 100) + (cfg.font_size || 24)) * 0.35;
            ctx.fillText(text, xPos, yPos);
          });
        }
      } catch (err) {
        console.warn("Pratinjau canvas tidak dapat dimuat:", err.message);
      }
    };

    renderThumbnail();

    return () => {
      isSubscribed = false;
    };
  }, [eventData, participants]);

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

          for (let i = 0; i < rows.length; i += 400) {
            const batch = writeBatch(db);
            const chunk = rows.slice(i, i + 400);

            chunk.forEach((row, chunkIdx) => {
              const globalIdx = currentCount + i + chunkIdx + 1;
              const newDocRef = doc(colRef);
              const nama = row.Nama || row.nama || row.NAME || `Peserta ${globalIdx}`;
              const email = row.Email || row.email || "";

              batch.set(newDocRef, {
                nomorUrut: globalIdx,
                nama: String(nama).trim(),
                email: String(email).trim(),
                attributes: row,
                diunduh: false,
                dibuatPada: serverTimestamp(),
              });
            });

            await batch.commit();
          }

          // Sinkronisasi totalPeserta ke dokumen induk
          await updateDoc(doc(db, "events", eventId), {
            totalPeserta: currentCount + rows.length,
            diperbaruiPada: serverTimestamp(),
          });

          notify(`Berhasil mengimpor ${rows.length} peserta.`, "success");
          await fetchEventAndParticipants();
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

      await addDoc(colRef, {
        nomorUrut: nextNumber,
        nama: manualName.trim(),
        email: manualEmail.trim(),
        attributes: {
          Nama: manualName.trim(),
          Email: manualEmail.trim(),
        },
        diunduh: false,
        dibuatPada: serverTimestamp(),
      });

      await updateDoc(doc(db, "events", eventId), {
        totalPeserta: increment(1),
        diperbaruiPada: serverTimestamp(),
      });

      setManualName("");
      setManualEmail("");
      setShowAddModal(false);
      notify("Peserta berhasil ditambahkan.", "success");
      await fetchEventAndParticipants();
    } catch (err) {
      console.error("Gagal menambah peserta:", err);
      notify("Gagal menambah peserta: " + err.message, "error");
    } finally {
      setIsAddingParticipant(false);
    }
  };

  const confirmDeleteParticipant = async () => {
    const { participantId } = deleteDialog;
    if (!participantId) return;

    try {
      await deleteDoc(doc(db, `events/${eventId}/peserta`, participantId));
      await updateDoc(doc(db, "events", eventId), {
        totalPeserta: increment(-1),
        diperbaruiPada: serverTimestamp(),
      });

      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(participantId);
        return next;
      });
      notify("Peserta berhasil dihapus.", "success");
    } catch (err) {
      notify("Gagal menghapus peserta: " + err.message, "error");
    } finally {
      setDeleteDialog({ isOpen: false, participantId: null, participantName: "" });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === participants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(participants.map((p) => p.id)));
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
    if (!eventData?.storageRefs?.templatePdf?.url) {
      notify("Template PDF belum diunggah. Silakan klik 'Edit Desain' untuk mengatur template.", "error");
      return;
    }

    try {
      notify(`Merender sertifikat ${peserta.nama}...`, "info");

      const templateRes = await fetch(eventData.storageRefs.templatePdf.url);
      if (!templateRes.ok) throw new Error("Gagal mengambil file template PDF dari storage.");
      const templateRawBuffer = await templateRes.arrayBuffer();
      const templateUint8 = await bakeImagesIntoPdf(templateRawBuffer, eventData.configs);

      let fontBytes = null;
      if (eventData.storageRefs?.customFont?.url) {
        try {
          const fontRes = await fetch(eventData.storageRefs.customFont.url);
          if (fontRes.ok) {
            fontBytes = new Uint8Array(await fontRes.arrayBuffer());
          }
        } catch (fontErr) {
          console.warn("Gagal memuat custom font:", fontErr);
        }
      }

      const wasm = await import("@/rust_wasm/pkg/pdf_cert_wasm.js");
      await wasm.default();

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

      const blob = new Blob([zipBytes], { type: "application/zip" });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `sertifikat_${peserta.nama.replace(/\s+/g, "_")}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(downloadUrl);

      notify(`Sertifikat ${peserta.nama} siap diunduh!`, "success");
    } catch (err) {
      console.error("Gagal render sertifikat satuan:", err);
      notify("Gagal merender sertifikat: " + err.message, "error");
    }
  };

  const handleDownloadSelectedBatch = async () => {
    if (selectedIds.size === 0) return;

    if (!eventData?.storageRefs?.templatePdf?.url) {
      notify("Template PDF belum dikonfigurasi. Atur template terlebih dahulu di Studio.", "error");
      return;
    }

    const selectedList = participants.filter((p) => selectedIds.has(p.id));
    setIsRendering(true);
    setRenderProgress({ current: 0, total: selectedList.length });

    try {
      notify(`Mempersiapkan batch untuk ${selectedList.length} peserta...`, "info");

      const templateRes = await fetch(eventData.storageRefs.templatePdf.url);
      const templateRawBuffer = await templateRes.arrayBuffer();
      const templateUint8 = await bakeImagesIntoPdf(templateRawBuffer, eventData.configs);

      let fontBytes = null;
      if (eventData.storageRefs?.customFont?.url) {
        try {
          const fontRes = await fetch(eventData.storageRefs.customFont.url);
          if (fontRes.ok) {
            fontBytes = new Uint8Array(await fontRes.arrayBuffer());
          }
        } catch (fontErr) {
          console.warn("Gagal memuat custom font:", fontErr);
        }
      }

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-red-300 rounded p-6 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 mx-auto bg-red-50 text-red-600 rounded-full flex items-center justify-center font-bold text-xl">
            !
          </div>
          <h2 className="text-base font-bold text-gray-900">Kendala Memuat Event</h2>
          <p className="text-xs font-mono text-gray-600 bg-gray-100 p-3 rounded text-left break-words">
            {loadError}
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={() => fetchEventAndParticipants()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded transition"
            >
              🔄 Coba Muat Ulang
            </button>
            <Link
              href="/dashboard/events"
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-4 py-2 rounded transition"
            >
              Kembali ke Daftar Event
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-mono text-xs text-gray-600 space-y-3">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p>Menghubungkan ke database event dan peserta...</p>
        <span className="text-[11px] text-gray-400">ID: {eventId || "..."}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      {statusMessage.text && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded shadow-lg text-xs font-mono border ${
            statusMessage.type === "error"
              ? "bg-red-500 text-white border-red-600"
              : statusMessage.type === "success"
              ? "bg-emerald-600 text-white border-emerald-700"
              : "bg-gray-800 text-white border-gray-900"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Header Navigasi */}
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-gray-500 hover:text-black">
            Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-gray-900 truncate max-w-xs">
            {eventData?.namaEvent || "Detail"}
          </span>
        </div>

        <Link
          href={`/dashboard/cetak-lokal?eventId=${eventId}`}
          className="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded flex items-center gap-1.5 transition"
        >
          <span>✏️ Edit Desain di Studio</span>
        </Link>
      </header>

      {/* Konten Utama */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border rounded p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">
                  Event Aktif
                </span>
                <span className="text-xs font-mono text-gray-400">ID: {eventId}</span>
              </div>

              <h1 className="text-2xl font-bold mt-2">{eventData?.namaEvent}</h1>
              <p className="text-xs font-mono text-gray-500 mt-1">
                Tanggal: <strong>{eventData?.tanggalEvent || "Belum ditentukan"}</strong> | Pola berkas:{" "}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">
                  {eventData?.filenamePattern || "sertifikat_{Nama}_{index}"}
                </code>
              </p>

              <div className="mt-4 text-xs text-gray-600 space-y-1">
                <p>
                  • Tata Letak:{" "}
                  <strong>{eventData?.configs?.length || 0} elemen teks/gambar dikonfigurasi</strong>
                </p>
                <p>
                  • Template PDF:{" "}
                  <strong>
                    {eventData?.storageRefs?.templatePdf?.url ? "Tersimpan di Cloud" : "Belum diunggah"}
                  </strong>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={csvInputRef}
                accept=".csv"
                onChange={handleImportCsv}
                className="hidden"
              />
              <button
                onClick={() => csvInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded transition"
              >
                📥 Impor Peserta (.csv)
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3 py-2 rounded transition"
              >
                + Tambah Manual
              </button>

              <Link
                href={`/dashboard/cetak-lokal?eventId=${eventId}`}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3 py-2 rounded transition ml-auto"
              >
                Buka Canvas Studio →
              </Link>
            </div>
          </div>

          <div className="bg-white border rounded p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-mono text-gray-500 mb-2 font-bold uppercase">
              Pratinjau Desain
            </span>

            {eventData?.storageRefs?.templatePdf?.url ? (
              <div className="border border-gray-200 shadow-sm rounded overflow-hidden max-h-48 flex items-center justify-center bg-gray-50">
                <canvas ref={previewCanvasRef} className="max-w-full h-auto" />
              </div>
            ) : (
              <div className="border border-dashed border-gray-300 rounded p-6 w-full text-center space-y-2">
                <p className="text-xs text-gray-500">Template belum dimuat ke cloud.</p>
                <Link
                  href={`/dashboard/cetak-lokal?eventId=${eventId}`}
                  className="text-xs font-bold text-blue-600 hover:underline block"
                >
                  Unggah & Desain di Studio →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Tabel Peserta */}
        <div className="bg-white border rounded overflow-hidden shadow-sm">
          <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3 bg-gray-50">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-sm">Daftar Peserta ({participants.length})</h2>
              {selectedIds.size > 0 && (
                <span className="text-xs font-mono bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                  {selectedIds.size} dipilih
                </span>
              )}
            </div>

            {selectedIds.size > 0 && (
              <button
                onClick={handleDownloadSelectedBatch}
                disabled={isRendering}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded flex items-center gap-2 transition disabled:opacity-50"
              >
                {isRendering ? (
                  <span>
                    Merender ({renderProgress?.current || 0}/{renderProgress?.total || 0})...
                  </span>
                ) : (
                  <span>📦 Unduh Terpilih ({selectedIds.size}) ke ZIP</span>
                )}
              </button>
            )}
          </div>

          {participants.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500 space-y-2">
              <p>Belum ada data peserta untuk event ini.</p>
              <button
                onClick={() => csvInputRef.current?.click()}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Klik di sini untuk mengimpor berkas CSV
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-gray-100 text-gray-600 font-mono">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === participants.length && participants.length > 0}
                        onChange={toggleSelectAll}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3">Nama Lengkap</th>
                    <th className="p-3">Email</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {participants.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelectOne(p.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-center font-mono text-gray-400">
                        {p.nomorUrut || idx + 1}
                      </td>
                      <td className="p-3 font-semibold text-gray-900">{p.nama}</td>
                      <td className="p-3 text-gray-500 font-mono">{p.email || "-"}</td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleDownloadSingle(p)}
                          className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 rounded font-semibold transition"
                        >
                          Unduh ZIP
                        </button>
                        <button
                          onClick={() =>
                            setDeleteDialog({
                              isOpen: true,
                              participantId: p.id,
                              participantName: p.nama,
                            })
                          }
                          className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition"
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
        </div>
      </main>

      {/* Modal Tambah Manual */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm">Tambah Peserta Manual</h3>
            <form onSubmit={handleAddManualParticipant} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full text-xs border rounded p-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  placeholder="budi@example.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full text-xs border rounded p-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingParticipant}
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded disabled:opacity-50"
                >
                  {isAddingParticipant ? "Menyimpan..." : "Simpan Peserta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-sm w-full p-5 space-y-3 shadow-xl">
            <h3 className="font-bold text-sm text-red-600">Hapus Peserta?</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus peserta{" "}
              <strong>{deleteDialog.participantName}</strong>? Data yang dihapus tidak dapat
              dikembalikan.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() =>
                  setDeleteDialog({ isOpen: false, participantId: null, participantName: "" })
                }
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteParticipant}
                className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold rounded"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { signOut, sendEmailVerification } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  increment,
  doc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { supabase, ASSET_BUCKET } from "@/lib/supabase";
import Toast from "@/components/Toast";

const IconSparkles = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
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

const IconEdit = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
  </svg>
);

const IconMail = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const IconLock = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

export default function DashboardPage() {
  const { user, loading, userData, isAdmin, isPremium } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // Status Verifikasi Email Firebase
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [namaEvent, setNamaEvent] = useState("");
  const [tanggalEvent, setTanggalEvent] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    eventId: null,
    eventName: "",
    isDeleting: false,
    deleteStatus: "",
  });

  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  const notify = (text, type = "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: "", type: "" });
    }, 4000);
  };

  useEffect(() => {
    if (auth.currentUser) {
      setIsEmailVerified(auth.currentUser.emailVerified);
    } else if (user) {
      setIsEmailVerified(user.emailVerified ?? false);
    }
  }, [user]);

  // Hitung mundur tombol kirim ulang verifikasi
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleCheckVerification = async () => {
    if (!auth.currentUser) return;
    setIsCheckingStatus(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setIsEmailVerified(true);
        notify("Selamat! Email Anda telah terverifikasi. Seluruh fitur Cloud telah aktif.", "success");
      } else {
        notify("Email belum diverifikasi. Silakan buka inbox atau folder spam dan klik tautan dari Firebase.", "error");
      }
    } catch (err) {
      console.error("Gagal memeriksa status email:", err);
      notify("Gagal memeriksa status: " + (err.message || "Terjadi kesalahan."), "error");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleResendEmail = async () => {
    if (!auth.currentUser || resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      notify("Tautan verifikasi baru berhasil dikirim ke alamat email Anda.", "success");
      setResendCooldown(60);
    } catch (err) {
      console.error("Gagal kirim ulang email verifikasi:", err);
      notify("Gagal mengirim email: " + (err.message || "Coba beberapa saat lagi."), "error");
    } finally {
      setIsResending(false);
    }
  };

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setIsLoadingEvents(true);
    try {
      const q = query(collection(db, "events"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      list.sort((a, b) => {
        const timeA = a.dibuatPada?.toMillis ? a.dibuatPada.toMillis() : 0;
        const timeB = b.dibuatPada?.toMillis ? b.dibuatPada.toMillis() : 0;
        return timeB - timeA;
      });

      setEvents(list);
    } catch (err) {
      console.error("Gagal memuat event:", err);
      notify("Gagal memuat daftar event: " + err.message, "error");
    } finally {
      setIsLoadingEvents(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      fetchEvents();
    }
  }, [user, loading, router, fetchEvents]);

  const handleOpenCreateEvent = () => {
    if (!isEmailVerified) {
      notify("Verifikasi email Anda terlebih dahulu untuk membuat event cloud baru.", "error");
      setShowCreateModal(true);
      return;
    }

    // Batasi kuota akun cloud gratis hanya 1 event aktif
    if (events.length >= 1) {
      setShowPremiumModal(true);
      return;
    }

    setShowCreateModal(true);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!namaEvent.trim() || !user) return;

    if (!isEmailVerified) {
      notify("Akses Dibatasi: Anda wajib memverifikasi email sebelum membuat event Cloud baru.", "error");
      return;
    }

    // Validasi kuota event dinamis sesuai paket langganan (Free: 1, Premium: maxActiveEvents)
    const allowedMaxEvents = userData?.maxActiveEvents || (isPremium ? 50 : 1);
    if (!isPremium && events.length >= allowedMaxEvents) {
      setShowCreateModal(false);
      setShowPremiumModal(true);
      notify(`Batas kuota tercapai: Akun Free hanya dapat menyimpan ${allowedMaxEvents} event aktif.`, "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, "events"), {
        userId: user.uid,
        namaEvent: namaEvent.trim(),
        tanggalEvent: tanggalEvent || "",
        totalPeserta: 0,
        filenamePattern: "sertifikat_{Nama}_{index}",
        configs: [],
        storageRefs: {
          templatePdf: null,
          customFont: null,
          images: [],
        },
        dibuatPada: serverTimestamp(),
        diperbaruiPada: serverTimestamp(),
      });

      await updateDoc(doc(db, "users", user.uid), {
        activeEventsCount: increment(1),
        diperbaruiPada: serverTimestamp(),
      }).catch((e) => console.warn("Peringatan update activeEventsCount:", e));

      setShowCreateModal(false);
      setNamaEvent("");
      notify("Event berhasil dibuat. Mengalihkan ke editor...", "success");

      router.push(`/dashboard/events/${docRef.id}`);
    } catch (err) {
      console.error("Gagal membuat event:", err);
      notify("Gagal membuat event: " + err.message, "error");
      setIsSubmitting(false);
    }
  };

  const confirmDeleteEvent = async () => {
    const { eventId } = deleteDialog;
    if (!eventId || !user) return;

    setDeleteDialog((prev) => ({
      ...prev,
      isDeleting: true,
      deleteStatus: "Memeriksa aset acara...",
    }));

    try {
      const targetEvent = events.find((item) => item.id === eventId);

      // 1. Bersihkan berkas aset di Supabase Storage
      setDeleteDialog((prev) => ({
        ...prev,
        deleteStatus: "Membersihkan berkas di penyimpanan awan...",
      }));

      const filesToDelete = [];

      if (targetEvent?.storageRefs?.templatePdf?.path) {
        filesToDelete.push(targetEvent.storageRefs.templatePdf.path);
      }
      if (targetEvent?.storageRefs?.customFont?.path) {
        filesToDelete.push(targetEvent.storageRefs.customFont.path);
      }
      if (Array.isArray(targetEvent?.storageRefs?.images)) {
        targetEvent.storageRefs.images.forEach((img) => {
          if (img?.path) filesToDelete.push(img.path);
        });
      }

      try {
        const folderPath = `${user.uid}/${eventId}`;
        const { data: rootFolderFiles } = await supabase.storage
          .from(ASSET_BUCKET)
          .list(folderPath);

        if (rootFolderFiles && rootFolderFiles.length > 0) {
          rootFolderFiles.forEach((fileItem) => {
            if (fileItem.name) {
              filesToDelete.push(`${folderPath}/${fileItem.name}`);
            }
          });
        }

        const { data: imageFolderFiles } = await supabase.storage
          .from(ASSET_BUCKET)
          .list(`${folderPath}/images`);

        if (imageFolderFiles && imageFolderFiles.length > 0) {
          imageFolderFiles.forEach((fileItem) => {
            if (fileItem.name) {
              filesToDelete.push(`${folderPath}/images/${fileItem.name}`);
            }
          });
        }
      } catch (storageScanErr) {
        console.warn("Pemeriksaan folder storage dilewati:", storageScanErr);
      }

      const uniqueFiles = Array.from(new Set(filesToDelete.filter(Boolean)));
      if (uniqueFiles.length > 0) {
        const { error: removeErr } = await supabase.storage
          .from(ASSET_BUCKET)
          .remove(uniqueFiles);
        if (removeErr) {
          console.warn("Peringatan penghapusan berkas Supabase:", removeErr.message);
        }
      }

      // 2. Bersihkan seluruh subkoleksi peserta di Firestore dalam chunk batch
      setDeleteDialog((prev) => ({
        ...prev,
        deleteStatus: "Menghapus seluruh data peserta...",
      }));

      const pesertaColRef = collection(db, `events/${eventId}/peserta`);
      const pesertaSnap = await getDocs(pesertaColRef);

      if (!pesertaSnap.empty) {
        const participantDocs = pesertaSnap.docs;
        for (let i = 0; i < participantDocs.length; i += 400) {
          const batch = writeBatch(db);
          const chunk = participantDocs.slice(i, i + 400);
          chunk.forEach((docItem) => batch.delete(docItem.ref));
          await batch.commit();
        }
      }

      // 3. Hapus dokumen event utama
      setDeleteDialog((prev) => ({
        ...prev,
        deleteStatus: "Menghapus dokumen acara...",
      }));

      await deleteDoc(doc(db, "events", eventId));

      await updateDoc(doc(db, "users", user.uid), {
        activeEventsCount: increment(-1),
        diperbaruiPada: serverTimestamp(),
      }).catch((e) => console.warn("Peringatan update activeEventsCount:", e));

      setEvents((prev) => prev.filter((item) => item.id !== eventId));
      notify("Acara, seluruh data peserta, dan berkas aset berhasil dibersihkan.", "success");
      setDeleteDialog({
        isOpen: false,
        eventId: null,
        eventName: "",
        isDeleting: false,
        deleteStatus: "",
      });
    } catch (err) {
      console.error("Gagal menghapus event secara menyeluruh:", err);
      notify("Gagal menghapus event: " + err.message, "error");
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false, deleteStatus: "" }));
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Gagal keluar:", err);
      setIsLoggingOut(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center font-mono text-xs text-[#6B7280]">
        Memeriksa sesi login...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#111111] font-sans antialiased pb-20">
      <Toast
        message={statusMessage.text}
        type={statusMessage.type}
        onClose={() => setStatusMessage({ text: "", type: "" })}
      />

      {/* Header Utama Navigasi */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF]/90 border-b border-[#E5E7EB] backdrop-blur-md px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-base font-medium tracking-tight text-[#111111] hover:text-[#6B7280] transition-colors"
          >
            SertiGen
          </Link>
          <span className="text-[#B0B6C3]">/</span>
          <span className="text-xs font-mono text-[#6B7280] uppercase tracking-wider">
            Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          {isAdmin && (
            <Link
              href="/dashboard/admin"
              className="px-3 py-1.5 border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 rounded-[4px] transition-colors font-medium flex items-center gap-1.5"
              title="Panel Manajemen Pengguna & Langganan"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
              <span>Admin Panel</span>
            </Link>
          )}

          <Link
            href="/dashboard/profile"
            className="px-3 py-1.5 border border-[#E5E7EB] hover:bg-[#F5F5F5] rounded-[4px] transition-colors text-[#111111]"
            title="Kelola Profil Akun & Identitas Lembaga"
          >
            Profil & Lembaga
          </Link>

          <span className="text-[#6B7280] hidden md:inline">{user.email}</span>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-3 py-1.5 text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F5F5] rounded-[4px] transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isLoggingOut ? (
              <>
                <div className="w-3 h-3 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                <span>Keluar...</span>
              </>
            ) : (
              <span>Keluar</span>
            )}
          </button>
        </div>
      </header>

      {}
      {!isEmailVerified && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3.5">
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-1 rounded bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <IconMail className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="font-semibold text-amber-900">
                  Verifikasi Email Diperlukan untuk Mengelola Event Cloud
                </p>
                <p className="text-amber-700 leading-relaxed font-light">
                  Tautan aktivasi telah dikirim ke <strong className="font-medium text-amber-900">{user.email}</strong>. 
                  Fitur pembuatan event dan sinkronisasi database cloud akan aktif secara otomatis setelah Anda mengklik tautan tersebut.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-1 md:pt-0">
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={resendCooldown > 0 || isResending}
                className="px-3 py-1.5 text-xs font-mono rounded-[4px] border border-amber-300 bg-white text-amber-900 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {isResending
                  ? "Mengirim..."
                  : resendCooldown > 0
                  ? `Kirim Ulang (${resendCooldown}s)`
                  : "Kirim Ulang Email"}
              </button>

              <button
                type="button"
                onClick={handleCheckVerification}
                disabled={isCheckingStatus}
                className="px-3.5 py-1.5 text-xs font-mono uppercase rounded-[4px] bg-amber-900 hover:bg-amber-950 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                {isCheckingStatus ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                <span>Cek Status Verifikasi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      <main className="max-w-[1200px] mx-auto px-6 pt-10 space-y-12">
        {/* Banner Selamat Datang & Quick Actions */}
        <div className="border border-[#E5E7EB] rounded-md p-8 bg-[#FFFFFF] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[2px] border ${
                isEmailVerified
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}>
                {isEmailVerified ? "Akun Terverifikasi" : "Menunggu Verifikasi Email"}
              </span>
              <span className="text-[#B0B6C3]">/</span>
              <span className="text-[11px] font-mono text-[#6B7280]">
                Slot Cloud: <strong className={events.length >= 1 ? "text-amber-800 font-medium" : "text-[#111111] font-medium"}>{events.length}/1 Event</strong>
              </span>
              <span className="text-[#B0B6C3]">/</span>
              <Link
                href="/dashboard/profile"
                className="text-[11px] font-mono text-[#6B7280] hover:text-[#111111] transition-colors underline underline-offset-2"
              >
                Atur Identitas Penyelenggara
              </Link>
            </div>
            <h1 className="text-3xl sm:text-4xl font-light tracking-[-1px] text-[#111111] mt-3">
              Halo, {user.email?.split("@")[0]}
            </h1>
            <p className="text-xs font-mono text-[#6B7280] mt-2 font-light">
              Kelola daftar acara Anda atau gunakan studio cetak instan tanpa database.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/dashboard/cetak-lokal"
              className="px-4 py-2.5 h-10 text-xs rounded-[4px] border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#111111] flex items-center gap-2 transition-colors"
            >
              <IconSparkles className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Studio Instan (Offline)</span>
            </Link>

            {}
            <button
              onClick={handleOpenCreateEvent}
              className={`px-4 py-2.5 h-10 text-xs rounded-[4px] flex items-center gap-2 transition-colors ${
                events.length >= 1
                  ? "bg-[#FFFFFF] text-[#111111] border border-[#E5E7EB] hover:bg-[#F5F5F5]"
                  : isEmailVerified
                  ? "bg-[#111111] hover:bg-[#333333] text-white"
                  : "bg-[#F3F4F6] text-[#9CA3AF] border border-[#E5E7EB] hover:border-amber-300 hover:text-amber-800"
              }`}
            >
              {events.length >= 1 ? (
                <>
                  <IconPlus className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Tambah Event (Premium)</span>
                </>
              ) : isEmailVerified ? (
                <>
                  <IconPlus className="w-3.5 h-3.5" />
                  <span>Buat Event Baru</span>
                </>
              ) : (
                <>
                  <IconLock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Buat Event Baru</span>
                </>
              )}
            </button>
          </div>
        </div>

        {}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-light tracking-tight text-[#111111]">
                Event & Acara Tersimpan
              </h2>
              <span className="text-[11px] font-mono text-[#6B7280] bg-[#F5F5F5] px-2 py-0.5 rounded-[4px]">
                {events.length} / 1 Kuota Gratis
              </span>
            </div>

            <button
              onClick={() => fetchEvents()}
              disabled={isLoadingEvents}
              className="text-xs font-mono text-[#6B7280] hover:text-[#111111] transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {isLoadingEvents && (
                <div className="w-3 h-3 border-2 border-[#6B7280] border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isLoadingEvents ? "Menyegarkan..." : "Segarkan Data"}</span>
            </button>
          </div>

          {isLoadingEvents ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Memuat daftar event">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-6 flex flex-col justify-between space-y-6 animate-pulse"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="h-4 w-24 bg-[#F0F2F5] rounded-[2px]" />
                      <div className="h-4 w-4 bg-[#F0F2F5] rounded-full" />
                    </div>
                    <div className="h-6 w-3/4 bg-[#F0F2F5] rounded" />
                    <div className="h-3.5 w-1/2 bg-[#F0F2F5] rounded" />
                  </div>
                  <div className="pt-4 border-t border-[#F0F2F5] space-y-2">
                    <div className="h-3 w-1/3 bg-[#F0F2F5] rounded" />
                    <div className="h-8 w-full bg-[#F5F7FA] rounded-[4px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="border border-dashed border-[#E5E7EB] bg-[#F5F5F5]/50 rounded-md p-16 text-center space-y-4">
              <div className="text-xs font-mono text-[#6B7280] uppercase tracking-wider">
                Belum Ada Event Terdaftar
              </div>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto font-light leading-relaxed">
                Mulai buat event pertama Anda untuk mengimpor daftar peserta dan mencetak sertifikat langsung dari peramban.
              </p>
              <button
                onClick={handleOpenCreateEvent}
                className={`px-4 py-2 text-xs rounded-[4px] transition-colors inline-flex items-center gap-1.5 ${
                  isEmailVerified
                    ? "bg-[#111111] hover:bg-[#333333] text-white"
                    : "bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] hover:bg-[#E5E7EB]"
                }`}
              >
                {isEmailVerified ? (
                  <IconPlus className="w-3.5 h-3.5" />
                ) : (
                  <IconLock className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>Buat Event Pertama</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-6 flex flex-col justify-between hover:border-[#111111] transition-colors space-y-6"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-[#F5F5F5] text-[#6B7280]">
                        {evt.tanggalEvent || "Tanpa Tanggal"}
                      </span>
                      <button
                        onClick={() =>
                          setDeleteDialog({
                            isOpen: true,
                            eventId: evt.id,
                            eventName: evt.namaEvent,
                            isDeleting: false,
                            deleteStatus: "",
                          })
                        }
                        className="text-[#B0B6C3] hover:text-[#D92D20] transition-colors p-1"
                        title="Hapus Event"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="font-normal text-lg text-[#111111] mt-3 truncate">
                      {evt.namaEvent}
                    </h3>

                    <div className="mt-4 pt-3 border-t border-[#E5E7EB] text-xs font-mono text-[#6B7280] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span>Total Peserta:</span>
                        <span className="text-[#111111]">{evt.totalPeserta || 0} orang</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Elemen Tata Letak:</span>
                        <span className="text-[#111111]">{evt.configs?.length || 0} elemen</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Template PDF:</span>
                        <span className={evt.storageRefs?.templatePdf?.url ? "text-[#111111]" : "text-[#6B7280]"}>
                          {evt.storageRefs?.templatePdf?.url ? "Tersimpan" : "Belum diatur"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard/events/${evt.id}`}
                      className="flex-1 py-2 px-3 text-center bg-[#111111] hover:bg-[#333333] text-white text-xs rounded-[4px] transition-colors"
                    >
                      Detail & Peserta
                    </Link>

                    <Link
                      href={`/dashboard/cetak-lokal?eventId=${evt.id}`}
                      className="p-2 border border-[#E5E7EB] hover:bg-[#F5F5F5] rounded-[4px] text-[#111111] transition-colors"
                      title="Ubah Desain di Studio"
                    >
                      <IconEdit className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md max-w-sm w-full p-6 space-y-5">
            <div className="border-b border-[#E5E7EB] pb-3">
              <h3 className="text-sm font-normal text-[#111111]">Buat Event Baru</h3>
              <p className="text-xs text-[#6B7280] font-mono mt-1">
                Tambahkan event untuk mengelola peserta dan sertifikat.
              </p>
            </div>

            {!isEmailVerified ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-[4px] space-y-1.5">
                  <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                    <IconLock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Verifikasi Email Diperlukan</span>
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed font-light">
                    Silakan buka email Anda ({user?.email}) dan klik tautan verifikasi agar dapat membuat dan menyimpan event di cloud.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3.5 py-1.5 text-xs font-mono rounded-[4px] border border-[#E5E7EB] text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F5F5] transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckVerification}
                    disabled={isCheckingStatus}
                    className="px-3.5 py-1.5 text-xs font-mono uppercase rounded-[4px] bg-amber-900 hover:bg-amber-950 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isCheckingStatus ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    <span>Cek Status</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                    Nama Acara / Event *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Webinar Nasional 2026"
                    value={namaEvent}
                    onChange={(e) => setNamaEvent(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-sans border border-[#E5E7EB] rounded-[4px] bg-[#FFFFFF] text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                    Tanggal Acara
                  </label>
                  <input
                    type="date"
                    value={tanggalEvent}
                    onChange={(e) => setTanggalEvent(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-[#E5E7EB] rounded-[4px] bg-[#FFFFFF] text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3.5 py-2 text-xs text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F5F5] rounded-[4px] transition-colors font-mono"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-mono uppercase bg-[#111111] hover:bg-[#333333] text-white rounded-[4px] transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      "Lanjut ke Detail"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

     
      {}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md max-w-md w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-900 text-[10px] font-mono font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Paket Premium • Segera Hadir</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPremiumModal(false)}
                className="text-xs font-mono text-[#6B7280] hover:text-[#111111]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-medium tracking-tight text-[#111111]">
                Batas Kuota 1 Event Tercapai
              </h3>
              <p className="text-xs text-[#6B7280] leading-relaxed font-light">
                Akun Cloud Gratis Anda saat ini mencakup kuota <strong className="text-[#111111] font-medium">1 event aktif tersimpan</strong>. Saat ini Anda sedang mengelola event <strong className="text-[#111111] font-medium">"{events[0]?.namaEvent || 'Acara Aktif'}"</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[4px] space-y-2 text-xs text-[#52525B]">
              <div className="font-semibold text-[#111111] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <span>Keunggulan Paket Premium (Roadmap):</span>
              </div>
              <ul className="space-y-1.5 text-[11px] font-light">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span><strong>Multi-Event Simultan:</strong> Kelola puluhan event sekaligus tanpa harus menghapus event sebelumnya.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span><strong>Kustomisasi Branding Penuh:</strong> Hilangkan atribut bawaan pada portal unduhan publik peserta.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span><strong>Kapasitas Ekstra:</strong> Penyimpanan aset template & draf dalam kapasitas tinggi.</span>
                </li>
              </ul>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-[4px] text-[11px] text-amber-900 leading-relaxed font-light">
              <strong>Solusi Saat Ini:</strong> Anda dapat mengekspor seluruh sertifikat event yang ada, lalu menghapusnya untuk mengosongkan slot gratis. Atau gunakan <strong>Studio Instan (Offline)</strong> untuk merender sertifikat massal tanpa database.
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              {events[0] && (
                <Link
                  href={`/dashboard/events/${events[0].id}`}
                  onClick={() => setShowPremiumModal(false)}
                  className="px-3.5 py-2 text-xs font-mono text-center border border-[#E5E7EB] rounded-[4px] text-[#111111] hover:bg-[#F5F5F5] transition-colors"
                >
                  Buka Event Aktif ({events[0].namaEvent?.slice(0, 16)}...)
                </Link>
              )}
              <button
                type="button"
                onClick={() => setShowPremiumModal(false)}
                className="px-4 py-2 text-xs font-mono uppercase bg-[#111111] hover:bg-[#333333] text-white rounded-[4px] transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md max-w-sm w-full p-6 space-y-4">
            <h3 className="text-sm font-normal text-[#D92D20]">Hapus Acara Secara Permanen</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed font-light">
              Apakah Anda yakin ingin menghapus event <strong className="text-[#111111]">"{deleteDialog.eventName}"</strong>?
              Tindakan ini akan menghapus dokumen acara, seluruh data peserta, dan seluruh berkas template/aset di penyimpanan awan secara permanen.
            </p>

            {deleteDialog.isDeleting && deleteDialog.deleteStatus && (
              <div className="p-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-[4px] text-xs font-mono text-[#111111] flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin shrink-0" />
                <span>{deleteDialog.deleteStatus}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() =>
                  setDeleteDialog({
                    isOpen: false,
                    eventId: null,
                    eventName: "",
                    isDeleting: false,
                    deleteStatus: "",
                  })
                }
                disabled={deleteDialog.isDeleting}
                className="px-3.5 py-2 text-xs text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F5F5] rounded-[4px] transition-colors disabled:opacity-40"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteEvent}
                disabled={deleteDialog.isDeleting}
                className="px-4 py-2 text-xs bg-[#D92D20] hover:bg-[#D92D20]/90 text-white rounded-[4px] transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {deleteDialog.isDeleting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  "Hapus Event"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
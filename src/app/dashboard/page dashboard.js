"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

const IconSparkles = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const IconPlus = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const IconTrash = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const IconEdit = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
  </svg>
);

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // State daftar event
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // State modal pembuatan event
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [namaEvent, setNamaEvent] = useState("");
  const [tanggalEvent, setTanggalEvent] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State dialog konfirmasi hapus event (tanpa browser confirm)
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    eventId: null,
    eventName: "",
    isDeleting: false,
  });

  // State notifikasi toast
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  const notify = (text, type = "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: "", type: "" });
    }, 4000);
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

      // Sortir event terbaru di bagian paling atas
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

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!namaEvent.trim() || !user) return;

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

      setShowCreateModal(false);
      setNamaEvent("");
      notify("Event berhasil dibuat! Mengalihkan ke detail...", "success");

      // Langsung bawa pengguna ke halaman detail event baru
      router.push(`/dashboard/events/${docRef.id}`);
    } catch (err) {
      console.error("Gagal membuat event:", err);
      notify("Gagal membuat event: " + err.message, "error");
      setIsSubmitting(false);
    }
  };

  const confirmDeleteEvent = async () => {
    const { eventId } = deleteDialog;
    if (!eventId) return;

    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));
    try {
      await deleteDoc(doc(db, "events", eventId));
      setEvents((prev) => prev.filter((item) => item.id !== eventId));
      notify("Event berhasil dihapus dari sistem.", "success");
      setDeleteDialog({ isOpen: false, eventId: null, eventName: "", isDeleting: false });
    } catch (err) {
      console.error("Gagal menghapus event:", err);
      notify("Gagal menghapus event: " + err.message, "error");
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Gagal keluar:", err);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-mono text-xs text-gray-500">
        Memeriksa sesi login...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-16">
      {statusMessage.text && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded shadow-lg text-xs font-mono border transition-all ${
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

      {/* STREAMING_CHUNK:Adding profile and organization navigation to dashboard header... */}
      {/* Header Utama Navigasi */}
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-bold text-base tracking-tight text-gray-900 hover:text-blue-600 transition">
            SERTIGEN.
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-xs font-mono font-semibold text-gray-600 uppercase">
            Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono">
          <Link
            href="/dashboard/profile"
            className="px-3 py-1.5 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded transition font-semibold text-gray-700 flex items-center gap-1.5"
            title="Kelola Profil Akun & Data Organisasi/PT"
          >
            <span>🏢</span>
            <span className="hidden sm:inline">Profil & Lembaga</span>
          </Link>

          <span className="text-gray-600 hidden md:inline">{user.email}</span>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded transition font-semibold"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* STREAMING_CHUNK:Adding organization shortcut in welcome banner... */}
        {/* Banner Selamat Datang & Quick Actions */}
        <div className="bg-white border rounded-lg p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">
                Akun Aktif
              </span>
              <Link
                href="/dashboard/profile"
                className="text-[11px] font-mono text-blue-600 hover:underline flex items-center gap-1"
              >
                ⚙️ Atur Identitas PT/Lembaga
              </Link>
            </div>
            <h1 className="text-2xl font-bold mt-2 text-gray-900">
              Halo, {user.email?.split("@")[0]}
            </h1>
            <p className="text-xs font-mono text-gray-500 mt-1">
              Kelola daftar acara Anda atau gunakan studio cetak instan tanpa database.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/dashboard/cetak-lokal"
              className="px-4 py-2 text-xs font-semibold rounded border border-gray-300 hover:bg-gray-50 text-gray-700 flex items-center gap-2 transition"
            >
              <IconSparkles className="w-4 h-4 text-amber-500" />
              <span>Studio Instan (Offline)</span>
            </Link>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-xs transition"
            >
              <IconPlus className="w-4 h-4" />
              <span>+ Buat Event Baru</span>
            </button>
          </div>
        </div>

        {/* Header Seksi Daftar Event */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">Event & Acara Tersimpan</h2>
            <span className="text-xs font-mono font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
              {events.length}
            </span>
          </div>

          <button
            onClick={() => fetchEvents()}
            disabled={isLoadingEvents}
            className="text-xs font-mono text-blue-600 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            🔄 Segarkan
          </button>
        </div>

        {/* Daftar Kartu Event */}
        {isLoadingEvents ? (
          <div className="p-12 text-center text-xs font-mono text-gray-500 space-y-3 bg-white border rounded">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Memuat daftar acara dari Firestore...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="border border-dashed border-gray-300 bg-white rounded-lg p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl">
              📅
            </div>
            <h3 className="text-sm font-bold text-gray-800">Belum Ada Event Terdaftar</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Mulai buat event pertama Anda untuk mengimpor daftar peserta dan mencetak sertifikat on-demand.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition shadow-xs"
            >
              + Buat Event Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="bg-white border rounded-lg p-5 flex flex-col justify-between hover:border-blue-400 hover:shadow-xs transition space-y-4 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-bold">
                      {evt.tanggalEvent || "Tanpa Tanggal"}
                    </span>
                    <button
                      onClick={() =>
                        setDeleteDialog({
                          isOpen: true,
                          eventId: evt.id,
                          eventName: evt.namaEvent,
                          isDeleting: false,
                        })
                      }
                      className="text-gray-400 hover:text-red-600 transition p-1"
                      title="Hapus Event"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-bold text-base text-gray-900 mt-2 truncate group-hover:text-blue-600 transition">
                    {evt.namaEvent}
                  </h3>

                  <div className="mt-3 text-xs font-mono text-gray-500 space-y-1">
                    <p className="flex items-center justify-between">
                      <span>Total Peserta:</span>
                      <strong className="text-gray-800">{evt.totalPeserta || 0} Orang</strong>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>Tata Letak:</span>
                      <strong className="text-gray-800">{evt.configs?.length || 0} Elemen</strong>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>Template PDF:</span>
                      <span className={evt.storageRefs?.templatePdf?.url ? "text-emerald-600 font-semibold" : "text-amber-600"}>
                        {evt.storageRefs?.templatePdf?.url ? "Tersedia" : "Belum Diatur"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t flex items-center justify-between gap-2">
                  <Link
                    href={`/dashboard/events/${evt.id}`}
                    className="flex-1 py-1.5 px-3 text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition"
                  >
                    Detail & Peserta →
                  </Link>

                  <Link
                    href={`/dashboard/cetak-lokal?eventId=${evt.id}`}
                    className="p-1.5 border border-gray-300 hover:bg-gray-100 rounded text-gray-700 transition"
                    title="Ubah Desain di Studio"
                  >
                    <IconEdit className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Buat Event Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="border-b pb-2.5">
              <h3 className="font-bold text-sm text-gray-900">Buat Event Baru</h3>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                Tambahkan event untuk mengelola peserta & sertifikat.
              </p>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nama Acara / Event
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Webinar AI 2026"
                  value={namaEvent}
                  onChange={(e) => setNamaEvent(e.target.value)}
                  className="w-full text-xs border rounded p-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tanggal Pelaksanaan
                </label>
                <input
                  type="date"
                  value={tanggalEvent}
                  onChange={(e) => setTanggalEvent(e.target.value)}
                  className="w-full text-xs border rounded p-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Lanjut ke Detail"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog Konfirmasi Hapus Event */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 space-y-3 shadow-xl">
            <h3 className="font-bold text-sm text-red-600">Hapus Acara?</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus event{" "}
              <strong>"{deleteDialog.eventName}"</strong>? Seluruh data konfigurasi yang tersimpan akan dihapus secara permanen.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setDeleteDialog({ isOpen: false, eventId: null, eventName: "", isDeleting: false })}
                disabled={deleteDialog.isDeleting}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteEvent}
                disabled={deleteDialog.isDeleting}
                className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold rounded disabled:opacity-50"
              >
                {deleteDialog.isDeleting ? "Menghapus..." : "Hapus Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
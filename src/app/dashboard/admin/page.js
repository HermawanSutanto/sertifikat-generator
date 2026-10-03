// src/app/dashboard/admin/page.js
// Halaman Manajemen Pengguna & Langganan (Khusus Administrator)

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Toast from "@/components/Toast";

const IconSearch = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const IconUserCheck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7.5l-7 7-3.5-3.5M16 19.5H4a2 2 0 01-2-2V7a2 2 0 012-2h12a2 2 0 012 2v2" />
  </svg>
);

const IconShield = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const IconCrown = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.004 0V9.75m-5.004 4.5V9.75m5.004 0A2.25 2.25 0 0012 7.5a2.25 2.25 0 00-2.25 2.25m4.5 0a2.25 2.25 0 012.25 2.25v2.25m-6.75-4.5a2.25 2.25 0 00-2.25 2.25v2.25" />
  </svg>
);

const IconRefresh = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

export default function AdminDashboardPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState({ total: 0, premium: 0, free: 0, admins: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  // Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all"); // "all" | "user" | "admin"
  const [filterSubscription, setFilterSubscription] = useState("all"); // "all" | "free" | "premium"

  // State Modal Edit User
  const [selectedUser, setSelectedUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    role: "user",
    subscription: "free",
    maxActiveEvents: 1,
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const notify = (text, type = "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: "", type: "" });
    }, 4500);
  };

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengambil data pengguna dari server.");
      }

      setUsersList(data.users || []);
      setStats(data.stats || { total: 0, premium: 0, free: 0, admins: 0 });
    } catch (err) {
      console.error("fetchUsers error:", err);
      setErrorMessage(err.message || "Gagal memuat data pengguna.");
      notify(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (isAdmin) {
        fetchUsers();
      }
    }
  }, [user, loading, isAdmin, router, fetchUsers]);

  // Handler simpan perubahan status user
  const handleSaveUserStatus = async (e) => {
    e.preventDefault();
    if (!selectedUser || !user) return;

    setIsSubmittingEdit(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          targetUid: selectedUser.uid,
          role: editFormData.role,
          subscription: editFormData.subscription,
          maxActiveEvents: Number(editFormData.maxActiveEvents),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui status pengguna.");
      }

      // Optimistic update state tabel
      setUsersList((prev) =>
        prev.map((u) =>
          u.uid === selectedUser.uid
            ? {
                ...u,
                role: editFormData.role,
                subscription: editFormData.subscription,
                maxActiveEvents: Number(editFormData.maxActiveEvents),
              }
            : u
        )
      );

      // Re-evaluasi stats
      setStats((prev) => {
        const wasPrem = selectedUser.subscription === "premium";
        const isPrem = editFormData.subscription === "premium";
        const wasAdm = selectedUser.role === "admin";
        const isAdm = editFormData.role === "admin";

        return {
          ...prev,
          premium: prev.premium + (isPrem && !wasPrem ? 1 : !isPrem && wasPrem ? -1 : 0),
          free: prev.free + (!isPrem && wasPrem ? 1 : isPrem && !wasPrem ? -1 : 0),
          admins: prev.admins + (isAdm && !wasAdm ? 1 : !isAdm && wasAdm ? -1 : 0),
        };
      });

      notify(
        `Status ${selectedUser.namaLengkap || selectedUser.email} berhasil diperbarui.`,
        "success"
      );
      setSelectedUser(null);
    } catch (err) {
      console.error("Gagal simpan status:", err);
      notify("Gagal: " + err.message, "error");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Toggle cepat status langganan
  const handleQuickToggleSubscription = async (targetUser) => {
    if (!user) return;
    const nextSub = targetUser.subscription === "premium" ? "free" : "premium";
    const nextMax = nextSub === "premium" ? 50 : 1;

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          targetUid: targetUser.uid,
          subscription: nextSub,
          maxActiveEvents: nextMax,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status langganan.");

      setUsersList((prev) =>
        prev.map((u) =>
          u.uid === targetUser.uid
            ? { ...u, subscription: nextSub, maxActiveEvents: nextMax }
            : u
        )
      );

      setStats((prev) => ({
        ...prev,
        premium: prev.premium + (nextSub === "premium" ? 1 : -1),
        free: prev.free + (nextSub === "free" ? 1 : -1),
      }));

      notify(
        `Status ${targetUser.namaLengkap} diubah ke ${nextSub.toUpperCase()}.`,
        "success"
      );
    } catch (err) {
      notify("Gagal ubah langganan: " + err.message, "error");
    }
  };

  // Filter daftar pengguna
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (u.namaLengkap && u.namaLengkap.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        u.uid.toLowerCase().includes(q);

      const matchRole =
        filterRole === "all" || u.role === filterRole;

      const matchSub =
        filterSubscription === "all" || u.subscription === filterSubscription;

      return matchQuery && matchRole && matchSub;
    });
  }, [usersList, searchQuery, filterRole, filterSubscription]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] text-[#111111] flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
          <span>Memverifikasi hak akses administrator...</span>
        </div>
      </div>
    );
  }

  // Proteksi Akses Jika Bukan Admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] text-[#111111] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <IconShield className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-medium tracking-tight mb-2">Akses Dibatasi</h1>
        <p className="text-xs font-mono text-[#6B7280] max-w-md mb-6">
          Halaman ini khusus diperuntukkan bagi Administrator sistem. Akun Anda saat ini tidak memiliki izin akses ke modul ini.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-[#111111] hover:bg-[#333333] text-white text-xs font-mono uppercase rounded-[4px] transition-colors"
        >
          Kembali ke Dashboard
        </Link>
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

      {/* Header Navigasi Panel Admin */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF]/90 border-b border-[#E5E7EB] backdrop-blur-md px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-base font-medium tracking-tight text-[#111111] hover:text-[#6B7280] transition-colors"
          >
            SertiGen
          </Link>
          <span className="text-[#B0B6C3]">/</span>
          <span className="text-xs font-mono text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-[2px] uppercase font-semibold">
            Admin Panel
          </span>
          <span className="text-[#B0B6C3] hidden sm:inline">/</span>
          <span className="text-xs font-mono text-[#6B7280] uppercase tracking-wider hidden sm:inline">
            Manajemen Pengguna & Langganan
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={isLoading}
            className="p-2 border border-[#E5E7EB] hover:bg-[#F5F5F5] rounded-[4px] transition-colors text-[#111111] flex items-center gap-1.5"
            title="Muat ulang data pengguna"
          >
            <IconRefresh className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden md:inline">Perbarui</span>
          </button>

          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 border border-[#E5E7EB] hover:bg-[#F5F5F5] rounded-[4px] transition-colors text-[#111111]"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="max-w-[1240px] mx-auto px-6 pt-10 space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono uppercase text-[#6B7280] tracking-wider">
              Pusat Kontrol Akun & Akses
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-[-1px] text-[#111111] mt-2">
            Manajemen Pengguna & Subscription
          </h1>
          <p className="text-xs font-mono text-[#6B7280] mt-1.5">
            Pantau akun terdaftar, atur status Free / Premium, dan berikan wewenang administrator secara aman.
          </p>
        </div>

        {/* Kartu Statistik Cepat */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-4 space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#6B7280] block">Total Pengguna</span>
            <div className="flex items-baseline justify-between">
              <strong className="text-2xl font-light text-[#111111]">{stats.total}</strong>
              <IconUserCheck className="w-4 h-4 text-[#6B7280]" />
            </div>
            <span className="text-[10px] font-mono text-[#6B7280] block">Akun terdaftar di Firestore</span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-4 space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#6B7280] block">Pengguna Premium</span>
            <div className="flex items-baseline justify-between">
              <strong className="text-2xl font-light text-emerald-700">{stats.premium}</strong>
              <IconCrown className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] font-mono text-emerald-700 block">Kuota hingga 50 event aktif</span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-4 space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#6B7280] block">Pengguna Free Tier</span>
            <div className="flex items-baseline justify-between">
              <strong className="text-2xl font-light text-[#111111]">{stats.free}</strong>
              <span className="text-[10px] font-mono text-[#6B7280] px-1.5 py-0.5 rounded bg-[#F5F5F5] border border-[#E5E7EB]">
                Free
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#6B7280] block">Batas 1 event aktif</span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-4 space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#6B7280] block">Administrator</span>
            <div className="flex items-baseline justify-between">
              <strong className="text-2xl font-light text-purple-700">{stats.admins}</strong>
              <IconShield className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-[10px] font-mono text-purple-700 block">Hak kelola sistem penuh</span>
          </div>
        </div>

        {/* Toolbar Pencarian & Filter */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <IconSearch className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama, email, atau UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-mono pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-[4px] outline-none focus:border-[#111111] transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-[#6B7280] text-[11px] uppercase">Langganan:</span>
              <select
                value={filterSubscription}
                onChange={(e) => setFilterSubscription(e.target.value)}
                className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] px-2.5 py-1.5 text-xs outline-none focus:border-[#111111]"
              >
                <option value="all">Semua Status</option>
                <option value="premium">Premium</option>
                <option value="free">Free</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[#6B7280] text-[11px] uppercase">Role:</span>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[4px] px-2.5 py-1.5 text-xs outline-none focus:border-[#111111]"
              >
                <option value="all">Semua Role</option>
                <option value="admin">Administrator</option>
                <option value="user">User Biasa</option>
              </select>
            </div>

            <span className="text-xs text-[#6B7280] ml-2">
              Ditemukan: <strong>{filteredUsers.length}</strong>
            </span>
          </div>
        </div>

        {/* Tabel Data Pengguna */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="p-12 text-center font-mono text-xs text-[#6B7280] space-y-3">
              <div className="w-5 h-5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Memuat daftar pengguna...</p>
            </div>
          ) : errorMessage ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-xs font-mono text-red-600">{errorMessage}</p>
              <button
                type="button"
                onClick={fetchUsers}
                className="px-3 py-1.5 bg-[#111111] text-white text-xs font-mono uppercase rounded-[4px]"
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center font-mono text-xs text-[#6B7280] space-y-1">
              <p>Tidak ada pengguna yang sesuai dengan kriteria filter.</p>
              <p className="text-[11px] text-[#B0B6C3]">Coba ubah kata kunci pencarian atau reset filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F5F5F5] font-mono text-[10px] uppercase text-[#6B7280]">
                    <th className="py-3 px-4">Pengguna</th>
                    <th className="py-3 px-4">Tipe Akun</th>
                    <th className="py-3 px-4 text-center">Event Aktif</th>
                    <th className="py-3 px-4">Role Akun</th>
                    <th className="py-3 px-4">Status Langganan</th>
                    <th className="py-3 px-4">Terdaftar</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredUsers.map((u) => {
                    const isAdm = u.role === "admin";
                    const isPrem = u.subscription === "premium";
                    const initial = (u.namaLengkap || u.email || "U")[0].toUpperCase();

                    return (
                      <tr key={u.uid} className="hover:bg-[#F9FAFB] transition-colors">
                        {/* Kolom Pengguna */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center font-mono font-medium text-xs shrink-0">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-[#111111] block truncate max-w-xs">
                                {u.namaLengkap}
                              </span>
                              <span className="text-[11px] font-mono text-[#6B7280] block truncate max-w-xs">
                                {u.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Kolom Tipe Akun */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#6B7280] capitalize">
                          {u.accountType === "personal" ? "Perseorangan" : "Lembaga / B2B"}
                        </td>

                        {/* Kolom Event Aktif */}
                        <td className="py-3.5 px-4 text-center font-mono text-xs">
                          <span className="px-2 py-0.5 rounded-[2px] bg-[#F5F5F5] text-[#111111] border border-[#E5E7EB]">
                            {u.activeEventsCount} / {u.maxActiveEvents}
                          </span>
                        </td>

                        {/* Kolom Role */}
                        <td className="py-3.5 px-4">
                          {isAdm ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-purple-50 text-purple-700 border border-purple-200 font-mono text-[10px] uppercase font-semibold">
                              <IconShield className="w-3 h-3" />
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-[#F5F5F5] text-[#6B7280] border border-[#E5E7EB] font-mono text-[10px] uppercase">
                              User
                            </span>
                          )}
                        </td>

                        {/* Kolom Subscription */}
                        <td className="py-3.5 px-4">
                          {isPrem ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] uppercase font-medium">
                              <IconCrown className="w-3 h-3 text-emerald-600" />
                              <span>Premium</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-[#F5F5F5] text-[#6B7280] border border-[#E5E7EB] font-mono text-[10px] uppercase">
                              Free Tier
                            </span>
                          )}
                        </td>

                        {/* Kolom Terdaftar */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#6B7280]">
                          {u.dibuatPada
                            ? new Date(u.dibuatPada).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </td>

                        {/* Kolom Aksi */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Tombol Cepat Toggle Subscription */}
                            <button
                              type="button"
                              onClick={() => handleQuickToggleSubscription(u)}
                              className={`px-2.5 py-1 text-[10px] font-mono uppercase rounded-[3px] border transition-colors ${
                                isPrem
                                  ? "border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
                                  : "border-emerald-300 text-emerald-900 bg-emerald-50 hover:bg-emerald-100"
                              }`}
                              title={isPrem ? "Ubah ke akun Free" : "Upgrade akun ke Premium"}
                            >
                              {isPrem ? "Set Free" : "Set Premium"}
                            </button>

                            {/* Tombol Detail / Edit Lengkap */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                setEditFormData({
                                  role: u.role || "user",
                                  subscription: u.subscription || "free",
                                  maxActiveEvents: u.maxActiveEvents || (u.subscription === "premium" ? 50 : 1),
                                });
                              }}
                              className="px-2.5 py-1 text-[10px] font-mono uppercase rounded-[3px] border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#111111] transition-colors"
                            >
                              Kelola
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Dialog Edit Status & Role Pengguna */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md max-w-md w-full p-6 space-y-5 shadow-xl">
            <div className="border-b border-[#E5E7EB] pb-3">
              <span className="text-[10px] font-mono uppercase text-[#6B7280]">Edit Hak Akses & Paket</span>
              <h2 className="text-base font-medium text-[#111111] mt-0.5">
                {selectedUser.namaLengkap}
              </h2>
              <p className="text-xs font-mono text-[#6B7280]">{selectedUser.email}</p>
            </div>

            <form onSubmit={handleSaveUserStatus} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                  Paket Subscription
                </label>
                <select
                  value={editFormData.subscription}
                  onChange={(e) => {
                    const newSub = e.target.value;
                    setEditFormData((prev) => ({
                      ...prev,
                      subscription: newSub,
                      maxActiveEvents: newSub === "premium" ? 50 : 1,
                    }));
                  }}
                  className="w-full text-xs border border-[#E5E7EB] rounded-[4px] p-2.5 bg-[#FFFFFF] outline-none focus:border-[#111111]"
                >
                  <option value="free">Free Tier (1 Event Aktif)</option>
                  <option value="premium">Premium Tier (Hingga 50 Event Aktif)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                  Batas Maksimal Event Aktif
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={editFormData.maxActiveEvents}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      maxActiveEvents: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="w-full text-xs font-mono border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111]"
                />
                <p className="text-[10px] font-mono text-[#6B7280] mt-1">
                  Batas jumlah sertifikat acara yang dapat di-hosting secara bersamaan.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                  Role Akun Pengguna
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className="w-full text-xs border border-[#E5E7EB] rounded-[4px] p-2.5 bg-[#FFFFFF] outline-none focus:border-[#111111]"
                >
                  <option value="user">User Biasa (Akses Standar)</option>
                  <option value="admin">Administrator (Akses Penuh Panel Admin)</option>
                </select>
                <p className="text-[10px] font-mono text-purple-700 mt-1">
                  Perhatian: Akun dengan role Administrator dapat melihat dan mengubah seluruh data sistem.
                </p>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmittingEdit}
                  onClick={() => setSelectedUser(null)}
                  className="px-3.5 py-2 text-xs font-mono uppercase border border-[#E5E7EB] hover:bg-[#F5F5F5] rounded-[4px] text-[#6B7280] transition-colors"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 text-xs font-mono uppercase bg-[#111111] hover:bg-[#333333] text-white rounded-[4px] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingEdit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

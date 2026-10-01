"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);
const ASSET_BUCKET = "project-assets";

// Ikon Vektor Minimalis
const Spinner = ({ className = "w-4 h-4 text-current", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...props}>
    <path fill="currentColor" d="M12,23a9.63,9.63,0,0,1-8-9.5,9.51,9.51,0,0,1,6.79-9.1A1,1,0,0,1,12,5.19a8.4,8.4,0,0,0-6.1,8.31,8.44,8.44,0,0,0,8.38,8.38A1,1,0,0,1,12,23Z">
      <animateTransform attributeName="transform" type="rotate" dur="0.75s" from="0 12 12" to="360 12 12" repeatCount="indefinite" />
    </path>
  </svg>
);

const IconUser = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const IconBuilding = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
);

const IconCheck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const IconTrash = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("personal"); // "personal" | "organization"

  // Status State
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  // State Profil Personal
  const [personalData, setPersonalData] = useState({
    namaLengkap: "",
    nomorWhatsapp: "",
    jabatan: "",
  });

  // State Organisasi / Workspace
  const [orgId, setOrgId] = useState(null);
  const [orgData, setOrgData] = useState({
    namaOrganisasi: "",
    tipeOrganisasi: "personal",
    emailResmi: "",
    website: "",
    nomorTelepon: "",
    alamatJalan: "",
    alamatKota: "",
    nomorSuratPrefix: "SERTI",
    nomorSuratKode: "IND",
    logoUrl: "",
    capStempelUrl: "",
  });

  // Ref berkas upload
  const logoInputRef = useRef(null);
  const stempelInputRef = useRef(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingStempel, setIsUploadingStempel] = useState(false);

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

  // Muat data profil pengguna dan organisasi aktif
  useEffect(() => {
    if (!user) return;

    const loadProfileAndOrg = async () => {
      setIsLoadingData(true);
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let currentActiveOrgId = null;

        if (userSnap.exists()) {
          const uData = userSnap.data();
          setPersonalData({
            namaLengkap: uData.namaLengkap || user.displayName || "",
            nomorWhatsapp: uData.nomorWhatsapp || "",
            jabatan: uData.jabatan || "",
          });
          currentActiveOrgId = uData.activeOrgId || null;
        } else {
          const initialName = user.displayName || user.email?.split("@")[0] || "Pengguna SertiGen";
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            namaLengkap: initialName,
            nomorWhatsapp: "",
            jabatan: "Penyelenggara Mandiri",
            accountType: "personal",
            dibuatPada: serverTimestamp(),
            terakhirLogin: serverTimestamp(),
          });
          setPersonalData((prev) => ({
            ...prev,
            namaLengkap: initialName,
          }));
        }

        // Ambil data organisasi terkait jika sudah ada
        if (currentActiveOrgId) {
          const orgRef = doc(db, "organizations", currentActiveOrgId);
          const orgSnap = await getDoc(orgRef);
          if (orgSnap.exists()) {
            const o = orgSnap.data();
            setOrgId(orgSnap.id);
            setOrgData({
              namaOrganisasi: o.namaOrganisasi || "",
              tipeOrganisasi: o.tipeOrganisasi || "personal",
              emailResmi: o.emailResmi || "",
              website: o.website || "",
              nomorTelepon: o.nomorTelepon || "",
              alamatJalan: o.alamat?.jalan || "",
              alamatKota: o.alamat?.kota || "",
              nomorSuratPrefix: o.nomorSuratFormat?.prefix || (o.tipeOrganisasi === "personal" ? "SERTI" : "SK-SERTI"),
              nomorSuratKode: o.nomorSuratFormat?.kodeBagian || (o.tipeOrganisasi === "personal" ? "IND" : "HRD"),
              logoUrl: o.branding?.logoUrl || "",
              capStempelUrl: o.branding?.capStempelUrl || "",
            });
          }
        }
      } catch (err) {
        console.error("Gagal membaca profil:", err);
        notify("Kendala membaca profil: " + err.message, "error");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadProfileAndOrg();
  }, [user]);

  // Unggah Logo atau Cap Stempel ke Supabase Storage
  const handleUploadBrandingAsset = async (file, assetType) => {
    if (!file || !user) return;

    // Validasi ukuran berkas (Maks 2 MB)
    if (file.size > 2 * 1024 * 1024) {
      notify("Ukuran berkas maksimal 2 MB.", "error");
      return;
    }

    const isLogo = assetType === "logo";
    if (isLogo) setIsUploadingLogo(true);
    else setIsUploadingStempel(true);

    try {
      // Pastikan targetOrgId sinkron dengan ID Firestore agar tidak terjadi berkas yatim
      let currentTargetOrgId = orgId;
      if (!currentTargetOrgId) {
        const preAllocatedOrgRef = doc(collection(db, "organizations"));
        currentTargetOrgId = preAllocatedOrgRef.id;
        setOrgId(currentTargetOrgId);
      }

      const ext = file.name.split(".").pop();
      const filePath = `${user.uid}/organizations/${currentTargetOrgId}/${assetType}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(ASSET_BUCKET)
        .upload(filePath, file, {
          contentType: file.type || "image/png",
          upsert: true,
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from(ASSET_BUCKET)
        .getPublicUrl(filePath);

      if (isLogo) {
        setOrgData((prev) => ({ ...prev, logoUrl: urlData.publicUrl }));
        notify("Logo berhasil diunggah.", "success");
      } else {
        setOrgData((prev) => ({ ...prev, capStempelUrl: urlData.publicUrl }));
        notify("Cap / Tanda tangan berhasil diunggah.", "success");
      }
    } catch (err) {
      console.error("Gagal unggah berkas:", err);
      notify("Gagal mengunggah berkas: " + err.message, "error");
    } finally {
      if (isLogo) setIsUploadingLogo(false);
      else setIsUploadingStempel(false);
    }
  };

  // Simpan Tab 1: Profil Pribadi
  const handleSavePersonal = async (e) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      const trimmedName = personalData.namaLengkap.trim();

      // Sinkronkan ke Firebase Auth agar navbar & dashboard langsung terbarui
      if (auth.currentUser && trimmedName) {
        await updateProfile(auth.currentUser, { displayName: trimmedName });
      }

      // Simpan ke Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        namaLengkap: trimmedName,
        nomorWhatsapp: personalData.nomorWhatsapp.trim(),
        jabatan: personalData.jabatan.trim(),
        diperbaruiPada: serverTimestamp(),
      });

      notify("Profil personal berhasil diperbarui.", "success");
    } catch (err) {
      console.error("Gagal menyimpan profil personal:", err);
      notify("Gagal menyimpan profil: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Simpan Tab 2: Profil Organisasi / Ruang Kerja
  const handleSaveOrganization = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!orgData.namaOrganisasi.trim()) {
      notify("Nama entitas atau ruang kerja wajib diisi.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const cleanOrgName = orgData.namaOrganisasi.trim();
      const userRef = doc(db, "users", user.uid);

      // Gunakan ID yang sudah ada atau siapkan ID dokumen baru
      const targetOrgRef = orgId
        ? doc(db, "organizations", orgId)
        : doc(collection(db, "organizations"));

      const finalOrgId = targetOrgRef.id;
      if (!orgId) setOrgId(finalOrgId);

      const payload = {
        namaOrganisasi: cleanOrgName,
        tipeOrganisasi: orgData.tipeOrganisasi,
        emailResmi: orgData.emailResmi.trim(),
        website: orgData.website.trim(),
        nomorTelepon: orgData.nomorTelepon.trim(),
        alamat: {
          jalan: orgData.alamatJalan.trim(),
          kota: orgData.alamatKota.trim(),
        },
        branding: {
          logoUrl: orgData.logoUrl || null,
          capStempelUrl: orgData.capStempelUrl || null,
        },
        nomorSuratFormat: {
          prefix: orgData.nomorSuratPrefix.trim() || (orgData.tipeOrganisasi === "personal" ? "SERTI" : "SK-SERTI"),
          kodeBagian: orgData.nomorSuratKode.trim() || (orgData.tipeOrganisasi === "personal" ? "IND" : "HRD"),
        },
        pemilikId: user.uid,
        diperbaruiPada: serverTimestamp(),
      };

      const existingOrgSnap = await getDoc(targetOrgRef);

      if (!existingOrgSnap.exists()) {
        payload.dibuatPada = serverTimestamp();
        await setDoc(targetOrgRef, payload);

        await updateDoc(userRef, {
          activeOrgId: finalOrgId,
          accountType: orgData.tipeOrganisasi,
          organizations: [
            {
              orgId: finalOrgId,
              role: "owner",
              namaOrganisasi: cleanOrgName,
            },
          ],
        });
      } else {
        await updateDoc(targetOrgRef, payload);

        const uSnap = await getDoc(userRef);
        if (uSnap.exists()) {
          const currentOrgs = uSnap.data().organizations || [];
          const updatedOrgs = currentOrgs.map((item) =>
            item.orgId === finalOrgId ? { ...item, namaOrganisasi: cleanOrgName } : item
          );
          if (!updatedOrgs.some((item) => item.orgId === finalOrgId)) {
            updatedOrgs.push({ orgId: finalOrgId, role: "owner", namaOrganisasi: cleanOrgName });
          }

          await updateDoc(userRef, {
            accountType: orgData.tipeOrganisasi,
            organizations: updatedOrgs,
          });
        }
      }

      notify("Pengaturan identitas lembaga berhasil disimpan.", "success");
    } catch (err) {
      console.error("Gagal simpan organisasi:", err);
      notify("Gagal menyimpan organisasi: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !user || isLoadingData) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex flex-col items-center justify-center font-mono text-xs text-[#6B7280] space-y-3">
        <div className="w-5 h-5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
        <p>Memuat profil akun & ruang kerja...</p>
      </div>
    );
  }

  const isPersonalType = orgData.tipeOrganisasi === "personal";

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#111111] font-sans antialiased pb-20">
      {/* Toast Notifikasi Minimalis */}
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
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-base font-medium tracking-tight text-[#111111] hover:text-[#6B7280] transition-colors"
          >
            SertiGen
          </Link>
          <span className="text-[#B0B6C3]">/</span>
          <span className="text-xs font-mono text-[#6B7280] uppercase tracking-wider">
            Pengaturan Profil & Lembaga
          </span>
        </div>

        <Link
          href="/dashboard"
          className="text-xs font-mono px-3 py-1.5 border border-[#E5E7EB] hover:bg-[#F5F5F5] rounded-[4px] transition-colors text-[#111111]"
        >
          ← Kembali ke Dashboard
        </Link>
      </header>

      {/* Konten Utama */}
      <main className="max-w-4xl mx-auto px-6 pt-10 space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase text-[#6B7280] tracking-wider">
              Identitas & Sertifikasi
            </span>
            <span className="text-[#B0B6C3]">/</span>
            <span className="text-[11px] font-mono text-[#6B7280]">
              ID: {user.uid.slice(0, 8)}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-[-1px] text-[#111111] mt-3">
            Pengaturan Akun & Lembaga
          </h1>
          <p className="text-xs font-mono text-[#6B7280] mt-2 font-light">
            Konfigurasikan informasi pribadi dan identitas penyelenggara untuk aset sertifikat resmi.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#E5E7EB] gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`pb-3 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === "personal"
                ? "border-[#111111] text-[#111111] font-medium"
                : "border-transparent text-[#6B7280] hover:text-[#111111]"
            }`}
          >
            <IconUser className="w-3.5 h-3.5" />
            <span>Profil Pribadi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("organization")}
            className={`pb-3 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === "organization"
                ? "border-[#111111] text-[#111111] font-medium"
                : "border-transparent text-[#6B7280] hover:text-[#111111]"
            }`}
          >
            <IconBuilding className="w-3.5 h-3.5" />
            <span>{isPersonalType ? "Ruang Kerja Mandiri" : "Lembaga / Perusahaan (B2B)"}</span>
            {orgData.namaOrganisasi && (
              <span className="text-[10px] bg-[#F5F5F5] text-[#111111] border border-[#E5E7EB] px-1.5 py-0.5 rounded-[2px] font-mono lowercase">
                {orgData.namaOrganisasi}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: FORM PERSONAL */}
        {activeTab === "personal" && (
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-6 space-y-6">
            <div className="border-b border-[#E5E7EB] pb-3">
              <h2 className="text-sm font-medium text-[#111111]">
                Data Akun Personal
              </h2>
              <p className="text-xs text-[#6B7280] font-mono mt-0.5">
                Informasi identitas penanggung jawab atau pemilik akun platform.
              </p>
            </div>

            <form onSubmit={handleSavePersonal} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                  Email Akun (Firebase Auth)
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full text-xs font-mono bg-[#F5F5F5] border border-[#E5E7EB] rounded-[4px] p-2.5 text-[#6B7280] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                  Nama Lengkap Penanggung Jawab *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso, S.Kom."
                  value={personalData.namaLengkap}
                  onChange={(e) =>
                    setPersonalData({ ...personalData, namaLengkap: e.target.value })
                  }
                  className="w-full text-xs border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111] transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                    Nomor WhatsApp / Kontak
                  </label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={personalData.nomorWhatsapp}
                    onChange={(e) =>
                      setPersonalData({ ...personalData, nomorWhatsapp: e.target.value })
                    }
                    className="w-full text-xs border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111] font-mono transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                    Jabatan / Posisi
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Instruktur / Ketua Panitia"
                    value={personalData.jabatan}
                    onChange={(e) =>
                      setPersonalData({ ...personalData, jabatan: e.target.value })
                    }
                    className="w-full text-xs border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111] transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB]">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-mono uppercase bg-[#111111] hover:bg-[#333333] text-white rounded-[4px] transition-colors disabled:opacity-40 flex items-center gap-2"
                >
                  {isSaving ? <Spinner /> : null}
                  <span>{isSaving ? "Menyimpan..." : "Simpan Profil Personal"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: FORM ORGANISASI / RUANG KERJA */}
        {activeTab === "organization" && (
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between border-b border-[#E5E7EB] pb-3 gap-2">
              <div>
                <h2 className="text-sm font-medium text-[#111111]">
                  {isPersonalType ? "Identitas Ruang Kerja Mandiri" : "Identitas Entitas Badan Usaha"}
                </h2>
                <p className="text-xs text-[#6B7280] font-mono mt-0.5">
                  ID Dokumen: <code className="bg-[#F5F5F5] px-1.5 py-0.5 rounded border border-[#E5E7EB] text-[#111111]">organizations/{orgId || "baru"}</code>
                </p>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-[#F5F5F5] text-[#6B7280] border border-[#E5E7EB]">
                {isPersonalType ? "Akun Perseorangan" : "Multi-Tenancy Siap"}
              </span>
            </div>

            <form onSubmit={handleSaveOrganization} className="space-y-6">
              {/* Seksi 1: Data Identitas Penyelenggara */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono uppercase text-[#6B7280] border-b border-[#E5E7EB] pb-1">
                  1. Informasi Penyelenggara
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                      {isPersonalType
                        ? "Nama Jenama / Komunitas / Studio *"
                        : "Nama Resmi Instansi / Perusahaan / PT *"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        isPersonalType
                          ? "Contoh: Budi Studio / Kursus Desain Mandiri"
                          : "Contoh: PT Teknologi Bangsa Indonesia"
                      }
                      value={orgData.namaOrganisasi}
                      onChange={(e) => setOrgData({ ...orgData, namaOrganisasi: e.target.value })}
                      className="w-full text-xs border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                      Tipe Penyelenggara
                    </label>
                    <select
                      value={orgData.tipeOrganisasi}
                      onChange={(e) => setOrgData({ ...orgData, tipeOrganisasi: e.target.value })}
                      className="w-full text-xs border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111] bg-[#FFFFFF] transition-colors"
                    >
                      <option value="personal">Perseorangan / Mandiri</option>
                      <option value="pt">Perseroan Terbatas (PT)</option>
                      <option value="cv">CV / Firma</option>
                      <option value="universitas">Universitas / Sekolah</option>
                      <option value="instansi_pemerintah">Instansi Pemerintah</option>
                      <option value="yayasan">Yayasan / LSM</option>
                      <option value="komunitas">Komunitas / Organisasi</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                      Email Kontak Resmi
                    </label>
                    <input
                      type="email"
                      placeholder="kontak@lembaga.com"
                      value={orgData.emailResmi}
                      onChange={(e) => setOrgData({ ...orgData, emailResmi: e.target.value })}
                      className="w-full text-xs border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111] font-mono transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                      Website / Media Sosial
                    </label>
                    <input
                      type="text"
                      placeholder="https://lembaga.co.id"
                      value={orgData.website}
                      onChange={(e) => setOrgData({ ...orgData, website: e.target.value })}
                      className="w-full text-xs border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                      Nomor Telepon Kantor/HP
                    </label>
                    <input
                      type="text"
                      placeholder="08123456789"
                      value={orgData.nomorTelepon}
                      onChange={(e) => setOrgData({ ...orgData, nomorTelepon: e.target.value })}
                      className="w-full text-xs border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111] font-mono transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                      Alamat / Domisili
                    </label>
                    <input
                      type="text"
                      placeholder="Jl. Sudirman No. 45"
                      value={orgData.alamatJalan}
                      onChange={(e) => setOrgData({ ...orgData, alamatJalan: e.target.value })}
                      className="w-full text-xs border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                      Kota & Provinsi
                    </label>
                    <input
                      type="text"
                      placeholder="Jakarta Selatan, DKI"
                      value={orgData.alamatKota}
                      onChange={(e) => setOrgData({ ...orgData, alamatKota: e.target.value })}
                      className="w-full text-xs border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Seksi 2: Aturan Penomoran Surat / Registrasi */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-mono uppercase text-[#6B7280] border-b border-[#E5E7EB] pb-1">
                  2. Aturan Pola Penomoran Sertifikat
                </h3>
                <p className="text-xs text-[#6B7280] font-mono">
                  Pola ini digunakan sebagai nomor unik dokumen sertifikat setiap peserta.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                      Prefix Dokumen
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: SK-SERTI / NO"
                      value={orgData.nomorSuratPrefix}
                      onChange={(e) => setOrgData({ ...orgData, nomorSuratPrefix: e.target.value })}
                      className="w-full text-xs font-mono border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">
                      Kode Bagian / Divisi
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: HRD / IND / DIKTI"
                      value={orgData.nomorSuratKode}
                      onChange={(e) => setOrgData({ ...orgData, nomorSuratKode: e.target.value })}
                      className="w-full text-xs font-mono border border-[#E5E7EB] rounded-[4px] p-2.5 outline-none focus:border-[#111111] transition-colors"
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#F5F5F5] border border-[#E5E7EB] rounded-[4px] text-xs font-mono text-[#6B7280]">
                  Pratinjau Nomor Unik:{" "}
                  <strong className="text-[#111111]">
                    {orgData.nomorSuratPrefix || "SK"}/{orgData.nomorSuratKode || "HRD"}/2026/0001
                  </strong>
                </div>
              </div>

              {/* Seksi 3: Aset Branding Visual */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-mono uppercase text-[#6B7280] border-b border-[#E5E7EB] pb-1">
                  3. Aset Visual Resmi (Supabase Storage)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Upload Logo */}
                  <div className="border border-[#E5E7EB] rounded-md p-4 space-y-3 flex flex-col justify-between bg-[#F5F5F5]">
                    <div>
                      <span className="text-xs font-medium text-[#111111] block">
                        {isPersonalType ? "Logo / Inisial Jenama" : "Logo Lembaga (PNG Transparan)"}
                      </span>
                      <p className="text-[11px] text-[#6B7280] font-mono mt-0.5">
                        Logo utama untuk disematkan pada kanvas sertifikat. Maks 2 MB.
                      </p>
                    </div>

                    <div className="h-28 border border-dashed border-[#E5E7EB] rounded-[4px] bg-[#FFFFFF] flex items-center justify-center p-2 overflow-hidden">
                      {orgData.logoUrl ? (
                        <img
                          src={orgData.logoUrl}
                          alt="Logo Organisasi"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-[#B0B6C3] font-mono">Belum ada logo diunggah</span>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={logoInputRef}
                      accept="image/png, image/jpeg"
                      onChange={(e) => handleUploadBrandingAsset(e.target.files?.[0], "logo")}
                      className="hidden"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isUploadingLogo}
                        onClick={() => logoInputRef.current?.click()}
                        className="flex-1 py-1.5 text-xs font-mono uppercase rounded-[4px] border border-[#111111] bg-[#111111] text-white hover:bg-[#333333] transition-colors flex items-center justify-center gap-1.5"
                      >
                        {isUploadingLogo ? <Spinner /> : null}
                        <span>{isUploadingLogo ? "Mengunggah..." : "Pilih Logo"}</span>
                      </button>

                      {orgData.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setOrgData((prev) => ({ ...prev, logoUrl: "" }))}
                          className="p-1.5 text-[#6B7280] hover:text-[#D92D20] rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] transition-colors"
                          title="Hapus Logo"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upload Cap Stempel atau Tanda Tangan */}
                  <div className="border border-[#E5E7EB] rounded-md p-4 space-y-3 flex flex-col justify-between bg-[#F5F5F5]">
                    <div>
                      <span className="text-xs font-medium text-[#111111] block">
                        {isPersonalType
                          ? "Tanda Tangan Digital (PNG Transparan)"
                          : "Cap Stempel Resmi (PNG Transparan)"}
                      </span>
                      <p className="text-[11px] text-[#6B7280] font-mono mt-0.5">
                        {isPersonalType
                          ? "Tanda tangan transparan penanggung jawab. Maks 2 MB."
                          : "Cap stempel transparan di area tanda tangan. Maks 2 MB."}
                      </p>
                    </div>

                    <div className="h-28 border border-dashed border-[#E5E7EB] rounded-[4px] bg-[#FFFFFF] flex items-center justify-center p-2 overflow-hidden">
                      {orgData.capStempelUrl ? (
                        <img
                          src={orgData.capStempelUrl}
                          alt="Cap / TTD"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-[#B0B6C3] font-mono">Belum ada berkas diunggah</span>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={stempelInputRef}
                      accept="image/png"
                      onChange={(e) => handleUploadBrandingAsset(e.target.files?.[0], "stempel")}
                      className="hidden"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isUploadingStempel}
                        onClick={() => stempelInputRef.current?.click()}
                        className="flex-1 py-1.5 text-xs font-mono uppercase rounded-[4px] border border-[#111111] bg-[#111111] text-white hover:bg-[#333333] transition-colors flex items-center justify-center gap-1.5"
                      >
                        {isUploadingStempel ? <Spinner /> : null}
                        <span>
                          {isUploadingStempel
                            ? "Mengunggah..."
                            : isPersonalType
                            ? "Pilih Tanda Tangan"
                            : "Pilih Cap Stempel"}
                        </span>
                      </button>

                      {orgData.capStempelUrl && (
                        <button
                          type="button"
                          onClick={() => setOrgData((prev) => ({ ...prev, capStempelUrl: "" }))}
                          className="p-1.5 text-[#6B7280] hover:text-[#D92D20] rounded-[4px] border border-[#E5E7EB] bg-[#FFFFFF] transition-colors"
                          title="Hapus Berkas"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tombol Simpan Organisasi */}
              <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
                <span className="text-xs font-mono text-[#6B7280]">
                  {isPersonalType
                    ? "Dapat ditingkatkan ke status Badan Hukum/PT kapan saja."
                    : "Identitas ini otomatis terhubung pada seluruh sertifikat event."}
                </span>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-mono uppercase bg-[#111111] hover:bg-[#333333] text-white rounded-[4px] transition-colors disabled:opacity-40 flex items-center gap-2"
                >
                  {isSaving ? <Spinner /> : null}
                  <span>{isSaving ? "Menyimpan ke Cloud..." : "Simpan Pengaturan Lembaga"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
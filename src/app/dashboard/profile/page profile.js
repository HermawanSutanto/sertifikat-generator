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
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);
const ASSET_BUCKET = "project-assets";

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

        // Ambil data organisasi terkait
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

    const isLogo = assetType === "logo";
    if (isLogo) setIsUploadingLogo(true);
    else setIsUploadingStempel(true);

    try {
      const ext = file.name.split(".").pop();
      const currentTargetOrgId = orgId || `org_${user.uid.slice(0, 8)}`;
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
        notify("Logo berhasil diunggah!", "success");
      } else {
        setOrgData((prev) => ({ ...prev, capStempelUrl: urlData.publicUrl }));
        notify("Cap / Tanda tangan berhasil diunggah!", "success");
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

      notify("Profil pribadi berhasil diperbarui!", "success");
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
      let targetOrgId = orgId;
      const cleanOrgName = orgData.namaOrganisasi.trim();

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

      const userRef = doc(db, "users", user.uid);

      if (!targetOrgId) {
        // Pembuatan entitas baru
        payload.dibuatPada = serverTimestamp();
        const newOrgRef = await addDoc(collection(db, "organizations"), payload);
        targetOrgId = newOrgRef.id;
        setOrgId(targetOrgId);

        await updateDoc(userRef, {
          activeOrgId: targetOrgId,
          accountType: orgData.tipeOrganisasi,
          organizations: [
            {
              orgId: targetOrgId,
              role: "owner",
              namaOrganisasi: cleanOrgName,
            },
          ],
        });
      } else {
        // Pembaruan entitas yang sudah ada
        await updateDoc(doc(db, "organizations", targetOrgId), payload);

        // Ambil data user terkini untuk memperbarui array organizations secara utuh
        const uSnap = await getDoc(userRef);
        if (uSnap.exists()) {
          const currentOrgs = uSnap.data().organizations || [];
          const updatedOrgs = currentOrgs.map((item) =>
            item.orgId === targetOrgId ? { ...item, namaOrganisasi: cleanOrgName } : item
          );
          if (updatedOrgs.length === 0) {
            updatedOrgs.push({ orgId: targetOrgId, role: "owner", namaOrganisasi: cleanOrgName });
          }

          await updateDoc(userRef, {
            accountType: orgData.tipeOrganisasi,
            organizations: updatedOrgs,
          });
        }
      }

      notify("Pengaturan identitas lembaga berhasil disimpan!", "success");
    } catch (err) {
      console.error("Gagal simpan organisasi:", err);
      notify("Gagal menyimpan organisasi: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !user || isLoadingData) {
    return (
      <div className="min-h-screen bg-[#EBE9E4] flex flex-col items-center justify-center font-mono text-xs text-[#555555] space-y-2">
        <div className="w-5 h-5 border-2 border-[#0000EE] border-t-transparent rounded-full animate-spin" />
        <p>Memuat profil akun & ruang kerja...</p>
      </div>
    );
  }

  const isPersonalType = orgData.tipeOrganisasi === "personal";

  return (
    <div className="min-h-screen bg-[#EBE9E4] text-[#111111] font-sans pb-16">
      {statusMessage.text && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-[4px] shadow-lg text-xs font-mono border transition-all ${
            statusMessage.type === "error"
              ? "bg-[#B3261E] text-white border-[#B3261E]"
              : statusMessage.type === "success"
              ? "bg-[#0000EE] text-white border-[#0000EE]"
              : "bg-[#111111] text-white border-[#111111]"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Header Navigasi */}
      <header className="border-b border-[#111111]/20 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-[#555555] hover:text-[#111111] font-semibold">
            Dashboard
          </Link>
          <span className="text-[#CCCCCC]">/</span>
          <span className="font-bold text-[#111111]">Pengaturan Profil & Lembaga</span>
        </div>

        <Link
          href="/dashboard"
          className="text-xs font-mono text-[#555555] hover:text-[#0000EE] transition font-semibold"
        >
          ← Kembali ke Dashboard
        </Link>
      </header>

      {/* Konten Utama */}
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#111111]">
            Pengaturan Akun & Lembaga
          </h1>
          <p className="text-xs text-[#555555] font-mono mt-1">
            Konfigurasikan informasi pribadi dan identitas penyelenggara untuk aset sertifikat resmi.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#111111]/20">
          <button
            onClick={() => setActiveTab("personal")}
            className={`py-2.5 px-5 text-xs font-bold font-mono transition-all border-b-2 -mb-px flex items-center gap-2 uppercase tracking-wide ${
              activeTab === "personal"
                ? "border-[#0000EE] text-[#0000EE] bg-white rounded-t-[4px]"
                : "border-transparent text-[#777777] hover:text-[#111111]"
            }`}
          >
            <span>👤</span>
            <span>Profil Pribadi</span>
          </button>

          <button
            onClick={() => setActiveTab("organization")}
            className={`py-2.5 px-5 text-xs font-bold font-mono transition-all border-b-2 -mb-px flex items-center gap-2 uppercase tracking-wide ${
              activeTab === "organization"
                ? "border-[#0000EE] text-[#0000EE] bg-white rounded-t-[4px]"
                : "border-transparent text-[#777777] hover:text-[#111111]"
            }`}
          >
            <span>{isPersonalType ? "🎨" : "🏢"}</span>
            <span>{isPersonalType ? "Ruang Kerja & Jenama Mandiri" : "Lembaga / Perusahaan (B2B)"}</span>
            {orgData.namaOrganisasi && (
              <span className="text-[10px] bg-[#0000EE]/10 text-[#0000EE] border border-[#0000EE]/30 px-1.5 py-0.5 rounded-[2px] font-mono lowercase">
                {orgData.namaOrganisasi}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: FORM PERSONAL */}
        {activeTab === "personal" && (
          <div className="bg-white border border-[#111111] rounded-[4px] p-6 shadow-md space-y-6">
            <div className="border-b border-[#111111]/15 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#111111]">
                Data Akun Personal
              </h2>
              <p className="text-xs text-[#555555] font-mono mt-0.5">
                Informasi identitas penanggung jawab atau pemilik akun platform.
              </p>
            </div>

            <form onSubmit={handleSavePersonal} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
                  Email Akun (Firebase Auth)
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full text-xs font-mono bg-[#F5F4F0] border border-[#111111]/20 rounded-[4px] p-2.5 text-[#777777] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
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
                  className="w-full text-xs border border-[#111111]/25 bg-white rounded-[4px] p-2.5 outline-none focus:border-[#0000EE] focus:ring-1 focus:ring-[#0000EE]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={personalData.nomorWhatsapp}
                    onChange={(e) =>
                      setPersonalData({ ...personalData, nomorWhatsapp: e.target.value })
                    }
                    className="w-full text-xs border border-[#111111]/25 bg-white rounded-[4px] p-2.5 outline-none focus:border-[#0000EE] focus:ring-1 focus:ring-[#0000EE] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
                    Jabatan / Posisi
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Instruktur / Ketua Panitia"
                    value={personalData.jabatan}
                    onChange={(e) =>
                      setPersonalData({ ...personalData, jabatan: e.target.value })
                    }
                    className="w-full text-xs border border-[#111111]/25 bg-white rounded-[4px] p-2.5 outline-none focus:border-[#0000EE] focus:ring-1 focus:ring-[#0000EE]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#111111]/15">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 text-xs font-mono font-semibold uppercase tracking-wide bg-[#111111] hover:bg-[#0000EE] text-white rounded-[4px] transition shadow-xs disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Profil Personal"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: FORM ORGANISASI / RUANG KERJA */}
        {activeTab === "organization" && (
          <div className="bg-white border border-[#111111] rounded-[4px] p-6 shadow-md space-y-6">
            <div className="flex flex-wrap items-center justify-between border-b border-[#111111]/15 pb-3 gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-tight text-[#111111]">
                  {isPersonalType ? "Identitas Ruang Kerja Mandiri" : "Identitas Entitas Badan Usaha"}
                </h2>
                <p className="text-xs text-[#555555] font-mono mt-0.5">
                  ID Dokumen: <code className="bg-[#F5F4F0] px-1.5 py-0.5 rounded border text-[#111111]">organizations/{orgId || "baru"}</code>
                </p>
              </div>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-[2px] font-bold border ${
                isPersonalType
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                {isPersonalType ? "Akun Perseorangan" : "Multi-Tenancy Siap"}
              </span>
            </div>

            <form onSubmit={handleSaveOrganization} className="space-y-6">
              {/* Seksi 1: Data Identitas Penyelenggara */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase text-[#555555] border-b border-[#111111]/10 pb-1">
                  1. Informasi Penyelenggara
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
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
                      className="w-full text-xs border border-[#111111]/25 bg-white rounded-[4px] p-2.5 outline-none focus:border-[#0000EE] font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
                      Tipe Penyelenggara
                    </label>
                    <select
                      value={orgData.tipeOrganisasi}
                      onChange={(e) => setOrgData({ ...orgData, tipeOrganisasi: e.target.value })}
                      className="w-full text-xs border border-[#111111]/25 bg-white rounded-[4px] p-2.5 outline-none focus:border-[#0000EE]"
                    >
                      <option value="personal">👤 Perseorangan / Mandiri</option>
                      <option value="pt">🏢 Perseroan Terbatas (PT)</option>
                      <option value="cv">💼 CV / Firma</option>
                      <option value="universitas">🎓 Universitas / Sekolah</option>
                      <option value="instansi_pemerintah">🏛️ Instansi Pemerintah</option>
                      <option value="yayasan">🤝 Yayasan / LSM</option>
                      <option value="komunitas">👥 Komunitas / Organisasi</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
                      Email Kontak Resmi
                    </label>
                    <input
                      type="email"
                      placeholder="kontak@lembaga.com"
                      value={orgData.emailResmi}
                      onChange={(e) => setOrgData({ ...orgData, emailResmi: e.target.value })}
                      className="w-full text-xs border border-[#111111]/25 bg-white rounded-[4px] p-2.5 outline-none focus:border-[#0000EE] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
                      Website / Media Sosial
                    </label>
                    <input
                      type="text"
                      placeholder="https://lembaga.co.id"
                      value={orgData.website}
                      onChange={(e) => setOrgData({ ...orgData, website: e.target.value })}
                      className="w-full text-xs border border-[#111111]/25 bg-white rounded-[4px] p-2.5 outline-none focus:border-[#0000EE]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
                      Nomor Telepon Kantor/HP
                    </label>
                    <input
                      type="text"
                      placeholder="08123456789"
                      value={orgData.nomorTelepon}
                      onChange={(e) => setOrgData({ ...orgData, nomorTelepon: e.target.value })}
                      className="w-full text-xs border border-[#111111]/25 bg-white rounded-[4px] p-2.5 outline-none focus:border-[#0000EE] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
                      Alamat / Domisili
                    </label>
                    <input
                      type="text"
                      placeholder="Jl. Sudirman No. 45"
                      value={orgData.alamatJalan}
                      onChange={(e) => setOrgData({ ...orgData, alamatJalan: e.target.value })}
                      className="w-full text-xs border border-[#111111]/25 bg-white rounded-[4px] p-2.5 outline-none focus:border-[#0000EE]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
                      Kota & Provinsi
                    </label>
                    <input
                      type="text"
                      placeholder="Jakarta Selatan, DKI"
                      value={orgData.alamatKota}
                      onChange={(e) => setOrgData({ ...orgData, alamatKota: e.target.value })}
                      className="w-full text-xs border border-[#111111]/25 bg-white rounded-[4px] p-2.5 outline-none focus:border-[#0000EE]"
                    />
                  </div>
                </div>
              </div>

              {/* Seksi 2: Aturan Penomoran Surat / Registrasi */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-mono font-bold uppercase text-[#555555] border-b border-[#111111]/10 pb-1">
                  2. Aturan Pola Penomoran Sertifikat
                </h3>
                <p className="text-xs text-[#555555] font-mono">
                  Pola ini digunakan sebagai nomor unik dokumen sertifikat tiap peserta.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                  <div>
                    <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
                      Prefix Surat
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: SK-SERTI / NO"
                      value={orgData.nomorSuratPrefix}
                      onChange={(e) => setOrgData({ ...orgData, nomorSuratPrefix: e.target.value })}
                      className="w-full text-xs font-mono border border-[#111111]/25 bg-white rounded-[4px] p-2.5 outline-none focus:border-[#0000EE]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-semibold uppercase tracking-wide text-[#111111] mb-1">
                      Kode Bagian / Divisi
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: HRD / IND / DIKTI"
                      value={orgData.nomorSuratKode}
                      onChange={(e) => setOrgData({ ...orgData, nomorSuratKode: e.target.value })}
                      className="w-full text-xs font-mono border border-[#111111]/25 bg-white rounded-[4px] p-2.5 outline-none focus:border-[#0000EE]"
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#F5F4F0] border border-[#111111]/15 rounded-[4px] text-xs font-mono text-[#555555]">
                  Pratinjau Nomor Unik:{" "}
                  <strong className="text-[#0000EE]">
                    {orgData.nomorSuratPrefix || "SK"}/{orgData.nomorSuratKode || "HRD"}/2026/0001
                  </strong>
                </div>
              </div>

              {/* Seksi 3: Aset Branding Visual */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-mono font-bold uppercase text-[#555555] border-b border-[#111111]/10 pb-1">
                  3. Aset Visual Resmi (Supabase Storage)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Upload Logo */}
                  <div className="border border-[#111111]/20 rounded-[4px] p-4 space-y-3 flex flex-col justify-between bg-[#F5F4F0]/40">
                    <div>
                      <span className="text-xs font-bold uppercase text-[#111111] block">
                        {isPersonalType ? "Logo / Inisial Jenama" : "Logo Lembaga (PNG Transparan)"}
                      </span>
                      <p className="text-[11px] text-[#555555] font-mono mt-0.5">
                        Logo utama untuk disematkan pada kop & sertifikat.
                      </p>
                    </div>

                    <div className="h-28 border border-dashed border-[#111111]/25 rounded-[4px] bg-white flex items-center justify-center p-2 overflow-hidden">
                      {orgData.logoUrl ? (
                        <img
                          src={orgData.logoUrl}
                          alt="Logo Organisasi"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-[#777777] font-mono">Belum ada logo diunggah</span>
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
                        className="flex-1 py-2 text-xs font-mono uppercase font-bold rounded-[4px] border border-[#111111]/30 bg-white hover:bg-[#EBE9E4] transition"
                      >
                        {isUploadingLogo ? "Mengunggah..." : "Pilih Logo"}
                      </button>

                      {orgData.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setOrgData((prev) => ({ ...prev, logoUrl: "" }))}
                          className="px-3 py-2 text-xs font-mono uppercase font-bold text-[#B3261E] hover:bg-red-50 rounded-[4px] border border-red-200 transition"
                          title="Hapus Logo"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upload Cap Stempel atau Tanda Tangan */}
                  <div className="border border-[#111111]/20 rounded-[4px] p-4 space-y-3 flex flex-col justify-between bg-[#F5F4F0]/40">
                    <div>
                      <span className="text-xs font-bold uppercase text-[#111111] block">
                        {isPersonalType
                          ? "Tanda Tangan Digital (PNG Transparan)"
                          : "Cap Stempel Resmi (PNG Transparan)"}
                      </span>
                      <p className="text-[11px] text-[#555555] font-mono mt-0.5">
                        {isPersonalType
                          ? "Tanda tangan transparan penanggung jawab sertifikat."
                          : "Cap basah transparan untuk diletakkan di area tanda tangan."}
                      </p>
                    </div>

                    <div className="h-28 border border-dashed border-[#111111]/25 rounded-[4px] bg-white flex items-center justify-center p-2 overflow-hidden">
                      {orgData.capStempelUrl ? (
                        <img
                          src={orgData.capStempelUrl}
                          alt="Cap / TTD"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-[#777777] font-mono">Belum ada berkas diunggah</span>
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
                        className="flex-1 py-2 text-xs font-mono uppercase font-bold rounded-[4px] border border-[#111111]/30 bg-white hover:bg-[#EBE9E4] transition"
                      >
                        {isUploadingStempel
                          ? "Mengunggah..."
                          : isPersonalType
                          ? "Pilih Tanda Tangan"
                          : "Pilih Cap Stempel"}
                      </button>

                      {orgData.capStempelUrl && (
                        <button
                          type="button"
                          onClick={() => setOrgData((prev) => ({ ...prev, capStempelUrl: "" }))}
                          className="px-3 py-2 text-xs font-mono uppercase font-bold text-[#B3261E] hover:bg-red-50 rounded-[4px] border border-red-200 transition"
                          title="Hapus Berkas"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tombol Simpan */}
              <div className="pt-4 border-t border-[#111111]/15 flex items-center justify-between">
                <span className="text-xs font-mono text-[#777777]">
                  {isPersonalType
                    ? "Dapat ditingkatkan ke status Badan Hukum/PT kapan saja."
                    : "Identitas ini otomatis terhubung pada seluruh sertifikat event."}
                </span>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 text-xs font-mono font-semibold uppercase tracking-wide bg-[#111111] hover:bg-[#0000EE] text-white rounded-[4px] transition shadow-xs disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan ke Cloud..." : "Simpan Pengaturan Lembaga"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
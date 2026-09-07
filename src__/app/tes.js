"use client";
import Image from "next/image";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Draggable from "react-draggable";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import Papa from "papaparse";
import { saveAs } from "file-saver";

// Komponen Spinner
const Spinner = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24"
    {...props}
  >
    <path
      fill="currentColor"
      d="M12,23a9.63,9.63,0,0,1-8-9.5,9.51,9.51,0,0,1,6.79-9.1A1,1,0,0,1,12,5.19a8.4,8.4,0,0,0-6.1,8.31,8.44,8.44,0,0,0,8.38,8.38A1,1,0,0,1,12,23Z"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        dur="0.75s"
        from="0 12 12"
        to="360 12 12"
        repeatCount="indefinite"
      />
    </path>
  </svg>
);

// Komponen Notifikasi
const Notification = ({ message, type, show }) => {
  const bgColor = type === "success" ? "bg-green-600" : "bg-red-600";
  return (
    <div
      className={`fixed top-5 right-5 p-4 rounded-lg text-white shadow-lg transition-transform transform ${
        show ? "translate-x-0" : "translate-x-full"
      } ${bgColor}`}
      style={{ zIndex: 1000 }}
    >
      {message}
    </div>
  );
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // State utama
  const [templateFile, setTemplateFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success"
  });

  // == BAGIAN BARU: State untuk mode input & data dinamis ==
  const [inputMode, setInputMode] = useState("manual"); // 'manual' atau 'csv'
  const [manualNames, setManualNames] = useState("Andi Budi, Candra Dwi");
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const elementRefs = useRef(new Map());
  const [textElements, setTextElements] = useState([
    {
      id: 1,
      label: "NAMA_PESERTA",
      textPreview: "Nama Peserta",
      positionPercent: { x: 0.5, y: 0.5 },
      fontSize: 48,
      fontFamily: "Roboto",
      textColor: "#333333"
    },
    {
      id: 2,
      label: "JABATAN",
      textPreview: "Jabatan/Peran",
      positionPercent: { x: 0.5, y: 0.6 },
      fontSize: 24,
      fontFamily: "Roboto",
      textColor: "#555555"
    }
  ]);
  useEffect(() => {
    textElements.forEach((el) => {
      // Kita akan gunakan metode Map di sini, sesuai perbaikan #2
      if (!elementRefs.current.has(el.id)) {
        elementRefs.current.set(el.id, React.createRef());
      }
    });
  }, [textElements]);
  // State untuk Pagination & Download
  const [certificates, setCertificates] = useState([]);
  const [lastDocId, setLastDocId] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // State untuk Batch Processing
  const [progress, setProgress] = useState(null);

  const previewContainerRef = useRef(null);

  // Efek untuk notifikasi dan proteksi halaman
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(
        () => setNotification({ ...notification, show: false }),
        4000
      );
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fungsi Fetch & Pagination (Tidak ada perubahan)
  const fetchInitialCertificates = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/certificates", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Gagal mengambil data dari server.");
      const data = await response.json();
      setCertificates(data.certificates);
      setLastDocId(data.lastDocId);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Gagal mengambil daftar sertifikat:", error);
    }
  }, [user]);
  const handleLoadMore = async () => {
    if (!user || !lastDocId || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/certificates?lastVisible=${lastDocId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!response.ok) throw new Error("Gagal memuat data selanjutnya.");
      const data = await response.json();
      setCertificates((prev) => [...prev, ...data.certificates]);
      setLastDocId(data.lastDocId);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Gagal memuat lebih banyak sertifikat:", error);
      setNotification({ show: true, message: error.message, type: "error" });
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInitialCertificates();
    }
  }, [user, fetchInitialCertificates]);

  // == BAGIAN BARU: Fungsi untuk menangani CSV, Mapping, dan Elemen Teks ==
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length > 0 && results.meta.fields) {
            setCsvHeaders(results.meta.fields);
            setCsvData(results.data);
            setMapping({}); // Reset mapping saat file baru diunggah
          } else {
            setNotification({
              show: true,
              message: "File CSV tidak valid atau kosong.",
              type: "error"
            });
          }
        },
        error: (err) => {
          setNotification({
            show: true,
            message: `Gagal membaca CSV: ${err.message}`,
            type: "error"
          });
        }
      });
    }
  };

  const handleMappingChange = (label, csvHeader) => {
    setMapping((prev) => ({ ...prev, [label]: csvHeader }));
  };

  const handleElementChange = (id, field, value) => {
    setTextElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, [field]: value } : el))
    );
  };

  const createDragHandler = (id) => (e, ui) => {
    const container = previewContainerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    const textElementNode = ui.node;
    const newX = ui.x + textElementNode.offsetWidth / 2;
    const newY = ui.y + textElementNode.offsetHeight / 2;

    handleElementChange(id, "positionPercent", {
      x: newX / width,
      y: newY / height
    });
  };

  // == BAGIAN DIMODIFIKASI: handleGenerate sekarang mendukung mode ganda ==
  const handleGenerate = async () => {
    if (!templateFile || !user) {
      setNotification({
        show: true,
        message: "Pilih template dan pastikan Anda login.",
        type: "error"
      });
      return;
    }

    let dataToSend = [];
    let finalMapping = {};

    if (inputMode === "manual") {
      const primaryLabel = textElements[0]?.label || "NAMA_PESERTA";
      dataToSend = manualNames
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name)
        .map((name) => ({ [primaryLabel]: name }));
      finalMapping = { [primaryLabel]: primaryLabel };
    } else {
      dataToSend = csvData;
      finalMapping = mapping;
    }

    if (dataToSend.length === 0) {
      setNotification({
        show: true,
        message: "Tidak ada data untuk diproses.",
        type: "error"
      });
      return;
    }

    setIsLoading(true);
    setProgress({ current: 0, total: dataToSend.length });

    try {
      const token = await user.getIdToken();
      const formData = new FormData();

      formData.append("template", templateFile);
      formData.append("previewWidth", previewSize.width);
      formData.append(
        "textElements",
        JSON.stringify(textElements.map(({ ref, ...rest }) => rest))
      );
      formData.append("csvData", JSON.stringify(dataToSend));
      formData.append("mapping", JSON.stringify(finalMapping));

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Gagal generate sertifikat");
      }

      setNotification({
        show: true,
        message: "Sukses! Sertifikat sedang dibuat.",
        type: "success"
      });
      await fetchInitialCertificates();
    } catch (error) {
      setNotification({
        show: true,
        message: `Gagal: ${error.message}`,
        type: "error"
      });
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  // Fungsi Download & Logout (Tidak ada perubahan)
  const handleDownloadSingle = async (url, name) => {
    try {
      setNotification({
        show: true,
        message: `Mengunduh ${name}...`,
        type: "success"
      });
      const response = await fetch(url);
      const blob = await response.blob();
      saveAs(blob, `sertifikat-${name.replace(/\s+/g, "-")}.png`);
    } catch (error) {
      console.error("Download error:", error);
      setNotification({
        show: true,
        message: `Gagal mengunduh: ${error.message}`,
        type: "error"
      });
    }
  };
  const handleDownloadAll = async () => {
    if (!user) {
      setNotification({
        show: true,
        message: "Sesi tidak valid.",
        type: "error"
      });
      return;
    }

    if (certificates.length === 0) {
      setNotification({
        show: true,
        message: "Tidak ada sertifikat untuk diunduh.",
        type: "error"
      });
      return;
    }

    setIsZipping(true);
    setNotification({
      show: true,
      message: "Server sedang mempersiapkan file ZIP Anda...",
      type: "success"
    });

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/zip-certificates", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal membuat file ZIP.");
      }

      // Langsung buka URL yang diberikan server. Browser akan otomatis mengunduhnya.
      setNotification({
        show: true,
        message: "Unduhan Anda akan segera dimulai!",
        type: "success"
      });
      window.open(result.zipUrl, "_blank");
    } catch (error) {
      console.error("Zip error:", error);
      setNotification({
        show: true,
        message: `Gagal membuat ZIP: ${error.message}`,
        type: "error"
      });
    } finally {
      setIsZipping(false);
    }
  };
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  const handleCreateDesign = async () => {
    router.push("/create-design");
  };
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setTemplateFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    const updatePreviewSize = () => {
      if (previewContainerRef.current) {
        const { width, height } =
          previewContainerRef.current.getBoundingClientRect();
        setPreviewSize({ width, height });
      }
    };
    updatePreviewSize();
    window.addEventListener("resize", updatePreviewSize);
    return () => window.removeEventListener("resize", updatePreviewSize);
  }, [previewUrl]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <Notification {...notification} />
      <header className="w-full bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto flex justify-between items-center px-6 py-3">
          {/* Sisi Kiri: Judul */}
          <h1 className="text-xl font-bold text-indigo-700 tracking-tight">
            SertiGen Dashboard
          </h1>

          {/* SISI KANAN: Kumpulan Aksi (Tombol & User Info) */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleCreateDesign} // Pastikan nama fungsi ini sudah benar
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Buat Desain Baru</span>
            </button>

            {/* Pembatas Visual */}
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

            <div className="hidden md:flex items-center gap-4">
              <p className="text-sm text-slate-500">
                Login sebagai:{" "}
                <strong className="font-medium text-slate-700">
                  {user.email}
                </strong>
              </p>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 hover:text-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex flex-col items-center min-h-screen bg-blue-50 p-4 md:p-8 text-blue-900">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* KOLOM KIRI: KONTROL */}
          <div className="w-full p-8 space-y-6 bg-white rounded-2xl shadow-lg border border-blue-200">
            <h2 className="text-3xl font-bold text-center text-blue-800">
              Kontrol Generator
            </h2>

            {/* 1. Unggah Template */}
            <div>
              <label className="block text-sm font-semibold text-blue-700 mb-2">
                1. Unggah Template
              </label>
              <input
                id="file-upload"
                type="file"
                className="sr-only"
                accept="image/png, image/jpeg"
                onChange={handleFileChange}
              />
              <label
                htmlFor="file-upload"
                className="w-full flex justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer bg-blue-100 border-blue-300 hover:border-blue-500"
              >
                <span className="text-sm text-blue-700">
                  {templateFile
                    ? `Ganti: ${templateFile.name}`
                    : "Pilih file template"}
                </span>
              </label>
            </div>

            {/* 2. Input Data */}
            <div className="space-y-4 pt-4 border-t border-blue-200">
              <h3 className="text-lg font-medium text-blue-800">
                2. Input Data Peserta
              </h3>
              <div className="flex bg-blue-100 rounded-lg p-1">
                <button
                  onClick={() => setInputMode("manual")}
                  className={`w-full p-2 text-sm font-semibold rounded-md transition-colors ${
                    inputMode === "manual"
                      ? "bg-white text-blue-700 shadow"
                      : "text-blue-600"
                  }`}
                >
                  Input Manual
                </button>
                <button
                  onClick={() => setInputMode("csv")}
                  className={`w-full p-2 text-sm font-semibold rounded-md transition-colors ${
                    inputMode === "csv"
                      ? "bg-white text-blue-700 shadow"
                      : "text-blue-600"
                  }`}
                >
                  Unggah File CSV
                </button>
              </div>

              {inputMode === "manual" ? (
                <div>
                  <textarea
                    rows={3}
                    className="w-full p-2 border rounded-md bg-blue-50 border-blue-300"
                    placeholder="Contoh: Budi Santoso, Citra Lestari"
                    value={manualNames}
                    onChange={(e) => setManualNames(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    * Pisahkan nama dengan koma (,).
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    * Pastikan file CSV Anda memiliki header.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Mapping (hanya mode CSV) */}
            {inputMode === "csv" && csvHeaders.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-blue-200">
                <h3 className="text-lg font-medium text-blue-800">
                  3. Petakan Kolom
                </h3>
                {textElements.map((element) => (
                  <div
                    key={element.id}
                    className="grid grid-cols-2 items-center gap-4"
                  >
                    <label className="font-medium text-sm">
                      Elemen: {element.label}
                    </label>
                    <select
                      value={mapping[element.label] || ""}
                      onChange={(e) =>
                        handleMappingChange(element.label, e.target.value)
                      }
                      className="w-full p-2 border rounded-md bg-white border-blue-300"
                    >
                      <option value="" disabled>
                        Pilih Kolom CSV
                      </option>
                      {csvHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* 4. Kustomisasi Elemen Teks */}
            <div className="space-y-4 pt-4 border-t border-blue-200">
              <h3 className="text-lg font-medium text-blue-800">
                {inputMode === "csv" ? "4." : "3."} Kustomisasi Elemen
              </h3>
              {textElements.map((element) => (
                <div
                  key={element.id}
                  className="p-4 bg-blue-100 rounded-lg space-y-3"
                >
                  <input
                    type="text"
                    value={element.label}
                    onChange={(e) =>
                      handleElementChange(
                        element.id,
                        "label",
                        e.target.value.toUpperCase().replace(/\s+/g, "_")
                      )
                    }
                    className="font-semibold text-blue-900 bg-transparent border-b border-blue-300 focus:outline-none"
                  />
                  <div>
                    <label className="block text-sm font-medium text-blue-700">
                      Ukuran Font:{" "}
                      <span className="font-bold">{element.fontSize}px</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="120"
                      value={element.fontSize}
                      onChange={(e) =>
                        handleElementChange(
                          element.id,
                          "fontSize",
                          parseInt(e.target.value, 10)
                        )
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <select
                      value={element.fontFamily}
                      onChange={(e) =>
                        handleElementChange(
                          element.id,
                          "fontFamily",
                          e.target.value
                        )
                      }
                      className="w-full p-2 border rounded-md bg-white border-blue-300"
                    >
                      <option>Roboto</option>
                      <option>Montserrat</option>
                      <option>Playfair Display</option>
                      <option>Poppins</option>
                      <option>Lora</option>
                      <option>Pacifico</option>
                      <option>Caveat</option>
                    </select>
                    <input
                      type="color"
                      value={element.textColor}
                      onChange={(e) =>
                        handleElementChange(
                          element.id,
                          "textColor",
                          e.target.value
                        )
                      }
                      className="w-16 h-10 p-1 border rounded-md bg-white border-blue-300"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Tombol Generate */}
            <div className="pt-4 border-t border-blue-200">
              <button
                onClick={handleGenerate}
                disabled={isLoading || !templateFile}
                className="w-full flex justify-center p-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              >
                {isLoading ? <Spinner /> : "Generate Sertifikat"}
              </button>
              {progress && (
                <div className="mt-4">
                  <p className="text-sm text-center text-blue-700">
                    Memproses {progress.current} dari {progress.total}{" "}
                    sertifikat...
                  </p>
                  <div className="w-full bg-blue-200 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{
                        width: `${(progress.current / progress.total) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KOLOM KANAN: PREVIEW */}
          <div className="w-full p-4 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-blue-200">
            {previewUrl ? (
              <div
                ref={previewContainerRef}
                className="relative w-full max-w-[500px] aspect-video overflow-hidden border rounded-lg"
              >
                <Image
                  src={previewUrl}
                  alt="Template Preview"
                  fill // 'fill' akan membuat gambar mengisi div induk
                  style={{ objectFit: "contain" }} // Menggantikan className="object-contain"
                />
                {textElements.map((element) => {
                  // Fungsi untuk mendapatkan atau membuat ref untuk sebuah elemen
                  const getRef = (id) => {
                    if (!elementRefs.current.has(id)) {
                      elementRefs.current.set(id, createRef());
                    }
                    return elementRefs.current.get(id);
                  };

                  // Ambil ref yang stabil untuk elemen ini
                  const nodeRef = getRef(element.id);

                  // Hitung posisi piksel menggunakan ref yang baru didapat
                  const pixelPosition = {
                    x:
                      previewSize.width * element.positionPercent.x -
                      (nodeRef.current?.offsetWidth / 2 || 0),
                    y:
                      previewSize.height * element.positionPercent.y -
                      (nodeRef.current?.offsetHeight / 2 || 0)
                  };

                  return (
                    <Draggable
                      key={element.id}
                      nodeRef={nodeRef} // <-- Gunakan ref dari wadah
                      bounds="parent"
                      position={pixelPosition}
                      onStop={createDragHandler(element.id)}
                    >
                      <div
                        ref={nodeRef} // <-- Gunakan ref dari wadah
                        className="cursor-move absolute p-2"
                        style={{ top: 0, left: 0, whiteSpace: "nowrap" }}
                      >
                        <span
                          style={{
                            color: element.textColor,
                            fontSize: `${element.fontSize}px`,
                            fontFamily: element.fontFamily
                          }}
                        >
                          {element.textPreview}
                        </span>
                      </div>
                    </Draggable>
                  );
                })}
              </div>
            ) : (
              <div className="w-full max-w-[500px] aspect-video flex justify-center items-center border-2 border-dashed rounded-lg bg-blue-50">
                <p className="text-blue-700">Pratinjau Template</p>
              </div>
            )}
          </div>
        </div>

        {/* HASIL GENERATE */}
        <div className="w-full max-w-6xl mt-12">
          <div className="p-8 bg-white rounded-2xl shadow-lg border border-blue-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-blue-900">
                Hasil Generate Terbaru
              </h2>
              <button
                onClick={handleDownloadAll}
                disabled={isZipping || certificates.length === 0}
                className="px-4 py-2 flex items-center gap-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isZipping ? <Spinner className="w-4 h-4" /> : null}
                {isZipping ? "Zipping..." : "Download Semua"}
              </button>
            </div>

            {certificates.length > 0 ? (
              <div className="space-y-4">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-blue-100"
                  >
                    <div>
                      <p className="font-semibold text-blue-900">
                        {cert.namaPeserta}
                      </p>
                      <p className="text-sm text-blue-700">
                        Dibuat pada:{" "}
                        {new Date(
                          cert.dibuatPada.seconds * 1000
                        ).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleDownloadSingle(
                          cert.urlSertifikat,
                          cert.namaPeserta
                        )
                      }
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-blue-700">Belum ada sertifikat yang dibuat.</p>
            )}

            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait transition-colors"
                >
                  {isLoadingMore ? "Memuat..." : "Muat Lebih Banyak"}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

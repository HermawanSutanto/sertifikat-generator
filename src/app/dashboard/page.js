"use client";
import Image from "next/image";
import Link from "next/link";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  createRef
} from "react";
import Draggable from "react-draggable";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import Papa from "papaparse";
import { saveAs } from "file-saver";

// Komponen Spinner
// Komponen Spinner
const Spinner = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
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

// Modal pop-up (bukan toast) untuk peringatan batas kuota generate harian.
// Dipakai khusus untuk kasus ini karena "kuota habis" adalah kejadian yang
// sebaiknya benar-benar diperhatikan user (butuh klik "Mengerti" untuk
// menutup), berbeda dari notifikasi biasa yang otomatis hilang sendiri.
const QuotaLimitModal = ({ show, message, onClose }) => {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 1100, backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Batas Generate Harian Tercapai
          </h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Mengerti
        </button>
      </div>
    </div>
  );
};

// Batas ini HARUS sama dengan yang dipakai backend:
// MAX_CSV_ROWS di api/generate/route.js, dan
// MAX_CERTIFICATES_PER_ZIP di api/zip-certificates/route.js.
const MAX_GENERATE_ROWS = 500;
const MAX_ZIP_CERTIFICATES = 300;

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // State utama
  const [templateFile, setTemplateFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  // Rasio asli gambar template (width/height dalam piksel). Dipakai supaya
  // kotak preview mengikuti rasio ASLI template, bukan rasio tetap 16:9 —
  // kalau tidak, objectFit:"contain" akan menyisakan ruang kosong
  // (letterbox) di preview untuk template yang bukan 16:9, dan
  // positionPercent hasil drag jadi dihitung dari ukuran KOTAK, bukan
  // ukuran gambar yang benar-benar tampil -> posisi teks meleset saat
  // dirender di backend (yang menghitung dari imageWidth/imageHeight asli).
  const [templateNaturalSize, setTemplateNaturalSize] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success"
  });

  // State untuk mode input & data dinamis
  const [inputMode, setInputMode] = useState("manual"); // 'manual' atau 'csv'
  const [manualNames, setManualNames] = useState("Andi Budi, Candra Dwi");
  // Dipakai untuk menampilkan indikator langsung di setiap atribut kalau
  // jumlah nilai custom-nya belum cocok dengan jumlah nama.
  const manualNamesCount = manualNames
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n).length;
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
      textColor: "#333333",
      isLocked: true, // Elemen ini tidak bisa dihapus
      centerHorizontal: false
    },
    {
      id: 2,
      label: "JABATAN",
      textPreview: "Jabatan/Peran",
      positionPercent: { x: 0.5, y: 0.6 },
      fontSize: 24,
      fontFamily: "Roboto",
      textColor: "#555555",
      // PATCH: nilai custom per-sertifikat untuk mode manual (opsional).
      // Kosong -> pakai textPreview sebagai teks statis yang sama untuk
      // semua sertifikat (perilaku lama, tetap dipertahankan).
      manualValues: "",
      centerHorizontal: false
    }
  ]);

  useEffect(() => {
    textElements.forEach((el) => {
      if (!elementRefs.current.has(el.id)) {
        elementRefs.current.set(el.id, createRef());
      }
    });
  }, [textElements]);

  // State untuk Pagination & Download
  const [certificates, setCertificates] = useState([]);
  const [lastDocId, setLastDocId] = useState(null);
  const [lastVisibleTimestamp, setLastVisibleTimestamp] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(null);

  // State untuk checklist pilih-sertifikat (hapus/kompres terpilih)
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [isZippingSelected, setIsZippingSelected] = useState(false);

  // State untuk Batch Processing
  const [progress, setProgress] = useState(null);

  // State kuota generate harian (batas server: DAILY_GENERATE_LIMIT di
  // api/generate/route.js, saat ini 50 sertifikat/hari/user). `quota` diisi
  // dari response GET /api/generate (saat load) dan disinkronkan ulang
  // setiap kali POST /api/generate berhasil/ditolak, supaya indikator di UI
  // selalu mencerminkan angka terbaru dari server (sumber kebenaran ada di
  // backend, bukan dihitung sendiri di client).
  const [quota, setQuota] = useState(null); // { used, limit, remaining, resetAt } | null saat belum dimuat
  const [quotaModal, setQuotaModal] = useState({ show: false, message: "" });

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
      setLastVisibleTimestamp(data.lastVisibleTimestamp);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Gagal mengambil daftar sertifikat:", error);
    }
  }, [user]);

  const handleLoadMore = async () => {
    if (!user || !lastVisibleTimestamp || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/certificates?lastVisible=${lastVisibleTimestamp}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!response.ok) throw new Error("Gagal memuat data selanjutnya.");
      const data = await response.json();
      setCertificates((prev) => [...prev, ...data.certificates]);
      setLastDocId(data.lastDocId);
      setLastVisibleTimestamp(data.lastVisibleTimestamp);
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

  const fetchQuota = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/generate", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setQuota(data.quota);
      }
    } catch (error) {
      console.error("Gagal mengambil status kuota harian:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchQuota();
    }
  }, [user, fetchQuota]);

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length > 0 && results.meta.fields) {
            const headers = results.meta.fields;
            setCsvHeaders(headers);
            setCsvData(results.data);

            // PATCH: auto-mapping kolom CSV -> atribut berdasarkan URUTAN,
            // kalau jumlah kolom CSV sama persis dengan jumlah atribut yang
            // sudah ditambahkan (kolom ke-N dipetakan ke atribut ke-N).
            // User tetap bisa mengoreksi lewat dropdown pemetaan yang sudah
            // ada di bawah kalau urutannya ternyata tidak sesuai -- ini
            // hanya tebakan awal untuk kasus paling umum (header CSV memang
            // disusun sesuai urutan atribut).
            if (headers.length === textElements.length) {
              const autoMapping = {};
              textElements.forEach((el, idx) => {
                autoMapping[el.label] = headers[idx];
              });
              setMapping(autoMapping);
              setNotification({
                show: true,
                message: `Kolom CSV otomatis dipetakan berdasarkan urutan (${headers.length} kolom = ${textElements.length} atribut). Periksa bagian "Petakan Kolom" di bawah, sesuaikan kalau urutannya tidak tepat.`,
                type: "success"
              });
            } else {
              setMapping({});
            }
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

    // PATCH: kalau elemen ini sedang mode "Rata Tengah Horizontal", X tetap
    // dikunci ke 0.5 apapun hasil drag-nya -- axis="y" di <Draggable> sudah
    // mencegah pergerakan horizontal secara visual, ini lapisan jaga-jaga
    // tambahan supaya data positionPercent.x juga tidak pernah bergeser.
    const element = textElements.find((el) => el.id === id);
    const isCentered = element?.centerHorizontal;

    handleElementChange(id, "positionPercent", {
      x: isCentered ? 0.5 : newX / width,
      y: newY / height
    });
  };

  const handleAddTextElement = () => {
    const newElement = {
      id: Date.now(),
      label: "TEKS_BARU",
      textPreview: "Teks Baru",
      positionPercent: { x: 0.5, y: 0.7 },
      fontSize: 28,
      fontFamily: "Roboto",
      textColor: "#333333",
      // PATCH: sama seperti elemen JABATAN default -- opsional, kosong
      // berarti pakai textPreview statis untuk semua sertifikat.
      manualValues: "",
      // PATCH: toggle rata-tengah horizontal (lihat toggleCenterHorizontal).
      centerHorizontal: false
    };
    setTextElements((prevElements) => [...prevElements, newElement]);
  };

  // PATCH: toggle "Rata Tengah Horizontal" untuk suatu elemen. Saat
  // diaktifkan, posisi X langsung di-snap ke tengah (0.5) dan drag
  // horizontal dikunci (lihat axis di <Draggable> pada canvas) -- user
  // tetap bebas mengatur posisi vertikal (Y) dengan drag seperti biasa.
  const toggleCenterHorizontal = (id) => {
    setTextElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;
        const nextCentered = !el.centerHorizontal;
        return {
          ...el,
          centerHorizontal: nextCentered,
          positionPercent: nextCentered
            ? { ...el.positionPercent, x: 0.5 }
            : el.positionPercent
        };
      })
    );
  };

  const handleRemoveTextElement = (idToRemove) => {
    setTextElements((prevElements) =>
      prevElements.filter((element) => element.id !== idToRemove)
    );
  };

  const handleGenerate = async () => {
    console.log("Data being sent to API:", textElements);

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
      const parseList = (str) =>
        (str || "")
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v);

      const namesFromManualInput = parseList(manualNames);
      if (namesFromManualInput.length === 0) {
        setNotification({
          show: true,
          message: "Masukkan setidaknya satu nama peserta.",
          type: "error"
        });
        return;
      }

      const rowCount = namesFromManualInput.length;

      // PATCH: sekarang SETIAP atribut (bukan cuma elemen "nama" yang
      // isLocked) bisa punya daftar nilai custom per sertifikat lewat
      // `element.manualValues` (dipisah koma, sama seperti input nama).
      // Aturan: jumlah nilai suatu atribut HARUS sama dengan jumlah nama.
      // Kalau elemen belum dikustomisasi (manualValues kosong) -> perilaku
      // lama tetap berlaku: pakai textPreview sebagai teks statis yang sama
      // untuk semua sertifikat. Kalau dikustomisasi TAPI jumlahnya beda ->
      // hanya nilai PERTAMA yang dipakai untuk semua sertifikat pada
      // atribut itu, dan user diberi tahu lewat konfirmasi sebelum lanjut.
      const elementValues = {};
      const mismatched = [];

      textElements.forEach((el) => {
        if (el.isLocked) {
          elementValues[el.label] = namesFromManualInput;
          return;
        }

        const list = parseList(el.manualValues);
        if (list.length === 0) {
          elementValues[el.label] = new Array(rowCount).fill(el.textPreview);
        } else if (list.length === rowCount) {
          elementValues[el.label] = list;
        } else {
          mismatched.push({ label: el.label, count: list.length });
          elementValues[el.label] = new Array(rowCount).fill(list[0]);
        }
      });

      if (mismatched.length > 0) {
        const detail = mismatched
          .map((m) => `"${m.label}" (${m.count} nilai)`)
          .join(", ");
        // ALERT sebelum render: beri tahu jumlah yang tidak cocok, dan minta
        // konfirmasi eksplisit sebelum melanjutkan generate.
        const proceed = window.confirm(
          `Jumlah nilai pada atribut ${detail} tidak sama dengan jumlah nama (${rowCount} nama).\n\n` +
            `Untuk atribut yang jumlahnya tidak cocok, HANYA nilai PERTAMA yang akan dipakai untuk SEMUA ${rowCount} sertifikat.\n\n` +
            `Lanjutkan generate dengan begitu?`
        );
        if (!proceed) return;
      }

      dataToSend = namesFromManualInput.map((_, idx) => {
        const dataObject = {};
        textElements.forEach((el) => {
          dataObject[el.label] = elementValues[el.label][idx];
        });
        return dataObject;
      });
    } else {
      // Mode CSV
      dataToSend = csvData;
      finalMapping = mapping;
      if (Object.keys(finalMapping).length === 0) {
        setNotification({
          show: true,
          message: "Silakan petakan kolom CSV terlebih dahulu.",
          type: "error"
        });
        return;
      }
    }

    if (dataToSend.length === 0) {
      setNotification({
        show: true,
        message: "Tidak ada data untuk diproses.",
        type: "error"
      });
      return;
    }

    // ALERT batas cetak/generate: backend membatasi maksimum
    // MAX_GENERATE_ROWS baris per satu request generate.
    if (dataToSend.length > MAX_GENERATE_ROWS) {
      setNotification({
        show: true,
        message: `Jumlah data (${dataToSend.length}) melebihi batas maksimum ${MAX_GENERATE_ROWS} sertifikat per proses generate. Silakan bagi data menjadi beberapa bagian dan generate secara bertahap.`,
        type: "error"
      });
      return;
    }

    // POP-UP batas kuota harian: cek di sisi client DULU (pakai angka
    // `quota` terakhir yang diketahui) supaya user langsung tahu tanpa
    // perlu menunggu roundtrip ke server kalau memang sudah jelas kurang.
    // Ini cuma "fast path" UX -- keputusan yang SAH tetap dilakukan server
    // (lihat penanganan status 429 di bawah), karena angka `quota` di client
    // bisa saja basi (mis. digenerate dari tab/perangkat lain).
    if (quota && dataToSend.length > quota.remaining) {
      setQuotaModal({
        show: true,
        message:
          quota.remaining <= 0
            ? `Kuota generate harian Anda (${quota.limit} sertifikat/hari) sudah habis. Silakan coba lagi besok setelah kuota reset.`
            : `Anda mencoba membuat ${dataToSend.length} sertifikat, tapi sisa kuota harian Anda hanya ${quota.remaining} dari total ${quota.limit} sertifikat/hari. Kurangi jumlah data atau coba lagi besok.`
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
        // PATCH: `manualValues` cuma dipakai di editor (untuk menyimpan
        // daftar nilai per-atribut mode manual) -- sudah "dicairkan" jadi
        // dataToSend per baris di atas, jadi tidak perlu ikut dikirim ke
        // backend generate.
        JSON.stringify(
          textElements.map(({ ref, manualValues, ...rest }) => rest)
        )
      );
      formData.append("csvData", JSON.stringify(dataToSend));
      formData.append(
        "mapping",
        inputMode === "manual"
          ? JSON.stringify({})
          : JSON.stringify(finalMapping)
      );

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();

      // Selalu sinkronkan angka kuota dari server (sumber kebenaran),
      // baik saat request berhasil, gagal sebagian (422), maupun ditolak
      // karena kuota habis (429) -- server selalu menyertakan `quota`
      // terbaru di ketiga kasus itu (lihat api/generate/route.js).
      if (result.quota) setQuota(result.quota);

      if (!response.ok) {
        if (response.status === 429 && result.code === "DAILY_QUOTA_EXCEEDED") {
          // POP-UP: batas kuota harian tercapai (ditolak SERVER, sumber
          // kebenaran yang sesungguhnya -- bukan cuma pengecekan client di
          // atas). Ditampilkan sebagai modal, bukan toast biasa, supaya
          // tidak terlewat.
          setQuotaModal({
            show: true,
            message: result.message
          });
          return;
        }
        throw new Error(result.message || "Gagal generate sertifikat");
      }

      setNotification({
        show: true,
        message: result.warning
          ? `Sukses (dengan catatan): ${result.warning}`
          : "Sukses! Sertifikat sedang dibuat.",
        type: result.warning ? "error" : "success"
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

  const handleDownloadSingle = async (url, name) => {
    try {
      setNotification({
        show: true,
        message: `Mengunduh ${name}...`,
        type: "success"
      });
      const response = await fetch(url);
      const blob = await response.blob();
      saveAs(blob, `sertifikat-${name.replace(/\s+/g, "-")}.jpeg`);
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
      if (result.skippedCount > 0) {
        setNotification({
          show: true,
          message: `Unduhan dimulai, tapi ${result.skippedCount} sertifikat gagal disertakan dalam ZIP (file mungkin sudah tidak ada).`,
          type: "error"
        });
      } else if (result.possiblyTruncated) {
        // ALERT batas kompres: "Download Semua" hanya memproses maksimum
        // MAX_ZIP_CERTIFICATES sertifikat terbaru dalam satu kali proses.
        setNotification({
          show: true,
          message: `ZIP hanya berisi ${result.zippedCount} sertifikat terbaru (batas maksimum ${result.maxPerZip} per proses). Gunakan checklist untuk memilih & mengompres sisanya secara bertahap.`,
          type: "error"
        });
      } else {
        setNotification({
          show: true,
          message: "Unduhan Anda akan segera dimulai!",
          type: "success"
        });
      }
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

  const handleDeleteAllCertificates = async () => {
    if (!user) {
      setNotification({
        show: true,
        message: "Sesi tidak valid.",
        type: "error"
      });
      return;
    }

    // Konfirmasi ganda karena aksi ini DESTRUKTIF & TIDAK BISA DIBATALKAN —
    // menghapus SEMUA riwayat sertifikat milik user, bukan cuma yang
    // sedang tampil di halaman saat ini.
    const confirmed = window.confirm(
      "Yakin ingin menghapus SEMUA sertifikat? Tindakan ini akan menghapus seluruh riwayat sertifikat Anda secara permanen dan tidak bisa dibatalkan."
    );
    if (!confirmed) return;

    setIsDeletingAll(true);
    setDeleteProgress({ deleted: 0 });

    try {
      const token = await user.getIdToken();
      let totalDeleted = 0;
      let hasMore = true;
      let anyStorageErrors = false;

      // Endpoint DELETE hanya memproses satu "halaman" (maks 400 dokumen)
      // per panggilan agar tidak timeout untuk akun dengan riwayat sangat
      // banyak. Panggil berulang selama server bilang masih ada sisa.
      while (hasMore) {
        const response = await fetch("/api/certificates", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Gagal menghapus sertifikat.");
        }

        totalDeleted += result.deletedCount || 0;
        hasMore = Boolean(result.hasMore);
        if (result.storageDeleteErrors) anyStorageErrors = true;

        setDeleteProgress({ deleted: totalDeleted });
      }

      setNotification({
        show: true,
        message: anyStorageErrors
          ? `${totalDeleted} sertifikat dihapus dari riwayat, namun sebagian file gagal terhapus dari storage. Hubungi admin jika diperlukan.`
          : `${totalDeleted} sertifikat berhasil dihapus.`,
        type: anyStorageErrors ? "error" : "success"
      });
    } catch (error) {
      console.error("Delete all error:", error);
      setNotification({
        show: true,
        message: `Gagal menghapus semua sertifikat: ${error.message}`,
        type: "error"
      });
    } finally {
      setIsDeletingAll(false);
      setDeleteProgress(null);
      // Refresh daftar & state pagination dari awal, terlepas dari berhasil
      // penuh atau sebagian, supaya UI selalu mencerminkan kondisi server
      // yang sebenarnya (bukan optimistically dikosongkan begitu saja).
      setLastDocId(null);
      setLastVisibleTimestamp(null);
      setHasMore(true);
      await fetchInitialCertificates();
    }
  };

  const toggleSelectCertificate = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allVisibleSelected = certificates.every((c) => prev.has(c.id));
      if (allVisibleSelected) {
        // Semua yang tampil sudah terpilih -> batalkan seleksi untuk yang tampil
        const next = new Set(prev);
        certificates.forEach((c) => next.delete(c.id));
        return next;
      }
      // Pilih semua yang sedang tampil di halaman ini
      const next = new Set(prev);
      certificates.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDeleteSelected = async () => {
    if (!user || selectedIds.size === 0) return;

    const idsToDelete = Array.from(selectedIds);
    const confirmed = window.confirm(
      `Hapus ${idsToDelete.length} sertifikat terpilih? Tindakan ini tidak bisa dibatalkan.`
    );
    if (!confirmed) return;

    setIsDeletingSelected(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/certificates", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids: idsToDelete })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Gagal menghapus sertifikat terpilih.");
      }

      setNotification({
        show: true,
        message: result.storageDeleteErrors
          ? `${result.deletedCount} sertifikat terpilih dihapus, namun sebagian file gagal terhapus dari storage.`
          : `${result.deletedCount} sertifikat terpilih berhasil dihapus.`,
        type: result.storageDeleteErrors ? "error" : "success"
      });

      clearSelection();
      setLastDocId(null);
      setLastVisibleTimestamp(null);
      setHasMore(true);
      await fetchInitialCertificates();
    } catch (error) {
      setNotification({
        show: true,
        message: `Gagal menghapus sertifikat terpilih: ${error.message}`,
        type: "error"
      });
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const handleDownloadSelectedZip = async () => {
    if (!user || selectedIds.size === 0) return;

    // ALERT batas kompres: backend membatasi maksimum
    // MAX_ZIP_CERTIFICATES sertifikat per proses ZIP.
    if (selectedIds.size > MAX_ZIP_CERTIFICATES) {
      setNotification({
        show: true,
        message: `Anda memilih ${selectedIds.size} sertifikat, namun maksimum ${MAX_ZIP_CERTIFICATES} sertifikat per proses kompres. Silakan kurangi jumlah pilihan atau kompres secara bertahap.`,
        type: "error"
      });
      return;
    }

    setIsZippingSelected(true);
    setNotification({
      show: true,
      message: `Mengompres ${selectedIds.size} sertifikat terpilih...`,
      type: "success"
    });

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/zip-certificates", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Gagal membuat file ZIP.");
      }

      setNotification({
        show: true,
        message:
          result.skippedCount > 0
            ? `ZIP dibuat, tapi ${result.skippedCount} sertifikat gagal disertakan (file mungkin sudah tidak ada).`
            : `${result.zippedCount} sertifikat terpilih berhasil dikompres!`,
        type: result.skippedCount > 0 ? "error" : "success"
      });
      window.open(result.zipUrl, "_blank");
    } catch (error) {
      setNotification({
        show: true,
        message: `Gagal mengompres sertifikat terpilih: ${error.message}`,
        type: "error"
      });
    } finally {
      setIsZippingSelected(false);
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
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Baca dimensi asli gambar template supaya kotak preview bisa
      // mengikuti rasio aslinya (lihat komentar di state templateNaturalSize).
      setTemplateNaturalSize(null);
      const img = new window.Image();
      img.onload = () => {
        setTemplateNaturalSize({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      img.src = objectUrl;
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
    // templateNaturalSize ikut jadi dependency karena baru datang secara
    // async setelah previewUrl (lewat img.onload) — begitu rasio diketahui,
    // tinggi container berubah (aspectRatio CSS), jadi perlu diukur ulang.
  }, [previewUrl, templateNaturalSize]);

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
      <QuotaLimitModal
        show={quotaModal.show}
        message={quotaModal.message}
        onClose={() => setQuotaModal({ show: false, message: "" })}
      />
      <header className="w-full bg-white shadow-sm border-b border-[#17233D]/10 sticky top-0 z-40">
        <div className="container mx-auto flex justify-between items-center px-6 py-3">
          <h1 className="text-xl font-bold text-[#17233D] tracking-tight">
            SertiGen Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleCreateDesign}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#8C2F39] rounded-lg shadow-sm hover:bg-[#742531] flex items-center gap-2 transition-colors"
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
            <div className="h-6 w-px bg-[#17233D]/10 hidden md:block"></div>
            <div className="hidden md:flex items-center gap-4">
              <p className="text-sm text-[#17233D]/50">
                Login sebagai:{" "}
                <strong className="font-medium text-[#17233D]/80">
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
      <main className="flex flex-col items-center min-h-screen bg-[#F2EAD3] p-4 md:p-8 text-[#17233D]">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start relative">
          <div className="w-full p-8 space-y-6 bg-[#FCFAF2] rounded-2xl shadow-lg border border-[#17233D]/10">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                aria-label="Kembali ke halaman utama"
                className="p-2 rounded-lg text-[#17233D] hover:bg-[#A9822E]/10 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 111.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
              <h2 className="flex-1 text-3xl font-bold text-center text-[#17233D]">
                Kontrol Generator
              </h2>
              {/* spacer agar judul tetap center meski ada tombol kembali */}
              <div className="w-9" aria-hidden="true"></div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#17233D] mb-2">
                1. Unggah Template
              </label>
              <input
                id="file-upload"
                type="file"
                className="sr-only"
                accept="image/png, image/png"
                onChange={handleFileChange}
              />
              <label
                htmlFor="file-upload"
                className="w-full flex justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer bg-[#A9822E]/10 border-[#A9822E]/40 hover:border-[#8C2F39]"
              >
                <span className="text-sm text-[#17233D]">
                  {templateFile
                    ? `Ganti: ${templateFile.name}`
                    : "Pilih file template"}
                </span>
              </label>
            </div>

            <div className="space-y-4 pt-4 border-t border-[#17233D]/10">
              <h3 className="text-lg font-medium text-[#17233D]">
                2. Input Data Peserta
              </h3>
              <div className="flex bg-[#A9822E]/10 rounded-lg p-1">
                <button
                  onClick={() => setInputMode("manual")}
                  className={`w-full p-2 text-sm font-semibold rounded-md transition-colors ${
                    inputMode === "manual"
                      ? "bg-white text-[#17233D] shadow"
                      : "text-[#8C2F39]"
                  }`}
                >
                  Input Manual
                </button>
                <button
                  onClick={() => setInputMode("csv")}
                  className={`w-full p-2 text-sm font-semibold rounded-md transition-colors ${
                    inputMode === "csv"
                      ? "bg-white text-[#17233D] shadow"
                      : "text-[#8C2F39]"
                  }`}
                >
                  Unggah File CSV
                </button>
              </div>

              {inputMode === "manual" ? (
                <div>
                  <label className="block text-sm font-semibold text-[#17233D] mb-2">
                    Nama Peserta (pisahkan dengan koma)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full p-2 border rounded-md bg-[#F2EAD3] border-[#A9822E]/40"
                    placeholder="Contoh: Budi Santoso, Citra Lestari"
                    value={manualNames}
                    onChange={(e) => setManualNames(e.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="block w-full text-sm text-[#17233D]/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-[#A9822E]/10 file:text-[#17233D] hover:file:bg-[#A9822E]/20"
                  />
                  <p className="text-xs text-[#17233D]/50 mt-1">
                    * Pastikan file CSV Anda memiliki header.
                  </p>
                </div>
              )}
            </div>

            {inputMode === "csv" && csvHeaders.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-[#17233D]/10">
                <h3 className="text-lg font-medium text-[#17233D]">
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
                      className="w-full p-2 border rounded-md bg-white border-[#A9822E]/40"
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

            <div className="space-y-4 pt-4 border-t border-[#17233D]/10">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-[#17233D]">
                  {inputMode === "csv" ? "4." : "3."} Kustomisasi Elemen
                </h3>
                <button
                  onClick={handleAddTextElement}
                  className="px-3 py-1 text-sm font-semibold text-white bg-[#8C2F39] rounded-md hover:bg-[#742531]"
                >
                  + Tambah
                </button>
              </div>
              {textElements.map((element) => (
                <div
                  key={element.id}
                  className="p-4 bg-[#A9822E]/10 rounded-lg space-y-3"
                >
                  <div className="flex justify-between items-center">
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
                      className="font-semibold text-[#17233D] bg-transparent border-b border-[#A9822E]/40 focus:outline-none"
                    />
                    {!element.isLocked && (
                      <button
                        onClick={() => handleRemoveTextElement(element.id)}
                        className="text-sm font-semibold text-red-500 hover:text-red-700"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  {/* PATCH: toggle rata-tengah horizontal. Saat aktif, X
                      dikunci ke tengah (0.5) dan drag hanya bisa vertikal --
                      lihat toggleCenterHorizontal & axis di <Draggable>. */}
                  <button
                    type="button"
                    onClick={() => toggleCenterHorizontal(element.id)}
                    aria-pressed={!!element.centerHorizontal}
                    className={`w-full text-sm font-medium px-3 py-1.5 rounded-md border transition-colors ${
                      element.centerHorizontal
                        ? "bg-[#8C2F39] text-white border-[#8C2F39]"
                        : "bg-white text-[#17233D] border-[#A9822E]/40 hover:bg-[#A9822E]/10"
                    }`}
                  >
                    {element.centerHorizontal
                      ? "✓ Rata Tengah Horizontal (posisi Y tetap bisa diatur)"
                      : "Rata Tengah Horizontal"}
                  </button>

                  {!element.isLocked && (
                    <div>
                      <label className="text-xs font-medium text-[#17233D]">
                        Teks Contoh di Preview
                      </label>
                      <input
                        type="text"
                        value={element.textPreview}
                        onChange={(e) =>
                          handleElementChange(
                            element.id,
                            "textPreview",
                            e.target.value
                          )
                        }
                        className="w-full text-sm p-1 mt-1 border rounded-md bg-white border-[#A9822E]/40"
                      />
                    </div>
                  )}

                  {/* PATCH: nilai custom per-sertifikat untuk atribut ini,
                      khusus mode Input Manual (di mode CSV, nilainya datang
                      dari pemetaan kolom di atas). Opsional -- kalau
                      dikosongkan, "Teks Contoh di Preview" dipakai sebagai
                      teks statis yang sama untuk semua sertifikat (perilaku
                      lama tetap jalan). */}
                  {!element.isLocked && inputMode === "manual" && (
                    <div>
                      <label className="text-xs font-medium text-[#17233D]">
                        Nilai per Sertifikat (pisahkan dengan koma) — opsional
                      </label>
                      <textarea
                        rows={2}
                        value={element.manualValues || ""}
                        onChange={(e) =>
                          handleElementChange(
                            element.id,
                            "manualValues",
                            e.target.value
                          )
                        }
                        placeholder={`Contoh: Ketua Pelaksana, Sekretaris, Bendahara. Kosongkan untuk pakai "${element.textPreview}" di semua sertifikat.`}
                        className="w-full text-sm p-1 mt-1 border rounded-md bg-white border-[#A9822E]/40"
                      />
                      {(() => {
                        const valueCount = (element.manualValues || "")
                          .split(",")
                          .map((v) => v.trim())
                          .filter((v) => v).length;
                        if (valueCount > 0 && valueCount !== manualNamesCount) {
                          return (
                            <p className="text-xs text-red-600 mt-1">
                              {valueCount} nilai — jumlah nama saat ini{" "}
                              {manualNamesCount}. Kalau tidak disesuaikan,
                              hanya nilai pertama yang dipakai untuk semua
                              sertifikat pada atribut ini.
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-[#17233D]">
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
                      className="w-full p-2 border rounded-md bg-white border-[#A9822E]/40"
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
                      className="w-16 h-10 p-1 border rounded-md bg-white border-[#A9822E]/40"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#17233D]/10">
              {quota && (
                <p
                  className={`text-xs text-center mb-2 ${
                    quota.remaining <= 0
                      ? "text-red-600 font-semibold"
                      : "text-[#17233D]/60"
                  }`}
                >
                  Kuota generate hari ini: {quota.used}/{quota.limit} sertifikat
                  {quota.remaining <= 0 ? " — kuota habis, coba lagi besok" : ""}
                </p>
              )}
              <button
                onClick={handleGenerate}
                disabled={isLoading || !templateFile || quota?.remaining <= 0}
                className="w-full flex justify-center p-3 font-semibold text-white bg-[#8C2F39] rounded-md hover:bg-[#742531] disabled:bg-[#A9822E]/50"
              >
                {isLoading ? <Spinner /> : "Generate Sertifikat"}
              </button>
              {progress && (
                <div className="mt-4">
                  <p className="text-sm text-center text-[#17233D]">
                    Memproses {progress.current} dari {progress.total}{" "}
                    sertifikat...
                  </p>
                  <div className="w-full bg-[#A9822E]/20 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-[#8C2F39] h-2.5 rounded-full"
                      style={{
                        width: `${(progress.current / progress.total) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full p-4 bg-[#FCFAF2] rounded-2xl shadow-lg flex items-center justify-center border border-[#17233D]/10 lg:sticky lg:top-20">
            {previewUrl ? (
              <div
                ref={previewContainerRef}
                className="relative w-full max-w-[500px] overflow-hidden border rounded-lg"
                style={{
                  // PATCH: rasio kotak preview mengikuti rasio ASLI gambar
                  // template (bukan 16:9 tetap). Kalau rasio tetap dipaksa
                  // 16:9 sementara template-nya beda rasio, objectFit:"contain"
                  // menyisakan area kosong (letterbox) -> positionPercent yang
                  // dihitung dari ukuran KOTAK preview jadi tidak sama dengan
                  // posisi di gambar yang benar-benar tampil, sehingga posisi
                  // teks meleset saat dirender ulang di backend (yang
                  // menghitung dari imageWidth/imageHeight ASLI, tanpa
                  // letterbox). Selama dimensi asli belum diketahui,
                  // fallback ke 16:9 supaya tidak ada layout shift aneh.
                  aspectRatio: templateNaturalSize
                    ? `${templateNaturalSize.width} / ${templateNaturalSize.height}`
                    : "16 / 9"
                }}
              >
                <Image
                  src={previewUrl}
                  alt="Template Preview"
                  fill
                  style={{ objectFit: "contain" }}
                />
                {textElements.map((element) => {
                  const nodeRef = elementRefs.current.get(element.id);
                  if (!nodeRef) return null;

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
                      nodeRef={nodeRef}
                      bounds="parent"
                      position={pixelPosition}
                      onStop={createDragHandler(element.id)}
                      axis={element.centerHorizontal ? "y" : "both"}
                    >
                      <div
                        ref={nodeRef}
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
              <div className="w-full max-w-[500px] aspect-video flex justify-center items-center border-2 border-dashed rounded-lg bg-[#F2EAD3]">
                <p className="text-[#17233D]">Pratinjau Template</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-full max-w-6xl mt-12">
          <div className="p-8 bg-[#FCFAF2] rounded-2xl shadow-lg border border-[#17233D]/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#17233D]">
                Hasil Generate Terbaru
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadAll}
                  disabled={isZipping || isDeletingAll || certificates.length === 0}
                  className="px-4 py-2 flex items-center gap-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-[#17233D]/40 disabled:cursor-not-allowed"
                >
                  {isZipping ? <Spinner className="w-4 h-4" /> : null}
                  {isZipping ? "Zipping..." : "Download Semua"}
                </button>
                <button
                  onClick={handleDeleteAllCertificates}
                  disabled={isZipping || isDeletingAll || certificates.length === 0}
                  className="px-4 py-2 flex items-center gap-2 text-sm font-semibold text-white bg-red-700 rounded-md hover:bg-red-800 disabled:bg-[#17233D]/40 disabled:cursor-not-allowed"
                >
                  {isDeletingAll ? <Spinner className="w-4 h-4" /> : null}
                  {isDeletingAll
                    ? `Menghapus${deleteProgress ? ` (${deleteProgress.deleted})` : "..."}`
                    : "Hapus Semua"}
                </button>
              </div>
            </div>

            {certificates.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-3 rounded-lg bg-[#17233D]/5">
                <label className="flex items-center gap-2 text-sm font-medium text-[#17233D] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={
                      certificates.length > 0 &&
                      certificates.every((c) => selectedIds.has(c.id))
                    }
                    onChange={toggleSelectAllVisible}
                    className="w-4 h-4"
                  />
                  Pilih semua di halaman ini
                </label>

                <div className="flex items-center gap-3">
                  {selectedIds.size > 0 && (
                    <>
                      <span
                        className={`text-sm font-medium ${
                          selectedIds.size > MAX_ZIP_CERTIFICATES
                            ? "text-red-700"
                            : "text-[#17233D]"
                        }`}
                      >
                        {selectedIds.size} terpilih
                        {selectedIds.size > MAX_ZIP_CERTIFICATES &&
                          ` (maks ${MAX_ZIP_CERTIFICATES} untuk kompres)`}
                      </span>
                      <button
                        onClick={handleDownloadSelectedZip}
                        disabled={
                          isZippingSelected ||
                          isDeletingSelected ||
                          isZipping ||
                          isDeletingAll
                        }
                        className="px-3 py-1.5 flex items-center gap-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-[#17233D]/40 disabled:cursor-not-allowed"
                      >
                        {isZippingSelected ? <Spinner className="w-4 h-4" /> : null}
                        {isZippingSelected ? "Mengompres..." : "Kompres Terpilih"}
                      </button>
                      <button
                        onClick={handleDeleteSelected}
                        disabled={
                          isZippingSelected ||
                          isDeletingSelected ||
                          isZipping ||
                          isDeletingAll
                        }
                        className="px-3 py-1.5 flex items-center gap-2 text-sm font-semibold text-white bg-red-700 rounded-md hover:bg-red-800 disabled:bg-[#17233D]/40 disabled:cursor-not-allowed"
                      >
                        {isDeletingSelected ? <Spinner className="w-4 h-4" /> : null}
                        {isDeletingSelected ? "Menghapus..." : "Hapus Terpilih"}
                      </button>
                      <button
                        onClick={clearSelection}
                        disabled={isZippingSelected || isDeletingSelected}
                        className="px-3 py-1.5 text-sm font-medium text-[#17233D] hover:underline disabled:opacity-50"
                      >
                        Batalkan pilihan
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {certificates.length > 0 ? (
              <div className="space-y-4">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className={`flex items-center justify-between p-4 rounded-lg bg-[#A9822E]/10 ${
                      selectedIds.has(cert.id) ? "ring-2 ring-[#8C2F39]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(cert.id)}
                        onChange={() => toggleSelectCertificate(cert.id)}
                        className="w-4 h-4 flex-shrink-0"
                      />
                      <div>
                        <p className="font-semibold text-[#17233D]">
                          {cert.namaPeserta}
                        </p>
                        <p className="text-sm text-[#17233D]">
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
                    </div>
                    <button
                      onClick={() =>
                        handleDownloadSingle(
                          cert.urlSertifikat,
                          cert.namaPeserta
                        )
                      }
                      className="px-4 py-2 text-sm font-medium text-white bg-[#8C2F39] rounded-md hover:bg-[#742531]"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#17233D]">Belum ada sertifikat yang dibuat.</p>
            )}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-2 font-semibold text-white bg-[#8C2F39] rounded-md hover:bg-[#742531] disabled:bg-[#A9822E]/50 disabled:cursor-wait transition-colors"
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
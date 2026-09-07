// src/app/create-design/page.js
"use client";

import { useState, useRef, useEffect } from "react";
import {
  Stage,
  Layer,
  Text,
  Rect,
  Image as KonvaImage,
  Line,
  Transformer
} from "react-konva";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";

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

export default function CreateDesignPage() {
  const { user } = useAuth();
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [templateName, setTemplateName] = useState("Template Kustom");
  const stageRef = useRef(null);
  const fileInputRef = useRef(null);
  const trRef = useRef(null); // Ref baru untuk Transformer

  const CERT_WIDTH = 1024;
  const CERT_HEIGHT = 724;

  const selectedElement = elements.find((el) => el.id === selectedId);
  const propertiesPanelRef = useRef(null); // BARU: Ref untuk panel properti

  // --- FUNGSI UNTUK MENAMBAH ELEMEN ---
  const handleAddText = (type) => {
    const newText = {
      id: `el-${Date.now()}`,
      type: "text",
      x: 50,
      y: 50,
      text: type === "name" ? "Nama Peserta" : "Teks Baru",
      fontSize: type === "name" ? 48 : 24,
      fontFamily: "Roboto",
      fill: "#333333",
      isNamePlaceholder: type === "name"
    };
    setElements([...elements, newText]);
    setSelectedId(newText.id);
  };
  const handleAddImage = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.src = e.target.result;
        img.onload = () => {
          const newImage = {
            id: `el-${Date.now()}`,
            type: "image",
            x: 50,
            y: 50,
            image: img,
            src: e.target.result,
            width: img.width,
            height: img.height,
            scaleX: 1,
            scaleY: 1, // Tambahkan scale awal
            rotation: 0
          };
          setElements([...elements, newImage]);
          setSelectedId(newImage.id);
        };
      };
      reader.readAsDataURL(file);
    }
    event.target.value = null;
  };
  // useEffect untuk mengontrol Transformer

  useEffect(() => {
    if (trRef.current) {
      const selectedNode = stageRef.current.findOne(`#${selectedId}`);
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
      } else {
        trRef.current.nodes([]);
      }
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      // Dapatkan referensi ke container kanvas dan panel properti
      const stageContainer = stageRef.current?.container();
      const propertiesPanel = propertiesPanelRef.current;

      // Jika klik terjadi di luar kanvas DAN di luar panel properti, batalkan seleksi
      if (
        stageContainer &&
        !stageContainer.contains(e.target) &&
        propertiesPanel &&
        !propertiesPanel.contains(e.target)
      ) {
        setSelectedId(null);
      }
    };

    // Tambahkan event listener saat komponen dimuat
    document.addEventListener("mousedown", handleClickOutside);

    // Hapus event listener saat komponen dibongkar untuk mencegah kebocoran memori
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleTransformEnd = (e, id) => {
    const node = e.target;
    const newElements = elements.map((el) => {
      if (el.id === id) {
        return {
          ...el,
          x: node.x(),
          y: node.y(),
          // Perbarui scale, bukan width/height secara langsung
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation: node.rotation()
        };
      }
      return el;
    });
    setElements(newElements);
  };
  const handleAddRect = () => {
    const newRect = {
      id: `el-${Date.now()}`,
      type: "rect",
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      fill: "#E0E0E0",
      stroke: "#333333",
      strokeWidth: 2
    };
    setElements([...elements, newRect]);
    setSelectedId(newRect.id);
  };

  const handleAddLine = () => {
    const newLine = {
      id: `el-${Date.now()}`,
      type: "line",
      x: 100,
      y: 100,
      points: [0, 0, 300, 0], // Garis horizontal sepanjang 300px
      stroke: "#333333",
      strokeWidth: 4
    };
    setElements([...elements, newLine]);
    setSelectedId(newLine.id);
  };

  // --- FUNGSI UNTUK MANAJEMEN ELEMEN ---
  const handleDragEnd = (e, id) => {
    setElements(
      elements.map((el) =>
        el.id === id ? { ...el, x: e.target.x(), y: e.target.y() } : el
      )
    );
  };

  const handlePropertyChange = (prop, value) => {
    setElements(
      elements.map((el) =>
        el.id === selectedId ? { ...el, [prop]: value } : el
      )
    );
  };

  const handleDeleteElement = () => {
    if (selectedId) {
      setElements(elements.filter((el) => el.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handleLayerChange = (direction) => {
    const index = elements.findIndex((el) => el.id === selectedId);
    if (index === -1) return;

    const newElements = [...elements];
    const item = newElements.splice(index, 1)[0];

    if (direction === "up" && index < newElements.length) {
      newElements.splice(index + 1, 0, item);
    } else if (direction === "down" && index > 0) {
      newElements.splice(index - 1, 0, item);
    } else {
      newElements.splice(index, 0, item); // a little trick to avoid out of bound
    }
    setElements(newElements);
  };

  // --- FUNGSI UNTUK MENYIMPAN & EKSPOR ---
  // GANTI FUNGSI INI DI KODE ANDA
  const handleSaveTemplate = async () => {
    if (elements.length === 0) {
      alert("Tambahkan setidaknya satu elemen sebelum menyimpan.");
      return;
    }
    setIsLoading(true);

    // FIX: Buat versi elemen yang aman untuk JSON
    const serializableElements = elements.map((el) => {
      if (el.type === "image") {
        const { image, ...rest } = el; // Hapus properti 'image' yang tidak bisa di-serialize
        return rest;
      }
      return el;
    });

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/save-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: templateName, // Gunakan nama dari state
          width: CERT_WIDTH,
          height: CERT_HEIGHT,
          backgroundColor: backgroundColor,
          elements: serializableElements // Kirim elemen yang sudah bersih
        })
      });
      if (!response.ok) throw new Error("Gagal menyimpan template.");
      alert("Template berhasil disimpan!");
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  const handleExport = () => {
    const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = `${templateName}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper untuk merender elemen di kanvas
  const renderElement = (el) => {
    const props = {
      id: el.id,
      ...el,
      draggable: true,
      onClick: (e) => {
        // FIX #2: Hentikan event agar tidak merambat ke stage
        e.cancelBubble = true;
        setSelectedId(el.id);
      },
      onTap: (e) => {
        e.cancelBubble = true;
        setSelectedId(el.id);
      },
      onDragEnd: (e) => handleDragEnd(e, el.id),
      onTransformEnd: (e) => handleTransformEnd(e, el.id)
    };

    switch (el.type) {
      case "text":
        return <Text key={el.id} {...props} />;
      case "image":
        return <KonvaImage key={el.id} {...props} />;
      case "rect":
        return <Rect key={el.id} {...props} />;
      case "line":
        return <Line key={el.id} {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-200 text-slate-800">
      <header className="bg-white shadow-sm border-b border-slate-300 z-10">
        <div className="w-full max-w-full mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-indigo-700">
              SertiGen Designer
            </Link>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="text-sm p-2 border border-slate-300 rounded-md"
            />
            <p className="text-red-600">Masih dalam Pengembangan</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleExport}
              className="px-5 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200"
            >
              Ekspor PNG
            </button>
            <button
              onClick={handleSaveTemplate}
              disabled={isLoading}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center gap-2"
            >
              {isLoading ? <Spinner className="w-5 h-5" /> : "Simpan Template"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-grow flex overflow-hidden">
        {/* Toolbar */}
        <aside className="w-64 bg-white p-6 space-y-6 border-r border-slate-300 overflow-y-auto">
          <div>
            <h3 className="font-semibold mb-3">Elemen</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleAddText("text")}
                className="w-full flex items-center gap-3 p-3 text-left text-sm font-medium rounded-lg hover:bg-slate-100"
              >
                <svg
                  className="w-5 h-5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 7V4h16v3M9 20h6M12 4v16"
                  />
                </svg>
                <span>Tambah Teks</span>
              </button>
              <button
                onClick={() => handleAddText("name")}
                className="w-full flex items-center gap-3 p-3 text-left text-sm font-medium rounded-lg hover:bg-slate-100"
              >
                <svg
                  className="w-5 h-5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span>Placeholder Nama</span>
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleAddImage}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current.click()}
                className="w-full flex items-center gap-3 p-3 text-left text-sm font-medium rounded-lg hover:bg-slate-100"
              >
                <svg
                  className="w-5 h-5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>Tambah Gambar</span>
              </button>
              <button
                onClick={handleAddRect}
                className="w-full flex items-center gap-3 p-3 text-left text-sm font-medium rounded-lg hover:bg-slate-100"
              >
                <svg
                  className="w-5 h-5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
                  />
                </svg>
                <span>Tambah Persegi</span>
              </button>
              <button
                onClick={handleAddLine}
                className="w-full flex items-center gap-3 p-3 text-left text-sm font-medium rounded-lg hover:bg-slate-100"
              >
                <svg
                  className="w-5 h-5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 9h16.5m-16.5 6.75h16.5"
                  />
                </svg>
                <span>Tambah Garis</span>
              </button>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-6">
            <h3 className="font-semibold mb-3">Background</h3>
            <div className="flex items-center gap-2">
              <label htmlFor="bg-color" className="text-sm">
                Warna:
              </label>
              <input
                id="bg-color"
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-10 h-10 border-none cursor-pointer"
              />
            </div>
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 flex items-center justify-center p-8 overflow-auto">
          <div className="bg-white p-2 rounded-lg shadow-2xl">
            <Stage
              width={CERT_WIDTH}
              height={CERT_HEIGHT}
              ref={stageRef}
              onMouseDown={(e) => {
                const clickedOnEmpty = e.target === e.target.getStage();
                if (clickedOnEmpty) {
                  setSelectedId(null);
                }
              }}
            >
              <Layer>
                <Rect
                  width={CERT_WIDTH}
                  height={CERT_HEIGHT}
                  fill={backgroundColor}
                  // TAMBAHKAN DUA BARIS DI BAWAH INI
                  onClick={() => setSelectedId(null)}
                  onTap={() => setSelectedId(null)}
                />
                {elements.map((el) => renderElement(el))}

                <Transformer
                  ref={trRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 10 || newBox.height < 10) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                />
              </Layer>
            </Stage>
          </div>
        </main>

        {/* Properties Panel */}
        <aside className="w-72 bg-white p-6 border-l border-slate-300 overflow-y-auto">
          <h2 className="text-lg font-semibold">Properti Elemen</h2>
          {selectedElement ? (
            <div className="space-y-4 mt-4">
              {/* --- Properti Teks --- */}
              {selectedElement.type === "text" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Teks
                    </label>
                    <textarea
                      value={selectedElement.text}
                      onChange={(e) =>
                        handlePropertyChange("text", e.target.value)
                      }
                      className="w-full p-2 border border-slate-300 rounded-md"
                      rows="3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Jenis Font
                    </label>
                    <select
                      value={selectedElement.fontFamily}
                      onChange={(e) =>
                        handlePropertyChange("fontFamily", e.target.value)
                      }
                      className="w-full p-2 border border-slate-300 rounded-md"
                    >
                      <option>Roboto</option>
                      <option>Montserrat</option>
                      <option>Playfair Display</option>
                      <option>Poppins</option>
                      <option>Lora</option>
                      <option>Pacifico</option>
                      <option>Caveat</option>
                      <option>Arial</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Ukuran
                      </label>
                      <input
                        type="number"
                        value={selectedElement.fontSize}
                        onChange={(e) =>
                          handlePropertyChange(
                            "fontSize",
                            parseInt(e.target.value, 10)
                          )
                        }
                        className="w-full p-2 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Warna
                      </label>
                      <input
                        type="color"
                        value={selectedElement.fill}
                        onChange={(e) =>
                          handlePropertyChange("fill", e.target.value)
                        }
                        className="w-full h-10 p-1 border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* --- Properti Gambar (Placeholder) --- */}
              {selectedElement.type === "image" && (
                <div>
                  <p className="text-sm text-slate-600">
                    Properti gambar akan ditambahkan di sini (misal: ukuran).
                  </p>
                </div>
              )}

              {/* --- Properti Persegi --- */}
              {selectedElement.type === "rect" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Lebar
                      </label>
                      <input
                        type="number"
                        value={selectedElement.width}
                        onChange={(e) =>
                          handlePropertyChange(
                            "width",
                            parseInt(e.target.value, 10)
                          )
                        }
                        className="w-full p-2 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Tinggi
                      </label>
                      <input
                        type="number"
                        value={selectedElement.height}
                        onChange={(e) =>
                          handlePropertyChange(
                            "height",
                            parseInt(e.target.value, 10)
                          )
                        }
                        className="w-full p-2 border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Warna Isi
                    </label>
                    <input
                      type="color"
                      value={selectedElement.fill}
                      onChange={(e) =>
                        handlePropertyChange("fill", e.target.value)
                      }
                      className="w-full h-10 p-1 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Warna Garis Tepi
                    </label>
                    <input
                      type="color"
                      value={selectedElement.stroke}
                      onChange={(e) =>
                        handlePropertyChange("stroke", e.target.value)
                      }
                      className="w-full h-10 p-1 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Tebal Garis Tepi
                    </label>
                    <input
                      type="number"
                      value={selectedElement.strokeWidth}
                      onChange={(e) =>
                        handlePropertyChange(
                          "strokeWidth",
                          parseInt(e.target.value, 10)
                        )
                      }
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </div>
                </>
              )}

              {/* --- Properti Garis --- */}
              {selectedElement.type === "line" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Panjang Garis
                    </label>
                    <input
                      type="number"
                      value={selectedElement.points[2]}
                      onChange={(e) =>
                        handlePropertyChange("points", [
                          0,
                          0,
                          parseInt(e.target.value, 10),
                          0
                        ])
                      }
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Warna Garis
                    </label>
                    <input
                      type="color"
                      value={selectedElement.stroke}
                      onChange={(e) =>
                        handlePropertyChange("stroke", e.target.value)
                      }
                      className="w-full h-10 p-1 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Tebal Garis
                    </label>
                    <input
                      type="number"
                      value={selectedElement.strokeWidth}
                      onChange={(e) =>
                        handlePropertyChange(
                          "strokeWidth",
                          parseInt(e.target.value, 10)
                        )
                      }
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </div>
                </>
              )}

              {/* Properti Umum (Layer & Hapus) */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-sm mb-2">Pengaturan</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLayerChange("up")}
                    className="flex-1 p-2 text-xs rounded-md bg-slate-100 hover:bg-slate-200"
                  >
                    Naikkan Layer
                  </button>
                  <button
                    onClick={() => handleLayerChange("down")}
                    className="flex-1 p-2 text-xs rounded-md bg-slate-100 hover:bg-slate-200"
                  >
                    Turunkan Layer
                  </button>
                </div>
                <button
                  onClick={handleDeleteElement}
                  className="w-full mt-2 p-2 text-sm font-medium text-red-600 bg-red-100 rounded-md hover:bg-red-200"
                >
                  Hapus Elemen
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-center text-slate-500 bg-slate-100 p-4 rounded-lg">
              <p className="font-semibold">Tidak ada elemen terpilih</p>
              <p className="mt-2">
                Klik sebuah elemen di kanvas untuk melihat propertinya, atau
                tambahkan elemen baru dari toolbar.
              </p>
            </div>
          )}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="font-semibold mb-3">Butuh Bantuan Desain?</h3>
            <p className="text-xs text-slate-500 mb-3">
              Gunakan aplikasi desainer grafis seperti Canva untuk membuat
              template dasar, lalu unggah pada halaman utama sebagai gambar.
            </p>
            <a
              href="https://canva.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              <span>Buka Canva</span>
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}

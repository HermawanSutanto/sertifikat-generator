import init, * as wasm from "@/rust_wasm/pkg/pdf_cert_wasm.js";

self.onmessage = async (e) => {
  try {
    const { templateUint8, names, chunkSize = 1000 } = e.data;

    // 1. Tunggu inisialisasi memori WASM selesai
    await init();

    const total = names.length;
    let processed = 0;

    for (let i = 0; i < total; i += chunkSize) {
      const chunkNames = names.slice(i, i + chunkSize);

      // 2. Panggil fungsi langsung dari objek `wasm` yang sudah siap
      const zipBytes = wasm.generate_certificates_chunk(templateUint8, chunkNames, i);

      processed += chunkNames.length;

      self.postMessage({
        type: "CHUNK_COMPLETE",
        zipBytes,
        part: Math.floor(i / chunkSize) + 1,
        progress: { current: processed, total }
      });
    }

    self.postMessage({ type: "ALL_COMPLETE" });
  } catch (err) {
    self.postMessage({ type: "ERROR", error: err.message || String(err) });
  }
};
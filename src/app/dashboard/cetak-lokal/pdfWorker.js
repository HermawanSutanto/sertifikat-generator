import init, * as wasm from "@/rust_wasm/pkg/pdf_cert_wasm.js";

self.onmessage = async (e) => {
  try {
    const { templateUint8, csvRows, configs, chunkSize = 1000, fontBytes } = e.data;

    await init();

    // DEBUG SEMENTARA: cek apakah fontBytes benar-benar diterima worker
    console.log(
      "[DEBUG] fontBytes diterima worker:",
      fontBytes ? `${fontBytes.length} bytes` : "TIDAK ADA (null/undefined)"
    );

    const total = csvRows.length;
    let processed = 0;

    for (let i = 0; i < total; i += chunkSize) {
      const chunkRows = csvRows.slice(i, i + chunkSize);

      // Kirim Array JSON CSV & Configs ke Rust, sekaligus font custom (kalau user memilihnya)
      const zipBytes = wasm.generate_certificates_chunk(
        templateUint8,
        chunkRows,
        configs,
        i,
        fontBytes
      );

      processed += chunkRows.length;

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
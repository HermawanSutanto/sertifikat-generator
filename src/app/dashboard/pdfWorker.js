import init, * as wasm from "@/rust_wasm/pkg/pdf_cert_wasm.js";

self.onmessage = async (e) => {
  try {
    const {
      templateUint8,
      groupName,
      rows,
      startOffset,
      configs,
      fontBytes,
      filenamePattern,
    } = e.data;

    await init();

    const zipBytes = wasm.generate_certificates_chunk(
      templateUint8,
      rows,
      configs,
      startOffset,
      fontBytes,
      filenamePattern || undefined
    );

    // Kirim hasil kembali dan transfer buffer agar memori Worker langsung lepas
    self.postMessage(
      {
        type: "BATCH_COMPLETE",
        zipBytes,
        groupName,
        processedCount: rows.length,
      },
      [zipBytes.buffer]
    );
  } catch (err) {
    self.postMessage({ type: "ERROR", error: err.message || String(err) });
  }
};
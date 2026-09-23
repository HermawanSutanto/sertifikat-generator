import init, * as wasm from "@/rust_wasm/pkg/pdf_cert_wasm.js";

self.onmessage = async (e) => {
  try {
    const {
      templateUint8,
      batchQueue,
      configs,
      fontBytes,
      filenamePattern,
    } = e.data;

    await init();

    const totalRows = batchQueue.reduce((acc, curr) => acc + curr.rows.length, 0);
    let processed = 0;

    for (let i = 0; i < batchQueue.length; i++) {
      const { groupName, rows, startOffset } = batchQueue[i];

      const zipBytes = wasm.generate_certificates_chunk(
        templateUint8,
        rows,
        configs,
        startOffset,
        fontBytes,
        filenamePattern || undefined
      );

      processed += rows.length;

      self.postMessage(
        {
          type: "GROUP_COMPLETE",
          zipBytes,
          groupName,
          progress: { current: processed, total: totalRows },
        },
        [zipBytes.buffer]
      );
    }

    self.postMessage({ type: "ALL_COMPLETE" });
  } catch (err) {
    self.postMessage({ type: "ERROR", error: err.message || String(err) });
  }
};
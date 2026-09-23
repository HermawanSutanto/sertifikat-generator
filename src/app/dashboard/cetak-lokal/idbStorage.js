// idbStorage.js
// Wrapper IndexedDB minimal (tanpa dependency tambahan) khusus untuk
// autosave sesi SertiGen: template PDF (Blob/File), data CSV, dan tata letak.
//
// Dipilih IndexedDB (bukan localStorage) karena template PDF adalah data
// binary yang bisa mencapai beberapa MB, sementara localStorage dibatasi
// ~5-10MB per origin dan hanya menerima string (butuh encoding base64
// yang menambah ~33% ukuran serta memblokir main thread).

const DB_NAME = "sertigen_autosave_db";
const DB_VERSION = 1;
const STORE_NAME = "kv";

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB tidak tersedia di lingkungan ini."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function withStore(mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let result;

    Promise.resolve(callback(store))
      .then((r) => {
        result = r;
      })
      .catch(reject);

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaksi IndexedDB dibatalkan."));
  });
}

export async function idbSet(key, value) {
  return withStore("readwrite", (store) => {
    store.put(value, key);
  });
}

export async function idbGet(key) {
  return withStore("readonly", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function idbDel(key) {
  return withStore("readwrite", (store) => {
    store.delete(key);
  });
}

export async function idbClearKeys(keys) {
  return withStore("readwrite", (store) => {
    keys.forEach((k) => store.delete(k));
  });
}

// --- Kunci khusus autosave SertiGen ---
export const AUTOSAVE_KEYS = {
  TEMPLATE: "sertigen_autosave_template", // File (PDF terkompresi)
  CSV: "sertigen_autosave_csv", // { headers, rows }
  CONFIGS: "sertigen_autosave_configs", // array configs
  META: "sertigen_autosave_meta", // { templateName, templateSize, csvName, savedAt }
};

export const ALL_AUTOSAVE_KEYS = Object.values(AUTOSAVE_KEYS);

export async function readAutosaveMeta() {
  try {
    return (await idbGet(AUTOSAVE_KEYS.META)) || null;
  } catch (err) {
    console.error("Gagal membaca metadata autosave:", err);
    return null;
  }
}

export async function readFullAutosave() {
  try {
    const [template, csv, configs, meta] = await Promise.all([
      idbGet(AUTOSAVE_KEYS.TEMPLATE),
      idbGet(AUTOSAVE_KEYS.CSV),
      idbGet(AUTOSAVE_KEYS.CONFIGS),
      idbGet(AUTOSAVE_KEYS.META),
    ]);
    return { template, csv, configs, meta };
  } catch (err) {
    console.error("Gagal memuat data autosave:", err);
    return { template: null, csv: null, configs: null, meta: null };
  }
}

export async function clearAutosave() {
  try {
    await idbClearKeys(ALL_AUTOSAVE_KEYS);
  } catch (err) {
    console.error("Gagal menghapus data autosave:", err);
  }
}
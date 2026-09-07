import admin from "firebase-admin";

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON) {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_KEY_JSON tidak ditemukan di environment variables."
  );
}

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON
);

// Beberapa penyedia hosting (mis. Vercel) menyimpan env var multi-baris
// dengan "\n" sebagai teks literal, bukan newline sungguhan. Setelah
// JSON.parse, private_key bisa jadi masih mengandung "\\n" literal alih-alih
// karakter newline, sehingga Firebase Admin gagal mem-parsing PEM key-nya.
// Normalisasi di sini agar aman dari kedua kasus.
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(
    /\\n/g,
    "\n"
  );
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.log("Firebase admin initialization error", error.stack);
  }
}
export default admin;

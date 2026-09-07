import { createClient } from "@supabase/supabase-js";

// PENTING: Client ini HANYA boleh dipakai di kode server-side
// (API routes / route handlers), TIDAK PERNAH di komponen client.
// Menggunakan SUPABASE_SERVICE_ROLE_KEY (bukan NEXT_PUBLIC_SUPABASE_ANON_KEY)
// agar operasi upload/insert dari server tidak tunduk pada RLS milik
// browser, dan agar anon key yang dipakai di client tidak perlu diberi
// izin insert/upload publik ke bucket.
//
// Tambahkan di .env.local (JANGAN pakai prefix NEXT_PUBLIC_ agar tidak
// ter-bundle ke client):
//   SUPABASE_SERVICE_ROLE_KEY=xxxx

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.warn(
    "[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY belum diset. " +
      "Operasi server-side ke Supabase Storage/DB mungkin gagal karena RLS."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Menghindari crash inisialisasi jika environment variable belum diisi atau berisi placeholder sensitif
const validUrl =
  rawUrl && typeof rawUrl === "string" && rawUrl.startsWith("http")
    ? rawUrl
    : "https://placeholder.supabase.co";

const validKey =
  rawAnonKey && typeof rawAnonKey === "string" && rawAnonKey.length > 20 && !rawAnonKey.includes("[SENSITIVE]")
    ? rawAnonKey
    : "placeholder-anon-key";

export const supabase = createClient(validUrl, validKey);

export const ASSET_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_ASSET_BUCKET || "project-assets";
export const CERTIFICATE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_CERTIFICATE_BUCKET || "generated-certificates";

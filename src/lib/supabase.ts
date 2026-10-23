import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** true si falten les variables d'entorn (fitxer .env) */
export const supabaseMissingConfig = !url || !key;

export const supabase = createClient(url || "https://example.invalid", key || "missing-key");

/** Converteix qualsevol error de Supabase en un text llegible */
export function errorText(e: unknown): string {
  if (!e) return "Error desconegut";
  if (typeof e === "string") return e;
  const anyE = e as { message?: string; details?: string; hint?: string };
  return [anyE.message, anyE.details, anyE.hint].filter(Boolean).join(" · ") || "Error desconegut";
}

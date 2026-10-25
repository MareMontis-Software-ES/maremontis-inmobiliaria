import { createClient } from "@supabase/supabase-js";

// Projecte Supabase «INMO». La clau publicable és PÚBLICA per disseny (va dins
// l'aplicació i la protegeixen les regles RLS), així que es pot deixar aquí com a
// valor per defecte. Si es defineixen les variables d'entorn (.env o Vercel), manen elles.
// MAI posar aquí la clau «secret» / service_role.
const DEFAULT_URL = "https://gawnzjkxralfimlcnury.supabase.co";
const DEFAULT_KEY = "sb_publishable_3bSDlEtOm-BxGTBDyVsgVQ_e3-mb-hp";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || DEFAULT_KEY;

/** Es manté per compatibilitat; ara sempre hi ha configuració per defecte. */
export const supabaseMissingConfig = !url || !key;

// La sessió només dura mentre la finestra és oberta (sessionStorage): cada vegada que
// s'obre el programa es demana usuari i contrasenya, perquè cada usuari té els seus permisos.
// S'esborra la sessió que versions anteriors deixaven guardada a localStorage.
try { for (const k of Object.keys(localStorage)) if (k.startsWith("sb-") && k.endsWith("-auth-token")) localStorage.removeItem(k); } catch { /* sense emmagatzematge */ }
const sessionStore = (() => { try { return window.sessionStorage; } catch { return undefined; } })();

export const supabase = createClient(url, key, { auth: { storage: sessionStore, persistSession: true } });

/** Converteix qualsevol error de Supabase en un text llegible */
export function errorText(e: unknown): string {
  if (!e) return "Error desconegut";
  if (typeof e === "string") return e;
  const anyE = e as { message?: string; details?: string; hint?: string };
  return [anyE.message, anyE.details, anyE.hint].filter(Boolean).join(" · ") || "Error desconegut";
}

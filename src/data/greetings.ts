// Felicitacions automàtiques (aniversari i Nadal) i correu sortint (SMTP) de l'empresa.
// L'enviament el fa la funció del servidor «admi-felicitacions» (supabase/functions).
import { supabase } from "../lib/supabase";
import { s } from "../lib/format";
import { shrinkImage } from "../lib/images";

type Row = Record<string, any>;
export const GREETING_KINDS: [string, string][] = [["felicitacio_aniversari", "Felicitació d'aniversari"], ["felicitacio_nadal", "Felicitació de Nadal i Any Nou"]];

async function getSetting(key: string): Promise<Row> {
  const { data, error } = await supabase.from("admi_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return (data?.value || {}) as Row;
}
async function putSetting(key: string, value: Row) {
  const { error } = await supabase.from("admi_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ---------------- Felicitacions ----------------
/** Imatge de cada felicitació per idioma: images[tipus][idioma] = camí al magatzem («*» = la resta d'idiomes) */
export type GreetingImages = Record<string, Record<string, string>>;
export interface GreetingSettings { birthday_enabled: boolean; christmas_enabled: boolean; christmas_day: string; hour: number; images: GreetingImages }
export const ALL_LANGUAGES = "*";
export const defaultGreetings = (): GreetingSettings => ({ birthday_enabled: false, christmas_enabled: false, christmas_day: "12-20", hour: 9, images: {} });
export async function getGreetings(): Promise<GreetingSettings> {
  const v = await getSetting("greetings");
  return { ...defaultGreetings(), ...v, hour: Number(v.hour ?? 9), images: (v.images && typeof v.images === "object" ? v.images : {}) as GreetingImages };
}
export const saveGreetings = (g: GreetingSettings) => putSetting("greetings", { ...g });

/** Puja una imatge de felicitació i en retorna el camí al magatzem */
export async function uploadGreetingImage(original: File, kind: string, language: string): Promise<string> {
  const file = await shrinkImage(original);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `felicitacions/${kind}-${language === ALL_LANGUAGES ? "general" : language}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("fotos").upload(path, file, { contentType: file.type || "image/jpeg" });
  if (error) throw error;
  return path;
}
/** Enllaços temporals per veure les imatges (camí → URL) */
export async function greetingImageUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabase.storage.from("fotos").createSignedUrls(paths, 3600);
  return Object.fromEntries((data || []).map((d, i) => [paths[i], d.signedUrl || ""]));
}
export const removeGreetingImage = (path: string) => supabase.storage.from("fotos").remove([path]).then(() => undefined);

export interface GreetingLogRow { id: string; sent_at: string; kind: string; client: string; email: string; language: string; status: string; error: string }
export async function listGreetingLog(): Promise<GreetingLogRow[]> {
  const { data, error } = await supabase.from("admi_greeting_log")
    .select("id, sent_at, kind, email, language, status, error, client:client_id(first_name, last_name)")
    .order("sent_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data || []).map((r: Row) => ({ id: r.id, sent_at: r.sent_at, kind: r.kind, email: s(r.email), language: s(r.language), status: r.status, error: s(r.error),
    client: r.client ? `${s(r.client.first_name)} ${s(r.client.last_name)}`.trim() : "" }));
}

async function callServer(body: Row): Promise<Row> {
  const { data, error } = await supabase.functions.invoke("admi-felicitacions", { body });
  if (error) {
    // Missatge de la funció, si n'hi ha
    const msg = await (error as any).context?.json?.().then((j: Row) => j?.message).catch(() => "");
    throw new Error(msg || "No s'ha pogut contactar amb el servidor d'enviament. Comprova que la funció «admi-felicitacions» està publicada a Supabase.");
  }
  return data as Row;
}
/** Envia una prova a l'adreça indicada (no queda com a felicitació enviada a cap client) */
export async function sendGreetingTest(email: string, kind: string, language: string): Promise<{ ok: boolean; message: string }> {
  const r = await callServer({ mode: "test", email, kind, language });
  return { ok: !!r.ok, message: s(r.message) };
}
/** Envia ara les felicitacions que toquen avui (les mateixes que enviaria el servidor automàticament) */
export async function runGreetingsNow(): Promise<{ sent: number; errors: number; pending: number; warning: string }> {
  const r = await callServer({ mode: "daily" });
  return { sent: Number(r.sent || 0), errors: Number(r.errors || 0), pending: Number(r.pending || 0), warning: s(r.warning) };
}

// ---------------- Correu sortint (SMTP) ----------------
export interface SmtpSettings { host: string; port: number; user: string; from_email: string; from_name: string }
export async function getSmtp(): Promise<SmtpSettings & { password_saved: boolean }> {
  const v = await getSetting("smtp");
  const { data } = await supabase.rpc("admi_smtp_password_saved");
  return { host: s(v.host), port: Number(v.port || 465), user: s(v.user), from_email: s(v.from_email), from_name: s(v.from_name), password_saved: data === true };
}
/** Desa el servidor de correu. La contrasenya només es canvia si se n'escriu una de nova; es guarda xifrada. */
export async function saveSmtp(c: SmtpSettings, password: string) {
  await putSetting("smtp", { host: c.host.trim(), port: Number(c.port) || 465, user: c.user.trim(), from_email: c.from_email.trim(), from_name: c.from_name.trim() });
  if (password) {
    const { error } = await supabase.rpc("admi_set_smtp_password", { p_password: password });
    if (error) throw error;
  }
}

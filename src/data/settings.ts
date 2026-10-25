// Configuració general (taules admi_*): any de treball, idiomes, permisos per rol
// i còpies de seguretat. Si les taules encara no existeixen, es fan servir valors
// per defecte perquè el programa continuï funcionant.
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { s } from "../lib/format";
import { LANGUAGES } from "../lib/constants";
import type { Role, Section } from "../types";

type Row = Record<string, any>;

// ---------------- Paràmetres generals ----------------
async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await supabase.from("admi_settings").select("value").eq("key", key).maybeSingle();
  if (error || !data) return fallback;
  return (data.value ?? fallback) as T;
}

/** Any de treball (impostos / Model 210). Per defecte, l'any passat. */
export const defaultWorkingYear = () => new Date().getFullYear() - 1;
export async function getWorkingYear(): Promise<number> {
  return Number(await getSetting<number>("working_year", defaultWorkingYear())) || defaultWorkingYear();
}
export function useWorkingYear(): number | null {
  const [y, setY] = useState<number | null>(null);
  useEffect(() => { getWorkingYear().then(setY).catch(() => setY(defaultWorkingYear())); }, []);
  return y;
}

/** Canvi d'any: fixa el nou any de treball i, si es demana, crea els impostos del nou any copiant l'anterior. */
export async function changeWorkingYear(year: number, copyTaxes: boolean): Promise<number> {
  const { data, error } = await supabase.rpc("admi_change_year", { p_year: year, p_copy: copyTaxes });
  if (error) throw error;
  return Number(data || 0);
}

// ---------------- Idiomes ----------------
export interface Language { code: string; name: string; active: boolean; sort_order: number }
let langCache: [string, string][] | null = null;

export async function listLanguages(): Promise<Language[]> {
  const { data, error } = await supabase.from("admi_languages").select("*").order("sort_order").order("name");
  if (error) throw error;
  return (data || []).map((l: Row) => ({ code: l.code, name: s(l.name), active: !!l.active, sort_order: Number(l.sort_order || 0) }));
}
export async function activeLanguages(): Promise<[string, string][]> {
  try {
    const rows = await listLanguages();
    langCache = rows.length ? rows.filter(l => l.active).map(l => [l.code, l.name]) : LANGUAGES;
  } catch { langCache = LANGUAGES; }
  return langCache;
}
/** Idiomes actius per als desplegables */
export function useLanguages(): [string, string][] {
  const [l, setL] = useState<[string, string][]>(langCache || LANGUAGES);
  useEffect(() => { activeLanguages().then(setL); }, []);
  return l;
}
export async function saveLanguage(l: Language, isNew: boolean) {
  const row = { code: l.code.trim().toLowerCase(), name: l.name.trim(), active: l.active, sort_order: l.sort_order };
  const { error } = isNew ? await supabase.from("admi_languages").insert(row) : await supabase.from("admi_languages").update(row).eq("code", l.code);
  if (error) throw error;
  langCache = null;
}
/** Treu un idioma. Si algun client el té assignat, no es deixa (es pot desactivar). */
export async function deleteLanguage(code: string): Promise<string | null> {
  const { count } = await supabase.from("admi_clients").select("id", { count: "exact", head: true }).eq("language", code);
  if (count) return `No es pot treure: ${count} client${count > 1 ? "s el tenen" : " el té"} assignat. Pots desmarcar «Actiu» perquè no surti als desplegables.`;
  const { error } = await supabase.from("admi_languages").delete().eq("code", code);
  if (error) throw error;
  langCache = null;
  return null;
}

// ---------------- Permisos per rol i apartat del menú ----------------
export interface Perm { view: boolean; create: boolean; edit: boolean; delete: boolean }
export type Perms = Record<Section, Perm>;
export const MENU_SECTIONS: Section[] = ["Inici", "Clients", "Immobles", "Alertes", "Claus", "Incidències", "Revisions", "Contractes", "Industrials", "Impostos", "Estadístiques", "Configuració"];
export const PERM_ROLES: [Role, string][] = [["admin", "Administrador"], ["oficina", "Oficina"], ["consulta", "Només consulta"]];

/** Permisos per defecte (els que hi havia abans de poder-los configurar) */
export function defaultPerm(role: Role, section: Section): Perm {
  if (role === "admin") return { view: true, create: true, edit: true, delete: true };
  if (section === "Configuració" || section === "Contractes") return { view: true, create: false, edit: false, delete: false };
  if (role === "oficina") return { view: true, create: true, edit: true, delete: true };
  return { view: true, create: false, edit: false, delete: false };
}

export async function listPermissions(): Promise<Record<Role, Perms>> {
  const out = {} as Record<Role, Perms>;
  for (const [r] of PERM_ROLES) { out[r] = {} as Perms; for (const sec of MENU_SECTIONS) out[r][sec] = defaultPerm(r, sec); }
  const { data, error } = await supabase.from("admi_role_permissions").select("*");
  if (error) return out;
  for (const p of (data || []) as Row[]) {
    if (out[p.role as Role] && MENU_SECTIONS.includes(p.section)) out[p.role as Role][p.section as Section] = { view: !!p.can_view, create: !!p.can_create, edit: !!p.can_edit, delete: !!p.can_delete };
  }
  // L'administrador sempre ho pot tot (així ningú es queda fora de la configuració)
  for (const sec of MENU_SECTIONS) out.admin[sec] = defaultPerm("admin", sec);
  return out;
}
export async function permissionsFor(role: Role): Promise<Perms> {
  return (await listPermissions())[role];
}
export async function savePermissions(all: Record<Role, Perms>) {
  const rows = (Object.keys(all) as Role[]).filter(r => r !== "admin").flatMap(role => MENU_SECTIONS.map(section => {
    const p = all[role][section];
    return { role, section, can_view: p.view, can_create: p.create, can_edit: p.edit, can_delete: p.delete };
  }));
  const { error } = await supabase.from("admi_role_permissions").upsert(rows);
  if (error) throw error;
}

// ---------------- Còpies de seguretat ----------------
export interface BackupSchedule { enabled: boolean; frequency: "daily" | "weekly"; hour: string; weekday: number }
export const defaultSchedule = (): BackupSchedule => ({ enabled: true, frequency: "daily", hour: "02:00", weekday: 1 });
export async function getBackupSchedule(): Promise<BackupSchedule> {
  return { ...defaultSchedule(), ...(await getSetting<Partial<BackupSchedule>>("backup_schedule", {})) };
}
/** Desa la programació i la passa al planificador de la base de dades (pg_cron). L'hora és la d'Espanya. */
export async function saveBackupSchedule(b: BackupSchedule) {
  const [h, m] = b.hour.split(":").map(Number);
  const { error } = await supabase.rpc("admi_schedule_backups", { p_enabled: b.enabled, p_frequency: b.frequency, p_hour: h || 0, p_minute: m || 0, p_weekday: b.weekday });
  if (error) throw error;
}

export interface BackupRow { id: string; created_at: string; kind: string; created_by: string; tables: number; rows: number; size_bytes: number }
export async function listBackups(): Promise<BackupRow[]> {
  const { data, error } = await supabase.from("admi_backups")
    .select("id, created_at, kind, tables_count, rows_count, size_bytes, profiles:created_by(full_name)")
    .order("created_at", { ascending: false }).limit(60);
  if (error) throw error;
  return (data || []).map((b: Row) => ({ id: b.id, created_at: b.created_at, kind: b.kind, created_by: s(b.profiles?.full_name), tables: b.tables_count, rows: b.rows_count, size_bytes: b.size_bytes }));
}
/** Fa una còpia ara (al servidor) i en retorna l'id */
export async function runBackup(): Promise<string> {
  const { data, error } = await supabase.rpc("admi_run_backup", { p_kind: "manual" });
  if (error) throw error;
  return data as string;
}
export async function backupContent(id: string): Promise<{ sql: string; created_at: string }> {
  const { data, error } = await supabase.from("admi_backups").select("content, created_at").eq("id", id).single();
  if (error) throw error;
  return { sql: data.content as string, created_at: data.created_at as string };
}

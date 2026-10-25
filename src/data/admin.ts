// Taules de manteniment: tipus de contracte, industrials, zones, usuaris i textos de correu.
import { supabase } from "../lib/supabase";
import { s } from "../lib/format";
import type { ContractFeatures } from "../types";

type Row = Record<string, any>;

// ---------------- Tipus de contracte ----------------
export interface ContractType {
  id?: string; description: string; price: string; num_revisions: string;
  includes_revisions: boolean; includes_rent_210: boolean; includes_visits: boolean;
  includes_key_custody: boolean; includes_receipts: boolean; active: boolean; uses?: number;
}
export const CONTRACT_FLAGS: [keyof ContractType, string][] = [
  ["includes_revisions", "Revisió immoble"], ["includes_rent_210", "Renda Mod. 210"], ["includes_visits", "Visites"],
  ["includes_key_custody", "Custòdia de claus"], ["includes_receipts", "Rebuts"],
];
/** Columnes a incrustar en una consulta de finques: `properties(..., ${CONTRACT_SELECT})` */
export const CONTRACT_SELECT = "contract_types:admi_contract_types(description, includes_revisions, includes_rent_210, includes_visits, includes_key_custody, includes_receipts)";

/** Serveis de la finca segons el seu contracte. Sense contracte, tot habilitat (com la vista cases_overview). */
export function contractFeatures(ct: Row | null | undefined): ContractFeatures {
  if (!ct) return { contract: "", revisions: true, rent_210: true, visits: true, key_custody: true, receipts: true };
  return { contract: s(ct.description), revisions: !!ct.includes_revisions, rent_210: !!ct.includes_rent_210,
    visits: !!ct.includes_visits, key_custody: !!ct.includes_key_custody, receipts: !!ct.includes_receipts };
}

export const emptyContractType = (): ContractType => ({ description: "", price: "", num_revisions: "", includes_revisions: true, includes_rent_210: true, includes_visits: false, includes_key_custody: true, includes_receipts: false, active: true });

export async function listContractTypes(): Promise<ContractType[]> {
  const [ct, pr] = await Promise.all([
    supabase.from("admi_contract_types").select("*").order("description"),
    supabase.from("admi_properties").select("contract_type_id").eq("status", "active").not("contract_type_id", "is", null),
  ]);
  if (ct.error) throw ct.error;
  const uses: Record<string, number> = {};
  (pr.data || []).forEach((p: Row) => { uses[p.contract_type_id] = (uses[p.contract_type_id] || 0) + 1; });
  return (ct.data || []).map((c: Row) => ({ ...c, price: s(c.price), num_revisions: s(c.num_revisions), uses: uses[c.id] || 0 }) as ContractType);
}
export async function saveContractType(c: ContractType) {
  const row = { description: c.description.trim(), price: Number(c.price || 0), num_revisions: Number(c.num_revisions || 0),
    includes_revisions: c.includes_revisions, includes_rent_210: c.includes_rent_210, includes_visits: c.includes_visits,
    includes_key_custody: c.includes_key_custody, includes_receipts: c.includes_receipts, active: c.active };
  const { error } = c.id ? await supabase.from("admi_contract_types").update(row).eq("id", c.id) : await supabase.from("admi_contract_types").insert(row);
  if (error) throw error;
}

// ---------------- Industrials ----------------
export interface Industrial { id?: string; name: string; trade: string; contact: string; phone: string; email: string; observations: string; active: boolean }
export const emptyIndustrial = (): Industrial => ({ name: "", trade: "", contact: "", phone: "", email: "", observations: "", active: true });
export const TRADES = ["Lampista", "Electricista", "Pintor", "Jardiner", "Piscines", "Fuster", "Vidrier", "Paleta", "Climatització", "Alarmes", "Antenes", "Ascensors", "Neteja", "Serraller", "Toldos", "Altres"];

export async function listIndustrialsFull(): Promise<Industrial[]> {
  const { data, error } = await supabase.from("admi_tradespeople").select("*").order("name");
  if (error) throw error;
  return (data || []).map((i: Row) => ({ id: i.id, name: s(i.name), trade: s(i.trade), contact: s(i.contact), phone: s(i.phone), email: s(i.email), observations: s(i.observations), active: !!i.active }));
}
export async function saveIndustrial(i: Industrial) {
  const row = { name: i.name.trim(), trade: i.trade || null, contact: i.contact || null, phone: i.phone || null, email: i.email || null, observations: i.observations || null, active: i.active };
  const { error } = i.id ? await supabase.from("admi_tradespeople").update(row).eq("id", i.id) : await supabase.from("admi_tradespeople").insert(row);
  if (error) throw error;
}

// ---------------- Zones ----------------
export async function listZones(): Promise<{ code: number; name: string }[]> {
  const { data, error } = await supabase.from("admi_zones").select("*").order("code");
  if (error) throw error;
  return data as any;
}
export async function saveZone(code: number, name: string, isNew: boolean) {
  const { error } = isNew ? await supabase.from("admi_zones").insert({ code, name }) : await supabase.from("admi_zones").update({ name }).eq("code", code);
  if (error) throw error;
}

// ---------------- Usuaris ----------------
export interface ProfileRow { id: string; full_name: string; email: string; role: string; is_responsible: boolean; active: boolean }
export async function listProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabase.from("admi_users").select("id, full_name, email, role, is_responsible, active").order("full_name");
  if (error) throw error;
  return (data || []).map((p: Row) => ({ ...p, full_name: s(p.full_name), email: s(p.email) }) as ProfileRow);
}
export async function saveProfile(p: ProfileRow) {
  const { error } = await supabase.from("admi_users").update({ full_name: p.full_name, role: p.role, is_responsible: p.is_responsible, active: p.active }).eq("id", p.id);
  if (error) throw error;
}

// ---------------- Textos de correu ----------------
export interface Template { id?: string; kind: string; language: string; subject: string; body: string; reviewed: boolean }
export const TEMPLATE_KINDS: [string, string][] = [["revisio_ok", "Revisió feta (al propietari)"], ["revisio_incidencies", "Revisió amb incidències (al propietari)"],
  ["felicitacio_aniversari", "Felicitació d'aniversari"], ["felicitacio_nadal", "Felicitació de Nadal i Any Nou"]];
export async function listTemplates(): Promise<Template[]> {
  const { data, error } = await supabase.from("admi_email_templates").select("*").order("kind").order("language");
  if (error) throw error;
  return (data || []).map(t => ({ ...t, reviewed: t.reviewed !== false })) as Template[];
}
export async function saveTemplate(t: Template) {
  const row = { kind: t.kind, language: t.language, subject: t.subject, body: t.body, reviewed: t.reviewed };
  const { error } = t.id ? await supabase.from("admi_email_templates").update(row).eq("id", t.id) : await supabase.from("admi_email_templates").insert(row);
  if (error) throw error;
}

// ---------------- Esborrar (només si no s'usa enlloc) ----------------
async function countWhere(table: string, column: string, id: string): Promise<number> {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq(column, id);
  if (error) throw error;
  return count || 0;
}

/** Esborra un tipus de contracte si cap finca (ni de baixa) el té assignat. Retorna el motiu si no es pot. */
export async function deleteContractType(id: string): Promise<string | null> {
  const n = await countWhere("admi_properties", "contract_type_id", id);
  if (n) return `No es pot esborrar: està assignat a ${n} finca${n > 1 ? "s" : ""} de clients. Canvia-los el contracte primer o desmarca «Actiu».`;
  const { error } = await supabase.from("admi_contract_types").delete().eq("id", id);
  if (error) throw error;
  return null;
}

/** Esborra un industrial si no té cap treball fet o per fer (claus, incidències, notes de servei, equipaments). */
export async function deleteIndustrial(id: string): Promise<string | null> {
  const uses: [string, string, string][] = [
    ["admi_key_movements", "delivered_to_industrial_id", "entregues de claus"], ["admi_incidents", "industrial_id", "incidències"],
    ["admi_service_notes", "industrial_id", "notes de servei"], ["admi_service_notes", "industrial_alt_id", "notes de servei (2a opció)"],
    ["admi_property_equipment", "industrial_id", "equipaments de cases"],
  ];
  const found: string[] = [];
  for (const [t, c, l] of uses) { const n = await countWhere(t, c, id); if (n) found.push(`${n} ${l}`); }
  if (found.length) return `No es pot esborrar: té treballs fets o per fer (${found.join(", ")}). Pots desmarcar «Actiu» perquè no surti als desplegables.`;
  const { error } = await supabase.from("admi_tradespeople").delete().eq("id", id);
  if (error) throw error;
  return null;
}

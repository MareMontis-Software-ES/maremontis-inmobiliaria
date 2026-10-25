// Dades d'una finca (fitxa completa), titulars, impostos i control de claus.
import { supabase } from "../lib/supabase";
import { fullName, s, todayISO, addDaysISO } from "../lib/format";

type Row = Record<string, any>;

// ---------------------------------------------------------------------------
// Definició dels camps de la fitxa de finca. La pantalla es dibuixa a partir
// d'aquesta llista: per afegir un camp nou n'hi ha prou amb posar-lo aquí
// (i a la base de dades).
// ---------------------------------------------------------------------------
export type FieldType = "text" | "num" | "money" | "date" | "select" | "password" | "textarea";
export interface FieldDef { k: string; label: string; type?: FieldType; options?: [string, string][]; wide?: boolean; required?: boolean }
export interface FieldGroup { id: string; title: string; fields: FieldDef[] }

export const RENTAL_USES: [string, string][] = [["turistic", "Lloguer vacacional"], ["urba", "Lloguer urbà"]];
/** Camps que es gestionen a la pestanya Claus (el núm. d'administració només serveix per a l'armari de claus) */
export const KEY_FIELDS = ["admin_number", "key_office"];

export function propertyGroups(zones: [string, string][], contractTypes: [string, string][], streetTypes: string[]): FieldGroup[] {
  const st = streetTypes.map(x => [x, x] as [string, string]);
  return [
    { id: "ident", title: "Dades de la finca", fields: [
      { k: "admin_number", label: "Núm. administració (armari de claus)", type: "num", required: true },
      { k: "rental_use", label: "Lloguer", type: "select", options: RENTAL_USES },
      { k: "street_type", label: "Tipus de via", type: "select", options: st },
      { k: "zone", label: "Zona", type: "select", options: zones },
      { k: "address", label: "Adreça", wide: true, required: true },
      { k: "postal_code", label: "Codi postal" },
      { k: "municipality", label: "Municipi" },
      { k: "province", label: "Província" },
      { k: "country", label: "País" },
      { k: "ine_code", label: "Codi INE" },
      { k: "key_office", label: "Oficina que té la clau" },
      { k: "phone", label: "Telèfon finca" },
      { k: "phone_company", label: "Companyia telèfon" },
      { k: "community_name", label: "Comunitat de propietaris" },
      { k: "community_contact", label: "Contacte comunitat" },
      { k: "documents_path", label: "Ruta documental", wide: true },
    ] },
    { id: "aeat", title: "Nom vàlid per a l'AEAT (renda)", fields: [
      { k: "aeat_street_type", label: "Tipus via", type: "select", options: st },
      { k: "aeat_name", label: "Finca / nom via" },
      { k: "aeat_number_type", label: "Tipus núm.", type: "select", options: [["NUM", "NUM"], ["KM", "KM"], ["S/N", "S/N"]] },
      { k: "aeat_number", label: "Número" },
      { k: "aeat_block", label: "Bloc" },
      { k: "aeat_stair", label: "Escala" },
      { k: "aeat_floor", label: "Planta" },
      { k: "aeat_door", label: "Porta" },
    ] },
    { id: "contracte", title: "Contracte", fields: [
      { k: "contract_type_id", label: "Tipus de contracte", type: "select", options: contractTypes },
      { k: "num_revisions", label: "Núm. revisions/any", type: "num" },
      { k: "contract_start", label: "Data alta", type: "date" },
      { k: "contract_end", label: "Data baixa contracte", type: "date" },
      { k: "revisions_start", label: "Inici revisions", type: "date" },
    ] },
    { id: "subministraments", title: "Llum, aigua, gas i butà", fields: [
      { k: "power_company", label: "Llum · companyia" }, { k: "power_ref", label: "Llum · referència" },
      { k: "power_meter", label: "Llum · ref. comptador" }, { k: "power_cups", label: "Llum · CUPS" },
      { k: "water_company", label: "Aigua · companyia" }, { k: "water_ref", label: "Aigua · referència" },
      { k: "water_meter", label: "Aigua · ref. comptador" },
      { k: "gas_company", label: "Gas · companyia" }, { k: "gas_ref", label: "Gas · referència" },
      { k: "gas_meter", label: "Gas · ref. comptador" }, { k: "gas_install_type", label: "Gas · tipus instal·lació" },
      { k: "butane_policy", label: "Butà · núm. pòlissa" }, { k: "butane_install_type", label: "Butà · tipus instal·lació" },
      { k: "butane_revision", label: "Butà · data revisió", type: "date" },
    ] },
    { id: "serveis", title: "Internet i alarma", fields: [
      { k: "internet_company", label: "Internet · companyia" }, { k: "internet_user", label: "Internet · usuari" },
      { k: "internet_password", label: "Internet · clau", type: "password" }, { k: "internet_client_area", label: "Internet · àrea client" },
      { k: "alarm_company", label: "Alarma · companyia" }, { k: "alarm_password_1", label: "Alarma · contrasenya 1", type: "password" },
      { k: "alarm_password_2", label: "Alarma · contrasenya 2", type: "password" },
    ] },
    { id: "certificats", title: "Assegurança i certificats", fields: [
      { k: "insurance_policy", label: "Assegurança · pòlissa", wide: true },
      { k: "insurance_start", label: "Assegurança · inici", type: "date" }, { k: "insurance_end", label: "Assegurança · fi", type: "date" },
      { k: "habitability_expiry", label: "Cèdula habitabilitat · caducitat", type: "date" },
      { k: "energy_cert_date", label: "Cert. energètic · data", type: "date" },
      { k: "energy_cert_code_1", label: "Cert. energètic · codi 1" }, { k: "energy_cert_code_2", label: "Cert. energètic · codi 2" },
      { k: "energy_cert_expiry", label: "Cert. energètic · caducitat", type: "date" },
      { k: "hut_code", label: "HUT · codi assignat" }, { k: "nrua", label: "NRUA" },
    ] },
    { id: "manteniment", title: "Jardí i piscina", fields: [
      { k: "garden_maintenance", label: "Jardí · manteniment" }, { k: "garden_price", label: "Jardí · preu", type: "money" },
      { k: "garden_year", label: "Jardí · any", type: "num" },
      { k: "pool_maintenance", label: "Piscina · manteniment" }, { k: "pool_price", label: "Piscina · preu", type: "money" },
      { k: "pool_year", label: "Piscina · any", type: "num" },
    ] },
    { id: "obs", title: "Observacions", fields: [{ k: "observations", label: "Observacions", type: "textarea", wide: true }] },
  ];
}

export type PropertyForm = Record<string, string> & { id?: string; status?: string; baixa_date?: string };

export interface Owner { client_id: string | null; related_person_id: string | null; name: string; percentage: string; is_main: boolean }

const ALL_KEYS = () => propertyGroups([], [], []).flatMap(g => g.fields);

export async function getProperty(id: string): Promise<{ form: PropertyForm; owners: Owner[] }> {
  const { data, error } = await supabase.from("admi_properties")
    .select(`*, property_owners:admi_property_owners(client_id, related_person_id, ownership_percentage, is_main, clients:admi_clients(first_name, last_name), client_related_persons:admi_client_related_persons(first_name, last_name))`)
    .eq("id", id).single();
  if (error) throw error;
  const form: PropertyForm = { id: data.id, status: data.status, baixa_date: s(data.baixa_date) };
  for (const f of ALL_KEYS()) form[f.k] = s(data[f.k]);
  const owners: Owner[] = (data.property_owners || [])
    .sort((a: Row, b: Row) => Number(b.is_main) - Number(a.is_main))
    .map((o: Row) => ({
      client_id: o.client_id, related_person_id: o.related_person_id, is_main: o.is_main,
      percentage: s(o.ownership_percentage),
      name: o.clients ? fullName(o.clients.first_name, o.clients.last_name)
        : o.client_related_persons ? fullName(o.client_related_persons.first_name, o.client_related_persons.last_name) : "",
    }));
  return { form, owners };
}

export async function nextFreeAdminNumber(): Promise<string> {
  const { data, error } = await supabase.rpc("next_free_admin_number");
  if (error) throw error;
  return String(data ?? "");
}

export function emptyProperty(adminNumber: string, address?: { municipality?: string; province?: string; postal_code?: string }): PropertyForm {
  const f: PropertyForm = { status: "active" };
  for (const d of ALL_KEYS()) f[d.k] = "";
  f.admin_number = adminNumber;
  f.country = "Espanya";
  f.street_type = "C.";
  f.province = address?.province || "Girona";
  return f;
}

function toDb(form: PropertyForm) {
  const out: Row = {};
  for (const f of ALL_KEYS()) {
    const v = (form[f.k] ?? "").trim();
    if (f.type === "num" || f.type === "money" || f.k === "zone") out[f.k] = v === "" ? null : Number(v.replace(",", "."));
    else out[f.k] = v === "" ? null : v;
  }
  out.address = out.address || "";
  return out;
}

/** Comprova si el número d'administració ja l'usa una altra finca activa */
export async function adminNumberTaken(n: number, exceptId?: string): Promise<string | null> {
  let q = supabase.from("admi_properties").select("id, street_type, address").eq("admin_number", n).eq("status", "active");
  if (exceptId) q = q.neq("id", exceptId);
  const { data, error } = await q;
  if (error) throw error;
  return data && data.length ? [data[0].street_type, data[0].address].filter(Boolean).join(" ") : null;
}

/** Desa la finca i els seus titulars. Retorna l'id. */
export async function saveProperty(form: PropertyForm, owners: Owner[]): Promise<string> {
  const row = toDb(form);
  let id = form.id;
  if (id) {
    const { error } = await supabase.from("admi_properties").update(row).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("admi_properties").insert({ ...row, status: "active" }).select("id").single();
    if (error) throw error;
    id = data.id as string;
  }
  // Titulars: es substitueixen tots (és una llista curta)
  const del = await supabase.from("admi_property_owners").delete().eq("property_id", id);
  if (del.error) throw del.error;
  const rows = owners.filter(o => o.client_id || o.related_person_id).map((o, i) => ({
    property_id: id, client_id: o.client_id, related_person_id: o.related_person_id,
    ownership_percentage: Number(o.percentage || 0), is_main: i === 0,
  }));
  if (rows.length) {
    const ins = await supabase.from("admi_property_owners").insert(rows);
    if (ins.error) throw ins.error;
  }
  return id!;
}

/** Baixa: NO s'esborra (cal per al model 210 de l'any següent); el número d'armari queda lliure. */
export async function setPropertyBaixa(id: string, baixa: boolean, userId?: string, newAdminNumber?: number) {
  const patch: Row = baixa
    ? { status: "baixa", baixa_date: todayISO(), baixa_by: userId || null }
    : { status: "active", baixa_date: null, baixa_by: null, ...(newAdminNumber ? { admin_number: newAdminNumber } : {}) };
  const { error } = await supabase.from("admi_properties").update(patch).eq("id", id);
  if (error) throw error;
}

/** Client principal d'una finca (per obrir la fitxa des de la llista d'immobles) */
export async function mainClientOf(propertyId: string): Promise<string | null> {
  const { data, error } = await supabase.from("admi_property_owners")
    .select("client_id, is_main, client_related_persons:admi_client_related_persons(client_id)").eq("property_id", propertyId);
  if (error) throw error;
  const rows = (data || []) as Row[];
  const main = rows.find(r => r.is_main && r.client_id) || rows.find(r => r.client_id);
  return main?.client_id || rows.find(r => r.client_related_persons)?.client_related_persons?.client_id || null;
}

export async function lookups() {
  const [z, c] = await Promise.all([
    supabase.from("admi_zones").select("code, name").order("code"),
    supabase.from("admi_contract_types").select("id, description").eq("active", true).order("description"),
  ]);
  if (z.error) throw z.error;
  if (c.error) throw c.error;
  return {
    zones: (z.data || []).map((x: Row) => [String(x.code), `${x.code} · ${x.name}`] as [string, string]),
    contractTypes: (c.data || []).map((x: Row) => [x.id, x.description] as [string, string]),
  };
}

export async function clientPickList(): Promise<{ id: string; name: string; code: number }[]> {
  const { data, error } = await supabase.from("admi_clients").select("id, client_code, first_name, last_name").eq("status", "active").order("last_name");
  if (error) throw error;
  return (data || []).map((c: Row) => ({ id: c.id, code: c.client_code, name: fullName(c.first_name, c.last_name) }));
}

// ---------------------------------------------------------------------------
// Impostos per finca i any
// ---------------------------------------------------------------------------
export const TAX_FIELDS: FieldDef[] = [
  { k: "tax_year", label: "Any", type: "num", required: true },
  { k: "holder_name", label: "Nom (titular rebut)" },
  { k: "revaluation_pct", label: "% revalorització", type: "select", options: [["1.1", "1,1 % · Revaloritzat"], ["2", "2 % · No revaloritzat"]] },
  { k: "cadastral_value", label: "Valor cadastral", type: "money" },
  { k: "cadastral_ref", label: "Referència cadastral" },
  { k: "ibi_quota", label: "Quota IBI", type: "money" },
  { k: "tax_rate", label: "Tipus gravamen %", type: "num" },
  { k: "active_from", label: "Actiu des de", type: "date" },
  { k: "active_to", label: "Actiu fins a", type: "date" },
  { k: "paid_date", label: "Data pagament", type: "date" },
  { k: "class", label: "Classe (C / PC)", type: "select", options: [["C", "C"], ["PC", "PC"]] },
  { k: "units", label: "Unitats", type: "num" },
  { k: "reg_owner", label: "Reg. propietat" },
  { k: "purchase_date", label: "Data compra", type: "date" },
  { k: "deed_price", label: "Preu escriptura", type: "money" },
  { k: "protocol_number", label: "Núm. protocol" },
  { k: "notary", label: "Notari" },
  { k: "deed_type", label: "Tipus" },
  { k: "observations", label: "Observacions", type: "textarea", wide: true },
];

export type TaxForm = Record<string, string> & { id?: string; paid?: string; billing?: string };

export async function listTaxes(propertyId: string): Promise<TaxForm[]> {
  const { data, error } = await supabase.from("admi_property_taxes").select("*").eq("property_id", propertyId).order("tax_year", { ascending: false });
  if (error) throw error;
  return (data || []).map((t: Row) => {
    const f: TaxForm = { id: t.id, paid: t.paid ? "true" : "", billing: t.billing ? "true" : "", taxable_base: s(t.taxable_base), rent_quota: s(t.rent_quota) };
    for (const d of TAX_FIELDS) f[d.k] = s(t[d.k]);
    f.revaluation_pct = String(Number(t.revaluation_pct));
    return f;
  });
}

export function emptyTax(year: number, prev?: TaxForm): TaxForm {
  const f: TaxForm = { paid: "", billing: "" };
  for (const d of TAX_FIELDS) f[d.k] = "";
  if (prev) for (const k of ["holder_name", "revaluation_pct", "cadastral_value", "cadastral_ref", "tax_rate", "class", "units", "reg_owner", "purchase_date", "deed_price", "protocol_number", "notary", "deed_type"]) f[k] = prev[k] || "";
  f.tax_year = String(year);
  f.revaluation_pct = f.revaluation_pct || "2";
  f.tax_rate = f.tax_rate || "19";
  return f;
}

export function taxCalc(f: TaxForm) {
  const n = (v: string) => Number((v || "0").replace(",", ".")) || 0;
  const base = Math.round(n(f.cadastral_value) * n(f.revaluation_pct) / 100 * 100) / 100;
  const quota = Math.round(base * n(f.tax_rate) / 100 * 100) / 100;
  return { base, quota };
}

export async function saveTax(propertyId: string, f: TaxForm): Promise<void> {
  const row: Row = { property_id: propertyId, paid: f.paid === "true", billing: f.billing === "true" };
  for (const d of TAX_FIELDS) {
    const v = (f[d.k] ?? "").trim();
    row[d.k] = d.type === "num" || d.type === "money" ? (v === "" ? null : Number(v.replace(",", "."))) : (v === "" ? null : v);
  }
  if (row.revaluation_pct == null) row.revaluation_pct = Number(f.revaluation_pct || 2);
  if (row.tax_rate == null) row.tax_rate = 19;
  if (row.cadastral_value == null) row.cadastral_value = 0;
  if (row.ibi_quota == null) row.ibi_quota = 0;
  const q = f.id ? supabase.from("admi_property_taxes").update(row).eq("id", f.id) : supabase.from("admi_property_taxes").insert(row);
  const { error } = await q;
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Control de claus
// ---------------------------------------------------------------------------
export interface KeyMove {
  id: string; delivered_at: string; delivered_to: string; industrial: string; delivered_by: string;
  reason: string; observations: string; expected_return: string; returned_at: string; overdue: boolean;
}

export async function listKeyMoves(propertyId: string): Promise<KeyMove[]> {
  const { data, error } = await supabase.from("admi_key_movements")
    .select("*, industrials:admi_tradespeople(name), profiles:delivered_by(full_name)")
    .eq("property_id", propertyId).order("delivered_at", { ascending: false });
  if (error) throw error;
  const today = todayISO();
  return (data || []).map((k: Row) => ({
    id: k.id, delivered_at: s(k.delivered_at), delivered_to: s(k.delivered_to), industrial: s(k.industrials?.name),
    delivered_by: s(k.profiles?.full_name), reason: s(k.reason), observations: s(k.observations),
    expected_return: s(k.expected_return), returned_at: s(k.returned_at),
    overdue: !k.returned_at && k.expected_return < today,
  }));
}

export async function listIndustrials(): Promise<[string, string][]> {
  const { data, error } = await supabase.from("admi_tradespeople").select("id, name, trade").eq("active", true).order("name");
  if (error) throw error;
  return (data || []).map((i: Row) => [i.id, i.trade ? `${i.name} (${i.trade})` : i.name]);
}

export async function createKeyMove(propertyId: string, userId: string | undefined, f: { delivered_at: string; industrial_id: string; delivered_to: string; reason: string; observations: string; expected_return: string }) {
  const { error } = await supabase.from("admi_key_movements").insert({
    property_id: propertyId, delivered_by: userId || null,
    delivered_at: f.delivered_at || todayISO(),
    delivered_to_industrial_id: f.industrial_id || null,
    delivered_to: f.delivered_to || null,
    reason: f.reason || null, observations: f.observations || null,
    expected_return: f.expected_return || addDaysISO(f.delivered_at || todayISO(), 7),
  });
  if (error) throw error;
}

export async function returnKey(id: string, date: string | null) {
  const { error } = await supabase.from("admi_key_movements").update({ returned_at: date }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Clau de la finca: núm. d'administració (= armari) i oficina on es guarda
// ---------------------------------------------------------------------------
export async function getPropertyKey(id: string): Promise<{ admin_number: string; key_office: string; status: string }> {
  const { data, error } = await supabase.from("admi_properties").select("admin_number, key_office, status").eq("id", id).single();
  if (error) throw error;
  return { admin_number: s(data.admin_number), key_office: s(data.key_office), status: s(data.status) };
}
export async function savePropertyKey(id: string, adminNumber: number, keyOffice: string) {
  const { error } = await supabase.from("admi_properties").update({ admin_number: adminNumber, key_office: keyOffice || null }).eq("id", id);
  if (error) throw error;
}

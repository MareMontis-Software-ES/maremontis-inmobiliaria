// Control de cases (PDF pàg. 11-19 i PDF 2 «Control de cases»):
// llistat amb pròxima revisió, fitxes exterior/interior, revisions, fotos i correus.
import { supabase } from "../lib/supabase";
import { fullName, s, todayISO } from "../lib/format";

type Row = Record<string, any>;

// =====================================================================
// Planificació de revisions: d'octubre a juny, cada 2,5 mesos (editable
// amb la data d'inici i el núm. de revisions), saltant Nadal i Setmana Santa.
// =====================================================================
function easter(y: number): Date { // algorisme de Butcher
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day, 12);
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (v: string) => { const [y, m, d] = v.split("-").map(Number); return new Date(y, m - 1, d, 12); };

/** Si la data cau a Nadal (20/12–7/1), Setmana Santa o cap de setmana, la passa al següent dia vàlid */
function adjust(d: Date): Date {
  const x = new Date(d);
  for (let guard = 0; guard < 60; guard++) {
    const y = x.getFullYear(), m = x.getMonth() + 1, day = x.getDate();
    const e = easter(y), palm = new Date(e); palm.setDate(e.getDate() - 7); const mon = new Date(e); mon.setDate(e.getDate() + 1);
    if ((m === 12 && day >= 20) || (m === 1 && day <= 7)) { x.setDate(x.getDate() + 1); continue; }
    if (x >= palm && x <= mon) { x.setDate(x.getDate() + 1); continue; }
    if (x.getDay() === 0 || x.getDay() === 6) { x.setDate(x.getDate() + 1); continue; }
    break;
  }
  return x;
}
function add25(d: Date): Date { const x = new Date(d); x.setMonth(x.getMonth() + 2); x.setDate(x.getDate() + 15); return x; }

export function seasonOf(ref: string = todayISO()): { start: string; end: string } {
  const d = parse(ref), y = d.getMonth() + 1 >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return { start: `${y}-10-01`, end: `${y + 1}-06-30` };
}

/** Dates previstes de la temporada (oct–jun) que conté `ref` */
export function plannedDates(revisionsStart: string, numRevisions: number | null, ref: string = todayISO()): string[] {
  const { start, end } = seasonOf(ref);
  // la data d'inici marca el dia del mes de referència; si és d'una temporada anterior, es projecta a l'actual
  let d = parse(revisionsStart && revisionsStart > start ? revisionsStart : start);
  if (revisionsStart && revisionsStart < start) { const s0 = parse(revisionsStart); d = parse(start); d.setDate(Math.min(28, s0.getDate())); }
  const out: string[] = [];
  const max = numRevisions && numRevisions > 0 ? numRevisions : 99;
  while (out.length < max) {
    const a = adjust(d);
    if (iso(a) > end) break;
    out.push(iso(a));
    d = add25(a);
  }
  return out;
}

export function nextRevision(c: { revisions_start: string; num_revisions: number | null; last_revision_date: string; includes_revisions: boolean }, ref = todayISO()): { date: string; overdue: boolean } | null {
  if (!c.includes_revisions) return null;
  const plan = plannedDates(c.revisions_start, c.num_revisions, ref);
  // la propera prevista posterior a l'última feta (si n'hi ha) dins la temporada
  const last = c.last_revision_date || "";
  const pending = plan.filter(p => !last || p > addDays(last, 20)); // marge: una revisió feta fins a 20 dies abans compta
  const date = pending[0] || "";
  if (!date) {
    // temporada acabada: primera de la següent
    const next = plannedDates(c.revisions_start, c.num_revisions, addDays(seasonOf(ref).end, 2))[0];
    return next ? { date: next, overdue: false } : null;
  }
  return { date, overdue: date < ref };
}
function addDays(v: string, n: number) { const d = parse(v); d.setDate(d.getDate() + n); return iso(d); }

// =====================================================================
// Llistat de cases
// =====================================================================
export interface CaseRow {
  id: string; admin_number: number; address: string; zone: number | null; municipality: string; status: string;
  contract: string; num_revisions: number | null; includes_revisions: boolean; revisions_start: string;
  community_name: string; community_contact: string;
  client_id: string | null; client_code: number | null; client_name: string; language: string; responsible_id: string;
  last_revision_date: string; last_revision_number: number | null; revisions_count: number;
  next?: { date: string; overdue: boolean } | null;
}

export async function listCases(): Promise<CaseRow[]> {
  const { data, error } = await supabase.from("cases_overview").select("*").eq("status", "active").order("address");
  if (error) throw error;
  return (data || []).map((c: Row) => {
    const row: CaseRow = {
      id: c.id, admin_number: c.admin_number, address: [c.street_type, c.address].filter(Boolean).join(" "), zone: c.zone,
      municipality: s(c.municipality), status: c.status, contract: s(c.contract), num_revisions: c.num_revisions,
      includes_revisions: c.includes_revisions !== false, revisions_start: s(c.revisions_start),
      community_name: s(c.community_name), community_contact: s(c.community_contact),
      client_id: c.client_id, client_code: c.client_code, client_name: fullName(c.first_name, c.last_name),
      language: s(c.language), responsible_id: s(c.responsible_id),
      last_revision_date: s(c.last_revision_date), last_revision_number: c.last_revision_number, revisions_count: c.revisions_count,
    };
    row.next = nextRevision(row);
    return row;
  });
}

export async function getCase(propertyId: string): Promise<CaseRow | null> {
  const { data, error } = await supabase.from("cases_overview").select("*").eq("id", propertyId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const c = data as Row;
  const row: CaseRow = {
    id: c.id, admin_number: c.admin_number, address: [c.street_type, c.address].filter(Boolean).join(" "), zone: c.zone,
    municipality: s(c.municipality), status: c.status, contract: s(c.contract), num_revisions: c.num_revisions,
    includes_revisions: c.includes_revisions !== false, revisions_start: s(c.revisions_start),
    community_name: s(c.community_name), community_contact: s(c.community_contact),
    client_id: c.client_id, client_code: c.client_code, client_name: fullName(c.first_name, c.last_name),
    language: s(c.language), responsible_id: s(c.responsible_id),
    last_revision_date: s(c.last_revision_date), last_revision_number: c.last_revision_number, revisions_count: c.revisions_count,
  };
  row.next = nextRevision(row);
  return row;
}

// =====================================================================
// Fitxes exterior / interior (equipaments i industrials)
// =====================================================================
export type EqField = "enabled" | "company" | "contact" | "meter_ref" | "industrial_id" | "phone" | "activated" | "deactivated" | "kind" | "brand" | "automatic" | "number";
export interface EqDef { item: string; label: string; fields: EqField[]; kinds?: string[] }

export const EXTERIOR: EqDef[] = [
  { item: "AIGUA", label: "Aigua", fields: ["company", "contact", "meter_ref"] },
  { item: "ALARMA", label: "Alarma", fields: ["industrial_id", "phone", "activated", "deactivated"] },
  { item: "ANTENA", label: "Antena", fields: ["enabled", "kind", "industrial_id"], kinds: ["Terrestre", "Parabòlica", "Col·lectiva"] },
  { item: "GAS", label: "Gas", fields: ["enabled", "company", "contact", "kind"], kinds: ["Natural", "Propà", "Butà"] },
  { item: "GASOIL", label: "Gasoil", fields: ["enabled", "company"] },
  { item: "JARDI", label: "Jardí", fields: ["enabled", "automatic", "industrial_id"] },
  { item: "LLUM", label: "Llum", fields: ["company", "contact", "meter_ref"] },
  { item: "PISCINA", label: "Piscina", fields: ["enabled", "industrial_id"] },
  { item: "PORTES", label: "Portes", fields: ["kind", "industrial_id"], kinds: ["Fusta", "Alumini", "Ferro", "PVC"] },
  { item: "PORTICONS", label: "Porticons", fields: ["enabled", "industrial_id"] },
  { item: "TANCA", label: "Tanca", fields: ["kind", "industrial_id"], kinds: ["Paret", "Malla", "Bruc", "Bardissa"] },
  { item: "TANCAMENTS", label: "Tancaments", fields: ["kind", "industrial_id"], kinds: ["Fusta", "Alumini", "PVC"] },
  { item: "TOLDOS", label: "Tendals", fields: ["enabled", "industrial_id"] },
  { item: "GARATGE", label: "Garatge", fields: ["enabled", "kind", "industrial_id"], kinds: ["Porta manual", "Porta automàtica", "Plaça comunitària"] },
];
export const INTERIOR: EqDef[] = [
  { item: "ASCENSOR", label: "Ascensor", fields: ["enabled", "industrial_id", "contact"] },
  { item: "AIRE_CONDICIONAT", label: "Aire condicionat", fields: ["enabled", "brand", "phone", "industrial_id"] },
  { item: "CALEFACCIO", label: "Calefacció", fields: ["enabled", "kind", "brand", "industrial_id"], kinds: ["Gasoil", "Gas", "Elèctrica", "Bomba de calor", "Llar de foc"] },
  { item: "DESCALCIFICADOR", label: "Descalcificador", fields: ["enabled", "brand", "phone", "industrial_id"] },
  { item: "HUMIDRY", label: "Deshumidificador (Humidry)", fields: ["enabled"] },
  { item: "TELEFON", label: "Telèfon", fields: ["enabled", "number", "industrial_id"] },
  { item: "TERMO", label: "Termo", fields: ["enabled", "kind", "industrial_id"], kinds: ["Elèctric", "Gas", "Solar"] },
  { item: "PINTURA", label: "Pintura", fields: ["industrial_id"] },
  { item: "FUSTERIA", label: "Fusteria", fields: ["kind", "industrial_id"], kinds: ["Fusta", "Alumini", "PVC"] },
  { item: "VIDRES", label: "Vidres", fields: ["industrial_id"] },
  { item: "WIFI", label: "Wifi / Internet", fields: ["enabled", "company", "number", "industrial_id"] },
];
export const EQ_LABEL: Record<EqField, string> = {
  enabled: "Té", company: "Companyia / empresa", contact: "Contacte", meter_ref: "Ref. comptador", industrial_id: "Industrial",
  phone: "Telèfon", activated: "Activat", deactivated: "Desactivat", kind: "Tipus", brand: "Marca", automatic: "Reg automàtic", number: "Núm. / tel. assignat",
};

export type Equip = Record<string, { enabled: boolean; automatic: boolean; [k: string]: any }>;

export async function getEquipment(propertyId: string, area: "exterior" | "interior"): Promise<{ eq: Equip; notes: string }> {
  const { data, error } = await supabase.from("property_equipment").select("*").eq("property_id", propertyId).eq("area", area);
  if (error) throw error;
  const eq: Equip = {};
  let notes = "";
  for (const r of (data || []) as Row[]) {
    if (r.item === "OBSERVACIONS") { notes = s(r.notes); continue; }
    eq[r.item] = { enabled: !!r.enabled, automatic: !!r.automatic, company: s(r.company), contact: s(r.contact), meter_ref: s(r.meter_ref),
      industrial_id: s(r.industrial_id), phone: s(r.phone), activated: s(r.activated), deactivated: s(r.deactivated),
      kind: s(r.kind), brand: s(r.brand), number: s(r.number) };
  }
  return { eq, notes };
}

export async function saveEquipment(propertyId: string, area: "exterior" | "interior", eq: Equip, notes: string) {
  const defs = area === "exterior" ? EXTERIOR : INTERIOR;
  const rows = defs.map(d => {
    const v = eq[d.item] || { enabled: false, automatic: false };
    const t = (k: string) => (v[k] ? String(v[k]) : null);
    return { property_id: propertyId, area, item: d.item, enabled: !!v.enabled || !d.fields.includes("enabled"), automatic: !!v.automatic,
      company: t("company"), contact: t("contact"), meter_ref: t("meter_ref"), industrial_id: t("industrial_id"), phone: t("phone"),
      activated: t("activated"), deactivated: t("deactivated"), kind: t("kind"), brand: t("brand"), number: t("number"), notes: null as string | null };
  });
  rows.push({ property_id: propertyId, area, item: "OBSERVACIONS", enabled: false, automatic: false, company: null, contact: null, meter_ref: null,
    industrial_id: null, phone: null, activated: null, deactivated: null, kind: null, brand: null, number: null, notes: notes || null });
  const { error } = await supabase.from("property_equipment").upsert(rows, { onConflict: "property_id,area,item" });
  if (error) throw error;
}

// =====================================================================
// Revisions
// =====================================================================
export type RevKind = "dinsfora" | "estat";
export interface RevItemDef { key: string; label: string; kind: RevKind; extra?: "encarregar" | "falta_sal" | "caducitat" }
export const REV_DINSFORA: RevItemDef[] = [
  { key: "pintura_parets", label: "Pintura parets", kind: "dinsfora" }, { key: "esquerdes", label: "Esquerdes", kind: "dinsfora" },
  { key: "humitats", label: "Humitats", kind: "dinsfora" }, { key: "pintura_fusteria", label: "Pintura fusteria", kind: "dinsfora" },
  { key: "pintura_ferro", label: "Pintura ferro", kind: "dinsfora" }, { key: "porticons", label: "Porticons", kind: "dinsfora" },
];
export const REV_ESTAT: RevItemDef[] = [
  { key: "teulada", label: "Teulada", kind: "estat" }, { key: "desguassos", label: "Desguassos terrat", kind: "estat" },
  { key: "mobles_exterior", label: "Mobles exterior", kind: "estat" }, { key: "tanca_exterior", label: "Tanca exterior", kind: "estat" },
  { key: "tendals", label: "Tendals", kind: "estat" }, { key: "vidres", label: "Vidres / finestres", kind: "estat" },
  { key: "mosquiteres", label: "Mosquiteres", kind: "estat" }, { key: "persianes", label: "Persianes", kind: "estat" },
  { key: "piscina", label: "Piscina", kind: "estat" }, { key: "jardi", label: "Jardí", kind: "estat" },
  { key: "gasoil", label: "Gas-oil", kind: "estat", extra: "encarregar" },
  { key: "descalcificador", label: "Descalcificador", kind: "estat", extra: "falta_sal" },
  { key: "humidry", label: "Deshumidificador (Humidry)", kind: "estat", extra: "falta_sal" },
  { key: "mobles_interiors", label: "Mobles interiors", kind: "estat" }, { key: "electrodomestics", label: "Electrodomèstics", kind: "estat" },
  { key: "cuina", label: "Cuina", kind: "estat" }, { key: "banys", label: "Banys", kind: "estat" },
  { key: "telefon_internet", label: "Telèfon / internet", kind: "estat" }, { key: "neteja", label: "Neteja de la casa", kind: "estat" },
  { key: "claus", label: "Claus", kind: "estat" }, { key: "termo", label: "Termo", kind: "estat" },
  { key: "ampolles_buta", label: "Ampolles butà", kind: "estat" }, { key: "goma_gas", label: "Goma gas", kind: "estat", extra: "caducitat" },
];
export interface RevItem { key: string; dins?: boolean; fora?: boolean; state?: "bon" | "mal" | ""; notes: string; notify: boolean; extra?: string | boolean }

export interface Revision {
  id?: string; property_id: string; revision_date: string; revision_number: string; is_extra: boolean; responsible_id: string;
  water_on: boolean; water_reading: string; water_meter: string; water_prev?: string;
  power_on: boolean; power_reading: string; power_meter: string; power_prev?: string;
  gas_on: boolean; gas_reading: string; gas_meter: string; gas_prev?: string;
  reading_date: string;
  alarm_on: boolean; alarm_notes: string; alarm_notify: boolean;
  heating_on: boolean; heating_notes: string; heating_notify: boolean;
  items: RevItem[]; other_observations: string;
  email_sent_responsible_at?: string; email_sent_owner_at?: string;
}

export async function listRevisions(propertyId: string): Promise<Revision[]> {
  const { data, error } = await supabase.from("revisions").select("*").eq("property_id", propertyId)
    .order("revision_date", { ascending: false }).order("revision_number", { ascending: false });
  if (error) throw error;
  return (data || []).map(toRevision);
}
function toRevision(r: Row): Revision {
  return {
    id: r.id, property_id: r.property_id, revision_date: s(r.revision_date), revision_number: s(r.revision_number), is_extra: !!r.is_extra,
    responsible_id: s(r.responsible_id),
    water_on: !!r.water_on, water_reading: s(r.water_reading), water_meter: s(r.water_meter),
    power_on: !!r.power_on, power_reading: s(r.power_reading), power_meter: s(r.power_meter),
    gas_on: !!r.gas_on, gas_reading: s(r.gas_reading), gas_meter: s(r.gas_meter),
    reading_date: s(r.reading_date), alarm_on: !!r.alarm_on, alarm_notes: s(r.alarm_notes), alarm_notify: !!r.alarm_notify,
    heating_on: !!r.heating_on, heating_notes: s(r.heating_notes), heating_notify: !!r.heating_notify,
    items: Array.isArray(r.items) ? r.items : [], other_observations: s(r.other_observations),
    email_sent_responsible_at: s(r.email_sent_responsible_at), email_sent_owner_at: s(r.email_sent_owner_at),
  };
}

/** Revisió nova: la lectura anterior i els comptadors s'agafen de l'última revisió (PDF pàg. 14) */
export function newRevision(propertyId: string, previous: Revision | undefined, meters: { water: string; power: string; gas: string }, userId: string, seasonCount: number): Revision {
  const items: RevItem[] = [...REV_DINSFORA, ...REV_ESTAT].map(d => ({ key: d.key, state: "", dins: false, fora: false, notes: "", notify: false }));
  return {
    property_id: propertyId, revision_date: todayISO(), revision_number: String(seasonCount + 1), is_extra: false, responsible_id: userId,
    water_on: previous?.water_on ?? false, water_reading: "", water_meter: previous?.water_meter || meters.water, water_prev: previous?.water_reading || "",
    power_on: previous?.power_on ?? true, power_reading: "", power_meter: previous?.power_meter || meters.power, power_prev: previous?.power_reading || "",
    gas_on: previous?.gas_on ?? false, gas_reading: "", gas_meter: previous?.gas_meter || meters.gas, gas_prev: previous?.gas_reading || "",
    reading_date: todayISO(), alarm_on: previous?.alarm_on ?? false, alarm_notes: "", alarm_notify: false,
    heating_on: previous?.heating_on ?? false, heating_notes: "", heating_notify: false, items, other_observations: "",
  };
}

export async function saveRevision(r: Revision): Promise<string> {
  const row = {
    property_id: r.property_id, revision_date: r.revision_date, revision_number: Number(r.revision_number || 1), is_extra: r.is_extra,
    responsible_id: r.responsible_id || null,
    water_on: r.water_on, water_reading: r.water_reading || null, water_meter: r.water_meter || null,
    power_on: r.power_on, power_reading: r.power_reading || null, power_meter: r.power_meter || null,
    gas_on: r.gas_on, gas_reading: r.gas_reading || null, gas_meter: r.gas_meter || null,
    reading_date: r.reading_date || null, alarm_on: r.alarm_on, alarm_notes: r.alarm_notes || null, alarm_notify: r.alarm_notify,
    heating_on: r.heating_on, heating_notes: r.heating_notes || null, heating_notify: r.heating_notify,
    items: r.items, other_observations: r.other_observations || null,
  };
  if (r.id) {
    const { error } = await supabase.from("revisions").update(row).eq("id", r.id);
    if (error) throw error;
    return r.id;
  }
  const { data, error } = await supabase.from("revisions").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function markRevisionMail(id: string, who: "responsible" | "owner") {
  const { error } = await supabase.from("revisions").update(who === "responsible" ? { email_sent_responsible_at: new Date().toISOString() } : { email_sent_owner_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/** Elements que s'han de comunicar: marcats «mal estat», «avisar» o amb extres (encarregar, falta sal) */
export function revisionIssues(r: Revision): string[] {
  const out: string[] = [];
  if (r.alarm_notify || (r.alarm_notes && !r.alarm_on)) out.push(`Alarma (${r.alarm_on ? "ON" : "OFF"}): ${r.alarm_notes}`.trim());
  if (r.heating_notify) out.push(`Calefacció / A.C. (${r.heating_on ? "ON" : "OFF"}): ${r.heating_notes}`.trim());
  for (const d of [...REV_DINSFORA, ...REV_ESTAT]) {
    const it = r.items.find(x => x.key === d.key);
    if (!it) continue;
    const bad = it.state === "mal" || it.dins || it.fora;
    const extra = d.extra === "encarregar" && it.extra ? " — CAL ENCARREGAR" : d.extra === "falta_sal" && it.extra ? " — FALTA SAL" : d.extra === "caducitat" && it.extra ? ` — caduca ${it.extra}` : "";
    if (bad || it.notify || extra) {
      const where = d.kind === "dinsfora" ? [it.dins && "dins", it.fora && "fora"].filter(Boolean).join(" i ") : it.state === "mal" ? "Mal estat" : "";
      out.push(`${d.label}${where ? ` (${where})` : ""}${extra}${it.notes ? ": " + it.notes : ""}`);
    }
  }
  return out;
}

export function readingsText(r: Revision): string[] {
  const l: string[] = [];
  if (r.water_reading) l.push(`Lectura aigua: ${r.water_reading}${r.water_meter ? ` (comptador ${r.water_meter})` : ""} - ${r.reading_date.split("-").reverse().join("/")}`);
  if (r.power_reading) l.push(`Lectura llum: ${r.power_reading}${r.power_meter ? ` (comptador ${r.power_meter})` : ""} - ${r.reading_date.split("-").reverse().join("/")}`);
  if (r.gas_reading) l.push(`Lectura gas: ${r.gas_reading}${r.gas_meter ? ` (comptador ${r.gas_meter})` : ""} - ${r.reading_date.split("-").reverse().join("/")}`);
  return l;
}

export async function mailContext(propertyId: string, clientId: string | null, responsibleId: string, language: string) {
  const [resp, client, tpl] = await Promise.all([
    responsibleId ? supabase.from("profiles").select("full_name, email").eq("id", responsibleId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    clientId ? supabase.from("client_emails").select("email, is_primary, sort_order").eq("client_id", clientId).order("sort_order") : Promise.resolve({ data: [], error: null }),
    supabase.from("email_templates").select("*").in("language", [language || "en", "en"]),
  ]);
  const templates = ((tpl as any).data || []) as Row[];
  const pick = (kind: string) => templates.find(t => t.kind === kind && t.language === language) || templates.find(t => t.kind === kind && t.language === "en") || null;
  return {
    responsibleEmail: s((resp as any).data?.email), responsibleName: s((resp as any).data?.full_name),
    clientEmails: (((client as any).data || []) as Row[]).map(e => s(e.email)).filter(Boolean),
    tplOk: pick("revisio_ok"), tplIssues: pick("revisio_incidencies") || pick("revisio_ok"),
    usedLanguage: templates.some(t => t.language === language) ? language : "en",
  };
}

// =====================================================================
// Fotos (inventari i de cada revisió, amb nom descriptiu)
// =====================================================================
export interface Photo { id: string; revision_id: string | null; storage_path: string; description: string; url?: string; created_at: string }

export async function listPhotos(propertyId: string, revisionId: string | null): Promise<Photo[]> {
  let q = supabase.from("property_photos").select("*").eq("property_id", propertyId).order("created_at");
  q = revisionId ? q.eq("revision_id", revisionId) : q.is("revision_id", null);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data || []) as Photo[];
  if (!rows.length) return rows;
  const { data: urls } = await supabase.storage.from("fotos").createSignedUrls(rows.map(r => r.storage_path), 3600);
  return rows.map((r, i) => ({ ...r, url: urls?.[i]?.signedUrl || "" }));
}

export async function uploadPhoto(propertyId: string, revisionId: string | null, file: File, description: string) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${propertyId}/${revisionId || "inventari"}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const up = await supabase.storage.from("fotos").upload(path, file, { contentType: file.type || "image/jpeg" });
  if (up.error) throw up.error;
  const { error } = await supabase.from("property_photos").insert({ property_id: propertyId, revision_id: revisionId, storage_path: path, description: description || file.name });
  if (error) throw error;
}

export async function renamePhoto(id: string, description: string) {
  const { error } = await supabase.from("property_photos").update({ description }).eq("id", id);
  if (error) throw error;
}

export async function deletePhoto(p: Photo) {
  await supabase.storage.from("fotos").remove([p.storage_path]);
  const { error } = await supabase.from("property_photos").delete().eq("id", p.id);
  if (error) throw error;
}

// Estadístiques: només lectura. Es calculen al navegador a partir de les dades
// reals de Supabase (sense taules ni vistes noves).
import { supabase } from "../lib/supabase";
import { s } from "../lib/format";

type Row = Record<string, any>;

/** Supabase retorna com a màxim 1000 files per consulta: es demanen per pàgines. */
async function fetchAll(table: string, columns: string, build: (q: any) => any = q => q): Promise<Row[]> {
  const page = 1000;
  const out: Row[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await build(supabase.from(table).select(columns)).range(from, from + page - 1);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < page) return out;
  }
}

export type Count = [label: string, value: number];

/** Agrupa i compta, de més a menys. Els valors buits van a «Sense indicar». */
function countBy<T>(rows: T[], key: (r: T) => string): Count[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r).trim() || "Sense indicar";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const yearOf = (d: unknown) => (d ? Number(String(d).slice(0, 4)) : 0);
const monthOf = (d: unknown) => (d ? Number(String(d).slice(5, 7)) - 1 : -1);

const USE: Record<string, string> = { turistic: "Turístic", urba: "Urbà" };

export interface PortfolioStats {
  clients: { active: number; inactive: number; residents: number; nonResidents: number };
  clientsByLanguage: Count[];
  clientsByCountry: Count[];
  properties: { active: number; baixa: number; withContract: number };
  propertiesByMunicipality: Count[];
  propertiesByZone: Count[];
  propertiesByContract: Count[];
  propertiesByUse: Count[];
  /** Baixes de finques i de clients per any (any → [finques, clients]) */
  baixesByYear: [year: number, properties: number, clients: number][];
  taxYears: number[];
}

export async function portfolioStats(): Promise<PortfolioStats> {
  const [clients, properties, zones, taxYears] = await Promise.all([
    fetchAll("admi_clients", "status, resident, language, deactivated_at, client_addresses:admi_client_addresses(country)"),
    fetchAll("admi_properties", "status, baixa_date, zone, municipality, rental_use, contract_type_id, contract_types:admi_contract_types(description)"),
    fetchAll("admi_zones", "code, name"),
    fetchAll("admi_property_taxes", "tax_year"),
  ]);
  const activeClients = clients.filter(c => c.status === "active");
  const activeProps = properties.filter(p => p.status === "active");
  const zoneName = new Map(zones.map(z => [z.code, s(z.name)]));

  const baixes = new Map<number, [number, number]>();
  for (const p of properties) if (p.status === "baixa" && yearOf(p.baixa_date)) {
    const y = yearOf(p.baixa_date); const v = baixes.get(y) || [0, 0]; v[0]++; baixes.set(y, v);
  }
  for (const c of clients) if (c.status === "inactive" && yearOf(c.deactivated_at)) {
    const y = yearOf(c.deactivated_at); const v = baixes.get(y) || [0, 0]; v[1]++; baixes.set(y, v);
  }

  return {
    clients: {
      active: activeClients.length, inactive: clients.length - activeClients.length,
      residents: activeClients.filter(c => c.resident).length, nonResidents: activeClients.filter(c => !c.resident).length,
    },
    clientsByLanguage: countBy(activeClients, c => s(c.language).toUpperCase()),
    clientsByCountry: countBy(activeClients, c => {
      const a = Array.isArray(c.client_addresses) ? c.client_addresses[0] : c.client_addresses;
      return s(a?.country);
    }),
    properties: { active: activeProps.length, baixa: properties.length - activeProps.length, withContract: activeProps.filter(p => p.contract_type_id).length },
    propertiesByMunicipality: countBy(activeProps, p => s(p.municipality)),
    propertiesByZone: countBy(activeProps, p => (p.zone == null ? "" : `${p.zone}${zoneName.get(p.zone) ? " · " + zoneName.get(p.zone) : ""}`)),
    propertiesByContract: countBy(activeProps, p => s(p.contract_types?.description) || (p.contract_type_id ? "" : "Sense contracte")),
    propertiesByUse: countBy(activeProps, p => USE[p.rental_use] || ""),
    baixesByYear: [...baixes.entries()].sort((a, b) => b[0] - a[0]).map(([y, [p, c]]) => [y, p, c]),
    taxYears: [...new Set(taxYears.map(t => Number(t.tax_year)))].sort((a, b) => b - a),
  };
}

export interface YearStats {
  year: number;
  /** Per mes (0 = gener) */
  revisionsByMonth: number[];
  revisions: { total: number; extra: number; properties: number };
  incidentsByMonth: number[];
  incidentsByStatus: Count[];
  serviceNotesByStatus: Count[];
  alerts: { created: number; completed: number; pending: number };
  keys: { delivered: number; returned: number; notReturned: number };
  taxes: { records: number; paid: number; unpaid: number; ibi: number; rent: number; base: number };
}

const INCIDENT_STATUS: Record<string, string> = { oberta: "Oberta", en_curs: "En curs", tancada: "Tancada" };
const NOTE_STATUS: Record<string, string> = { pendent: "Pendent", enviada: "Enviada", completada: "Completada", "anul·lada": "Anul·lada" };

export async function yearStats(year: number): Promise<YearStats> {
  const from = `${year}-01-01`, to = `${year + 1}-01-01`;
  const between = (col: string) => (q: any) => q.gte(col, from).lt(col, to);
  const [revisions, incidents, notes, alerts, keys, taxes] = await Promise.all([
    fetchAll("admi_property_revisions", "property_id, revision_date, is_extra", between("revision_date")),
    fetchAll("admi_incidents", "incident_date, status", between("incident_date")),
    fetchAll("admi_service_notes", "created_at, status", between("created_at")),
    fetchAll("admi_alerts", "created_at, completed_at", between("created_at")),
    fetchAll("admi_key_movements", "delivered_at, returned_at", between("delivered_at")),
    fetchAll("admi_property_taxes", "paid, ibi_quota, rent_quota, taxable_base", q => q.eq("tax_year", year)),
  ]);
  const perMonth = (rows: Row[], col: string) => {
    const m = Array(12).fill(0);
    for (const r of rows) { const i = monthOf(r[col]); if (i >= 0) m[i]++; }
    return m;
  };
  const sum = (col: string) => Math.round(taxes.reduce((t, r) => t + (Number(r[col]) || 0), 0) * 100) / 100;
  const paid = taxes.filter(t => t.paid).length;
  const completed = alerts.filter(a => a.completed_at).length;
  const returned = keys.filter(k => k.returned_at).length;

  return {
    year,
    revisionsByMonth: perMonth(revisions, "revision_date"),
    revisions: { total: revisions.length, extra: revisions.filter(r => r.is_extra).length, properties: new Set(revisions.map(r => r.property_id)).size },
    incidentsByMonth: perMonth(incidents, "incident_date"),
    incidentsByStatus: countBy(incidents, i => INCIDENT_STATUS[i.status] || s(i.status)),
    serviceNotesByStatus: countBy(notes, n => NOTE_STATUS[n.status] || s(n.status)),
    alerts: { created: alerts.length, completed, pending: alerts.length - completed },
    keys: { delivered: keys.length, returned, notReturned: keys.length - returned },
    taxes: { records: taxes.length, paid, unpaid: taxes.length - paid, ibi: sum("ibi_quota"), rent: sum("rent_quota"), base: sum("taxable_base") },
  };
}

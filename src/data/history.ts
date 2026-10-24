// Historial de canvis (taula audit_log, omplerta per triggers): qui va canviar què i quan.
// Els canvis d'un mateix «Gravar» (mateixa transacció) s'agrupen. En gravar un client, els
// telèfons, e-mails, adreça i vehicles s'esborren i es tornen a crear: aquí es descarten les
// parelles esborrat/creat iguals, de manera que només surt el que realment ha canviat.
import { supabase } from "../lib/supabase";
import { fmtDate, fullName, s } from "../lib/format";
import { propertyGroups, TAX_FIELDS } from "./finques";
import { LANGUAGES } from "../lib/constants";

type Row = Record<string, any>;
export type HistoryScope = { clientId: string } | { propertyId: string; tables: string[] };

export interface HistoryEntry { tx: string; when: string; user: string; lines: { kind: "add" | "del" | "mod"; text: string }[] }

const CLIENT_LABELS: Record<string, string> = {
  client_code: "Codi client", title: "Tractament", sex: "Sexe", initials: "Inicials", first_name: "Nom", last_name: "Cognoms",
  short_name: "Nom reduït", client_type: "Tipus de client", dni: "D.N.I.", nie: "N.I.E.", passport: "Passaport",
  passport_expiry: "Caducitat passaport", language: "Idioma", nationality: "Nacionalitat", birth_date: "Data naixement",
  birth_city: "Ciutat naixement", birth_country_code: "C.P. país naixement", anagram: "Anagrama", resident: "Resident",
  authorization_ok: "Autorització", responsible_id: "Responsable", documents_path: "Ruta documental", observations: "Observacions",
  status: "Estat", deactivated_at: "Data de baixa",
};
const RELATED_LABELS: Record<string, string> = {
  relation: "Relació", title: "Tractament", first_name: "Nom", last_name: "Cognoms", birth_date: "Naixement", birth_city: "Ciutat naix.",
  birth_country_code: "C. país naix.", passport: "Passaport", passport_expiry: "Caducitat", nie: "N.I.E.", dni: "D.N.I.", labels: "Etiquetes",
  anagram: "Anagrama", ownership_percentage: "% propietat", street: "Adreça", postal_code: "Codi postal", municipality: "Població",
  province: "Província", country: "País", phones: "Telèfons", emails: "E-mails", sort_order: "",
};
const PROPERTY_LABELS: Record<string, string> = {
  ...Object.fromEntries(propertyGroups([], [], []).flatMap(g => g.fields).map(f => [f.k, f.label])),
  status: "Estat", baixa_date: "Data de baixa", baixa_by: "Donada de baixa per",
};
const TAX_LABELS: Record<string, string> = { ...Object.fromEntries(TAX_FIELDS.map(f => [f.k, f.label])), paid: "Pagat", billing: "Facturació", taxable_base: "", rent_quota: "" };
const IGNORE = new Set(["id", "client_id", "property_id", "sort_order", "is_primary", "account_code", "taxable_base", "rent_quota"]);

interface Lookups { people: Map<string, string>; contracts: Map<string, string>; clients: Map<string, string>; related: Map<string, string>; taxYears: Map<string, number> }

function fmtValue(k: string, v: unknown, lk: Lookups): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (k === "responsible_id" || k === "baixa_by") return lk.people.get(String(v)) || "(usuari)";
  if (k === "contract_type_id") return lk.contracts.get(String(v)) || "(contracte)";
  if (k === "language") return LANGUAGES.find(l => l[0] === v)?.[1] || String(v);
  if (k === "status") return v === "active" ? "Activa/actiu" : v === "baixa" || v === "inactive" ? "Baixa" : String(v);
  if (Array.isArray(v)) return v.map(x => (typeof x === "object" && x ? Object.values(x).filter(Boolean).join(" ") : String(x))).filter(Boolean).join(", ") || "—";
  const t = String(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? fmtDate(t) : t;
}

/** Text curt que identifica una fila d'una taula filla (telèfon, e-mail, adreça…) */
function rowSummary(table: string, d: Row, lk: Lookups): string {
  switch (table) {
    case "client_phones": return `${s(d.country_prefix)} ${s(d.phone_number)}`.trim() + (d.notes ? ` (${d.notes})` : "");
    case "client_emails": return s(d.email);
    case "client_vehicles": return [d.plate, d.brand, d.model].filter(Boolean).join(" ");
    case "client_addresses": return [[d.street_type, d.street_name, d.street_number].filter(Boolean).join(" "), d.extra, [d.postal_code, d.municipality].filter(Boolean).join(" "), d.country].filter(Boolean).join(", ");
    case "client_related_persons": return fullName(d.first_name, d.last_name) + (d.relation === "conjuge" ? " (cònjuge)" : " (copropietari)");
    case "property_owners": return (d.client_id ? lk.clients.get(d.client_id) : d.related_person_id ? lk.related.get(d.related_person_id) : "") + ` · ${Number(d.ownership_percentage ?? 0)} %` + (d.is_main ? " (principal)" : "");
    default: return "";
  }
}
const CHILD_NAME: Record<string, string> = {
  client_phones: "Telèfon", client_emails: "E-mail", client_vehicles: "Matrícula", client_addresses: "Adreça",
  client_related_persons: "Cònjuge/copropietari", property_owners: "Titular",
};
// contingut comparable d'una fila filla (sense id, ordre ni «principal»)
const content = (d: Row) => JSON.stringify(Object.keys(d || {}).filter(k => !["id", "sort_order", "is_primary"].includes(k)).sort().map(k => [k, d[k]]));

function linesOf(rows: Row[], lk: Lookups): HistoryEntry["lines"] {
  const out: HistoryEntry["lines"] = [];
  // descarta parelles esborrat/creat amb el mateix contingut (es regraven en desar el client)
  const dels = rows.filter(r => r.action === "delete" && CHILD_NAME[r.table_name]);
  const used = new Set<Row>();
  const kept = rows.filter(r => {
    if (r.action !== "insert" || !CHILD_NAME[r.table_name]) return true;
    const twin = dels.find(d => !used.has(d) && d.table_name === r.table_name && content(d.old_data) === content(r.new_data));
    if (twin) { used.add(twin); return false; }
    return true;
  }).filter(r => !used.has(r));

  for (const r of kept) {
    const t = r.table_name as string;
    if (CHILD_NAME[t]) {
      if (r.action === "insert") out.push({ kind: "add", text: `${CHILD_NAME[t]} afegit: ${rowSummary(t, r.new_data, lk)}` });
      else if (r.action === "delete") out.push({ kind: "del", text: `${CHILD_NAME[t]} eliminat: ${rowSummary(t, r.old_data, lk)}` });
      else {
        const labels = t === "client_related_persons" ? RELATED_LABELS : CLIENT_LABELS;
        const who = t === "client_related_persons" ? `${CHILD_NAME[t]} ` : `${CHILD_NAME[t]}: `;
        for (const k of Object.keys(r.new_data || {})) {
          if (IGNORE.has(k) || labels[k] === "") continue;
          out.push({ kind: "mod", text: `${who}${labels[k] || k}: ${fmtValue(k, r.old_data?.[k], lk)} → ${fmtValue(k, r.new_data[k], lk)}` });
        }
      }
      continue;
    }
    const labels = t === "clients" ? CLIENT_LABELS : t === "properties" ? PROPERTY_LABELS : TAX_LABELS;
    const prefix = t === "property_taxes" ? `Impostos ${r.new_data?.tax_year ?? r.old_data?.tax_year ?? lk.taxYears.get(r.record_id) ?? ""} · ` : "";
    if (r.action === "insert") out.push({ kind: "add", text: t === "clients" ? "Alta del client" : t === "properties" ? "Alta de la finca" : `${prefix}any creat` });
    else if (r.action === "delete") out.push({ kind: "del", text: t === "property_taxes" ? `${prefix}any esborrat` : "Fitxa esborrada" });
    else for (const k of Object.keys(r.new_data || {})) {
      if (IGNORE.has(k) || labels[k] === "") continue;
      out.push({ kind: "mod", text: `${prefix}${labels[k] || k}: ${fmtValue(k, r.old_data?.[k], lk)} → ${fmtValue(k, r.new_data[k], lk)}` });
    }
  }
  return out;
}

export async function listHistory(scope: HistoryScope, limit = 400): Promise<HistoryEntry[]> {
  let q = supabase.from("audit_log").select("*").order("changed_at", { ascending: false }).order("id", { ascending: false }).limit(limit);
  q = "clientId" in scope ? q.eq("client_id", scope.clientId) : q.eq("property_id", scope.propertyId).in("table_name", scope.tables);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data || []) as Row[];

  const ids = (k: string) => [...new Set(rows.flatMap(r => [r.old_data?.[k], r.new_data?.[k]]).filter(Boolean))] as string[];
  const clientIds = ids("client_id"), relIds = ids("related_person_id");
  const [people, contracts, clients, related, taxes] = await Promise.all([
    supabase.from("profiles").select("id, full_name"),
    supabase.from("contract_types").select("id, description"),
    clientIds.length ? supabase.from("clients").select("id, first_name, last_name").in("id", clientIds) : Promise.resolve({ data: [] as Row[] }),
    relIds.length ? supabase.from("client_related_persons").select("id, first_name, last_name").in("id", relIds) : Promise.resolve({ data: [] as Row[] }),
    "propertyId" in scope ? supabase.from("property_taxes").select("id, tax_year").eq("property_id", scope.propertyId) : Promise.resolve({ data: [] as Row[] }),
  ]);
  const lk: Lookups = {
    people: new Map(((people as any).data || []).map((p: Row) => [p.id, s(p.full_name)])),
    contracts: new Map(((contracts as any).data || []).map((c: Row) => [c.id, s(c.description)])),
    clients: new Map(((clients as any).data || []).map((c: Row) => [c.id, fullName(c.first_name, c.last_name)])),
    related: new Map(((related as any).data || []).map((c: Row) => [c.id, fullName(c.first_name, c.last_name)])),
    taxYears: new Map(((taxes as any).data || []).map((t: Row) => [t.id, t.tax_year])),
  };

  // agrupa per transacció, conservant l'ordre (més recent primer)
  const groups = new Map<string, Row[]>();
  for (const r of rows) { const k = String(r.tx); groups.set(k, [...(groups.get(k) || []), r]); }
  return [...groups.entries()].map(([tx, g]) => ({
    tx, when: g[0].changed_at, user: s(g[0].user_name) || (g[0].user_id ? "(usuari)" : "Sistema"),
    lines: linesOf([...g].reverse(), lk),
  })).filter(e => e.lines.length);
}

// Estadístiques i llistats a mida: catàleg de tots els camps de clients i d'immobles
// que es poden triar per agrupar, filtrar, comptar o llistar. Només lectura: les dades
// es llegeixen de Supabase i es calculen al navegador (sense taules ni vistes noves).
// Les contrasenyes (internet, alarma) no surten mai.
import { supabase } from "../lib/supabase";
import { accountCode, fmtDate, fullName, s, todayISO } from "../lib/format";
import { LANGUAGES } from "../lib/constants";

type Row = Record<string, any>;

export type Source = "clients" | "properties";
export type FieldType = "text" | "number" | "money" | "date" | "bool";
export type Value = string | number | boolean | null;

/** Context comú per als camps que depenen d'una opció (l'any dels impostos). */
export interface Ctx { taxYear: number }

export interface Field {
  key: string;
  label: string;
  group: string;
  type: FieldType;
  get: (r: Row, ctx: Ctx) => Value;
}

/** Supabase retorna com a màxim 1000 files per consulta: es demanen per pàgines. */
async function fetchAll(table: string, columns: string): Promise<Row[]> {
  const page = 1000;
  const out: Row[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + page - 1);
    if (error) throw error;
    out.push(...((data || []) as unknown as Row[]));
    if (!data || data.length < page) return out;
  }
}

const one = (v: any): Row | undefined => (Array.isArray(v) ? v[0] : v) || undefined;
const primary = (list: Row[] | null | undefined): Row | undefined => (list || []).find(x => x.is_primary) || (list || [])[0];
const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));
const txt = (v: unknown): string | null => (s(v).trim() ? s(v).trim() : null);
const LANG = new Map(LANGUAGES);
const langName = (v: unknown) => (s(v) ? LANG.get(s(v).toLowerCase()) || s(v).toUpperCase() : null);
const USE: Record<string, string> = { turistic: "Turístic", urba: "Urbà" };

function age(birth: unknown): number | null {
  const b = s(birth);
  if (!b) return null;
  const t = todayISO();
  let a = Number(t.slice(0, 4)) - Number(b.slice(0, 4));
  if (t.slice(5, 10) < b.slice(5, 10)) a--;
  return a >= 0 && a < 130 ? a : null;
}

// ---------------- Clients ----------------

const CLIENT_SELECT = `id, client_code, account_code, title, sex, initials, first_name, last_name, short_name, client_type,
  dni, nie, passport, passport_expiry, language, nationality, birth_date, birth_city, birth_country_code,
  resident, authorization_ok, observations, status, deactivated_at, created_at,
  responsible:responsible_id(full_name),
  client_addresses:admi_client_addresses(street_type, street_name, street_number, extra, postal_code, municipality, province, country, is_primary),
  client_phones:admi_client_phones(country_prefix, phone_number, is_primary),
  client_emails:admi_client_emails(email, is_primary),
  property_owners:admi_property_owners(properties:admi_properties(status))`;

const addr = (r: Row) => primary(r.client_addresses);
const clientProps = (r: Row) => (r.property_owners || []).map((o: Row) => one(o.properties)).filter(Boolean) as Row[];

export const CLIENT_FIELDS: Field[] = [
  { key: "client_code", label: "Codi client", group: "Dades del client", type: "number", get: r => num(r.client_code) },
  { key: "account_code", label: "Subcompte", group: "Dades del client", type: "text", get: r => txt(r.account_code) || txt(accountCode(r.client_code)) },
  { key: "title", label: "Tractament", group: "Dades del client", type: "text", get: r => txt(r.title) },
  { key: "sex", label: "Sexe", group: "Dades del client", type: "text", get: r => (r.sex === "H" ? "Home" : r.sex === "D" ? "Dona" : null) },
  { key: "first_name", label: "Nom", group: "Dades del client", type: "text", get: r => txt(r.first_name) },
  { key: "last_name", label: "Cognoms", group: "Dades del client", type: "text", get: r => txt(r.last_name) },
  { key: "full_name", label: "Nom complet", group: "Dades del client", type: "text", get: r => txt(fullName(r.first_name, r.last_name)) },
  { key: "short_name", label: "Nom curt", group: "Dades del client", type: "text", get: r => txt(r.short_name) },
  { key: "initials", label: "Inicials", group: "Dades del client", type: "text", get: r => txt(r.initials) },
  { key: "client_type", label: "Tipus de client", group: "Dades del client", type: "text", get: r => (r.client_type === "empresa" ? "Empresa" : "Particular") },
  { key: "dni", label: "DNI", group: "Documents", type: "text", get: r => txt(r.dni) },
  { key: "nie", label: "NIE", group: "Documents", type: "text", get: r => txt(r.nie) },
  { key: "passport", label: "Passaport", group: "Documents", type: "text", get: r => txt(r.passport) },
  { key: "passport_expiry", label: "Caducitat del passaport", group: "Documents", type: "date", get: r => txt(r.passport_expiry) },
  { key: "language", label: "Idioma", group: "Dades personals", type: "text", get: r => langName(r.language) },
  { key: "nationality", label: "Nacionalitat", group: "Dades personals", type: "text", get: r => txt(r.nationality) },
  { key: "birth_date", label: "Data de naixement", group: "Dades personals", type: "date", get: r => txt(r.birth_date) },
  { key: "age", label: "Edat", group: "Dades personals", type: "number", get: r => age(r.birth_date) },
  { key: "birth_city", label: "Lloc de naixement", group: "Dades personals", type: "text", get: r => txt(r.birth_city) },
  { key: "birth_country_code", label: "País de naixement", group: "Dades personals", type: "text", get: r => txt(r.birth_country_code) },
  { key: "resident", label: "Resident", group: "Dades personals", type: "bool", get: r => !!r.resident },
  { key: "authorization_ok", label: "Autorització", group: "Dades personals", type: "bool", get: r => !!r.authorization_ok },
  { key: "responsible", label: "Responsable", group: "Dades personals", type: "text", get: r => txt(one(r.responsible)?.full_name) },
  { key: "street", label: "Adreça", group: "Adreça principal", type: "text", get: r => { const a = addr(r); return a ? txt([a.street_type, a.street_name, a.street_number, a.extra].filter(Boolean).join(" ")) : null; } },
  { key: "postal_code", label: "Codi postal", group: "Adreça principal", type: "text", get: r => txt(addr(r)?.postal_code) },
  { key: "municipality", label: "Població", group: "Adreça principal", type: "text", get: r => txt(addr(r)?.municipality) },
  { key: "province", label: "Província", group: "Adreça principal", type: "text", get: r => txt(addr(r)?.province) },
  { key: "country", label: "País de residència", group: "Adreça principal", type: "text", get: r => txt(addr(r)?.country) },
  { key: "phone", label: "Telèfon principal", group: "Contacte", type: "text", get: r => { const p = primary(r.client_phones); return p ? txt([p.country_prefix, p.phone_number].filter(Boolean).join(" ")) : null; } },
  { key: "email", label: "E-mail principal", group: "Contacte", type: "text", get: r => txt(primary(r.client_emails)?.email) },
  { key: "num_phones", label: "Nombre de telèfons", group: "Contacte", type: "number", get: r => (r.client_phones || []).length },
  { key: "num_props_active", label: "Immobles actius", group: "Immobles", type: "number", get: r => clientProps(r).filter(p => p.status === "active").length },
  { key: "num_props", label: "Immobles (inclou baixes)", group: "Immobles", type: "number", get: r => clientProps(r).length },
  { key: "status", label: "Estat", group: "Alta i baixa", type: "text", get: r => (r.status === "active" ? "Actiu" : "Donat de baixa") },
  { key: "created_at", label: "Data d'alta", group: "Alta i baixa", type: "date", get: r => txt(s(r.created_at).slice(0, 10)) },
  { key: "deactivated_at", label: "Data de baixa", group: "Alta i baixa", type: "date", get: r => txt(r.deactivated_at) },
  { key: "observations", label: "Observacions", group: "Alta i baixa", type: "text", get: r => txt(r.observations) },
];

// ---------------- Immobles ----------------

const PROPERTY_COLUMNS = `id, admin_number, street_type, address, zone, municipality, postal_code, province, country, ine_code,
  phone, phone_company, rental_use, key_office, community_name, community_contact,
  aeat_street_type, aeat_name, aeat_number, aeat_floor, aeat_door,
  contract_start, contract_end, revisions_start, num_revisions,
  water_company, water_ref, water_meter, power_company, power_ref, power_meter, power_cups,
  gas_company, gas_ref, gas_meter, gas_install_type, butane_policy, butane_install_type, butane_revision,
  internet_company, alarm_company, insurance_policy, insurance_start, insurance_end,
  habitability_expiry, energy_cert_date, energy_cert_code_1, energy_cert_code_2, energy_cert_expiry, hut_code, nrua,
  garden_maintenance, garden_price, garden_year, pool_maintenance, pool_price, pool_year,
  observations, status, baixa_date, created_at,
  zones:admi_zones(name),
  contract_types:admi_contract_types(description, price, num_revisions),
  property_owners:admi_property_owners(is_main, ownership_percentage,
    clients:admi_clients(client_code, first_name, last_name, language, nationality, resident, status,
      client_addresses:admi_client_addresses(municipality, country, is_primary)),
    client_related_persons:admi_client_related_persons(first_name, last_name)),
  property_taxes:admi_property_taxes(tax_year, cadastral_ref, cadastral_value, revaluation_pct, taxable_base, tax_rate, rent_quota, ibi_quota, paid, paid_date)`;

const owners = (r: Row) => (r.property_owners || []) as Row[];
const mainOwner = (r: Row): Row | undefined => { const o = owners(r).filter(x => x.clients); return o.find(x => x.is_main) || o[0]; };
const ownerClient = (r: Row): Row | undefined => one(mainOwner(r)?.clients);
const tax = (r: Row, ctx: Ctx): Row | undefined => (r.property_taxes || []).find((t: Row) => Number(t.tax_year) === ctx.taxYear);

const P = (key: string, label: string, group: string, type: FieldType = "text"): Field =>
  ({ key, label, group, type, get: r => (type === "number" || type === "money" ? num(r[key]) : txt(r[key])) });

export const PROPERTY_FIELDS: Field[] = [
  P("admin_number", "Núm. d'administració", "Immoble", "number"),
  { key: "full_address", label: "Adreça", group: "Immoble", type: "text", get: r => txt([r.street_type, r.address].filter(Boolean).join(" ")) },
  P("street_type", "Tipus de via", "Immoble"),
  { key: "zone", label: "Zona", group: "Immoble", type: "text", get: r => (r.zone == null ? null : [r.zone, one(r.zones)?.name].filter(Boolean).join(" · ")) },
  P("municipality", "Població", "Immoble"),
  P("postal_code", "Codi postal", "Immoble"),
  P("province", "Província", "Immoble"),
  P("country", "País", "Immoble"),
  P("ine_code", "Codi INE", "Immoble"),
  { key: "rental_use", label: "Tipus de lloguer", group: "Immoble", type: "text", get: r => USE[r.rental_use] || null },
  P("key_office", "Oficina de la clau", "Immoble"),
  P("phone", "Telèfon de la casa", "Immoble"),
  P("phone_company", "Companyia del telèfon", "Immoble"),
  P("community_name", "Comunitat de propietaris", "Comunitat"),
  P("community_contact", "Contacte de la comunitat", "Comunitat"),
  { key: "aeat_address", label: "Adreça AEAT", group: "Dades AEAT", type: "text", get: r => txt([r.aeat_street_type, r.aeat_name, r.aeat_number, r.aeat_floor, r.aeat_door].filter(Boolean).join(" ")) },
  { key: "owner_name", label: "Titular principal", group: "Propietaris", type: "text", get: r => { const o = mainOwner(r); const c = one(o?.clients); return c ? txt(fullName(c.first_name, c.last_name)) : null; } },
  { key: "owner_code", label: "Codi client del titular", group: "Propietaris", type: "number", get: r => num(ownerClient(r)?.client_code) },
  { key: "owner_language", label: "Idioma del titular", group: "Propietaris", type: "text", get: r => langName(ownerClient(r)?.language) },
  { key: "owner_nationality", label: "Nacionalitat del titular", group: "Propietaris", type: "text", get: r => txt(ownerClient(r)?.nationality) },
  { key: "owner_resident", label: "Titular resident", group: "Propietaris", type: "bool", get: r => (ownerClient(r) ? !!ownerClient(r)!.resident : null) },
  { key: "owner_country", label: "País de residència del titular", group: "Propietaris", type: "text", get: r => txt(primary(ownerClient(r)?.client_addresses)?.country) },
  { key: "owner_town", label: "Població del titular", group: "Propietaris", type: "text", get: r => txt(primary(ownerClient(r)?.client_addresses)?.municipality) },
  { key: "num_owners", label: "Nombre de propietaris", group: "Propietaris", type: "number", get: r => owners(r).length },
  { key: "all_owners", label: "Tots els propietaris", group: "Propietaris", type: "text", get: r => txt(owners(r).map(o => {
      const c = one(o.clients) || one(o.client_related_persons);
      return c ? fullName(c.first_name, c.last_name) + (num(o.ownership_percentage) != null && Number(o.ownership_percentage) < 100 ? ` (${Number(o.ownership_percentage)}%)` : "") : "";
    }).filter(Boolean).join(", ")) },
  { key: "contract", label: "Tipus de contracte", group: "Contracte", type: "text", get: r => txt(one(r.contract_types)?.description) },
  { key: "contract_price", label: "Preu del contracte", group: "Contracte", type: "money", get: r => num(one(r.contract_types)?.price) },
  P("contract_start", "Inici del contracte", "Contracte", "date"),
  P("contract_end", "Fi del contracte", "Contracte", "date"),
  P("revisions_start", "Inici de les revisions", "Contracte", "date"),
  { key: "num_revisions", label: "Revisions a l'any", group: "Contracte", type: "number", get: r => num(r.num_revisions ?? one(r.contract_types)?.num_revisions) },
  P("water_company", "Aigua: companyia", "Subministraments"),
  P("water_ref", "Aigua: referència", "Subministraments"),
  P("water_meter", "Aigua: comptador", "Subministraments"),
  P("power_company", "Llum: companyia", "Subministraments"),
  P("power_ref", "Llum: referència", "Subministraments"),
  P("power_meter", "Llum: comptador", "Subministraments"),
  P("power_cups", "Llum: CUPS", "Subministraments"),
  P("gas_company", "Gas: companyia", "Subministraments"),
  P("gas_ref", "Gas: referència", "Subministraments"),
  P("gas_meter", "Gas: comptador", "Subministraments"),
  P("gas_install_type", "Gas: tipus d'instal·lació", "Subministraments"),
  P("butane_policy", "Butà: pòlissa", "Subministraments"),
  P("butane_install_type", "Butà: tipus d'instal·lació", "Subministraments"),
  P("butane_revision", "Butà: revisió", "Subministraments", "date"),
  P("internet_company", "Internet: companyia", "Subministraments"),
  P("alarm_company", "Alarma: companyia", "Subministraments"),
  P("insurance_policy", "Assegurança: pòlissa", "Documents i certificats"),
  P("insurance_start", "Assegurança: inici", "Documents i certificats", "date"),
  P("insurance_end", "Assegurança: venciment", "Documents i certificats", "date"),
  P("habitability_expiry", "Cèdula d'habitabilitat: caducitat", "Documents i certificats", "date"),
  P("energy_cert_date", "Certificat energètic: data", "Documents i certificats", "date"),
  P("energy_cert_code_1", "Certificat energètic: codi 1", "Documents i certificats"),
  P("energy_cert_code_2", "Certificat energètic: codi 2", "Documents i certificats"),
  P("energy_cert_expiry", "Certificat energètic: caducitat", "Documents i certificats", "date"),
  P("hut_code", "Codi HUT", "Documents i certificats"),
  P("nrua", "NRUA", "Documents i certificats"),
  P("garden_maintenance", "Jardí: manteniment", "Jardí i piscina"),
  P("garden_price", "Jardí: preu", "Jardí i piscina", "money"),
  P("garden_year", "Jardí: any", "Jardí i piscina", "number"),
  P("pool_maintenance", "Piscina: manteniment", "Jardí i piscina"),
  P("pool_price", "Piscina: preu", "Jardí i piscina", "money"),
  P("pool_year", "Piscina: any", "Jardí i piscina", "number"),
  { key: "tax_has", label: "Té dades d'impostos de l'any", group: "Impostos (any triat)", type: "bool", get: (r, c) => !!tax(r, c) },
  { key: "tax_cadastral_ref", label: "Referència cadastral", group: "Impostos (any triat)", type: "text", get: (r, c) => txt(tax(r, c)?.cadastral_ref) },
  { key: "tax_cadastral_value", label: "Valor cadastral", group: "Impostos (any triat)", type: "money", get: (r, c) => num(tax(r, c)?.cadastral_value) },
  { key: "tax_revaluation", label: "% revalorització", group: "Impostos (any triat)", type: "number", get: (r, c) => num(tax(r, c)?.revaluation_pct) },
  { key: "tax_base", label: "Base imposable", group: "Impostos (any triat)", type: "money", get: (r, c) => num(tax(r, c)?.taxable_base) },
  { key: "tax_rate", label: "Tipus de gravamen %", group: "Impostos (any triat)", type: "number", get: (r, c) => num(tax(r, c)?.tax_rate) },
  { key: "tax_rent", label: "Quota renda (Model 210)", group: "Impostos (any triat)", type: "money", get: (r, c) => num(tax(r, c)?.rent_quota) },
  { key: "tax_ibi", label: "Quota IBI", group: "Impostos (any triat)", type: "money", get: (r, c) => num(tax(r, c)?.ibi_quota) },
  { key: "tax_paid", label: "Impostos pagats", group: "Impostos (any triat)", type: "bool", get: (r, c) => (tax(r, c) ? !!tax(r, c)!.paid : null) },
  { key: "tax_paid_date", label: "Data de pagament", group: "Impostos (any triat)", type: "date", get: (r, c) => txt(tax(r, c)?.paid_date) },
  { key: "status", label: "Estat", group: "Alta i baixa", type: "text", get: r => (r.status === "active" ? "Activa" : "Donada de baixa") },
  { key: "created_at", label: "Data d'alta", group: "Alta i baixa", type: "date", get: r => txt(s(r.created_at).slice(0, 10)) },
  { key: "baixa_date", label: "Data de baixa", group: "Alta i baixa", type: "date", get: r => txt(r.baixa_date) },
  P("observations", "Observacions", "Alta i baixa"),
];

export const FIELDS: Record<Source, Field[]> = { clients: CLIENT_FIELDS, properties: PROPERTY_FIELDS };

export async function loadSource(source: Source): Promise<Row[]> {
  return source === "clients" ? fetchAll("admi_clients", CLIENT_SELECT) : fetchAll("admi_properties", PROPERTY_COLUMNS);
}

/** Anys amb dades d'impostos (per al desplegable). */
export function taxYearsOf(rows: Row[]): number[] {
  return [...new Set(rows.flatMap(r => (r.property_taxes || []).map((t: Row) => Number(t.tax_year))))].sort((a, b) => b - a);
}

// ---------------- Presentació de valors ----------------

export const EMPTY = "(sense indicar)";

export function showValue(v: Value, type: FieldType): string {
  if (v === null || v === undefined || v === "") return "";
  if (type === "bool") return v ? "Sí" : "No";
  if (type === "date") return fmtDate(String(v));
  if (type === "money") return Number(v).toLocaleString("ca-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  if (type === "number") return Number(v).toLocaleString("ca-ES", { maximumFractionDigits: 2 });
  return String(v);
}

/** Com s'agrupen les dates: per any, per mes o per dia. */
export type DateGroup = "any" | "mes" | "dia";
const MONTHS = ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"];

/** Clau d'agrupació (ordenable) i text que es mostra. */
export function groupKey(v: Value, type: FieldType, dg: DateGroup): [sort: string, label: string] {
  if (v === null || v === undefined || v === "") return ["￿", EMPTY];
  if (type === "bool") return [v ? "0" : "1", v ? "Sí" : "No"];
  if (type === "date") {
    const d = String(v);
    if (dg === "any") return [d.slice(0, 4), d.slice(0, 4)];
    if (dg === "mes") return [d.slice(0, 7), `${MONTHS[Number(d.slice(5, 7)) - 1] || d.slice(5, 7)} ${d.slice(0, 4)}`];
    return [d.slice(0, 10), fmtDate(d)];
  }
  if (type === "number" || type === "money") return [String(Number(v) + 1e12).padStart(20, "0"), showValue(v, type)];
  return [String(v).toLocaleLowerCase("ca"), String(v)];
}

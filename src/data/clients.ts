// Tot l'accés a dades de clients passa per aquí. Les pantalles no parlen
// mai directament amb Supabase.
import { supabase } from "../lib/supabase";
import { s } from "../lib/format";
import { CONTRACT_SELECT, contractFeatures } from "./admin";
import type { ClientFull, ClientSummary, PropertyLink, RelatedPerson } from "../types";

export const emptyAddress = () => ({
  street_type: "C.", street_name: "", street_number: "", extra: "",
  postal_code: "", municipality: "", province: "", country: "Espanya", country_code: "ES",
});

export const emptyRelated = (relation: RelatedPerson["relation"] = "copropietari"): RelatedPerson => ({
  relation, title: "", first_name: "", last_name: "", birth_date: "", birth_city: "", birth_country_code: "",
  passport: "", passport_expiry: "", nie: "", dni: "", labels: false, anagram: "", ownership_percentage: "",
  street: "", postal_code: "", municipality: "", province: "", country: "",
  phones: [{ type: "mobil", prefix: "+34", number: "" }], emails: [{ type: "particular", email: "" }],
});

export function emptyClient(nextCode = ""): ClientFull {
  return {
    client: {
      client_code: nextCode, title: "Sr.", sex: "", initials: "", first_name: "", last_name: "", short_name: "",
      client_type: "particular", dni: "", nie: "", passport: "", passport_expiry: "", language: "",
      nationality: "", birth_date: "", birth_city: "", birth_country_code: "", anagram: "",
      resident: false, authorization_ok: false, responsible_id: "", documents_path: "", observations: "",
      status: "active",
    },
    address: emptyAddress(),
    phones: [{ phone_type: "mobil", country_prefix: "+34", phone_number: "", notes: "" }],
    emails: [{ email_type: "particular", email: "" }],
    related: [],
    vehicles: [],
  };
}

const LIST_SELECT = `id, client_code, account_code, title, first_name, last_name, dni, nie, resident, status,
  client_phones(country_prefix, phone_number, is_primary),
  client_emails(email, is_primary),
  client_addresses(municipality, country, is_primary),
  property_owners(ownership_percentage, properties(id, admin_number, street_type, address, municipality, status, ${CONTRACT_SELECT}))`;

type Row = Record<string, any>;

function primary<T extends Row>(rows: T[] | null | undefined): T | undefined {
  return (rows || []).find(r => r.is_primary) || (rows || [])[0];
}

function propertyLinks(rows: Row[] | null | undefined): PropertyLink[] {
  return (rows || [])
    .filter(o => o.properties)
    .map(o => ({
      id: o.properties.id,
      admin_number: o.properties.admin_number,
      address: [o.properties.street_type, o.properties.address].filter(Boolean).join(" "),
      municipality: s(o.properties.municipality),
      status: s(o.properties.status),
      ownership_percentage: o.ownership_percentage,
      features: contractFeatures(o.properties.contract_types),
    }))
    // Actives primer, després per número d'administració
    .sort((a, b) => Number(a.status === "baixa") - Number(b.status === "baixa") || a.admin_number - b.admin_number);
}

export async function listClients(): Promise<ClientSummary[]> {
  const { data, error } = await supabase.from("clients").select(LIST_SELECT).order("client_code");
  if (error) throw error;
  return (data || []).map((c: Row) => {
    const ph = primary(c.client_phones), em = primary(c.client_emails), ad = primary(c.client_addresses);
    return {
      id: c.id, client_code: c.client_code, account_code: c.account_code, title: s(c.title),
      first_name: s(c.first_name), last_name: s(c.last_name), dni: s(c.dni), nie: s(c.nie),
      resident: !!c.resident, status: c.status,
      phone: ph ? [ph.country_prefix, ph.phone_number].filter(Boolean).join(" ") : "",
      email: s(em?.email), municipality: s(ad?.municipality), country: s(ad?.country),
      properties: propertyLinks(c.property_owners),
    };
  });
}

export async function getClient(id: string): Promise<{ full: ClientFull; properties: PropertyLink[]; accountCode: string }> {
  const { data: c, error } = await supabase.from("clients")
    .select(`*, client_addresses(*), client_phones(*), client_emails(*), client_related_persons!client_related_persons_client_id_fkey(*), client_vehicles(*),
             property_owners(ownership_percentage, properties(id, admin_number, street_type, address, municipality, status, ${CONTRACT_SELECT}))`)
    .eq("id", id).single();
  if (error) throw error;
  const ad = primary(c.client_addresses);
  const bySort = (a: Row, b: Row) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
  const full: ClientFull = {
    client: {
      id: c.id, client_code: s(c.client_code), title: s(c.title), sex: s(c.sex), initials: s(c.initials),
      first_name: s(c.first_name), last_name: s(c.last_name), short_name: s(c.short_name),
      client_type: s(c.client_type) || "particular", dni: s(c.dni), nie: s(c.nie), passport: s(c.passport),
      passport_expiry: s(c.passport_expiry), language: s(c.language), nationality: s(c.nationality),
      birth_date: s(c.birth_date), birth_city: s(c.birth_city), birth_country_code: s(c.birth_country_code),
      anagram: s(c.anagram), resident: !!c.resident, authorization_ok: !!c.authorization_ok,
      responsible_id: s(c.responsible_id), documents_path: s(c.documents_path), observations: s(c.observations),
      status: c.status,
    },
    address: ad ? {
      street_type: s(ad.street_type), street_name: s(ad.street_name), street_number: s(ad.street_number),
      extra: s(ad.extra), postal_code: s(ad.postal_code), municipality: s(ad.municipality),
      province: s(ad.province), country: s(ad.country), country_code: s(ad.country_code),
    } : emptyAddress(),
    phones: (c.client_phones || []).sort(bySort).map((p: Row) => ({
      phone_type: p.phone_type, country_prefix: s(p.country_prefix), phone_number: s(p.phone_number), notes: s(p.notes),
    })),
    emails: (c.client_emails || []).sort(bySort).map((e: Row) => ({ email_type: e.email_type, email: s(e.email) })),
    related: (c.client_related_persons || []).sort(bySort).map((r: Row) => ({
      id: r.id, relation: r.relation, title: s(r.title), first_name: s(r.first_name), last_name: s(r.last_name),
      birth_date: s(r.birth_date), birth_city: s(r.birth_city), birth_country_code: s(r.birth_country_code),
      passport: s(r.passport), passport_expiry: s(r.passport_expiry), nie: s(r.nie), dni: s(r.dni),
      labels: !!r.labels, anagram: s(r.anagram), ownership_percentage: s(r.ownership_percentage),
      street: s(r.street), postal_code: s(r.postal_code), municipality: s(r.municipality),
      province: s(r.province), country: s(r.country),
      phones: Array.isArray(r.phones) ? r.phones : [], emails: Array.isArray(r.emails) ? r.emails : [],
    })),
    vehicles: (c.client_vehicles || []).sort(bySort).map((v: Row) => ({
      vehicle: s(v.vehicle), brand: s(v.brand), model: s(v.model), plate: s(v.plate), itv_date: s(v.itv_date),
    })),
  };
  if (!full.phones.length) full.phones = emptyClient().phones;
  if (!full.emails.length) full.emails = emptyClient().emails;
  return { full, properties: propertyLinks(c.property_owners), accountCode: s(c.account_code) };
}

/** Desa tot el client en una sola transacció (funció SQL save_client). Retorna l'id. */
export async function saveClient(full: ClientFull): Promise<string> {
  const { data, error } = await supabase.rpc("save_client", { payload: full });
  if (error) throw error;
  return data as string;
}

export async function nextClientCode(): Promise<string> {
  const { data, error } = await supabase.rpc("next_client_code");
  if (error) throw error;
  return String(data ?? "");
}

export async function isClientCodeTaken(code: number, exceptId?: string): Promise<boolean> {
  let q = supabase.from("clients").select("id").eq("client_code", code);
  if (exceptId) q = q.neq("id", exceptId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).length > 0;
}

/** Baixa lògica: el client no s'esborra mai (cal per al model 210 de l'any següent). */
export async function setClientStatus(id: string, status: "active" | "inactive") {
  const { error } = await supabase.from("clients")
    .update({ status, deactivated_at: status === "inactive" ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", id);
  if (error) throw error;
}

export interface TaxRow {
  property_id: string; address: string; tax_year: number; cadastral_value: number; cadastral_ref: string;
  ibi_quota: number; taxable_base: number; rent_quota: number; paid: boolean; paid_date: string;
  ownership_percentage: number | null;
}

/** Impostos de totes les finques del client (darrer any de cada una primer). */
export async function clientTaxes(properties: PropertyLink[]): Promise<TaxRow[]> {
  if (!properties.length) return [];
  const { data, error } = await supabase.from("property_taxes")
    .select("property_id, tax_year, cadastral_value, cadastral_ref, ibi_quota, taxable_base, rent_quota, paid, paid_date")
    .in("property_id", properties.map(p => p.id))
    .order("tax_year", { ascending: false });
  if (error) throw error;
  return (data || []).map((t: Row) => {
    const p = properties.find(x => x.id === t.property_id);
    return { ...t, address: p?.address || "", ownership_percentage: p?.ownership_percentage ?? null, cadastral_ref: s(t.cadastral_ref), paid_date: s(t.paid_date) } as TaxRow;
  });
}

// ---------------- Avís de duplicats ----------------
export interface DuplicateHit { client_id: string; client_code: number; name: string; status: string; fields: string[] }

/** Altres clients amb el mateix DNI/NIE/passaport, telèfon o e-mail (un registre per client) */
export async function findDuplicates(full: ClientFull): Promise<DuplicateHit[]> {
  const c = full.client;
  const docs = [c.dni, c.nie, c.passport].map(v => v.trim()).filter(Boolean);
  const phones = full.phones.map(p => p.phone_number.trim()).filter(Boolean);
  const emails = full.emails.map(e => e.email.trim()).filter(Boolean);
  if (!docs.length && !phones.length && !emails.length) return [];
  const { data, error } = await supabase.rpc("find_client_duplicates", { p_client: c.id || null, p_docs: docs, p_phones: phones, p_emails: emails });
  if (error) throw error;
  const by = new Map<string, DuplicateHit>();
  for (const r of (data || []) as Row[]) {
    const h: DuplicateHit = by.get(r.client_id) || { client_id: r.client_id, client_code: r.client_code, name: s(r.name), status: s(r.status), fields: [] };
    h.fields.push(`${r.field} ${s(r.value)}`);
    by.set(r.client_id, h);
  }
  return [...by.values()];
}

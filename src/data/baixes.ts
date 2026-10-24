// Històric de baixes (PDF pàg. 8-9): llista de finques donades de baixa i la seva
// fitxa (contacte del client, dades de l'immoble, impostos, jardí i piscina).
// Els subministraments no es mostren («no cal guardar res dels subministres»).
import { supabase } from "../lib/supabase";
import { accountCode, fullName, s } from "../lib/format";
import { listTaxes, propertyGroups, type FieldGroup, type PropertyForm, type TaxForm } from "./finques";

type Row = Record<string, any>;

export interface BaixaRow {
  id: string; admin_number: number; address: string; zone: number | null; municipality: string;
  baixa_date: string; baixa_by: string;
  client_id: string | null; client_code: number | null; first_name: string; last_name: string;
}

export async function listBaixes(): Promise<BaixaRow[]> {
  const { data, error } = await supabase.from("properties")
    .select(`id, admin_number, street_type, address, zone, municipality, baixa_date, profiles:baixa_by(full_name),
             property_owners(is_main, client_id, clients(client_code, first_name, last_name))`)
    .eq("status", "baixa").order("baixa_date", { ascending: false });
  if (error) throw error;
  return (data || []).map((p: Row) => {
    const o = (p.property_owners || []).find((x: Row) => x.is_main && x.clients) || (p.property_owners || []).find((x: Row) => x.clients);
    return {
      id: p.id, admin_number: p.admin_number, address: [p.street_type, p.address].filter(Boolean).join(" "), zone: p.zone,
      municipality: s(p.municipality), baixa_date: s(p.baixa_date), baixa_by: s(p.profiles?.full_name),
      client_id: o?.client_id || null, client_code: o?.clients?.client_code ?? null,
      first_name: s(o?.clients?.first_name), last_name: s(o?.clients?.last_name),
    };
  });
}

/** Grups de camps de la fitxa de finca que es mostren a l'històric (sense subministraments ni claus d'internet/alarma) */
export function baixaGroups(zones: [string, string][], contractTypes: [string, string][]): FieldGroup[] {
  return propertyGroups(zones, contractTypes, []).filter(g => g.id !== "subministraments" && g.id !== "serveis");
}

export interface BaixaFitxa {
  form: PropertyForm;
  baixa_by: string;
  client: null | {
    id: string; code: number; account: string; name: string; language: string; nationality: string;
    phones: string[]; emails: string[]; address: string;
  };
  coowners: string[];
  taxes: TaxForm[];
}

export async function getBaixaFitxa(id: string): Promise<BaixaFitxa> {
  const { data, error } = await supabase.from("properties")
    .select(`*, profiles:baixa_by(full_name),
             property_owners(is_main, ownership_percentage, client_id, related_person_id,
               clients(id, client_code, first_name, last_name, language, nationality,
                 client_phones(country_prefix, phone_number, phone_type, sort_order),
                 client_emails(email, sort_order),
                 client_addresses(street_type, street_name, street_number, extra, postal_code, municipality, province, country, is_primary)),
               client_related_persons(first_name, last_name))`)
    .eq("id", id).single();
  if (error) throw error;
  const form: PropertyForm = { id: data.id, status: data.status, baixa_date: s(data.baixa_date) };
  for (const g of propertyGroups([], [], [])) for (const f of g.fields) form[f.k] = s(data[f.k]);
  const owners = ((data.property_owners || []) as Row[]).sort((a, b) => Number(b.is_main) - Number(a.is_main));
  const main = owners.find(o => o.clients);
  const c = main?.clients;
  const addr = (c?.client_addresses || []).find((a: Row) => a.is_primary) || c?.client_addresses?.[0];
  return {
    form, baixa_by: s(data.profiles?.full_name),
    client: c ? {
      id: c.id, code: c.client_code, account: accountCode(c.client_code), name: fullName(c.first_name, c.last_name),
      language: s(c.language), nationality: s(c.nationality),
      phones: ((c.client_phones || []) as Row[]).sort((a, b) => a.sort_order - b.sort_order).map(p => `${p.country_prefix} ${p.phone_number}`.trim()),
      emails: ((c.client_emails || []) as Row[]).sort((a, b) => a.sort_order - b.sort_order).map(e => s(e.email)),
      address: addr ? [[addr.street_type, addr.street_name, addr.street_number].filter(Boolean).join(" "), addr.extra,
        [addr.postal_code, addr.municipality].filter(Boolean).join(" "), addr.province, addr.country].filter(Boolean).join(", ") : "",
    } : null,
    coowners: owners.filter(o => o !== main).map(o => {
      const n = o.clients ? fullName(o.clients.first_name, o.clients.last_name) : o.client_related_persons ? fullName(o.client_related_persons.first_name, o.client_related_persons.last_name) : "";
      return n + (o.ownership_percentage != null ? ` (${Number(o.ownership_percentage)} %)` : "");
    }).filter(Boolean),
    taxes: await listTaxes(id),
  };
}

/** Recupera una finca de baixa. Si es tria un altre client, passa a ser-ne l'únic titular. Retorna el núm. d'administració assignat. */
export async function recoverProperty(propertyId: string, clientId: string | null): Promise<number> {
  const { data, error } = await supabase.rpc("recover_property", { p_property: propertyId, p_client: clientId });
  if (error) throw error;
  return Number(data);
}

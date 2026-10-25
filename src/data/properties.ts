import { supabase } from "../lib/supabase";
import { fullName, s } from "../lib/format";

export interface PropertyRow {
  id: string;
  admin_number: number;
  address: string;
  zone: number | null;
  municipality: string;
  postal_code: string;
  province: string;
  country: string;
  rental_use: string;
  status: string;
  baixa_date: string;
  owners: { client_id: string | null; name: string; percentage: number | null }[];
}

type Row = Record<string, any>;

export async function listProperties(): Promise<PropertyRow[]> {
  const { data, error } = await supabase.from("admi_properties")
    .select(`id, admin_number, street_type, address, zone, municipality, postal_code, province, country, rental_use, status, baixa_date,
             property_owners:admi_property_owners(ownership_percentage, client_id, clients:admi_clients(first_name, last_name), client_related_persons:admi_client_related_persons(first_name, last_name))`)
    .order("admin_number");
  if (error) throw error;
  return (data || []).map((p: Row) => ({
    id: p.id, admin_number: p.admin_number,
    address: [p.street_type, p.address].filter(Boolean).join(" "),
    zone: p.zone, municipality: s(p.municipality), postal_code: s(p.postal_code), province: s(p.province),
    country: s(p.country), rental_use: s(p.rental_use), status: s(p.status), baixa_date: s(p.baixa_date),
    owners: (p.property_owners || []).map((o: Row) => ({
      client_id: o.client_id,
      name: o.clients ? fullName(o.clients.first_name, o.clients.last_name)
        : o.client_related_persons ? fullName(o.client_related_persons.first_name, o.client_related_persons.last_name) : "",
      percentage: o.ownership_percentage,
    })),
  }));
}

/** Xifres reals per a la pantalla d'Inici */
export async function dashboardCounts() {
  const count = async (table: string, build: (q: any) => any) => {
    const { count: n, error } = await build(supabase.from(table).select("id", { count: "exact", head: true }));
    if (error) throw error;
    return n || 0;
  };
  const [clients, properties, alerts, overdue, keys, incidents] = await Promise.all([
    count("admi_clients", q => q.eq("status", "active")),
    count("admi_properties", q => q.eq("status", "active")),
    count("admi_alerts", q => q.is("completed_at", null)),
    count("admi_alerts", q => q.is("completed_at", null).lt("due_date", new Date().toISOString().slice(0, 10))),
    count("admi_key_movements", q => q.is("returned_at", null)),
    count("admi_incidents", q => q.neq("status", "tancada")),
  ]);
  return { clients, properties, alerts, overdue, keys, incidents };
}

export async function recentProperties(limit = 5) {
  const { data, error } = await supabase.from("admi_properties")
    .select("id, admin_number, street_type, address, municipality")
    .eq("status", "active").order("updated_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []).map((p: Row) => ({
    id: p.id as string, admin_number: p.admin_number as number,
    address: [p.street_type, p.address].filter(Boolean).join(" "), municipality: s(p.municipality),
  }));
}

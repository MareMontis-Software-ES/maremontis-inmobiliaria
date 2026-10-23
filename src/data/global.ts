// Consultes per a les pantalles globals (Alertes, Claus) i selectors de client/finca.
import { supabase } from "../lib/supabase";
import { fullName, s, todayISO } from "../lib/format";

type Row = Record<string, any>;

export interface AlertRow {
  id: string; client_id: string | null; property_id: string | null; alert_type: string; title: string; content: string;
  start_date: string; due_date: string; completed_at: string; overdue: boolean; checklist: { text: string; done: boolean }[];
  client_name: string; finca: string;
}

export async function listAllAlerts(): Promise<AlertRow[]> {
  const { data, error } = await supabase.from("alerts_visible")
    .select("*, clients(first_name, last_name), properties(street_type, address)")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data || []).map((a: Row) => ({
    id: a.id, client_id: a.client_id, property_id: a.property_id, alert_type: a.alert_type, title: s(a.title), content: s(a.content),
    start_date: s(a.start_date), due_date: s(a.due_date), completed_at: s(a.completed_at), overdue: !!a.overdue,
    checklist: Array.isArray(a.checklist) ? a.checklist : [],
    client_name: a.clients ? fullName(a.clients.first_name, a.clients.last_name) : "",
    finca: a.properties ? [a.properties.street_type, a.properties.address].filter(Boolean).join(" ") : "",
  }));
}

/** Fitxer de calendari (.ics) d'una o diverses alertes, per importar a Outlook/Google */
export function alertsToIcs(rows: AlertRow[]): string {
  const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ev = rows.filter(r => r.due_date).map(r => {
    const d = r.due_date.replace(/-/g, "");
    return ["BEGIN:VEVENT", `UID:${r.id}@maremontis`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${esc(r.title)}`,
      `DESCRIPTION:${esc([r.client_name, r.finca, r.content].filter(Boolean).join("\n"))}`, "END:VEVENT"].join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MareMontis//Alertes//CA", ...ev, "END:VCALENDAR"].join("\r\n");
}

export function downloadText(name: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type: type + ";charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** CSV amb punt i coma (s'obre bé amb l'Excel en català/castellà) */
export function toCsv(head: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: unknown) => { const t = v == null ? "" : String(v); return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  return "\ufeff" + [head, ...rows].map(r => r.map(cell).join(";")).join("\r\n");
}

// ---------------- Claus (totes les finques) ----------------
export interface KeyRow {
  id: string; property_id: string; finca: string; admin_number: number; client_id: string | null; client_name: string;
  delivered_at: string; delivered_to: string; delivered_by: string; reason: string; observations: string;
  expected_return: string; returned_at: string; overdue: boolean;
}

export async function listAllKeys(): Promise<KeyRow[]> {
  const { data, error } = await supabase.from("key_movements")
    .select(`*, industrials(name), profiles:delivered_by(full_name),
             properties(admin_number, street_type, address, property_owners(client_id, is_main, clients(first_name, last_name)))`)
    .order("delivered_at", { ascending: false }).limit(500);
  if (error) throw error;
  const today = todayISO();
  return (data || []).map((k: Row) => {
    const owners = (k.properties?.property_owners || []).filter((o: Row) => o.client_id);
    const main = owners.find((o: Row) => o.is_main) || owners[0];
    return {
      id: k.id, property_id: k.property_id, admin_number: k.properties?.admin_number,
      finca: k.properties ? [k.properties.street_type, k.properties.address].filter(Boolean).join(" ") : "",
      client_id: main?.client_id || null, client_name: main?.clients ? fullName(main.clients.first_name, main.clients.last_name) : "",
      delivered_at: s(k.delivered_at), delivered_to: s(k.industrials?.name || k.delivered_to), delivered_by: s(k.profiles?.full_name),
      reason: s(k.reason), observations: s(k.observations), expected_return: s(k.expected_return), returned_at: s(k.returned_at),
      overdue: !k.returned_at && k.expected_return < today,
    };
  });
}

// ---------------- Selectors ----------------
export interface PropertyPick { id: string; label: string; admin_number: number; client_id: string | null; client_name: string; key_office: string }
export async function propertyPickList(): Promise<PropertyPick[]> {
  const { data, error } = await supabase.from("properties")
    .select("id, admin_number, street_type, address, municipality, key_office, property_owners(client_id, is_main, clients(first_name, last_name))")
    .eq("status", "active").order("admin_number");
  if (error) throw error;
  return (data || []).map((p: Row) => {
    const owners = (p.property_owners || []).filter((o: Row) => o.client_id);
    const main = owners.find((o: Row) => o.is_main) || owners[0];
    const client_name = main?.clients ? fullName(main.clients.first_name, main.clients.last_name) : "";
    return { id: p.id, admin_number: p.admin_number, client_id: main?.client_id || null, client_name, key_office: s(p.key_office),
      label: `${p.admin_number} · ${[p.street_type, p.address].filter(Boolean).join(" ")}${p.municipality ? ` (${p.municipality})` : ""}${client_name ? " — " + client_name : ""}` };
  });
}

export async function profilePick(): Promise<{ id: string; name: string; email: string }[]> {
  const { data, error } = await supabase.from("profiles").select("id, full_name, email").eq("active", true).order("full_name");
  if (error) throw error;
  return (data || []).map((p: Row) => ({ id: p.id, name: s(p.full_name) || s(p.email), email: s(p.email) }));
}

// Incidències i notes de servei (PDF pàg. 6 + PDF 2 «Notes» i «Incidències»).
import { supabase } from "../lib/supabase";
import { fullName, s, todayISO } from "../lib/format";

type Row = Record<string, any>;

export const CHANNELS: [string, string][] = [["email", "E-mail"], ["telefon", "Telèfon"], ["whatsapp", "WhatsApp"], ["presencial", "Presencial"], ["revisio", "Revisió de la casa"], ["altres", "Altres"]];
export const STATUSES: [string, string][] = [["oberta", "Oberta"], ["en_curs", "En curs"], ["tancada", "Tancada"]];
export const NOTE_STATUSES: [string, string][] = [["pendent", "Pendent d'enviar"], ["enviada", "Enviada"], ["completada", "Feina feta"], ["anul·lada", "Anul·lada"]];

export interface Incident {
  id?: string; incident_date: string; reported_by: string; channel: string; client_id: string; property_id: string;
  industrial_id: string; description: string; requires_management: boolean; status: string; revision_id?: string | null;
  // només lectura
  client_name?: string; finca?: string; reporter?: string; notes_count?: number; open_notes?: number;
}

export interface ServiceNote {
  id?: string; note_number?: number; incident_id: string; property_id: string; client_id: string;
  origin: string; department: string; trade: string; industrial_id: string; industrial_alt_id: string;
  key_location: string; other_locations: string; contact_mobile: string; description: string; notice_text: string;
  limit_from: string; limit_to: string; status: string; sent_at: string; sent_to: string; completed_at: string;
  created_by?: string; updated_by?: string; created_at?: string; updated_at?: string; industrial_name?: string; industrial_email?: string;
}

export const emptyIncident = (userId: string, clientId = "", propertyId = ""): Incident => ({
  incident_date: todayISO(), reported_by: userId, channel: "email", client_id: clientId, property_id: propertyId,
  industrial_id: "", description: "", requires_management: true, status: "oberta",
});

export async function listIncidents(f: { clientId?: string; propertyId?: string } = {}): Promise<Incident[]> {
  let q = supabase.from("admi_incidents")
    .select("*, clients:admi_clients(first_name, last_name), properties:admi_properties(admin_number, street_type, address), profiles:reported_by(full_name), service_notes:admi_service_notes(status)")
    .order("incident_date", { ascending: false }).order("created_at", { ascending: false }).limit(1000);
  if (f.clientId) q = q.eq("client_id", f.clientId);
  if (f.propertyId) q = q.eq("property_id", f.propertyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((i: Row) => ({
    id: i.id, incident_date: s(i.incident_date), reported_by: s(i.reported_by), channel: s(i.channel), client_id: s(i.client_id),
    property_id: s(i.property_id), industrial_id: s(i.industrial_id), description: s(i.description),
    requires_management: !!i.requires_management, status: s(i.status), revision_id: i.revision_id,
    client_name: i.clients ? fullName(i.clients.first_name, i.clients.last_name) : "",
    finca: i.properties ? `${i.properties.admin_number} · ${[i.properties.street_type, i.properties.address].filter(Boolean).join(" ")}` : "",
    reporter: s(i.profiles?.full_name),
    notes_count: (i.service_notes || []).length,
    open_notes: (i.service_notes || []).filter((n: Row) => n.status === "pendent" || n.status === "enviada").length,
  }));
}

export async function saveIncident(i: Incident): Promise<string> {
  const row = {
    incident_date: i.incident_date || todayISO(), reported_by: i.reported_by || null, channel: i.channel || null,
    client_id: i.client_id || null, property_id: i.property_id || null, industrial_id: i.industrial_id || null,
    description: i.description, requires_management: i.requires_management, status: i.status,
    closed_at: i.status === "tancada" ? new Date().toISOString() : null, revision_id: i.revision_id || null,
  };
  if (i.id) {
    const { error } = await supabase.from("admi_incidents").update(row).eq("id", i.id);
    if (error) throw error;
    return i.id;
  }
  const { data, error } = await supabase.from("admi_incidents").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function deleteIncident(id: string) {
  const { error } = await supabase.from("admi_incidents").delete().eq("id", id);
  if (error) throw error;
}

export async function listNotes(incidentId: string): Promise<ServiceNote[]> {
  const { data, error } = await supabase.from("admi_service_notes")
    .select("*, ind:admi_tradespeople!service_notes_industrial_id_fkey(name, email)")
    .eq("incident_id", incidentId).order("note_number");
  if (error) throw error;
  return (data || []).map(toNote);
}

function toNote(n: Row): ServiceNote {
  const dt = (v: string | null) => (v ? v.slice(0, 16) : "");
  return {
    id: n.id, note_number: n.note_number, incident_id: s(n.incident_id), property_id: s(n.property_id), client_id: s(n.client_id),
    origin: s(n.origin), department: s(n.department), trade: s(n.trade), industrial_id: s(n.industrial_id), industrial_alt_id: s(n.industrial_alt_id),
    key_location: s(n.key_location), other_locations: s(n.other_locations), contact_mobile: s(n.contact_mobile),
    description: s(n.description), notice_text: s(n.notice_text), limit_from: dt(n.limit_from), limit_to: dt(n.limit_to),
    status: s(n.status), sent_at: s(n.sent_at), sent_to: s(n.sent_to), completed_at: s(n.completed_at),
    industrial_name: s(n.ind?.name), industrial_email: s(n.ind?.email), created_by: s(n.created_by), updated_by: s(n.updated_by), created_at: s(n.created_at), updated_at: s(n.updated_at),
  };
}

export function emptyNote(inc: Incident, keyLocation: string): ServiceNote {
  return {
    incident_id: inc.id || "", property_id: inc.property_id, client_id: inc.client_id, origin: "Administració", department: "",
    trade: "", industrial_id: inc.industrial_id, industrial_alt_id: "", key_location: keyLocation, other_locations: "",
    contact_mobile: "", description: inc.description, notice_text: "", limit_from: "", limit_to: "",
    status: "pendent", sent_at: "", sent_to: "", completed_at: "",
  };
}

export async function saveNote(n: ServiceNote): Promise<string> {
  const row = {
    incident_id: n.incident_id || null, property_id: n.property_id || null, client_id: n.client_id || null,
    origin: n.origin || null, department: n.department || null, trade: n.trade || null,
    industrial_id: n.industrial_id || null, industrial_alt_id: n.industrial_alt_id || null,
    key_location: n.key_location || null, other_locations: n.other_locations || null, contact_mobile: n.contact_mobile || null,
    description: n.description, notice_text: n.notice_text || null,
    limit_from: n.limit_from || null, limit_to: n.limit_to || null, status: n.status,
  };
  if (n.id) {
    const { error } = await supabase.from("admi_service_notes").update(row).eq("id", n.id);
    if (error) throw error;
    return n.id;
  }
  const { data, error } = await supabase.from("admi_service_notes").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function setNoteStatus(id: string, status: string, userId?: string, sentTo?: string) {
  const patch: Row = { status };
  if (status === "enviada") Object.assign(patch, { sent_at: new Date().toISOString(), sent_to: sentTo || null, sent_by: userId || null });
  if (status === "completada") Object.assign(patch, { completed_at: new Date().toISOString(), completed_by: userId || null });
  if (status === "pendent") Object.assign(patch, { sent_at: null, sent_to: null, completed_at: null });
  const { error } = await supabase.from("admi_service_notes").update(patch).eq("id", id);
  if (error) throw error;
}

/** Text de la nota per al correu a l'industrial */
export function noteText(n: ServiceNote, ctx: { finca: string; client: string }) {
  const lim = [n.limit_from && n.limit_from.replace("T", " "), n.limit_to && n.limit_to.replace("T", " ")].filter(Boolean).join(" → ");
  return [
    `NOTA DE SERVEI Nº ${n.note_number ?? ""}`,
    "",
    `Immoble: ${ctx.finca}`,
    `Propietari: ${ctx.client}`,
    n.key_location && `Claus: ${n.key_location}${n.other_locations ? " · " + n.other_locations : ""}`,
    n.contact_mobile && `Mòbil de contacte: ${n.contact_mobile}`,
    lim && `Termini: ${lim}`,
    "",
    "Feina a fer:",
    n.description,
    n.notice_text && "\n" + n.notice_text,
    "",
    "Si us plau, confirmeu la recepció i aviseu quan la feina estigui feta.",
    "MareMontis · Administració",
  ].filter(x => typeof x === "string" && x !== "").join("\n");
}

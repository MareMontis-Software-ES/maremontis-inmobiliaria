import { supabase } from "../lib/supabase";
import { fullName } from "../lib/format";
import type { Alert } from "../types";

type Row = Record<string, any>;

function toAlert(a: Row): Alert {
  return {
    ...a,
    checklist: Array.isArray(a.checklist) ? a.checklist : [],
    client_name: a.clients ? fullName(a.clients.first_name, a.clients.last_name) : undefined,
  } as Alert;
}

/** Alertes visibles (pendents + completades dels últims 6 mesos). */
export async function listAlerts(opts: { clientId?: string; onlyPending?: boolean; limit?: number } = {}): Promise<Alert[]> {
  let q = supabase.from("alerts_visible")
    .select("*, clients(first_name, last_name)")
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("due_date", { ascending: true, nullsFirst: false });
  if (opts.clientId) q = q.eq("client_id", opts.clientId);
  if (opts.onlyPending) q = q.is("completed_at", null);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(toAlert);
}

export async function createAlert(input: { client_id?: string; property_id?: string; title: string; content?: string; due_date?: string; checklist?: { text: string; done: boolean }[] }) {
  const { error } = await supabase.from("alerts").insert({
    client_id: input.client_id || null,
    property_id: input.property_id || null,
    title: input.title,
    content: input.content || null,
    due_date: input.due_date || null,
    checklist: input.checklist || [],
  });
  if (error) throw error;
}

export async function updateAlert(id: string, patch: Partial<Pick<Alert, "title" | "content" | "due_date" | "checklist">>) {
  const { error } = await supabase.from("alerts").update(patch).eq("id", id);
  if (error) throw error;
}

export async function completeAlert(id: string, userId: string | undefined, done = true) {
  const { error } = await supabase.from("alerts")
    .update({ completed_at: done ? new Date().toISOString() : null, completed_by: done ? userId || null : null })
    .eq("id", id);
  if (error) throw error;
}

/** Crea les alertes automàtiques de caducitat de documents i aniversaris. */
export async function generateAutomaticAlerts(): Promise<number> {
  const { data, error } = await supabase.rpc("generate_document_alerts", { days_ahead: 60 });
  if (error) throw error;
  return Number(data || 0);
}

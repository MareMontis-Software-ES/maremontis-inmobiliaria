// Buscador general de la barra superior (funció global_search de la BD, que respecta RLS).
import { supabase } from "../lib/supabase";
import { s } from "../lib/format";

export type HitKind = "client" | "finca" | "matricula" | "conjuge" | "copropietari";
export interface SearchHit { kind: HitKind; id: string; client_id: string | null; property_id: string | null; title: string; subtitle: string; inactive: boolean }

export async function globalSearch(q: string, maxPerKind = 6): Promise<SearchHit[]> {
  const { data, error } = await supabase.rpc("global_search", { q, max_rows: maxPerKind });
  if (error) throw error;
  return ((data || []) as Record<string, any>[]).map(r => ({
    kind: r.kind, id: r.id, client_id: r.client_id, property_id: r.property_id,
    title: s(r.title), subtitle: s(r.subtitle), inactive: !!r.inactive,
  }));
}

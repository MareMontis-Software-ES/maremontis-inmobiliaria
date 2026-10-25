import { supabase } from "../lib/supabase";
import type { Profile } from "../types";

export async function currentProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("admi_users")
    .select("id, full_name, email, role, is_responsible").eq("id", userId).maybeSingle();
  if (error) throw error;
  return (data as Profile) || null;
}

/** Usuaris marcats com a responsables (desplegable «Responsable assignat») */
export async function listResponsibles(): Promise<Profile[]> {
  const { data, error } = await supabase.from("admi_users")
    .select("id, full_name, email, role, is_responsible")
    .eq("is_responsible", true).eq("active", true).order("full_name");
  if (error) throw error;
  return (data || []) as Profile[];
}

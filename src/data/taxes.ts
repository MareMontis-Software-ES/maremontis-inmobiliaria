// Impostos de totes les finques per exercici, llistat del Model 210 i importació d'IBI.
import { supabase } from "../lib/supabase";
import { fullName, s } from "../lib/format";
import { CONTRACT_SELECT, contractFeatures } from "./admin";

type Row = Record<string, any>;

export interface TaxLine {
  property_id: string; admin_number: number; finca: string; zone: number | null; status: string; baixa_date: string;
  tax_id: string | null; cadastral_ref: string; cadastral_value: number; revaluation_pct: number; ibi_quota: number;
  tax_rate: number; taxable_base: number; rent_quota: number; paid: boolean; paid_date: string;
  owners: { name: string; last_name: string; nif: string; pct: number; is_client: boolean; resident: boolean }[];
}

export async function listTaxYear(year: number): Promise<TaxLine[]> {
  const { data, error } = await supabase.from("admi_properties")
    .select(`id, admin_number, street_type, address, zone, status, baixa_date, ${CONTRACT_SELECT},
             property_taxes:admi_property_taxes(id, tax_year, cadastral_ref, cadastral_value, revaluation_pct, ibi_quota, tax_rate, taxable_base, rent_quota, paid, paid_date),
             property_owners:admi_property_owners(ownership_percentage, is_main, clients:admi_clients(first_name, last_name, dni, nie, resident), client_related_persons:admi_client_related_persons(first_name, last_name, dni, nie))`)
    .order("admin_number");
  if (error) throw error;
  return (data || [])
    // Les finques donades de baixa l'any següent encara declaren (PDF: «l'any següent a la baixa encara cal presentar el 210»)
    .filter((p: Row) => p.status === "active" || (p.baixa_date && Number(String(p.baixa_date).slice(0, 4)) >= year))
    // Només les finques amb un contracte que inclou la renda / Model 210
    .filter((p: Row) => contractFeatures(p.contract_types).rent_210)
    .map((p: Row) => {
      const t = (p.property_taxes || []).find((x: Row) => x.tax_year === year);
      return {
        property_id: p.id, admin_number: p.admin_number, finca: [p.street_type, p.address].filter(Boolean).join(" "), zone: p.zone,
        status: p.status, baixa_date: s(p.baixa_date), tax_id: t?.id || null, cadastral_ref: s(t?.cadastral_ref),
        cadastral_value: Number(t?.cadastral_value || 0), revaluation_pct: Number(t?.revaluation_pct || 0), ibi_quota: Number(t?.ibi_quota || 0),
        tax_rate: Number(t?.tax_rate || 0), taxable_base: Number(t?.taxable_base || 0), rent_quota: Number(t?.rent_quota || 0),
        paid: !!t?.paid, paid_date: s(t?.paid_date),
        owners: (p.property_owners || []).sort((a: Row, b: Row) => Number(b.is_main) - Number(a.is_main)).map((o: Row) => {
          const x = o.clients || o.client_related_persons || {};
          return { name: fullName(x.first_name, x.last_name), last_name: s(x.last_name), nif: s(x.dni || x.nie), pct: Number(o.ownership_percentage || 0), is_client: !!o.clients, resident: !!o.clients?.resident };
        }),
      };
    });
}

export async function setPaid(taxId: string, paid: boolean, date: string | null) {
  const { error } = await supabase.from("admi_property_taxes").update({ paid, paid_date: paid ? date : null }).eq("id", taxId);
  if (error) throw error;
}

/**
 * Model 210 (PDF pàg. 15). El programa actual calcula:
 *   Total de propietaris = núm. propietaris + núm. copropietaris
 *   Quota a pagar = (Quota renda / Total propietaris) * Tipus gravamen / 100
 * Es mostra tal com el PDF; també la part proporcional al % de propietat.
 * ⚠ Cal validar-ho amb l'assessoria abans de presentar res.
 */
export function model210(t: TaxLine) {
  const total = Math.max(1, t.owners.length);
  return t.owners.map(o => ({
    ...o,
    total,
    quota_pdf: Math.round((t.rent_quota / total) * t.tax_rate / 100 * 100) / 100,
    quota_pct: Math.round(t.rent_quota * o.pct) / 100,
  }));
}

/**
 * Importació d'IBI des d'un CSV (separador «;» o «,»). Columnes reconegudes (capçalera):
 *   referencia | ref_cadastral ; valor_cadastral ; quota | quota_ibi ; [any]
 * Actualitza les dades de l'exercici indicat per a les finques amb aquesta referència cadastral
 * (de l'any anterior o del mateix any). Retorna un resum.
 */
export async function importIbi(csv: string, year: number): Promise<{ updated: number; created: number; notFound: string[] }> {
  const lines = csv.replace(/^﻿/, "").split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error("El fitxer no té dades.");
  const sep = lines[0].includes(";") ? ";" : ",";
  const head = lines[0].split(sep).map(h => h.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_"));
  const col = (...names: string[]) => head.findIndex(h => names.some(n => h.includes(n)));
  const iRef = col("ref"), iVal = col("valor"), iQuota = col("quota", "cuota"), iYear = col("any", "ano", "year");
  if (iRef < 0 || iVal < 0) throw new Error("Cal una columna de referència cadastral i una de valor cadastral.");
  const num = (v: string) => Number((v || "0").replace(/\./g, "").replace(",", ".")) || 0;
  const numSmart = (v: string) => (/,\d{1,2}$/.test(v) ? num(v) : Number(v) || 0);

  const { data: known, error } = await supabase.from("admi_property_taxes").select("property_id, cadastral_ref, tax_year, revaluation_pct, tax_rate, holder_name").not("cadastral_ref", "is", null);
  if (error) throw error;
  const byRef = new Map<string, Row>();
  for (const k of (known || []) as Row[]) { const r = String(k.cadastral_ref).trim().toUpperCase(); if (!byRef.has(r) || k.tax_year > byRef.get(r)!.tax_year) byRef.set(r, k); }

  let updated = 0, created = 0; const notFound: string[] = [];
  for (const line of lines.slice(1)) {
    const c = line.split(sep).map(x => x.trim().replace(/^"|"$/g, ""));
    const ref = (c[iRef] || "").toUpperCase(); if (!ref) continue;
    const y = iYear >= 0 && c[iYear] ? Number(c[iYear]) : year;
    const k = byRef.get(ref);
    if (!k) { notFound.push(ref); continue; }
    const row = { property_id: k.property_id, tax_year: y, cadastral_ref: ref, cadastral_value: numSmart(c[iVal]), ibi_quota: iQuota >= 0 ? numSmart(c[iQuota]) : 0,
      revaluation_pct: k.revaluation_pct ?? 2, tax_rate: k.tax_rate ?? 19, holder_name: k.holder_name };
    const { data: ex } = await supabase.from("admi_property_taxes").select("id").eq("property_id", k.property_id).eq("tax_year", y).maybeSingle();
    const res = ex ? await supabase.from("admi_property_taxes").update({ cadastral_value: row.cadastral_value, ibi_quota: row.ibi_quota, cadastral_ref: ref }).eq("id", ex.id)
                   : await supabase.from("admi_property_taxes").insert(row);
    if (res.error) throw res.error;
    ex ? updated++ : created++;
  }
  return { updated, created, notFound };
}

// Còpia de seguretat en Excel: llegeix totes les taules (només lectura) i en fa un full per taula.
import { supabase, errorText } from "../lib/supabase";
import { todayISO } from "../lib/format";
import type { Cell, Sheet } from "../lib/xlsx";

type Row = Record<string, any>;

/** Taules incloses, en l'ordre dels fulls. [taula, nom del full, clau primària] */
export const BACKUP_TABLES: [string, string, string][] = [
  ["admi_clients", "Clients", "id"],
  ["admi_client_addresses", "Adreces clients", "id"],
  ["admi_client_phones", "Telèfons clients", "id"],
  ["admi_client_emails", "E-mails clients", "id"],
  ["admi_client_related_persons", "Persones relacionades", "id"],
  ["admi_client_vehicles", "Vehicles clients", "id"],
  ["admi_properties", "Finques", "id"],
  ["admi_property_owners", "Titulars finques", "id"],
  ["admi_property_equipment", "Equipament finques", "id"],
  ["admi_property_taxes", "Impostos", "id"],
  ["admi_key_movements", "Claus", "id"],
  ["admi_alerts", "Alertes", "id"],
  ["admi_incidents", "Incidències", "id"],
  ["admi_service_notes", "Notes de servei", "id"],
  ["admi_property_revisions", "Revisions", "id"],
  ["admi_property_photos", "Fotos (referències)", "id"],
  ["admi_contract_types", "Tipus de contracte", "id"],
  ["admi_tradespeople", "Industrials", "id"],
  ["admi_zones", "Zones", "code"],
  ["admi_email_templates", "Textos de correu", "id"],
  ["admi_users", "Usuaris", "id"],
];

const PAGE = 1000;

async function readAll(table: string, pk: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select("*").order(pk).range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < PAGE) return out;
  }
}

const toCell = (v: unknown): Cell =>
  v == null ? null : typeof v === "object" ? JSON.stringify(v) : (v as Cell);

/** Llegeix totes les taules i prepara els fulls. `onProgress` rep el nom del full que s'està llegint. */
export async function buildBackupSheets(onProgress?: (label: string, done: number, total: number) => void): Promise<{ sheets: Sheet[]; failed: string[] }> {
  const sheets: Sheet[] = [];
  const summary: Cell[][] = [];
  const failed: string[] = [];
  for (const [i, [table, label, pk]] of BACKUP_TABLES.entries()) {
    onProgress?.(label, i, BACKUP_TABLES.length);
    try {
      const rows = await readAll(table, pk);
      const keys = new Set<string>();
      rows.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
      const head = Array.from(keys);
      sheets.push({ name: label, head, rows: rows.map(r => head.map(k => toCell(r[k]))) });
      summary.push([label, table, rows.length, ""]);
    } catch (e) {
      failed.push(label);
      summary.push([label, table, null, "No s'ha pogut llegir: " + errorText(e)]);
    }
  }
  onProgress?.("", BACKUP_TABLES.length, BACKUP_TABLES.length);
  const { data: { user } } = await supabase.auth.getUser();
  const resum: Sheet = {
    name: "Resum",
    head: ["Full", "Taula", "Files", "Observacions"],
    rows: [
      ["Còpia de seguretat MareMontis", null, null, `Feta el ${new Date().toLocaleString("ca-ES")}${user?.email ? " per " + user.email : ""}`],
      ["Les fotos no s'hi inclouen (només les referències); són al Supabase, bucket «fotos».", null, null, null],
      [null, null, null, null],
      ...summary,
    ],
  };
  return { sheets: [resum, ...sheets], failed };
}

export const backupFileName = () => `copia_maremontis_${todayISO()}.xlsx`;

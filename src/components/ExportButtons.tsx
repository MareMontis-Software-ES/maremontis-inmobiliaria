// Botons «Excel» i «PDF» per a qualsevol llistat: reben la mateixa taula (capçalera + files)
// i la descarreguen en el format triat. Les files es calculen només en prémer el botó.
import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { downloadXlsx, type Cell } from "../lib/xlsx";
import { downloadTablePdf, type PdfTable } from "../lib/pdf";

export interface ExportTable {
  /** Nom del fitxer sense extensió */
  fileName: string;
  title: string;
  subtitle?: string;
  head: string[];
  rows: Cell[][];
  bars?: PdfTable["bars"];
  foot?: Cell[];
}

export function ExportButtons({ table, disabled }: { table: () => ExportTable; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pdf() {
    setBusy(true); setError("");
    try { const t = table(); await downloadTablePdf(t.fileName + ".pdf", t); }
    catch (e) { setError("No s'ha pogut generar el PDF: " + (e instanceof Error ? e.message : String(e))); }
    finally { setBusy(false); }
  }
  function excel() {
    const t = table();
    // La columna del gràfic només té sentit al PDF
    const keep = (r: Cell[]) => (t.bars ? r.filter((_, i) => i !== t.bars!.col) : r);
    const rows = (t.foot ? [...t.rows, t.foot] : t.rows).map(keep);
    downloadXlsx(t.fileName + ".xlsx", [{ name: t.title, head: keep(t.head) as string[], rows }]);
  }
  return (
    <>
      <button className="cancel-btn" disabled={disabled} onClick={excel} title="Descarregar en Excel"><Download size={16} /> Excel</button>
      <button className="cancel-btn" disabled={disabled || busy} onClick={pdf} title="Descarregar en PDF"><FileText size={16} /> {busy ? "Generant…" : "PDF"}</button>
      {error && <span className="export-error">{error}</span>}
    </>
  );
}

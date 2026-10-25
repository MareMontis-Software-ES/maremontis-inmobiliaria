// Llistats en PDF (per imprimir o enviar): capçalera verda de MareMontis, taula amb
// la capçalera repetida a cada pàgina i peu amb la data i el número de pàgina.
// Si hi ha moltes columnes, el full es posa horitzontal i la lletra es fa més petita.
// jsPDF es carrega només quan es fa servir.
import { fmtDate, todayISO } from "./format";

export type PdfCell = string | number | boolean | null | undefined;

export interface PdfTable {
  title: string;
  /** Línia sota el títol: filtres aplicats, any, etc. */
  subtitle?: string;
  head: string[];
  rows: PdfCell[][];
  /** Columna on es dibuixa una barra proporcional (estadístiques) amb els valors donats. */
  bars?: { col: number; values: number[] };
  /** Fila final en negreta (totals). */
  foot?: PdfCell[];
}

const GREEN: [number, number, number] = [23, 76, 64];
const BAR: [number, number, number] = [47, 111, 94];

const cellText = (v: PdfCell) => (v === null || v === undefined ? "" : typeof v === "boolean" ? (v ? "Sí" : "No") : String(v));

export async function buildTablePdf(t: PdfTable) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const cols = t.head.length;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: cols > 6 ? "landscape" : "portrait" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 12;
  const font = cols > 14 ? 6 : cols > 10 ? 7 : cols > 6 ? 8 : 9;

  doc.setFillColor(...GREEN); doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text(doc.splitTextToSize(t.title, W - 2 * M - 40)[0] as string, M, 10);
  doc.setFontSize(10); doc.text("MareMontis", W - M, 10, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  if (t.subtitle) doc.text(doc.splitTextToSize(t.subtitle, W - 2 * M - 40)[0] as string, M, 17);
  doc.text(`${t.rows.length} ${t.rows.length === 1 ? "fila" : "files"}`, W - M, 17, { align: "right" });
  doc.setTextColor(0);

  const barMax = t.bars ? Math.max(1, ...t.bars.values) : 1;
  // Columnes de xifres (números, imports, percentatges) alineades a la dreta
  const numeric = /^-?[\d.]+(,\d+)?( €|%)?$/;
  const numCols = new Set(t.head.map((_, c) => c).filter(c => {
    const vals = t.rows.map(r => cellText(r[c])).filter(Boolean);
    return c > 0 && vals.length > 0 && vals.every(v => numeric.test(v));
  }));
  autoTable(doc, {
    startY: 27,
    head: [t.head],
    body: t.rows.map(r => r.map(cellText)),
    foot: t.foot ? [t.foot.map(cellText)] : undefined,
    showFoot: "lastPage",
    theme: "grid",
    styles: { fontSize: font, cellPadding: 1.4, lineColor: [221, 213, 196], overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: [233, 228, 216], textColor: [40, 60, 50], fontStyle: "bold" },
    footStyles: { fillColor: [244, 239, 223], textColor: [21, 47, 39], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 247, 240] },
    columnStyles: t.bars ? { [t.bars.col]: { cellWidth: Math.min(70, (W - 2 * M) * 0.35) } } : undefined,
    didParseCell: d => { if (numCols.has(d.column.index)) d.cell.styles.halign = "right"; },
    horizontalPageBreak: cols > 16,
    horizontalPageBreakRepeat: 0,
    margin: { left: M, right: M, top: 14, bottom: 14 },
    didDrawCell: d => {
      if (!t.bars || d.section !== "body" || d.column.index !== t.bars.col) return;
      const v = t.bars.values[d.row.index] || 0;
      const w = Math.max(v > 0 ? 0.6 : 0, (d.cell.width - 3) * (v / barMax));
      doc.setFillColor(...BAR);
      doc.rect(d.cell.x + 1.5, d.cell.y + d.cell.height / 2 - 1.6, w, 3.2, "F");
    },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5); doc.setTextColor(120);
    doc.text(`Generat el ${fmtDate(todayISO())}`, M, H - 6);
    doc.text(`Pàgina ${i} de ${pages}`, W - M, H - 6, { align: "right" });
  }
  return doc;
}

export async function downloadTablePdf(fileName: string, t: PdfTable) {
  const doc = await buildTablePdf(t);
  doc.save(fileName.endsWith(".pdf") ? fileName : fileName + ".pdf");
}

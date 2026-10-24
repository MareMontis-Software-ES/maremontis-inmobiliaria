// Informe de revisió en PDF (per imprimir o adjuntar al correu): capçalera de la finca,
// lectures, alarma/calefacció, estat de cada element (els de mal estat destacats),
// observacions i fotos de la revisió. jsPDF es carrega només quan es fa servir.
import { fmtDate } from "../../lib/format";
import { REV_DINSFORA, REV_ESTAT, revisionIssues, type CaseRow, type Photo, type Revision } from "../../data/cases";

export interface ReportInput {
  c: CaseRow;
  r: Revision;
  prev: { water: string; power: string; gas: string };
  responsibleName: string;
  photos: Photo[];
}

const GREEN: [number, number, number] = [23, 76, 64];
const RED: [number, number, number] = [176, 57, 31];
const RED_BG: [number, number, number] = [253, 236, 230];

async function toDataUrl(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const blob = await (await fetch(url)).blob();
    const data = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(blob); });
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = data; });
    return { data, w: img.naturalWidth, h: img.naturalHeight };
  } catch { return null; }
}

export function reportFileName(c: CaseRow, r: Revision) {
  return `Revisio_${c.admin_number}_${r.revision_date}_n${r.revision_number}.pdf`;
}

export async function buildRevisionPdf({ c, r, prev, responsibleName, photos }: ReportInput) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 14;
  const lastY = () => (doc as any).lastAutoTable?.finalY ?? 0;
  const ensure = (y: number, need: number) => { if (y + need > H - 16) { doc.addPage(); return 18; } return y; };
  const section = (title: string, y: number) => {
    y = ensure(y, 14);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...GREEN);
    doc.text(title, M, y); doc.setDrawColor(...GREEN); doc.setLineWidth(0.3); doc.line(M, y + 1.5, W - M, y + 1.5);
    doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    return y + 5;
  };
  const table = { theme: "grid" as const, styles: { fontSize: 8.5, cellPadding: 1.6, lineColor: [221, 213, 196] as [number, number, number] },
    headStyles: { fillColor: [233, 228, 216] as [number, number, number], textColor: [40, 60, 50] as [number, number, number], fontStyle: "bold" as const },
    margin: { left: M, right: M, top: 18 } };

  // --- Capçalera
  doc.setFillColor(...GREEN); doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("Informe de revisió", M, 12);
  doc.setFontSize(11); doc.text(`${c.admin_number} · ${c.address}`, M, 19);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text([c.client_name, c.client_code ? `codi ${c.client_code}` : "", c.municipality].filter(Boolean).join(" · "), M, 25);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("MareMontis", W - M, 12, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Data: ${fmtDate(r.revision_date)}`, W - M, 19, { align: "right" });
  doc.text(`Revisió nº ${r.revision_number}${r.is_extra ? " (complementària)" : ""}`, W - M, 25, { align: "right" });
  doc.setTextColor(0);

  let y = 37;
  doc.setFontSize(9);
  doc.text(`Responsable: ${responsibleName || "—"}     Contracte: ${c.contract || "—"}     Zona: ${c.zone ?? "—"}`, M, y);
  y += 6;

  // --- Resum: el que cal comunicar
  const issues = revisionIssues(r);
  y = section(issues.length ? `Elements a revisar (${issues.length})` : "Resultat", y);
  if (issues.length) {
    const lines = issues.flatMap(i => doc.splitTextToSize("• " + i, W - 2 * M - 6) as string[]);
    const h = lines.length * 4.2 + 4;
    y = ensure(y, h);
    doc.setFillColor(...RED_BG); doc.setDrawColor(...RED); doc.roundedRect(M, y - 1, W - 2 * M, h, 1.5, 1.5, "FD");
    doc.setTextColor(...RED); doc.setFont("helvetica", "bold");
    doc.text(lines, M + 3, y + 3.2);
    doc.setTextColor(0); doc.setFont("helvetica", "normal");
    y += h + 5;
  } else {
    doc.setTextColor(47, 138, 79); doc.setFont("helvetica", "bold");
    doc.text("Tot correcte, sense incidències.", M, y + 1);
    doc.setTextColor(0); doc.setFont("helvetica", "normal");
    y += 7;
  }

  // --- Lectures
  y = section("Lectures", y);
  const onoff = (v: boolean) => (v ? "ON" : "OFF");
  autoTable(doc, { ...table, startY: y,
    head: [["", "OFF/ON", "Lectura anterior", "Lectura actual", "Núm. comptador"]],
    body: [["Aigua", onoff(r.water_on), prev.water || "—", r.water_reading || "—", r.water_meter || "—"],
           ["Llum", onoff(r.power_on), prev.power || "—", r.power_reading || "—", r.power_meter || "—"],
           ["Gas", onoff(r.gas_on), prev.gas || "—", r.gas_reading || "—", r.gas_meter || "—"]],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 30 } } });
  y = lastY() + 2;
  doc.setFontSize(8); doc.setTextColor(100);
  doc.text(`Data de lectura: ${fmtDate(r.reading_date) || "—"}`, M, y + 3);
  doc.setTextColor(0); y += 8;

  // --- Alarma i calefacció
  autoTable(doc, { ...table, startY: y,
    head: [["", "OFF/ON", "Observacions", "Avisar"]],
    body: [["Alarma", onoff(r.alarm_on), r.alarm_notes || "", r.alarm_notify ? "Sí" : ""],
           ["Calefacció / A.C.", onoff(r.heating_on), r.heating_notes || "", r.heating_notify ? "Sí" : ""]],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 30 }, 1: { cellWidth: 18 }, 3: { cellWidth: 16 } },
    didParseCell: d => { if (d.section === "body" && d.cell.raw !== undefined && ((d.row.index === 0 && r.alarm_notify) || (d.row.index === 1 && r.heating_notify))) { d.cell.styles.fillColor = RED_BG; d.cell.styles.textColor = RED; } } });
  y = lastY() + 6;

  // --- Estat de cada element
  y = section("Estat de cada element", y);
  const item = (k: string) => r.items.find(i => i.key === k);
  const extraTxt = (d: typeof REV_ESTAT[number], v: unknown) =>
    d.extra === "encarregar" && v ? "CAL ENCARREGAR" : d.extra === "falta_sal" && v ? "FALTA SAL" : d.extra === "caducitat" && v ? `Caduca ${String(v).split("-").reverse().join("/")}` : "";
  const rows: { cells: string[]; bad: boolean }[] = [
    ...REV_DINSFORA.map(d => { const it = item(d.key); const where = [it?.dins && "Dins", it?.fora && "Fora"].filter(Boolean).join(" i ");
      return { cells: [d.label, where ? `A revisar (${where.toLowerCase()})` : "Bé", it?.notes || "", it?.notify ? "Sí" : ""], bad: !!where }; }),
    ...REV_ESTAT.map(d => { const it = item(d.key); const ex = extraTxt(d, it?.extra);
      return { cells: [d.label, it?.state === "mal" ? "MAL ESTAT" : it?.state === "bon" ? "Bon estat" : "—", [ex, it?.notes].filter(Boolean).join(" · "), it?.notify ? "Sí" : ""],
        bad: it?.state === "mal" || !!ex }; }),
  ];
  autoTable(doc, { ...table, startY: y,
    head: [["Element", "Estat", "Observacions", "Avisar"]],
    body: rows.map(x => x.cells),
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 45 }, 1: { cellWidth: 35 }, 3: { cellWidth: 16 } },
    didParseCell: d => { if (d.section === "body" && (rows[d.row.index]?.bad || rows[d.row.index]?.cells[3])) {
      d.cell.styles.fillColor = RED_BG; d.cell.styles.textColor = RED; if (d.column.index === 1) d.cell.styles.fontStyle = "bold"; } } });
  y = lastY() + 6;

  // --- Observacions
  if (r.other_observations) {
    y = section("Altres observacions", y);
    const lines = doc.splitTextToSize(r.other_observations, W - 2 * M) as string[];
    for (const l of lines) { y = ensure(y, 5); doc.text(l, M, y); y += 4.2; }
    y += 4;
  }

  // --- Fotos (2 per fila)
  if (photos.length) {
    y = section(`Fotos (${photos.length})`, y);
    const colW = (W - 2 * M - 6) / 2, maxH = 70;
    const imgs = await Promise.all(photos.map(p => (p.url ? toDataUrl(p.url) : Promise.resolve(null))));
    for (let i = 0; i < photos.length; i += 2) {
      const pair = [0, 1].map(k => ({ p: photos[i + k], img: imgs[i + k] })).filter(x => x.p);
      const sizes = pair.map(({ img }) => { if (!img) return { w: colW, h: 12 }; const s = Math.min(colW / img.w, maxH / img.h); return { w: img.w * s, h: img.h * s }; });
      const rowH = Math.max(...sizes.map(s => s.h)) + 8;
      y = ensure(y, rowH);
      pair.forEach(({ p, img }, k) => {
        const x = M + k * (colW + 6);
        if (img) doc.addImage(img.data, img.data.startsWith("data:image/png") ? "PNG" : "JPEG", x, y, sizes[k].w, sizes[k].h);
        else { doc.setDrawColor(200); doc.rect(x, y, colW, 12); doc.setTextColor(150); doc.text("(no s'ha pogut carregar la foto)", x + 2, y + 7); doc.setTextColor(0); }
        doc.setFontSize(8); doc.text(doc.splitTextToSize(p.description || "", colW) as string[], x, y + sizes[k].h + 4); doc.setFontSize(9);
      });
      y += rowH + 2;
    }
  }

  // --- Peu de pàgina
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(120);
    doc.text(`${c.address} · revisió ${fmtDate(r.revision_date)}`, M, H - 8);
    doc.text(`Pàgina ${i} de ${n}`, W - M, H - 8, { align: "right" });
  }
  return doc;
}

// «Revisions» del menú = Control de cases. Llistat de totes les cases amb la pròxima
// revisió calculada i filtre per data (PDF: «saber quins immobles s'han de revisar»).
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Download } from "lucide-react";
import { Empty, Notice } from "../../components/ui";
import { errorText } from "../../lib/supabase";
import { addDaysISO, fmtDate, todayISO } from "../../lib/format";
import { listCases, type CaseRow } from "../../data/cases";
import { downloadText, toCsv } from "../../data/global";
import { CaseView } from "./CaseView";

export function CasesPage({ canWrite, userId, onOpenClient }: { canWrite: boolean; userId: string; onOpenClient: (id: string) => void }) {
  const [rows, setRows] = useState<CaseRow[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [zone, setZone] = useState("");
  const [until, setUntil] = useState(addDaysISO(todayISO(), 15));
  const [mode, setMode] = useState<"pendents" | "totes" | "sense">("pendents");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const load = () => listCases().then(setRows).catch(e => setError(errorText(e)));
  useEffect(() => { void load(); }, []);

  const zones = useMemo(() => [...new Set((rows || []).map(r => r.zone).filter(z => z != null))].sort((a, b) => Number(a) - Number(b)), [rows]);
  const list = useMemo(() => (rows || []).filter(r =>
    (!zone || String(r.zone) === zone) &&
    (mode === "totes" || (mode === "sense" ? !r.includes_revisions : !!r.next && r.next.date <= until)) &&
    (!q || `${r.address} ${r.admin_number} ${r.client_name} ${r.client_code} ${r.municipality}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (a.next?.date || "9999").localeCompare(b.next?.date || "9999")), [rows, zone, mode, until, q]);
  useEffect(() => setPage(0), [zone, mode, until, q]);
  const PER = 25, pages = Math.max(1, Math.ceil(list.length / PER));

  if (sel) return (
    <div className="work-area list-view">
      <button className="cancel-btn back-btn" onClick={() => { setSel(null); void load(); }}><ChevronLeft size={16} /> Tornar al control de cases</button>
      <CaseView propertyId={sel} canWrite={canWrite} userId={userId} onOpenClient={onOpenClient} />
    </div>
  );

  return (
    <div className="work-area list-view">
      <div className="page-title"><div><small>CONTROL DE CASES</small><h1>Revisions</h1><p>Revisions d'octubre a juny cada 2,5 mesos (sense Nadal ni Setmana Santa), segons el contracte de cada finca.</p></div>
        <button className="cancel-btn" disabled={!list.length} onClick={() => downloadText("control-cases.csv",
          toCsv(["Zona", "Cognoms", "Nom", "Tipus contracte", "Finca", "Núm. adm.", "Última revisió", "Nº", "Pròxima revisió"],
            list.map(r => [r.zone, r.client_name.split(" ").slice(1).join(" "), r.client_name.split(" ")[0], r.contract, r.address, r.admin_number, fmtDate(r.last_revision_date), r.last_revision_number, fmtDate(r.next?.date)])), "text/csv")}>
          <Download size={16} /> Excel (CSV)</button>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="filter-bar">
        {([["pendents", "A revisar fins al"], ["totes", "Totes les cases"], ["sense", "Contracte sense revisions"]] as const).map(([k, l]) =>
          <button key={k} className={"year-chip" + (mode === k ? " on" : "")} onClick={() => setMode(k)}>{l}</button>)}
        {mode === "pendents" && <input type="date" className="filter-input small" value={until} onChange={e => setUntil(e.target.value)} />}
        <select className="filter-input small" value={zone} onChange={e => setZone(e.target.value)}><option value="">Totes les zones</option>{zones.map(z => <option key={z!} value={String(z)}>Zona {z}</option>)}</select>
        <input className="filter-input" placeholder="Casa, codi o client a buscar…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <section className="data-panel">
        {!rows ? <Empty>Carregant…</Empty> : (
          <table className="mini-table cases-table">
            <thead><tr><th>Immoble</th><th>Client</th><th>Zona</th><th>Contracte</th><th>Data revisió</th><th>Revisió</th><th>Pròxima</th></tr></thead>
            <tbody>
              {list.slice(page * PER, page * PER + PER).map(r => (
                <tr key={r.id} onClick={() => setSel(r.id)}>
                  <td className="wrap"><strong>{r.address}</strong><small className="block muted">Adm. {r.admin_number} · {r.municipality}</small></td>
                  <td className="wrap">{r.client_name}<small className="block muted">{r.client_code}</small></td>
                  <td>{r.zone ?? "—"}</td><td>{r.contract || "—"}</td>
                  <td>{fmtDate(r.last_revision_date) || "—"}</td><td>{r.last_revision_number ?? "—"}</td>
                  <td>{r.next ? <span className={"status-pill " + (r.next.overdue ? "status-warn" : "status-ok")}>{fmtDate(r.next.date)}{r.next.overdue ? " · pendent" : ""}</span> : "—"}</td>
                </tr>))}
              {!list.length && <tr className="no-hover"><td colSpan={7} className="table-empty">Cap casa amb aquest filtre.</td></tr>}
            </tbody>
          </table>
        )}
        <div className="client-results-footer pad">
          <span>Mostrant {list.length ? page * PER + 1 : 0}–{Math.min(list.length, page * PER + PER)} de {list.length}</span>
          <div>{Array.from({ length: pages }, (_, i) => <button key={i} className={i === page ? "current" : ""} onClick={() => setPage(i)}>{i + 1}</button>).slice(0, 12)}</div>
        </div>
      </section>
    </div>
  );
}

// Llista de totes les finques (cercador). En obrir-ne una, es mostra dins la
// fitxa del seu titular, que és on es gestiona tot.
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { listProperties, type PropertyRow } from "../../data/properties";
import { errorText } from "../../lib/supabase";
import { fmtDate } from "../../lib/format";
import { Notice } from "../../components/ui";
import { ExportButtons } from "../../components/ExportButtons";
import { BaixesView } from "./BaixesView";

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const USE: Record<string, string> = { turistic: "Turístic", urba: "Urbà" };

export function PropertiesPage({ onOpenProperty, canWrite }: { onOpenProperty: (id: string) => void; canWrite: boolean }) {
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("active");
  const [zone, setZone] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => { listProperties().then(setRows).catch(e => setError(errorText(e))).finally(() => setLoading(false)); }, []);
  const zones = useMemo(() => [...new Set(rows.map(r => r.zone).filter(z => z != null))].sort((a, b) => Number(a) - Number(b)), [rows]);

  const filtered = useMemo(() => rows.filter(r =>
    (!status || r.status === status) && (!zone || String(r.zone) === zone) &&
    (!q || norm(`${r.admin_number} ${r.address} ${r.municipality} ${r.owners.map(o => o.name).join(" ")}`).includes(norm(q)))), [rows, q, status, zone]);

  return (
    <div className="work-area list-view">
      <div className="page-title"><div><small>GESTIÓ IMMOBILIÀRIA</small><h1>Immobles</h1><p>Cercador de finques. En obrir-ne una, es mostra dins la fitxa del seu titular.</p></div>
        {status !== "baixa" && <div className="head-actions">
          <ExportButtons disabled={!filtered.length} table={() => ({ fileName: "immobles", title: "Immobles",
            subtitle: [status === "active" ? "Finques actives" : "Totes les finques", zone ? `Zona ${zone}` : "", q ? `Cerca «${q}»` : ""].filter(Boolean).join(" · "),
            head: ["Núm. adm.", "Adreça", "Zona", "Població", "Lloguer", "Titular", "Estat"],
            rows: filtered.map(r => [r.admin_number, r.address, r.zone, r.municipality, USE[r.rental_use] || "", r.owners.map(o => o.name + (o.percentage != null && o.percentage < 100 ? ` (${o.percentage}%)` : "")).join(", "), r.status === "baixa" ? `Baixa ${fmtDate(r.baixa_date)}` : "Activa"]) })} />
        </div>}
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="filter-bar">
        {([["active", "Finques actives"], ["baixa", "Històric de baixes"], ["", "Totes"]] as const).map(([k, l]) =>
          <button key={k} className={"year-chip" + (status === k ? " on" : "")} onClick={() => setStatus(k)}>{l}</button>)}
      </div>
      {status === "baixa" ? <section className="client-search-page"><BaixesView canWrite={canWrite} onOpenProperty={onOpenProperty} /></section> : (
      <section className="client-search-page">
        <div className="client-search-tools">
          <div className="client-filter-row">
            <label>Cerca<input className="filter-input" autoFocus placeholder="Adreça, núm. adm., titular…" value={q} onChange={e => setQ(e.target.value)} /></label>
            <label>Zona<select value={zone} onChange={e => setZone(e.target.value)}><option value="">Totes</option>{zones.map(z => <option key={z!} value={String(z)}>{z}</option>)}</select></label>
          </div>
        </div>
        <section className="data-panel client-results">
          <div className="table-wrap"><table>
            <thead><tr><th>Núm. adm.</th><th>Adreça</th><th>Zona</th><th>Població</th><th>Lloguer</th><th>Titular</th><th>Estat</th><th></th></tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className={"client-list-row" + (r.status === "baixa" ? " row-off" : "")} onClick={() => onOpenProperty(r.id)}>
                  <td>{r.admin_number}</td><td><strong>{r.address || "—"}</strong></td><td>{r.zone ?? "—"}</td><td>{r.municipality || "—"}</td>
                  <td>{USE[r.rental_use] || "—"}</td><td>{r.owners.map(o => o.name + (o.percentage != null && o.percentage < 100 ? ` (${o.percentage}%)` : "")).join(", ") || "—"}</td>
                  <td>{r.status === "baixa" ? `Baixa ${fmtDate(r.baixa_date)}` : "Activa"}</td><td><ChevronRight size={18} /></td>
                </tr>
              ))}
              {!filtered.length && <tr className="no-hover"><td colSpan={8} className="table-empty">{loading ? "Carregant…" : "Cap finca coincideix. Les finques noves es donen d'alta des de la fitxa del client."}</td></tr>}
            </tbody>
          </table></div>
          <div className="client-results-footer">Mostrant {filtered.length} de {rows.length} finques</div>
        </section>
      </section>)}
    </div>
  );
}

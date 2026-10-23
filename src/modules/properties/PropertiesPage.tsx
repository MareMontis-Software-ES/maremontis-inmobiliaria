// Immobles: de moment només llista i consulta de dades generals.
// L'alta, la fitxa completa i les pestanyes són la FASE 2 (veure docs/PLAN_FUNCIONAL_PDF.md).
import { useEffect, useMemo, useState } from "react";
import { Building2, House, MapPin, Users, X } from "lucide-react";
import { listProperties, type PropertyRow } from "../../data/properties";
import { errorText } from "../../lib/supabase";
import { fmtDate } from "../../lib/format";
import { Info2, Notice, Panel } from "../../components/ui";

interface Props {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  query: string;
  onOpenClient: (id: string) => void;
}

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function PropertiesPage({ selectedId, setSelectedId, query, onOpenClient }: Props) {
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("active");
  const [q, setQ] = useState(query);

  useEffect(() => { listProperties().then(setRows).catch(e => setError(errorText(e))).finally(() => setLoading(false)); }, []);
  useEffect(() => setQ(query), [query]);

  const filtered = useMemo(() => rows.filter(r =>
    (!status || r.status === status) &&
    (!q || norm(`${r.admin_number} ${r.address} ${r.municipality} ${r.owners.map(o => o.name).join(" ")}`).includes(norm(q)))), [rows, q, status]);

  const sel = rows.find(r => r.id === selectedId);

  if (sel) {
    return (
      <div className="work-area property-view">
        <section className="record-banner property-banner">
          <div className="record-summary">
            <div className="record-number">Núm. Adm. <strong>{sel.admin_number}</strong><span className={"record-state" + (sel.status === "baixa" ? " state-off" : "")}>{sel.status === "baixa" ? "BAIXA" : "ACTIVA"}</span></div>
            <div><b>Adreça</b><strong>{sel.address || "—"}</strong></div>
            <div><b>Població</b><strong>{[sel.postal_code, sel.municipality].filter(Boolean).join(" ")} {sel.province && `(${sel.province})`}</strong></div>
            <div><b>Zona</b><strong>{sel.zone ?? "—"}</strong></div>
          </div>
          <div className="other-properties">
            <strong>Titulars</strong>
            {sel.owners.length ? sel.owners.map((o, i) => (
              <button key={i} className="property-choice" disabled={!o.client_id} onClick={() => o.client_id && onOpenClient(o.client_id)}>
                <Users size={16} />{o.name}{o.percentage != null && <small> · {o.percentage}%</small>}
              </button>)) : <span className="banner-empty">Sense titulars</span>}
          </div>
          <div className="property-photo"><House size={54} /><span>Imatge de l'immoble</span></div>
          <div className="address-card property-full-address">
            <strong>Adreça completa</strong>
            <span>{sel.address}</span><span>{sel.postal_code} {sel.municipality}</span><span>{sel.country}</span>
            <button type="button" className="outline-btn" onClick={() => window.open("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([sel.address, sel.postal_code, sel.municipality, sel.country].filter(Boolean).join(", ")), "_blank", "noopener,noreferrer")}><MapPin size={16} /> Veure al mapa</button>
          </div>
        </section>
        <div className="record-grid">
          <div className="column-stack">
            <Panel title="Dades generals" icon={Building2}>
              <Info2 label="Ús" value={sel.rental_use === "turistic" ? "Lloguer turístic" : sel.rental_use === "urba" ? "Lloguer urbà" : ""} />
              <Info2 label="Data de baixa" value={fmtDate(sel.baixa_date)} />
            </Panel>
          </div>
          <div className="column-stack" style={{ gridColumn: "span 2" }}>
            <Notice>La fitxa completa de l'immoble (finques, contracte, claus, subministraments, assegurances, impostos, revisions…) és la <strong>fase 2</strong>. Les taules ja existeixen a la base de dades.</Notice>
          </div>
        </div>
        <div className="bottom-bar"><div><button className="cancel-btn" onClick={() => setSelectedId(null)}><X size={17} /> Tornar a la llista</button></div><div /></div>
      </div>
    );
  }

  return (
    <div className="work-area list-view">
      <div className="page-title"><div><small>GESTIÓ IMMOBILIÀRIA</small><h1>Immobles</h1><p>Finques registrades a la base de dades.</p></div></div>
      {error && <Notice kind="error">{error}</Notice>}
      <section className="client-search-page">
        <div className="client-search-tools">
          <div className="client-filter-row two">
            <label>Cerca<input className="filter-input" placeholder="Adreça, núm. adm., titular…" value={q} onChange={e => setQ(e.target.value)} /></label>
            <label>Estat<select value={status} onChange={e => setStatus(e.target.value)}><option value="active">Actives</option><option value="baixa">Històric de baixes</option><option value="">Totes</option></select></label>
          </div>
        </div>
        <section className="data-panel client-results">
          <div className="table-wrap"><table>
            <thead><tr><th>Núm. adm.</th><th>Adreça</th><th>Zona</th><th>Població</th><th>Ús</th><th>Titular</th><th>Estat</th></tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="client-list-row" onClick={() => setSelectedId(r.id)}>
                  <td>{r.admin_number}</td><td><strong>{r.address || "—"}</strong></td><td>{r.zone ?? "—"}</td><td>{r.municipality || "—"}</td>
                  <td>{r.rental_use || "—"}</td><td>{r.owners.map(o => o.name).join(", ") || "—"}</td><td>{r.status === "baixa" ? "Baixa" : "Activa"}</td>
                </tr>
              ))}
              {!filtered.length && <tr className="no-hover"><td colSpan={7} className="table-empty">{loading ? "Carregant…" : "No hi ha immobles. L'alta d'immobles és la fase 2."}</td></tr>}
            </tbody>
          </table></div>
          <div className="client-results-footer">Mostrant {filtered.length} de {rows.length} immobles</div>
        </section>
      </section>
    </div>
  );
}

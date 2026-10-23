// Llista i cercador de clients (PDF pàg. 1: «Relació de clients / immobles»)
import { useMemo, useState } from "react";
import { ChevronRight, House, Plus, Search, X } from "lucide-react";
import type { ClientSummary } from "../../types";

interface Props {
  clients: ClientSummary[];
  query: string;
  setQuery: (q: string) => void;
  canWrite: boolean;
  loading: boolean;
  onOpen: (id: string) => void;
  onOpenProperty: (id: string) => void;
  onNew: () => void;
}

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function ClientList({ clients, query, setQuery, canWrite, loading, onOpen, onOpenProperty, onNew }: Props) {
  const [status, setStatus] = useState("active");
  const [resident, setResident] = useState("");
  const [country, setCountry] = useState("");
  const [town, setTown] = useState("");
  const [property, setProperty] = useState("");

  // Filtres construïts amb les dades reals, no amb llistes fixes
  const countries = useMemo(() => [...new Set(clients.map(c => c.country).filter(Boolean))].sort(), [clients]);
  const towns = useMemo(() => [...new Set(clients.map(c => c.municipality).filter(Boolean))].sort(), [clients]);

  const rows = useMemo(() => {
    const q = norm(query.trim());
    const pq = norm(property.trim());
    return clients.filter(c =>
      (!status || c.status === status) &&
      (!resident || String(c.resident) === resident) &&
      (!country || c.country === country) &&
      (!town || c.municipality === town) &&
      (!pq || c.properties.some(p => norm(p.address + " " + p.admin_number).includes(pq))) &&
      (!q || norm([c.client_code, c.account_code, c.first_name, c.last_name, c.dni, c.nie, c.phone, c.email, c.municipality].join(" ")).includes(q)));
  }, [clients, query, status, resident, country, town, property]);

  const clear = () => { setQuery(""); setStatus("active"); setResident(""); setCountry(""); setTown(""); setProperty(""); };

  return (
    <div className="work-area list-view">
      <div className="page-title">
        <div><small>GESTIÓ DE CLIENTS</small><h1>Clients</h1><p>Relació de clients i propietaris.</p></div>
        {canWrite && <button className="save-btn" onClick={onNew}><Plus size={18} /> Alta client</button>}
      </div>
      <section className="client-search-page">
        <div className="client-search-tools">
          <label className="client-search-input"><Search size={21} />
            <input autoFocus placeholder="Codi, nom, cognoms, DNI/NIE, telèfon, e-mail…" value={query} onChange={e => setQuery(e.target.value)} />
          </label>
          <div className="client-filter-row">
            <label>Immoble<input className="filter-input" placeholder="Adreça o núm. adm." value={property} onChange={e => setProperty(e.target.value)} /></label>
            <label>Estat<select value={status} onChange={e => setStatus(e.target.value)}><option value="active">Actius</option><option value="inactive">De baixa</option><option value="">Tots</option></select></label>
            <label>Resident<select value={resident} onChange={e => setResident(e.target.value)}><option value="">Tots</option><option value="true">Resident</option><option value="false">No resident</option></select></label>
            <label>País<select value={country} onChange={e => setCountry(e.target.value)}><option value="">Tots</option>{countries.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Població<select value={town} onChange={e => setTown(e.target.value)}><option value="">Totes</option>{towns.map(x => <option key={x}>{x}</option>)}</select></label>
            <button className="client-filter-clear" onClick={clear}><X size={17} /> Netejar</button>
          </div>
        </div>
        <section className="data-panel client-results">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Codi</th><th>Nom</th><th>Cognoms</th><th>Immobles</th><th>Població</th><th>Telèfon</th><th></th></tr></thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id} className={"client-list-row" + (c.status === "inactive" ? " row-off" : "")} onClick={() => onOpen(c.id)}>
                    <td>{c.account_code}</td>
                    <td>{c.first_name}</td>
                    <td>{c.last_name}</td>
                    <td>
                      <div className="client-home-list">
                        {c.properties.length ? c.properties.map(h => (
                          <button type="button" className="client-home-chip" key={h.id} onClick={e => { e.stopPropagation(); onOpenProperty(h.id); }}>
                            <House size={17} /><span>{h.address}</span>{h.status === "baixa" && <span className="mini-tag">BAIXA</span>}
                          </button>
                        )) : <span className="client-no-homes">Sense immobles</span>}
                      </div>
                    </td>
                    <td>{c.municipality || "—"}</td>
                    <td>{c.phone || "—"}</td>
                    <td><ChevronRight size={18} /></td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr className="no-hover"><td colSpan={7} className="table-empty">
                    {loading ? "Carregant clients…" : clients.length ? "Cap client coincideix amb la cerca." : "Encara no hi ha cap client. Fes «Alta client» per crear el primer."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="client-results-footer">Mostrant {rows.length} de {clients.length} clients</div>
        </section>
      </section>
    </div>
  );
}

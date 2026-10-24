// Històric de baixes (PDF pàg. 8-9): llista com el programa antic (codi, nom, cognoms,
// immoble, zona, núm. adm., data i usuari), fitxa de la finca donada de baixa amb
// Anterior/Següent i el botó «Recuperar immoble», que pregunta a quin propietari pertany.
import { useEffect, useMemo, useState } from "react";
import { ArchiveRestore, ChevronLeft, ChevronRight, Contact, Euro, Home, Landmark, Trees, X } from "lucide-react";
import { Empty, Info2, Notice, Panel } from "../../components/ui";
import { FieldGrid } from "../../components/FieldGrid";
import { SearchSelect } from "../../components/SearchSelect";
import { errorText } from "../../lib/supabase";
import { accountCode, fmtDate } from "../../lib/format";
import { baixaGroups, getBaixaFitxa, listBaixes, recoverProperty, type BaixaFitxa, type BaixaRow } from "../../data/baixes";
import { clientPickList, lookups } from "../../data/finques";

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const money = (v: string) => (v === "" ? "—" : Number(v).toLocaleString("ca-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €");

export function BaixesView({ canWrite, onOpenProperty }: { canWrite: boolean; onOpenProperty: (id: string) => void }) {
  const [rows, setRows] = useState<BaixaRow[] | null>(null);
  const [f, setF] = useState({ code: "", name: "", property: "" });
  const [sel, setSel] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = () => listBaixes().then(setRows).catch(e => setError(errorText(e)));
  useEffect(() => { void load(); }, []);

  const list = useMemo(() => (rows || []).filter(r =>
    (!f.code || `${r.client_code ?? ""} ${accountCode(r.client_code)}`.includes(f.code.trim())) &&
    (!f.name || norm(`${r.last_name} ${r.first_name}`).includes(norm(f.name))) &&
    (!f.property || norm(`${r.address} ${r.municipality} ${r.admin_number}`).includes(norm(f.property)))), [rows, f]);

  if (sel) {
    const i = list.findIndex(r => r.id === sel);
    return <BaixaFitxaView id={sel} canWrite={canWrite}
      onPrev={i > 0 ? () => setSel(list[i - 1].id) : undefined} onNext={i >= 0 && i < list.length - 1 ? () => setSel(list[i + 1].id) : undefined}
      onClose={() => setSel(null)} onRecovered={id => { void load(); setSel(null); onOpenProperty(id); }} />;
  }

  return (
    <>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="client-search-tools">
        <div className="client-filter-row three">
          <label>Codi<input className="filter-input" placeholder="Codi client" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} /></label>
          <label>Cognoms<input className="filter-input" placeholder="Cognoms o nom" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
          <label>Immoble<input className="filter-input" placeholder="Adreça o núm. adm." value={f.property} onChange={e => setF({ ...f, property: e.target.value })} /></label>
        </div>
      </div>
      <section className="data-panel client-results">
        <div className="table-wrap"><table>
          <thead><tr><th>Codi</th><th>Nom</th><th>Cognoms</th><th>Immoble</th><th>Zona</th><th>Núm. adm.</th><th>Data baixa</th><th>Usuari</th><th></th></tr></thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id} className="client-list-row row-off" onClick={() => setSel(r.id)}>
                <td>{accountCode(r.client_code) || "—"}</td><td>{r.first_name || "—"}</td><td>{r.last_name || "—"}</td>
                <td><strong>{r.address || "—"}</strong></td><td>{r.zone ?? "—"}</td><td>{r.admin_number}</td>
                <td>{fmtDate(r.baixa_date) || "—"}</td><td>{r.baixa_by || "—"}</td><td><ChevronRight size={18} /></td>
              </tr>
            ))}
            {!list.length && <tr className="no-hover"><td colSpan={9} className="table-empty">{rows ? "No hi ha cap finca donada de baixa amb aquest filtre." : "Carregant…"}</td></tr>}
          </tbody>
        </table></div>
        <div className="client-results-footer">Mostrant {list.length} de {rows?.length ?? 0} finques donades de baixa</div>
      </section>
    </>
  );
}

function BaixaFitxaView({ id, canWrite, onPrev, onNext, onClose, onRecovered }: {
  id: string; canWrite: boolean; onPrev?: () => void; onNext?: () => void; onClose: () => void; onRecovered: (id: string) => void;
}) {
  const [d, setD] = useState<BaixaFitxa | null>(null);
  const [lk, setLk] = useState<{ zones: [string, string][]; contractTypes: [string, string][] }>({ zones: [], contractTypes: [] });
  const [year, setYear] = useState(0);
  const [ask, setAsk] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setD(null); setYear(0); setError(""); getBaixaFitxa(id).then(setD).catch(e => setError(errorText(e))); }, [id]);
  useEffect(() => { lookups().then(setLk).catch(() => {}); }, []);

  const groups = baixaGroups(lk.zones, lk.contractTypes);
  const tax = d?.taxes[year];

  return (
    <div className="baixa-fitxa">
      <div className="baixa-nav">
        <button className="cancel-btn" onClick={onClose}><ChevronLeft size={16} /> Tornar a l'històric</button>
        <span className="h3-actions">
          <button className="cancel-btn" disabled={!onPrev} onClick={onPrev}><ChevronLeft size={16} /> Anterior</button>
          <button className="cancel-btn" disabled={!onNext} onClick={onNext}>Següent <ChevronRight size={16} /></button>
          {canWrite && d && <button className="save-btn" onClick={() => setAsk(true)}><ArchiveRestore size={16} /> Recuperar immoble</button>}
        </span>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {!d ? <Empty>Carregant…</Empty> : (
        <>
          <section className="case-head">
            <div className="case-head-main">
              <strong className="case-title">{d.form.admin_number} · {[d.form.street_type, d.form.address].filter(Boolean).join(" ")}</strong>
              <span>{d.client ? `${d.client.account} · ${d.client.name}` : "Sense titular"}</span>
            </div>
            <dl>
              <div><dt>Estat</dt><dd className="txt-warn">BAIXA</dd></div>
              <div><dt>Data baixa</dt><dd>{fmtDate(d.form.baixa_date) || "—"}</dd></div>
              <div><dt>Donada de baixa per</dt><dd>{d.baixa_by || "—"}</dd></div>
              <div><dt>Zona</dt><dd>{d.form.zone || "—"}</dd></div>
              <div><dt>Municipi</dt><dd>{d.form.municipality || "—"}</dd></div>
              <div><dt>C.P.</dt><dd>{d.form.postal_code || "—"}</dd></div>
            </dl>
          </section>

          <div className="baixa-grid">
            <Panel title="Contacte del client" icon={Contact}>
              {d.client ? <>
                <Info2 label="Client" value={`${d.client.name} (codi ${d.client.code})`} />
                <Info2 label="Telèfons" value={d.client.phones.join(" · ")} />
                <Info2 label="E-mails" value={d.client.emails.join(" · ")} />
                <Info2 label="Adreça" value={d.client.address} />
                <Info2 label="Idioma / nacionalitat" value={[d.client.language, d.client.nationality].filter(Boolean).join(" · ")} />
                {d.coowners.length > 0 && <Info2 label="Altres titulars" value={d.coowners.join(", ")} />}
              </> : <Empty>Aquesta finca no té cap titular assignat.</Empty>}
            </Panel>

            <Panel title="Impostos" icon={Landmark}>
              {!d.taxes.length ? <Empty>No hi ha impostos registrats.</Empty> : <>
                <div className="year-bar">{d.taxes.map((t, i) => <button key={t.id} className={"year-chip" + (i === year ? " on" : "")} onClick={() => setYear(i)}>{t.tax_year}{t.paid === "true" ? " ✓" : ""}</button>)}</div>
                {tax && <>
                  <Info2 label="Nom (titular rebut)" value={tax.holder_name} />
                  <Info2 label="Valor cadastral" value={money(tax.cadastral_value)} />
                  <Info2 label="% revalorització" value={tax.revaluation_pct ? tax.revaluation_pct + " %" : ""} />
                  <Info2 label="Referència cadastral" value={tax.cadastral_ref} />
                  <Info2 label="Quota IBI" value={money(tax.ibi_quota)} />
                  <Info2 label="Renda · base imposable" value={money(tax.taxable_base)} />
                  <Info2 label="Renda · tipus gravamen" value={tax.tax_rate ? tax.tax_rate + " %" : ""} />
                  <Info2 label="Renda · quota" value={money(tax.rent_quota)} />
                  <Info2 label="Actiu" value={[fmtDate(tax.active_from), fmtDate(tax.active_to)].filter(Boolean).join(" – ")} />
                  <Info2 label="Pagat" value={tax.paid === "true" ? `Sí ${fmtDate(tax.paid_date)}` : "No"} />
                  <Info2 label="Dades registrals" value={[tax.reg_owner, tax.purchase_date && "compra " + fmtDate(tax.purchase_date), tax.deed_price && "escriptura " + money(tax.deed_price), tax.protocol_number && "protocol " + tax.protocol_number, tax.notary, tax.deed_type].filter(Boolean).join(" · ")} />
                  <Info2 label="Classe / unitats" value={[tax.class, tax.units].filter(Boolean).join(" · ")} />
                </>}
              </>}
            </Panel>
          </div>

          {groups.map(g => (
            <Panel key={g.id} title={g.title} icon={g.id === "manteniment" ? Trees : g.id === "contracte" ? Euro : Home}>
              <FieldGrid fields={g.fields} values={d.form} editing={false} onChange={() => {}} />
            </Panel>
          ))}
          <p className="hint">No es mostren els subministraments (llum, aigua, gas, butà), ni internet i alarma.</p>
        </>
      )}
      {ask && d && <RecoverDialog propertyId={id} currentClientId={d.client?.id || ""} onClose={() => setAsk(false)} onDone={() => onRecovered(id)} />}
    </div>
  );
}

function RecoverDialog({ propertyId, currentClientId, onClose, onDone }: { propertyId: string; currentClientId: string; onClose: () => void; onDone: () => void }) {
  const [clients, setClients] = useState<{ id: string; label: string }[]>([]);
  const [client, setClient] = useState(currentClientId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { clientPickList().then(l => setClients(l.map(c => ({ id: c.id, label: `${c.code} · ${c.name}` })))).catch(e => setError(errorText(e))); }, []);

  async function accept() {
    if (!client) { setError("Tria el propietari."); return; }
    setBusy(true); setError("");
    try {
      const n = await recoverProperty(propertyId, client === currentClientId ? null : client);
      window.alert(`Immoble recuperat amb el núm. d'administració ${n}.`);
      onDone();
    } catch (e) { setError(errorText(e)); setBusy(false); }
  }

  return (
    <div className="modal-back" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" role="dialog" aria-label="Recuperar dades immoble">
        <div className="modal-title"><ArchiveRestore size={18} /> Recuperar dades immoble</div>
        <SearchSelect label="A quin propietari pertany?" items={clients} value={client} onChange={id => setClient(id)} placeholder="Escriu el codi o el nom del client…" />
        {!!currentClientId && <p className="hint">{client === currentClientId ? "Es manté el propietari que tenia." : "El client triat passarà a ser l'únic titular (100 %)."}</p>}
        <p className="hint">Si el seu núm. d'administració ja l'usa una altra finca, se li assignarà el primer número lliure.</p>
        {error && <Notice kind="error">{error}</Notice>}
        <div className="tab-actions inline">
          <button className="save-btn" disabled={busy} onClick={accept}><ArchiveRestore size={16} /> {busy ? "Recuperant…" : "Acceptar"}</button>
          <button className="cancel-btn" disabled={busy} onClick={onClose}><X size={16} /> Cancel·lar</button>
        </div>
      </div>
    </div>
  );
}

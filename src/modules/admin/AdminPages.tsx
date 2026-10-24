// Pantalles de manteniment: Contractes, Industrials i Configuració (usuaris, zones, textos de correu).
// Totes segueixen el mateix patró: llista a l'esquerra, fitxa a la dreta.
import { useEffect, useState, type ReactNode } from "react";
import { Check, FileText, Mail, MapPin, Plus, Save, Users, Wrench, X } from "lucide-react";
import { CheckInput, Empty, Notice, Panel, SelectInput, TextArea, TextInput } from "../../components/ui";
import { errorText } from "../../lib/supabase";
import { LANGUAGES } from "../../lib/constants";
import { CONTRACT_FLAGS, emptyContractType, emptyIndustrial, listContractTypes, listIndustrialsFull, listProfiles, listTemplates, listZones,
  saveContractType, saveIndustrial, saveProfile, saveTemplate, saveZone, TEMPLATE_KINDS, TRADES,
  type ContractType, type Industrial, type ProfileRow, type Template } from "../../data/admin";

function PageHead({ kicker, title, text, action }: { kicker: string; title: string; text: string; action?: ReactNode }) {
  return <div className="page-title"><div><small>{kicker}</small><h1>{title}</h1><p>{text}</p></div>{action}</div>;
}

// =====================================================================
// CONTRACTES (PDF 2: taula de tipus de contracte que habilita funcions)
// =====================================================================
export function ContractsPage({ canWrite }: { canWrite: boolean }) {
  const [rows, setRows] = useState<ContractType[]>([]);
  const [sel, setSel] = useState<ContractType | null>(null);
  const [error, setError] = useState("");
  const load = () => listContractTypes().then(setRows).catch(e => setError(errorText(e)));
  useEffect(() => { void load(); }, []);

  async function save() {
    if (!sel?.description.trim()) { setError("Cal una descripció."); return; }
    try { await saveContractType(sel); setSel(null); setError(""); await load(); } catch (e) { setError(errorText(e)); }
  }

  return (
    <div className="work-area list-view">
      <PageHead kicker="CONFIGURACIÓ" title="Tipus de contracte" text="Cada tipus defineix el preu, les revisions anuals i quins serveis inclou. Les finques agafen aquestes opcions del seu contracte."
        action={canWrite && <button className="save-btn" onClick={() => setSel(emptyContractType())}><Plus size={18} /> Nou tipus</button>} />
      {error && <Notice kind="error">{error}</Notice>}
      <div className="master-detail">
        <section className="data-panel">
          <table className="mini-table">
            <thead><tr><th>Descripció</th><th>Preu</th><th>Revisions</th><th>Inclou</th><th>Finques</th></tr></thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} className={(sel?.id === c.id ? "row-sel " : "") + (!c.active ? "row-off" : "")} onClick={() => setSel({ ...c })}>
                  <td><strong>{c.description}</strong></td><td>{Number(c.price).toLocaleString("ca-ES")} €</td><td>{c.num_revisions}</td>
                  <td className="wrap">{CONTRACT_FLAGS.filter(([k]) => c[k]).map(([, l]) => l).join(" · ") || "—"}</td><td>{c.uses}</td>
                </tr>))}
              {!rows.length && <tr className="no-hover"><td colSpan={5} className="table-empty">Encara no hi ha tipus de contracte.{canWrite && " Prem «Nou tipus»."}</td></tr>}
            </tbody>
          </table>
        </section>
        {sel && (
          <Panel title={sel.id ? "Modificar tipus" : "Nou tipus de contracte"} icon={FileText}>
            <div className="form-grid">
              <TextInput label="Descripció del contracte" value={sel.description} onChange={v => setSel({ ...sel, description: v })} wide required />
              <TextInput label="Preu anual (€)" type="number" value={sel.price} onChange={v => setSel({ ...sel, price: v })} />
              <TextInput label="Núm. de revisions/any" type="number" value={sel.num_revisions} onChange={v => setSel({ ...sel, num_revisions: v })} />
              {CONTRACT_FLAGS.map(([k, l]) => <CheckInput key={k} label={l} checked={!!sel[k]} onChange={v => setSel({ ...sel, [k]: v })} />)}
              <CheckInput label="Actiu" checked={sel.active} onChange={v => setSel({ ...sel, active: v })} />
            </div>
            {canWrite && <div className="tab-actions inline"><button className="save-btn" onClick={save}><Save size={16} /> Gravar</button><button className="cancel-btn" onClick={() => setSel(null)}><X size={16} /> Cancel·lar</button></div>}
          </Panel>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// INDUSTRIALS
// =====================================================================
export function IndustrialsPage({ canWrite }: { canWrite: boolean }) {
  const [rows, setRows] = useState<Industrial[]>([]);
  const [sel, setSel] = useState<Industrial | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const load = () => listIndustrialsFull().then(setRows).catch(e => setError(errorText(e)));
  useEffect(() => { void load(); }, []);
  const list = rows.filter(r => !q || `${r.name} ${r.trade} ${r.contact}`.toLowerCase().includes(q.toLowerCase()));

  async function save() {
    if (!sel?.name.trim()) { setError("Cal el nom."); return; }
    try { await saveIndustrial(sel); setSel(null); setError(""); await load(); } catch (e) { setError(errorText(e)); }
  }

  return (
    <div className="work-area list-view">
      <PageHead kicker="CONFIGURACIÓ" title="Industrials" text="Lampistes, electricistes, jardiners… Es fan servir a les notes de servei, a les claus i a les fitxes de cada casa."
        action={canWrite && <button className="save-btn" onClick={() => setSel(emptyIndustrial())}><Plus size={18} /> Nou industrial</button>} />
      {error && <Notice kind="error">{error}</Notice>}
      <div className="master-detail">
        <section className="data-panel">
          <div className="panel-search"><input className="filter-input" placeholder="Cerca per nom, ofici o contacte…" value={q} onChange={e => setQ(e.target.value)} /></div>
          <table className="mini-table">
            <thead><tr><th>Nom</th><th>Ofici</th><th>Telèfon</th><th>E-mail</th></tr></thead>
            <tbody>
              {list.map(i => (
                <tr key={i.id} className={(sel?.id === i.id ? "row-sel " : "") + (!i.active ? "row-off" : "")} onClick={() => setSel({ ...i })}>
                  <td><strong>{i.name}</strong></td><td>{i.trade}</td><td>{i.phone}</td><td>{i.email}</td>
                </tr>))}
              {!list.length && <tr className="no-hover"><td colSpan={4} className="table-empty">No hi ha industrials.</td></tr>}
            </tbody>
          </table>
        </section>
        {sel && (
          <Panel title={sel.id ? "Fitxa de l'industrial" : "Nou industrial"} icon={Wrench}>
            <datalist id="trades">{TRADES.map(t => <option key={t} value={t} />)}</datalist>
            <div className="form-grid">
              <TextInput label="Nom / empresa" value={sel.name} onChange={v => setSel({ ...sel, name: v })} wide required />
              <TextInput label="Ofici" value={sel.trade} onChange={v => setSel({ ...sel, trade: v })} list="trades" />
              <TextInput label="Persona de contacte" value={sel.contact} onChange={v => setSel({ ...sel, contact: v })} />
              <TextInput label="Telèfon" value={sel.phone} onChange={v => setSel({ ...sel, phone: v })} />
              <TextInput label="E-mail (per enviar notes)" type="email" value={sel.email} onChange={v => setSel({ ...sel, email: v })} />
              <TextArea label="Observacions" value={sel.observations} onChange={v => setSel({ ...sel, observations: v })} />
              <CheckInput label="Actiu" checked={sel.active} onChange={v => setSel({ ...sel, active: v })} />
            </div>
            {canWrite && <div className="tab-actions inline"><button className="save-btn" onClick={save}><Save size={16} /> Gravar</button><button className="cancel-btn" onClick={() => setSel(null)}><X size={16} /> Cancel·lar</button></div>}
          </Panel>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// CONFIGURACIÓ: usuaris, zones, textos de correu
// =====================================================================
export function ConfigPage({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<"usuaris" | "zones" | "textos">("usuaris");
  return (
    <div className="work-area list-view">
      <PageHead kicker="ADMINISTRACIÓ" title="Configuració" text={isAdmin ? "Usuaris i permisos, zones i textos dels correus als propietaris." : "Només els administradors poden canviar la configuració."} />
      <div className="record-tabs">
        {([["usuaris", "Usuaris i permisos", Users], ["zones", "Zones", MapPin], ["textos", "Textos de correu", Mail]] as const).map(([id, l, I]) =>
          <button key={id} className={tab === id ? "selected" : ""} onClick={() => setTab(id)}><I size={17} /><span>{l}</span></button>)}
      </div>
      <div className="tab-pad">
        {tab === "usuaris" ? <UsersTab isAdmin={isAdmin} /> : tab === "zones" ? <ZonesTab isAdmin={isAdmin} /> : <TemplatesTab isAdmin={isAdmin} />}
      </div>
    </div>
  );
}

function UsersTab({ isAdmin }: { isAdmin: boolean }) {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const load = () => listProfiles().then(setRows).catch(e => setError(errorText(e)));
  useEffect(() => { void load(); }, []);
  const upd = (i: number, patch: Partial<ProfileRow>) => setRows(r => r.map((x, j) => j === i ? { ...x, ...patch } : x));
  return (
    <Panel title="Usuaris" icon={Users}>
      {error && <Notice kind="error">{error}</Notice>}
      {ok && <Notice kind="ok">{ok}</Notice>}
      <table className="mini-table">
        <thead><tr><th>Nom</th><th>E-mail</th><th>Permís</th><th>Responsable</th><th>Actiu</th><th></th></tr></thead>
        <tbody>{rows.map((p, i) => (
          <tr key={p.id} className="no-hover">
            <td><input className="cell-input" value={p.full_name} disabled={!isAdmin} onChange={e => upd(i, { full_name: e.target.value })} /></td>
            <td>{p.email}</td>
            <td><select className="cell-input" value={p.role} disabled={!isAdmin} onChange={e => upd(i, { role: e.target.value })}>
              <option value="admin">Administrador</option><option value="oficina">Oficina (crear i modificar)</option><option value="consulta">Només consulta</option></select></td>
            <td><input type="checkbox" checked={p.is_responsible} disabled={!isAdmin} onChange={e => upd(i, { is_responsible: e.target.checked })} /></td>
            <td><input type="checkbox" checked={p.active} disabled={!isAdmin} onChange={e => upd(i, { active: e.target.checked })} /></td>
            <td>{isAdmin && <button className="outline-btn small" onClick={async () => { try { await saveProfile(p); setOk("Desat: " + (p.full_name || p.email)); setError(""); } catch (e) { setError(errorText(e)); } }}><Check size={13} /> Desar</button>}</td>
          </tr>))}
        </tbody>
      </table>
      <p className="hint">Per afegir un usuari nou: Supabase → Authentication → Add user (o Invite). Apareixerà aquí amb permís «Només consulta» i el pots canviar.</p>
    </Panel>
  );
}

function ZonesTab({ isAdmin }: { isAdmin: boolean }) {
  const [rows, setRows] = useState<{ code: number; name: string }[]>([]);
  const [nw, setNw] = useState({ code: "", name: "" });
  const [error, setError] = useState("");
  const load = () => listZones().then(setRows).catch(e => setError(errorText(e)));
  useEffect(() => { void load(); }, []);
  return (
    <Panel title="Zones" icon={MapPin}>
      {error && <Notice kind="error">{error}</Notice>}
      <table className="mini-table">
        <thead><tr><th>Codi</th><th>Nom</th><th></th></tr></thead>
        <tbody>
          {rows.map((z, i) => (
            <tr key={z.code} className="no-hover"><td>{z.code}</td>
              <td><input className="cell-input" value={z.name} disabled={!isAdmin} onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></td>
              <td>{isAdmin && <button className="outline-btn small" onClick={() => saveZone(z.code, z.name, false).then(load).catch(e => setError(errorText(e)))}><Check size={13} /> Desar</button>}</td></tr>))}
          {isAdmin && <tr className="no-hover"><td><input className="cell-input" type="number" placeholder="Codi" value={nw.code} onChange={e => setNw({ ...nw, code: e.target.value })} /></td>
            <td><input className="cell-input" placeholder="Nom de la zona" value={nw.name} onChange={e => setNw({ ...nw, name: e.target.value })} /></td>
            <td><button className="add-small" disabled={!nw.code || !nw.name} onClick={() => saveZone(Number(nw.code), nw.name, true).then(() => { setNw({ code: "", name: "" }); return load(); }).catch(e => setError(errorText(e)))}><Plus size={13} /> Afegir</button></td></tr>}
        </tbody>
      </table>
    </Panel>
  );
}

function TemplatesTab({ isAdmin }: { isAdmin: boolean }) {
  const [rows, setRows] = useState<Template[]>([]);
  const [sel, setSel] = useState<Template | null>(null);
  const [error, setError] = useState("");
  const load = () => listTemplates().then(setRows).catch(e => setError(errorText(e)));
  useEffect(() => { void load(); }, []);
  const langName = (l: string) => LANGUAGES.find(x => x[0] === l)?.[1] || l;
  return (
    <div className="master-detail">
      <Panel title="Textos del correu al propietari, per idioma" icon={Mail}
        action={isAdmin && <button className="add-small" onClick={() => setSel({ kind: "revisio_ok", language: "ca", subject: "Revisió casa {{finca}}", body: "", reviewed: true })}><Plus size={13} /> Nou text</button>}>
        {error && <Notice kind="error">{error}</Notice>}
        {rows.some(t => !t.reviewed) && <Notice>Hi ha {rows.filter(t => !t.reviewed).length} textos traduïts pendents de revisar. Obre'ls, corregeix el que calgui i grava'ls amb «Revisat» marcat.</Notice>}
        {!rows.length ? <Empty>No hi ha textos.</Empty> : (
          <table className="mini-table"><thead><tr><th>Tipus</th><th>Idioma</th><th>Assumpte</th><th>Estat</th></tr></thead>
            <tbody>{rows.map(t => <tr key={t.id} className={sel?.id === t.id ? "row-sel" : ""} onClick={() => setSel({ ...t })}><td>{TEMPLATE_KINDS.find(k => k[0] === t.kind)?.[1] || t.kind}</td><td>{langName(t.language)}</td><td>{t.subject}</td>
              <td>{t.reviewed ? <span className="status-pill status-ok">Revisat</span> : <span className="status-pill status-warn">Pendent de revisar</span>}</td></tr>)}</tbody></table>
        )}
        <p className="hint">Es pot fer servir <code>{"{{finca}}"}</code>, <code>{"{{data}}"}</code>, <code>{"{{client}}"}</code> i <code>{"{{incidencies}}"}</code> (llista d'elements en mal estat). Si un client té un idioma sense text, s'envia en anglès.</p>
      </Panel>
      {sel && (
        <Panel title={sel.id ? "Modificar text" : "Nou text"} icon={Mail}>
          <div className="form-grid">
            <SelectInput label="Tipus" value={sel.kind} onChange={v => setSel({ ...sel, kind: v })} options={TEMPLATE_KINDS} />
            <SelectInput label="Idioma" value={sel.language} onChange={v => setSel({ ...sel, language: v })} options={LANGUAGES} />
            <TextInput label="Assumpte" value={sel.subject} onChange={v => setSel({ ...sel, subject: v })} wide />
            <TextArea label="Text del correu" value={sel.body} onChange={v => setSel({ ...sel, body: v })} rows={12} />
            <CheckInput label="Revisat (el text és correcte i es pot enviar)" checked={sel.reviewed} onChange={v => setSel({ ...sel, reviewed: v })} />
          </div>
          {isAdmin && <div className="tab-actions inline"><button className="save-btn" onClick={() => saveTemplate(sel).then(() => { setSel(null); return load(); }).catch(e => setError(errorText(e)))}><Save size={16} /> Gravar</button><button className="cancel-btn" onClick={() => setSel(null)}><X size={16} /> Cancel·lar</button></div>}
        </Panel>
      )}
    </div>
  );
}

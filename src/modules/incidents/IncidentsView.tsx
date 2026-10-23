// Incidències com al programa antic (llista a l'esquerra, dades a la dreta) però:
//  · sense hora, temps, queixa/felicitació ni albarans (ratllats al PDF)
//  · amb «cal gestionar» sí/no, estat, client + finca + industrial
//  · amb notes de servei: PDF per imprimir, enviament per correu a l'industrial i seguiment
// Es fa servir a la pantalla global d'Incidències i a la pestanya de la fitxa del client.
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, FileText, Mail, Pencil, Plus, Printer, Save, Trash2, Wrench, X } from "lucide-react";
import { CheckInput, Empty, Notice, Panel, SelectInput, TextArea, TextInput } from "../../components/ui";
import { SearchSelect } from "../../components/SearchSelect";
import { errorText } from "../../lib/supabase";
import { fmtDate, todayISO } from "../../lib/format";
import { CHANNELS, deleteIncident, emptyIncident, emptyNote, listIncidents, listNotes, NOTE_STATUSES, noteText, saveIncident, saveNote, setNoteStatus, STATUSES, type Incident, type ServiceNote } from "../../data/incidents";
import { listIndustrialsFull, TRADES, type Industrial } from "../../data/admin";
import { profilePick, propertyPickList, type PropertyPick } from "../../data/global";

const lbl = (l: [string, string][], v: string) => l.find(x => x[0] === v)?.[1] || v;

interface Props {
  canWrite: boolean;
  userId: string;
  clientId?: string;           // fitxa del client: només les seves incidències
  propertyId?: string | null;  // finca seleccionada (per defecte a l'alta)
  onOpenClient?: (id: string) => void;
}

export function IncidentsView({ canWrite, userId, clientId, propertyId, onOpenClient }: Props) {
  const [rows, setRows] = useState<Incident[] | null>(null);
  const [sel, setSel] = useState<Incident | null>(null);
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState<"obertes" | "gestionar" | "tancades" | "totes">("obertes");
  const [onlyFinca, setOnlyFinca] = useState(false);
  const [q, setQ] = useState("");
  const [props, setProps] = useState<PropertyPick[]>([]);
  const [people, setPeople] = useState<{ id: string; name: string; email: string }[]>([]);
  const [inds, setInds] = useState<Industrial[]>([]);
  const [error, setError] = useState("");

  const load = (keep?: string) => listIncidents({ clientId }).then(r => {
    setRows(r);
    if (keep) setSel(r.find(x => x.id === keep) || null);
  }).catch(e => setError(errorText(e)));
  useEffect(() => { setSel(null); setEditing(false); void load(); }, [clientId]);
  useEffect(() => {
    propertyPickList().then(setProps).catch(() => {});
    profilePick().then(setPeople).catch(() => {});
    listIndustrialsFull().then(setInds).catch(() => {});
  }, []);

  const propItems = useMemo(() => (clientId ? props.filter(p => p.client_id === clientId) : props), [props, clientId]);
  const list = (rows || []).filter(i =>
    (filter === "totes" || (filter === "tancades" ? i.status === "tancada" : i.status !== "tancada" && (filter === "obertes" || i.requires_management))) &&
    (!onlyFinca || !propertyId || i.property_id === propertyId) &&
    (!q || `${i.description} ${i.client_name} ${i.finca} ${i.reporter}`.toLowerCase().includes(q.toLowerCase())));

  function startNew() {
    const p = propertyId ? props.find(x => x.id === propertyId) : undefined;
    setSel(emptyIncident(userId, clientId || p?.client_id || "", propertyId || ""));
    setEditing(true); setError("");
  }

  async function save() {
    if (!sel) return;
    if (!sel.description.trim()) { setError("Cal escriure l'explicació de la incidència."); return; }
    try { const id = await saveIncident(sel); setEditing(false); setError(""); await load(id); }
    catch (e) { setError("No s'ha pogut desar: " + errorText(e)); }
  }

  async function remove() {
    if (!sel?.id) return;
    if (!window.confirm("Esborrar aquesta incidència? També s'esborraran les seves notes de servei.")) return;
    try { await deleteIncident(sel.id); setSel(null); await load(); } catch (e) { setError(errorText(e)); }
  }

  const prop = sel ? props.find(p => p.id === sel.property_id) : undefined;

  return (
    <div className="incidents-view">
      {error && <Notice kind="error">{error}</Notice>}
      <div className="filter-bar">
        {([["obertes", "Obertes"], ["gestionar", "Cal gestionar"], ["tancades", "Tancades"], ["totes", "Totes"]] as const).map(([k, l]) =>
          <button key={k} className={"year-chip" + (filter === k ? " on" : "")} onClick={() => setFilter(k)}>{l}</button>)}
        {clientId && propertyId && <label className="chk-inline"><input type="checkbox" checked={onlyFinca} onChange={e => setOnlyFinca(e.target.checked)} /> Només la finca seleccionada</label>}
        <input className="filter-input" placeholder="Cerca…" value={q} onChange={e => setQ(e.target.value)} />
        {canWrite && <button className="save-btn" onClick={startNew}><Plus size={16} /> Alta incidència</button>}
      </div>

      <div className="inc-layout">
        <section className="data-panel inc-list">
          <div className="data-panel-title"><AlertTriangle size={18} /><strong>Relació</strong><span className="panel-action muted">{list.length}</span></div>
          {!rows ? <Empty>Carregant…</Empty> : (
            <table className="mini-table">
              <thead><tr><th>Data</th><th>Qui</th>{!clientId && <th>Client</th>}<th>Immoble</th><th>Estat</th></tr></thead>
              <tbody>
                {list.map(i => (
                  <tr key={i.id} className={(sel?.id === i.id ? "row-sel " : "") + (i.status === "tancada" ? "row-off" : "")} onClick={() => { if (!editing) setSel(i); }}>
                    <td>{fmtDate(i.incident_date)}</td><td>{i.reporter}</td>{!clientId && <td>{i.client_name}</td>}
                    <td className="wrap">{i.finca}</td>
                    <td>{i.status === "tancada" ? "Tancada" : <span className={"status-pill " + (i.requires_management ? "status-warn" : "status-ok")}>{i.requires_management ? "Gestionar" : "Informativa"}</span>}
                      {!!i.open_notes && <small className="block muted">{i.open_notes} nota(es) oberta(es)</small>}</td>
                  </tr>))}
                {!list.length && <tr className="no-hover"><td colSpan={5} className="table-empty">No hi ha incidències amb aquest filtre.</td></tr>}
              </tbody>
            </table>
          )}
        </section>

        <div className="inc-detail">
          {!sel ? <Panel title="Dades de la incidència" icon={AlertTriangle}><Empty>Selecciona una incidència de la llista{canWrite ? " o prem «Alta incidència»" : ""}.</Empty></Panel> : (
            <>
              <Panel title={sel.id ? "Dades de la incidència" : "Nova incidència"} icon={AlertTriangle}
                action={canWrite && !editing && <span className="h3-actions">
                  <button className="add-small" onClick={() => setEditing(true)}><Pencil size={13} /> Modificar</button>
                  <button className="add-small danger" onClick={remove}><Trash2 size={13} /> Esborrar</button></span>}>
                <div className="form-grid">
                  <TextInput label="Data" type="date" value={sel.incident_date} readOnly={!editing} onChange={v => setSel({ ...sel, incident_date: v })} />
                  {editing ? <SelectInput label="Qui l'atén" value={sel.reported_by} onChange={v => setSel({ ...sel, reported_by: v })} options={people.map(p => [p.id, p.name] as [string, string])} empty="—" />
                    : <TextInput label="Qui l'atén" value={sel.reporter || people.find(p => p.id === sel.reported_by)?.name || ""} readOnly />}
                  {editing ? <SelectInput label="Mitjà" value={sel.channel} onChange={v => setSel({ ...sel, channel: v })} options={CHANNELS} />
                    : <TextInput label="Mitjà" value={lbl(CHANNELS, sel.channel)} readOnly />}
                  {editing ? <SelectInput label="Estat" value={sel.status} onChange={v => setSel({ ...sel, status: v })} options={STATUSES} />
                    : <TextInput label="Estat" value={lbl(STATUSES, sel.status)} readOnly />}
                  <div className="f-wide">
                    <SearchSelect label="Immoble" items={propItems} value={sel.property_id} disabled={!editing}
                      onChange={(id, it) => setSel({ ...sel, property_id: id, client_id: clientId || it?.client_id || sel.client_id })} />
                  </div>
                  {editing ? <SelectInput label="Industrial" value={sel.industrial_id} onChange={v => setSel({ ...sel, industrial_id: v })} options={inds.filter(i => i.active).map(i => [i.id!, `${i.name}${i.trade ? ` (${i.trade})` : ""}`] as [string, string])} empty="—" />
                    : <TextInput label="Industrial" value={inds.find(i => i.id === sel.industrial_id)?.name || ""} readOnly />}
                  <CheckInput label="Cal gestionar-la (no és només informativa)" checked={sel.requires_management} onChange={v => editing && setSel({ ...sel, requires_management: v })} />
                  <label className="f f-wide"><span>Explicació de la incidència</span>
                    <textarea rows={6} value={sel.description} readOnly={!editing} onChange={e => setSel({ ...sel, description: e.target.value })} /></label>
                </div>
                {!clientId && sel.client_id && onOpenClient && <button className="link-btn" onClick={() => onOpenClient(sel.client_id)}>Obrir la fitxa del client {sel.client_name}</button>}
                {editing && (
                  <div className="tab-actions inline">
                    <button className="save-btn" onClick={save}><Save size={16} /> Gravar</button>
                    <button className="cancel-btn" onClick={() => { setEditing(false); setError(""); setSel(sel.id ? rows!.find(r => r.id === sel.id) || null : null); }}><X size={16} /> Cancel·lar</button>
                  </div>
                )}
              </Panel>
              {sel.id && !editing && <ServiceNotes incident={sel} prop={prop} inds={inds} people={people} canWrite={canWrite} userId={userId} onChanged={() => load(sel.id)} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Notes de servei d'una incidència
// ---------------------------------------------------------------------
function ServiceNotes({ incident, prop, inds, people, canWrite, userId, onChanged }: {
  incident: Incident; prop?: PropertyPick; inds: Industrial[]; people: { id: string; name: string }[];
  canWrite: boolean; userId: string; onChanged: () => void;
}) {
  const [notes, setNotes] = useState<ServiceNote[] | null>(null);
  const [edit, setEdit] = useState<ServiceNote | null>(null);
  const [error, setError] = useState("");
  const load = () => listNotes(incident.id!).then(setNotes).catch(e => setError(errorText(e)));
  useEffect(() => { setEdit(null); void load(); }, [incident.id]);
  const ctx = { finca: incident.finca || prop?.label || "", client: incident.client_name || prop?.client_name || "" };
  const who = (id?: string) => people.find(p => p.id === id)?.name || "";
  const indOpts = inds.filter(i => i.active).map(i => [i.id!, `${i.name}${i.trade ? ` (${i.trade})` : ""}`] as [string, string]);

  async function run(fn: () => Promise<void>) { setError(""); try { await fn(); await load(); onChanged(); } catch (e) { setError(errorText(e)); } }

  function sendMail(n: ServiceNote) {
    const ind = inds.find(i => i.id === n.industrial_id);
    if (!ind?.email) { setError("L'industrial no té e-mail. Afegeix-lo a Industrials o imprimeix la nota."); return; }
    window.location.href = `mailto:${ind.email}?subject=${encodeURIComponent(`Nota de servei nº ${n.note_number} · ${ctx.finca}`)}&body=${encodeURIComponent(noteText(n, ctx))}`;
    setTimeout(() => { if (window.confirm("S'ha obert el correu. Marcar la nota com a ENVIADA?")) void run(() => setNoteStatus(n.id!, "enviada", userId, ind.email)); }, 600);
  }

  function print(n: ServiceNote) {
    const ind = inds.find(i => i.id === n.industrial_id);
    const alt = inds.find(i => i.id === n.industrial_alt_id);
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) { setError("El navegador ha bloquejat la finestra. Permet les finestres emergents."); return; }
    const e = (t: string) => t.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    const row = (k: string, v?: string) => v ? `<tr><th>${k}</th><td>${e(v)}</td></tr>` : "";
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Nota de servei ${n.note_number}</title>
      <style>body{font:14px Arial,sans-serif;color:#1d2f28;margin:40px}h1{font-size:22px;color:#174c40;margin:0}header{display:flex;justify-content:space-between;border-bottom:3px solid #174c40;padding-bottom:10px;margin-bottom:18px}
      table{width:100%;border-collapse:collapse;margin:10px 0}th{width:180px;text-align:left;color:#56645b;font-weight:600;padding:6px 8px;vertical-align:top}td{padding:6px 8px;border-bottom:1px solid #e6dfd1}
      .box{border:1px solid #cfc7b8;border-radius:6px;padding:12px;min-height:120px;white-space:pre-wrap}.small{color:#7b817d;font-size:12px;margin-top:30px}
      @media print{button{display:none}body{margin:15mm}}</style></head><body>
      <header><div><h1>NOTA DE SERVEI</h1><div>MareMontis · Administració</div></div><div style="text-align:right"><strong style="font-size:20px">Nº ${n.note_number ?? ""}</strong><br>${new Date().toLocaleDateString("ca-ES")}</div></header>
      <table>${row("Immoble", ctx.finca)}${row("Propietari", ctx.client)}${row("Industrial", ind ? `${ind.name}${ind.phone ? " · " + ind.phone : ""}` : "")}${row("2a opció", alt?.name)}
      ${row("Tipus de feina", n.trade)}${row("Departament", n.department)}${row("Claus", [n.key_location, n.other_locations].filter(Boolean).join(" · "))}
      ${row("Mòbil de contacte", n.contact_mobile)}${row("Termini", [n.limit_from, n.limit_to].filter(Boolean).map(x => x.replace("T", " ")).join(" → "))}</table>
      <h3>Feina a fer</h3><div class="box">${e(n.description)}</div>
      ${n.notice_text ? `<h3>Nota d'avís</h3><div class="box" style="min-height:40px">${e(n.notice_text)}</div>` : ""}
      <p class="small">Sense facturació associada. Si us plau, aviseu quan la feina estigui feta.</p>
      <button onclick="print()">Imprimir / Desar com a PDF</button></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  return (
    <Panel title="Notes de servei" icon={FileText}
      action={canWrite && !edit && <button className="add-small" onClick={() => setEdit(emptyNote(incident, prop?.key_office || ""))}><Plus size={13} /> Nova nota</button>}>
      {error && <Notice kind="error">{error}</Notice>}
      {edit && (
        <div className="note-form">
          <datalist id="trades2">{TRADES.map(t => <option key={t} value={t} />)}</datalist>
          <div className="form-grid">
            <TextInput label="Origen" value={edit.origin} onChange={v => setEdit({ ...edit, origin: v })} />
            <TextInput label="Departament" value={edit.department} onChange={v => setEdit({ ...edit, department: v })} placeholder="Lloguers turístics, administració…" />
            <TextInput label="Tipus d'industrial" value={edit.trade} onChange={v => setEdit({ ...edit, trade: v })} list="trades2" />
            <SelectInput label="Industrial preferent" value={edit.industrial_id} onChange={v => setEdit({ ...edit, industrial_id: v })} options={indOpts} empty="—" />
            <SelectInput label="2a opció" value={edit.industrial_alt_id} onChange={v => setEdit({ ...edit, industrial_alt_id: v })} options={indOpts} empty="—" />
            <TextInput label="Mòbil de contacte" value={edit.contact_mobile} onChange={v => setEdit({ ...edit, contact_mobile: v })} />
            <TextInput label="Claus (on són)" value={edit.key_location} onChange={v => setEdit({ ...edit, key_location: v })} />
            <TextInput label="Altres ubicacions" value={edit.other_locations} onChange={v => setEdit({ ...edit, other_locations: v })} />
            <TextInput label="Límit des de" type="datetime-local" value={edit.limit_from} onChange={v => setEdit({ ...edit, limit_from: v })} />
            <TextInput label="Límit fins a" type="datetime-local" value={edit.limit_to} onChange={v => setEdit({ ...edit, limit_to: v })} />
            <TextArea label="Feina a fer" value={edit.description} onChange={v => setEdit({ ...edit, description: v })} rows={4} />
            <TextArea label="Text opcional de la nota d'avís" value={edit.notice_text} onChange={v => setEdit({ ...edit, notice_text: v })} rows={2} />
          </div>
          <div className="tab-actions inline">
            <button className="save-btn" disabled={!edit.description.trim()} onClick={() => run(async () => { await saveNote(edit); setEdit(null); })}><Save size={16} /> Gravar nota</button>
            <button className="cancel-btn" onClick={() => setEdit(null)}><X size={16} /> Cancel·lar</button>
          </div>
        </div>
      )}
      {!notes ? <Empty>Carregant…</Empty> : !notes.length && !edit ? <Empty>Encara no hi ha cap nota de servei per a aquesta incidència.</Empty> : notes.map(n => (
        <div key={n.id} className={"note-card st-" + n.status}>
          <header>
            <strong>Nº {n.note_number} · {n.industrial_name || "Sense industrial"}{n.trade ? ` (${n.trade})` : ""}</strong>
            <span className={"status-pill " + (n.status === "completada" ? "status-ok" : n.status === "anul·lada" ? "" : "status-warn")}>{lbl(NOTE_STATUSES, n.status)}</span>
          </header>
          <p>{n.description}</p>
          <small className="muted">
            Creada per {who(n.created_by) || "—"} el {fmtDate(n.created_at)}
            {n.updated_by && n.updated_by !== n.created_by ? ` · modificada per ${who(n.updated_by)}` : ""}
            {n.sent_at ? ` · enviada ${fmtDate(n.sent_at)} a ${n.sent_to}` : ""}
            {n.completed_at ? ` · feina feta ${fmtDate(n.completed_at)}` : ""}
          </small>
          <div className="note-actions">
            <button className="outline-btn small" onClick={() => print(n)}><Printer size={13} /> PDF / Imprimir</button>
            {canWrite && <>
              <button className="outline-btn small" onClick={() => sendMail(n)}><Mail size={13} /> Enviar a l'industrial</button>
              {n.status !== "completada" && <button className="outline-btn small" onClick={() => run(() => setNoteStatus(n.id!, "completada", userId))}><Check size={13} /> Feina feta</button>}
              {n.status !== "pendent" && <button className="link-btn" onClick={() => run(() => setNoteStatus(n.id!, "pendent", userId))}>Tornar a pendent</button>}
              <button className="link-btn" onClick={() => setEdit({ ...n })}><Pencil size={12} /> Modificar</button>
            </>}
          </div>
        </div>
      ))}
      <p className="hint"><Wrench size={11} /> Les notes de servei no es facturen. Avui: {fmtDate(todayISO())}.</p>
    </Panel>
  );
}

// Pantalles globals d'Alertes i de Claus.
//  · Alertes (PDF 2): registre per data a l'inici, crear-ne per a qualsevol client, checklist,
//    passar al calendari o per correu, i històric de completades de 6 mesos.
//  · Claus (PDF pàg. 7 + PDF 2): totes les claus que són fora, retorns i alerta de fora de termini.
import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarPlus, Check, KeyRound, Mail, Plus, RotateCcw, X } from "lucide-react";
import { Empty, Notice, Panel, TextArea, TextInput } from "../../components/ui";
import { SearchSelect } from "../../components/SearchSelect";
import { ExportButtons } from "../../components/ExportButtons";
import { errorText } from "../../lib/supabase";
import { addDaysISO, fmtDate, todayISO } from "../../lib/format";
import { completeAlert, createAlert, updateAlert } from "../../data/alerts";
import { alertsToIcs, downloadText, listAllAlerts, listAllKeys, propertyPickList, type AlertRow, type KeyRow, type PropertyPick } from "../../data/global";
import { clientPickList, createKeyMove, listIndustrials, returnKey } from "../../data/finques";

const TYPE_LABEL: Record<string, string> = { manual: "Manual", caducitat_document: "Document", naixement: "Aniversari", claus: "Claus", venciment: "Venciment" };

export function AlertsPage({ canWrite, userId, onOpenClient }: { canWrite: boolean; userId?: string; onOpenClient: (id: string) => void }) {
  const [rows, setRows] = useState<AlertRow[] | null>(null);
  const [filter, setFilter] = useState<"pendents" | "vencudes" | "setmana" | "completades" | "totes">("pendents");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [clients, setClients] = useState<{ id: string; label: string }[]>([]);
  const [draft, setDraft] = useState({ client_id: "", title: "", content: "", due_date: todayISO(), checklist: "" });
  const [error, setError] = useState("");

  const load = () => listAllAlerts().then(setRows).catch(e => setError(errorText(e)));
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (adding && !clients.length) clientPickList().then(c => setClients(c.map(x => ({ id: x.id, label: `${x.name} (${x.code})` })))).catch(() => {}); }, [adding]);

  const today = todayISO(), in7 = addDaysISO(today, 7);
  const list = useMemo(() => (rows || []).filter(a =>
    (filter === "totes" ? true : filter === "completades" ? !!a.completed_at : !a.completed_at && (filter === "pendents" || (filter === "vencudes" ? a.overdue : a.due_date >= today && a.due_date <= in7))) &&
    (!type || a.alert_type === type) &&
    (!q || `${a.title} ${a.client_name} ${a.finca} ${a.content}`.toLowerCase().includes(q.toLowerCase()))), [rows, filter, type, q]);
  const counts = { pendents: (rows || []).filter(a => !a.completed_at).length, vencudes: (rows || []).filter(a => a.overdue).length };

  async function run(fn: () => Promise<void>) { setError(""); try { await fn(); await load(); } catch (e) { setError(errorText(e)); } }

  return (
    <div className="work-area list-view">
      <div className="page-title"><div><small>SEGUIMENT</small><h1>Alertes</h1><p>Totes les alertes per data. Les completades passen a l'històric durant 6 mesos.</p></div>
        <div className="head-actions">
          <button className="cancel-btn" disabled={!list.length} onClick={() => downloadText("alertes.ics", alertsToIcs(list), "text/calendar")}><CalendarPlus size={16} /> Passar al calendari (.ics)</button>
          <ExportButtons disabled={!list.length} table={() => ({ fileName: "alertes", title: "Alertes",
            subtitle: [{ pendents: "Pendents", vencudes: "Vençudes", setmana: "Pròxims 7 dies", completades: "Completades", totes: "Totes" }[filter], type ? TYPE_LABEL[type] || type : "", q ? `Cerca «${q}»` : ""].filter(Boolean).join(" · "),
            head: ["Data", "Tipus", "Títol", "Client", "Finca", "Observacions", "Completada"],
            rows: list.map(a => [fmtDate(a.due_date), TYPE_LABEL[a.alert_type] || a.alert_type, a.title, a.client_name, a.finca, a.content, fmtDate(a.completed_at)]) })} />
          {canWrite && <button className="save-btn" onClick={() => setAdding(a => !a)}><Plus size={18} /> Nova alerta</button>}
        </div>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {adding && (
        <Panel title="Nova alerta" icon={Bell}>
          <div className="form-grid three">
            <SearchSelect label="Client" items={clients} value={draft.client_id} onChange={id => setDraft({ ...draft, client_id: id })} />
            <TextInput label="Títol" value={draft.title} onChange={v => setDraft({ ...draft, title: v })} required />
            <TextInput label="Data de gestió" type="date" value={draft.due_date} onChange={v => setDraft({ ...draft, due_date: v })} />
            <TextArea label="Observacions" value={draft.content} onChange={v => setDraft({ ...draft, content: v })} rows={2} />
            <TextArea label="Checklist (una tasca per línia)" value={draft.checklist} onChange={v => setDraft({ ...draft, checklist: v })} rows={2} />
          </div>
          <div className="tab-actions inline">
            <button className="save-btn" disabled={!draft.title.trim()} onClick={() => run(async () => {
              await createAlert({ client_id: draft.client_id || undefined, title: draft.title.trim(), content: draft.content, due_date: draft.due_date,
                checklist: draft.checklist.split("\n").map(t => t.trim()).filter(Boolean).map(text => ({ text, done: false })) });
              setAdding(false); setDraft({ client_id: "", title: "", content: "", due_date: todayISO(), checklist: "" });
            })}><Check size={16} /> Crear alerta</button>
            <button className="cancel-btn" onClick={() => setAdding(false)}><X size={16} /> Cancel·lar</button>
          </div>
        </Panel>
      )}
      <div className="filter-bar">
        {([["pendents", `Pendents (${counts.pendents})`], ["vencudes", `Vençudes (${counts.vencudes})`], ["setmana", "Pròxims 7 dies"], ["completades", "Històric completades"], ["totes", "Totes"]] as const).map(([k, l]) =>
          <button key={k} className={"year-chip" + (filter === k ? " on" : "")} onClick={() => setFilter(k)}>{l}</button>)}
        <select className="filter-input small" value={type} onChange={e => setType(e.target.value)}><option value="">Tots els tipus</option>{Object.entries(TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <input className="filter-input" placeholder="Cerca…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <section className="data-panel">
        {!rows ? <Empty>Carregant…</Empty> : (
          <table className="mini-table">
            <thead><tr><th>Data</th><th>Alerta</th><th>Client</th><th>Finca</th><th>Tipus</th><th>Checklist</th><th></th></tr></thead>
            <tbody>
              {list.map(a => (
                <tr key={a.id} className={(a.overdue ? "row-warn " : "") + (a.completed_at ? "row-off" : "")}>
                  <td>{canWrite && !a.completed_at ? <input type="date" className="cell-input" value={a.due_date} onChange={e => run(() => updateAlert(a.id, { due_date: e.target.value || null }))} /> : fmtDate(a.due_date)}</td>
                  <td className="wrap"><strong>{a.title}</strong>{a.content && <small className="block muted">{a.content}</small>}</td>
                  <td>{a.client_id ? <button className="link-btn" onClick={() => onOpenClient(a.client_id!)}>{a.client_name}</button> : "—"}</td>
                  <td className="wrap">{a.finca}</td>
                  <td>{TYPE_LABEL[a.alert_type] || a.alert_type}</td>
                  <td className="wrap">{a.checklist.map((c, i) => (
                    <label key={i} className="chk-inline"><input type="checkbox" checked={c.done} disabled={!canWrite || !!a.completed_at}
                      onChange={() => run(() => updateAlert(a.id, { checklist: a.checklist.map((x, j) => j === i ? { ...x, done: !x.done } : x) }))} /> {c.text}</label>))}</td>
                  <td className="actions-cell">
                    <a className="icon-link" title="Enviar per correu" href={`mailto:?subject=${encodeURIComponent(a.title)}&body=${encodeURIComponent([a.client_name, a.finca, "Data: " + fmtDate(a.due_date), a.content].filter(Boolean).join("\n"))}`}><Mail size={15} /></a>
                    {canWrite && (a.completed_at
                      ? <button className="link-btn" onClick={() => run(() => completeAlert(a.id, userId, false))}><RotateCcw size={12} /> Reobrir</button>
                      : <button className="outline-btn small" onClick={() => run(() => completeAlert(a.id, userId))}><Check size={13} /> Completada</button>)}
                  </td>
                </tr>))}
              {!list.length && <tr className="no-hover"><td colSpan={7} className="table-empty">No hi ha alertes amb aquest filtre.</td></tr>}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// =====================================================================
export function KeysPage({ canWrite, userId, onOpenClient }: { canWrite: boolean; userId?: string; onOpenClient: (id: string) => void }) {
  const [rows, setRows] = useState<KeyRow[] | null>(null);
  const [filter, setFilter] = useState<"fora" | "termini" | "totes">("fora");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [props, setProps] = useState<PropertyPick[]>([]);
  const [inds, setInds] = useState<[string, string][]>([]);
  const blank = () => ({ property_id: "", delivered_at: todayISO(), industrial_id: "", delivered_to: "", reason: "", observations: "", expected_return: addDaysISO(todayISO(), 7) });
  const [f, setF] = useState(blank());
  const [error, setError] = useState("");

  const load = () => listAllKeys().then(setRows).catch(e => setError(errorText(e)));
  useEffect(() => { void load(); }, []);
  // Només finques amb un contracte que inclou la custòdia de claus
  useEffect(() => { if (adding && !props.length) { propertyPickList().then(l => setProps(l.filter(p => p.key_custody))).catch(() => {}); listIndustrials().then(setInds).catch(() => {}); } }, [adding]);

  const list = (rows || []).filter(k => (filter === "totes" || (!k.returned_at && (filter === "fora" || k.overdue))) &&
    (!q || `${k.finca} ${k.admin_number} ${k.client_name} ${k.delivered_to} ${k.reason}`.toLowerCase().includes(q.toLowerCase())));
  async function run(fn: () => Promise<void>) { setError(""); try { await fn(); await load(); } catch (e) { setError(errorText(e)); } }
  const out = (rows || []).filter(k => !k.returned_at).length, late = (rows || []).filter(k => k.overdue).length;

  return (
    <div className="work-area list-view">
      <div className="page-title"><div><small>CONTROL</small><h1>Claus</h1><p>Entregues i retorns de les claus de totes les finques. Retorn previst: una setmana després (editable).</p></div>
        <div className="head-actions">
          <ExportButtons disabled={!list.length} table={() => ({ fileName: "claus", title: "Claus", subtitle: [filter === "totes" ? "Totes les entregues" : filter === "fora" ? "Claus que són fora" : "Fora de termini", q ? `Cerca «${q}»` : ""].filter(Boolean).join(" · "),
            head: ["Núm. adm.", "Finca", "Client", "Entrega", "Entregat a", "Per", "Motiu", "Retorn previst", "Retornada"],
            rows: list.map(k => [k.admin_number, k.finca, k.client_name, fmtDate(k.delivered_at), k.delivered_to, k.delivered_by, k.reason, fmtDate(k.expected_return), fmtDate(k.returned_at)]) })} />
          {canWrite && <button className="save-btn" onClick={() => { setF(blank()); setAdding(a => !a); }}><Plus size={18} /> Nova entrega</button>}
        </div>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {adding && (
        <Panel title="Nova entrega de clau" icon={KeyRound}>
          <div className="form-grid three">
            <SearchSelect label="Finca" items={props} value={f.property_id} onChange={id => setF({ ...f, property_id: id })} placeholder="Núm. d'armari, adreça o client…" />
            <TextInput label="Data entrega" type="date" value={f.delivered_at} onChange={v => setF({ ...f, delivered_at: v, expected_return: addDaysISO(v || todayISO(), 7) })} />
            <TextInput label="Retorn previst" type="date" value={f.expected_return} onChange={v => setF({ ...f, expected_return: v })} />
            <label className="f"><span>Entregat a (industrial)</span><select value={f.industrial_id} onChange={e => setF({ ...f, industrial_id: e.target.value })}><option value="">—</option>{inds.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <TextInput label="…o una altra persona" value={f.delivered_to} onChange={v => setF({ ...f, delivered_to: v })} />
            <TextInput label="Motiu" value={f.reason} onChange={v => setF({ ...f, reason: v })} />
            <TextArea label="Observacions" value={f.observations} onChange={v => setF({ ...f, observations: v })} rows={2} />
          </div>
          <div className="tab-actions inline">
            <button className="save-btn" disabled={!f.property_id || (!f.industrial_id && !f.delivered_to.trim())} onClick={() => run(async () => { await createKeyMove(f.property_id, userId, f); setAdding(false); })}><Check size={16} /> Registrar entrega</button>
            <button className="cancel-btn" onClick={() => setAdding(false)}><X size={16} /> Cancel·lar</button>
          </div>
        </Panel>
      )}
      <div className="filter-bar">
        {([["fora", `Fora de l'oficina (${out})`], ["termini", `Fora de termini (${late})`], ["totes", "Historial complet"]] as const).map(([k, l]) =>
          <button key={k} className={"year-chip" + (filter === k ? " on" : "")} onClick={() => setFilter(k)}>{l}</button>)}
        <input className="filter-input" placeholder="Cerca per finca, client, industrial…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <section className="data-panel">
        {!rows ? <Empty>Carregant…</Empty> : (
          <table className="mini-table">
            <thead><tr><th>Armari</th><th>Finca</th><th>Client</th><th>Entrega</th><th>Entregat a</th><th>Motiu</th><th>Retorn previst</th><th>Estat</th><th></th></tr></thead>
            <tbody>
              {list.map(k => (
                <tr key={k.id} className={k.overdue ? "row-warn" : ""} title={k.observations}>
                  <td><strong>{k.admin_number}</strong></td><td className="wrap">{k.finca}</td>
                  <td>{k.client_id ? <button className="link-btn" onClick={() => onOpenClient(k.client_id!)}>{k.client_name}</button> : "—"}</td>
                  <td>{fmtDate(k.delivered_at)}<small className="block muted">{k.delivered_by}</small></td><td>{k.delivered_to}</td><td className="wrap">{k.reason}</td>
                  <td>{fmtDate(k.expected_return)}</td>
                  <td>{k.returned_at ? `Retornada ${fmtDate(k.returned_at)}` : k.overdue ? <span className="status-pill status-warn">Fora de termini</span> : <span className="status-pill status-ok">Fora</span>}</td>
                  <td>{canWrite && (k.returned_at
                    ? <button className="link-btn" onClick={() => run(() => returnKey(k.id, null))}><RotateCcw size={12} /> Desfer</button>
                    : <button className="outline-btn small" onClick={() => run(() => returnKey(k.id, todayISO()))}><Check size={13} /> Retornada</button>)}</td>
                </tr>))}
              {!list.length && <tr className="no-hover"><td colSpan={9} className="table-empty">{filter === "totes" ? "No hi ha moviments de claus." : "Totes les claus són a l'oficina."}</td></tr>}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

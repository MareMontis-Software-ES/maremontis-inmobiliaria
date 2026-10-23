// Alertes d'un client (PDF 2): separades de les observacions, amb data de
// gestió editable, checklist i pas a l'històric en completar-les.
import { useEffect, useState } from "react";
import { Bell, Check, Plus, RotateCcw, X } from "lucide-react";
import { completeAlert, createAlert, listAlerts, updateAlert } from "../../data/alerts";
import { errorText } from "../../lib/supabase";
import { fmtDate, todayISO } from "../../lib/format";
import { Empty, Notice } from "../../components/ui";
import type { Alert } from "../../types";

export function AlertsPanel({ clientId, canWrite, userId, onChanged }: { clientId: string; canWrite: boolean; userId?: string; onChanged?: () => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState({ title: "", content: "", due_date: todayISO(), checklist: "" });

  const load = () => listAlerts({ clientId }).then(setAlerts).catch(e => setError(errorText(e)));
  useEffect(() => { void load(); }, [clientId]);

  async function run(fn: () => Promise<void>) {
    setError("");
    try { await fn(); await load(); onChanged?.(); } catch (e) { setError(errorText(e)); }
  }

  const pending = alerts.filter(a => !a.completed_at);
  const done = alerts.filter(a => a.completed_at);

  return (
    <section className="data-panel alerts-panel">
      <div className="data-panel-title"><Bell size={18} /><strong>Alertes</strong>
        {pending.length > 0 && <span className="count-pill">{pending.length}</span>}
        {canWrite && <span className="panel-action"><button className="add-small" onClick={() => setAdding(a => !a)}><Plus size={13} /> Nova</button></span>}
      </div>
      <div className="data-panel-body">
        {error && <Notice kind="error">{error}</Notice>}
        {adding && (
          <div className="alert-new">
            <input placeholder="Títol de l'alerta" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
            <textarea rows={2} placeholder="Contingut / observacions" value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })} />
            <label>Data de gestió <input type="date" value={draft.due_date} onChange={e => setDraft({ ...draft, due_date: e.target.value })} /></label>
            <textarea rows={2} placeholder="Checklist: una tasca per línia (opcional)" value={draft.checklist} onChange={e => setDraft({ ...draft, checklist: e.target.value })} />
            <div className="alert-new-actions">
              <button className="cancel-btn" onClick={() => setAdding(false)}><X size={14} /> Cancel·lar</button>
              <button className="save-btn" disabled={!draft.title.trim()} onClick={() => run(async () => {
                await createAlert({
                  client_id: clientId, title: draft.title.trim(), content: draft.content, due_date: draft.due_date,
                  checklist: draft.checklist.split("\n").map(t => t.trim()).filter(Boolean).map(text => ({ text, done: false })),
                });
                setDraft({ title: "", content: "", due_date: todayISO(), checklist: "" });
                setAdding(false);
              })}><Check size={14} /> Crear</button>
            </div>
          </div>
        )}
        {!pending.length && !adding && <Empty>No hi ha alertes pendents.</Empty>}
        {pending.map(a => (
          <div key={a.id} className={"alert-item" + (a.overdue ? " overdue" : "")}>
            <div className="alert-item-head">
              <strong>{a.title}</strong>
              {canWrite
                ? <input type="date" className="alert-date" value={a.due_date || ""} title="Data de gestió" onChange={e => run(() => updateAlert(a.id, { due_date: e.target.value || null }))} />
                : <time>{fmtDate(a.due_date)}</time>}
            </div>
            {a.content && <p>{a.content}</p>}
            {a.checklist.length > 0 && (
              <ul className="checklist">
                {a.checklist.map((item, i) => (
                  <li key={i}>
                    <label>
                      <input type="checkbox" checked={item.done} disabled={!canWrite}
                        onChange={() => {
                          const checklist = a.checklist.map((x, j) => j === i ? { ...x, done: !x.done } : x);
                          setAlerts(prev => prev.map(x => x.id === a.id ? { ...x, checklist } : x)); // es marca a l'instant
                          void run(() => updateAlert(a.id, { checklist }));
                        }} />
                      <span className={item.done ? "done" : ""}>{item.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {canWrite && (
              <button className="outline-btn small" onClick={() => run(() => completeAlert(a.id, userId))}>
                <Check size={14} /> Donar per completada
              </button>
            )}
          </div>
        ))}
        {done.length > 0 && (
          <button className="link-btn" onClick={() => setShowHistory(h => !h)}>
            {showHistory ? "Amagar" : "Veure"} històric de completades ({done.length}, últims 6 mesos)
          </button>
        )}
        {showHistory && done.map(a => (
          <div key={a.id} className="alert-item completed">
            <div className="alert-item-head"><strong>{a.title}</strong><time>Completada {fmtDate(a.completed_at)}</time></div>
            {canWrite && <button className="link-btn" onClick={() => run(() => completeAlert(a.id, userId, false))}><RotateCcw size={12} /> Reobrir</button>}
          </div>
        ))}
      </div>
    </section>
  );
}

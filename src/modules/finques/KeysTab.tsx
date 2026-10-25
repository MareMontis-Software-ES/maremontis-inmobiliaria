// Pestanya «Claus»: clau de la finca (núm. d'administració = armari, i oficina on es guarda)
// i control d'entregues i retorns (PDF pàg. 7 i PDF 2).
import { useEffect, useState } from "react";
import { Check, KeyRound, Pencil, Plus, RotateCcw, Save, X } from "lucide-react";
import { Empty, Notice, Panel } from "../../components/ui";
import { adminNumberTaken, createKeyMove, getPropertyKey, listIndustrials, listKeyMoves, nextFreeAdminNumber, returnKey, savePropertyKey, type KeyMove } from "../../data/finques";
import { KEY_OFFICES } from "../../lib/constants";
import { errorText } from "../../lib/supabase";
import { addDaysISO, fmtDate, todayISO } from "../../lib/format";

const blank = () => ({ delivered_at: todayISO(), industrial_id: "", delivered_to: "", reason: "", observations: "", expected_return: addDaysISO(todayISO(), 7) });

export function KeysTab({ propertyId, canWrite, userId, onSaved }: { propertyId: string; canWrite: boolean; userId?: string; onSaved?: () => void }) {
  const [key, setKey] = useState<{ admin_number: string; key_office: string; status: string } | null>(null);
  const [keyEdit, setKeyEdit] = useState<{ admin_number: string; key_office: string } | null>(null);
  useEffect(() => { setKeyEdit(null); getPropertyKey(propertyId).then(setKey).catch(e => setError(errorText(e))); }, [propertyId]);
  const keyOffice = key?.key_office || "";

  async function saveKey() {
    if (!keyEdit) return;
    const n = Number(keyEdit.admin_number);
    if (!/^\d+$/.test(keyEdit.admin_number) || n <= 0) { setError("El núm. d'administració ha de ser un número."); return; }
    setError("");
    try {
      if (key?.status !== "baixa") {
        const used = await adminNumberTaken(n, propertyId);
        if (used) { setError(`L'armari ${n} ja l'usa la finca «${used}». El primer lliure és el ${await nextFreeAdminNumber()}.`); return; }
      }
      await savePropertyKey(propertyId, n, keyEdit.key_office);
      setKey({ ...key!, ...keyEdit }); setKeyEdit(null); onSaved?.();
    } catch (e) { setError(errorText(e)); }
  }

  const [rows, setRows] = useState<KeyMove[] | null>(null);
  const [inds, setInds] = useState<[string, string][]>([]);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState(blank());
  const [error, setError] = useState("");

  const load = () => listKeyMoves(propertyId).then(setRows).catch(e => setError(errorText(e)));
  useEffect(() => { setError(""); setAdding(false); void load(); }, [propertyId]);
  useEffect(() => { listIndustrials().then(setInds).catch(() => {}); }, []);

  async function run(fn: () => Promise<void>) {
    setError("");
    try { await fn(); await load(); } catch (e) { setError(errorText(e)); }
  }

  const out = rows?.find(r => !r.returned_at);

  return (
    <div className="tab-pad">
      {error && <Notice kind="error">{error}</Notice>}
      <Panel title="Clau de la finca" icon={KeyRound}
        action={canWrite && key && !keyEdit && <button className="outline-btn small" onClick={() => setKeyEdit({ admin_number: key.admin_number, key_office: key.key_office })}><Pencil size={13} /> Modificar</button>}>
        <div className="form-grid four">
          <label className="f"><span>Núm. d'administració (armari)</span>
            <input type="number" min={1} value={keyEdit ? keyEdit.admin_number : key?.admin_number || ""} readOnly={!keyEdit} onChange={e => setKeyEdit({ ...keyEdit!, admin_number: e.target.value })} /></label>
          <label className="f"><span>Oficina on es guarda la clau</span>
            <select value={keyEdit ? keyEdit.key_office : keyOffice} disabled={!keyEdit} onChange={e => setKeyEdit({ ...keyEdit!, key_office: e.target.value })}>
              <option value="">—</option>
              {[...(keyOffice && !KEY_OFFICES.includes(keyOffice) ? [keyOffice] : []), ...KEY_OFFICES].map(o => <option key={o} value={o}>{o}</option>)}
            </select></label>
        </div>
        {keyEdit && <div className="tab-actions inline">
          <button className="save-btn" onClick={saveKey}><Save size={16} /> Guardar</button>
          <button className="cancel-btn" onClick={() => { setKeyEdit(null); setError(""); }}><X size={16} /> Cancel·lar</button>
        </div>}
        <p className="hint">El núm. d'administració només serveix per al control de claus (és el número de l'armari). Quan la finca es dona de baixa, queda lliure.</p>
      </Panel>
      <div className="key-status">
        <KeyRound size={22} />
        {out
          ? <div><strong className={out.overdue ? "txt-warn" : ""}>Clau fora de l'oficina{out.overdue ? " — FORA DE TERMINI" : ""}</strong><span>Entregada a {out.industrial || out.delivered_to || "—"} el {fmtDate(out.delivered_at)} · retorn previst {fmtDate(out.expected_return)}</span></div>
          : <div><strong>Clau a l'oficina</strong><span>{keyOffice ? `Oficina: ${keyOffice}${key?.admin_number ? ` · armari ${key.admin_number}` : ""}` : "Indica aquí a dalt a quina oficina es guarda la clau."}</span></div>}
        {canWrite && !adding && <button className="save-btn" onClick={() => { setF(blank()); setAdding(true); }}><Plus size={16} /> Nova entrega</button>}
      </div>

      {adding && (
        <Panel title="Nova entrega de clau" icon={KeyRound}>
          <div className="form-grid">
            <label className="f"><span>Data entrega</span><input type="date" value={f.delivered_at} onChange={e => setF({ ...f, delivered_at: e.target.value, expected_return: addDaysISO(e.target.value || todayISO(), 7) })} /></label>
            <label className="f"><span>Retorn previst (1 setmana, editable)</span><input type="date" value={f.expected_return} onChange={e => setF({ ...f, expected_return: e.target.value })} /></label>
            <label className="f"><span>Entregat a (industrial)</span>
              <select value={f.industrial_id} onChange={e => setF({ ...f, industrial_id: e.target.value })}>
                <option value="">—</option>{inds.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="f"><span>…o una altra persona</span><input value={f.delivered_to} placeholder="Nom" onChange={e => setF({ ...f, delivered_to: e.target.value })} /></label>
            <label className="f f-wide"><span>Motiu</span><input value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} /></label>
            <label className="f f-wide"><span>Observacions</span><textarea rows={2} value={f.observations} onChange={e => setF({ ...f, observations: e.target.value })} /></label>
          </div>
          {!inds.length && <p className="hint">Encara no hi ha industrials donats d'alta (mòdul Industrials). Pots escriure el nom a «…o una altra persona».</p>}
          <div className="tab-actions inline">
            <button className="save-btn" disabled={!f.industrial_id && !f.delivered_to.trim()} onClick={() => run(async () => { await createKeyMove(propertyId, userId, f); setAdding(false); })}><Check size={16} /> Registrar entrega</button>
            <button className="cancel-btn" onClick={() => setAdding(false)}><X size={16} /> Cancel·lar</button>
          </div>
        </Panel>
      )}

      <Panel title="Historial de la clau" icon={KeyRound}>
        {!rows ? <Empty>Carregant…</Empty> : !rows.length ? <Empty>No hi ha cap moviment registrat.</Empty> : (
          <table className="mini-table">
            <thead><tr><th>Entrega</th><th>Entregat a</th><th>Per</th><th>Motiu</th><th>Retorn previst</th><th>Retornada</th><th></th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} className={r.overdue ? "row-warn" : ""} title={r.observations}>
                <td>{fmtDate(r.delivered_at)}</td><td><strong>{r.industrial || r.delivered_to}</strong></td><td>{r.delivered_by}</td>
                <td>{r.reason}</td><td>{fmtDate(r.expected_return)}</td>
                <td>{r.returned_at ? fmtDate(r.returned_at) : r.overdue ? <span className="status-pill status-warn">Fora de termini</span> : <span className="status-pill status-ok">Fora</span>}</td>
                <td>{canWrite && (r.returned_at
                  ? <button className="link-btn" onClick={() => run(() => returnKey(r.id, null))}><RotateCcw size={12} /> Desfer</button>
                  : <button className="outline-btn small" onClick={() => run(() => returnKey(r.id, todayISO()))}><Check size={13} /> Retornada avui</button>)}</td>
              </tr>))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

// Pestanya «Impostos» de la finca seleccionada (PDF pàg. 4 i 15).
// Un registre per any. Base imposable i quota es calculen al moment.
import { useEffect, useState } from "react";
import { Calculator, Euro, Landmark, Pencil, Plus, Save, X } from "lucide-react";
import { FieldGrid } from "../../components/FieldGrid";
import { CheckInput, Empty, Notice, Panel } from "../../components/ui";
import { emptyTax, listTaxes, saveTax, taxCalc, TAX_FIELDS, type TaxForm } from "../../data/finques";
import { errorText } from "../../lib/supabase";
import { HistoryButton } from "../../components/HistoryButton";

const money = (n: number) => n.toLocaleString("ca-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export function TaxesTab({ propertyId, ownership, canWrite }: { propertyId: string; ownership: number | null; canWrite: boolean }) {
  const [rows, setRows] = useState<TaxForm[] | null>(null);
  const [sel, setSel] = useState<number>(0);          // índex a rows, o -1 = any nou
  const [form, setForm] = useState<TaxForm | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = (keepYear?: string) => listTaxes(propertyId).then(r => {
    setRows(r);
    const i = keepYear ? Math.max(0, r.findIndex(x => x.tax_year === keepYear)) : 0;
    setSel(i); setForm(r[i] ? { ...r[i] } : null); setEditing(false);
  }).catch(e => setError(errorText(e)));
  useEffect(() => { setError(""); void load(); }, [propertyId]);

  if (!rows) return <div className="tab-pad">{error ? <Notice kind="error">{error}</Notice> : <Empty>Carregant…</Empty>}</div>;

  function newYear() {
    const last = rows![0];
    const year = last ? Number(last.tax_year) + 1 : new Date().getFullYear();
    setSel(-1); setForm(emptyTax(year, last)); setEditing(true);
  }

  async function save() {
    if (!form) return;
    if (!/^\d{4}$/.test(form.tax_year || "")) { setError("Cal indicar l'any (4 xifres)."); return; }
    if (rows!.some((r, i) => i !== sel && r.tax_year === form.tax_year)) { setError(`Ja hi ha impostos per a l'any ${form.tax_year}.`); return; }
    setSaving(true); setError("");
    try { await saveTax(propertyId, form); await load(form.tax_year); }
    catch (e) { setError("No s'ha pogut desar: " + errorText(e)); }
    finally { setSaving(false); }
  }

  const calc = form ? taxCalc(form) : null;
  const mine = calc && ownership != null ? Math.round(calc.quota * ownership) / 100 : null;

  return (
    <div className="tab-pad">
      {error && <Notice kind="error">{error}</Notice>}
      <div className="year-bar">
        <span>Exercici:</span>
        {rows.map((r, i) => (
          <button key={r.id} className={"year-chip" + (sel === i ? " on" : "")} disabled={editing} onClick={() => { setSel(i); setForm({ ...r }); }}>{r.tax_year}{r.paid === "true" ? " ✓" : ""}</button>
        ))}
        {sel === -1 && <button className="year-chip on">{form?.tax_year} (nou)</button>}
        {canWrite && !editing && <button className="add-small" onClick={newYear}><Plus size={13} /> Any nou</button>}
      </div>

      {canWrite && form && (
        <div className="tab-actions">
          {editing ? <>
            <button className="save-btn" onClick={save} disabled={saving}><Save size={16} /> {saving ? "Desant…" : "Gravar"}</button>
            <button className="cancel-btn" disabled={saving} onClick={() => { setEditing(false); setError(""); if (sel === -1) { setSel(0); setForm(rows[0] ? { ...rows[0] } : null); } else setForm({ ...rows[sel] }); }}><X size={16} /> Cancel·lar</button>
          </> : <><button className="save-btn" onClick={() => setEditing(true)}><Pencil size={16} /> Modificar impostos {form.tax_year}</button>
            <HistoryButton scope={{ propertyId, tables: ["property_taxes"] }} title="Historial de canvis · impostos de la finca" /></>}
        </div>
      )}
      {!canWrite && form && <div className="tab-actions"><HistoryButton scope={{ propertyId, tables: ["property_taxes"] }} title="Historial de canvis · impostos de la finca" /></div>}
      {!form ? <Panel title="Impostos" icon={Landmark}><Empty>Aquesta finca encara no té impostos registrats.{canWrite && " Prem «Any nou» per començar."}</Empty></Panel> : (
        <div className="finca-columns">
          <div className="column-stack">
            <Panel title="Contribucions (IBI)" icon={Landmark}>
              <FieldGrid fields={TAX_FIELDS.filter(f => ["tax_year", "holder_name", "revaluation_pct", "cadastral_value", "cadastral_ref", "ibi_quota"].includes(f.k))}
                values={form} editing={editing} onChange={(k, v) => setForm(f => ({ ...f!, [k]: v }))} />
            </Panel>
            <Panel title="Renda (model 210)" icon={Calculator}>
              <FieldGrid fields={TAX_FIELDS.filter(f => ["tax_rate", "active_from", "active_to"].includes(f.k))}
                values={form} editing={editing} onChange={(k, v) => setForm(f => ({ ...f!, [k]: v }))} />
              <div className="calc-box">
                <div><span>Base imposable</span><strong>{money(calc!.base)}</strong><small>Valor cadastral × {form.revaluation_pct || 0} %</small></div>
                <div><span>Quota renda (finca)</span><strong>{money(calc!.quota)}</strong><small>Base × {form.tax_rate || 0} %</small></div>
                {mine != null && <div><span>Part del client ({ownership} %)</span><strong>{money(mine)}</strong><small>Orientatiu: fórmula del 210 pendent de validar</small></div>}
              </div>
            </Panel>
          </div>
          <div className="column-stack">
            <Panel title="Altres dades" icon={Euro}>
              <div className="form-grid">
                <CheckInput label="Pagat" checked={form.paid === "true"} onChange={v => editing && setForm(f => ({ ...f!, paid: v ? "true" : "" }))} />
                <CheckInput label="Facturació" checked={form.billing === "true"} onChange={v => editing && setForm(f => ({ ...f!, billing: v ? "true" : "" }))} />
              </div>
              <FieldGrid fields={TAX_FIELDS.filter(f => ["paid_date", "class", "units"].includes(f.k))}
                values={form} editing={editing} onChange={(k, v) => setForm(f => ({ ...f!, [k]: v }))} />
            </Panel>
            <Panel title="Observacions" icon={Euro}>
              <FieldGrid fields={TAX_FIELDS.filter(f => f.k === "observations")} values={form} editing={editing} onChange={(k, v) => setForm(f => ({ ...f!, [k]: v }))} />
            </Panel>
          </div>
          <div className="column-stack">
            <Panel title="Dades registrals" icon={Landmark}>
              <FieldGrid fields={TAX_FIELDS.filter(f => ["reg_owner", "purchase_date", "deed_price", "protocol_number", "notary", "deed_type"].includes(f.k))}
                values={form} editing={editing} onChange={(k, v) => setForm(f => ({ ...f!, [k]: v }))} />
            </Panel>
          </div>
        </div>
      )}

    </div>
  );
}

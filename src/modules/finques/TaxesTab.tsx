// Pestanya «Impostos» de la finca seleccionada (PDF pàg. 4 i 15).
// Mostra l'any de treball (es canvia a Configuració → Canvi d'any).
// Un registre per any. Base imposable i quota es calculen al moment.
import { useEffect, useState } from "react";
import { Calculator, Euro, FileText, Landmark, Pencil, Plus, Save, X } from "lucide-react";
import { FieldGrid } from "../../components/FieldGrid";
import { CheckInput, Empty, Notice, Panel } from "../../components/ui";
import { emptyTax, listTaxes, saveTax, taxCalc, TAX_FIELDS, type TaxForm } from "../../data/finques";
import { errorText } from "../../lib/supabase";
import { HistoryButton } from "../../components/HistoryButton";
import { useWorkingYear } from "../../data/settings";

const money = (n: number) => n.toLocaleString("ca-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export function TaxesTab({ propertyId, ownership, canWrite }: { propertyId: string; ownership: number | null; canWrite: boolean }) {
  const year = useWorkingYear();
  const [rows, setRows] = useState<TaxForm[] | null>(null);
  const [form, setForm] = useState<TaxForm | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => listTaxes(propertyId).then(r => {
    setRows(r);
    const cur = r.find(x => x.tax_year === String(year));
    setForm(cur ? { ...cur } : null); setEditing(false);
  }).catch(e => setError(errorText(e)));
  useEffect(() => { setError(""); if (year) void load(); }, [propertyId, year]);

  if (!rows || !year) return <div className="tab-pad">{error ? <Notice kind="error">{error}</Notice> : <Empty>Carregant…</Empty>}</div>;

  // Impostos de l'any de treball que encara no existeixen: es creen copiant l'any anterior
  function create() {
    const prev = rows!.find(r => Number(r.tax_year) < year!);
    setForm(emptyTax(year!, prev)); setEditing(true);
  }

  async function save() {
    if (!form) return;
    setSaving(true); setError("");
    try { await saveTax(propertyId, { ...form, tax_year: String(year) }); await load(); }
    catch (e) { setError("No s'ha pogut desar: " + errorText(e)); }
    finally { setSaving(false); }
  }

  const calc = form ? taxCalc(form) : null;
  const mine = calc && ownership != null ? Math.round(calc.quota * ownership) / 100 : null;
  const grid = (keys: string[]) => <FieldGrid fields={TAX_FIELDS.filter(f => keys.includes(f.k))} values={form!} editing={editing} onChange={(k, v) => setForm(f => ({ ...f!, [k]: v }))} />;
  const history = <HistoryButton scope={{ propertyId, tables: ["property_taxes"] }} title="Historial de canvis · impostos de la finca" />;

  return (
    <div className="tab-pad">
      {error && <Notice kind="error">{error}</Notice>}
      <div className="tab-actions">
        <span className="year-now">Impostos de <strong>{year}</strong></span>
        {canWrite && form && (editing ? <>
          <button className="save-btn" onClick={save} disabled={saving}><Save size={16} /> {saving ? "Desant…" : "Guardar"}</button>
          <button className="cancel-btn" disabled={saving} onClick={() => { setEditing(false); setError(""); const cur = rows.find(x => x.tax_year === String(year)); setForm(cur ? { ...cur } : null); }}><X size={16} /> Cancel·lar</button>
        </> : <button className="save-btn" onClick={() => setEditing(true)}><Pencil size={16} /> Modificar impostos</button>)}
        {history}
      </div>
      {!form ? <Panel title="Impostos" icon={Landmark}>
        <Empty>Aquesta finca encara no té impostos de {year}.</Empty>
        {canWrite && <button className="save-btn" onClick={create}><Plus size={16} /> Omplir els impostos de {year}</button>}
        <p className="hint">L'any de treball es canvia a Configuració → Canvi d'any.</p>
      </Panel> : <>
        <div className="taxes-columns">
          <div className="column-stack">
            <Panel title="Contribucions (IBI)" icon={Landmark}>{grid(["holder_name", "revaluation_pct", "cadastral_value", "cadastral_ref", "ibi_quota"])}</Panel>
            <Panel title="Renda (model 210)" icon={Calculator}>
              {grid(["tax_rate", "active_from", "active_to"])}
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
              {grid(["paid_date", "class", "units"])}
            </Panel>
            <Panel title="Dades registrals" icon={FileText}>{grid(["reg_owner", "purchase_date", "deed_price", "protocol_number", "notary", "deed_type"])}</Panel>
          </div>
        </div>
        <div className="taxes-obs"><Panel title="Observacions" icon={FileText}>{grid(["observations"])}</Panel></div>
      </>}
    </div>
  );
}

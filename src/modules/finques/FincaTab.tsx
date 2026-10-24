// Pestanya «Finca» dins la fitxa del client: totes les dades de la finca
// seleccionada, amb Modificar / Gravar / Cancel·lar com al programa antic.
import { useEffect, useMemo, useState } from "react";
import { Building2, FileText, Gauge, Leaf, Pencil, Power, Save, Shield, Trash2, Users, Wifi, X } from "lucide-react";
import { FieldGrid } from "../../components/FieldGrid";
import { Notice, Panel } from "../../components/ui";
import { STREET_TYPES } from "../../lib/constants";
import { errorText } from "../../lib/supabase";
import { fmtDate } from "../../lib/format";
import { adminNumberTaken, clientPickList, getProperty, lookups, nextFreeAdminNumber, propertyGroups, saveProperty, setPropertyBaixa, type Owner, type PropertyForm } from "../../data/finques";
import type { ClientFull } from "../../types";
import { recoverProperty } from "../../data/baixes";
import { HistoryButton } from "../../components/HistoryButton";

const ICONS: Record<string, any> = { ident: Building2, aeat: FileText, contracte: FileText, subministraments: Gauge, serveis: Wifi, certificats: Shield, manteniment: Leaf, obs: FileText };

interface Props {
  client: ClientFull;
  propertyId: string | null;       // null = alta de finca nova
  canWrite: boolean;
  userId?: string;
  onSaved: (id: string) => void;   // després de gravar (recarrega la fitxa del client)
  onCancelNew: () => void;
}

export function FincaTab({ client, propertyId, canWrite, userId, onSaved, onCancelNew }: Props) {
  const isNew = !propertyId;
  const [form, setForm] = useState<PropertyForm | null>(null);
  const [original, setOriginal] = useState<{ form: PropertyForm; owners: Owner[] } | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [editing, setEditing] = useState(isNew);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lk, setLk] = useState<{ zones: [string, string][]; contractTypes: [string, string][] }>({ zones: [], contractTypes: [] });
  const [clients, setClients] = useState<{ id: string; name: string; code: number }[]>([]);

  useEffect(() => { lookups().then(setLk).catch(() => {}); }, []);
  useEffect(() => { if (editing && !clients.length) clientPickList().then(setClients).catch(() => {}); }, [editing]);

  useEffect(() => {
    setError(""); setForm(null);
    if (propertyId) {
      setEditing(false);
      getProperty(propertyId).then(r => { setForm(r.form); setOwners(r.owners); setOriginal(r); }).catch(e => setError(errorText(e)));
    } else {
      setEditing(true);
      const me: Owner = { client_id: client.client.id!, related_person_id: null, name: `${client.client.first_name} ${client.client.last_name}`.trim(), percentage: "100", is_main: true };
      nextFreeAdminNumber().catch(() => "").then(n => {
        const f: PropertyForm = {} as PropertyForm;
        for (const g of propertyGroups([], [], [])) for (const d of g.fields) f[d.k] = "";
        Object.assign(f, { admin_number: n, country: "Espanya", street_type: "C.", province: "Girona", status: "active" });
        setForm(f); setOwners([me]); setOriginal(null);
      });
    }
  }, [propertyId]);

  const groups = useMemo(() => propertyGroups(lk.zones, lk.contractTypes, STREET_TYPES), [lk]);
  const total = owners.reduce((a, o) => a + (Number(o.percentage) || 0), 0);

  if (!form) return <div className="tab-pad">{error ? <Notice kind="error">{error}</Notice> : <p className="empty-line">Carregant finca…</p>}</div>;

  const set = (k: string, v: string) => setForm(f => ({ ...f!, [k]: v }));
  const errors: Record<string, string | null> = {
    admin_number: !/^\d+$/.test(form.admin_number || "") ? "Obligatori (número)" : null,
    address: !form.address?.trim() ? "Obligatori" : null,
  };

  async function save() {
    setError("");
    if (errors.admin_number || errors.address) { setError("Revisa els camps obligatoris."); return; }
    if (!owners.length) { setError("La finca ha de tenir almenys un titular."); return; }
    setSaving(true);
    try {
      const used = await adminNumberTaken(Number(form!.admin_number), form!.id);
      if (used) { setError(`El núm. d'administració ${form!.admin_number} ja l'usa la finca «${used}». El primer lliure és el ${await nextFreeAdminNumber()}.`); return; }
      const id = await saveProperty(form!, owners);
      setEditing(false);
      onSaved(id);
    } catch (e) { setError("No s'ha pogut desar: " + errorText(e)); }
    finally { setSaving(false); }
  }

  function cancel() {
    if (isNew) { onCancelNew(); return; }
    if (original) { setForm(original.form); setOwners(original.owners); }
    setEditing(false); setError("");
  }

  async function toggleBaixa() {
    if (!form?.id) return;
    try {
      if (form.status === "active") {
        if (!window.confirm("Donar de baixa aquesta finca?\n\nNo s'esborra: es conserva a l'històric (cal per al model 210 de l'any següent) i el número d'armari queda lliure per a una altra finca.")) return;
        await setPropertyBaixa(form.id, true, userId);
      } else {
        const used = await adminNumberTaken(Number(form.admin_number), form.id);
        if (used && !window.confirm(`El número ${form.admin_number} ara l'usa «${used}». Es recuperarà la finca amb el primer número lliure. Continuar?`)) return;
        const n = await recoverProperty(form.id, null);
        if (used) window.alert(`Finca recuperada amb el núm. d'administració ${n}.`);
      }
      onSaved(form.id);
    } catch (e) { setError(errorText(e)); }
  }

  // Possibles titulars: el client, el seu cònjuge/copropietaris, o qualsevol altre client
  const relatedOptions = client.related.filter(r => r.id).map(r => ({ id: r.id!, name: `${r.first_name} ${r.last_name}`.trim() + (r.relation === "conjuge" ? " (cònjuge)" : " (copropietari)") }));
  function addOwner(value: string) {
    if (!value) return;
    const [kind, id] = value.split(":");
    const name = kind === "c" ? (id === client.client.id ? `${client.client.first_name} ${client.client.last_name}` : clients.find(c => c.id === id)?.name || "") : relatedOptions.find(r => r.id === id)?.name || "";
    setOwners(o => [...o, { client_id: kind === "c" ? id : null, related_person_id: kind === "r" ? id : null, name, percentage: String(Math.max(0, 100 - total)), is_main: !o.length }]);
  }

  return (
    <div className="tab-pad finca-tab">
      {canWrite && (
        <div className="tab-actions">
          {editing ? (
            <>
              <button className="save-btn" onClick={save} disabled={saving}><Save size={16} /> {saving ? "Desant…" : isNew ? "Gravar finca nova" : "Gravar"}</button>
              <button className="cancel-btn" onClick={cancel} disabled={saving}><X size={16} /> Cancel·lar</button>
            </>
          ) : (
            <>
              <button className="save-btn" onClick={() => setEditing(true)}><Pencil size={16} /> Modificar finca</button>
              <button className="cancel-btn" onClick={toggleBaixa}><Power size={16} /> {form.status === "baixa" ? "Recuperar finca" : "Donar de baixa la finca"}</button>
              {form.id && <HistoryButton scope={{ propertyId: form.id, tables: ["properties", "property_owners"] }} title={`Historial de canvis · finca ${form.admin_number} ${form.address}`} />}
            </>
          )}
        </div>
      )}
      {!canWrite && form.id && <div className="tab-actions"><HistoryButton scope={{ propertyId: form.id, tables: ["properties", "property_owners"] }} title={`Historial de canvis · finca ${form.admin_number} ${form.address}`} /></div>}
      {form.status === "baixa" && <Notice kind="error">Finca <strong>donada de baixa</strong> el {fmtDate(form.baixa_date)}. Es conserva per a l'històric i el model 210.</Notice>}
      {isNew && <Notice>Alta de finca nova per a aquest client. El núm. d'administració proposat és el primer armari lliure.</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      <div className="finca-columns">
        <div className="column-stack">
          {groups.filter(g => ["ident", "aeat"].includes(g.id)).map(g => (
            <Panel key={g.id} title={g.title} icon={ICONS[g.id]}><FieldGrid fields={g.fields} values={form} onChange={set} editing={editing} errors={editing ? errors : {}} /></Panel>
          ))}
          <Panel title="Titulars i percentatge de propietat" icon={Users}>
            {owners.map((o, i) => (
              <div className="row-line owner-line" key={i}>
                <span className="owner-name">{o.name}{i === 0 && <small className="muted"> · principal</small>}</span>
                <input type="number" min={0} max={100} step="0.01" value={o.percentage} readOnly={!editing} aria-label="% propietat"
                  onChange={e => setOwners(l => l.map((x, j) => j === i ? { ...x, percentage: e.target.value } : x))} />
                <span>%</span>
                {editing ? <button type="button" className="icon-del" title="Treure" onClick={() => setOwners(l => l.filter((_, j) => j !== i))}><Trash2 size={14} /></button> : <span />}
              </div>
            ))}
            <p className={"hint" + (Math.abs(total - 100) > 0.01 ? " hint-warn" : "")}>Total: {total.toLocaleString("ca-ES")} %{Math.abs(total - 100) > 0.01 && " — hauria de sumar 100 %"}</p>
            {editing && (
              <select className="add-owner" value="" onChange={e => addOwner(e.target.value)}>
                <option value="">+ Afegir titular…</option>
                {!owners.some(o => o.client_id === client.client.id) && <option value={"c:" + client.client.id}>{client.client.first_name} {client.client.last_name} (aquest client)</option>}
                {relatedOptions.filter(r => !owners.some(o => o.related_person_id === r.id)).length > 0 && (
                  <optgroup label="Cònjuge i copropietaris del client">
                    {relatedOptions.filter(r => !owners.some(o => o.related_person_id === r.id)).map(r => <option key={r.id} value={"r:" + r.id}>{r.name}</option>)}
                  </optgroup>
                )}
                <optgroup label="Altres clients">
                  {clients.filter(c => c.id !== client.client.id && !owners.some(o => o.client_id === c.id)).map(c => <option key={c.id} value={"c:" + c.id}>{c.name} ({c.code})</option>)}
                </optgroup>
              </select>
            )}
          </Panel>
        </div>
        <div className="column-stack">
          {groups.filter(g => ["contracte", "certificats", "obs"].includes(g.id)).map(g => (
            <Panel key={g.id} title={g.title} icon={ICONS[g.id]}><FieldGrid fields={g.fields} values={form} onChange={set} editing={editing} /></Panel>
          ))}
          {!lk.contractTypes.length && <p className="hint">Encara no hi ha tipus de contracte creats (mòdul Contractes, fase 3).</p>}
        </div>
        <div className="column-stack">
          {groups.filter(g => ["subministraments", "serveis", "manteniment"].includes(g.id)).map(g => (
            <Panel key={g.id} title={g.title} icon={ICONS[g.id]}><FieldGrid fields={g.fields} values={form} onChange={set} editing={editing} /></Panel>
          ))}
        </div>
      </div>
    </div>
  );
}


// Pestanyes «Cònjuge - copropietaris» (de cada finca) i «Matrícules» de la fitxa del client.
// Es veuen en mode consulta i s'editen allà mateix amb «Modificar client».
import { Car, Plus, Trash2, Users } from "lucide-react";
import { CheckInput, Empty, Info2, Panel, SelectInput, TextInput } from "../../components/ui";
import { COUNTRIES, EMAIL_TYPES, PHONE_TYPES, TITLES } from "../../lib/constants";
import { fmtDate } from "../../lib/format";
import { emptyRelated } from "../../data/clients";
import type { ClientFull, PropertyLink, RelatedPerson } from "../../types";

/** Persones relacionades que es mostren per a una finca (les antigues sense finca surten a totes) */
const ofFinca = (r: RelatedPerson, propertyId: string) => r.property_id === propertyId || !r.property_id;

export function RelatedTab({ full, finca, editing, onChange, onStartEdit }: {
  full: ClientFull; finca: PropertyLink; editing: boolean; onChange: (f: ClientFull) => void;
  /** En mode consulta: entra a «Modificar client» amb aquestes dades (p. ex. amb un cònjuge nou afegit) */
  onStartEdit?: (f: ClientFull) => void;
}) {
  const list = full.related.map((r, i) => ({ r, i })).filter(x => ofFinca(x.r, finca.id));
  const setRel = (i: number, patch: Partial<RelatedPerson>) => onChange({ ...full, related: full.related.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const withNew = (rel: RelatedPerson["relation"]) => ({ ...full, related: [...full.related, emptyRelated(rel, finca.id)] });
  const add = (rel: RelatedPerson["relation"]) => onChange(withNew(rel));
  const remove = (i: number) => onChange({ ...full, related: full.related.filter((_, j) => j !== i) });

  if (!editing) {
    return (
      <div className="tab-pad">
      {onStartEdit && <div className="tab-actions inline">
        <button type="button" className="add-small" onClick={() => onStartEdit(withNew("conjuge"))}><Plus size={13} /> Cònjuge</button>
        <button type="button" className="add-small" onClick={() => onStartEdit(withNew("copropietari"))}><Plus size={13} /> Copropietari</button>
        <span className="hint">De la finca «{finca.address}».</span>
      </div>}
      <div className="related-grid">
        {!list.length && <Panel title="Cònjuge i copropietaris d'aquesta finca" icon={Users}><Empty>No n'hi ha cap.{onStartEdit ? " Afegeix-los amb els botons «+ Cònjuge» o «+ Copropietari»." : ""}</Empty></Panel>}
        {list.map(({ r, i }) => (
          <Panel key={r.id || i} title={(r.relation === "conjuge" ? "Cònjuge" : "Copropietari") + (!r.property_id ? " · sense finca assignada" : "")} icon={Users}>
            <div className="info-cols">
              <Info2 label="Nom" value={[r.title, r.first_name, r.last_name].filter(Boolean).join(" ")} />
              <Info2 label="% propietat" value={r.ownership_percentage && r.ownership_percentage + " %"} />
              <Info2 label="Naixement" value={[fmtDate(r.birth_date), r.birth_city, r.birth_country_code].filter(Boolean).join(" · ")} />
              <Info2 label="Passaport" value={r.passport && `${r.passport}${r.passport_expiry ? " · cad. " + fmtDate(r.passport_expiry) : ""}`} />
              <Info2 label="N.I.E. / D.N.I." value={[r.nie, r.dni].filter(Boolean).join(" / ")} />
              <Info2 label="Adreça" value={[r.street, [r.postal_code, r.municipality].filter(Boolean).join(" "), r.province, r.country].filter(Boolean).join(", ")} />
              <Info2 label="Telèfons" value={r.phones.filter(x => x.number).map(x => `${x.prefix} ${x.number}`).join(" · ")} />
              <Info2 label="E-mails" value={r.emails.filter(x => x.email).map(x => x.email).join(" · ")} />
            </div>
          </Panel>
        ))}
      </div>
      </div>
    );
  }

  return (
    <div className="tab-pad">
      <div className="tab-actions inline">
        <button type="button" className="add-small" onClick={() => add("conjuge")}><Plus size={13} /> Cònjuge</button>
        <button type="button" className="add-small" onClick={() => add("copropietari")}><Plus size={13} /> Copropietari</button>
        <span className="hint">Només per a la finca «{finca.address}». Cada finca té els seus.</span>
      </div>
      {!list.length && <p className="hint">No n'hi ha cap. Fes servir els botons per afegir-ne.</p>}
      <div className="related-grid">
        {list.map(({ r, i }) => (
          <div className="related-card" key={r.id || "new" + i}>
            <header>
              <strong>{r.relation === "conjuge" ? "Cònjuge" : "Copropietari"}</strong>
              {!r.property_id && <button type="button" className="link-btn" onClick={() => setRel(i, { property_id: finca.id })}>Assignar només a aquesta finca</button>}
              <button type="button" className="icon-del" title="Treure" onClick={() => remove(i)}><Trash2 size={15} /></button>
            </header>
            <div className="form-grid four">
              <SelectInput label="Sr./Sra." value={r.title} onChange={v => setRel(i, { title: v })} options={TITLES} empty="—" />
              <TextInput label="Nom" value={r.first_name} onChange={v => setRel(i, { first_name: v })} />
              <TextInput label="Cognoms" value={r.last_name} onChange={v => setRel(i, { last_name: v })} />
              <TextInput label="% propietat" type="number" value={r.ownership_percentage} onChange={v => setRel(i, { ownership_percentage: v })}
                error={r.ownership_percentage && (Number(r.ownership_percentage) < 0 || Number(r.ownership_percentage) > 100) ? "Entre 0 i 100" : null} />
              <TextInput label="Naixement" type="date" value={r.birth_date} onChange={v => setRel(i, { birth_date: v })} />
              <TextInput label="Ciutat naix." value={r.birth_city} onChange={v => setRel(i, { birth_city: v })} />
              <SelectInput label="País naix." value={r.birth_country_code} onChange={v => setRel(i, { birth_country_code: v })} options={COUNTRIES.map(x => [x.code, x.name] as [string, string])} empty="—" />
              <TextInput label="Anagrama" value={r.anagram} onChange={v => setRel(i, { anagram: v })} />
              <TextInput label="Passaport" value={r.passport} onChange={v => setRel(i, { passport: v.toUpperCase() })} />
              <TextInput label="Caducitat" type="date" value={r.passport_expiry} onChange={v => setRel(i, { passport_expiry: v })} />
              <TextInput label="N.I.E." value={r.nie} onChange={v => setRel(i, { nie: v.toUpperCase() })} />
              <TextInput label="D.N.I." value={r.dni} onChange={v => setRel(i, { dni: v.toUpperCase() })} />
              <TextInput label="Adreça" value={r.street} onChange={v => setRel(i, { street: v })} wide2 />
              <TextInput label="Codi postal" value={r.postal_code} onChange={v => setRel(i, { postal_code: v })} list="postal-codes" />
              <TextInput label="Població" value={r.municipality} onChange={v => setRel(i, { municipality: v })} list="towns" />
              <TextInput label="Província" value={r.province} onChange={v => setRel(i, { province: v })} />
              <SelectInput label="País" value={r.country} onChange={v => setRel(i, { country: v })} options={COUNTRIES.map(x => x.name)} empty="—" />
              <CheckInput label="Etiquetes" checked={r.labels} onChange={v => setRel(i, { labels: v })} />
            </div>
            <div className="sub-list">
              <div className="sub-head">Telèfons <button type="button" className="link-btn" onClick={() => setRel(i, { phones: [...r.phones, { type: "mobil", prefix: "+34", number: "" }] })}>+ afegir</button></div>
              {r.phones.map((p, k) => (
                <div className="row-line rel-phone-line" key={k}>
                  <select aria-label="Tipus" value={p.type} onChange={e => setRel(i, { phones: r.phones.map((x, z) => z === k ? { ...x, type: e.target.value } : x) })}>
                    {PHONE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input aria-label="Prefix" value={p.prefix} onChange={e => setRel(i, { phones: r.phones.map((x, z) => z === k ? { ...x, prefix: e.target.value } : x) })} />
                  <input aria-label="Número" value={p.number} onChange={e => setRel(i, { phones: r.phones.map((x, z) => z === k ? { ...x, number: e.target.value } : x) })} />
                  <button type="button" className="icon-del" onClick={() => setRel(i, { phones: r.phones.filter((_, z) => z !== k) })}><Trash2 size={14} /></button>
                </div>
              ))}
              <div className="sub-head">E-mails <button type="button" className="link-btn" onClick={() => setRel(i, { emails: [...r.emails, { type: "particular", email: "" }] })}>+ afegir</button></div>
              {r.emails.map((m, k) => (
                <div className="row-line email-line" key={k}>
                  <select aria-label="Tipus" value={m.type} onChange={e => setRel(i, { emails: r.emails.map((x, z) => z === k ? { ...x, type: e.target.value } : x) })}>
                    {EMAIL_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input aria-label="E-mail" type="email" value={m.email} onChange={e => setRel(i, { emails: r.emails.map((x, z) => z === k ? { ...x, email: e.target.value } : x) })} />
                  <button type="button" className="icon-del" onClick={() => setRel(i, { emails: r.emails.filter((_, z) => z !== k) })}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VehiclesTab({ full, editing, onChange }: { full: ClientFull; editing: boolean; onChange: (f: ClientFull) => void }) {
  const v = full.vehicles;
  const upd = (i: number, k: keyof ClientFull["vehicles"][number], val: string) => onChange({ ...full, vehicles: v.map((x, j) => (j === i ? { ...x, [k]: val } : x)) });
  return (
    <div className="tab-pad">
      <Panel title="Vehicles" icon={Car} action={editing && <button type="button" className="add-small" onClick={() => onChange({ ...full, vehicles: [...v, { vehicle: "", brand: "", model: "", plate: "", itv_date: "" }] })}><Plus size={13} /> Afegir</button>}>
        {!editing ? (v.length ? (
          <table className="mini-table">
            <thead><tr><th>Vehicle</th><th>Marca</th><th>Model</th><th>Matrícula</th><th>ITV</th></tr></thead>
            <tbody>{v.map((x, i) => <tr key={i}><td>{x.vehicle}</td><td>{x.brand}</td><td>{x.model}</td><td><strong>{x.plate}</strong></td><td>{fmtDate(x.itv_date)}</td></tr>)}</tbody>
          </table>
        ) : <Empty>Sense vehicles. Afegeix-los amb «Modificar client».</Empty>) : <>
          {v.length > 0 && <div className="row-line vehicle-line row-head"><span>Vehicle</span><span>Marca</span><span>Model</span><span>Matrícula</span><span>ITV</span><span /></div>}
          {v.map((x, i) => (
            <div className="row-line vehicle-line" key={i}>
              <input aria-label="Vehicle" placeholder="Turisme, moto…" value={x.vehicle} onChange={e => upd(i, "vehicle", e.target.value)} />
              <input aria-label="Marca" value={x.brand} onChange={e => upd(i, "brand", e.target.value)} />
              <input aria-label="Model" value={x.model} onChange={e => upd(i, "model", e.target.value)} />
              <input aria-label="Matrícula" value={x.plate} onChange={e => upd(i, "plate", e.target.value.toUpperCase())} />
              <input aria-label="ITV" type="date" value={x.itv_date} onChange={e => upd(i, "itv_date", e.target.value)} />
              <button type="button" className="icon-del" onClick={() => onChange({ ...full, vehicles: v.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>
            </div>
          ))}
          {!v.length && <p className="hint">Sense vehicles. Prem «Afegir».</p>}
        </>}
      </Panel>
    </div>
  );
}

// Alta i modificació de clients (PDF pàg. 2, 3 i 5 + PDF 2 «Client»).
// El mateix formulari serveix per crear i per editar.
import { useEffect, useState } from "react";
import { AlertTriangle, Car, FileText, Folder, Mail, MapPin, Phone, Plus, Save, Trash2, UserRound, Users, X } from "lucide-react";
import { CheckInput, Notice, SelectInput, TextArea, TextInput } from "../../components/ui";
import { COUNTRIES, EMAIL_TYPES, LANGUAGES, PHONE_TYPES, STREET_TYPES, TITLES, TOWNS } from "../../lib/constants";
import { accountCode, checkDniNie, checkEmail } from "../../lib/format";
import { emptyRelated, findDuplicates, type DuplicateHit } from "../../data/clients";
import type { ClientFull, Profile, RelatedPerson } from "../../types";

interface Props {
  initial: ClientFull;
  responsibles: Profile[];
  saving: boolean;
  error: string;
  onSave: (full: ClientFull) => void;
  onCancel: () => void;
}

export function ClientForm({ initial, responsibles, saving, error, onSave, onCancel }: Props) {
  const [f, setF] = useState<ClientFull>(initial);
  const [tried, setTried] = useState(false);
  const isNew = !initial.client.id;
  const [dups, setDups] = useState<DuplicateHit[]>([]);

  // Avís de duplicats: es comprova mentre s'escriu (amb una petita espera) i abans de gravar
  const dupKey = JSON.stringify([f.client.dni, f.client.nie, f.client.passport, f.phones.map(p => p.phone_number), f.emails.map(e => e.email)]);
  useEffect(() => {
    const t = setTimeout(() => { findDuplicates(f).then(setDups).catch(() => setDups([])); }, 600);
    return () => clearTimeout(t);
  }, [dupKey]);

  // Helpers per modificar parts de l'estat sense repetir codi
  const setClient = (k: keyof ClientFull["client"], v: any) => setF(p => ({ ...p, client: { ...p.client, [k]: v } }));
  const setAddr = (k: keyof ClientFull["address"], v: string) => setF(p => ({ ...p, address: { ...p.address, [k]: v } }));
  const setList = <K extends "phones" | "emails" | "vehicles" | "related">(k: K, fn: (l: ClientFull[K]) => ClientFull[K]) =>
    setF(p => ({ ...p, [k]: fn(p[k]) }));
  const setRel = (i: number, patch: Partial<RelatedPerson>) =>
    setList("related", l => l.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const c = f.client;
  const errors = {
    name: !c.first_name.trim() && !c.last_name.trim() ? "Cal indicar el nom o els cognoms" : null,
    code: !/^\d+$/.test(c.client_code) || Number(c.client_code) <= 0 ? "Ha de ser un número (sense el 430)" : null,
    dni: c.dni ? checkDniNie(c.dni) : null,
    nie: c.nie ? checkDniNie(c.nie) : null,
    emails: f.emails.map(e => checkEmail(e.email)),
    pct: f.related.map(r => r.ownership_percentage && (Number(r.ownership_percentage) < 0 || Number(r.ownership_percentage) > 100) ? "Entre 0 i 100" : null),
  };
  const hasErrors = !!(errors.name || errors.code || errors.dni || errors.nie || errors.emails.some(Boolean) || errors.pct.some(Boolean));
  const show = (e: string | null) => (tried ? e : null);

  async function submit() {
    setTried(true);
    if (hasErrors) return;
    const found = await findDuplicates(f).catch(() => dups);
    setDups(found);
    if (found.length && !window.confirm(`Atenció: possible client duplicat.\n\n${found.map(d => `· ${accountCode(d.client_code)} ${d.name}${d.status !== "active" ? " (baixa)" : ""}: ${d.fields.join(", ")}`).join("\n")}\n\nVols gravar igualment?`)) return;
    onSave(f);
  }

  function pickTown(v: string) {
    setAddr("municipality", v);
    const t = TOWNS.find(x => x.town.toLowerCase() === v.toLowerCase());
    if (t) setF(p => ({ ...p, address: { ...p.address, municipality: t.town, postal_code: p.address.postal_code || t.postalCode, province: t.province, country: t.country, country_code: COUNTRIES.find(x => x.name === t.country)?.code || p.address.country_code } }));
  }
  function pickCountry(v: string) {
    const k = COUNTRIES.find(x => x.name.toLowerCase() === v.toLowerCase());
    setF(p => ({ ...p, address: { ...p.address, country: v, country_code: k ? k.code : p.address.country_code } }));
  }

  return (
    <section className="new-client-form">
      <div className="new-client-title"><Users size={22} /><strong>{isNew ? "Alta de client" : `Modificar client ${accountCode(c.client_code)}`}</strong></div>
      {error && <Notice kind="error">{error}</Notice>}
      {tried && hasErrors && <Notice kind="error">Revisa els camps marcats en vermell.</Notice>}
      {dups.length > 0 && (
        <div className="dup-warning" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Possible client duplicat</strong> — {dups.length === 1 ? "hi ha un altre client" : `hi ha ${dups.length} clients`} amb dades iguals:
            <ul>{dups.map(d => <li key={d.client_id}><b>{accountCode(d.client_code)} · {d.name}</b>{d.status !== "active" && " (de baixa)"} — {d.fields.join(" · ")}</li>)}</ul>
            <small>Comprova que no sigui el mateix client abans de gravar. Si ho és, cancel·la i obre la seva fitxa (pots buscar-lo a la barra de dalt).</small>
          </div>
        </div>
      )}

      <datalist id="towns">{TOWNS.map(t => <option key={t.town} value={t.town} />)}</datalist>
      <datalist id="countries">{COUNTRIES.map(t => <option key={t.code} value={t.name} />)}</datalist>

      <div className="new-client-panels">
        {/* ---------- Identificació ---------- */}
        <section className="new-client-panel">
          <h3><UserRound size={18} />Dades identificatives</h3>
          <div className="form-grid">
            <TextInput label="Codi client (sense 430)" value={c.client_code} onChange={v => setClient("client_code", v.replace(/\D/g, ""))} error={show(errors.code)} required />
            <TextInput label="Subcompte" value={accountCode(c.client_code)} readOnly />
            <SelectInput label="Tractament" value={c.title} onChange={v => setClient("title", v)} options={TITLES} empty="—" />
            <SelectInput label="Sexe" value={c.sex} onChange={v => setClient("sex", v)} options={[["H", "Home"], ["D", "Dona"]]} empty="—" />
            <TextInput label="Nom" value={c.first_name} onChange={v => setClient("first_name", v)} error={show(errors.name)} required />
            <TextInput label="Cognoms" value={c.last_name} onChange={v => setClient("last_name", v)} required />
            <TextInput label="Inicials" value={c.initials} onChange={v => setClient("initials", v)} />
            <TextInput label="Nom reduït" value={c.short_name} onChange={v => setClient("short_name", v)} />
            <SelectInput label="Tipus de client" value={c.client_type} onChange={v => setClient("client_type", v)} options={[["particular", "Particular"], ["empresa", "Empresa"]]} />
            <SelectInput label="Responsable assignat" value={c.responsible_id} onChange={v => setClient("responsible_id", v)} options={responsibles.map(r => [r.id, r.full_name || r.email || r.id] as [string, string])} empty="Sense assignar" />
            <TextInput label="D.N.I." value={c.dni} onChange={v => setClient("dni", v.toUpperCase())} error={show(errors.dni)} />
            <TextInput label="N.I.E." value={c.nie} onChange={v => setClient("nie", v.toUpperCase())} error={show(errors.nie)} />
            <TextInput label="Passaport" value={c.passport} onChange={v => setClient("passport", v.toUpperCase())} />
            <TextInput label="Caducitat passaport" type="date" value={c.passport_expiry} onChange={v => setClient("passport_expiry", v)} />
            <CheckInput label="Resident" checked={c.resident} onChange={v => setClient("resident", v)} />
            <CheckInput label="Autorització" checked={c.authorization_ok} onChange={v => setClient("authorization_ok", v)} />
          </div>
          {!responsibles.length && <p className="hint">No hi ha cap usuari marcat com a responsable (taula <code>profiles</code>, camp <code>is_responsible</code>).</p>}
        </section>

        {/* ---------- Adreça ---------- */}
        <section className="new-client-panel">
          <h3><MapPin size={18} />Adreça</h3>
          <div className="form-grid">
            <SelectInput label="Tipus de via" value={f.address.street_type} onChange={v => setAddr("street_type", v)} options={STREET_TYPES} empty="—" />
            <TextInput label="Número" value={f.address.street_number} onChange={v => setAddr("street_number", v)} />
            <TextInput label="Adreça" value={f.address.street_name} onChange={v => setAddr("street_name", v)} wide />
            <TextInput label="Bloc, urbanització, pis…" value={f.address.extra} onChange={v => setAddr("extra", v)} wide />
            <TextInput label="Codi postal" value={f.address.postal_code} onChange={v => setAddr("postal_code", v)} />
            <TextInput label="Població" value={f.address.municipality} onChange={pickTown} list="towns" />
            <TextInput label="Província" value={f.address.province} onChange={v => setAddr("province", v)} />
            <TextInput label="País" value={f.address.country} onChange={pickCountry} list="countries" />
            <TextInput label="Codi país" value={f.address.country_code} onChange={v => setAddr("country_code", v.toUpperCase())} />
          </div>
        </section>

        {/* ---------- Altres dades personals ---------- */}
        <section className="new-client-panel">
          <h3><FileText size={18} />Altres dades personals</h3>
          <div className="form-grid">
            <SelectInput label="Idioma (correus)" value={c.language} onChange={v => setClient("language", v)} options={LANGUAGES} empty="—" />
            <TextInput label="Nacionalitat" value={c.nationality} onChange={v => setClient("nationality", v)} />
            <TextInput label="Data naixement" type="date" value={c.birth_date} onChange={v => setClient("birth_date", v)} />
            <TextInput label="Ciutat naixement" value={c.birth_city} onChange={v => setClient("birth_city", v)} />
            <TextInput label="C.P. país naixement" value={c.birth_country_code} onChange={v => setClient("birth_country_code", v.toUpperCase())} />
            <TextInput label="Anagrama" value={c.anagram} onChange={v => setClient("anagram", v)} />
          </div>
        </section>

        {/* ---------- Telèfons ---------- */}
        <section className="new-client-panel">
          <h3><Phone size={18} />Telèfons
            <button type="button" className="add-small" onClick={() => setList("phones", l => [...l, { phone_type: "mobil", country_prefix: f.phones[0]?.country_prefix || "+34", phone_number: "", notes: "" }])}><Plus size={13} /> Afegir</button>
          </h3>
          {f.phones.map((p, i) => (
            <div className="row-line phone-line" key={i}>
              <select aria-label="Tipus" value={p.phone_type} onChange={e => setList("phones", l => l.map((x, j) => j === i ? { ...x, phone_type: e.target.value } : x))}>
                {PHONE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input aria-label="Prefix" value={p.country_prefix} onChange={e => setList("phones", l => l.map((x, j) => j === i ? { ...x, country_prefix: e.target.value } : x))} />
              <input aria-label="Número" placeholder="Número" value={p.phone_number} onChange={e => setList("phones", l => l.map((x, j) => j === i ? { ...x, phone_number: e.target.value } : x))} />
              <input aria-label="Nota" placeholder="Nota (opcional)" value={p.notes} onChange={e => setList("phones", l => l.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} />
              <button type="button" className="icon-del" title="Treure" onClick={() => setList("phones", l => l.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
            </div>
          ))}
          {!f.phones.length && <p className="hint">Sense telèfons.</p>}
          <p className="hint">El primer de la llista és el principal.</p>
        </section>

        {/* ---------- E-mails ---------- */}
        <section className="new-client-panel">
          <h3><Mail size={18} />E-mails
            <button type="button" className="add-small" onClick={() => setList("emails", l => [...l, { email_type: "particular", email: "" }])}><Plus size={13} /> Afegir</button>
          </h3>
          {f.emails.map((e, i) => (
            <div className={"row-line email-line" + (show(errors.emails[i]) ? " has-error" : "")} key={i}>
              <select aria-label="Tipus" value={e.email_type} onChange={ev => setList("emails", l => l.map((x, j) => j === i ? { ...x, email_type: ev.target.value } : x))}>
                {EMAIL_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input aria-label="E-mail" type="email" placeholder="correu@exemple.com" value={e.email} onChange={ev => setList("emails", l => l.map((x, j) => j === i ? { ...x, email: ev.target.value } : x))} />
              <button type="button" className="icon-del" title="Treure" onClick={() => setList("emails", l => l.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
            </div>
          ))}
          {!f.emails.length && <p className="hint">Sense e-mails.</p>}
        </section>

        {/* ---------- Documental i observacions ---------- */}
        <section className="new-client-panel">
          <h3><Folder size={18} />Documental i observacions</h3>
          <div className="form-grid">
            <TextInput label="Ruta documental" value={c.documents_path} onChange={v => setClient("documents_path", v)} placeholder="P:\ADMINISTRACIO\CLIENTS\..." wide />
            <TextArea label="Observacions" value={c.observations} onChange={v => setClient("observations", v)} rows={4} />
          </div>
          <p className="hint">Les alertes (amb data i checklist) es gestionen a part, des de la fitxa del client.</p>
        </section>
      </div>

      {/* ---------- Cònjuge i copropietaris ---------- */}
      <section className="new-client-panel">
        <h3><Users size={18} />Cònjuge i copropietaris
          <span className="h3-actions">
            {!f.related.some(r => r.relation === "conjuge") && <button type="button" className="add-small" onClick={() => setList("related", l => [emptyRelated("conjuge"), ...l])}><Plus size={13} /> Cònjuge</button>}
            <button type="button" className="add-small" onClick={() => setList("related", l => [...l, emptyRelated("copropietari")])}><Plus size={13} /> Copropietari</button>
          </span>
        </h3>
        {!f.related.length && <p className="hint">No n'hi ha cap. Fes servir els botons per afegir-ne.</p>}
        <div className="related-grid">
          {f.related.map((r, i) => (
            <div className="related-card" key={r.id || "new" + i}>
              <header>
                <strong>{r.relation === "conjuge" ? "Cònjuge" : `Copropietari (${f.related.slice(0, i + 1).filter(x => x.relation === "copropietari").length})`}</strong>
                <button type="button" className="icon-del" title="Treure" onClick={() => setList("related", l => l.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
              </header>
              <div className="form-grid">
                <SelectInput label="Sr./Sra." value={r.title} onChange={v => setRel(i, { title: v })} options={TITLES} empty="—" />
                <TextInput label="% propietat" type="number" value={r.ownership_percentage} onChange={v => setRel(i, { ownership_percentage: v })} error={show(errors.pct[i])} />
                <TextInput label="Nom" value={r.first_name} onChange={v => setRel(i, { first_name: v })} />
                <TextInput label="Cognoms" value={r.last_name} onChange={v => setRel(i, { last_name: v })} />
                <TextInput label="Naixement" type="date" value={r.birth_date} onChange={v => setRel(i, { birth_date: v })} />
                <TextInput label="Ciutat naix." value={r.birth_city} onChange={v => setRel(i, { birth_city: v })} />
                <TextInput label="C. país naix." value={r.birth_country_code} onChange={v => setRel(i, { birth_country_code: v.toUpperCase() })} />
                <TextInput label="Anagrama" value={r.anagram} onChange={v => setRel(i, { anagram: v })} />
                <TextInput label="Passaport" value={r.passport} onChange={v => setRel(i, { passport: v.toUpperCase() })} />
                <TextInput label="Caducitat" type="date" value={r.passport_expiry} onChange={v => setRel(i, { passport_expiry: v })} />
                <TextInput label="N.I.E." value={r.nie} onChange={v => setRel(i, { nie: v.toUpperCase() })} />
                <TextInput label="D.N.I." value={r.dni} onChange={v => setRel(i, { dni: v.toUpperCase() })} />
                <TextInput label="Adreça" value={r.street} onChange={v => setRel(i, { street: v })} wide />
                <TextInput label="Codi postal" value={r.postal_code} onChange={v => setRel(i, { postal_code: v })} />
                <TextInput label="Població" value={r.municipality} onChange={v => setRel(i, { municipality: v })} list="towns" />
                <TextInput label="Província" value={r.province} onChange={v => setRel(i, { province: v })} />
                <TextInput label="País" value={r.country} onChange={v => setRel(i, { country: v })} list="countries" />
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
      </section>

      {/* ---------- Matrícules ---------- */}
      <section className="new-client-panel">
        <h3><Car size={18} />Matrícules
          <button type="button" className="add-small" onClick={() => setList("vehicles", l => [...l, { vehicle: "", brand: "", model: "", plate: "", itv_date: "" }])}><Plus size={13} /> Afegir</button>
        </h3>
        {f.vehicles.length > 0 && <div className="row-line vehicle-line row-head"><span>Vehicle</span><span>Marca</span><span>Model</span><span>Matrícula</span><span>ITV</span><span /></div>}
        {f.vehicles.map((v, i) => {
          const upd = (k: keyof typeof v, val: string) => setList("vehicles", l => l.map((x, j) => j === i ? { ...x, [k]: val } : x));
          return (
            <div className="row-line vehicle-line" key={i}>
              <input aria-label="Vehicle" placeholder="Turisme, moto…" value={v.vehicle} onChange={e => upd("vehicle", e.target.value)} />
              <input aria-label="Marca" value={v.brand} onChange={e => upd("brand", e.target.value)} />
              <input aria-label="Model" value={v.model} onChange={e => upd("model", e.target.value)} />
              <input aria-label="Matrícula" value={v.plate} onChange={e => upd("plate", e.target.value.toUpperCase())} />
              <input aria-label="ITV" type="date" value={v.itv_date} onChange={e => upd("itv_date", e.target.value)} />
              <button type="button" className="icon-del" onClick={() => setList("vehicles", l => l.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
            </div>
          );
        })}
        {!f.vehicles.length && <p className="hint">Sense vehicles.</p>}
      </section>

      <div className="form-actions sticky-actions">
        <button className="cancel-btn" onClick={onCancel} disabled={saving}><X size={16} /> Cancel·lar</button>
        <button className="save-btn" onClick={submit} disabled={saving}><Save size={16} /> {saving ? "Desant…" : "Gravar"}</button>
      </div>
    </section>
  );
}

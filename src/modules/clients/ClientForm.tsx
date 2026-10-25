// Dades del client (alta i modificació). Formulari CONTROLAT: l'estat el té la
// fitxa (ClientsPage), que és qui valida i grava. Així es pot editar dins la
// mateixa pestanya de la fitxa i gravar des de la barra de baix.
// Cònjuge/copropietaris i matrícules s'editen a les seves pestanyes (RelatedEditors.tsx).
import { useEffect, useState } from "react";
import { AlertTriangle, FileText, Folder, Mail, MapPin, Phone, Plus, Trash2, UserRound } from "lucide-react";
import { CheckInput, SelectInput, TextArea, TextInput } from "../../components/ui";
import { FolderPathInput } from "../../components/FolderPathInput";
import { COUNTRIES, EMAIL_TYPES, NATIONALITIES, PHONE_TYPES, PROVINCES, STREET_TYPES, TITLES, TOWNS } from "../../lib/constants";
import { accountCode, checkDniNie, checkEmail } from "../../lib/format";
import { findDuplicates, type DuplicateHit } from "../../data/clients";
import { useLanguages } from "../../data/settings";
import type { ClientFull, Profile } from "../../types";

/** Errors de validació de les dades del client (null = correcte) */
export function clientErrors(full: ClientFull, isNew: boolean) {
  const c = full.client;
  return {
    name: !c.first_name.trim() && !c.last_name.trim() ? "Cal indicar el nom o els cognoms" : null,
    code: isNew && (!/^\d+$/.test(c.client_code) || Number(c.client_code) <= 0) ? "Obligatori: escriu el número (sense el 430)" : null,
    account: isNew && c.account_code && !/^\d+$/.test(c.account_code) ? "Només números" : null,
    dni: c.dni ? checkDniNie(c.dni) : null,
    nie: c.nie ? checkDniNie(c.nie) : null,
    emails: full.emails.map(e => checkEmail(e.email)),
  };
}
export function hasClientErrors(e: ReturnType<typeof clientErrors>) {
  return !!(e.name || e.code || e.account || e.dni || e.nie || e.emails.some(Boolean));
}

/** Llista d'opcions que conserva el valor actual encara que no hi sigui (dades antigues) */
const withCurrent = (list: string[], v: string) => (v && !list.includes(v) ? [v, ...list] : list);

interface Props {
  value: ClientFull;
  onChange: (f: ClientFull) => void;
  responsibles: Profile[];
  isNew: boolean;
  showErrors: boolean;
}

export function ClientForm({ value: f, onChange, responsibles, isNew, showErrors }: Props) {
  const [dups, setDups] = useState<DuplicateHit[]>([]);
  const languages = useLanguages();

  // Avís de duplicats: es comprova mentre s'escriu (amb una petita espera)
  const dupKey = JSON.stringify([f.client.dni, f.client.nie, f.client.passport, f.phones.map(p => p.phone_number), f.emails.map(e => e.email)]);
  useEffect(() => {
    const t = setTimeout(() => { findDuplicates(f).then(setDups).catch(() => setDups([])); }, 600);
    return () => clearTimeout(t);
  }, [dupKey]);

  const setClient = (k: keyof ClientFull["client"], v: any) => onChange({ ...f, client: { ...f.client, [k]: v } });
  const setAddr = (patch: Partial<ClientFull["address"]>) => onChange({ ...f, address: { ...f.address, ...patch } });
  const setPhones = (phones: ClientFull["phones"]) => onChange({ ...f, phones });
  const setEmails = (emails: ClientFull["emails"]) => onChange({ ...f, emails });

  const c = f.client;
  const errors = clientErrors(f, isNew);
  const show = (e: string | null) => (showErrors ? e : null);

  // Població → codi postal, província i país; codi postal → població
  function pickTown(v: string) {
    const t = TOWNS.find(x => x.town.toLowerCase() === v.toLowerCase());
    if (!t) { setAddr({ municipality: v }); return; }
    setAddr({ municipality: t.town, postal_code: t.postalCode, province: t.province, country: t.country, country_code: COUNTRIES.find(x => x.name === t.country)?.code || f.address.country_code });
  }
  function pickPostalCode(v: string) {
    const t = TOWNS.filter(x => x.postalCode === v.trim());
    if (t.length === 1) setAddr({ postal_code: v, municipality: t[0].town, province: t[0].province, country: t[0].country, country_code: COUNTRIES.find(x => x.name === t[0].country)?.code || f.address.country_code });
    else setAddr({ postal_code: v });
  }
  function pickCountry(v: string) {
    const k = COUNTRIES.find(x => x.name === v);
    setAddr({ country: v, country_code: k ? k.code : f.address.country_code });
  }

  return (
    <div className="client-edit">
      {dups.length > 0 && (
        <div className="dup-warning" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Possible client duplicat</strong> — {dups.length === 1 ? "hi ha un altre client" : `hi ha ${dups.length} clients`} amb dades iguals:
            <ul>{dups.map(d => <li key={d.client_id}><b>{accountCode(d.client_code)} · {d.name}</b>{d.status !== "active" && " (de baixa)"} — {d.fields.join(" · ")}</li>)}</ul>
            <small>Comprova que no sigui el mateix client abans de gravar.</small>
          </div>
        </div>
      )}

      <datalist id="towns">{TOWNS.map(t => <option key={t.town} value={t.town}>{t.postalCode}</option>)}</datalist>
      <datalist id="postal-codes">{[...new Set(TOWNS.map(t => t.postalCode))].map(cp => <option key={cp} value={cp}>{TOWNS.filter(t => t.postalCode === cp).map(t => t.town).join(", ")}</option>)}</datalist>

      {/* ---------- Identificació ---------- */}
      <section className="new-client-panel">
        <h3><UserRound size={18} />Dades identificatives</h3>
        <div className="form-grid four">
          {isNew && <TextInput label="Codi client (sense 430)" value={c.client_code} onChange={v => setClient("client_code", v.replace(/\D/g, ""))} error={show(errors.code)} required />}
          {isNew && <TextInput label="Subcompte" value={c.account_code} placeholder="430…" onChange={v => setClient("account_code", v.replace(/\D/g, ""))} error={show(errors.account)} />}
          <SelectInput label="Tractament" value={c.title} onChange={v => setClient("title", v)} options={TITLES} empty="—" />
          <SelectInput label="Sexe" value={c.sex} onChange={v => setClient("sex", v)} options={[["H", "Home"], ["D", "Dona"]]} empty="—" />
          <TextInput label="Nom" value={c.first_name} onChange={v => setClient("first_name", v)} error={show(errors.name)} required />
          <TextInput label="Cognoms" value={c.last_name} onChange={v => setClient("last_name", v)} required />
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
      </section>

      {/* ---------- Adreça ---------- */}
      <section className="new-client-panel">
        <h3><MapPin size={18} />Adreça</h3>
        <div className="form-grid four">
          <SelectInput label="Tipus de via" value={f.address.street_type} onChange={v => setAddr({ street_type: v })} options={STREET_TYPES} empty="—" />
          <TextInput label="Adreça" value={f.address.street_name} onChange={v => setAddr({ street_name: v })} wide2 />
          <TextInput label="Número" value={f.address.street_number} onChange={v => setAddr({ street_number: v })} />
          <TextInput label="Bloc, urbanització, pis…" value={f.address.extra} onChange={v => setAddr({ extra: v })} wide />
          <TextInput label="Codi postal" value={f.address.postal_code} onChange={pickPostalCode} list="postal-codes" />
          <TextInput label="Població" value={f.address.municipality} onChange={pickTown} list="towns" />
          <SelectInput label="Província" value={f.address.province} onChange={v => setAddr({ province: v })} options={withCurrent(PROVINCES, f.address.province)} empty="—" />
          <SelectInput label="País" value={f.address.country} onChange={pickCountry} options={withCurrent(COUNTRIES.map(x => x.name), f.address.country)} empty="—" />
        </div>
      </section>

      {/* ---------- Altres dades personals ---------- */}
      <section className="new-client-panel">
        <h3><FileText size={18} />Altres dades personals</h3>
        <div className="form-grid four">
          <SelectInput label="Idioma (correus)" value={c.language} onChange={v => setClient("language", v)} options={languages} empty="—" />
          <SelectInput label="Nacionalitat" value={c.nationality} onChange={v => setClient("nationality", v)} options={withCurrent(NATIONALITIES, c.nationality)} empty="—" />
          <TextInput label="Data naixement" type="date" value={c.birth_date} onChange={v => setClient("birth_date", v)} />
          <TextInput label="Ciutat naixement" value={c.birth_city} onChange={v => setClient("birth_city", v)} />
          <SelectInput label="País naixement" value={c.birth_country_code} onChange={v => setClient("birth_country_code", v)} options={withCurrent(COUNTRIES.map(x => x.code), c.birth_country_code).map(code => [code, COUNTRIES.find(x => x.code === code)?.name || code] as [string, string])} empty="—" />
          <TextInput label="Anagrama" value={c.anagram} onChange={v => setClient("anagram", v)} />
        </div>
      </section>

      <div className="client-edit-row">
        {/* ---------- Telèfons ---------- */}
        <section className="new-client-panel">
          <h3><Phone size={18} />Telèfons
            <button type="button" className="add-small" onClick={() => setPhones([...f.phones, { phone_type: "mobil", country_prefix: f.phones[0]?.country_prefix || "+34", phone_number: "", notes: "" }])}><Plus size={13} /> Afegir</button>
          </h3>
          {f.phones.map((p, i) => (
            <div className="row-line phone-line" key={i}>
              <select aria-label="Tipus" value={p.phone_type} onChange={e => setPhones(f.phones.map((x, j) => j === i ? { ...x, phone_type: e.target.value } : x))}>
                {PHONE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input aria-label="Prefix" value={p.country_prefix} onChange={e => setPhones(f.phones.map((x, j) => j === i ? { ...x, country_prefix: e.target.value } : x))} />
              <input aria-label="Número" placeholder="Número" value={p.phone_number} onChange={e => setPhones(f.phones.map((x, j) => j === i ? { ...x, phone_number: e.target.value } : x))} />
              <input aria-label="Nota" placeholder="Nota (opcional)" value={p.notes} onChange={e => setPhones(f.phones.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} />
              <button type="button" className="icon-del" title="Treure" onClick={() => setPhones(f.phones.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
            </div>
          ))}
          {!f.phones.length && <p className="hint">Sense telèfons.</p>}
          <p className="hint">El primer de la llista és el principal.</p>
        </section>

        {/* ---------- E-mails ---------- */}
        <section className="new-client-panel">
          <h3><Mail size={18} />E-mails
            <button type="button" className="add-small" onClick={() => setEmails([...f.emails, { email_type: "particular", email: "" }])}><Plus size={13} /> Afegir</button>
          </h3>
          {f.emails.map((e, i) => (
            <div className={"row-line email-line" + (show(errors.emails[i]) ? " has-error" : "")} key={i}>
              <select aria-label="Tipus" value={e.email_type} onChange={ev => setEmails(f.emails.map((x, j) => j === i ? { ...x, email_type: ev.target.value } : x))}>
                {EMAIL_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input aria-label="E-mail" type="email" placeholder="correu@exemple.com" value={e.email} onChange={ev => setEmails(f.emails.map((x, j) => j === i ? { ...x, email: ev.target.value } : x))} />
              <button type="button" className="icon-del" title="Treure" onClick={() => setEmails(f.emails.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
            </div>
          ))}
          {!f.emails.length && <p className="hint">Sense e-mails.</p>}
        </section>
      </div>

      {/* ---------- Documental i observacions ---------- */}
      <section className="new-client-panel">
        <h3><Folder size={18} />Documental i observacions</h3>
        <div className="form-grid">
          <FolderPathInput label="Ruta de la carpeta a l'ordinador" value={c.documents_path} onChange={v => setClient("documents_path", v)} placeholder="P:\ADMINISTRACIO\CLIENTS\..." />
          <TextArea label="Observacions" value={c.observations} onChange={v => setClient("observations", v)} rows={3} />
        </div>
      </section>
    </div>
  );
}

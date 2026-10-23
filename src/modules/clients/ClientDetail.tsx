// Fitxa del client. Tot el programa gira al voltant del client:
//   capçalera = client + les seves finques (es tria la finca amb un clic)
//   pestanyes = Client · Finca · Impostos · Claus · Cònjuge · Matrícules · (Revisions · Incidències)
//   lateral   = alertes, visibles des de qualsevol pestanya
import { AlertTriangle, CalendarDays, Car, ChevronLeft, ChevronRight, ContactRound, House, KeyRound, Landmark, Mail, MapPin, Pencil, Phone, Plus, Power, UserRound, Users, X } from "lucide-react";
import { accountCode, fmtDate, fullName } from "../../lib/format";
import { EMAIL_TYPES, LANGUAGES, PHONE_TYPES } from "../../lib/constants";
import { Empty, Info2, Notice, Panel } from "../../components/ui";
import { AlertsPanel } from "../alerts/AlertsPanel";
import { FincaTab } from "../finques/FincaTab";
import { TaxesTab } from "../finques/TaxesTab";
import { KeysTab } from "../finques/KeysTab";
import type { ClientFull, Profile, PropertyLink } from "../../types";

export const CLIENT_TABS = [
  ["client", "Client", ContactRound, false],
  ["finca", "Finca", House, true],
  ["impostos", "Impostos", Landmark, true],
  ["claus", "Claus", KeyRound, true],
  ["conjuge", "Cònjuge - copropietaris", Users, false],
  ["matricules", "Matrícules", Car, false],
  ["revisions", "Revisions", CalendarDays, true],
  ["incidencies", "Incidències", AlertTriangle, true],
] as const;
export type ClientTab = typeof CLIENT_TABS[number][0];

const label = (list: [string, string][], v: string) => list.find(x => x[0] === v)?.[1] || v;

interface Props {
  full: ClientFull;
  properties: PropertyLink[];
  responsibles: Profile[];
  canWrite: boolean;
  userId?: string;
  position: { index: number; total: number };
  error: string;
  tab: ClientTab;
  propertyId: string | null | "new";
  onTab: (t: ClientTab) => void;
  onSelectProperty: (id: string | "new") => void;
  onPropertySaved: (id: string) => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function ClientDetail(p: Props) {
  const { client: c, address: a } = p.full;
  const responsible = p.responsibles.find(r => r.id === c.responsible_id);
  const addressLine = [a.street_type, a.street_name, a.street_number].filter(Boolean).join(" ");
  const finca = p.propertyId && p.propertyId !== "new" ? p.properties.find(h => h.id === p.propertyId) || null : null;
  const fincaTabs: ClientTab[] = ["finca", "impostos", "claus", "revisions", "incidencies"];
  const needsFinca = fincaTabs.includes(p.tab);

  return (
    <div className="work-area">
      {/* ---------- Capçalera: client + les seves finques ---------- */}
      <section className="record-banner client-banner">
        <div className="record-summary">
          <div className="record-number">{accountCode(c.client_code)}
            <span className={"record-state" + (c.status === "inactive" ? " state-off" : "")}>{c.status === "inactive" ? "BAIXA" : c.resident ? "RESIDENT" : "NO RESIDENT"}</span>
          </div>
          <div><b>Client</b><strong>{[c.title, c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</strong></div>
          <div><b>Telèfon</b><strong>{p.full.phones.find(x => x.phone_number) ? `${p.full.phones[0].country_prefix} ${p.full.phones[0].phone_number}` : "—"}</strong></div>
          <div><b>Responsable</b><strong>{responsible ? responsible.full_name || responsible.email : "Sense assignar"}</strong></div>
        </div>
        <div className="banner-fincas">
          <div className="banner-fincas-head">
            <strong>Finques del client ({p.properties.length})</strong>
            {p.canWrite && c.status === "active" && <button className="banner-add" onClick={() => p.onSelectProperty("new")}><Plus size={14} /> Nova finca</button>}
          </div>
          <div className="banner-fincas-list">
            {p.properties.map(h => (
              <button type="button" key={h.id}
                className={"finca-chip" + (p.propertyId === h.id ? " on" : "") + (h.status === "baixa" ? " off" : "")}
                onClick={() => p.onSelectProperty(h.id)}>
                <span className="finca-num">{h.admin_number}</span>
                <span className="finca-addr">{h.address}<small>{h.municipality}{h.ownership_percentage != null && h.ownership_percentage < 100 ? ` · ${h.ownership_percentage}%` : ""}{h.status === "baixa" ? " · BAIXA" : ""}</small></span>
              </button>
            ))}
            {p.propertyId === "new" && <div className="finca-chip on"><span className="finca-num">+</span><span className="finca-addr">Finca nova<small>pendent de gravar</small></span></div>}
            {!p.properties.length && p.propertyId !== "new" && <span className="banner-empty">Encara no té finques{p.canWrite ? ". Prem «Nova finca»." : "."}</span>}
          </div>
        </div>
      </section>

      {p.error && <Notice kind="error">{p.error}</Notice>}

      <div className="detail-layout">
        <div className="detail-main">
          <div className="record-tabs">
            {CLIENT_TABS.map(([id, text, Icon, perFinca]) => (
              <button key={id} className={p.tab === id ? "selected" : ""} onClick={() => p.onTab(id)} title={perFinca ? "De la finca seleccionada" : undefined}>
                <Icon size={17} /><span>{text}</span>
              </button>
            ))}
          </div>
          {needsFinca && (finca || p.propertyId === "new") && (
            <div className="finca-context"><House size={15} /> Finca seleccionada: <strong>{p.propertyId === "new" ? "nova" : `${finca!.admin_number} · ${finca!.address}`}</strong></div>
          )}

          {needsFinca && !finca && p.propertyId !== "new" ? (
            <div className="tab-pad"><Panel title="Tria una finca" icon={House}>
              <Empty>{p.properties.length ? "Selecciona una de les finques del client a la capçalera." : "Aquest client encara no té cap finca."}</Empty>
              {p.canWrite && !p.properties.length && <button className="save-btn" onClick={() => p.onSelectProperty("new")}><Plus size={16} /> Donar d'alta una finca</button>}
            </Panel></div>
          ) : p.tab === "finca" ? (
            <FincaTab key={String(p.propertyId)} client={p.full} propertyId={p.propertyId === "new" ? null : p.propertyId} canWrite={p.canWrite} userId={p.userId}
              onSaved={p.onPropertySaved} onCancelNew={() => p.onSelectProperty(p.properties[0]?.id ?? "new")} />
          ) : p.tab === "impostos" ? (
            p.propertyId === "new" ? <div className="tab-pad"><Empty>Grava primer la finca nova.</Empty></div>
              : <TaxesTab propertyId={finca!.id} ownership={finca!.ownership_percentage} canWrite={p.canWrite} />
          ) : p.tab === "claus" ? (
            p.propertyId === "new" ? <div className="tab-pad"><Empty>Grava primer la finca nova.</Empty></div>
              : <KeysTab propertyId={finca!.id} keyOffice="" canWrite={p.canWrite} userId={p.userId} />
          ) : p.tab === "revisions" || p.tab === "incidencies" ? (
            <div className="tab-pad"><Panel title={p.tab === "revisions" ? "Revisions de la finca" : "Incidències de la finca"} icon={p.tab === "revisions" ? CalendarDays : AlertTriangle}>
              <Empty>Aquesta pestanya es desenvoluparà a la {p.tab === "revisions" ? "fase 4 (control de cases)" : "fase 5 (incidències i notes de servei)"}.</Empty>
            </Panel></div>
          ) : p.tab === "client" ? (
            <ClientData full={p.full} addressLine={addressLine} />
          ) : p.tab === "conjuge" ? (
            <div className="tab-pad related-grid">
              {!p.full.related.length && <Panel title="Cònjuge i copropietaris" icon={Users}><Empty>No n'hi ha cap. Afegeix-los amb «Modificar client».</Empty></Panel>}
              {p.full.related.map((r, i) => (
                <Panel key={r.id || i} title={r.relation === "conjuge" ? "Cònjuge" : "Copropietari"} icon={Users}>
                  <Info2 label="Nom" value={[r.title, r.first_name, r.last_name].filter(Boolean).join(" ")} />
                  <Info2 label="% propietat" value={r.ownership_percentage && r.ownership_percentage + " %"} />
                  <Info2 label="Naixement" value={[fmtDate(r.birth_date), r.birth_city, r.birth_country_code].filter(Boolean).join(" · ")} />
                  <Info2 label="Passaport" value={r.passport && `${r.passport}${r.passport_expiry ? " · cad. " + fmtDate(r.passport_expiry) : ""}`} />
                  <Info2 label="N.I.E. / D.N.I." value={[r.nie, r.dni].filter(Boolean).join(" / ")} />
                  <Info2 label="Adreça" value={[r.street, [r.postal_code, r.municipality].filter(Boolean).join(" "), r.province, r.country].filter(Boolean).join(", ")} />
                  <Info2 label="Telèfons" value={r.phones.filter(x => x.number).map(x => `${x.prefix} ${x.number}`).join(" · ")} />
                  <Info2 label="E-mails" value={r.emails.filter(x => x.email).map(x => x.email).join(" · ")} />
                </Panel>
              ))}
            </div>
          ) : (
            <div className="tab-pad">
              <Panel title="Vehicles" icon={Car}>
                {p.full.vehicles.length ? (
                  <table className="mini-table">
                    <thead><tr><th>Vehicle</th><th>Marca</th><th>Model</th><th>Matrícula</th><th>ITV</th></tr></thead>
                    <tbody>{p.full.vehicles.map((v, i) => <tr key={i}><td>{v.vehicle}</td><td>{v.brand}</td><td>{v.model}</td><td><strong>{v.plate}</strong></td><td>{fmtDate(v.itv_date)}</td></tr>)}</tbody>
                  </table>
                ) : <Empty>Sense vehicles. Afegeix-los amb «Modificar client».</Empty>}
              </Panel>
            </div>
          )}
        </div>

        <aside className="detail-side">
          {c.id && <AlertsPanel clientId={c.id} canWrite={p.canWrite} userId={p.userId} />}
        </aside>
      </div>

      <div className="bottom-bar">
        <div>
          {p.canWrite && <button className="save-btn" onClick={p.onEdit}><Pencil size={17} /> Modificar client</button>}
          {p.canWrite && <button className="cancel-btn" onClick={p.onToggleStatus}><Power size={17} /> {c.status === "inactive" ? "Reactivar client" : "Donar de baixa client"}</button>}
          <button className="cancel-btn" onClick={p.onBack}><X size={17} /> Tornar a la llista</button>
        </div>
        <div>
          <button className="cancel-btn" onClick={p.onPrev} disabled={p.position.index <= 0}><ChevronLeft size={18} /> Anterior</button>
          <span className="pos-label">{p.position.index + 1} / {p.position.total}</span>
          <button className="cancel-btn" onClick={p.onNext} disabled={p.position.index >= p.position.total - 1}>Següent <ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  );
}

function ClientData({ full, addressLine }: { full: ClientFull; addressLine: string }) {
  const { client: c, address: a } = full;
  return (
    <div className="record-grid">
      <div className="column-stack">
        <Panel title="Dades identificatives" icon={UserRound}>
          <Info2 label="Codi client" value={`${c.client_code} (${accountCode(c.client_code)})`} />
          <Info2 label="Tractament" value={c.title} />
          <Info2 label="Nom complet" value={fullName(c.first_name, c.last_name)} />
          <Info2 label="Inicials" value={c.initials} />
          <Info2 label="Nom reduït" value={c.short_name} />
          <Info2 label="Tipus" value={c.client_type === "empresa" ? "Empresa" : "Particular"} />
          <Info2 label="D.N.I." value={c.dni} />
          <Info2 label="N.I.E." value={c.nie} />
          <Info2 label="Passaport" value={c.passport && `${c.passport}${c.passport_expiry ? " · cad. " + fmtDate(c.passport_expiry) : ""}`} />
          <Info2 label="Autorització" value={c.authorization_ok ? "Sí" : "No"} />
        </Panel>
        <Panel title="Adreça" icon={MapPin}>
          <Info2 label="Adreça" value={addressLine} />
          <Info2 label="Bloc / urb." value={a.extra} />
          <Info2 label="C.P. i població" value={[a.postal_code, a.municipality].filter(Boolean).join(" ")} />
          <Info2 label="Província" value={a.province} />
          <Info2 label="País" value={[a.country, a.country_code && `(${a.country_code})`].filter(Boolean).join(" ")} />
          {addressLine && <button className="outline-btn small" onClick={() => window.open("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([addressLine, a.postal_code, a.municipality, a.country].filter(Boolean).join(", ")), "_blank", "noopener,noreferrer")}><MapPin size={14} /> Veure al mapa</button>}
        </Panel>
      </div>
      <div className="column-stack">
        <Panel title="Telèfons" icon={Phone}>
          {full.phones.filter(x => x.phone_number).length
            ? full.phones.filter(x => x.phone_number).map((x, i) => <Info2 key={i} label={label(PHONE_TYPES, x.phone_type)} value={<>{x.country_prefix} {x.phone_number}{x.notes && <small className="muted"> · {x.notes}</small>}</>} />)
            : <Empty>Sense telèfons.</Empty>}
        </Panel>
        <Panel title="E-mails" icon={Mail}>
          {full.emails.filter(x => x.email).length
            ? full.emails.filter(x => x.email).map((x, i) => <Info2 key={i} label={label(EMAIL_TYPES, x.email_type)} value={<a href={"mailto:" + x.email}>{x.email}</a>} />)
            : <Empty>Sense e-mails.</Empty>}
        </Panel>
      </div>
      <div className="column-stack">
        <Panel title="Altres dades personals" icon={Users}>
          <Info2 label="Idioma" value={label(LANGUAGES, c.language)} />
          <Info2 label="Nacionalitat" value={c.nationality} />
          <Info2 label="Data naixement" value={fmtDate(c.birth_date)} />
          <Info2 label="Ciutat naixement" value={c.birth_city} />
          <Info2 label="C.P. país naix." value={c.birth_country_code} />
          <Info2 label="Anagrama" value={c.anagram} />
        </Panel>
        <Panel title="Documental i observacions" icon={ContactRound}>
          <Info2 label="Ruta documental" value={c.documents_path && <code className="path">{c.documents_path}</code>} />
          <div className="obs-box">{c.observations || <em>Sense observacions.</em>}</div>
        </Panel>
      </div>
    </div>
  );
}

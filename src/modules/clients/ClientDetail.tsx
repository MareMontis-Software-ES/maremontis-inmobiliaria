// Fitxa del client. Tot el programa gira al voltant del client:
//   capçalera = client + les seves finques (es tria la finca amb un clic)
//   pestanyes = Client · Finca · Impostos · Claus · Cònjuge · Matrícules · (Revisions · Incidències)
//   lateral   = alertes, visibles des de qualsevol pestanya
// La capçalera i les pestanyes queden fixes a dalt; només es mou el contingut.
// «Modificar client» edita les dades dins la mateixa pestanya (Client, Cònjuge, Matrícules)
// i es grava o cancel·la des de la barra de baix.
import { AlertTriangle, CalendarDays, Car, ChevronLeft, ChevronRight, Copy, ContactRound, House, KeyRound, Landmark, Mail, MapPin, Pencil, Phone, Plus, Power, Save, UserRound, Users, X } from "lucide-react";
import { fmtDate, fullName } from "../../lib/format";
import { COUNTRIES, EMAIL_TYPES, PHONE_TYPES } from "../../lib/constants";
import { useLanguages } from "../../data/settings";
import { ClientForm } from "./ClientForm";
import { RelatedTab, VehiclesTab } from "./RelatedTabs";
import { Empty, Info2, Notice, Panel } from "../../components/ui";
import { AlertsPanel } from "../alerts/AlertsPanel";
import { FincaTab } from "../finques/FincaTab";
import { TaxesTab } from "../finques/TaxesTab";
import { KeysTab } from "../finques/KeysTab";
import { CaseView } from "../cases/CaseView";
import { IncidentsView } from "../incidents/IncidentsView";
import { HistoryButton } from "../../components/HistoryButton";
import type { ClientFull, ContractFeatures, Profile, PropertyLink } from "../../types";

export const CLIENT_TABS = [
  ["client", "Client", ContactRound, false],
  ["finca", "Finca", House, true],
  ["impostos", "Impostos", Landmark, true],
  ["claus", "Claus", KeyRound, true],
  ["conjuge", "Cònjuge - copropietaris", Users, true],
  ["matricules", "Matrícules", Car, false],
  ["revisions", "Revisions", CalendarDays, true],
  ["incidencies", "Incidències", AlertTriangle, false],
] as const;
export type ClientTab = typeof CLIENT_TABS[number][0];

// Pestanyes que depenen d'un servei del tipus de contracte de la finca (PDF 2: el contracte habilita funcions)
const TAB_FEATURE: Partial<Record<ClientTab, [keyof ContractFeatures, string]>> = {
  impostos: ["rent_210", "la renda / Model 210"],
  claus: ["key_custody", "la custòdia de claus"],
  revisions: ["revisions", "les revisions de l'immoble"],
};
const FEATURE_LABELS: [keyof ContractFeatures, string][] = [
  ["revisions", "Revisions"], ["rent_210", "Renda 210"], ["visits", "Visites"], ["key_custody", "Claus"], ["receipts", "Rebuts"],
];

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
  onPropertySaved: (id: string, tab?: ClientTab) => void;
  editing: boolean;
  draft: ClientFull | null;
  onDraft: (f: ClientFull) => void;
  showErrors: boolean;
  saving: boolean;
  onEdit: () => void;
  /** Entra a modificar el client partint d'aquestes dades (p. ex. amb un cònjuge nou ja afegit) */
  onEditWith: (f: ClientFull) => void;
  onSave: () => void;
  onCancel: () => void;
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
  const fincaTabs: ClientTab[] = ["finca", "impostos", "claus", "conjuge", "revisions"];
  const needsFinca = fincaTabs.includes(p.tab);
  // Amb una finca triada, les pestanyes de serveis que el seu contracte no inclou s'amaguen
  const excluded = (t: ClientTab) => { const f = TAB_FEATURE[t]; return !!finca && !!f && !finca.features[f[0]]; };
  const notIncluded = excluded(p.tab) ? TAB_FEATURE[p.tab]![1] : null;
  const editing = p.editing && !!p.draft;
  const shown = editing ? p.draft! : p.full;

  return (
    <div className="work-area">
      {/* ---------- Capçalera fixa: client + les seves finques + pestanyes ---------- */}
      <div className="ficha-head">
        <section className="record-banner client-banner">
          <div className="record-summary">
            <div className="record-number"><span title="Codi client">{c.client_code}</span>{c.account_code && <small className="account-code" title="Subcompte">{c.account_code}</small>}
              <span className={"record-state" + (c.status === "inactive" ? " state-off" : "")}>{c.status === "inactive" ? "BAIXA" : c.resident ? "RESIDENT" : "NO RESIDENT"}</span>
            </div>
            <div><b>Client</b><strong>{[c.title, c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</strong></div>
            <div><b>Telèfon</b><strong>{p.full.phones.find(x => x.phone_number) ? `${p.full.phones[0].country_prefix} ${p.full.phones[0].phone_number}` : "—"}</strong></div>
            <div><b>Responsable</b><strong>{responsible ? responsible.full_name || responsible.email : "Sense assignar"}</strong></div>
          </div>
          <div className="banner-fincas">
            <div className="banner-fincas-head">
              <strong>Finques del client ({p.properties.length})</strong>
              {p.canWrite && c.status === "active" && !editing && <button className="banner-add" onClick={() => p.onSelectProperty("new")}><Plus size={14} /> Nova finca</button>}
            </div>
            <div className="banner-fincas-list">
              {p.properties.map(h => (
                <button type="button" key={h.id}
                  className={"finca-chip" + (p.propertyId === h.id ? " on" : "") + (h.status === "baixa" ? " off" : "")}
                  title={h.status === "baixa" ? "Finca donada de baixa" : undefined}
                  onClick={() => p.onSelectProperty(h.id)}>
                  <span className="finca-num"><House size={15} /></span>
                  <span className="finca-addr">{h.address}<small>{h.municipality}{h.ownership_percentage != null && h.ownership_percentage < 100 ? ` · ${h.ownership_percentage}%` : ""}{h.status === "baixa" ? " · DE BAIXA" : ""}</small></span>
                </button>
              ))}
              {p.propertyId === "new" && <div className="finca-chip on"><span className="finca-num">+</span><span className="finca-addr">Finca nova<small>pendent de gravar</small></span></div>}
              {!p.properties.length && p.propertyId !== "new" && <span className="banner-empty">Encara no té finques{p.canWrite ? ". Prem «Nova finca»." : "."}</span>}
            </div>
          </div>
        </section>

        <div className="record-tabs">
          {CLIENT_TABS.filter(([id]) => !excluded(id) || id === p.tab).map(([id, text, Icon, perFinca]) => (
            <button key={id} className={p.tab === id ? "selected" : ""} onClick={() => p.onTab(id)} title={perFinca ? "De la finca seleccionada" : undefined}>
              <Icon size={17} /><span>{text}</span>
            </button>
          ))}
        </div>
        {needsFinca && (finca || p.propertyId === "new") && (
          <div className={"finca-context" + (finca?.status === "baixa" ? " finca-context-off" : "")}><House size={15} /> Finca seleccionada: <strong>{p.propertyId === "new" ? "nova" : finca!.address}</strong>
            {finca?.status === "baixa" && <strong className="txt-off"> · DONADA DE BAIXA</strong>}
            {finca && <small className="muted"> · {finca.features.contract ? `Contracte ${finca.features.contract}: ${[...FEATURE_LABELS.filter(([k]) => finca.features[k]).map(([, l]) => l), ...finca.features.others].join(", ") || "cap servei"}` : "Sense tipus de contracte (tots els serveis)"}</small>}
          </div>
        )}
      </div>

      {p.error && <Notice kind="error">{p.error}</Notice>}
      {editing && <Notice>Modificant el client: canvia el que calgui a les pestanyes Client, Cònjuge - copropietaris i Matrícules, i prem «Guardar» a baix.</Notice>}

      <div className="detail-layout">
        <div className="detail-main">
          {needsFinca && !finca && p.propertyId !== "new" ? (
            <div className="tab-pad"><Panel title="Tria una finca" icon={House}>
              <Empty>{p.properties.length ? "Selecciona una de les finques del client a la capçalera." : "Aquest client encara no té cap finca."}</Empty>
              {p.canWrite && !p.properties.length && !editing && <button className="save-btn" onClick={() => p.onSelectProperty("new")}><Plus size={16} /> Donar d'alta una finca</button>}
            </Panel></div>
          ) : notIncluded ? (
            <div className="tab-pad"><Panel title="No inclòs al contracte" icon={House}>
              <Empty>{`El contracte ${finca!.features.contract ? `«${finca!.features.contract}» ` : ""}d'aquesta finca no inclou ${notIncluded}. Es canvia a la pestanya Finca → Contracte o al menú Contractes.`}</Empty>
            </Panel></div>
          ) : p.tab === "finca" ? (
            <FincaTab key={String(p.propertyId)} client={p.full} propertyId={p.propertyId === "new" ? null : p.propertyId} canWrite={p.canWrite} userId={p.userId}
              onSaved={p.onPropertySaved} onCancelNew={() => p.onSelectProperty(p.properties[0]?.id ?? "new")} />
          ) : p.tab === "impostos" ? (
            p.propertyId === "new" ? <div className="tab-pad"><Empty>Grava primer la finca nova.</Empty></div>
              : <TaxesTab propertyId={finca!.id} ownership={finca!.ownership_percentage} canWrite={p.canWrite} />
          ) : p.tab === "claus" ? (
            p.propertyId === "new" ? <div className="tab-pad"><Empty>Grava primer la finca nova.</Empty></div>
              : <KeysTab propertyId={finca!.id} canWrite={p.canWrite} userId={p.userId} onSaved={() => p.onPropertySaved(finca!.id, "claus")} />
          ) : p.tab === "revisions" ? (
            p.propertyId === "new" ? <div className="tab-pad"><Empty>Grava primer la finca nova.</Empty></div>
              : <div className="tab-pad"><CaseView propertyId={finca!.id} canWrite={p.canWrite} userId={p.userId || ""} /></div>
          ) : p.tab === "incidencies" ? (
            <div className="tab-pad"><IncidentsView canWrite={p.canWrite} userId={p.userId || ""} clientId={c.id} propertyId={finca?.id || null} /></div>
          ) : p.tab === "client" ? (
            editing ? <div className="tab-pad"><ClientForm value={p.draft!} onChange={p.onDraft} responsibles={p.responsibles} isNew={false} showErrors={p.showErrors} /></div>
              : <ClientData full={p.full} addressLine={addressLine} />
          ) : p.tab === "conjuge" ? (
            p.propertyId === "new" ? <div className="tab-pad"><Empty>Grava primer la finca nova.</Empty></div>
              : <RelatedTab full={shown} finca={finca!} editing={editing} onChange={p.onDraft}
                  onStartEdit={p.canWrite && c.status === "active" ? p.onEditWith : undefined} />
          ) : (
            <VehiclesTab full={shown} editing={editing} onChange={p.onDraft} />
          )}
        </div>

        <aside className="detail-side">
          {c.id && <AlertsPanel clientId={c.id} canWrite={p.canWrite} userId={p.userId} />}
        </aside>
      </div>

      <div className="bottom-bar">
        <div>
          {p.canWrite && <button className="save-btn" onClick={p.onEdit} disabled={editing}><Pencil size={17} /> Modificar client</button>}
          {p.canWrite && <button className="cancel-btn" onClick={p.onToggleStatus} disabled={editing}><Power size={17} /> {c.status === "inactive" ? "Reactivar client" : "Donar de baixa client"}</button>}
          {c.id && <HistoryButton scope={{ clientId: c.id }} title={`Historial de canvis · ${fullName(c.first_name, c.last_name)}`} />}
          <button className="cancel-btn" onClick={p.onBack} disabled={editing}><X size={17} /> Tornar a la llista</button>
          {p.canWrite && <button className="save-btn btn-save-main" onClick={p.onSave} disabled={!editing || p.saving}><Save size={17} /> {p.saving ? "Desant…" : "Guardar"}</button>}
          {p.canWrite && <button className="cancel-btn" onClick={p.onCancel} disabled={!editing || p.saving}><X size={17} /> Cancel·lar</button>}
        </div>
        <div>
          <button className="cancel-btn" onClick={p.onPrev} disabled={editing || p.position.index <= 0}><ChevronLeft size={18} /> Anterior</button>
          <span className="pos-label">{p.position.index + 1} / {p.position.total}</span>
          <button className="cancel-btn" onClick={p.onNext} disabled={editing || p.position.index >= p.position.total - 1}>Següent <ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  );
}

function ClientData({ full, addressLine }: { full: ClientFull; addressLine: string }) {
  const { client: c, address: a } = full;
  const languages = useLanguages();
  const country = (code: string) => COUNTRIES.find(x => x.code === code)?.name || code;
  return (
    <div className="tab-pad client-data">
      <Panel title="Dades identificatives" icon={UserRound}>
        <div className="info-cols">
          <Info2 label="Tractament" value={c.title} />
          <Info2 label="Nom complet" value={fullName(c.first_name, c.last_name)} />
          <Info2 label="Nom reduït" value={c.short_name} />
          <Info2 label="Tipus" value={c.client_type === "empresa" ? "Empresa" : "Particular"} />
          <Info2 label="D.N.I." value={c.dni} />
          <Info2 label="N.I.E." value={c.nie} />
          <Info2 label="Passaport" value={c.passport && `${c.passport}${c.passport_expiry ? " · cad. " + fmtDate(c.passport_expiry) : ""}`} />
          <Info2 label="Autorització" value={c.authorization_ok ? "Sí" : "No"} />
        </div>
      </Panel>
      <div className="client-edit-row">
        <Panel title="Adreça" icon={MapPin} action={addressLine && <button className="outline-btn small" onClick={() => window.open("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([addressLine, a.postal_code, a.municipality, a.country].filter(Boolean).join(", ")), "_blank", "noopener,noreferrer")}><MapPin size={14} /> Veure al mapa</button>}>
          <div className="info-cols">
            <Info2 label="Adreça" value={addressLine} />
            <Info2 label="Bloc / urb." value={a.extra} />
            <Info2 label="C.P. i població" value={[a.postal_code, a.municipality].filter(Boolean).join(" ")} />
            <Info2 label="Província" value={a.province} />
            <Info2 label="País" value={[a.country, a.country_code && `(${a.country_code})`].filter(Boolean).join(" ")} />
          </div>
        </Panel>
        <Panel title="Altres dades personals" icon={Users}>
          <div className="info-cols">
            <Info2 label="Idioma" value={label(languages, c.language)} />
            <Info2 label="Nacionalitat" value={c.nationality} />
            <Info2 label="Data naixement" value={fmtDate(c.birth_date)} />
            <Info2 label="Ciutat naixement" value={c.birth_city} />
            <Info2 label="País naixement" value={country(c.birth_country_code)} />
            <Info2 label="Anagrama" value={c.anagram} />
          </div>
        </Panel>
      </div>
      <div className="client-edit-row">
        <Panel title="Telèfons" icon={Phone}>
          {full.phones.filter(x => x.phone_number).length
            ? <div className="info-cols">{full.phones.filter(x => x.phone_number).map((x, i) => <Info2 key={i} label={label(PHONE_TYPES, x.phone_type)} value={<>{x.country_prefix} {x.phone_number}{x.notes && <small className="muted"> · {x.notes}</small>}</>} />)}</div>
            : <Empty>Sense telèfons.</Empty>}
        </Panel>
        <Panel title="E-mails" icon={Mail}>
          {full.emails.filter(x => x.email).length
            ? <div className="info-cols">{full.emails.filter(x => x.email).map((x, i) => <Info2 key={i} label={label(EMAIL_TYPES, x.email_type)} value={<a href={"mailto:" + x.email}>{x.email}</a>} />)}</div>
            : <Empty>Sense e-mails.</Empty>}
        </Panel>
      </div>
      <Panel title="Documental i observacions" icon={ContactRound}>
        <Info2 label="Carpeta a l'ordinador" value={c.documents_path && <span className="path-line"><code className="path">{c.documents_path}</code>
          <button className="link-btn" title="Copiar la ruta per enganxar-la a l'explorador de fitxers" onClick={() => void navigator.clipboard?.writeText(c.documents_path)}><Copy size={13} /> Copiar</button></span>} />
        <div className="obs-box">{c.observations || <em>Sense observacions.</em>}</div>
      </Panel>
    </div>
  );
}

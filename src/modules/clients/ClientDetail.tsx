// Fitxa del client (PDF pàg. 3-6): capçalera + pestanyes + alertes sempre visibles.
import { useEffect, useState } from "react";
import { Car, ChevronLeft, ChevronRight, ContactRound, Euro, House, Landmark, Mail, MapPin, Pencil, Phone, Power, UserRound, Users, X } from "lucide-react";
import { clientTaxes, type TaxRow } from "../../data/clients";
import { errorText } from "../../lib/supabase";
import { accountCode, fmtDate, fullName } from "../../lib/format";
import { EMAIL_TYPES, LANGUAGES, PHONE_TYPES } from "../../lib/constants";
import { Empty, Info2, Notice, Panel } from "../../components/ui";
import { AlertsPanel } from "../alerts/AlertsPanel";
import type { ClientFull, Profile, PropertyLink } from "../../types";

const TABS = [["dades", "Dades", ContactRound], ["finques", "Finques", House], ["impostos", "Impostos", Landmark],
  ["conjuge", "Cònjuge - copropietaris", Users], ["matricules", "Matrícules", Car]] as const;
type Tab = typeof TABS[number][0];

const label = (list: [string, string][], v: string) => list.find(x => x[0] === v)?.[1] || v;
const money = (n: number | null | undefined) => n == null ? "—" : Number(n).toLocaleString("ca-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

interface Props {
  full: ClientFull;
  properties: PropertyLink[];
  responsibles: Profile[];
  canWrite: boolean;
  userId?: string;
  position: { index: number; total: number };
  error: string;
  onEdit: () => void;
  onToggleStatus: () => void;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
  onOpenProperty: (id: string) => void;
}

export function ClientDetail(p: Props) {
  const [tab, setTab] = useState<Tab>("dades");
  const [taxes, setTaxes] = useState<TaxRow[] | null>(null);
  const [taxError, setTaxError] = useState("");
  const { client: c, address: a } = p.full;
  const responsible = p.responsibles.find(r => r.id === c.responsible_id);

  useEffect(() => {
    if (tab !== "impostos") return;
    setTaxes(null); setTaxError("");
    clientTaxes(p.properties).then(setTaxes).catch(e => setTaxError(errorText(e)));
  }, [tab, c.id]);

  const firstHome = p.properties[0];
  const addressLine = [a.street_type, a.street_name, a.street_number].filter(Boolean).join(" ");

  return (
    <div className="work-area">
      <section className="record-banner">
        <div className="record-summary">
          <div className="record-number">{accountCode(c.client_code)}
            <span className={"record-state" + (c.status === "inactive" ? " state-off" : "")}>{c.status === "inactive" ? "BAIXA" : c.resident ? "RESIDENT" : "NO RESIDENT"}</span>
          </div>
          <div><b>Nom</b><strong>{[c.title, c.first_name].filter(Boolean).join(" ") || "—"}</strong></div>
          <div><b>Cognoms</b><strong>{c.last_name || "—"}</strong></div>
          <div><b>Responsable</b><strong>{responsible ? responsible.full_name || responsible.email : "Sense assignar"}</strong></div>
        </div>
        <div className="other-properties">
          <strong>Finques del client</strong>
          {p.properties.length
            ? p.properties.map(h => (
              <button type="button" className="property-choice" key={h.id} onClick={() => p.onOpenProperty(h.id)}>
                <House size={16} />{h.status === "baixa" && <span className="mini-tag">BAIXA</span>}{h.address} <small>· Adm. {h.admin_number}</small>
              </button>))
            : <span className="banner-empty">Sense finques vinculades</span>}
        </div>
        <div className="address-card">
          <span>{addressLine || "Adreça pendent"}</span>
          {a.extra && <span>{a.extra}</span>}
          <span>{[a.postal_code, a.municipality].filter(Boolean).join(" ")}</span>
          <span>{a.country}</span>
          <button className="outline-btn" disabled={!addressLine} onClick={() => window.open("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([addressLine, a.postal_code, a.municipality, a.country].filter(Boolean).join(", ")), "_blank", "noopener,noreferrer")}>
            <MapPin size={16} /> Veure al mapa
          </button>
        </div>
      </section>

      {p.error && <Notice kind="error">{p.error}</Notice>}

      <div className="detail-layout">
        <div className="detail-main">
          <div className="record-tabs">
            {TABS.map(([id, text, Icon]) => (
              <button key={id} className={tab === id ? "selected" : ""} onClick={() => setTab(id)}><Icon size={17} /><span>{text}</span></button>
            ))}
          </div>

          {tab === "dades" && (
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
                </Panel>
              </div>
              <div className="column-stack">
                <Panel title="Telèfons" icon={Phone}>
                  {p.full.phones.filter(x => x.phone_number).length
                    ? p.full.phones.filter(x => x.phone_number).map((x, i) => <Info2 key={i} label={label(PHONE_TYPES, x.phone_type)} value={<>{x.country_prefix} {x.phone_number}{x.notes && <small className="muted"> · {x.notes}</small>}</>} />)
                    : <Empty>Sense telèfons.</Empty>}
                </Panel>
                <Panel title="E-mails" icon={Mail}>
                  {p.full.emails.filter(x => x.email).length
                    ? p.full.emails.filter(x => x.email).map((x, i) => <Info2 key={i} label={label(EMAIL_TYPES, x.email_type)} value={<a href={"mailto:" + x.email}>{x.email}</a>} />)
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
          )}

          {tab === "finques" && (
            <div className="tab-pad">
              <Panel title="Finques i participació en la propietat" icon={House}>
                {p.properties.length ? (
                  <table className="mini-table">
                    <thead><tr><th>Núm. adm.</th><th>Adreça</th><th>Població</th><th>% propietat</th><th>Estat</th></tr></thead>
                    <tbody>{p.properties.map(h => (
                      <tr key={h.id} onClick={() => p.onOpenProperty(h.id)}>
                        <td>{h.admin_number}</td><td><strong>{h.address}</strong></td><td>{h.municipality}</td>
                        <td>{h.ownership_percentage != null ? h.ownership_percentage + " %" : "—"}</td>
                        <td>{h.status === "baixa" ? "Baixa" : "Activa"}</td>
                      </tr>))}
                    </tbody>
                  </table>
                ) : <Empty>Aquest client encara no té finques. Es vinculen des de l'alta d'immoble (fase 2).</Empty>}
              </Panel>
            </div>
          )}

          {tab === "impostos" && (
            <div className="tab-pad">
              <Panel title="Impostos de les finques del client" icon={Euro}>
                {taxError && <Notice kind="error">{taxError}</Notice>}
                {taxes === null && !taxError && <Empty>Carregant…</Empty>}
                {taxes && !taxes.length && <Empty>No hi ha impostos registrats per a les seves finques.</Empty>}
                {taxes && taxes.length > 0 && (
                  <table className="mini-table">
                    <thead><tr><th>Any</th><th>Finca</th><th>Ref. cadastral</th><th>Valor cadastral</th><th>Base imposable</th><th>Quota renda</th><th>% prop.</th><th>Pagat</th></tr></thead>
                    <tbody>{taxes.map(t => (
                      <tr key={t.property_id + t.tax_year}>
                        <td>{t.tax_year}</td><td>{t.address}</td><td>{t.cadastral_ref}</td><td>{money(t.cadastral_value)}</td>
                        <td>{money(t.taxable_base)}</td><td>{money(t.rent_quota)}</td>
                        <td>{t.ownership_percentage != null ? t.ownership_percentage + " %" : "—"}</td>
                        <td>{t.paid ? `Sí ${fmtDate(t.paid_date)}` : "No"}</td>
                      </tr>))}
                    </tbody>
                  </table>
                )}
                <p className="hint">Base imposable = Valor cadastral × Revalorització / 100 · Quota renda = Base imposable × Tipus gravamen / 100 (calculat a la base de dades).</p>
              </Panel>
            </div>
          )}

          {tab === "conjuge" && (
            <div className="tab-pad related-grid">
              {!p.full.related.length && <Panel title="Cònjuge i copropietaris" icon={Users}><Empty>No n'hi ha cap. Afegeix-los amb «Modificar».</Empty></Panel>}
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
                  <Info2 label="Etiquetes / anagrama" value={[r.labels ? "Etiquetes" : "", r.anagram].filter(Boolean).join(" · ")} />
                </Panel>
              ))}
            </div>
          )}

          {tab === "matricules" && (
            <div className="tab-pad">
              <Panel title="Vehicles" icon={Car}>
                {p.full.vehicles.length ? (
                  <table className="mini-table">
                    <thead><tr><th>Vehicle</th><th>Marca</th><th>Model</th><th>Matrícula</th><th>ITV</th></tr></thead>
                    <tbody>{p.full.vehicles.map((v, i) => <tr key={i}><td>{v.vehicle}</td><td>{v.brand}</td><td>{v.model}</td><td><strong>{v.plate}</strong></td><td>{fmtDate(v.itv_date)}</td></tr>)}</tbody>
                  </table>
                ) : <Empty>Sense vehicles.</Empty>}
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
          {p.canWrite && <button className="save-btn" onClick={p.onEdit}><Pencil size={17} /> Modificar</button>}
          {p.canWrite && <button className="cancel-btn" onClick={p.onToggleStatus}><Power size={17} /> {c.status === "inactive" ? "Reactivar client" : "Donar de baixa"}</button>}
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


// Estadístiques (PDF: «Estadístiques i informes calculats sobre dades persistides»).
// Només lectura: res d'aquesta pantalla modifica dades. Sense dades, es mostra buit.
import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, Bell, Building2, CalendarDays, KeyRound, Landmark, Users } from "lucide-react";
import { portfolioStats, yearStats, type Count, type PortfolioStats, type YearStats } from "../../data/stats";
import { errorText } from "../../lib/supabase";
import { Notice, Panel } from "../../components/ui";

const MONTHS = ["Gen", "Feb", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Des"];
const eur = (v: number) => v.toLocaleString("ca-ES", { style: "currency", currency: "EUR" });
const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

/** Barres horitzontals amb el valor escrit al costat (una sola sèrie, sense llegenda). */
function BarList({ rows, max = 10, empty = "Sense dades." }: { rows: Count[]; max?: number; empty?: string }) {
  if (!rows.length) return <p className="empty-line">{empty}</p>;
  const shown = rows.length > max ? [...rows.slice(0, max - 1), ["Altres", rows.slice(max - 1).reduce((t, r) => t + r[1], 0)] as Count] : rows;
  const top = Math.max(...shown.map(r => r[1]));
  const total = rows.reduce((t, r) => t + r[1], 0);
  return (
    <div className="bar-list">
      {shown.map(([label, value]) => (
        <div className="bar-row" key={label} title={`${label}: ${value} (${pct(value, total)}%)`}>
          <span className="bar-label">{label}</span>
          <span className="bar-track"><i style={{ width: `${(value / top) * 100}%` }} /></span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

/** Columnes per mes de l'any seleccionat. */
function MonthBars({ values }: { values: number[] }) {
  const top = Math.max(1, ...values);
  if (!values.some(Boolean)) return <p className="empty-line">Cap registre aquest any.</p>;
  return (
    <div className="month-bars">
      {values.map((v, i) => (
        <div key={i} title={`${MONTHS[i]}: ${v}`}>
          <small>{v || ""}</small>
          <span><i style={{ height: `${(v / top) * 100}%` }} /></span>
          <em>{MONTHS[i]}</em>
        </div>
      ))}
    </div>
  );
}

function Figure({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return <div className="stat-figure"><strong>{value}</strong><span>{label}</span>{sub && <small>{sub}</small>}</div>;
}

export function StatsPage() {
  const thisYear = new Date().getFullYear();
  const [base, setBase] = useState<PortfolioStats | null>(null);
  const [year, setYear] = useState(thisYear);
  const [ys, setYs] = useState<YearStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { portfolioStats().then(setBase).catch(e => setError(errorText(e))); }, []);
  useEffect(() => { setYs(null); yearStats(year).then(setYs).catch(e => setError(errorText(e))); }, [year]);

  const years = [...new Set([thisYear + 1, ...Array.from({ length: 6 }, (_, i) => thisYear - i), ...(base?.taxYears || [])])].sort((a, b) => b - a);
  const n = (v?: number) => (v === undefined ? "…" : v);
  const c = base?.clients, p = base?.properties;

  return (
    <div className="work-area list-view stats-page">
      <div className="page-title">
        <div><small>INFORMES</small><h1>Estadístiques</h1><p>Xifres calculades a partir de les dades del programa. Només consulta: aquesta pantalla no modifica res.</p></div>
      </div>
      {error && <Notice kind="error">No s'han pogut carregar les estadístiques: {error}</Notice>}

      <h2 className="stats-heading">Cartera actual</h2>
      <div className="stats-grid">
        <Panel title="Clients" icon={Users}>
          <div className="stat-figures">
            <Figure value={n(c?.active)} label="Actius" />
            <Figure value={n(c?.inactive)} label="Donats de baixa" />
            <Figure value={n(c?.residents)} label="Residents" sub={c ? `${pct(c.residents, c.active)}% dels actius` : undefined} />
            <Figure value={n(c?.nonResidents)} label="No residents" sub={c ? `${pct(c.nonResidents, c.active)}% · Model 210` : undefined} />
          </div>
        </Panel>
        <Panel title="Finques" icon={Building2}>
          <div className="stat-figures">
            <Figure value={n(p?.active)} label="Actives" />
            <Figure value={n(p?.baixa)} label="Donades de baixa" />
            <Figure value={n(p?.withContract)} label="Amb contracte" sub={p ? `${pct(p.withContract, p.active)}% de les actives` : undefined} />
          </div>
        </Panel>
        <Panel title="Finques per població" icon={Building2}><BarList rows={base?.propertiesByMunicipality || []} /></Panel>
        <Panel title="Finques per zona" icon={Building2}><BarList rows={base?.propertiesByZone || []} /></Panel>
        <Panel title="Finques per tipus de contracte" icon={Building2}><BarList rows={base?.propertiesByContract || []} /></Panel>
        <Panel title="Finques per tipus de lloguer" icon={Building2}><BarList rows={base?.propertiesByUse || []} /></Panel>
        <Panel title="Clients per idioma" icon={Users}><BarList rows={base?.clientsByLanguage || []} /></Panel>
        <Panel title="Clients per país de residència" icon={Users}><BarList rows={base?.clientsByCountry || []} /></Panel>
        <Panel title="Baixes per any" icon={BarChart3}>
          {base && !base.baixesByYear.length ? <p className="empty-line">Encara no hi ha cap baixa amb data.</p> : (
            <div className="table-wrap"><table className="stats-table">
              <thead><tr><th>Any</th><th>Finques</th><th>Clients</th></tr></thead>
              <tbody>{(base?.baixesByYear || []).map(([y, fp, fc]) => <tr key={y} className="no-hover"><td><strong>{y}</strong></td><td>{fp}</td><td>{fc}</td></tr>)}</tbody>
            </table></div>
          )}
        </Panel>
      </div>

      <div className="stats-year-bar">
        <h2 className="stats-heading">Activitat de l'any</h2>
        <label>Any<select value={year} onChange={e => setYear(Number(e.target.value))}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>
      </div>
      <div className="stats-grid">
        <Panel title={`Revisions fetes el ${year}`} icon={CalendarDays}>
          <div className="stat-figures">
            <Figure value={n(ys?.revisions.total)} label="Revisions" />
            <Figure value={n(ys?.revisions.extra)} label="Complementàries" />
            <Figure value={n(ys?.revisions.properties)} label="Finques revisades" />
          </div>
          {ys && <MonthBars values={ys.revisionsByMonth} />}
        </Panel>
        <Panel title={`Incidències del ${year}`} icon={AlertTriangle}>
          {ys && <MonthBars values={ys.incidentsByMonth} />}
          <BarList rows={ys?.incidentsByStatus || []} empty="Cap incidència aquest any." />
        </Panel>
        <Panel title={`Notes de servei del ${year}`} icon={AlertTriangle}><BarList rows={ys?.serviceNotesByStatus || []} empty="Cap nota de servei aquest any." /></Panel>
        <Panel title={`Alertes creades el ${year}`} icon={Bell}>
          <div className="stat-figures">
            <Figure value={n(ys?.alerts.created)} label="Creades" />
            <Figure value={n(ys?.alerts.completed)} label="Completades" />
            <Figure value={n(ys?.alerts.pending)} label="Pendents" />
          </div>
        </Panel>
        <Panel title={`Claus entregades el ${year}`} icon={KeyRound}>
          <div className="stat-figures">
            <Figure value={n(ys?.keys.delivered)} label="Entregues" />
            <Figure value={n(ys?.keys.returned)} label="Retornades" />
            <Figure value={n(ys?.keys.notReturned)} label="Encara fora" />
          </div>
        </Panel>
        <Panel title={`Impostos de l'exercici ${year}`} icon={Landmark}>
          <div className="stat-figures">
            <Figure value={n(ys?.taxes.records)} label="Finques amb impostos" />
            <Figure value={n(ys?.taxes.paid)} label="Pagats" sub={ys ? `${pct(ys.taxes.paid, ys.taxes.records)}%` : undefined} />
            <Figure value={n(ys?.taxes.unpaid)} label="Pendents de pagar" />
          </div>
          {ys && ys.taxes.records > 0 && (
            <table className="stats-table">
              <tbody>
                <tr className="no-hover"><td>Total quota IBI</td><td><strong>{eur(ys.taxes.ibi)}</strong></td></tr>
                <tr className="no-hover"><td>Total base imposable</td><td><strong>{eur(ys.taxes.base)}</strong></td></tr>
                <tr className="no-hover"><td>Total quota renda (Model 210)</td><td><strong>{eur(ys.taxes.rent)}</strong></td></tr>
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}

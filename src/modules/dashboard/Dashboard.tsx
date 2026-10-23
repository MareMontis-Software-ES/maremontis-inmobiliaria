// Inici: només dades reals. Si no n'hi ha, es mostra buit (mai xifres d'exemple).
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, Building2, CalendarDays, ChevronRight, FileText, Folder, House, KeyRound, Users, Wrench } from "lucide-react";
import { generateAutomaticAlerts, listAlerts } from "../../data/alerts";
import { dashboardCounts, recentProperties } from "../../data/properties";
import { errorText } from "../../lib/supabase";
import { addDaysISO, fmtDate, todayISO } from "../../lib/format";
import { Notice } from "../../components/ui";
import type { Alert, Section } from "../../types";

interface Props {
  canWrite: boolean;
  userName: string;
  onNavigate: (s: Section) => void;
  onOpenClient: (id: string) => void;
  onOpenProperty: (id: string) => void;
}

const MONTHS = ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"];
const DAYS = ["diumenge", "dilluns", "dimarts", "dimecres", "dijous", "divendres", "dissabte"];

export function Dashboard({ canWrite, userName, onNavigate, onOpenClient, onOpenProperty }: Props) {
  const [counts, setCounts] = useState<Awaited<ReturnType<typeof dashboardCounts>> | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recent, setRecent] = useState<Awaited<ReturnType<typeof recentProperties>>>([]);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  useEffect(() => {
    (async () => {
      try {
        if (canWrite) await generateAutomaticAlerts().catch(() => 0);
        const [c, a, r] = await Promise.all([dashboardCounts(), listAlerts({ onlyPending: true }), recentProperties()]);
        setCounts(c); setAlerts(a); setRecent(r);
      } catch (e) { setError(errorText(e)); }
    })();
  }, [canWrite]);

  const today = todayISO();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 14 ? "Bon dia" : hour < 21 ? "Bona tarda" : "Bona nit";
  const in7 = addDaysISO(today, 7);
  const dueSoon = alerts.filter(a => a.due_date && a.due_date >= today && a.due_date <= in7);
  const todays = alerts.filter(a => a.due_date === today);
  const dueDays = useMemo(() => new Set(alerts.map(a => a.due_date).filter(Boolean)), [alerts]);

  // Calendari del mes
  const first = (month.getDay() + 6) % 7; // dilluns = 0
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const isoOf = (d: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const n = (v?: number) => (counts ? String(v ?? 0) : "…");
  const stats: [any, string, string, string, Section][] = [
    [Building2, n(counts?.properties), "Immobles", "actius", "Immobles"],
    [Users, n(counts?.clients), "Clients", "actius", "Clients"],
    [Bell, n(counts?.alerts), "Alertes", `${counts?.overdue ?? 0} vençudes`, "Alertes"],
    [KeyRound, n(counts?.keys), "Claus", "fora d'oficina", "Claus"],
    [AlertTriangle, n(counts?.incidents), "Incidències", "obertes", "Incidències"],
    [CalendarDays, "—", "Revisions", "fase 4", "Revisions"],
  ];

  return (
    <div className="dashboard-area">
      <section className="welcome-banner">
        <div className="welcome-copy"><small>MAREMONTIS</small><h1>{greeting}{userName ? `, ${userName}` : ""}</h1><p>Resum de l'activitat d'avui.</p></div>
        <div className="welcome-date">{DAYS[now.getDay()]}<br /><strong>{now.getDate()} de {MONTHS[now.getMonth()]} de {now.getFullYear()}</strong></div>
      </section>
      {error && <Notice kind="error">No s'han pogut carregar les dades: {error}</Notice>}
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <div className="stat-cards">
            {stats.map(([Icon, num, label, sub, target]) => (
              <button className="stat-card" key={label} onClick={() => onNavigate(target)}>
                <Icon size={26} /><strong>{num}</strong><span>{label}</span><small>{sub}</small><ChevronRight size={13} />
              </button>
            ))}
          </div>
          <div className="dashboard-pair">
            <section className="dash-panel">
              <header><strong>Alertes pendents <span className="count-pill">{alerts.length}</span></strong></header>
              <div className="dash-table-head"><span></span><span>ALERTA</span><span>DATA</span><span>ESTAT</span></div>
              {!alerts.length && <p className="empty-line pad">No hi ha alertes pendents.</p>}
              {alerts.slice(0, 8).map(a => (
                <button className="alert-row as-button" key={a.id} onClick={() => a.client_id && onOpenClient(a.client_id)}>
                  <FileText size={17} />
                  <div><strong>{a.title}</strong><small>{a.client_name || a.content || ""}</small></div>
                  <small>{fmtDate(a.due_date)}</small>
                  <span className={"status-pill " + (a.overdue ? "status-warn" : "status-ok")}>{a.overdue ? "Vençuda" : "Pendent"}</span>
                </button>
              ))}
            </section>
            <section className="dash-panel">
              <header><strong>Venciments propers (7 dies) <span className="count-pill green">{dueSoon.length}</span></strong></header>
              {!dueSoon.length && <p className="empty-line pad">Res a vèncer aquesta setmana.</p>}
              {dueSoon.map(a => (
                <button className="task-row as-button" key={a.id} onClick={() => a.client_id && onOpenClient(a.client_id)}>
                  <time>{fmtDate(a.due_date).slice(0, 5)}</time>
                  <div><strong>{a.title}</strong><small>{a.client_name || ""}</small></div>
                  <span>Alerta</span><ChevronRight size={13} />
                </button>
              ))}
            </section>
          </div>
          <section className="recent-properties">
            <header><strong>Immobles modificats recentment</strong><button onClick={() => onNavigate("Immobles")}>Veure tots →</button></header>
            {recent.length ? (
              <div className="property-cards">
                {recent.map((p, i) => (
                  <button key={p.id} onClick={() => onOpenProperty(p.id)}>
                    <div className={"property-thumb thumb-" + i}><House size={29} /></div>
                    <strong>{p.address}</strong><small>Núm. {p.admin_number} · {p.municipality}</small>
                  </button>
                ))}
              </div>
            ) : <p className="empty-line pad">Encara no hi ha immobles registrats.</p>}
          </section>
          <div className="module-tiles">
            {([[Building2, "IMMOBLES", "Gestiona el parc immobiliari", "Immobles"], [Users, "CLIENTS", "Propietaris i contactes", "Clients"],
              [FileText, "CONTRACTES", "Tipus i prestacions", "Contractes"], [CalendarDays, "REVISIONS", "Control de cases", "Revisions"],
              [KeyRound, "CLAUS", "Entregues i retorns", "Claus"], [Folder, "IMPOSTOS", "IBI, renda i model 210", "Impostos"]] as [any, string, string, Section][])
              .map(([Icon, title, desc, target], i) => (
                <button key={title} className={"module-tile tile-" + i} onClick={() => onNavigate(target)}><Icon size={24} /><small>{title}</small><strong>{desc}</strong><span>→</span></button>
              ))}
          </div>
        </div>
        <aside className="dashboard-right">
          <section className="calendar-panel">
            <header>
              <strong>{MONTHS[month.getMonth()][0].toUpperCase() + MONTHS[month.getMonth()].slice(1)} {month.getFullYear()}</strong>
              <button aria-label="Mes anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
              <button aria-label="Mes següent" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
            </header>
            <div className="calendar-grid">
              {["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"].map(d => <span key={d}>{d}</span>)}
              {Array.from({ length: first }, (_, i) => <span key={"b" + i} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const iso = isoOf(i + 1);
                return <span key={iso} className={(iso === today ? "today " : "") + (dueDays.has(iso) ? "has-due" : "")} title={dueDays.has(iso) ? "Hi ha alertes aquest dia" : undefined}>{i + 1}</span>;
              })}
            </div>
          </section>
          <section className="agenda-panel">
            <header><strong>Avui</strong></header>
            {!todays.length && <p className="empty-line pad">Cap alerta per avui.</p>}
            {todays.map(a => <div className="agenda-row" key={a.id}><time>·</time><div><strong>{a.title}</strong><small>{a.client_name}</small></div></div>)}
          </section>
          <section className="due-panel">
            <header><strong>Pendent de desenvolupar</strong></header>
            {[[Wrench, "Revisions i control de cases", "Fase 4"], [AlertTriangle, "Incidències i notes de servei", "Fase 5"], [FileText, "Model 210 i NRC", "Fase 6"]].map(([Icon, t, f]: any) => (
              <div className="due-row" key={t}><Icon size={20} /><div><strong>{t}</strong><small>{f}</small></div><time /></div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}

// Inici: només dades reals. Si no n'hi ha, es mostra buit (mai xifres d'exemple).
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, Building2, Cake, CalendarDays, ChevronRight, FileBadge, IdCard, KeyRound, ShieldCheck, Users, Wrench, Zap } from "lucide-react";
import { generateAutomaticAlerts, listAlerts } from "../../data/alerts";
import { dashboardCounts } from "../../data/properties";
import { errorText } from "../../lib/supabase";
import { addDaysISO, fmtDate, todayISO } from "../../lib/format";
import { Notice } from "../../components/ui";
import { listCases, type CaseRow } from "../../data/cases";
import { listIncidents, type Incident } from "../../data/incidents";
import type { Alert, Section } from "../../types";

interface Props {
  canWrite: boolean;
  userName: string;
  onNavigate: (s: Section) => void;
  onOpenClient: (id: string) => void;
  onOpenProperty: (id: string) => void;
}

const MONTHS = ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"];
// Cada alerta porta la icona i el color del seu origen (clau, assegurança, passaport...).
type Kind = { icon: any; color: string; label: string };
const KINDS: Record<string, Kind> = {
  passaport: { icon: IdCard, color: "blue", label: "Passaport" },
  aniversari: { icon: Cake, color: "pink", label: "Aniversari" },
  claus: { icon: KeyRound, color: "amber", label: "Claus" },
  asseguranca: { icon: ShieldCheck, color: "teal", label: "Assegurança" },
  cedula: { icon: FileBadge, color: "purple", label: "Cèdula" },
  energetic: { icon: Zap, color: "lime", label: "Cert. energètic" },
  revisio: { icon: Wrench, color: "green", label: "Revisió" },
  incidencia: { icon: AlertTriangle, color: "red", label: "Incidència" },
  manual: { icon: Bell, color: "grey", label: "Alerta" },
};
function alertKind(a: Alert): Kind {
  const t = a.title.toLowerCase();
  if (a.alert_type === "caducitat_document") return KINDS.passaport;
  if (a.alert_type === "naixement") return KINDS.aniversari;
  if (a.alert_type === "claus") return KINDS.claus;
  if (t.includes("assegurança")) return KINDS.asseguranca;
  if (t.includes("cèdula")) return KINDS.cedula;
  if (t.includes("energètic")) return KINDS.energetic;
  return KINDS.manual;
}
const KindDot = ({ k }: { k: Kind }) => <span className={"kind-dot k-" + k.color} title={k.label}><k.icon size={15} /></span>;

const DAYS = ["diumenge", "dilluns", "dimarts", "dimecres", "dijous", "divendres", "dissabte"];

export function Dashboard({ canWrite, userName, onNavigate, onOpenClient, onOpenProperty }: Props) {
  const [counts, setCounts] = useState<Awaited<ReturnType<typeof dashboardCounts>> | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  useEffect(() => {
    (async () => {
      try {
        if (canWrite) await generateAutomaticAlerts().catch(() => 0);
        const [c, a] = await Promise.all([dashboardCounts(), listAlerts({ onlyPending: true })]);
        setCounts(c); setAlerts(a);
        listCases().then(setCases).catch(() => {});
        listIncidents().then(setIncidents).catch(() => {});
      } catch (e) { setError(errorText(e)); }
    })();
  }, [canWrite]);

  const today = todayISO();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 14 ? "Bon dia" : hour < 21 ? "Bona tarda" : "Bona nit";
  const in7 = addDaysISO(today, 7);
  const dueSoon = alerts.filter(a => a.due_date && a.due_date >= today && a.due_date <= in7);
  const dueDays = useMemo(() => new Set(alerts.map(a => a.due_date).filter(Boolean)), [alerts]);

  // Calendari del mes
  const first = (month.getDay() + 6) % 7; // dilluns = 0
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const isoOf = (d: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const n = (v?: number) => (counts ? String(v ?? 0) : "…");
  const revDue = cases.filter(c => c.next && c.next.date <= addDaysISO(today, 15)).sort((a, b) => a.next!.date.localeCompare(b.next!.date));
  const stats: [any, string, string, string, Section, string][] = [
    [Building2, n(counts?.properties), "Immobles", "actius", "Immobles", "green"],
    [Users, n(counts?.clients), "Clients", "actius", "Clients", "blue"],
    [Bell, n(counts?.alerts), "Alertes", `${counts?.overdue ?? 0} vençudes`, "Alertes", "amber"],
    [KeyRound, n(counts?.keys), "Claus", "fora d'oficina", "Claus", "purple"],
    [AlertTriangle, n(counts?.incidents), "Incidències", "obertes", "Incidències", "red"],
    [CalendarDays, counts ? String(revDue.length) : "…", "Revisions", "pendents (15 dies)", "Revisions", "teal"],
  ];

  // Tasques per avui: alertes d'avui o vençudes, revisions que toquen i incidències obertes.
  type Task = { key: string; kind: Kind; title: string; sub: string; state: "late" | "today" | "open"; go: () => void };
  const tasks: Task[] = [
    ...alerts.filter(a => a.due_date && a.due_date <= today).map(a => ({
      key: "a" + a.id, kind: alertKind(a), title: a.title, sub: a.client_name || "",
      state: (a.due_date! < today ? "late" : "today") as Task["state"], go: () => { if (a.client_id) onOpenClient(a.client_id); },
    })),
    ...cases.filter(c => c.next && c.next.date <= today).map(c => ({
      key: "c" + c.id, kind: KINDS.revisio, title: "Revisió: " + c.address, sub: c.client_name,
      state: (c.next!.date < today ? "late" : "today") as Task["state"], go: () => onOpenProperty(c.id),
    })),
    ...incidents.filter(i => i.status === "oberta").map(i => ({
      key: "i" + i.id, kind: KINDS.incidencia, title: i.description.split("\n")[0] || "Incidència", sub: [i.client_name, i.finca].filter(Boolean).join(" · "),
      state: "open" as const, go: () => onNavigate("Incidències"),
    })),
  ];
  const order = { today: 0, late: 1, open: 2 };
  tasks.sort((a, b) => order[a.state] - order[b.state]);
  const STATE_TXT = { late: "Endarrerida", today: "Avui", open: "Oberta" };

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
            {stats.map(([Icon, num, label, sub, target, color]) => (
              <button className={"stat-card k-" + color} key={label} onClick={() => onNavigate(target)}>
                <span className="stat-ico"><Icon size={18} /></span><strong>{num}</strong><span>{label}</span><small>{sub}</small><ChevronRight size={13} />
              </button>
            ))}
          </div>
          <div className="dashboard-pair">
            <section className="dash-panel tasks-panel">
              <header><strong>Tasques per avui <span className="count-pill green">{tasks.length}</span></strong></header>
              {!tasks.length && <p className="empty-line pad">Res pendent per avui.</p>}
              {tasks.slice(0, 10).map(t => (
                <button className="today-row as-button" key={t.key} onClick={t.go}>
                  <KindDot k={t.kind} />
                  <div><strong>{t.title}</strong><small>{t.sub}</small></div>
                  <span className={"state-chip st-" + t.state}><i className="dot" />{STATE_TXT[t.state]}</span>
                </button>
              ))}
              {tasks.length > 10 && <p className="empty-line pad">… i {tasks.length - 10} més</p>}
            </section>
            <section className="dash-panel">
              <header><strong>Alertes pendents <span className="count-pill">{alerts.length}</span></strong></header>
              <div className="dash-table-head"><span></span><span>ALERTA</span><span>DATA</span><span>ESTAT</span></div>
              {!alerts.length && <p className="empty-line pad">No hi ha alertes pendents.</p>}
              {alerts.slice(0, 8).map(a => (
                <button className="alert-row as-button" key={a.id} onClick={() => a.client_id && onOpenClient(a.client_id)}>
                  <KindDot k={alertKind(a)} />
                  <div><strong>{a.title}</strong><small>{a.client_name || a.content || ""}</small></div>
                  <small>{fmtDate(a.due_date)}</small>
                  <span className={"status-pill " + (a.overdue ? "status-warn" : "status-ok")}><i className="dot" />{a.overdue ? "Vençuda" : "Pendent"}</span>
                </button>
              ))}
            </section>
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
            <header><strong>Venciments (7 dies)</strong><span className="count-pill green">{dueSoon.length}</span></header>
            {!dueSoon.length && <p className="empty-line pad">Res a vèncer aquesta setmana.</p>}
            {dueSoon.map(a => (
              <button className="agenda-row as-button" key={a.id} onClick={() => a.client_id && onOpenClient(a.client_id)}>
                <time>{fmtDate(a.due_date).slice(0, 5)}</time><div><strong>{a.title}</strong><small>{a.client_name}</small></div>
              </button>
            ))}
          </section>
          <section className="due-panel">
            <header><strong>Revisions a fer</strong><button onClick={() => onNavigate("Revisions")}>Veure totes →</button></header>
            {!revDue.length && <p className="empty-line pad">Cap revisió pendent els pròxims 15 dies.</p>}
            {revDue.slice(0, 6).map(c => (
              <button className="due-row as-button" key={c.id} onClick={() => onOpenProperty(c.id)}>
                <KindDot k={KINDS.revisio} /><div><strong>{c.address}</strong><small>{c.client_name}</small></div><time className={c.next!.overdue ? "txt-warn" : ""}>{fmtDate(c.next!.date)}</time>
              </button>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}

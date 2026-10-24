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
const KindIcon = ({ k }: { k: Kind }) => <span className={"kind-ico k-" + k.color} title={k.label}><k.icon size={19} /></span>;
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
  const revLate = revDue.filter(c => c.next!.overdue).length;
  const incOpen = incidents.filter(i => i.status === "oberta").length;
  const incProgress = incidents.filter(i => i.status === "en_curs").length;
  const stats: [any, string, string, string[], Section, string][] = [
    [Building2, n(counts?.properties), "Immobles", ["actius"], "Immobles", "green"],
    [Users, n(counts?.clients), "Clients", ["actius"], "Clients", "blue"],
    [Bell, n(counts?.alerts), "Alertes", [`${dueSoon.length} en 7 dies`, `${counts?.overdue ?? 0} vençudes`], "Alertes", "amber"],
    [Wrench, counts ? String(revDue.length) : "…", "Revisions", [`${revDue.length - revLate} pròximes`, `${revLate} vençudes`], "Revisions", "teal"],
    [AlertTriangle, n(counts?.incidents), "Incidències", [`${incOpen} obertes`, `${incProgress} en curs`], "Incidències", "red"],
    [KeyRound, n(counts?.keys), "Claus", ["fora d'oficina"], "Claus", "purple"],
  ];

  // Estat de cada alerta (com a la mostra: vençuda, avui, pròxima)
  const alertState = (a: Alert): [string, string] =>
    a.overdue || (a.due_date && a.due_date < today) ? ["Vençuda", "st-late"]
      : a.due_date === today ? ["Avui", "st-today"]
      : a.due_date && a.due_date <= in7 ? ["Pròxima", "st-ok"] : ["Pendent", "st-grey"];

  // Tasques d'avui: alertes d'avui o vençudes, revisions que toquen i incidències obertes o en curs.
  type Task = { key: string; kind: Kind; when: string; title: string; sub: string; state: "late" | "today" | "open" | "progress"; go: () => void };
  const tasks: Task[] = [
    ...alerts.filter(a => a.due_date && a.due_date <= today).map(a => ({
      key: "a" + a.id, kind: alertKind(a), when: a.due_date!, title: a.title, sub: a.client_name || "",
      state: (a.due_date! < today ? "late" : "today") as Task["state"], go: () => { if (a.client_id) onOpenClient(a.client_id); },
    })),
    ...cases.filter(c => c.next && c.next.date <= today).map(c => ({
      key: "c" + c.id, kind: KINDS.revisio, when: c.next!.date, title: "Revisió: " + c.address, sub: c.client_name,
      state: (c.next!.date < today ? "late" : "today") as Task["state"], go: () => onOpenProperty(c.id),
    })),
    ...incidents.filter(i => i.status === "oberta" || i.status === "en_curs").map(i => ({
      key: "i" + i.id, kind: KINDS.incidencia, when: i.incident_date, title: i.description.split("\n")[0] || "Incidència",
      sub: [i.client_name, i.finca].filter(Boolean).join(" · "),
      state: (i.status === "en_curs" ? "progress" : "open") as Task["state"], go: () => onNavigate("Incidències"),
    })),
  ];
  const order = { today: 0, late: 1, open: 2, progress: 3 };
  tasks.sort((a, b) => order[a.state] - order[b.state] || a.when.localeCompare(b.when));
  const STATE: Record<Task["state"], [string, string]> = {
    late: ["Endarrerida", "st-late"], today: ["Pendent", "st-today"], open: ["Pendent", "st-today"], progress: ["En curs", "st-ok"],
  };
  const whenTxt = (d: string) => (d === today ? "Avui" : fmtDate(d).slice(0, 5));
  const agenda = tasks.filter(t => t.when === today);

  return (
    <div className="dashboard-area">
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <section className="welcome-banner">
            <div className="welcome-copy"><small>MAREMONTIS</small><h1>{greeting}{userName ? `, ${userName}` : ""}</h1><p>Aquí tens el resum de l'activitat d'avui.</p></div>
            <div className="welcome-date">{DAYS[now.getDay()][0].toUpperCase() + DAYS[now.getDay()].slice(1)},<br /><strong>{now.getDate()} de {MONTHS[now.getMonth()]} de {now.getFullYear()}</strong></div>
          </section>
          {error && <Notice kind="error">No s'han pogut carregar les dades: {error}</Notice>}
          <div className="stat-cards">
            {stats.map(([Icon, num, label, subs, target, color]) => (
              <button className={"stat-card k-" + color} key={label} onClick={() => onNavigate(target)}>
                <span className="stat-ico"><Icon size={26} /></span><strong>{num}</strong><span>{label}</span>
                <small>{subs.map(t => <em key={t}>{t}</em>)}</small><ChevronRight size={13} />
              </button>
            ))}
          </div>
          <div className="dashboard-pair">
            <section className="dash-panel">
              <header><strong>Alertes pendents <span className="count-pill">{alerts.length}</span></strong><button onClick={() => onNavigate("Alertes")}>Veure totes →</button></header>
              <div className="dash-table-head"><span>TIPUS</span><span>DESCRIPCIÓ</span><span>DATA</span><span>ESTAT</span></div>
              {!alerts.length && <p className="empty-line pad">No hi ha alertes pendents.</p>}
              {alerts.slice(0, 8).map(a => {
                const [txt, cls] = alertState(a);
                return (
                  <button className="alert-row as-button" key={a.id} onClick={() => a.client_id && onOpenClient(a.client_id)}>
                    <KindIcon k={alertKind(a)} />
                    <div><strong>{a.title}</strong><small>{a.client_name || a.content || ""}</small></div>
                    <small className={cls === "st-late" ? "txt-late" : ""}>{fmtDate(a.due_date)}</small>
                    <span className={"state-chip " + cls}>{txt}</span><ChevronRight size={13} />
                  </button>
                );
              })}
            </section>
            <section className="dash-panel tasks-panel">
              <header><strong>Tasques d'avui <span className="count-pill green">{tasks.length}</span></strong><button onClick={() => onNavigate("Alertes")}>Veure totes →</button></header>
              <div className="dash-table-head tasks-head"><span>DIA</span><span>TASCA</span><span>TIPUS</span><span>ESTAT</span></div>
              {!tasks.length && <p className="empty-line pad">Res pendent per avui.</p>}
              {tasks.slice(0, 8).map(t => (
                <button className="today-row as-button" key={t.key} onClick={t.go}>
                  <time><i className={"tl-dot k-" + t.kind.color} />{whenTxt(t.when)}</time>
                  <div><strong>{t.title}</strong><small>{t.sub}</small></div>
                  <span className="type-chip">{t.kind.label}</span>
                  <span className={"state-chip " + STATE[t.state][1]}>{STATE[t.state][0]}</span><ChevronRight size={13} />
                </button>
              ))}
              {tasks.length > 8 && <p className="empty-line pad">… i {tasks.length - 8} més</p>}
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
            <header><strong>Agenda d'avui</strong><button onClick={() => onNavigate("Alertes")}>Veure totes →</button></header>
            {!agenda.length && <p className="empty-line pad">Res programat per avui.</p>}
            {agenda.slice(0, 6).map(t => (
              <button className="agenda-row as-button" key={t.key} onClick={t.go}>
                <i className={"tl-dot k-" + t.kind.color} /><div><strong>{t.title}</strong><small>{t.sub}</small></div>
              </button>
            ))}
          </section>
          <section className="due-panel">
            <header><strong>Pròxims venciments (7 dies)</strong><button onClick={() => onNavigate("Alertes")}>Veure tots →</button></header>
            {!dueSoon.length && <p className="empty-line pad">Res a vèncer aquesta setmana.</p>}
            {dueSoon.slice(0, 6).map(a => (
              <button className="due-row as-button" key={a.id} onClick={() => a.client_id && onOpenClient(a.client_id)}>
                <KindDot k={alertKind(a)} /><div><strong>{a.title}</strong><small>{a.client_name}</small></div><time>{fmtDate(a.due_date)}</time>
              </button>
            ))}
          </section>
          <section className="due-panel">
            <header><strong>Revisions a fer</strong><button onClick={() => onNavigate("Revisions")}>Veure totes →</button></header>
            {!revDue.length && <p className="empty-line pad">Cap revisió pendent els pròxims 15 dies.</p>}
            {revDue.slice(0, 5).map(c => (
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

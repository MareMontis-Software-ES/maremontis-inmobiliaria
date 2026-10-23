import type { ReactNode } from "react";
import { AlertTriangle, Bell, Building2, CalendarDays, ChevronRight, FileText, House, KeyRound, Landmark, LogOut, Search, Settings, UserRound, Users, Wrench } from "lucide-react";
import type { Profile, Section } from "../../types";

// Menú lateral. Els mòduls marcats amb «pending» encara no estan desenvolupats.
const NAV: [Section, any, boolean][] = [
  ["Inici", House, false],
  ["Clients", UserRound, false],
  ["Immobles", Building2, false],
  ["Alertes", Bell, false],
  ["Claus", KeyRound, false],
  ["Incidències", AlertTriangle, false],
  ["Revisions", CalendarDays, false],
  ["Contractes", FileText, false],
  ["Industrials", Wrench, false],
  ["Impostos", Landmark, false],
];

const ROLE_LABEL = { admin: "Administrador", oficina: "Oficina", consulta: "Només consulta" };

interface Props {
  section: Section;
  crumb: string;
  profile: Profile | null;
  email: string;
  query: string;
  overdue: number;
  onNavigate: (s: Section) => void;
  onSearch: (q: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

export function Shell({ section, crumb, profile, email, query, overdue, onNavigate, onSearch, onLogout, children }: Props) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-symbol"><House size={31} /><span></span></div><div><strong>MareMontis</strong><small>Gestió Immobiliària</small></div></div>
        <nav className="side-nav">
          {NAV.map(([label, Icon, pending]) => (
            <button key={label} className={"nav-item " + (section === label ? "active" : "") + (pending ? " pending" : "")} onClick={() => onNavigate(label)} title={pending ? "Pendent de desenvolupar" : undefined}>
              <Icon size={22} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className={"nav-item " + (section === "Configuració" ? "active" : "")} onClick={() => onNavigate("Configuració")}><Settings size={22} /><span>Configuració</span></button>
          <div className="user-profile">
            <div className="user-icon"><Users size={19} /></div>
            <div><strong>{profile?.full_name || email}</strong><small>{profile ? ROLE_LABEL[profile.role] : "Sense perfil"}</small></div>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <div className="topbar">
          <div className="breadcrumb">{section}{crumb && <><ChevronRight size={14} /><span>{crumb}</span></>}</div>
          <label className="global-search"><Search size={19} /><input placeholder="Buscar clients (codi, nom, DNI, telèfon…)" value={query} onChange={e => onSearch(e.target.value)} /></label>
          <div className="top-actions">
            <button aria-label="Alertes vençudes" title="Alertes vençudes" onClick={() => onNavigate("Inici")}><Bell size={22} />{overdue > 0 && <i>{overdue}</i>}</button>
            <button aria-label="Sortir" title="Tancar sessió" onClick={onLogout}><LogOut size={22} /></button>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

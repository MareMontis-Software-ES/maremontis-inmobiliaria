import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, BarChart3, Bell, Building2, CalendarDays, ChevronDown, ChevronRight, CircleHelp, FileText, House, KeyRound, Landmark, LogOut, Settings, UserRound, Users, Wrench } from "lucide-react";
import type { Profile, Section } from "../../types";
import type { SearchHit } from "../../data/search";
import { GlobalSearch } from "./GlobalSearch";
import { HelpPanel } from "../help/HelpPanel";
import logo from "../../assets/logo-maremontis.png";

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
  ["Estadístiques", BarChart3, false],
];

const ROLE_LABEL = { admin: "Administrador", oficina: "Oficina", consulta: "Només consulta" };

interface Props {
  section: Section;
  crumb: string;
  visible: (s: Section) => boolean;   // apartats que el rol de l'usuari pot veure
  profile: Profile | null;
  email: string;
  query: string;
  onNavigate: (s: Section) => void;
  onSearch: (q: string) => void;
  onPick: (h: SearchHit) => void;
  onLogout: () => void;
  children: ReactNode;
}

// Bloc d'usuari de la capçalera: en clicar-lo s'obre un menú amb «Tancar sessió»
function UserMenu({ profile, email, onLogout }: { profile: Profile | null; email: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="user-menu" ref={ref}>
      <button className="user-profile" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <div className="user-icon"><Users size={19} /></div>
        <div><strong>{profile?.full_name || email}</strong><small>{profile ? ROLE_LABEL[profile.role] : "Sense perfil"}</small></div>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="user-dropdown" role="menu">
          <div className="user-dropdown-head"><strong>{profile?.full_name || email}</strong><small>{email}</small></div>
          <button role="menuitem" onClick={() => { setOpen(false); onLogout(); }}><LogOut size={16} />Tancar sessió</button>
        </div>
      )}
    </div>
  );
}

export function Shell({ section, crumb, visible, profile, email, onNavigate, onSearch, onPick, onLogout, children }: Props) {
  const [help, setHelp] = useState(false);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><img className="brand-logo" src={logo} alt="MareMontis" /><small>Gestió Immobiliària</small></div>
        <nav className="side-nav">
          {NAV.filter(([label]) => visible(label)).map(([label, Icon, pending]) => (
            <button key={label} className={"nav-item " + (section === label ? "active" : "") + (pending ? " pending" : "")} onClick={() => onNavigate(label)} title={pending ? "Pendent de desenvolupar" : undefined}>
              <Icon size={22} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {visible("Configuració") && <button className={"nav-item " + (section === "Configuració" ? "active" : "")} onClick={() => onNavigate("Configuració")}><Settings size={22} /><span>Configuració</span></button>}
        </div>
      </aside>
      <main className="main-area">
        <div className="topbar">
          <div className="breadcrumb">{section}{crumb && <><ChevronRight size={14} /><span>{crumb}</span></>}</div>
          <GlobalSearch onPick={onPick} onSearchClients={onSearch} />
          <div className="top-actions">
            <button className="help-button" aria-label="Ajuda" title="Ajuda: modus d'ús del programa" onClick={() => setHelp(true)}><CircleHelp size={26} /></button>
            <UserMenu profile={profile} email={email} onLogout={onLogout} />
          </div>
        </div>
        {children}
      </main>
      {help && <HelpPanel section={section} onClose={() => setHelp(false)} />}
    </div>
  );
}

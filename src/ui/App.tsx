// Punt d'entrada de l'aplicació: sessió, perfil i navegació entre mòduls.
// Cada mòdul viu a src/modules/<mòdul>/ i accedeix a dades via src/data/.
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { House } from "lucide-react";
import { supabase } from "../lib/supabase";
import { currentProfile } from "../data/lookups";
import { dashboardCounts } from "../data/properties";
import { LoginScreen } from "../modules/auth/LoginScreen";
import { Shell } from "../modules/layout/Shell";
import { Dashboard } from "../modules/dashboard/Dashboard";
import { ClientsPage, type ClientView } from "../modules/clients/ClientsPage";
import type { ClientTab } from "../modules/clients/ClientDetail";
import { PropertiesPage } from "../modules/properties/PropertiesPage";
import { AlertsPage, KeysPage } from "../modules/alerts/GlobalPages";
import { ContractsPage, IndustrialsPage, ConfigPage } from "../modules/admin/AdminPages";
import { CasesPage } from "../modules/cases/CasesPage";
import { TaxesPage } from "../modules/taxes/TaxesPage";
import { StatsPage } from "../modules/stats/StatsPage";
import { IncidentsView } from "../modules/incidents/IncidentsView";
import { mainClientOf } from "../data/finques";
import { Notice } from "../components/ui";
import { permissionsFor, type Perms } from "../data/settings";
import type { Profile, Section } from "../types";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState("");
  const [section, setSection] = useState<Section>("Inici");
  const [clientView, setClientView] = useState<ClientView>({ mode: "list" });
  const [query, setQuery] = useState("");
  const [overdue, setOverdue] = useState(0);
  const [perms, setPerms] = useState<Perms | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setAuthReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    currentProfile(session.user.id).then(p => {
      setProfile(p);
      setProfileError(p ? "" : "El teu usuari no té perfil a la taula «admi_users». Demana a un administrador que te'l creï.");
    }).catch(e => setProfileError(String(e?.message || e)));
  }, [session?.user.id]);

  // Permisos per apartat segons el rol (Configuració → Permisos per rol)
  useEffect(() => { if (profile) permissionsFor(profile.role).then(setPerms).catch(() => setPerms(null)); }, [profile?.role]);

  useEffect(() => {
    if (session && profile) dashboardCounts().then(c => setOverdue(c.overdue)).catch(() => {});
  }, [session?.user.id, profile, section]);

  if (!authReady) return <div className="auth-screen"><section className="auth-card"><div className="brand-symbol"><House size={38} /></div><h1>MareMontis</h1><p>Gestió immobiliària</p><span>Comprovant la sessió…</span></section></div>;
  if (!session) return <LoginScreen />;

  const roleCanWrite = profile?.role === "admin" || profile?.role === "oficina";
  const allowed = (s: Section) => !perms || perms[s].view;
  const can = (s: Section) => roleCanWrite && (!perms || perms[s].create || perms[s].edit);
  const canDelete = (s: Section) => roleCanWrite && (!perms || perms[s].delete);
  const canWrite = can(section === "Inici" ? "Clients" : section);
  const go = (s: Section) => {
    setSection(s);
  };
  const openClient = (id: string, tab?: ClientTab) => { setSection("Clients"); setClientView({ mode: "detail", id, tab }); };
  // Tot gira al voltant del client: una finca s'obre dins la fitxa del seu titular principal
  const openProperty = async (id: string) => {
    const clientId = await mainClientOf(id).catch(() => null);
    if (clientId) { setSection("Clients"); setClientView({ mode: "detail", id: clientId, propertyId: id, tab: "finca" }); }
    else window.alert("Aquesta finca no té cap titular assignat.");
  };

  const crumb = "";

  return (
    <Shell section={section} crumb={crumb} visible={allowed} profile={profile} email={session.user.email || ""} query={query} overdue={overdue}
      onNavigate={go}
      onSearch={q => { setQuery(q); setSection("Clients"); setClientView({ mode: "list" }); }}
      onPick={h => {
        if (h.kind === "finca") void openProperty(h.id);
        else if (h.client_id) openClient(h.client_id, h.kind === "matricula" ? "matricules" : h.kind === "client" ? undefined : "conjuge");
      }}
      onLogout={async () => { await supabase.auth.signOut(); setSection("Inici"); }}>
      {profileError && <div className="work-area"><Notice kind="error">{profileError}</Notice></div>}
      {!allowed(section) && <div className="work-area"><Notice kind="error">El teu rol no té permís per veure l'apartat «{section}».</Notice></div>}
      <div style={{ display: section === "Clients" ? undefined : "none" }}>
        <ClientsPage view={clientView} setView={setClientView} query={query} setQuery={setQuery} canWrite={can("Clients")} userId={session.user.id} />
      </div>
      {!allowed(section) ? null : section === "Inici" ? (
        <Dashboard canWrite={canWrite} userName={profile?.full_name?.split(" ")[0] || ""} onNavigate={go} onOpenClient={openClient} onOpenProperty={openProperty} />
      ) : section === "Clients" ? null : section === "Immobles" ? (
        <PropertiesPage onOpenProperty={openProperty} canWrite={canWrite} />
      ) : section === "Alertes" ? (
        <AlertsPage canWrite={canWrite} userId={session.user.id} onOpenClient={openClient} />
      ) : section === "Claus" ? (
        <KeysPage canWrite={canWrite} userId={session.user.id} onOpenClient={openClient} />
      ) : section === "Incidències" ? (
        <div className="work-area list-view">
          <div className="page-title"><div><small>SEGUIMENT</small><h1>Incidències</h1><p>Anotacions de tot tipus vinculades a client, finca i industrial. Les que cal gestionar poden generar notes de servei (sense facturació).</p></div></div>
          <IncidentsView canWrite={canWrite} userId={session.user.id} onOpenClient={openClient} />
        </div>
      ) : section === "Revisions" ? (
        <CasesPage canWrite={canWrite} userId={session.user.id} onOpenClient={openClient} />
      ) : section === "Contractes" ? (
        <ContractsPage canWrite={profile?.role === "admin" && can("Contractes")} canDelete={profile?.role === "admin" && canDelete("Contractes")} />
      ) : section === "Industrials" ? (
        <IndustrialsPage canWrite={canWrite} canDelete={canDelete("Industrials")} />
      ) : section === "Impostos" ? (
        <TaxesPage canWrite={canWrite} onOpenProperty={openProperty} />
      ) : section === "Estadístiques" ? (
        <StatsPage />
      ) : (
        <ConfigPage isAdmin={profile?.role === "admin"} />
      )}
    </Shell>
  );
}

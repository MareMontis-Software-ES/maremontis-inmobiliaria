// Mòdul de clients amb FITXES OBERTES EN PESTANYES (com un navegador):
//  · la llista és sempre la primera pestanya
//  · cada client que s'obre queda en una pestanya pròpia, amb la seva finca i pestanya interior
//  · es tanca amb la X (avisa si hi ha canvis sense gravar)
//  · les fitxes es mantenen encara que es canviï d'apartat del menú
import { useEffect, useRef, useState } from "react";
import { List, Plus, X } from "lucide-react";
import { emptyClient, getClient, isClientCodeTaken, listClients, nextClientCode, saveClient, setClientStatus } from "../../data/clients";
import { listResponsibles } from "../../data/lookups";
import { errorText } from "../../lib/supabase";
import { Notice } from "../../components/ui";
import { ClientList } from "./ClientList";
import { ClientDetail, type ClientTab } from "./ClientDetail";
import { ClientForm } from "./ClientForm";
import type { ClientFull, ClientSummary, Profile, PropertyLink } from "../../types";

/** Ordres que arriben de fora (menú, Inici, Immobles, Alertes…) */
export type ClientView =
  | { mode: "list" }
  | { mode: "detail"; id: string; propertyId?: string | null | "new"; tab?: ClientTab }
  | { mode: "new" }
  | { mode: "edit"; id: string };

interface OpenTab {
  key: string;                 // identificador de la pestanya
  id: string | null;           // client (null = alta nova)
  name: string;
  dirty: boolean;              // hi ha canvis sense gravar
  request: { n: number; propertyId?: string | null | "new"; tab?: ClientTab; edit?: boolean }; // última ordre rebuda
}

const STORE = "mm.fitxesObertes";
const MAX_TABS = 12;
let seq = 0;
const newKey = () => `t${Date.now().toString(36)}${seq++}`;

interface Props {
  view: ClientView;
  setView: (v: ClientView) => void;
  query: string;
  setQuery: (q: string) => void;
  canWrite: boolean;
  userId?: string;
}

export function ClientsPage({ view, query, setQuery, canWrite, userId }: Props) {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [responsibles, setResponsibles] = useState<Profile[]>([]);
  const [tabs, setTabs] = useState<OpenTab[]>(() => {
    try { // recupera les fitxes que hi havia obertes (només el client, no els canvis)
      const saved = JSON.parse(localStorage.getItem(STORE) || "[]") as { id: string; name: string }[];
      return saved.filter(t => t.id).map(t => ({ key: newKey(), id: t.id, name: t.name, dirty: false, request: { n: 0 } }));
    } catch { return []; }
  });
  const [active, setActive] = useState<string>("list");

  const reloadList = () => {
    setLoading(true);
    return listClients().then(c => { setClients(c); setListError(""); })
      .catch(e => setListError(errorText(e))).finally(() => setLoading(false));
  };
  useEffect(() => { void reloadList(); listResponsibles().then(setResponsibles).catch(() => setResponsibles([])); }, []);
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(tabs.filter(t => t.id).map(t => ({ id: t.id, name: t.name })))); } catch { /* sense emmagatzematge */ } }, [tabs]);

  // ---- obrir / activar / tancar ----
  function open(id: string | null, req: Omit<OpenTab["request"], "n"> = {}) {
    setTabs(prev => {
      const found = id ? prev.find(t => t.id === id) : undefined;
      if (found) {
        setActive(found.key);
        return prev.map(t => t.key === found.key ? { ...t, request: { ...req, n: t.request.n + 1 } } : t);
      }
      const name = id ? (clients.find(c => c.id === id) ? `${clients.find(c => c.id === id)!.first_name} ${clients.find(c => c.id === id)!.last_name}`.trim() : "Carregant…") : "Nou client";
      const t: OpenTab = { key: newKey(), id, name, dirty: false, request: { ...req, n: 1 } };
      setActive(t.key);
      let next = [...prev, t];
      // massa pestanyes: es tanca la més antiga que no tingui canvis
      while (next.length > MAX_TABS) {
        const i = next.findIndex(x => !x.dirty && x.key !== t.key);
        if (i < 0) break;
        next = next.filter((_, j) => j !== i);
      }
      return next;
    });
  }

  function close(key: string) {
    const t = tabs.find(x => x.key === key);
    if (t?.dirty && !window.confirm(`«${t.name}» té canvis sense gravar. Tancar-la igualment?`)) return;
    const i = tabs.findIndex(x => x.key === key);
    const rest = tabs.filter(x => x.key !== key);
    setTabs(rest);
    if (active === key) setActive(rest[i]?.key || rest[i - 1]?.key || "list");
  }

  const patchTab = (key: string, p: Partial<OpenTab>) => setTabs(prev => prev.map(t => (t.key === key ? { ...t, ...p } : t)));

  // Ordres que arriben de la resta del programa
  const lastView = useRef<ClientView | null>(null);
  useEffect(() => {
    if (lastView.current === view) return;
    lastView.current = view;
    if (view.mode === "list") setActive("list");
    else if (view.mode === "new") open(null);
    else if (view.mode === "edit") open(view.id, { edit: true });
    else open(view.id, { propertyId: view.propertyId, tab: view.tab });
  }, [view]);

  return (
    <div className="clients-tabs-host">
      <nav className="open-tabs" aria-label="Fitxes obertes">
        <button className={"open-tab list-tab" + (active === "list" ? " on" : "")} onClick={() => setActive("list")}><List size={15} /> Llista de clients</button>
        {tabs.map(t => (
          <div key={t.key} className={"open-tab" + (active === t.key ? " on" : "")} title={t.name}>
            <button className="open-tab-label" onClick={() => setActive(t.key)}>{t.dirty && <i className="dirty-dot" title="Canvis sense gravar" />}{t.name}</button>
            <button className="open-tab-x" aria-label={`Tancar ${t.name}`} title="Tancar" onClick={() => close(t.key)}><X size={13} /></button>
          </div>
        ))}
        {canWrite && <button className="open-tab add" title="Alta de client" onClick={() => open(null)}><Plus size={15} /></button>}
        {tabs.length > 1 && <button className="open-tab close-all" title="Tancar totes les fitxes" onClick={() => { if (!tabs.some(t => t.dirty) || window.confirm("Hi ha fitxes amb canvis sense gravar. Tancar-les totes?")) { setTabs([]); setActive("list"); } }}>Tancar totes</button>}
      </nav>

      <div style={{ display: active === "list" ? undefined : "none" }}>
        {listError && <div className="work-area"><Notice kind="error">No s'han pogut carregar els clients: {listError}</Notice></div>}
        <ClientList clients={clients} query={query} setQuery={setQuery} canWrite={canWrite} loading={loading}
          onOpen={id => open(id)}
          onOpenProperty={(pid, cid) => open(cid, { propertyId: pid, tab: "finca" })}
          onNew={() => open(null)} />
      </div>

      {tabs.map(t => (
        <div key={t.key} style={{ display: active === t.key ? undefined : "none" }}>
          <ClientFicha
            id={t.id} request={t.request} clients={clients} responsibles={responsibles} canWrite={canWrite} userId={userId}
            onName={name => name !== t.name && patchTab(t.key, { name })}
            onDirty={d => d !== t.dirty && patchTab(t.key, { dirty: d })}
            onCreated={id => patchTab(t.key, { id, dirty: false })}
            onNavigate={id => { const other = tabs.find(x => x.id === id && x.key !== t.key); if (other) setActive(other.key); else patchTab(t.key, { id, request: { n: t.request.n + 1 } }); }}
            onListChanged={reloadList}
            onClose={() => close(t.key)}
            onBack={() => setActive("list")}
          />
        </div>
      ))}
    </div>
  );
}

// =====================================================================
// Una fitxa de client (dins la seva pestanya). Té el seu propi estat.
// =====================================================================
function ClientFicha({ id, request, clients, responsibles, canWrite, userId, onName, onDirty, onCreated, onNavigate, onListChanged, onClose, onBack }: {
  id: string | null; request: OpenTab["request"]; clients: ClientSummary[]; responsibles: Profile[]; canWrite: boolean; userId?: string;
  onName: (n: string) => void; onDirty: (d: boolean) => void; onCreated: (id: string) => void; onNavigate: (id: string) => void;
  onListChanged: () => Promise<void> | void; onClose: () => void; onBack: () => void;
}) {
  const [current, setCurrent] = useState<{ full: ClientFull; properties: PropertyLink[] } | null>(null);
  const [mode, setMode] = useState<"detail" | "edit" | "new">(id ? "detail" : "new");
  const [formInitial, setFormInitial] = useState<ClientFull | null>(null);
  const [propertyId, setPropertyId] = useState<string | null | "new" | undefined>(undefined);
  const [tab, setTab] = useState<ClientTab>("client");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async (cid: string) => {
    const r = await getClient(cid);
    setCurrent(r);
    onName(`${r.full.client.first_name} ${r.full.client.last_name}`.trim() || `Client ${r.full.client.client_code}`);
    return r;
  };

  // Client nou
  useEffect(() => {
    if (id) return;
    setMode("new"); onName("Nou client");
    nextClientCode().then(code => setFormInitial(emptyClient(code))).catch(e => { setError(errorText(e)); setFormInitial(emptyClient("")); });
  }, []);

  // Càrrega i ordres externes (obrir amb una finca o pestanya concreta, anterior/següent…)
  useEffect(() => {
    if (!id) return;
    setError("");
    load(id).then(r => {
      if (request.propertyId !== undefined) setPropertyId(request.propertyId);
      else if (current?.full.client.id !== id) setPropertyId(undefined);
      if (request.tab) setTab(request.tab);
      if (request.edit) { setFormInitial(structuredClone(r.full)); setMode("edit"); }
      else if (current?.full.client.id !== id) setMode("detail");
    }).catch(e => setError(errorText(e)));
  }, [id, request.n]);

  useEffect(() => { onDirty(mode === "edit" || mode === "new"); }, [mode]);

  async function handleSave(full: ClientFull) {
    setSaving(true); setError("");
    try {
      if (await isClientCodeTaken(Number(full.client.client_code), full.client.id)) { setError(`El codi ${full.client.client_code} ja està assignat a un altre client.`); return; }
      const isNew = !full.client.id;
      const newId = await saveClient(full);
      await onListChanged();
      setMode("detail");
      if (isNew) { setPropertyId("new"); setTab("finca"); onCreated(newId); } // client nou → alta de la seva primera finca
      else await load(newId);
    } catch (e) { setError("No s'ha pogut desar. " + errorText(e)); }
    finally { setSaving(false); }
  }

  async function toggleStatus() {
    if (!current?.full.client.id) return;
    const c = current.full.client;
    const goingOff = c.status === "active";
    if (goingOff && !window.confirm("Donar de baixa aquest client? No s'esborra: es conserva per a l'històric i el model 210.")) return;
    try { await setClientStatus(c.id!, goingOff ? "inactive" : "active"); await load(c.id!); await onListChanged(); } catch (e) { setError(errorText(e)); }
  }

  if (mode === "new" || mode === "edit") {
    if (!formInitial) return <div className="work-area list-view">{error ? <Notice kind="error">{error}</Notice> : <p className="empty-line">Carregant…</p>}</div>;
    return (
      <div className="work-area list-view">
        <ClientForm key={(formInitial.client.id || "new") + mode} initial={formInitial} responsibles={responsibles} saving={saving} error={error}
          onSave={handleSave}
          onCancel={() => { if (mode === "edit") setMode("detail"); else onClose(); }} />
      </div>
    );
  }

  if (!current) return <div className="work-area list-view">{error ? <Notice kind="error">{error}</Notice> : <p className="empty-line">Carregant fitxa…</p>}</div>;
  const index = clients.findIndex(c => c.id === id);
  const firstFinca = current.properties.find(h => h.status === "active")?.id ?? current.properties[0]?.id ?? null;
  const pid = propertyId !== undefined ? propertyId : firstFinca;

  return (
    <ClientDetail
      full={current.full} properties={current.properties} responsibles={responsibles} canWrite={canWrite} userId={userId}
      position={{ index, total: clients.length }} error={error}
      tab={tab} propertyId={pid}
      onTab={setTab}
      onSelectProperty={p => { setPropertyId(p); if (p === "new" || tab === "client" || tab === "conjuge" || tab === "matricules") setTab("finca"); }}
      onPropertySaved={async p => { try { await load(id!); } catch (e) { setError(errorText(e)); } void onListChanged(); setPropertyId(p); setTab("finca"); }}
      onEdit={() => { setFormInitial(structuredClone(current.full)); setMode("edit"); }}
      onToggleStatus={toggleStatus}
      onPrev={() => index > 0 && onNavigate(clients[index - 1].id)}
      onNext={() => index < clients.length - 1 && onNavigate(clients[index + 1].id)}
      onBack={onBack}
    />
  );
}

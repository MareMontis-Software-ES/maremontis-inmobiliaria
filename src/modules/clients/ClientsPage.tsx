// Mòdul de clients amb FITXES OBERTES EN PESTANYES (com un navegador):
//  · la llista és sempre la primera pestanya
//  · cada client que s'obre queda en una pestanya pròpia, amb la seva finca i pestanya interior
//  · es tanca amb la X (avisa si hi ha canvis sense gravar)
//  · les fitxes es mantenen encara que es canviï d'apartat del menú
import { useEffect, useRef, useState } from "react";
import { List, Plus, Save, Users, X } from "lucide-react";
import { emptyClient, findDuplicates, getClient, isAccountCodeTaken, isClientCodeTaken, listClients, saveClient, setClientStatus } from "../../data/clients";
import { listResponsibles } from "../../data/lookups";
import { syncRelatedOwners } from "../../data/finques";
import { errorText } from "../../lib/supabase";
import { accountCode } from "../../lib/format";
import { Notice } from "../../components/ui";
import { ClientList } from "./ClientList";
import { ClientDetail, type ClientTab } from "./ClientDetail";
import { ClientForm, clientErrors, hasClientErrors } from "./ClientForm";
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
          active={active === "list"}
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
  const [draft, setDraft] = useState<ClientFull | null>(id ? null : emptyClient());
  const [tried, setTried] = useState(false);
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

  function startEdit(full: ClientFull) {
    setDraft(structuredClone(full)); setTried(false); setMode("edit");
    setTab(t => (["client", "conjuge", "matricules"].includes(t) ? t : "client"));
  }

  // Client nou: el codi i el subcompte s'escriuen a mà (no es proposa cap número)
  useEffect(() => { if (!id) onName("Nou client"); }, []);

  // Càrrega i ordres externes (obrir amb una finca o pestanya concreta, anterior/següent…)
  useEffect(() => {
    if (!id) return;
    setError("");
    load(id).then(r => {
      if (request.propertyId !== undefined) setPropertyId(request.propertyId);
      else if (current?.full.client.id !== id) setPropertyId(undefined);
      if (request.tab) setTab(request.tab);
      if (request.edit) startEdit(r.full);
      else if (current?.full.client.id !== id) { setMode("detail"); setDraft(null); }
    }).catch(e => setError(errorText(e)));
  }, [id, request.n]);

  useEffect(() => { onDirty(mode === "edit" || mode === "new"); }, [mode]);

  async function handleSave() {
    if (!draft) return;
    const isNew = mode === "new";
    setTried(true); setError("");
    const errs = clientErrors(draft, isNew);
    const pctBad = draft.related.some(r => r.ownership_percentage && (Number(r.ownership_percentage) < 0 || Number(r.ownership_percentage) > 100));
    if (hasClientErrors(errs)) { setError("Revisa els camps marcats en vermell."); if (!isNew) setTab("client"); return; }
    if (pctBad) { setError("El % de propietat d'un cònjuge o copropietari ha de ser entre 0 i 100."); setTab("conjuge"); return; }
    setSaving(true);
    try {
      if (isNew && await isClientCodeTaken(Number(draft.client.client_code))) { setError(`El codi ${draft.client.client_code} ja està assignat a un altre client.`); return; }
      if (isNew && draft.client.account_code && await isAccountCodeTaken(draft.client.account_code)) { setError(`El subcompte ${draft.client.account_code} ja el té un altre client.`); return; }
      const dups = await findDuplicates(draft).catch(() => []);
      if (dups.length && !window.confirm(`Atenció: possible client duplicat.\n\n${dups.map(d => `· ${accountCode(d.client_code)} ${d.name}${d.status !== "active" ? " (baixa)" : ""}: ${d.fields.join(", ")}`).join("\n")}\n\nVols gravar igualment?`)) return;
      const newId = await saveClient(draft);
      await syncRelatedOwners(newId); // el cònjuge/copropietari d'una finca en passa a ser titular
      await onListChanged();
      setMode("detail"); setDraft(null); setTried(false);
      if (isNew) { setPropertyId("new"); setTab("finca"); onCreated(newId); } // client nou → alta de la seva primera finca
      else await load(newId);
    } catch (e) { setError("No s'ha pogut desar. " + errorText(e)); }
    finally { setSaving(false); }
  }

  function handleCancel() {
    if (mode === "new") { onClose(); return; }
    setMode("detail"); setDraft(null); setTried(false); setError("");
  }

  async function toggleStatus() {
    if (!current?.full.client.id) return;
    const c = current.full.client;
    const goingOff = c.status === "active";
    if (goingOff && !window.confirm("Donar de baixa aquest client? No s'esborra: es conserva per a l'històric i el model 210.")) return;
    try { await setClientStatus(c.id!, goingOff ? "inactive" : "active"); await load(c.id!); await onListChanged(); } catch (e) { setError(errorText(e)); }
  }

  // ---- Alta: només les dades del client (cònjuge i matrícules, després a la fitxa) ----
  if (mode === "new") {
    return (
      <div className="work-area list-view">
        <section className="new-client-form">
          <div className="new-client-title"><Users size={22} /><strong>Alta de client</strong></div>
          {error && <Notice kind="error">{error}</Notice>}
          <ClientForm value={draft!} onChange={setDraft} responsibles={responsibles} isNew showErrors={tried} />
          <p className="hint">Després de gravar podràs donar d'alta la seva finca; el cònjuge, els copropietaris i les matrícules s'afegeixen a les pestanyes de la fitxa.</p>
          <div className="form-actions sticky-actions">
            <button className="cancel-btn" onClick={handleCancel} disabled={saving}><X size={16} /> Cancel·lar</button>
            <button className="save-btn" onClick={handleSave} disabled={saving}><Save size={16} /> {saving ? "Desant…" : "Guardar"}</button>
          </div>
        </section>
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
      editing={mode === "edit"} draft={draft} onDraft={setDraft} showErrors={tried} saving={saving}
      onTab={setTab}
      onSelectProperty={p => { setPropertyId(p); if (p === "new" || tab === "client" || tab === "matricules") setTab("finca"); }}
      onPropertySaved={async (p, t) => { try { await load(id!); } catch (e) { setError(errorText(e)); } void onListChanged(); setPropertyId(p); setTab(t || "finca"); }}
      onEdit={() => startEdit(current.full)}
      onEditWith={startEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      onToggleStatus={toggleStatus}
      onPrev={() => index > 0 && onNavigate(clients[index - 1].id)}
      onNext={() => index < clients.length - 1 && onNavigate(clients[index + 1].id)}
      onBack={onBack}
    />
  );
}

// Controla el mòdul de clients: llista → fitxa → alta/modificació.
import { useEffect, useState } from "react";
import { emptyClient, getClient, isClientCodeTaken, listClients, nextClientCode, saveClient, setClientStatus } from "../../data/clients";
import { listResponsibles } from "../../data/lookups";
import { errorText } from "../../lib/supabase";
import { Notice } from "../../components/ui";
import { ClientList } from "./ClientList";
import { ClientDetail, type ClientTab } from "./ClientDetail";
import { ClientForm } from "./ClientForm";
import type { ClientFull, ClientSummary, Profile, PropertyLink } from "../../types";

export type ClientView =
  | { mode: "list" }
  | { mode: "detail"; id: string; propertyId?: string | null | "new"; tab?: ClientTab }
  | { mode: "new" }
  | { mode: "edit"; id: string };

interface Props {
  view: ClientView;
  setView: (v: ClientView) => void;
  query: string;
  setQuery: (q: string) => void;
  canWrite: boolean;
  userId?: string;
}

export function ClientsPage({ view, setView, query, setQuery, canWrite, userId }: Props) {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [responsibles, setResponsibles] = useState<Profile[]>([]);
  const [current, setCurrent] = useState<{ full: ClientFull; properties: PropertyLink[] } | null>(null);
  const [formInitial, setFormInitial] = useState<ClientFull | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const reloadList = () => {
    setLoading(true);
    return listClients().then(c => { setClients(c); setListError(""); })
      .catch(e => setListError(errorText(e))).finally(() => setLoading(false));
  };

  useEffect(() => { void reloadList(); listResponsibles().then(setResponsibles).catch(() => setResponsibles([])); }, []);

  // Carrega el que cal segons la vista
  useEffect(() => {
    setError("");
    if (view.mode === "detail" || view.mode === "edit") {
      if (current?.full.client.id !== view.id) setCurrent(null);
      getClient(view.id).then(r => {
        setCurrent(r);
        if (view.mode === "edit") setFormInitial(structuredClone(r.full));
      }).catch(e => setError(errorText(e)));
    } else if (view.mode === "new") {
      setFormInitial(null);
      nextClientCode().then(code => setFormInitial(emptyClient(code)))
        .catch(e => { setError(errorText(e)); setFormInitial(emptyClient("")); });
    }
  }, [view.mode, "id" in view ? view.id : ""]);

  async function handleSave(full: ClientFull) {
    setSaving(true); setError("");
    try {
      if (await isClientCodeTaken(Number(full.client.client_code), full.client.id)) {
        setError(`El codi ${full.client.client_code} ja està assignat a un altre client.`);
        return;
      }
      const isNew = !full.client.id;
      const id = await saveClient(full);
      await reloadList();
      // Client nou → directament a l'alta de la seva primera finca
      setView(isNew ? { mode: "detail", id, tab: "finca", propertyId: "new" } : { mode: "detail", id });
    } catch (e) {
      setError("No s'ha pogut desar. " + errorText(e));
    } finally { setSaving(false); }
  }

  async function toggleStatus() {
    if (!current?.full.client.id) return;
    const c = current.full.client;
    const goingOff = c.status === "active";
    if (goingOff && !window.confirm("Donar de baixa aquest client? No s'esborra: es conserva per a l'històric i el model 210.")) return;
    try {
      await setClientStatus(c.id!, goingOff ? "inactive" : "active");
      const r = await getClient(c.id!);
      setCurrent(r);
      await reloadList();
    } catch (e) { setError(errorText(e)); }
  }

  if (view.mode === "list") {
    return <>
      {listError && <div className="work-area"><Notice kind="error">No s'han pogut carregar els clients: {listError}</Notice></div>}
      <ClientList clients={clients} query={query} setQuery={setQuery} canWrite={canWrite} loading={loading}
        onOpen={id => setView({ mode: "detail", id })}
        onOpenProperty={(pid, cid) => setView({ mode: "detail", id: cid, propertyId: pid, tab: "finca" })}
        onNew={() => setView({ mode: "new" })} />
    </>;
  }

  if (view.mode === "new" || view.mode === "edit") {
    if (!formInitial) return <div className="work-area list-view">{error ? <Notice kind="error">{error}</Notice> : <p className="empty-line">Carregant…</p>}</div>;
    return (
      <div className="work-area list-view">
        <ClientForm key={(formInitial.client.id || "new") + view.mode} initial={formInitial} responsibles={responsibles} saving={saving} error={error}
          onSave={handleSave}
          onCancel={() => setView(view.mode === "edit" ? { mode: "detail", id: view.id } : { mode: "list" })} />
      </div>
    );
  }

  // Fitxa
  if (!current) return <div className="work-area list-view">{error ? <Notice kind="error">{error}</Notice> : <p className="empty-line">Carregant fitxa…</p>}</div>;
  const index = clients.findIndex(c => c.id === view.id);
  const firstFinca = current.properties.find(h => h.status === "active")?.id ?? current.properties[0]?.id ?? null;
  const propertyId = view.propertyId !== undefined ? view.propertyId : firstFinca;
  const tab: ClientTab = view.tab ?? "client";
  const go = (patch: Partial<{ propertyId: string | null | "new"; tab: ClientTab }>) =>
    setView({ mode: "detail", id: view.id, propertyId, tab, ...patch });
  return (
    <ClientDetail
      full={current.full} properties={current.properties} responsibles={responsibles} canWrite={canWrite} userId={userId}
      position={{ index, total: clients.length }} error={error}
      tab={tab} propertyId={propertyId}
      onTab={t => go({ tab: t })}
      onSelectProperty={id => go({ propertyId: id, tab: id === "new" ? "finca" : tab === "client" || tab === "conjuge" || tab === "matricules" ? "finca" : tab })}
      onPropertySaved={async id => {
        try { setCurrent(await getClient(view.id)); } catch (e) { setError(errorText(e)); }
        void reloadList();
        go({ propertyId: id, tab: "finca" });
      }}
      onEdit={() => setView({ mode: "edit", id: view.id })}
      onToggleStatus={toggleStatus}
      onPrev={() => index > 0 && setView({ mode: "detail", id: clients[index - 1].id, tab })}
      onNext={() => index < clients.length - 1 && setView({ mode: "detail", id: clients[index + 1].id, tab })}
      onBack={() => setView({ mode: "list" })}
    />
  );
}

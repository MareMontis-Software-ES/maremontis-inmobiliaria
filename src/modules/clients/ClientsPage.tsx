// Controla el mòdul de clients: llista → fitxa → alta/modificació.
import { useEffect, useState } from "react";
import { emptyClient, getClient, isClientCodeTaken, listClients, nextClientCode, saveClient, setClientStatus } from "../../data/clients";
import { listResponsibles } from "../../data/lookups";
import { errorText } from "../../lib/supabase";
import { Notice } from "../../components/ui";
import { ClientList } from "./ClientList";
import { ClientDetail } from "./ClientDetail";
import { ClientForm } from "./ClientForm";
import type { ClientFull, ClientSummary, Profile, PropertyLink } from "../../types";

export type ClientView = { mode: "list" } | { mode: "detail"; id: string } | { mode: "new" } | { mode: "edit"; id: string };

interface Props {
  view: ClientView;
  setView: (v: ClientView) => void;
  query: string;
  setQuery: (q: string) => void;
  canWrite: boolean;
  userId?: string;
  onOpenProperty: (id: string) => void;
}

export function ClientsPage({ view, setView, query, setQuery, canWrite, userId, onOpenProperty }: Props) {
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
      const id = await saveClient(full);
      await reloadList();
      setView({ mode: "detail", id });
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
        onOpen={id => setView({ mode: "detail", id })} onOpenProperty={onOpenProperty} onNew={() => setView({ mode: "new" })} />
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
  return (
    <ClientDetail
      full={current.full} properties={current.properties} responsibles={responsibles} canWrite={canWrite} userId={userId}
      position={{ index, total: clients.length }} error={error}
      onEdit={() => setView({ mode: "edit", id: view.id })}
      onToggleStatus={toggleStatus}
      onPrev={() => index > 0 && setView({ mode: "detail", id: clients[index - 1].id })}
      onNext={() => index < clients.length - 1 && setView({ mode: "detail", id: clients[index + 1].id })}
      onBack={() => setView({ mode: "list" })}
      onOpenProperty={onOpenProperty}
    />
  );
}

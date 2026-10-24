// Fitxa de control d'una casa: capçalera amb planificació, i pestanyes
// Revisions · Exterior · Interior · Fotos d'inventari.
// Es fa servir des de «Revisions» (menú) i des de la pestanya Revisions de la fitxa del client.
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, Camera, Check, CheckCheck, ClipboardCheck, Home, Images, Mail, Pencil, Plus, Save, Trash2, Trees, X } from "lucide-react";
import { Empty, Notice, Panel } from "../../components/ui";
import { errorText } from "../../lib/supabase";
import { fmtDate } from "../../lib/format";
import { EQ_LABEL, EXTERIOR, getCase, getEquipment, INTERIOR, listRevisions, mailContext, markRevisionMail, newRevision, plannedDates, readingsText,
  REV_DINSFORA, REV_ESTAT, revisionIssues, saveEquipment, saveRevision, seasonOf, uploadPhoto, listPhotos, deletePhoto, renamePhoto,
  type CaseRow, type EqDef, type Equip, type Photo, type Revision, type RevItem } from "../../data/cases";
import { listIndustrialsFull, type Industrial } from "../../data/admin";
import { profilePick } from "../../data/global";
import { saveIncident } from "../../data/incidents";

type Sub = "revisions" | "exterior" | "interior" | "fotos";

export function CaseView({ propertyId, canWrite, userId, onOpenClient }: { propertyId: string; canWrite: boolean; userId: string; onOpenClient?: (id: string) => void }) {
  const [c, setC] = useState<CaseRow | null>(null);
  const [sub, setSub] = useState<Sub>("revisions");
  const [inds, setInds] = useState<Industrial[]>([]);
  const [error, setError] = useState("");
  const reload = () => getCase(propertyId).then(setC).catch(e => setError(errorText(e)));
  useEffect(() => { setC(null); setError(""); void reload(); }, [propertyId]);
  useEffect(() => { listIndustrialsFull().then(setInds).catch(() => {}); }, []);

  if (!c) return <div className="tab-pad">{error ? <Notice kind="error">{error}</Notice> : <Empty>Carregant…</Empty>}</div>;
  const plan = c.includes_revisions ? plannedDates(c.revisions_start, c.num_revisions) : [];
  const season = seasonOf();

  return (
    <div className="case-view">
      <section className="case-head">
        <div className="case-head-main">
          <strong className="case-title">{c.admin_number} · {c.address}</strong>
          <span>{c.client_id && onOpenClient ? <button className="link-btn light" onClick={() => onOpenClient(c.client_id!)}>{c.client_name}</button> : c.client_name}{c.client_code ? ` · ${c.client_code}` : ""}</span>
        </div>
        <dl>
          <div><dt>Contracte</dt><dd>{c.contract || "—"}</dd></div>
          <div><dt>Zona</dt><dd>{c.zone ?? "—"}</dd></div>
          <div><dt>Revisions/any</dt><dd>{c.num_revisions ?? "—"}</dd></div>
          <div><dt>Última revisió</dt><dd>{c.last_revision_date ? `${fmtDate(c.last_revision_date)} (nº ${c.last_revision_number})` : "Cap"}</dd></div>
          <div><dt>Pròxima</dt><dd className={c.next?.overdue ? "txt-warn" : ""}>{c.next ? fmtDate(c.next.date) + (c.next.overdue ? " · PENDENT" : "") : "—"}</dd></div>
          <div><dt>Comunitat</dt><dd>{[c.community_name, c.community_contact].filter(Boolean).join(" · ") || "—"}</dd></div>
        </dl>
        {c.includes_revisions ? (
          <div className="plan-row"><CalendarDays size={14} /> Previstes temporada {season.start.slice(0, 4)}-{season.end.slice(2, 4)}:
            {plan.map(d => <span key={d} className={"plan-chip" + (c.last_revision_date && d <= c.last_revision_date ? " done" : d < new Date().toISOString().slice(0, 10) ? " late" : "")}>{fmtDate(d).slice(0, 5)}</span>)}
            {!c.revisions_start && <small>(sense data d'inici: es compta des de l'1 d'octubre. Es canvia a la pestanya Finca → Contracte)</small>}
          </div>
        ) : <div className="plan-row"><small>El tipus de contracte d'aquesta finca no inclou revisions.</small></div>}
      </section>

      <div className="record-tabs sub-tabs">
        {([["revisions", "Revisions", ClipboardCheck], ["exterior", "Exterior", Trees], ["interior", "Interior", Home], ["fotos", "Fotos d'inventari", Camera]] as const).map(([k, l, I]) =>
          <button key={k} className={sub === k ? "selected" : ""} onClick={() => setSub(k)}><I size={16} /><span>{l}</span></button>)}
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {sub === "revisions" && <RevisionsTab c={c} canWrite={canWrite} userId={userId} onChanged={reload} />}
      {sub === "exterior" && <EquipmentTab propertyId={c.id} area="exterior" defs={EXTERIOR} inds={inds} canWrite={canWrite} />}
      {sub === "interior" && <EquipmentTab propertyId={c.id} area="interior" defs={INTERIOR} inds={inds} canWrite={canWrite} />}
      {sub === "fotos" && <PhotosPanel propertyId={c.id} revisionId={null} canWrite={canWrite} title="Fotos genèriques d'inventari" />}
    </div>
  );
}

// =====================================================================
// Exterior / Interior
// =====================================================================
function EquipmentTab({ propertyId, area, defs, inds, canWrite }: { propertyId: string; area: "exterior" | "interior"; defs: EqDef[]; inds: Industrial[]; canWrite: boolean }) {
  const [eq, setEq] = useState<Equip | null>(null);
  const [notes, setNotes] = useState("");
  const [orig, setOrig] = useState<{ eq: Equip; notes: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(""); const [ok, setOk] = useState("");
  useEffect(() => { setEq(null); setEditing(false); getEquipment(propertyId, area).then(r => { setEq(r.eq); setNotes(r.notes); setOrig(r); }).catch(e => setError(errorText(e))); }, [propertyId, area]);
  if (!eq) return <div className="tab-pad">{error ? <Notice kind="error">{error}</Notice> : <Empty>Carregant…</Empty>}</div>;
  const set = (item: string, k: string, v: any) => setEq(e => ({ ...e!, [item]: { ...(e![item] || { enabled: false, automatic: false }), [k]: v } }));
  const indOpts = inds.filter(i => i.active);

  return (
    <div className="tab-pad">
      {canWrite && <div className="tab-actions">
        {editing ? <>
          <button className="save-btn" onClick={async () => { try { await saveEquipment(propertyId, area, eq, notes); setEditing(false); setOk("Desat."); setError(""); setOrig({ eq, notes }); } catch (e) { setError(errorText(e)); } }}><Save size={16} /> Gravar</button>
          <button className="cancel-btn" onClick={() => { setEq(orig!.eq); setNotes(orig!.notes); setEditing(false); }}><X size={16} /> Cancel·lar</button>
        </> : <button className="save-btn" onClick={() => { setEditing(true); setOk(""); }}><Pencil size={16} /> Modificar fitxa {area}</button>}
      </div>}
      {error && <Notice kind="error">{error}</Notice>}{ok && <Notice kind="ok">{ok}</Notice>}
      <section className="data-panel">
        <table className="eq-table">
          <tbody>
            {defs.map(d => {
              const v = eq[d.item] || { enabled: false, automatic: false };
              const off = d.fields.includes("enabled") && !v.enabled;
              return (
                <tr key={d.item} className={off ? "eq-off" : ""}>
                  <th>{d.label}</th>
                  <td>
                    <div className="eq-fields">
                      {d.fields.map(f => (
                        <label key={f} className={"eq-f eq-" + f}>
                          <span>{EQ_LABEL[f]}</span>
                          {f === "enabled" || f === "automatic"
                            ? <select value={v[f] ? "S" : "N"} disabled={!editing} onChange={e => set(d.item, f, e.target.value === "S")}><option value="N">N</option><option value="S">S</option></select>
                            : f === "industrial_id"
                              ? <select value={v.industrial_id || ""} disabled={!editing || off} onChange={e => set(d.item, f, e.target.value)}><option value="">—</option>{indOpts.map(i => <option key={i.id} value={i.id}>{i.name}{i.trade ? ` (${i.trade})` : ""}</option>)}</select>
                              : f === "kind" && d.kinds
                                ? <select value={v.kind || ""} disabled={!editing || off} onChange={e => set(d.item, f, e.target.value)}><option value="">—</option>{d.kinds.map(k => <option key={k}>{k}</option>)}{v.kind && !d.kinds.includes(v.kind) && <option>{v.kind}</option>}</select>
                                : <input value={v[f] || ""} readOnly={!editing} disabled={off && editing} onChange={e => set(d.item, f, e.target.value)} />}
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr><th>Observacions</th><td><textarea rows={3} className="eq-notes" value={notes} readOnly={!editing} onChange={e => setNotes(e.target.value)} /></td></tr>
          </tbody>
        </table>
      </section>
      {!indOpts.length && <p className="hint">Per triar industrials, dona'ls d'alta primer al menú Industrials.</p>}
    </div>
  );
}

// =====================================================================
// Revisions
// =====================================================================
function RevisionsTab({ c, canWrite, userId, onChanged }: { c: CaseRow; canWrite: boolean; userId: string; onChanged: () => void }) {
  const [rows, setRows] = useState<Revision[] | null>(null);
  const [cur, setCur] = useState<Revision | null>(null);
  const [editing, setEditing] = useState(false);
  const [people, setPeople] = useState<{ id: string; name: string; email: string }[]>([]);
  const [eqObs, setEqObs] = useState<{ ext: string; int: string }>({ ext: "", int: "" });
  const [meters, setMeters] = useState({ water: "", power: "", gas: "" });
  const [mail, setMail] = useState<null | { to: string; cc: string; subject: string; body: string; who: "responsible" | "owner"; from: string; note?: string }>(null);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const formRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(""); const [ok, setOk] = useState("");

  const load = (keep?: string) => listRevisions(c.id).then(r => { setRows(r); setCur(keep ? r.find(x => x.id === keep) || null : null); }).catch(e => setError(errorText(e)));
  useEffect(() => {
    setCur(null); setEditing(false); void load();
    Promise.all([getEquipment(c.id, "exterior"), getEquipment(c.id, "interior")]).then(([e, i]) => {
      setEqObs({ ext: e.notes, int: i.notes });
      setMeters({ water: e.eq.AIGUA?.meter_ref || "", power: e.eq.LLUM?.meter_ref || "", gas: "" });
    }).catch(() => {});
  }, [c.id]);
  useEffect(() => { profilePick().then(setPeople).catch(() => {}); }, []);

  function start(extra: boolean) {
    const season = seasonOf();
    const inSeason = (rows || []).filter(r => r.revision_date >= season.start && r.revision_date <= season.end && !r.is_extra).length;
    const r = newRevision(c.id, rows?.[0], meters, userId, inSeason);
    r.is_extra = extra;
    if (extra) r.revision_number = String((rows || []).filter(x => x.revision_date >= season.start).length + 1);
    setCur(r); setEditing(true); setOk(""); setError(""); clearPending();
    // al mòbil la llista queda a sobre: es baixa directament al formulari
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
  function clearPending() { setPending(p => { p.forEach(x => URL.revokeObjectURL(x.url)); return []; }); }

  async function save() {
    if (!cur) return;
    let id: string;
    try { id = await saveRevision(cur); }
    catch (e) { setError("No s'ha pogut desar: " + errorText(e)); return; }
    // les fotos fetes abans de gravar una revisió nova es pugen ara que ja té número
    const failed: PendingPhoto[] = [];
    for (const p of pending) {
      try { await uploadPhoto(c.id, id, p.file, p.description); URL.revokeObjectURL(p.url); }
      catch { failed.push(p); }
    }
    setPending(failed);
    setEditing(false);
    if (failed.length) setError(`Revisió desada, però ${failed.length} foto(s) no s'han pogut pujar. Torna-ho a provar des de «Fotos de la revisió».`);
    else setOk(pending.length ? `Revisió desada amb ${pending.length} foto(s).` : "Revisió desada.");
    await load(id); onChanged();
  }

  async function prepareMail(who: "responsible" | "owner") {
    if (!cur?.id) return;
    try {
      const ctx = await mailContext(c.id, c.client_id, c.responsible_id, c.language);
      const issues = revisionIssues(cur);
      const subject = `Revisió casa ${c.address}`;
      if (who === "responsible") {
        // PDF pàg. 16: «DE» = correu del responsable assignat; contingut = només el que està en mal estat + observació
        const body = [`Revisió ${fmtDate(cur.revision_date)} · nº ${cur.revision_number}${cur.is_extra ? " (complementària)" : ""}`, `${c.address} · ${c.client_name}`, "",
          ...readingsText(cur), "", issues.length ? "Elements a revisar / en mal estat:" : "Tot correcte, sense incidències.", ...issues.map(i => "- " + i),
          cur.other_observations ? "\nAltres observacions: " + cur.other_observations : ""].join("\n");
        setMail({ who, from: ctx.responsibleEmail, to: ctx.responsibleEmail, cc: "", subject, body });
      } else {
        // PDF pàg. 18: al propietari, al seu correu i en el seu idioma
        const tpl = issues.length ? ctx.tplIssues : ctx.tplOk;
        const fill = (t: string) => t.replace(/{{finca}}/g, c.address).replace(/{{data}}/g, fmtDate(cur.revision_date)).replace(/{{client}}/g, c.client_name).replace(/{{incidencies}}/g, issues.map(i => "- " + i).join("\n"));
        setMail({ who, from: ctx.responsibleEmail, to: ctx.clientEmails[0] || "", cc: "", subject: tpl ? fill(tpl.subject) : subject,
          body: tpl ? fill(tpl.body) : `Revisió ${fmtDate(cur.revision_date)}\n\n`,
          note: !tpl ? "No hi ha cap text de correu creat (Configuració → Textos de correu)." : ctx.usedLanguage !== (c.language || "en") ? `No hi ha text en l'idioma del client (${c.language || "—"}); s'usa l'anglès.` : undefined });
      }
    } catch (e) { setError(errorText(e)); }
  }

  async function createIncident() {
    if (!cur?.id) return;
    const issues = revisionIssues(cur);
    if (!issues.length) { setError("Aquesta revisió no té elements en mal estat ni marcats per avisar."); return; }
    try {
      await saveIncident({ incident_date: cur.revision_date, reported_by: userId, channel: "revisio", client_id: c.client_id || "", property_id: c.id,
        industrial_id: "", description: `Revisió ${fmtDate(cur.revision_date)} nº ${cur.revision_number}:\n` + issues.map(i => "- " + i).join("\n"),
        requires_management: true, status: "oberta", revision_id: cur.id });
      setOk("Incidència creada. La trobaràs a Incidències (i a la fitxa del client), on pots fer la nota de servei per a l'industrial.");
    } catch (e) { setError(errorText(e)); }
  }

  const setItem = (key: string, patch: Partial<RevItem>) => setCur(r => ({ ...r!, items: r!.items.some(i => i.key === key) ? r!.items.map(i => i.key === key ? { ...i, ...patch } : i) : [...r!.items, { key, notes: "", notify: false, ...patch }] }));
  const item = (key: string): RevItem => cur?.items.find(i => i.key === key) || { key, notes: "", notify: false, state: "" };
  const ro = !editing;
  const allGood = () => setCur(r => ({ ...r!, items: [...REV_DINSFORA, ...REV_ESTAT].map(d => {
    const it = r!.items.find(i => i.key === d.key) || { key: d.key, notes: "", notify: false, state: "" as const };
    return d.kind === "estat" && !it.state ? { ...it, state: "bon" as const } : it;
  }) }));
  const cancel = () => { setEditing(false); clearPending(); setCur(cur?.id ? rows!.find(r => r.id === cur.id)! : null); };

  return (
    <div className="tab-pad">
      {error && <Notice kind="error">{error}</Notice>}{ok && <Notice kind="ok">{ok}</Notice>}
      <div className="rev-layout">
        <Panel title="Revisions ja fetes" icon={ClipboardCheck}
          action={canWrite && !editing && <span className="h3-actions"><button className="add-small" onClick={() => start(false)}><Plus size={13} /> Nova revisió</button><button className="add-small alt" onClick={() => start(true)} title="Fora de la planificació">+ Complementària</button></span>}>
          {!rows ? <Empty>Carregant…</Empty> : !rows.length ? <Empty>Encara no s'ha fet cap revisió.</Empty> : (
            <table className="mini-table">
              <thead><tr><th>Data</th><th>Nº</th><th>Observació</th><th>Correus</th></tr></thead>
              <tbody>{rows.map(r => {
                const n = revisionIssues(r).length;
                return (
                  <tr key={r.id} className={cur?.id === r.id ? "row-sel" : ""} onClick={() => { if (!editing) { setCur(r); setOk(""); } }}>
                    <td>{fmtDate(r.revision_date)}</td><td>{r.revision_number}{r.is_extra ? "*" : ""}</td>
                    <td className="wrap">{n ? <span className="txt-warn">{n} element(s) a revisar</span> : "Tot correcte"}{r.other_observations && <small className="block muted">{r.other_observations.slice(0, 80)}</small>}</td>
                    <td>{r.email_sent_responsible_at ? "R✓" : "R–"} {r.email_sent_owner_at ? "P✓" : "P–"}</td>
                  </tr>);
              })}</tbody>
            </table>
          )}
          <p className="hint">* complementària · R = correu al responsable · P = correu al propietari</p>
        </Panel>

        {cur && (
          <div className="rev-form" ref={formRef}>
            <section className="data-panel">
              <div className="data-panel-title"><ClipboardCheck size={18} /><strong>{cur.id ? `Revisió del ${fmtDate(cur.revision_date)}` : "Nova revisió"}{cur.is_extra ? " (complementària)" : ""}</strong>
                <span className="panel-action h3-actions">
                  {canWrite && !editing && <button className="add-small" onClick={() => setEditing(true)}><Pencil size={13} /> Modificar</button>}
                  {editing && <><button className="add-small" onClick={save}><Save size={13} /> Gravar</button><button className="add-small alt" onClick={cancel}><X size={13} /> Cancel·lar</button></>}
                </span>
              </div>
              <div className="data-panel-body">
                <div className="rev-head">
                  <label>Data revisió <input type="date" value={cur.revision_date} readOnly={ro} onChange={e => setCur({ ...cur, revision_date: e.target.value })} /></label>
                  <label>Nº revisió <input type="number" value={cur.revision_number} readOnly={ro} onChange={e => setCur({ ...cur, revision_number: e.target.value })} /></label>
                  <label>Responsable <select value={cur.responsible_id} disabled={ro} onChange={e => setCur({ ...cur, responsible_id: e.target.value })}><option value="">—</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                  <label>Idioma propietari <input value={c.language || "—"} readOnly /></label>
                </div>
                {(eqObs.ext || eqObs.int) && <div className="obs-box small"><strong>Observacions de les fitxes:</strong>{eqObs.ext && <div>Exterior: {eqObs.ext}</div>}{eqObs.int && <div>Interior: {eqObs.int}</div>}</div>}

                <table className="rev-table">
                  <thead><tr><th></th><th>OFF/ON</th><th>Lectura anterior</th><th>Lectura actual</th><th>Núm. comptador</th></tr></thead>
                  <tbody>
                    {(["water", "power", "gas"] as const).map(k => {
                      const L = { water: "Aigua", power: "Llum", gas: "Gas" }[k];
                      const prev = cur.id ? (rows || []).find(r => r.revision_date < cur.revision_date || (r.revision_date === cur.revision_date && r.id !== cur.id && Number(r.revision_number) < Number(cur.revision_number)))?.[`${k}_reading`] : cur[`${k}_prev`];
                      return (
                        <tr key={k} className="rev-reading"><th>{L}</th>
                          <td className="rev-onoff"><Toggle on={cur[`${k}_on`]} disabled={ro} onChange={v => setCur({ ...cur, [`${k}_on`]: v })} /></td>
                          <td className="muted" data-l="Anterior">{prev || "—"}</td>
                          <td data-l="Lectura actual"><input inputMode="decimal" value={cur[`${k}_reading`]} readOnly={ro} onChange={e => setCur({ ...cur, [`${k}_reading`]: e.target.value })} /></td>
                          <td data-l="Núm. comptador"><input value={cur[`${k}_meter`]} readOnly={ro} onChange={e => setCur({ ...cur, [`${k}_meter`]: e.target.value })} /></td>
                        </tr>);
                    })}
                    <tr className="rev-reading"><th>Data lectura</th><td colSpan={4}><input type="date" value={cur.reading_date} readOnly={ro} onChange={e => setCur({ ...cur, reading_date: e.target.value })} /> <small className="muted">(per a totes)</small></td></tr>
                  </tbody>
                </table>

                <table className="rev-table">
                  <thead><tr><th></th><th>OFF/ON</th><th colSpan={2}>Observacions</th><th>Avisar</th></tr></thead>
                  <tbody>
                    {([["alarm", "Alarma"], ["heating", "Calefacció / A.C."]] as const).map(([k, L]) => (
                      <tr key={k} className={"rev-item" + (cur[`${k}_notify`] ? " rev-bad" : "")}><th>{L}</th><td className="rev-onoff"><Toggle on={cur[`${k}_on`]} disabled={ro} onChange={v => setCur({ ...cur, [`${k}_on`]: v })} /></td>
                        <td colSpan={2} className="rev-notes"><input placeholder="Observacions" value={cur[`${k}_notes`]} readOnly={ro} onChange={e => setCur({ ...cur, [`${k}_notes`]: e.target.value })} /></td>
                        <td className="rev-notify"><Chip label="Avisar" tone="warn" on={cur[`${k}_notify`]} disabled={ro} onChange={v => setCur({ ...cur, [`${k}_notify`]: v })} /></td></tr>))}
                  </tbody>
                </table>

                <table className="rev-table">
                  <thead><tr><th></th><th>Dins</th><th>Fora</th><th>Observacions</th><th>Avisar</th></tr></thead>
                  <tbody>{REV_DINSFORA.map(d => { const it = item(d.key); return (
                    <tr key={d.key} className={"rev-item" + (it.dins || it.fora ? " rev-bad" : "")}><th>{d.label}</th>
                      <td className="rev-opt"><Chip label="Dins" tone="bad" on={!!it.dins} disabled={ro} onChange={v => setItem(d.key, { dins: v })} /></td>
                      <td className="rev-opt"><Chip label="Fora" tone="bad" on={!!it.fora} disabled={ro} onChange={v => setItem(d.key, { fora: v })} /></td>
                      <td className="rev-notes"><input placeholder="Observacions" value={it.notes} readOnly={ro} onChange={e => setItem(d.key, { notes: e.target.value })} /></td>
                      <td className="rev-notify"><Chip label="Avisar" tone="warn" on={it.notify} disabled={ro} onChange={v => setItem(d.key, { notify: v })} /></td></tr>); })}</tbody>
                </table>

                {editing && <div className="rev-allgood"><button type="button" className="outline-btn" onClick={allGood}><CheckCheck size={16} /> Marcar com a «Bon» tot el que falta</button></div>}
                <table className="rev-table">
                  <thead><tr><th></th><th>Bon</th><th>Mal</th><th>Observacions</th><th>Avisar</th></tr></thead>
                  <tbody>{REV_ESTAT.map(d => { const it = item(d.key); return (
                    <tr key={d.key} className={"rev-item" + (it.state === "mal" ? " rev-bad" : "")}><th>{d.label}</th>
                      <td className="rev-opt"><Chip label="Bon" tone="good" on={it.state === "bon"} disabled={ro} onChange={v => setItem(d.key, { state: v ? "bon" : "" })} /></td>
                      <td className="rev-opt"><Chip label="Mal" tone="bad" on={it.state === "mal"} disabled={ro} onChange={v => setItem(d.key, { state: v ? "mal" : "" })} /></td>
                      <td className="rev-obs rev-notes">
                        {d.extra === "encarregar" && <Chip label="Encarregar" tone="warn" on={!!it.extra} disabled={ro} onChange={v => setItem(d.key, { extra: v })} />}
                        {d.extra === "falta_sal" && <Chip label="Falta sal" tone="warn" on={!!it.extra} disabled={ro} onChange={v => setItem(d.key, { extra: v })} />}
                        {d.extra === "caducitat" && <label className="chk-inline">Caducitat <input type="month" value={typeof it.extra === "string" ? it.extra : ""} readOnly={ro} onChange={e => setItem(d.key, { extra: e.target.value })} /></label>}
                        <input placeholder="Observacions" value={it.notes} readOnly={ro} onChange={e => setItem(d.key, { notes: e.target.value })} />
                      </td>
                      <td className="rev-notify"><Chip label="Avisar" tone="warn" on={it.notify} disabled={ro} onChange={v => setItem(d.key, { notify: v })} /></td></tr>); })}</tbody>
                </table>
                <label className="f f-wide"><span>Altres observacions</span><textarea rows={3} value={cur.other_observations} readOnly={ro} onChange={e => setCur({ ...cur, other_observations: e.target.value })} /></label>
                {editing && !cur.id && <PendingPhotos items={pending} onChange={setPending} />}
              </div>
              {editing && <div className="rev-savebar">
                <button className="save-btn" onClick={save}><Save size={18} /> Gravar{pending.length ? ` (+${pending.length} foto${pending.length > 1 ? "s" : ""})` : " revisió"}</button>
                <button className="cancel-btn" onClick={cancel}><X size={18} /> Cancel·lar</button>
              </div>}
            </section>
            {cur.id && editing && <PhotosPanel propertyId={c.id} revisionId={cur.id} canWrite={canWrite} title="Fotos de la revisió" />}

            {cur.id && !editing && (
              <>
                <Panel title="Comunicar la revisió" icon={Mail}>
                  <div className="note-actions">
                    <button className="outline-btn" onClick={() => prepareMail("responsible")}><Mail size={15} /> Correu als responsables {cur.email_sent_responsible_at && <Check size={14} />}</button>
                    <button className="outline-btn" onClick={() => prepareMail("owner")}><Mail size={15} /> Correu al propietari (en el seu idioma) {cur.email_sent_owner_at && <Check size={14} />}</button>
                    {canWrite && <button className="outline-btn" onClick={createIncident}><AlertTriangle size={15} /> Crear incidència amb el que cal avisar</button>}
                  </div>
                  {mail && (
                    <div className="mail-box">
                      {mail.note && <Notice>{mail.note}</Notice>}
                      <div className="form-grid">
                        <label className="f"><span>De</span><input value={mail.from || "(el responsable no té e-mail)"} readOnly /></label>
                        <label className="f"><span>Destinataris (separats per comes)</span><input value={mail.to} onChange={e => setMail({ ...mail, to: e.target.value })} /></label>
                        <label className="f"><span>CC</span><input value={mail.cc} onChange={e => setMail({ ...mail, cc: e.target.value })} /></label>
                        <label className="f"><span>Assumpte</span><input value={mail.subject} onChange={e => setMail({ ...mail, subject: e.target.value })} /></label>
                        <label className="f f-wide"><span>Text</span><textarea rows={10} value={mail.body} onChange={e => setMail({ ...mail, body: e.target.value })} /></label>
                      </div>
                      <div className="tab-actions inline">
                        <a className="save-btn" href={`mailto:${encodeURIComponent(mail.to).replace(/%2C/g, ",").replace(/%40/g, "@")}?${mail.cc ? `cc=${encodeURIComponent(mail.cc)}&` : ""}subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`}
                          onClick={() => setTimeout(async () => { if (window.confirm("S'ha obert el correu. Marcar-lo com a ENVIAT?")) { await markRevisionMail(cur.id!, mail.who); setMail(null); await load(cur.id); } }, 700)}>
                          <Mail size={16} /> Obrir al programa de correu</a>
                        <button className="cancel-btn" onClick={() => setMail(null)}><X size={16} /> Tancar</button>
                      </div>
                      <p className="hint">Les fotos s'han d'adjuntar des del programa de correu (descarrega-les a «Fotos de la revisió»).</p>
                    </div>
                  )}
                </Panel>
                <PhotosPanel propertyId={c.id} revisionId={cur.id} canWrite={canWrite} title="Fotos de la revisió" />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ on, label, onChange, disabled, tone }: { on: boolean; label: string; onChange: (v: boolean) => void; disabled?: boolean; tone?: "good" | "bad" | "warn" }) {
  return <button type="button" className={"chip-btn" + (tone ? " " + tone : "") + (on ? " on" : "")} aria-pressed={on} disabled={disabled} onClick={() => onChange(!on)}>{label}</button>;
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return <button type="button" className={"toggle" + (on ? " on" : "")} disabled={disabled} onClick={() => onChange(!on)}><span />{on ? "ON" : "OFF"}</button>;
}

// =====================================================================
// Fotos amb nom descriptiu
// =====================================================================
function PhotosPanel({ propertyId, revisionId, canWrite, title }: { propertyId: string; revisionId: string | null; canWrite: boolean; title: string }) {
  const [rows, setRows] = useState<Photo[] | null>(null);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = () => listPhotos(propertyId, revisionId).then(setRows).catch(e => { setRows([]); setError(errorText(e)); });
  useEffect(() => { void load(); }, [propertyId, revisionId]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError("");
    try { for (const f of Array.from(files)) await uploadPhoto(propertyId, revisionId, f, desc.trim() || f.name.replace(/\.[^.]+$/, "")); setDesc(""); await load(); }
    catch (e) { setError("No s'ha pogut pujar: " + errorText(e)); }
    finally { setBusy(false); }
  }

  return (
    <Panel title={title} icon={Camera}>
      {error && <Notice kind="error">{error}</Notice>}
      {canWrite && <PhotoPicker desc={desc} setDesc={setDesc} busy={busy} onFiles={upload} />}
      {!rows ? <Empty>Carregant…</Empty> : !rows.length ? <Empty>Encara no hi ha fotos.{revisionId ? " Se n'aconsella almenys una per revisió." : ""}</Empty> : (
        <div className="photo-grid">
          {rows.map(p => (
            <figure key={p.id}>
              <a href={p.url} target="_blank" rel="noreferrer" download={p.description}>{p.url ? <img src={p.url} alt={p.description} /> : <div className="ph-missing">?</div>}</a>
              <figcaption>
                {canWrite ? <input defaultValue={p.description} onBlur={e => e.target.value !== p.description && renamePhoto(p.id, e.target.value).then(load)} /> : p.description}
                {canWrite && <button className="icon-del" title="Esborrar" onClick={() => window.confirm("Esborrar la foto?") && deletePhoto(p).then(load).catch(e => setError(errorText(e)))}><Trash2 size={13} /></button>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </Panel>
  );
}

/** Nom descriptiu + «Fer foto» (obre la càmera del mòbil o la tauleta) + «Galeria» (fotos ja fetes, vàries alhora) */
function PhotoPicker({ desc, setDesc, busy, onFiles }: { desc: string; setDesc: (v: string) => void; busy?: boolean; onFiles: (f: FileList | null) => void }) {
  const cam = useRef<HTMLInputElement>(null), gal = useRef<HTMLInputElement>(null);
  const pick = (el: HTMLInputElement) => { onFiles(el.files); el.value = ""; };
  return (
    <div className="photo-add">
      <input placeholder="Nom descriptiu (p. ex. «Humitat paret dormitori»)" value={desc} onChange={e => setDesc(e.target.value)} />
      <div className="photo-btns">
        <button type="button" className="save-btn" disabled={busy} onClick={() => cam.current?.click()}><Camera size={18} /> {busy ? "Pujant…" : "Fer foto"}</button>
        <button type="button" className="cancel-btn" disabled={busy} onClick={() => gal.current?.click()}><Images size={18} /> Galeria</button>
      </div>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={e => pick(e.target)} />
      <input ref={gal} type="file" accept="image/*" multiple hidden onChange={e => pick(e.target)} />
    </div>
  );
}

// Fotos fetes durant una revisió nova (encara sense gravar): es guarden al dispositiu i es pugen en gravar
interface PendingPhoto { file: File; url: string; description: string }

function PendingPhotos({ items, onChange }: { items: PendingPhoto[]; onChange: (v: PendingPhoto[]) => void }) {
  const [desc, setDesc] = useState("");
  const add = (files: FileList | null) => {
    if (!files?.length) return;
    onChange([...items, ...Array.from(files).map(f => ({ file: f, url: URL.createObjectURL(f), description: desc.trim() || f.name.replace(/\.[^.]+$/, "") }))]);
    setDesc("");
  };
  return (
    <div className="pending-photos">
      <strong><Camera size={15} /> Fotos de la revisió</strong>
      <PhotoPicker desc={desc} setDesc={setDesc} onFiles={add} />
      {items.length ? (
        <div className="photo-grid">
          {items.map((p, i) => (
            <figure key={p.url}>
              <img src={p.url} alt={p.description} />
              <figcaption>
                <input value={p.description} onChange={e => onChange(items.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                <button className="icon-del" title="Treure" onClick={() => { URL.revokeObjectURL(p.url); onChange(items.filter((_, j) => j !== i)); }}><Trash2 size={13} /></button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : <p className="hint">Les fotos es pujaran en gravar la revisió.</p>}
    </div>
  );
}

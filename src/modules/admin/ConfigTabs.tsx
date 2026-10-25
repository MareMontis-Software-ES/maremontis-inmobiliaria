// Configuració: canvi d'any, permisos per rol, idiomes i còpies de seguretat (taules admi_*).
import { useEffect, useState } from "react";
import { CalendarDays, Check, Database, Download, Languages, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { CheckInput, Empty, Notice, Panel, SelectInput, TextInput } from "../../components/ui";
import { errorText } from "../../lib/supabase";
import { downloadText } from "../../data/global";
import { backupFileName, buildBackupSheets } from "../../data/backup";
import { downloadXlsx } from "../../lib/xlsx";
import {
  backupContent, changeWorkingYear, deleteLanguage, getBackupSchedule, getWorkingYear, listBackups, listLanguages, listPermissions,
  MENU_SECTIONS, PERM_ROLES, runBackup, saveBackupSchedule, saveLanguage, savePermissions,
  type BackupRow, type BackupSchedule, type Language, type Perm, type Perms,
} from "../../data/settings";
import type { Role } from "../../types";

const dateTime = (iso: string) => new Date(iso).toLocaleString("ca-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

// ---------------------------------------------------------------------
// Canvi d'any
// ---------------------------------------------------------------------
export function YearTab({ isAdmin }: { isAdmin: boolean }) {
  const [year, setYear] = useState<number | null>(null);
  const [copy, setCopy] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [ok, setOk] = useState("");
  useEffect(() => { getWorkingYear().then(setYear).catch(e => setError(errorText(e))); }, []);

  async function go(to: number) {
    if (!window.confirm(`Passar l'any de treball a ${to}?` + (copy ? `\n\nEs crearan els impostos de ${to} de totes les finques actives, copiant les dades de l'any anterior (sense marcar com a pagats).` : ""))) return;
    setBusy(true); setError(""); setOk("");
    try { const n = await changeWorkingYear(to, copy); setYear(to); setOk(`Any de treball: ${to}.` + (copy ? ` S'han creat els impostos de ${n} finques.` : "")); }
    catch (e) { setError(errorText(e)); }
    setBusy(false);
  }

  return (
    <Panel title="Canvi d'any" icon={CalendarDays}>
      {error && <Notice kind="error">{error}</Notice>}{ok && <Notice kind="ok">{ok}</Notice>}
      <p className="year-big">Any de treball actual: <strong>{year ?? "…"}</strong></p>
      <p className="hint">És l'any que es mostra a la pestanya Impostos de cada finca i el que surt per defecte al menú Impostos (Model 210).</p>
      {isAdmin && year && <>
        <CheckInput label="Crear els impostos del nou any copiant l'any anterior (valor cadastral, tipus, dades registrals…)" checked={copy} onChange={setCopy} />
        <div className="tab-actions inline">
          <button className="save-btn" disabled={busy} onClick={() => go(year + 1)}><CalendarDays size={16} /> {busy ? "Treballant…" : `Passar a l'any ${year + 1}`}</button>
          <button className="cancel-btn" disabled={busy} onClick={() => { setCopy(false); void go(year - 1); }}>Tornar a {year - 1}</button>
        </div>
      </>}
    </Panel>
  );
}

// ---------------------------------------------------------------------
// Permisos per rol i apartat del menú
// ---------------------------------------------------------------------
const PERM_COLS: [keyof Perm, string][] = [["view", "Veure"], ["create", "Crear"], ["edit", "Modificar"], ["delete", "Esborrar"]];

export function PermissionsTab({ isAdmin }: { isAdmin: boolean }) {
  const [all, setAll] = useState<Record<Role, Perms> | null>(null);
  const [role, setRole] = useState<Role>("oficina");
  const [error, setError] = useState(""); const [ok, setOk] = useState("");
  useEffect(() => { listPermissions().then(setAll).catch(e => setError(errorText(e))); }, []);
  if (!all) return <Panel title="Permisos" icon={ShieldCheck}>{error ? <Notice kind="error">{error}</Notice> : <Empty>Carregant…</Empty>}</Panel>;
  const fixed = role === "admin" || !isAdmin;

  function toggle(sec: typeof MENU_SECTIONS[number], k: keyof Perm, v: boolean) {
    setOk("");
    setAll(a => {
      const p = { ...a![role][sec], [k]: v };
      if (k === "view" && !v) { p.create = p.edit = p.delete = false; }   // sense veure, no pot fer res més
      if (k !== "view" && v) p.view = true;
      return { ...a!, [role]: { ...a![role], [sec]: p } };
    });
  }

  return (
    <Panel title="Què pot fer cada usuari segons el seu rol" icon={ShieldCheck}>
      {error && <Notice kind="error">{error}</Notice>}{ok && <Notice kind="ok">{ok}</Notice>}
      <div className="role-switch">
        {PERM_ROLES.map(([r, l]) => <button key={r} className={"year-chip" + (role === r ? " on" : "")} onClick={() => setRole(r)}>{l}</button>)}
      </div>
      <table className="mini-table perm-table">
        <thead><tr><th>Apartat del menú</th>{PERM_COLS.map(([k, l]) => <th key={k}>{l}</th>)}</tr></thead>
        <tbody>{MENU_SECTIONS.map(sec => (
          <tr key={sec} className="no-hover"><td><strong>{sec}</strong></td>
            {PERM_COLS.map(([k]) => <td key={k}><input type="checkbox" aria-label={`${sec}: ${k}`} checked={all[role][sec][k]} disabled={fixed} onChange={e => toggle(sec, k, e.target.checked)} /></td>)}
          </tr>))}
        </tbody>
      </table>
      {role === "admin" && <p className="hint">L'administrador sempre ho pot fer tot (així ningú es queda sense poder entrar a la configuració).</p>}
      {isAdmin && role !== "admin" && <div className="tab-actions inline">
        <button className="save-btn" onClick={async () => { try { await savePermissions(all); setOk("Permisos desats. Cada usuari els veurà en tornar a entrar."); setError(""); } catch (e) { setError(errorText(e)); } }}><Save size={16} /> Guardar permisos</button>
      </div>}
      <p className="hint">Si un apartat no es pot «Veure», desapareix del menú. A quin rol pertany cada usuari es tria a la pestanya «Usuaris».</p>
    </Panel>
  );
}

// ---------------------------------------------------------------------
// Idiomes
// ---------------------------------------------------------------------
export function LanguagesTab({ isAdmin }: { isAdmin: boolean }) {
  const [rows, setRows] = useState<Language[]>([]);
  const [nw, setNw] = useState({ code: "", name: "" });
  const [error, setError] = useState(""); const [ok, setOk] = useState("");
  const load = () => listLanguages().then(setRows).catch(e => setError(errorText(e)));
  useEffect(() => { void load(); }, []);
  const run = (fn: () => Promise<string | null | void>) => fn().then(why => { if (why) { setError(why); setOk(""); } else { setError(""); return load(); } }).catch(e => setError(errorText(e)));

  return (
    <Panel title="Idiomes" icon={Languages}>
      {error && <Notice kind="error">{error}</Notice>}{ok && <Notice kind="ok">{ok}</Notice>}
      <p className="hint">Idiomes que es poden triar per a cada client (decideix en quin idioma rep els correus) i per als textos de correu.</p>
      <table className="mini-table">
        <thead><tr><th>Codi</th><th>Idioma</th><th>Actiu</th><th></th></tr></thead>
        <tbody>
          {rows.map((l, i) => (
            <tr key={l.code} className={"no-hover" + (!l.active ? " row-off" : "")}><td>{l.code}</td>
              <td><input className="cell-input" value={l.name} disabled={!isAdmin} onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></td>
              <td><input type="checkbox" checked={l.active} disabled={!isAdmin} onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, active: e.target.checked } : x))} /></td>
              <td>{isAdmin && <span className="cell-actions">
                <button className="outline-btn small" onClick={() => run(() => saveLanguage(l, false))}><Check size={13} /> Desar</button>
                <button className="icon-del" title="Treure" onClick={() => window.confirm(`Treure l'idioma «${l.name}»?`) && run(() => deleteLanguage(l.code))}><Trash2 size={14} /></button>
              </span>}</td></tr>))}
          {isAdmin && <tr className="no-hover">
            <td><input className="cell-input" placeholder="ex. ru" maxLength={5} value={nw.code} onChange={e => setNw({ ...nw, code: e.target.value })} /></td>
            <td><input className="cell-input" placeholder="ex. Rus" value={nw.name} onChange={e => setNw({ ...nw, name: e.target.value })} /></td>
            <td></td>
            <td><button className="add-small" disabled={!nw.code.trim() || !nw.name.trim()} onClick={() => run(async () => { await saveLanguage({ ...nw, active: true, sort_order: rows.length + 1 }, true); setNw({ code: "", name: "" }); })}><Plus size={13} /> Afegir</button></td>
          </tr>}
        </tbody>
      </table>
      {!rows.length && <p className="hint">Encara no hi ha la taula d'idiomes a la base de dades: es fan servir els idiomes per defecte.</p>}
    </Panel>
  );
}

// ---------------------------------------------------------------------
// Còpies de seguretat
// ---------------------------------------------------------------------
const WEEKDAYS: [string, string][] = [["1", "Dilluns"], ["2", "Dimarts"], ["3", "Dimecres"], ["4", "Dijous"], ["5", "Divendres"], ["6", "Dissabte"], ["0", "Diumenge"]];

export function BackupsTab({ isAdmin }: { isAdmin: boolean }) {
  const [sched, setSched] = useState<BackupSchedule | null>(null);
  const [rows, setRows] = useState<BackupRow[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(""); const [ok, setOk] = useState("");
  const load = () => listBackups().then(setRows).catch(e => { setRows([]); setError(errorText(e)); });
  useEffect(() => { if (!isAdmin) return; getBackupSchedule().then(setSched).catch(() => {}); void load(); }, [isAdmin]);

  if (!isAdmin) return <Panel title="Còpies de seguretat" icon={Database}><p className="hint">Només els administradors poden gestionar les còpies de seguretat.</p></Panel>;

  async function download(id: string) {
    setError("");
    try {
      const b = await backupContent(id);
      downloadText(`copia_maremontis_${b.created_at.slice(0, 16).replace(/[-:T]/g, "")}.sql`, b.sql, "application/sql");
    } catch (e) { setError(errorText(e)); }
  }
  async function manual() {
    setBusy("sql"); setError(""); setOk("");
    try { const id = await runBackup(); await load(); await download(id); setOk("Còpia feta i descarregada al teu ordinador."); }
    catch (e) { setError(errorText(e)); }
    setBusy("");
  }
  async function excel() {
    setBusy("xlsx"); setError(""); setOk("");
    try { const { sheets } = await buildBackupSheets(() => {}); const name = backupFileName(); downloadXlsx(name, sheets); setOk(`Descarregat «${name}».`); }
    catch (e) { setError(errorText(e)); }
    setBusy("");
  }

  return (
    <div className="column-stack">
      {error && <Notice kind="error">{error}</Notice>}{ok && <Notice kind="ok">{ok}</Notice>}
      <Panel title="Còpia automàtica" icon={CalendarDays}>
        {!sched ? <Empty>Carregant…</Empty> : <>
          <div className="form-grid four">
            <CheckInput label="Fer còpies automàtiques" checked={sched.enabled} onChange={v => setSched({ ...sched, enabled: v })} />
            <SelectInput label="Cada" value={sched.frequency} onChange={v => setSched({ ...sched, frequency: v as BackupSchedule["frequency"] })} options={[["daily", "Cada dia"], ["weekly", "Cada setmana"]]} />
            {sched.frequency === "weekly" && <SelectInput label="Dia" value={String(sched.weekday)} onChange={v => setSched({ ...sched, weekday: Number(v) })} options={WEEKDAYS} />}
            <TextInput label="Hora" type="time" value={sched.hour} onChange={v => setSched({ ...sched, hour: v })} />
          </div>
          <div className="tab-actions inline">
            <button className="save-btn" onClick={async () => { try { await saveBackupSchedule(sched); setOk("Programació desada."); setError(""); } catch (e) { setError(errorText(e)); } }}><Save size={16} /> Guardar programació</button>
          </div>
          <p className="hint">La còpia la fa el servidor encara que ningú tingui el programa obert. Es guarden les últimes 30 còpies automàtiques.</p>
        </>}
      </Panel>
      <Panel title="Còpia manual" icon={Download}>
        <p className="hint">Fa una còpia ara mateix i la descarrega a l'ordinador en format SQL (es pot recuperar enganxant-la a l'SQL Editor de Supabase). També pots descarregar-la en Excel per consultar-la.</p>
        <div className="tab-actions inline">
          <button className="save-btn" disabled={!!busy} onClick={manual}><Database size={16} /> {busy === "sql" ? "Fent la còpia…" : "Fer còpia ara (.sql)"}</button>
          <button className="cancel-btn" disabled={!!busy} onClick={excel}><Download size={16} /> {busy === "xlsx" ? "Generant…" : "Descarregar en Excel"}</button>
        </div>
      </Panel>
      <Panel title="Còpies fetes" icon={Database}>
        {!rows ? <Empty>Carregant…</Empty> : !rows.length ? <Empty>Encara no s'ha fet cap còpia.</Empty> : (
          <table className="mini-table">
            <thead><tr><th>Data i hora</th><th>Tipus</th><th>Feta per</th><th>Files</th><th>Mida</th><th></th></tr></thead>
            <tbody>{rows.map(b => (
              <tr key={b.id} className="no-hover"><td><strong>{dateTime(b.created_at)}</strong></td><td>{b.kind === "auto" ? "Automàtica" : "Manual"}</td><td>{b.created_by || (b.kind === "auto" ? "Servidor" : "—")}</td>
                <td>{b.rows?.toLocaleString("ca-ES")}</td><td>{(b.size_bytes / 1024 / 1024).toLocaleString("ca-ES", { maximumFractionDigits: 1 })} MB</td>
                <td><button className="outline-btn small" onClick={() => download(b.id)}><Download size={13} /> Descarregar</button></td></tr>))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

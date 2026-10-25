// Estadístiques i llistats a mida. L'usuari tria:
//  1. sobre què (clients o immobles),
//  2. quins (actius / baixes / tots + filtres per qualsevol camp),
//  3. per a una estadística: per quin camp s'agrupa (i opcionalment un segon camp → taula creuada)
//     i què es compta (nombre, suma o mitjana d'un camp numèric);
//     per a un llistat: quines columnes i l'ordre.
// El resultat es pot descarregar en Excel i en PDF. Les configuracions es poden desar
// en aquest ordinador. Només lectura: aquesta pantalla no modifica cap dada.
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Filter as FilterIcon, ListChecks, Plus, Save, Table2, Trash2, X } from "lucide-react";
import { Notice, Panel } from "../../components/ui";
import { ExportButtons, type ExportTable } from "../../components/ExportButtons";
import { errorText } from "../../lib/supabase";
import { EMPTY, FIELDS, groupKey, loadSource, showValue, taxYearsOf, type Ctx, type DateGroup, type Field, type Source, type Value } from "../../data/reports";
import { getWorkingYear } from "../../data/settings";

type Row = Record<string, any>;
type Op = "conte" | "igual" | "desde" | "fins" | "buit" | "noBuit" | "si" | "no";
interface Filter { field: string; op: Op; value: string }
interface Config {
  source: Source;
  mode: "estadistica" | "llistat";
  status: "active" | "baixa" | "";
  filters: Filter[];
  group1: string;
  group2: string;
  dateGroup: DateGroup;
  measure: "count" | "sum" | "avg";
  measureField: string;
  order: "valor" | "nom";
  columns: string[];
  sortBy: string;
  sortDesc: boolean;
}

const DEFAULT_COLUMNS: Record<Source, string[]> = {
  clients: ["client_code", "full_name", "municipality", "country", "phone", "email"],
  properties: ["admin_number", "full_address", "municipality", "zone", "owner_name", "contract"],
};
const blank = (source: Source): Config => ({
  source, mode: "estadistica", status: "active", filters: [],
  group1: source === "clients" ? "country" : "municipality", group2: "", dateGroup: "any",
  measure: "count", measureField: "", order: "valor",
  columns: DEFAULT_COLUMNS[source], sortBy: source === "clients" ? "last_name" : "admin_number", sortDesc: false,
});

const OPS: Record<string, [Op, string][]> = {
  text: [["conte", "conté"], ["igual", "és igual a"], ["buit", "està buit"], ["noBuit", "no està buit"]],
  number: [["igual", "és igual a"], ["desde", "des de"], ["fins", "fins a"], ["buit", "està buit"], ["noBuit", "no està buit"]],
  date: [["desde", "des del"], ["fins", "fins al"], ["igual", "és el dia"], ["buit", "està buit"], ["noBuit", "no està buit"]],
  bool: [["si", "és Sí"], ["no", "és No"]],
};
const opsFor = (f?: Field) => OPS[f?.type === "money" ? "number" : f?.type || "text"];
const NOUN: Record<Source, [string, string]> = { clients: ["client", "clients"], properties: ["immoble", "immobles"] };
const COUNT_LABEL: Record<Source, string> = { clients: "Nombre de clients", properties: "Nombre d'immobles" };
/** «Quota renda (Model 210)» → «quota renda (Model 210)» */
const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const STATUS_LABEL: Record<string, string> = { active: "Actius", baixa: "Donats de baixa", "": "Tots" };
const MAX_COLS = 15;
const SHOW_ROWS = 300;
const SAVED_KEY = "maremontis.estadistiques";

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const fmtNum = (v: number, money: boolean) => money
  ? v.toLocaleString("ca-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
  : v.toLocaleString("ca-ES", { maximumFractionDigits: 2 });
const pct = (part: number, total: number) => (total ? `${(Math.round((part / total) * 1000) / 10).toLocaleString("ca-ES")}%` : "");

function test(f: Field, flt: Filter, v: Value): boolean {
  const isEmpty = v === null || v === undefined || v === "";
  if (flt.op === "buit") return isEmpty;
  if (flt.op === "noBuit") return !isEmpty;
  if (flt.op === "si") return v === true;
  if (flt.op === "no") return v === false;
  if (!flt.value.trim()) return true;               // filtre a mig escriure: no filtra
  if (isEmpty) return false;
  if (f.type === "number" || f.type === "money") {
    const a = Number(v), b = Number(flt.value.replace(",", "."));
    if (Number.isNaN(b)) return true;
    return flt.op === "desde" ? a >= b : flt.op === "fins" ? a <= b : a === b;
  }
  if (f.type === "date") {
    const a = String(v).slice(0, 10), b = flt.value;
    return flt.op === "desde" ? a >= b : flt.op === "fins" ? a <= b : a === b;
  }
  const a = norm(String(v)), b = norm(flt.value);
  return flt.op === "igual" ? a === b : a.includes(b);
}

function loadSaved(): { name: string; config: Config }[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
}
function storeSaved(list: { name: string; config: Config }[]) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch { /* sense emmagatzematge: no es desa */ }
}

/** Desplegable de camps agrupats per apartat. */
function FieldSelect({ fields, value, onChange, empty, only }: {
  fields: Field[]; value: string; onChange: (v: string) => void; empty?: string; only?: (f: Field) => boolean;
}) {
  const list = only ? fields.filter(only) : fields;
  const groups = [...new Set(list.map(f => f.group))];
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      {empty !== undefined && <option value="">{empty}</option>}
      {groups.map(g => <optgroup key={g} label={g}>{list.filter(f => f.group === g).map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</optgroup>)}
    </select>
  );
}

interface StatResult {
  title: string;
  head: string[];
  rows: (string | number)[][];
  bars?: number[];
  foot: (string | number)[];
  cross: boolean;
}

export function StatsPage() {
  const [cfg, setCfg] = useState<Config>(() => blank("properties"));
  const [data, setData] = useState<Partial<Record<Source, Row[]>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [taxYear, setTaxYear] = useState(new Date().getFullYear() - 1);
  const [saved, setSaved] = useState(loadSaved);
  const set = (p: Partial<Config>) => setCfg(c => ({ ...c, ...p }));

  useEffect(() => { getWorkingYear().then(setTaxYear).catch(() => {}); }, []);
  useEffect(() => {
    if (data[cfg.source]) return;
    setLoading(true); setError("");
    loadSource(cfg.source).then(rows => setData(d => ({ ...d, [cfg.source]: rows })))
      .catch(e => setError(errorText(e))).finally(() => setLoading(false));
  }, [cfg.source]);

  const fields = FIELDS[cfg.source];
  const byKey = useMemo(() => new Map(fields.map(f => [f.key, f])), [fields]);
  const all = data[cfg.source];
  const ctx: Ctx = { taxYear };
  const usesTax = cfg.source === "properties" && [cfg.group1, cfg.group2, cfg.measureField, cfg.sortBy, ...cfg.columns, ...cfg.filters.map(f => f.field)].some(k => k.startsWith("tax_"));
  const taxYears = useMemo(() => [...new Set([taxYear, ...taxYearsOf(data.properties || [])])].sort((a, b) => b - a), [data.properties, taxYear]);

  // Files que compleixen l'estat i tots els filtres
  const rows = useMemo(() => (all || []).filter(r =>
    (!cfg.status || (cfg.status === "active" ? r.status === "active" : r.status !== "active")) &&
    cfg.filters.every(fl => { const f = byKey.get(fl.field); return !f || test(f, fl, f.get(r, ctx)); })), [all, cfg.status, cfg.filters, byKey, taxYear]);

  // Descripció dels filtres (per al PDF i per a la pantalla)
  const filterText = [
    `${STATUS_LABEL[cfg.status]}`,
    ...cfg.filters.filter(fl => byKey.get(fl.field)).map(fl => {
      const f = byKey.get(fl.field)!;
      const op = opsFor(f).find(o => o[0] === fl.op)?.[1] || "";
      const val = ["buit", "noBuit", "si", "no"].includes(fl.op) ? "" : ` «${f.type === "date" ? showValue(fl.value, "date") : fl.value}»`;
      return `${f.label} ${op}${val}`;
    }),
    ...(usesTax ? [`Impostos de l'any ${taxYear}`] : []),
  ].join(" · ");

  const stat = useMemo<StatResult | null>(() => {
    if (cfg.mode !== "estadistica" || !all) return null;
    const g1 = byKey.get(cfg.group1), g2 = byKey.get(cfg.group2);
    const mf = cfg.measure === "count" ? undefined : byKey.get(cfg.measureField);
    if (cfg.measure !== "count" && !mf) return null;
    const money = mf?.type === "money";
    const measureLabel = cfg.measure === "count" ? COUNT_LABEL[cfg.source] : `${cfg.measure === "sum" ? "Suma" : "Mitjana"} de ${lower(mf!.label)}`;
    const title = `${measureLabel}${g1 ? ` per ${lower(g1.label)}` : ""}${g2 ? ` i ${lower(g2.label)}` : ""}`;

    // Acumula: suma i nombre de valors per cel·la (per poder fer mitjanes)
    type Acc = { sum: number; n: number };
    const add = (m: Map<string, Acc>, k: string, r: Row) => {
      const a = m.get(k) || { sum: 0, n: 0 };
      if (!mf) { a.sum++; a.n++; } else { const v = mf.get(r, ctx); if (v !== null && v !== "" && !Number.isNaN(Number(v))) { a.sum += Number(v); a.n++; } }
      m.set(k, a);
    };
    const val = (a?: Acc) => (!a ? 0 : cfg.measure === "avg" ? (a.n ? a.sum / a.n : 0) : a.sum);
    const show = (v: number) => (cfg.measure === "count" ? v : fmtNum(v, money));
    const total: Map<string, Acc> = new Map();
    for (const r of rows) add(total, "", r);
    const totalV = val(total.get(""));

    if (!g1) return { title, head: ["", measureLabel], rows: [["Total", show(totalV)]], foot: [], cross: false };

    const labels1 = new Map<string, string>(), labels2 = new Map<string, string>();
    const m1 = new Map<string, Acc>(), m2 = new Map<string, Map<string, Acc>>(), col = new Map<string, Acc>();
    for (const r of rows) {
      const [k1, l1] = groupKey(g1.get(r, ctx), g1.type, cfg.dateGroup); labels1.set(k1, l1);
      add(m1, k1, r);
      if (g2) {
        const [k2, l2] = groupKey(g2.get(r, ctx), g2.type, cfg.dateGroup); labels2.set(k2, l2);
        if (!m2.has(k1)) m2.set(k1, new Map());
        add(m2.get(k1)!, k2, r); add(col, k2, r);
      }
    }
    const naturalOrder = g1.type !== "text" || cfg.order === "nom";
    const keys1 = [...labels1.keys()].sort((a, b) => naturalOrder ? a.localeCompare(b, "ca") : val(m1.get(b)) - val(m1.get(a)) || a.localeCompare(b, "ca"));
    const share = cfg.measure !== "avg";

    if (!g2) {
      return {
        title, cross: false,
        head: [g1.label, measureLabel, ...(share ? ["%"] : []), ""],
        rows: keys1.map(k => [labels1.get(k)!, show(val(m1.get(k))), ...(share ? [pct(val(m1.get(k)), totalV)] : []), ""]),
        bars: keys1.map(k => val(m1.get(k))),
        foot: ["Total", show(totalV), ...(share ? ["100%"] : []), ""],
      };
    }

    // Taula creuada: com a màxim MAX_COLS columnes; la resta s'ajunta a «Altres»
    let keys2 = [...labels2.keys()].sort((a, b) => g2.type !== "text" ? a.localeCompare(b, "ca") : val(col.get(b)) - val(col.get(a)) || a.localeCompare(b, "ca"));
    const rest = keys2.length > MAX_COLS ? keys2.slice(MAX_COLS - 1) : [];
    if (rest.length) keys2 = keys2.slice(0, MAX_COLS - 1);
    const merged = (accs: (Acc | undefined)[]) => accs.reduce<Acc>((t, a) => ({ sum: t.sum + (a?.sum || 0), n: t.n + (a?.n || 0) }), { sum: 0, n: 0 });
    const cell = (k1: string | null, k2: string | null, others = false): Acc | undefined => {
      const src = k1 === null ? col : m2.get(k1) || new Map<string, Acc>();
      return others ? merged(rest.map(k => src.get(k))) : src.get(k2!);
    };
    const fmtCell = (a?: Acc) => (a && a.n ? show(val(a)) : "");
    return {
      title, cross: true,
      head: [`${g1.label} \\ ${g2.label}`, ...keys2.map(k => labels2.get(k)!), ...(rest.length ? [`Altres (${rest.length})`] : []), "Total"],
      rows: keys1.map(k1 => [labels1.get(k1)!, ...keys2.map(k2 => fmtCell(cell(k1, k2))), ...(rest.length ? [fmtCell(cell(k1, null, true))] : []), show(val(m1.get(k1)))]),
      foot: ["Total", ...keys2.map(k2 => fmtCell(cell(null, k2))), ...(rest.length ? [fmtCell(cell(null, null, true))] : []), show(totalV)],
    };
  }, [cfg, rows, all, byKey, taxYear]);

  // Llistat: columnes triades, ordenat pel camp triat
  const listCols = cfg.columns.map(k => byKey.get(k)).filter(Boolean) as Field[];
  const listRows = useMemo(() => {
    if (cfg.mode !== "llistat") return [];
    const sf = byKey.get(cfg.sortBy);
    const sorted = sf ? [...rows].sort((a, b) => {
      const [ka] = groupKey(sf.get(a, ctx), sf.type, "dia"), [kb] = groupKey(sf.get(b, ctx), sf.type, "dia");
      return (cfg.sortDesc ? -1 : 1) * ka.localeCompare(kb, "ca", { numeric: true });
    }) : rows;
    return sorted.map(r => listCols.map(f => {
      const v = f.get(r, ctx);
      return f.type === "number" && v !== null ? Number(v) : showValue(v, f.type);
    }));
  }, [cfg.mode, cfg.sortBy, cfg.sortDesc, cfg.columns, rows, byKey, taxYear]);

  const exportTable = (): ExportTable => {
    const date = new Date().toISOString().slice(0, 10);
    if (cfg.mode === "llistat") {
      return { fileName: `llistat-${cfg.source === "clients" ? "clients" : "immobles"}-${date}`, title: `Llistat de ${NOUN[cfg.source][1]}`,
        subtitle: filterText, head: listCols.map(f => f.label), rows: listRows };
    }
    const st = stat!;
    const barCol = st.bars ? st.head.length - 1 : -1;
    return { fileName: `estadistica-${date}`, title: st.title, subtitle: `${NOUN[cfg.source][1][0].toUpperCase()}${NOUN[cfg.source][1].slice(1)}: ${filterText}`,
      head: st.bars ? st.head.slice(0, -1).concat("Gràfic") : st.head, rows: st.rows, foot: st.foot.length ? st.foot : undefined,
      bars: st.bars ? { col: barCol, values: st.bars } : undefined };
  };

  const switchSource = (source: Source) => setCfg(c => ({ ...blank(source), mode: c.mode, status: c.status }));
  const addFilter = () => set({ filters: [...cfg.filters, { field: fields[0].key, op: opsFor(fields[0])[0][0], value: "" }] });
  const setFilter = (i: number, p: Partial<Filter>) => set({ filters: cfg.filters.map((f, j) => {
    if (j !== i) return f;
    const n = { ...f, ...p };
    if (p.field) { const ops = opsFor(byKey.get(p.field)); if (!ops.some(o => o[0] === n.op)) n.op = ops[0][0]; n.value = ""; }
    return n;
  }) });
  const distinct = (key: string) => {
    const f = byKey.get(key);
    if (!f || f.type !== "text" || !all) return [];
    return [...new Set(all.map(r => f.get(r, ctx)).filter(v => v !== null && v !== "").map(String))].sort((a, b) => a.localeCompare(b, "ca")).slice(0, 300);
  };
  const toggleCol = (k: string) => set({ columns: cfg.columns.includes(k) ? cfg.columns.filter(c => c !== k) : [...cfg.columns, k] });
  const dateUsed = [cfg.group1, cfg.group2].some(k => byKey.get(k)?.type === "date");
  const numericFields = (f: Field) => f.type === "number" || f.type === "money";

  function save() {
    const name = window.prompt("Nom per a aquesta configuració:", stat?.title || `Llistat de ${NOUN[cfg.source][1]}`)?.trim();
    if (!name) return;
    const list = [...saved.filter(x => x.name !== name), { name, config: cfg }];
    setSaved(list); storeSaved(list);
  }
  function remove(name: string) { const list = saved.filter(x => x.name !== name); setSaved(list); storeSaved(list); }

  const max = stat?.bars ? Math.max(1, ...stat.bars) : 1;
  const ready = !!all && !loading;

  return (
    <div className="work-area list-view stats-page">
      <div className="page-title">
        <div><small>INFORMES</small><h1>Estadístiques i llistats</h1><p>Tria de quines dades de clients o d'immobles vols fer l'estadística o el llistat. Es pot descarregar en Excel i en PDF. Aquesta pantalla no modifica cap dada.</p></div>
        <div className="head-actions">
          <button className="cancel-btn" onClick={save}><Save size={16} /> Desar configuració</button>
          <ExportButtons disabled={!ready || (cfg.mode === "estadistica" ? !stat : !listCols.length)} table={exportTable} />
        </div>
      </div>
      {error && <Notice kind="error">No s'han pogut carregar les dades: {error}</Notice>}
      {saved.length > 0 && (
        <div className="filter-bar saved-reports">
          <span>Desades:</span>
          {saved.map(x => (
            <span key={x.name} className="saved-chip">
              <button onClick={() => setCfg({ ...blank(x.config.source), ...x.config })}>{x.name}</button>
              <button title="Esborrar" onClick={() => remove(x.name)}><X size={13} /></button>
            </span>
          ))}
        </div>
      )}

      <div className="report-layout">
        <div className="report-config">
          <Panel title="1. Què vols fer?" icon={BarChart3}>
            <div className="seg">
              <button className={cfg.mode === "estadistica" ? "on" : ""} onClick={() => set({ mode: "estadistica" })}><BarChart3 size={15} /> Estadística</button>
              <button className={cfg.mode === "llistat" ? "on" : ""} onClick={() => set({ mode: "llistat" })}><Table2 size={15} /> Llistat</button>
            </div>
            <div className="seg">
              <button className={cfg.source === "clients" ? "on" : ""} onClick={() => switchSource("clients")}>De clients</button>
              <button className={cfg.source === "properties" ? "on" : ""} onClick={() => switchSource("properties")}>D'immobles</button>
            </div>
          </Panel>

          <Panel title="2. Quins?" icon={FilterIcon} action={<button className="add-small" onClick={addFilter}><Plus size={14} /> Filtre</button>}>
            <div className="seg">
              {(["active", "baixa", ""] as const).map(k => <button key={k} className={cfg.status === k ? "on" : ""} onClick={() => set({ status: k })}>{STATUS_LABEL[k]}</button>)}
            </div>
            {cfg.filters.map((fl, i) => {
              const f = byKey.get(fl.field);
              const needsValue = !["buit", "noBuit", "si", "no"].includes(fl.op);
              return (
                <div className="report-filter" key={i}>
                  <FieldSelect fields={fields} value={fl.field} onChange={v => setFilter(i, { field: v })} />
                  <div className="report-filter-row">
                    <select value={fl.op} onChange={e => setFilter(i, { op: e.target.value as Op })}>{opsFor(f).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                    {needsValue && (f?.type === "date"
                      ? <input type="date" value={fl.value} onChange={e => setFilter(i, { value: e.target.value })} />
                      : <input value={fl.value} inputMode={f?.type === "number" || f?.type === "money" ? "decimal" : undefined} list={`flt-${i}`} placeholder="Valor…" onChange={e => setFilter(i, { value: e.target.value })} />)}
                    <button className="icon-only" title="Treure el filtre" onClick={() => set({ filters: cfg.filters.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>
                  </div>
                  {needsValue && f?.type === "text" && <datalist id={`flt-${i}`}>{distinct(fl.field).map(v => <option key={v} value={v} />)}</datalist>}
                </div>
              );
            })}
            {!cfg.filters.length && <p className="hint">Sense filtres: entren tots els {NOUN[cfg.source][1]} de l'estat triat. Amb «Filtre» pots limitar-ho per qualsevol dada.</p>}
            {usesTax && (
              <label className="report-inline">Any dels impostos
                <select value={taxYear} onChange={e => setTaxYear(Number(e.target.value))}>{taxYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
              </label>
            )}
          </Panel>

          {cfg.mode === "estadistica" ? (
            <Panel title="3. Com es calcula?" icon={ListChecks}>
              <label className="report-field">Agrupar per
                <FieldSelect fields={fields} value={cfg.group1} onChange={v => set({ group1: v })} empty="(sense agrupar: només el total)" />
              </label>
              <label className="report-field">I també per (taula creuada)
                <FieldSelect fields={fields} value={cfg.group2} onChange={v => set({ group2: v })} empty="(cap)" />
              </label>
              {dateUsed && (
                <label className="report-field">Les dates, agrupar per
                  <select value={cfg.dateGroup} onChange={e => set({ dateGroup: e.target.value as DateGroup })}><option value="any">Any</option><option value="mes">Mes</option><option value="dia">Dia</option></select>
                </label>
              )}
              <label className="report-field">Què es compta
                <select value={cfg.measure} onChange={e => set({ measure: e.target.value as Config["measure"], measureField: cfg.measureField || fields.find(numericFields)?.key || "" })}>
                  <option value="count">{COUNT_LABEL[cfg.source]}</option><option value="sum">Suma d'un import o número</option><option value="avg">Mitjana d'un import o número</option>
                </select>
              </label>
              {cfg.measure !== "count" && (
                <label className="report-field">De quin camp
                  <FieldSelect fields={fields} value={cfg.measureField} onChange={v => set({ measureField: v })} only={numericFields} />
                </label>
              )}
              {byKey.get(cfg.group1)?.type === "text" && !cfg.group2 && (
                <label className="report-field">Ordenar
                  <select value={cfg.order} onChange={e => set({ order: e.target.value as Config["order"] })}><option value="valor">De més a menys</option><option value="nom">Alfabèticament</option></select>
                </label>
              )}
            </Panel>
          ) : (
            <Panel title="3. Quines columnes?" icon={ListChecks}>
              <label className="report-field">Ordenar per
                <div className="report-filter-row">
                  <FieldSelect fields={fields} value={cfg.sortBy} onChange={v => set({ sortBy: v })} />
                  <select value={cfg.sortDesc ? "d" : "a"} onChange={e => set({ sortDesc: e.target.value === "d" })}><option value="a">Ascendent</option><option value="d">Descendent</option></select>
                </div>
              </label>
              <div className="report-cols">
                {[...new Set(fields.map(f => f.group))].map(g => {
                  const gf = fields.filter(f => f.group === g);
                  const on = gf.filter(f => cfg.columns.includes(f.key)).length;
                  return (
                    <details key={g} open={on > 0}>
                      <summary>{g}{on > 0 && <em>{on}</em>}</summary>
                      {gf.map(f => <label key={f.key} className="check-line"><input type="checkbox" checked={cfg.columns.includes(f.key)} onChange={() => toggleCol(f.key)} />{f.label}</label>)}
                    </details>
                  );
                })}
              </div>
              <div className="tab-actions inline">
                <button className="cancel-btn" onClick={() => set({ columns: DEFAULT_COLUMNS[cfg.source] })}>Columnes per defecte</button>
                <button className="cancel-btn" onClick={() => set({ columns: [] })}>Cap</button>
              </div>
            </Panel>
          )}
        </div>

        <section className="data-panel report-result">
          <div className="data-panel-title"><BarChart3 size={18} /><strong>{cfg.mode === "llistat" ? `Llistat de ${NOUN[cfg.source][1]}` : stat?.title || "Resultat"}</strong>
            <span className="report-count">{ready ? `${rows.length} ${rows.length === 1 ? NOUN[cfg.source][0] : NOUN[cfg.source][1]} · ${filterText}` : ""}</span></div>
          <div className="data-panel-body">
            {!ready ? <p className="empty-line pad">{loading ? "Carregant les dades…" : "Sense dades."}</p>
              : !rows.length ? <p className="empty-line pad">Cap {NOUN[cfg.source][0]} compleix els filtres.</p>
              : cfg.mode === "llistat" ? (
                !listCols.length ? <p className="empty-line pad">Tria almenys una columna.</p> : <>
                  <div className="table-wrap"><table className="report-table">
                    <thead><tr>{listCols.map(f => <th key={f.key}>{f.label}</th>)}</tr></thead>
                    <tbody>{listRows.slice(0, SHOW_ROWS).map((r, i) => <tr key={i} className="no-hover">{r.map((v, j) => <td key={j}>{typeof v === "number" ? v.toLocaleString("ca-ES") : v}</td>)}</tr>)}</tbody>
                  </table></div>
                  {listRows.length > SHOW_ROWS && <p className="hint">Es mostren les primeres {SHOW_ROWS} files de {listRows.length}. L'Excel i el PDF les inclouen totes.</p>}
                </>
              ) : !stat ? <p className="empty-line pad">Tria de quin camp vols la suma o la mitjana.</p>
              : (
                <div className="table-wrap"><table className={"report-table" + (stat.cross ? " cross" : "")}>
                  <thead><tr>{stat.head.map((h, i) => <th key={i} className={i > 0 && !(stat.bars && i === stat.head.length - 1) ? "num" : ""}>{h}</th>)}</tr></thead>
                  <tbody>{stat.rows.map((r, i) => (
                    <tr key={i} className="no-hover">
                      {r.map((v, j) => stat.bars && j === r.length - 1
                        ? <td key={j} className="bar-cell"><span className="bar-track"><i style={{ width: `${(stat.bars[i] / max) * 100}%` }} /></span></td>
                        : <td key={j} className={j === 0 ? (v === EMPTY ? "muted" : "") : "num"}>{j === 0 ? <strong>{v}</strong> : v}</td>)}
                    </tr>
                  ))}</tbody>
                  {stat.foot.length > 0 && <tfoot><tr>{stat.foot.map((v, j) => <td key={j} className={j ? "num" : ""}>{v}</td>)}</tr></tfoot>}
                </table></div>
              )}
          </div>
        </section>
      </div>
    </div>
  );
}

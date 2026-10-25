// Impostos (menú): resum de l'exercici per a totes les finques, marcar pagats,
// llistat del Model 210 i importació de fitxers d'IBI.
// Equival a «RENDA / Opcions Patrimonis» del programa antic (PDF pàg. 10).
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Landmark, Upload } from "lucide-react";
import { Empty, Notice, Panel } from "../../components/ui";
import { ExportButtons } from "../../components/ExportButtons";
import { errorText } from "../../lib/supabase";
import { fmtDate, todayISO } from "../../lib/format";
import { importIbi, listTaxYear, model210, setPaid, type TaxLine } from "../../data/taxes";
import { getWorkingYear } from "../../data/settings";

const eur = (n: number) => n.toLocaleString("ca-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function TaxesPage({ canWrite, onOpenProperty }: { canWrite: boolean; onOpenProperty: (id: string) => void }) {
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [rows, setRows] = useState<TaxLine[] | null>(null);
  const [tab, setTab] = useState<"exercici" | "m210" | "ibi">("exercici");
  const [zone, setZone] = useState("");
  const [paid, setPaidF] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [error, setError] = useState(""); const [ok, setOk] = useState("");
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => { getWorkingYear().then(setYear).catch(() => {}); }, []); // per defecte, l'any de treball de Configuració
  const load = () => { setRows(null); return listTaxYear(year).then(setRows).catch(e => setError(errorText(e))); };
  useEffect(() => { void load(); }, [year]);

  const zones = useMemo(() => [...new Set((rows || []).map(r => r.zone).filter(z => z != null))].sort((a, b) => Number(a) - Number(b)), [rows]);
  const list = (rows || []).filter(r => {
    const ln = (r.owners[0]?.last_name || "").toUpperCase();
    return (!zone || String(r.zone) === zone) && (paid === "" || (paid === "sense" ? !r.tax_id : String(r.paid) === paid)) &&
      (!from || ln >= from.toUpperCase()) && (!to || ln <= to.toUpperCase() + "￿");
  });
  const tot = list.reduce((a, r) => ({ cad: a.cad + r.cadastral_value, ibi: a.ibi + r.ibi_quota, base: a.base + r.taxable_base, quota: a.quota + r.rent_quota }), { cad: 0, ibi: 0, base: 0, quota: 0 });
  const m210 = list.filter(r => r.tax_id).flatMap(r => model210(r).map(o => ({ r, o })));
  const taxFilters = [zone ? `Zona ${zone}` : "Totes les zones", paid === "true" ? "Pagats" : paid === "false" ? "Pendents" : paid === "sense" ? "Sense dades de l'any" : "",
    from || to ? `Cognoms ${from || "…"} – ${to || "…"}` : ""].filter(Boolean).join(" · ");

  async function togglePaid(r: TaxLine) {
    if (!r.tax_id) return;
    try { await setPaid(r.tax_id, !r.paid, todayISO()); await load(); } catch (e) { setError(errorText(e)); }
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError(""); setOk("");
    try {
      const res = await importIbi(await f.text(), year);
      setOk(`IBI importat: ${res.updated} actualitzats, ${res.created} nous.${res.notFound.length ? ` No trobades (${res.notFound.length}): ${res.notFound.slice(0, 10).join(", ")}${res.notFound.length > 10 ? "…" : ""}` : ""}`);
      await load();
    } catch (e) { setError("No s'ha pogut importar: " + errorText(e)); }
    finally { if (file.current) file.current.value = ""; }
  }

  return (
    <div className="work-area list-view">
      <div className="page-title"><div><small>RENDA I PATRIMONI</small><h1>Impostos</h1><p>Exercici, pagaments, llistat del Model 210 i importació d'IBI. Les dades de cada finca es modifiquen a la fitxa del client → Impostos.</p></div>
        <label className="year-select">Exercici <select value={year} onChange={e => setYear(Number(e.target.value))}>{Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => <option key={y}>{y}</option>)}</select></label>
      </div>
      {error && <Notice kind="error">{error}</Notice>}{ok && <Notice kind="ok">{ok}</Notice>}
      <div className="record-tabs">
        {([["exercici", "Resum de l'exercici", Landmark], ["m210", "Llistat M-210 Renda", FileText], ["ibi", "Importar IBI", Upload]] as const).map(([k, l, I]) =>
          <button key={k} className={tab === k ? "selected" : ""} onClick={() => setTab(k)}><I size={16} /><span>{l}</span></button>)}
      </div>

      {tab !== "ibi" && (
        <div className="filter-bar">
          <select className="filter-input small" value={zone} onChange={e => setZone(e.target.value)}><option value="">Totes les zones</option>{zones.map(z => <option key={z!} value={String(z)}>Zona {z}</option>)}</select>
          <select className="filter-input small" value={paid} onChange={e => setPaidF(e.target.value)}><option value="">Pagats i pendents</option><option value="true">Pagats</option><option value="false">Pendents</option><option value="sense">Sense dades de l'any</option></select>
          <input className="filter-input small" placeholder="Cognom inicial" value={from} onChange={e => setFrom(e.target.value)} />
          <input className="filter-input small" placeholder="Cognom final" value={to} onChange={e => setTo(e.target.value)} />
          {tab === "exercici"
            ? <ExportButtons disabled={!list.length} table={() => ({ fileName: `impostos-${year}`, title: `Impostos de l'exercici ${year}`, subtitle: taxFilters,
                head: ["Núm. adm.", "Finca", "Titular", "NIF", "Ref. cadastral", "Valor cadastral", "% revalorització", "Base imposable", "Tipus %", "Quota renda", "Quota IBI", "Pagat", "Data pagament", "Estat"],
                rows: list.map(r => [r.admin_number, r.finca, r.owners[0]?.name, r.owners[0]?.nif, r.cadastral_ref, eur(r.cadastral_value), r.revaluation_pct, eur(r.taxable_base), r.tax_rate, eur(r.rent_quota), eur(r.ibi_quota), r.paid ? "S" : "N", fmtDate(r.paid_date), r.status === "baixa" ? "Baixa " + fmtDate(r.baixa_date) : "Activa"]) })} />
            : <ExportButtons disabled={!m210.length} table={() => ({ fileName: `model210-${year}`, title: `Llistat Model 210 · ${year}`, subtitle: taxFilters,
                head: ["Núm. adm.", "Finca", "Titular", "NIF/NIE", "% propietat", "Total propietaris", "Base imposable", "Quota renda finca", "Tipus %", "Quota a pagar (fórmula actual)", "Quota per % propietat"],
                rows: m210.map(({ r, o }) => [r.admin_number, r.finca, o.name, o.nif, o.pct, o.total, eur(r.taxable_base), eur(r.rent_quota), r.tax_rate, eur(o.quota_pdf), eur(o.quota_pct)]) })} />}
        </div>
      )}

      {tab === "exercici" && (
        <section className="data-panel">
          {!rows ? <Empty>Carregant…</Empty> : (
            <table className="mini-table">
              <thead><tr><th>Adm.</th><th>Finca</th><th>Titular</th><th>Ref. cadastral</th><th className="num">Valor cadastral</th><th className="num">Base imposable</th><th className="num">Quota renda</th><th className="num">IBI</th><th>Pagat</th></tr></thead>
              <tbody>
                {list.map(r => (
                  <tr key={r.property_id} className={r.status === "baixa" ? "row-off" : ""} onClick={() => onOpenProperty(r.property_id)}>
                    <td>{r.admin_number}</td><td className="wrap"><strong>{r.finca}</strong>{r.status === "baixa" && <small className="block muted">Baixa {fmtDate(r.baixa_date)}</small>}</td>
                    <td className="wrap">{r.owners.map(o => `${o.name}${o.pct < 100 ? ` (${o.pct}%)` : ""}`).join(", ")}</td>
                    <td>{r.tax_id ? r.cadastral_ref : <span className="muted">sense dades {year}</span>}</td>
                    <td className="num">{r.tax_id ? eur(r.cadastral_value) : ""}</td><td className="num">{r.tax_id ? eur(r.taxable_base) : ""}</td>
                    <td className="num">{r.tax_id ? eur(r.rent_quota) : ""}</td><td className="num">{r.tax_id ? eur(r.ibi_quota) : ""}</td>
                    <td onClick={e => e.stopPropagation()}>{r.tax_id && <label className="chk-inline"><input type="checkbox" checked={r.paid} disabled={!canWrite} onChange={() => togglePaid(r)} /> {r.paid ? fmtDate(r.paid_date) : "No"}</label>}</td>
                  </tr>))}
                {!list.length && <tr className="no-hover"><td colSpan={9} className="table-empty">No hi ha finques amb aquest filtre.</td></tr>}
              </tbody>
              {list.length > 0 && <tfoot><tr><td colSpan={4}>Totals ({list.length} finques)</td><td className="num">{eur(tot.cad)}</td><td className="num">{eur(tot.base)}</td><td className="num">{eur(tot.quota)}</td><td className="num">{eur(tot.ibi)}</td><td /></tr></tfoot>}
            </table>
          )}
          <p className="hint pad">«Pagat» i la data de pagament són els camps que fa servir la importació a comptabilitat (Impostos pagament = S).</p>
        </section>
      )}

      {tab === "m210" && (
        <section className="data-panel">
          <Notice>El càlcul de la «quota a pagar» reprodueix la fórmula que fa servir el programa actual segons el PDF: <code>(Quota renda / Total propietaris) × Tipus gravamen / 100</code>. Al costat es mostra la part proporcional al % de propietat. <strong>Cal validar-ho amb l'assessoria</strong> abans de generar el fitxer de l'AEAT.</Notice>
          {!rows ? <Empty>Carregant…</Empty> : (
            <table className="mini-table">
              <thead><tr><th>Adm.</th><th>Finca</th><th>Titular</th><th>NIF/NIE</th><th className="num">%</th><th className="num">Total prop.</th><th className="num">Quota renda finca</th><th className="num">Quota a pagar (actual)</th><th className="num">Per % propietat</th></tr></thead>
              <tbody>
                {m210.map(({ r, o }, i) => (
                  <tr key={r.property_id + i} className="no-hover"><td>{r.admin_number}</td><td className="wrap">{r.finca}</td><td>{o.name}</td><td>{o.nif || <span className="txt-warn">falta NIF</span>}</td>
                    <td className="num">{o.pct}</td><td className="num">{o.total}</td><td className="num">{eur(r.rent_quota)}</td><td className="num">{eur(o.quota_pdf)}</td><td className="num">{eur(o.quota_pct)}</td></tr>))}
                {!m210.length && <tr className="no-hover"><td colSpan={9} className="table-empty">No hi ha impostos de {year} amb aquest filtre.</td></tr>}
              </tbody>
            </table>
          )}
          <p className="hint pad">Pendent: fitxer «rebutddmmyyyy.txt» per a l'AEAT i fitxer NRC del banc (i comprovació del retorn), quan tinguem la definició exacta dels formats.</p>
        </section>
      )}

      {tab === "ibi" && (
        <Panel title={`Importar fitxer d'IBI a l'exercici ${year}`} icon={Upload}>
          <p>Puja un fitxer <strong>CSV</strong> (Excel → Desa com a CSV) amb una fila per finca i, com a mínim, aquestes columnes:</p>
          <pre className="code-sample">referencia_cadastral;valor_cadastral;quota_ibi{"\n"}6097043EG1469N0017ID;43000,00;887,81</pre>
          <p className="hint">La finca es troba per la referència cadastral (ha d'estar entrada en algun exercici). Si l'any {year} ja existeix s'actualitza; si no, es crea amb el % de revalorització i el tipus de l'any anterior.</p>
          {canWrite ? <label className="save-btn file-btn"><Upload size={16} /> Triar fitxer CSV…<input ref={file} type="file" accept=".csv,text/csv,.txt" hidden onChange={e => onFile(e.target.files?.[0])} /></label>
            : <Notice>Només els usuaris d'oficina o administradors poden importar.</Notice>}
          <p className="hint">Si el fitxer que envia l'Ajuntament/Diputació té un altre format (p. ex. el fitxer oficial del cadastre), passa-me'n un exemple i l'adapto.</p>
        </Panel>
      )}
    </div>
  );
}

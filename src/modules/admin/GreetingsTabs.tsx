// Configuració: felicitacions automàtiques (aniversari i Nadal) i correu sortint (SMTP).
import { useEffect, useState } from "react";
import { Cake, Gift, ImagePlus, Mail, Save, Send, Server, Trash2 } from "lucide-react";
import { CheckInput, Empty, Notice, Panel, SelectInput, TextInput } from "../../components/ui";
import { errorText } from "../../lib/supabase";
import { useLanguages } from "../../data/settings";
import { listTemplates, type Template } from "../../data/admin";
import {
  ALL_LANGUAGES, getGreetings, getSmtp, greetingImageUrls, GREETING_KINDS, listGreetingLog, removeGreetingImage, runGreetingsNow, saveGreetings, saveSmtp, sendGreetingTest, uploadGreetingImage,
  type GreetingLogRow, type GreetingSettings, type SmtpSettings,
} from "../../data/greetings";

const dateTime = (iso: string) => new Date(iso).toLocaleString("ca-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const DECEMBER: [string, string][] = Array.from({ length: 31 }, (_, i) => [`12-${String(i + 1).padStart(2, "0")}`, `${i + 1} de desembre`]);
const HOURS: [string, string][] = Array.from({ length: 14 }, (_, i) => [String(i + 7), `${i + 7}:00`]);
const STATUS: Record<string, [string, string]> = { sent: ["Enviada", "status-ok"], error: ["Error", "status-warn"], test: ["Prova", ""] };

// ---------------------------------------------------------------------
// Felicitacions
// ---------------------------------------------------------------------
export function GreetingsTab({ isAdmin, onEditTexts }: { isAdmin: boolean; onEditTexts: () => void }) {
  const [g, setG] = useState<GreetingSettings | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [addLang, setAddLang] = useState<Record<string, string>>({});
  const [tpls, setTpls] = useState<Template[]>([]);
  const [log, setLog] = useState<GreetingLogRow[] | null>(null);
  const [smtpOk, setSmtpOk] = useState(true);
  const [test, setTest] = useState({ email: "", kind: GREETING_KINDS[0][0], language: "ca" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(""); const [ok, setOk] = useState("");
  const languages = useLanguages();
  const langName = (l: string) => languages.find(x => x[0] === l)?.[1] || l;
  const loadLog = () => listGreetingLog().then(setLog).catch(() => setLog([]));

  useEffect(() => {
    if (!isAdmin) return;
    getGreetings().then(v => { setG(v); return greetingImageUrls(Object.values(v.images).flatMap(m => Object.values(m))).then(setUrls); }).catch(e => setError(errorText(e)));
    listTemplates().then(r => setTpls(r.filter(t => GREETING_KINDS.some(k => k[0] === t.kind)))).catch(() => {});
    getSmtp().then(c => setSmtpOk(!!c.host && !!c.user && c.password_saved)).catch(() => {});
    void loadLog();
  }, [isAdmin]);

  if (!isAdmin) return <Panel title="Felicitacions" icon={Gift}><p className="hint">Només els administradors poden configurar les felicitacions.</p></Panel>;
  if (!g) return <Panel title="Felicitacions" icon={Gift}>{error ? <Notice kind="error">{error}</Notice> : <Empty>Carregant…</Empty>}</Panel>;

  const msg = (e?: unknown, good?: string) => { setError(e ? errorText(e) : ""); setOk(good || ""); };
  async function save(next = g!) {
    try { await saveGreetings(next); msg(undefined, "Felicitacions desades."); } catch (e) { msg(e); }
  }
  const withImage = (kind: string, language: string, path: string) => {
    const byLang = { ...(g!.images[kind] || {}) };
    if (path) byLang[language] = path; else delete byLang[language];
    return { ...g!, images: { ...g!.images, [kind]: byLang } };
  };
  async function pickImage(kind: string, language: string, file: File | undefined) {
    if (!file) return;
    setBusy(`img-${kind}-${language}`);
    try {
      const old = g!.images[kind]?.[language];
      const path = await uploadGreetingImage(file, kind, language);
      const next = withImage(kind, language, path);
      setG(next); setUrls({ ...urls, ...(await greetingImageUrls([path])) }); await save(next);
      if (old) await removeGreetingImage(old);
    } catch (e) { msg(e); }
    setBusy("");
  }
  async function dropImage(kind: string, language: string) {
    const old = g!.images[kind]?.[language];
    const next = withImage(kind, language, "");
    setG(next); await save(next);
    if (old) await removeGreetingImage(old).catch(() => {});
  }
  async function doTest() {
    setBusy("test"); msg();
    try { const r = await sendGreetingTest(test.email.trim(), test.kind, test.language); r.ok ? msg(undefined, r.message) : setError(r.message); await loadLog(); }
    catch (e) { msg(e); }
    setBusy("");
  }
  async function doNow() {
    if (!window.confirm("Enviar ara les felicitacions que toquen avui als clients?\n\nNo s'envia mai dues vegades la mateixa felicitació a un client en el mateix any.")) return;
    setBusy("now"); msg();
    try {
      const r = await runGreetingsNow();
      if (r.warning) setError(r.warning);
      else msg(undefined, r.sent || r.errors ? `Enviades: ${r.sent}. Amb error: ${r.errors}.` + (r.pending ? ` En queden ${r.pending}, que s'enviaran a la propera hora.` : "") : "Avui no toca cap felicitació (o ja s'han enviat totes).");
      await loadLog();
    } catch (e) { msg(e); }
    setBusy("");
  }

  const textsFor = (kind: string) => tpls.filter(t => t.kind === kind);
  return (
    <div className="column-stack">
      {error && <Notice kind="error">{error}</Notice>}{ok && <Notice kind="ok">{ok}</Notice>}
      {!smtpOk && <Notice>Encara no hi ha cap correu sortint configurat: fins que no es configuri a la pestanya «Correu sortint», no s'enviarà cap felicitació.</Notice>}
      <Panel title="Quan s'envien" icon={Gift}>
        <div className="form-grid four">
          <CheckInput label="Felicitar els clients el dia del seu aniversari" checked={g.birthday_enabled} onChange={v => setG({ ...g, birthday_enabled: v })} />
          <CheckInput label="Felicitar el Nadal i l'Any Nou" checked={g.christmas_enabled} onChange={v => setG({ ...g, christmas_enabled: v })} />
          <SelectInput label="Dia d'enviament de Nadal" value={g.christmas_day} onChange={v => setG({ ...g, christmas_day: v })} options={DECEMBER} />
          <SelectInput label="Hora d'enviament" value={String(g.hour)} onChange={v => setG({ ...g, hour: Number(v) })} options={HOURS} />
        </div>
        <div className="tab-actions inline"><button className="save-btn" onClick={() => save()}><Save size={16} /> Guardar</button></div>
        <p className="hint">Ho envia el servidor cada dia encara que ningú tingui el programa obert. Només a clients actius (no donats de baixa) amb e-mail; als d'aniversari, si tenen la data de naixement. Cada client rep el text en el seu idioma (si no n'hi ha, en anglès) i mai dues vegades la mateixa felicitació el mateix any.</p>
      </Panel>

      <Panel title="Imatges de les felicitacions" icon={ImagePlus}>
        <p className="hint">Surt a dalt de tot del correu, a tota l'amplada (va bé una imatge apaïsada, per exemple 1200 × 675). Si la imatge porta text, se'n pot pujar una per a cada idioma: el client rep la del seu idioma i, si no n'hi ha, la general.</p>
        {GREETING_KINDS.map(([kind, label]) => {
          const byLang = g.images[kind] || {};
          const rows = [ALL_LANGUAGES, ...Object.keys(byLang).filter(l => l !== ALL_LANGUAGES).sort()];
          const free = languages.filter(([c]) => !byLang[c]);
          return (
            <div key={kind} className="greeting-images">
              <h4>{label}</h4>
              <div className="greeting-image-grid">
                {rows.map(lang => {
                  const path = byLang[lang]; const id = `img-${kind}-${lang}`;
                  return (
                    <figure key={lang} className="greeting-image">
                      {path && urls[path] ? <img src={urls[path]} alt={`${label} (${lang === ALL_LANGUAGES ? "general" : langName(lang)})`} /> : <div className="greeting-image-empty">Sense imatge</div>}
                      <figcaption>
                        <strong>{lang === ALL_LANGUAGES ? "General (la resta d'idiomes)" : langName(lang)}</strong>
                        <span className="tab-actions inline">
                          <label className="outline-btn small" style={{ cursor: "pointer" }}><ImagePlus size={13} /> {busy === id ? "Pujant…" : path ? "Canviar" : "Pujar"}
                            <input type="file" accept="image/*" hidden onChange={e => { void pickImage(kind, lang, e.target.files?.[0]); e.target.value = ""; }} /></label>
                          {path && <button className="outline-btn small danger-btn" onClick={() => void dropImage(kind, lang)}><Trash2 size={13} /> Treure</button>}
                        </span>
                      </figcaption>
                    </figure>);
                })}
              </div>
              {!!free.length && <div className="tab-actions inline">
                <select className="cell-input" value={addLang[kind] || ""} onChange={e => setAddLang({ ...addLang, [kind]: e.target.value })}>
                  <option value="">Imatge per a un idioma…</option>{free.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
                <label className={"add-small" + (addLang[kind] ? "" : " disabled")} style={{ cursor: addLang[kind] ? "pointer" : "default" }}><ImagePlus size={13} /> Pujar
                  <input type="file" accept="image/*" hidden disabled={!addLang[kind]} onChange={e => { void pickImage(kind, addLang[kind], e.target.files?.[0]); e.target.value = ""; setAddLang({ ...addLang, [kind]: "" }); }} /></label>
              </div>}
            </div>);
        })}
      </Panel>

      <Panel title="Textos per idioma" icon={Mail} action={<button className="add-small" onClick={onEditTexts}>Editar textos</button>}>
        {GREETING_KINDS.map(([k, label]) => (
          <p key={k} className="greeting-texts"><strong>{label}:</strong>{" "}
            {textsFor(k).length ? textsFor(k).map(t => <span key={t.id} className={"status-pill " + (t.reviewed ? "status-ok" : "status-warn")} style={{ marginRight: 6 }}>{langName(t.language)}{t.reviewed ? "" : " (pendent de revisar)"}</span>) : "cap text"}</p>))}
        <p className="hint">Els textos es canvien a «Textos de correu». Només s'envien els marcats com a «Revisat». Es pot fer servir <code>{"{{nom}}"}</code> (nom del client), <code>{"{{client}}"}</code> (nom i cognoms) i <code>{"{{any}}"}</code> (a Nadal, l'any que ve).</p>
      </Panel>

      <Panel title="Provar" icon={Send}>
        <div className="form-grid four">
          <TextInput label="Enviar una prova a" type="email" value={test.email} onChange={v => setTest({ ...test, email: v })} placeholder="el-teu@correu.com" />
          <SelectInput label="Felicitació" value={test.kind} onChange={v => setTest({ ...test, kind: v })} options={GREETING_KINDS} />
          <SelectInput label="Idioma" value={test.language} onChange={v => setTest({ ...test, language: v })} options={languages} />
        </div>
        <div className="tab-actions inline">
          <button className="save-btn" disabled={!!busy || !test.email.includes("@")} onClick={doTest}><Send size={16} /> {busy === "test" ? "Enviant…" : "Enviar prova"}</button>
          <button className="cancel-btn" disabled={!!busy} onClick={doNow}><Cake size={16} /> {busy === "now" ? "Enviant…" : "Enviar ara les d'avui"}</button>
        </div>
      </Panel>

      <Panel title="Últims enviaments" icon={Mail}>
        {!log ? <Empty>Carregant…</Empty> : !log.length ? <Empty>Encara no s'ha enviat cap felicitació.</Empty> : (
          <table className="mini-table">
            <thead><tr><th>Data i hora</th><th>Felicitació</th><th>Client</th><th>E-mail</th><th>Idioma</th><th>Estat</th></tr></thead>
            <tbody>{log.map(r => (
              <tr key={r.id} className="no-hover"><td>{dateTime(r.sent_at)}</td><td>{GREETING_KINDS.find(k => k[0] === r.kind)?.[1] || r.kind}</td><td>{r.client || "—"}</td><td>{r.email}</td><td>{langName(r.language)}</td>
                <td><span className={"status-pill " + (STATUS[r.status]?.[1] || "")} title={r.error}>{STATUS[r.status]?.[0] || r.status}</span>{r.error && <small className="hint"> {r.error}</small>}</td></tr>))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------
// Correu sortint (servidor SMTP de l'empresa)
// ---------------------------------------------------------------------
export function SmtpTab({ isAdmin }: { isAdmin: boolean }) {
  const [c, setC] = useState<SmtpSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [ok, setOk] = useState("");
  useEffect(() => { if (isAdmin) getSmtp().then(({ password_saved, ...rest }) => { setC(rest); setSaved(password_saved); }).catch(e => setError(errorText(e))); }, [isAdmin]);

  if (!isAdmin) return <Panel title="Correu sortint" icon={Server}><p className="hint">Només els administradors poden configurar el correu sortint.</p></Panel>;
  if (!c) return <Panel title="Correu sortint" icon={Server}>{error ? <Notice kind="error">{error}</Notice> : <Empty>Carregant…</Empty>}</Panel>;

  async function save() {
    if (!c!.host.trim() || !c!.user.trim()) { setError("Cal el servidor i l'usuari."); setOk(""); return; }
    try { await saveSmtp(c!, password); if (password) setSaved(true); setPassword(""); setError(""); setOk("Correu sortint desat. Prova'l a la pestanya «Felicitacions» → «Enviar prova»."); }
    catch (e) { setError(errorText(e)); setOk(""); }
  }
  return (
    <Panel title="Correu sortint (des d'on s'envien els correus automàtics)" icon={Server}>
      {error && <Notice kind="error">{error}</Notice>}{ok && <Notice kind="ok">{ok}</Notice>}
      <div className="form-grid">
        <TextInput label="Adreça remitent" type="email" value={c.from_email} onChange={v => setC({ ...c, from_email: v })} placeholder="info@empresa.com" />
        <TextInput label="Nom que veu el client" value={c.from_name} onChange={v => setC({ ...c, from_name: v })} placeholder="Nom de l'empresa" />
        <TextInput label="Servidor SMTP" value={c.host} onChange={v => setC({ ...c, host: v })} placeholder="mail.empresa.com" required />
        <SelectInput label="Port" value={String(c.port)} onChange={v => setC({ ...c, port: Number(v) })} options={[["465", "465 (SSL, el més habitual)"], ["587", "587 (STARTTLS)"]]} />
        <TextInput label="Usuari (normalment, l'adreça de correu)" value={c.user} onChange={v => setC({ ...c, user: v })} required />
        <TextInput label={saved ? "Contrasenya (desada; escriu-ne una només per canviar-la)" : "Contrasenya"} type="password" value={password} onChange={setPassword} />
      </div>
      <div className="tab-actions inline"><button className="save-btn" onClick={save}><Save size={16} /> Guardar</button></div>
      <p className="hint">Aquestes dades les dona l'empresa del hosting del correu (al seu tauler, apartat «Configurar client de correu» o «SMTP»). La contrasenya es guarda xifrada al servidor i ningú la pot tornar a veure des del programa. Si es deixa en blanc l'adreça remitent, s'envia des de l'usuari.</p>
    </Panel>
  );
}

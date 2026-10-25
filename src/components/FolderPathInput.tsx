// Camp de ruta d'una carpeta de l'ordinador amb «Buscar…» i «Enganxar».
// - App d'escriptori (Electron): obre el diàleg de Windows i posa la ruta sencera.
// - Navegador: per seguretat només dona el NOM de la carpeta triada, no la ruta.
//   Es completa amb la carpeta de dalt de la ruta actual o amb l'última que s'ha fet servir
//   en aquest ordinador (es recorda al navegador). «Enganxar» posa la ruta copiada de l'explorador.
import { useState } from "react";
import { ClipboardPaste, FolderSearch } from "lucide-react";

// Cada tipus de carpeta (clients, finques…) recorda la seva carpeta de dalt
const baseKey = (kind: string) => kind === "client" ? "mm.carpetaBase" : `mm.carpetaBase.${kind}`;
const desktop = () => (window as any).desktop as { pickFolder?: (start: string) => Promise<string | null> } | undefined;

/** Carpeta de dalt d'una ruta («P:\A\B\C» → «P:\A\B»); buit si no n'hi ha */
const parentOf = (p: string) => {
  const t = p.trim().replace(/[\\/]+$/, "");
  const i = Math.max(t.lastIndexOf("\\"), t.lastIndexOf("/"));
  return i > 0 ? t.slice(0, i) : "";
};
const readBase = (kind: string) => { try { return localStorage.getItem(baseKey(kind)) || ""; } catch { return ""; } };
const saveBase = (kind: string, p: string) => { const b = parentOf(p); if (b) try { localStorage.setItem(baseKey(kind), b); } catch { /* sense memòria */ } };

export function FolderPathInput({ label, value, onChange, placeholder, kind = "client", readOnly = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  /** «client», «finca»…: la carpeta de dalt es recorda per separat */
  kind?: string;
  /** Mode consulta: es veu la ruta però no es pot canviar */
  readOnly?: boolean;
}) {
  const [msg, setMsg] = useState("");
  const saveBaseK = (p: string) => saveBase(kind, p);
  const set = (v: string) => { onChange(v); saveBaseK(v); };

  async function browse() {
    setMsg("");
    const d = desktop();
    if (d?.pickFolder) { const p = await d.pickFolder(value); if (p) set(p); return; }
    const picker = (window as any).showDirectoryPicker;
    if (!picker) { setMsg("Aquest navegador no permet buscar carpetes. Copia la ruta a l'explorador de fitxers i prem «Enganxar»."); return; }
    try {
      const h = await picker({ id: "carpeta-" + kind, mode: "read" });
      const base = parentOf(value) || readBase(kind);
      set(base ? `${base}\\${h.name}` : h.name);
      setMsg(base
        ? `Carpeta «${h.name}» dins de ${base}. Si és en un altre lloc, corregeix la ruta o fes servir «Enganxar».`
        : `El navegador només dona el nom de la carpeta («${h.name}»): escriu davant on és (p. ex. P:\\ADMINISTRACIO\\CLIENTS\\). Després ja ho recordarà.`);
    } catch (e: any) {
      if (e?.name !== "AbortError") setMsg("No s'ha pogut obrir la carpeta. Copia la ruta a l'explorador i prem «Enganxar».");
    }
  }

  async function paste() {
    setMsg("");
    try {
      const t = (await navigator.clipboard.readText()).trim().replace(/^"(.*)"$/, "$1");
      if (t) set(t); else setMsg("No hi ha cap ruta copiada.");
    } catch { setMsg("El navegador no deixa llegir el que has copiat: enganxa-ho al camp amb Ctrl+V."); }
  }

  return (
    <label className={"f f-wide" + (readOnly ? " f-locked" : "")}>
      <span>{label}</span>
      <span className="path-input">
        <input value={value} placeholder={readOnly ? undefined : placeholder} readOnly={readOnly} onChange={e => onChange(e.target.value)} onBlur={e => !readOnly && saveBaseK(e.target.value)} />
        {!readOnly && <>
        <button type="button" className="outline-btn small" onClick={browse} title="Buscar la carpeta a l'ordinador"><FolderSearch size={14} /> Buscar…</button>
        <button type="button" className="outline-btn small" onClick={paste} title="Posar la ruta copiada de l'explorador de fitxers"><ClipboardPaste size={14} /> Enganxar</button>
        </>}
      </span>
      {msg && <small className="path-msg">{msg}</small>}
    </label>
  );
}

// Buscador de la barra superior: clients (nom, codi, DNI/NIE/passaport, telèfon, e-mail),
// finques (adreça, núm. d'administració), matrícules i cònjuges/copropietaris.
// En triar un resultat s'obre directament la fitxa. Fletxes + Enter per triar, Esc per tancar.
import { useEffect, useRef, useState } from "react";
import { Building2, Car, Search, UserRound, Users } from "lucide-react";
import { globalSearch, type HitKind, type SearchHit } from "../../data/search";
import { errorText } from "../../lib/supabase";

const GROUPS: [HitKind[], string, any][] = [
  [["client"], "Clients", UserRound],
  [["finca"], "Finques", Building2],
  [["matricula"], "Matrícules", Car],
  [["conjuge", "copropietari"], "Cònjuges i copropietaris", Users],
];

export function GlobalSearch({ onPick, onSearchClients }: { onPick: (h: SearchHit) => void; onSearchClients: (q: string) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits(null); setError(""); return; }
    let stale = false;
    const t = setTimeout(() => {
      globalSearch(term).then(h => { if (!stale) { setHits(h); setActive(0); setError(""); } })
        .catch(e => { if (!stale) setError(errorText(e)); });
    }, 250);
    return () => { stale = true; clearTimeout(t); };
  }, [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // ordre de visualització = ordre de navegació amb les fletxes
  const ordered = GROUPS.flatMap(([kinds]) => (hits || []).filter(h => kinds.includes(h.kind)));
  const pick = (h: SearchHit) => { setOpen(false); setQ(""); setHits(null); onPick(h); };

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive(a => Math.min(ordered.length - 1, a + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    if (e.key === "Enter") {
      if (ordered[active]) pick(ordered[active]);
      else if (q.trim()) { setOpen(false); onSearchClients(q.trim()); }
    }
  }

  let idx = -1;
  return (
    <div className="global-search-wrap" ref={box}>
      <label className="global-search"><Search size={19} />
        <input placeholder="Buscar clients, finques, DNI, telèfon, e-mail, matrícula…" value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey} aria-label="Buscador general" />
      </label>
      {open && q.trim().length >= 2 && (
        <div className="gs-results" role="listbox">
          {error ? <div className="gs-empty">No s'ha pogut buscar: {error}</div>
            : !hits ? <div className="gs-empty">Buscant…</div>
            : !ordered.length ? <div className="gs-empty">Cap resultat per «{q.trim()}».</div>
            : GROUPS.map(([kinds, label, Icon]) => {
              const list = hits.filter(h => kinds.includes(h.kind));
              if (!list.length) return null;
              return (
                <div key={label} className="gs-group">
                  <div className="gs-head"><Icon size={14} /> {label}</div>
                  {list.map(h => { idx++; const i = idx; return (
                    <button key={h.kind + h.id} role="option" aria-selected={i === active} className={"gs-item" + (i === active ? " on" : "") + (h.inactive ? " off" : "")}
                      onMouseEnter={() => setActive(i)} onMouseDown={e => { e.preventDefault(); pick(h); }}>
                      <strong>{h.title || "—"}</strong><small>{h.subtitle}</small>
                    </button>); })}
                </div>
              );
            })}
          <button className="gs-all" onMouseDown={e => { e.preventDefault(); setOpen(false); onSearchClients(q.trim()); }}>Veure la llista de clients amb «{q.trim()}»</button>
        </div>
      )}
    </div>
  );
}

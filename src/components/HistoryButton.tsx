// Botó «Historial de canvis» que obre una finestra amb qui va canviar què i quan.
import { useEffect, useState } from "react";
import { History, X } from "lucide-react";
import { listHistory, type HistoryEntry, type HistoryScope } from "../data/history";
import { errorText } from "../lib/supabase";
import { Empty, Notice } from "./ui";

const when = (v: string) => new Date(v).toLocaleString("ca-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function HistoryButton({ scope, title, label = "Historial de canvis" }: { scope: HistoryScope; title: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="cancel-btn" onClick={() => setOpen(true)}><History size={16} /> {label}</button>
      {open && <HistoryDialog scope={scope} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}

function HistoryDialog({ scope, title, onClose }: { scope: HistoryScope; title: string; onClose: () => void }) {
  const [rows, setRows] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { listHistory(scope).then(setRows).catch(e => { setRows([]); setError(errorText(e)); }); }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card history-card" role="dialog" aria-label={title}>
        <div className="modal-title history-title"><History size={18} /> {title}<button className="modal-x" onClick={onClose} aria-label="Tancar"><X size={18} /></button></div>
        {error && <Notice kind="error">{error}</Notice>}
        {!rows ? <Empty>Carregant…</Empty> : !rows.length ? <Empty>Encara no hi ha cap canvi registrat (el registre comença el 24/10/2026).</Empty> : (
          <ol className="history-list">
            {rows.map(e => (
              <li key={e.tx}>
                <div className="history-head"><strong>{when(e.when)}</strong><span>{e.user}</span></div>
                <ul>{e.lines.map((l, i) => <li key={i} className={"h-" + l.kind}>{l.text}</li>)}</ul>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

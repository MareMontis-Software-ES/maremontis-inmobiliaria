// Camp de cerca que permet triar un element d'una llista llarga (clients, finques…)
// escrivint part del nom o del número.
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export function SearchSelect<T extends { id: string; label: string }>({ label, items, value, onChange, placeholder, disabled }: {
  label: string; items: T[]; value: string; onChange: (id: string, item?: T) => void; placeholder?: string; disabled?: boolean;
}) {
  const current = items.find(i => i.id === value);
  const [text, setText] = useState(current?.label || "");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { setText(current?.label || ""); }, [value, current?.label]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const list = useMemo(() => {
    const q = norm(text.trim());
    return (q && q !== norm(current?.label || "") ? items.filter(i => norm(i.label).includes(q)) : items).slice(0, 40);
  }, [text, items, current]);

  return (
    <div className="f search-select" ref={box}>
      <span>{label}</span>
      <div className="ss-input">
        <Search size={14} />
        <input value={text} disabled={disabled} placeholder={placeholder || "Escriu per cercar…"}
          onFocus={() => setOpen(true)} onChange={e => { setText(e.target.value); setOpen(true); }} />
        {value && !disabled && <button type="button" title="Treure" onClick={() => { onChange(""); setText(""); }}><X size={13} /></button>}
      </div>
      {open && !disabled && (
        <ul className="ss-list">
          {list.map(i => <li key={i.id} className={i.id === value ? "on" : ""} onMouseDown={() => { onChange(i.id, i); setText(i.label); setOpen(false); }}>{i.label}</li>)}
          {!list.length && <li className="ss-empty">Cap coincidència</li>}
        </ul>
      )}
    </div>
  );
}

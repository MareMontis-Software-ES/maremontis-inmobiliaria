// Peces de pantalla reutilitzables. Tots els camps són CONTROLATS: el valor
// ve de l'estat i cada canvi passa per onChange (res de document.querySelector).
import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";

export function Panel({ title, icon: Icon, children, action }: { title: string; icon: any; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="data-panel">
      <div className="data-panel-title"><Icon size={18} /><strong>{title}</strong>{action && <span className="panel-action">{action}</span>}</div>
      <div className="data-panel-body">{children}</div>
    </section>
  );
}

type Opt = string | [string, string];

export function TextInput({ label, value, onChange, type = "text", placeholder, error, readOnly, list, wide, wide2, required }: {
  label: string; value: string; onChange?: (v: string) => void; type?: string; placeholder?: string;
  error?: string | null; readOnly?: boolean; list?: string; wide?: boolean; wide2?: boolean; required?: boolean;
}) {
  return (
    <label className={"f" + (wide ? " f-wide" : wide2 ? " f-wide2" : "") + (error ? " f-error" : "")}>
      <span>{label}{required && <b className="req">*</b>}</span>
      <input type={type} value={value} placeholder={placeholder} readOnly={readOnly} list={list}
        onChange={e => onChange?.(e.target.value)} />
      {error && <small>{error}</small>}
    </label>
  );
}

export function SelectInput({ label, value, onChange, options, empty, wide }: {
  label: string; value: string; onChange: (v: string) => void; options: Opt[]; empty?: string; wide?: boolean;
}) {
  return (
    <label className={"f" + (wide ? " f-wide" : "")}>
      <span>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {empty !== undefined && <option value="">{empty}</option>}
        {options.map(o => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </label>
  );
}

export function CheckInput({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="f f-check">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function TextArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="f f-wide">
      <span>{label}</span>
      <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

/** Parella etiqueta/valor per a les vistes de només lectura */
export function Info2({ label, value }: { label: string; value?: ReactNode }) {
  return <div className="info-row"><span>{label}</span><strong>{value || <em>—</em>}</strong></div>;
}

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "ok" | "warn"; children: ReactNode }) {
  return (
    <div className={"notice notice-" + kind}>
      {kind === "error" || kind === "warn" ? <AlertTriangle size={16} /> : <Info size={16} />}
      <div>{children}</div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty-line">{children}</p>;
}

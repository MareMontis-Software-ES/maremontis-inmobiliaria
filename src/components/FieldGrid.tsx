// Dibuixa un grup de camps a partir de la seva definició (veure data/finques.ts).
// En mode consulta els camps queden bloquejats, com al programa antic: es veuen
// igual però només s'editen després de prémer «Modificar».
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { FieldDef } from "../data/finques";
import { FolderPathInput } from "./FolderPathInput";

export function FieldGrid({ fields, values, onChange, editing, errors = {} }: {
  fields: FieldDef[];
  values: Record<string, string>;
  onChange: (k: string, v: string) => void;
  editing: boolean;
  errors?: Record<string, string | null>;
}) {
  return (
    <div className="form-grid">
      {fields.map(f => <FieldInput key={f.k} def={f} value={values[f.k] ?? ""} editing={editing} error={errors[f.k] || null} onChange={v => onChange(f.k, v)} />)}
    </div>
  );
}

function FieldInput({ def, value, onChange, editing, error }: { def: FieldDef; value: string; onChange: (v: string) => void; editing: boolean; error: string | null }) {
  const [show, setShow] = useState(false);
  const cls = "f" + (def.wide || def.type === "textarea" ? " f-wide" : "") + (error ? " f-error" : "") + (!editing ? " f-locked" : "");
  const label = <span>{def.label}{def.required && editing && <b className="req">*</b>}</span>;

  if (def.type === "folder") {
    return <FolderPathInput label={def.label} kind="finca" value={value} readOnly={!editing} onChange={onChange} placeholder="P:\\ADMINISTRACIO\\FINQUES\\..." />;
  }
  if (def.type === "textarea") {
    return <label className={cls}>{label}<textarea rows={3} value={value} readOnly={!editing} onChange={e => onChange(e.target.value)} /></label>;
  }
  if (def.type === "select") {
    return (
      <label className={cls}>{label}
        <select value={value} disabled={!editing} onChange={e => onChange(e.target.value)}>
          <option value="">—</option>
          {value && !def.options?.some(o => o[0] === value) && <option value={value}>{value}</option>}
          {def.options?.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
    );
  }
  if (def.type === "password") {
    return (
      <label className={cls}>{label}
        <span className="pw-wrap">
          <input type={show ? "text" : "password"} value={value} readOnly={!editing} autoComplete="off" onChange={e => onChange(e.target.value)} />
          {value && <button type="button" className="pw-eye" title={show ? "Amagar" : "Mostrar"} onClick={() => setShow(x => !x)}>{show ? <EyeOff size={14} /> : <Eye size={14} />}</button>}
        </span>
      </label>
    );
  }
  const type = def.type === "date" ? "date" : def.type === "num" || def.type === "money" ? "number" : "text";
  return (
    <label className={cls}>{label}
      <input type={type} step={def.type === "money" ? "0.01" : undefined} value={value} readOnly={!editing} onChange={e => onChange(e.target.value)} />
      {error && <small>{error}</small>}
    </label>
  );
}

import { useEffect, useState } from "react";
import { CircleHelp, X } from "lucide-react";
import type { Section } from "../../types";

// Modus d'ús del programa, pantalla per pantalla.
// De moment només hi ha el resum de cada pantalla; les explicacions completes s'aniran afegint aquí.
const SCREENS: [Section, string][] = [
  ["Inici", "Resum de l'activitat del dia: alertes pendents, tasques d'avui, agenda i venciments propers."],
  ["Clients", "Cercar un client i obrir la seva fitxa. Des de la fitxa es gestionen totes les seves finques."],
  ["Immobles", "Llistat de totes les finques administrades. Cada finca s'obre dins la fitxa del seu titular."],
  ["Alertes", "Avisos amb data: venciments, caducitats, trucades pendents…"],
  ["Claus", "Control de les claus: qui les té i quan s'han de retornar."],
  ["Incidències", "Anotacions vinculades a client, finca i industrial, i notes de servei."],
  ["Revisions", "Revisions periòdiques de les cases, també des de la tauleta."],
  ["Contractes", "Tipus de contracte i serveis que inclou cadascun."],
  ["Industrials", "Fitxa dels industrials i proveïdors."],
  ["Impostos", "Model 210, IBI i altres impostos de les finques."],
  ["Estadístiques", "Llistats i estadístiques a mida, amb exportació a Excel i PDF."],
  ["Configuració", "Paràmetres de l'empresa, usuaris, permisos, correu i felicitacions."],
];

export function HelpPanel({ section, onClose }: { section: Section; onClose: () => void }) {
  const [current, setCurrent] = useState<Section>(section);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  const summary = SCREENS.find(([s]) => s === current)?.[1];
  return (
    <div className="modal-back" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card help-card" role="dialog" aria-label="Ajuda">
        <div className="modal-title help-title"><CircleHelp size={18} />Modus d'ús del programa<button aria-label="Tancar" onClick={onClose}><X size={18} /></button></div>
        <div className="help-body">
          <nav className="help-nav">
            {SCREENS.map(([s]) => <button key={s} className={s === current ? "on" : ""} onClick={() => setCurrent(s)}>{s}</button>)}
          </nav>
          <section className="help-content">
            <h2>{current}</h2>
            <p>{summary}</p>
            <p className="help-pending">Les explicacions detallades d'aquesta pantalla (amb imatges i passos) s'afegiran properament.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

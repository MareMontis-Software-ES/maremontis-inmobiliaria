// Pantalla provisional per als mòduls encara no desenvolupats. Mostra què
// demanen els PDF, perquè ningú es pensi que ja funciona.
import { Construction } from "lucide-react";
import type { Section } from "../../types";

const REQUIREMENTS: Partial<Record<Section, { phase: string; items: string[] }>> = {
  Alertes: { phase: "Fase 5", items: [
    "Llistat global de totes les alertes per data (ja es poden crear i completar des de la fitxa de cada client).",
    "Exportar al calendari o enviar per correu.",
    "Històric de completades durant 6 mesos.",
  ] },
  Claus: { phase: "Fase 5", items: [
    "Data entregat, entregat per, entregat a (industrial), motiu, observacions.",
    "Data estimada de retorn (1 setmana, editable) i data de retorn real.",
    "Alerta quan no s'ha tornat a la data estimada. Accessible des de l'Inici i des de la finca.",
  ] },
  Incidències: { phase: "Fase 5", items: [
    "Incidències vinculades a client, immoble i industrial; catalogar si s'han de gestionar o no.",
    "Notes de servei en PDF amb enviament directe per e-mail a l'industrial, sense facturació.",
    "Seguiment: qui la crea/modifica, confirmació d'enviament i feina completada.",
  ] },
  Revisions: { phase: "Fase 4", items: [
    "Planificació octubre–juny (fora de Nadal i Setmana Santa) cada 2,5 mesos, editable, segons contracte.",
    "Lectures (la «lectura anterior» s'agafa de l'última revisió) i núm. de comptador.",
    "Fotos d'inventari i de cada revisió amb nom descriptiu.",
    "Correu al responsable (només elements en «mal estat») i al propietari en el seu idioma.",
  ] },
  Contractes: { phase: "Fase 3", items: [
    "Taula de tipus de contracte: descripció, preu, núm. de revisions.",
    "Opcions: revisió immoble, renda mod. 210, visites, custòdia de claus, rebuts — habiliten les funcions de cada finca.",
  ] },
  Industrials: { phase: "Fase 5", items: ["Manteniment d'industrials (nom, ofici, contacte, telèfon, e-mail)."] },
  Impostos: { phase: "Fase 6", items: [
    "Importació de fitxers d'IBI.",
    "Model 210 i fitxer NRC del banc (validar la fórmula amb l'assessoria).",
    "Exportació a comptabilitat (dBase/ODBC «DBF_CEIGRUP») amb els mateixos noms de camp.",
  ] },
  Configuració: { phase: "Fase 7", items: ["Usuaris i permisos (rols admin / oficina / consulta ja creats a la base de dades).", "Zones, textos de correu per idioma."] },
};

export function PendingModule({ section }: { section: Section }) {
  const req = REQUIREMENTS[section];
  return (
    <div className="work-area list-view">
      <div className="page-title"><div><small>MÒDUL EN PREPARACIÓ</small><h1>{section}</h1><p>Aquesta part encara no està desenvolupada{req ? ` (${req.phase})` : ""}.</p></div></div>
      <section className="data-panel pending-panel">
        <div className="data-panel-title"><Construction size={18} /><strong>Què ha de fer, segons els PDF</strong></div>
        <div className="data-panel-body">
          <ul>{(req?.items || ["Pendent de definir."]).map(t => <li key={t}>{t}</li>)}</ul>
          <p className="hint">Les taules d'aquest mòdul ja estan creades a <code>supabase/migrations</code>.</p>
        </div>
      </section>
    </div>
  );
}

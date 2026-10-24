# Estat del programa nou respecte al programa antic i les anotacions dels PDF

Llegenda: ✅ fet i provat · 🟡 fet en part / cal validar · ⏳ pendent · ❌ eliminat (ratllat al PDF)

## Com estava organitzat el programa antic

- **Entrada principal**: DADES · INCIDÈNCIES · RENDA · LLISTATS · REINDEXAR · ENTRADES MASSIVES · CONTROL DE LES CASES.
- **DADES** → Relació de clients/immobles (cerca per codi, cognom o immoble) → **fitxa del client** amb capçalera (client + «altres propietats») i pestanyes CLIENTS · FINQUES · IMPOSTOS · CÒNJUGE-COPROPIETARI · MATRÍCULES. Tot gira al voltant del client; la finca es tria a la capçalera.
- **INCIDÈNCIES** per client: llista (data, qui, immoble) + dades de la incidència.
- **CONTROL DE LES CASES** (programa a part): llistat de cases, fitxes exterior/interior amb industrials, revisions, correus i imatges.
- **RENDA**: llistats de pagaments i del Model 210, fitxer AEAT i fitxer NRC del banc.
- Comptabilitat llegeix les dades per **ODBC** (dBase `DBF_CEIGRUP`).

El programa nou manté aquesta lògica (tot des del client) però unifica els dos programes en un de sol.

## Pantalla per pantalla

| Pantalla antiga | Anotacions del PDF | Programa nou | Estat |
|---|---|---|---|
| Entrada / usuari i clau | — | Login segur amb usuaris i permisos (admin / oficina / consulta) | ✅ |
| Relació clients/immobles | Alertes visibles des de qualsevol pestanya | Llista de clients + fitxa amb panell d'alertes sempre visible | ✅ |
| Buscador general (barra de dalt) | — (millora nova) | Busca a la vegada clients (nom, codi, 430…, DNI/NIE/passaport, telèfon, e-mail), finques (adreça, nom AEAT, núm. d'administració), matrícules i cònjuges/copropietaris; sense tenir en compte accents. Resultats agrupats; en triar-ne un s'obre directament la fitxa (la finca dins la fitxa del titular; la matrícula i el cònjuge a la seva pestanya). Fletxes + Enter. Funció `global_search` (respecta els permisos) | ✅ |
| Alta client | Responsable assignat; tipus de via desplegable; varis telèfons (tipus, prefix) i e-mails (tipus); codi sense 430 | Tot inclòs; subcompte 430 automàtic; validació DNI/NIE | ✅ |
| Alta client | Camp «Documental» (ruta) | Inclòs | ✅ |
| Avís de duplicats (alta/modificació de client) | — (millora nova) | Mentre s'escriu i en gravar, avisa si un altre client té el mateix DNI, NIE o passaport (es comparen entre ells, sense espais ni guions), telèfon (només xifres, sense prefix) o e-mail. No bloqueja: demana confirmació. Funció `find_client_duplicates` | ✅ |
| Historial de canvis (client, finca, impostos) | — (millora nova) | Botó «Historial de canvis» a la fitxa del client (barra de baix), a la pestanya Finca i a Impostos: data i hora, usuari i cada camp amb el valor anterior → nou; altes i baixes de telèfons, e-mails, adreça, matrícules, cònjuges/copropietaris i titulars. Taula `audit_log` omplerta per triggers (no es pot escriure des de l'app); les claus d'internet i alarma surten «••••». Registra des del 24/10/2026 | ✅ |
| Alta immoble | Núm. administració = armari de claus; en donar de baixa queda lliure | Proposa el primer número lliure; avisa si està ocupat; reutilitza els de baixes | ✅ |
| Alta immoble | Quina oficina té la clau; tipus via + adreça; treure data | Inclòs | ✅ |
| Dades generals (client) | Adreça de correspondència ratllada | Eliminada | ❌ |
| Finques | Lloguer turístic/urbà; % propietat; data de baixa no elimina | Inclòs (titulars amb %; baixa lògica) | ✅ |
| Finques | Internet, alarma (2 claus), assegurança (pòlissa, inici, fi), cèdula (caducitat + alerta), certificat energètic (data, 2 codis + alerta), HUT, NRUA, CUPS | Inclòs; alertes automàtiques de venciment | ✅ |
| Finques | Manteniment de claus per immoble | Pestanya Claus i menú Claus | ✅ |
| Impostos | % en propietat; fórmules base i quota | Per any; càlcul automàtic; part del client segons % | ✅ |
| Cònjuge-copropietari | Juntar amb l'alta de client; varis copropietaris amb %, adreça, telèfons i e-mail | Inclòs a l'alta del client | ✅ |
| Matrícules | Marca i model | Inclòs | ✅ |
| Incidències | Treure hora, temps, queixa/felicitació i albarans | Eliminats | ❌ |
| Incidències | Catalogar si cal gestionar; vincular client, immoble i industrial | Inclòs (global i a la fitxa del client) | ✅ |
| Notes (Manteniment & Serveis) | Sense facturació; PDF per enviar a l'industrial i enviament directe per e-mail; qui la crea/modifica; confirmació d'enviament; feina completada | Inclòs. L'enviament obre el programa de correu amb el text ja escrit | 🟡 (correu automàtic sense obrir Outlook: veure pendents) |
| Mant. control claus | Data entregat, entregat per, a qui (industrial), motiu, observacions, data retorn; retorn previst +1 setmana; alerta si no torna | Inclòs | ✅ |
| Històric baixes | Fitxa amb contacte, immoble, impostos, piscina/jardí (sense subministraments); «Recuperar immoble» | Immobles → «Històric de baixes»: llista com l'antiga (codi, nom, cognoms, immoble, zona, núm. adm., data i usuari) amb filtres per codi, cognoms i immoble. Fitxa de baixa amb Anterior/Següent: contacte del client (telèfons, e-mails, adreça, idioma), altres titulars, dades de la finca, AEAT, contracte, assegurança i certificats, jardí i piscina, i impostos per any amb dades registrals. Sense subministraments, internet ni alarma. Botó «Recuperar immoble» que pregunta a quin propietari pertany (funció `recover_property`, en una sola transacció; si el núm. d'armari està ocupat se n'assigna un de lliure) | ✅ |
| Control cases – llistat | Filtrar per data per saber què s'ha de revisar | Pròxima revisió calculada i filtre «a revisar fins al…»; exportació Excel | ✅ |
| Fitxa exterior | Núm. revisions i càlcul de les següents; comunitat de propietaris i contacte; contacte i ref. comptador a aigua/llum/gas; tipus instal·lació gas; treure sauna i mobles | Inclòs | ✅ |
| Fitxa interior | Contacte ascensor; fusteria; wifi/internet amb tel. assignat; treure electrodomèstics | Inclòs (+ Humidry) | ✅ |
| Revisió | Lectura anterior de l'última revisió; lectura actual per a tots; núm. comptador; observacions de les fitxes; afegir cuina, neteja, Humidry/falta sal; treure buidar canonades i televisió | Inclòs | ✅ |
| Revisions fetes | Afegir observació; notes d'avís + seguiment | Llista amb resum; botó «Crear incidència» → nota de servei | ✅ |
| Informe de revisió | — (millora nova) | Botons «Informe PDF» i «Imprimir informe» a cada revisió gravada: capçalera de la finca i el client, elements a revisar destacats en vermell, lectures (anterior i actual), alarma/calefacció, estat de cada element, observacions i fotos de la revisió. Per adjuntar-lo al correu es descarrega i s'afegeix des del programa de correu | ✅ (l'informe és en català) |
| Correu responsables | DE = correu del responsable; només elements en mal estat + observació | Inclòs | ✅ |
| Correu propietari | En l'idioma del client; textos editables | Inclòs (Configuració → Textos de correu). Textos «revisió feta» i «revisió amb incidències» en català, castellà, anglès, francès, alemany i neerlandès, a partir del text anglès del PDF; la llista d'elements a revisar també es tradueix. Els traduïts surten «Pendent de revisar» fins que l'oficina els grava com a revisats (i en preparar el correu surt un avís). Amb incidències mai es fa servir el text «tot correcte». Textos per revisar a `docs/TEXTOS_CORREU.md` | 🟡 (falta que l'oficina revisi les traduccions) |
| Imatges | Nom descriptiu; fotos genèriques d'inventari + específiques de cada revisió | Inclòs. Botons «Fer foto» (obre la càmera del mòbil/tauleta) i «Galeria»; les fotos es redueixen a 1920 px abans de pujar-les; en una revisió nova es poden fer fotos abans de gravar i es pugen en gravar. Bucket `fotos` privat, només imatges de fins a 15 MB | ✅ (permisos del bucket provats a Supabase; falta una prova amb el mòbil real) |
| Revisió des del mòbil o la tauleta | — (millora nova) | Revisions → casa → Nova revisió adaptada a pantalla tàctil: botons grans Bon/Mal, Dins/Fora i Avisar, lectures amb teclat numèric, «Marcar com a Bon tot el que falta», barra de Gravar sempre visible a baix | ✅ |
| Tipus de contracte | Taula amb descripció, preu, núm. revisions i opcions (revisió, renda 210, visites, claus, rebuts) | Inclòs (menú Contractes). A la fitxa, les pestanyes Impostos, Claus i Revisions s'amaguen si el contracte de la finca no les inclou; el llistat de Renda/M-210 i la nova entrega de claus només mostren les finques amb el servei (el control de cases ja calculava les revisions segons el contracte). Sense contracte assignat, tot habilitat | ✅ (visites i rebuts: encara no hi ha cap funció a amagar) |
| Planificació revisions | Octubre–juny, sense Nadal ni Setmana Santa, cada 2,5 mesos, editable; complementàries | Inclòs | ✅ |
| Renda / M-210 | Llistat M-210, pagaments, filtres per cognom i zona | Resum per exercici, marcar pagats, llistat M-210 i exportació Excel | 🟡 (fórmula a validar) |
| Fitxer AEAT i NRC | Generar fitxer per a l'AEAT i comprovar el retorn del banc | — | ⏳ (cal l'especificació dels fitxers) |
| Importació IBI | Incorporar fitxers d'IBI | Importació de CSV per referència cadastral | 🟡 (cal un exemple del fitxer real) |
| Comptabilitat | ODBC a la taula d'immobles amb els mateixos noms de camp; «Impostos pagament = S» + data; factures d'inici d'any només clients no de baixa | — | ⏳ |
| Llistats | — | Exportació Excel a Claus, Revisions i Impostos | 🟡 |
| Estadístiques | Estadístiques i informes calculats sobre les dades (sense detallar) | Menú Estadístiques (només consulta): cartera de clients i finques (residents, població, zona, contracte, lloguer, idioma, país, baixes per any) i activitat per any (revisions i incidències per mes, notes de servei, alertes, claus, impostos) | 🟡 (informes concrets a validar) |
| Còpia de seguretat | — | Configuració → Còpia de seguretat: un Excel amb un full per taula i un full «Resum» (només administradors, només lectura; les fotos no s'hi inclouen) | ✅ |
| SMS | Botó a la pantalla antiga | — | ⏳ (no s'esmenta a les anotacions) |
| Reindexar | Manteniment de la base de dades antiga | No cal (Supabase/PostgreSQL) | ❌ |
| Entrades massives | — | Importació IBI; la resta, per definir | ⏳ |

## Què falta i què necessitem per fer-ho

1. **Fitxers AEAT (Model 210) i NRC del banc** → un exemple real de cada fitxer (enviat i retornat) o el document de format del banc i de l'AEAT.
2. **Exportació a comptabilitat (ODBC/dBase)** → la llista exacta de taules i noms de camp que llegeix el programa comptable. Com que les dades ja no són a `P:\ADMINISTRACIO\ADMIN`, caldrà un petit procés (a l'app d'escriptori) que generi els `.DBF` amb els mateixos noms, o bé connectar el programa comptable directament a PostgreSQL.
3. **Fórmula del Model 210** → confirmar amb l'assessoria (el PDF aplica dues vegades el tipus de gravamen).
4. **Fitxer d'IBI real** → per adaptar la importació al format oficial.
5. **Enviament de correu sense obrir Outlook** (amb fotos adjuntes) → cal un servei de correu (p. ex. el compte SMTP de l'empresa o Resend) i una funció al servidor.
6. ~~**Tipus de contracte que habiliten funcions**~~ → fet. Queda pendent quan existeixin les funcions de visites i rebuts.
7. **Migració de les dades reals** del programa antic (DBF) → importació inicial de clients, finques, impostos, incidències i historial.

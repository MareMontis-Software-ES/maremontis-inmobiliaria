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
| Alta client | Responsable assignat; tipus de via desplegable; varis telèfons (tipus, prefix) i e-mails (tipus); codi sense 430 | Tot inclòs; subcompte 430 automàtic; validació DNI/NIE | ✅ |
| Alta client | Camp «Documental» (ruta) | Inclòs | ✅ |
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
| Històric baixes | Fitxa amb contacte, immoble, impostos, piscina/jardí (sense subministraments); «Recuperar immoble» | Les finques no s'esborren mai: filtre «Històric de baixes» a Immobles i botó «Recuperar finca» | 🟡 (recuperar triant un altre propietari: es fa canviant titulars) |
| Control cases – llistat | Filtrar per data per saber què s'ha de revisar | Pròxima revisió calculada i filtre «a revisar fins al…»; exportació Excel | ✅ |
| Fitxa exterior | Núm. revisions i càlcul de les següents; comunitat de propietaris i contacte; contacte i ref. comptador a aigua/llum/gas; tipus instal·lació gas; treure sauna i mobles | Inclòs | ✅ |
| Fitxa interior | Contacte ascensor; fusteria; wifi/internet amb tel. assignat; treure electrodomèstics | Inclòs (+ Humidry) | ✅ |
| Revisió | Lectura anterior de l'última revisió; lectura actual per a tots; núm. comptador; observacions de les fitxes; afegir cuina, neteja, Humidry/falta sal; treure buidar canonades i televisió | Inclòs | ✅ |
| Revisions fetes | Afegir observació; notes d'avís + seguiment | Llista amb resum; botó «Crear incidència» → nota de servei | ✅ |
| Correu responsables | DE = correu del responsable; només elements en mal estat + observació | Inclòs | ✅ |
| Correu propietari | En l'idioma del client; textos editables | Inclòs (Configuració → Textos de correu) | ✅ (falta escriure els textos en cada idioma) |
| Imatges | Nom descriptiu; fotos genèriques d'inventari + específiques de cada revisió | Inclòs | ✅ (cal provar-ho amb fotos reals) |
| Tipus de contracte | Taula amb descripció, preu, núm. revisions i opcions (revisió, renda 210, visites, claus, rebuts) | Inclòs (menú Contractes). A la fitxa, les pestanyes Impostos, Claus i Revisions s'amaguen si el contracte de la finca no les inclou; el llistat de Renda/M-210 i la nova entrega de claus només mostren les finques amb el servei (el control de cases ja calculava les revisions segons el contracte). Sense contracte assignat, tot habilitat | ✅ (visites i rebuts: encara no hi ha cap funció a amagar) |
| Planificació revisions | Octubre–juny, sense Nadal ni Setmana Santa, cada 2,5 mesos, editable; complementàries | Inclòs | ✅ |
| Renda / M-210 | Llistat M-210, pagaments, filtres per cognom i zona | Resum per exercici, marcar pagats, llistat M-210 i exportació Excel | 🟡 (fórmula a validar) |
| Fitxer AEAT i NRC | Generar fitxer per a l'AEAT i comprovar el retorn del banc | — | ⏳ (cal l'especificació dels fitxers) |
| Importació IBI | Incorporar fitxers d'IBI | Importació de CSV per referència cadastral | 🟡 (cal un exemple del fitxer real) |
| Comptabilitat | ODBC a la taula d'immobles amb els mateixos noms de camp; «Impostos pagament = S» + data; factures d'inici d'any només clients no de baixa | — | ⏳ |
| Llistats | — | Exportació Excel a Claus, Revisions i Impostos | 🟡 |
| Estadístiques | Estadístiques i informes calculats sobre les dades (sense detallar) | Menú Estadístiques (només consulta): cartera de clients i finques (residents, població, zona, contracte, lloguer, idioma, país, baixes per any) i activitat per any (revisions i incidències per mes, notes de servei, alertes, claus, impostos) | 🟡 (informes concrets a validar) |
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

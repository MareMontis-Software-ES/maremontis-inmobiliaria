# MareMontis · Administració immobiliària — guia per treballar en aquest projecte

## Què és
Modernització del programa antic d'administració de finques de l'empresa (Ceigrup / «Programa Administració»).
Ha de fer el mateix que l'antic, però més simple i més clar. **Tot gira al voltant del client**: es busca el
client, s'obre la seva fitxa (en una pestanya), i des d'allà es gestionen totes les seves finques.

- Requisits: `docs/PLAN_FUNCIONAL_PDF.md`
- Què està fet i què falta, pantalla per pantalla: `docs/ESTAT_RESPECTE_PDF.md` (mantenir-lo actualitzat)
- Els PDF originals amb les pantalles antigues i les anotacions NO són al repositori (contenen dades de clients):
  l'usuària els adjunta quan calgui.

## Tecnologia
- React 18 + TypeScript + Vite. Escriptori: Electron (`electron/main.cjs`).
- Base de dades i usuaris: Supabase (projecte **INMO**, ref `gawnzjkxralfimlcnury`, regió eu-west-1).
- Publicació: Vercel, automàtica en cada push a `main` → https://maremontis-inmobiliaria.vercel.app
- Comandes: `npm install` · `npm run dev` (Vite + Electron) · `npx vite` (només web) · `npm run build` (ha de passar sense errors).

## Estructura
```
src/lib/          supabase.ts (connexió + clau publicable per defecte), format.ts, constants.ts
src/data/         TOT l'accés a dades (un fitxer per àrea). Les pantalles no criden Supabase directament.
src/components/   peces reutilitzables (ui.tsx, FieldGrid, SearchSelect)
src/modules/      una carpeta per mòdul: clients, finques, cases (revisions), incidents, alerts, taxes, admin, dashboard, layout, auth
src/ui/           App.tsx (navegació), styles.css, modules.css
supabase/migrations/  esquema de la BD, numerat. MAI editar una migració ja aplicada: crear-ne una de nova.
supabase/esborrar_dades_prova.sql  esborra les dades d'exemple («DADES DE PROVA»)
```

## Regles
- Interfície en **català**. Noms de taules i camps en anglès.
- No posar mai dades inventades presentades com a reals. Les dades d'exemple porten «DADES DE PROVA» a observacions
  (o «(exemple)» al nom) i s'esborren amb `supabase/esborrar_dades_prova.sql`.
- Seguretat: RLS activat a totes les taules; rols a `admi_users.role` (`admin` / `oficina` / `consulta`).
  No desactivar RLS ni fer públiques les taules. Mai posar la clau `service_role` al codi.
- Les finques i els clients **no s'esborren**: es donen de baixa (cal l'històric per al Model 210 de l'any següent).
  El núm. d'administració (= armari de claus) queda lliure en donar de baixa una finca.
- Canvis a la base de dades: nova migració a `supabase/migrations/` i aplicar-la a Supabase (SQL Editor o CLI).
- Abans de pujar: `npm run build` sense errors i provar el flux a la pantalla.
- Treballar en una branca i obrir un pull request; `main` es publica automàticament.

## Pendent (veure docs/ESTAT_RESPECTE_PDF.md)
1. Fitxer AEAT del Model 210 i fitxer NRC del banc (+ comprovació del retorn) — cal l'especificació/exemples.
2. Exportació a comptabilitat: el programa comptable llegia per ODBC (dBase, DSN `DBF_CEIGRUP`, carpeta
   `P:\ADMINISTRACIO\ADMIN`) amb els mateixos noms de camp. Cal generar els `.DBF` des de Supabase
   (procés a l'app d'escriptori o script a part). Importació «Impostos pagament = S» + data de pagament;
   factures d'administració d'inici d'any només de clients no donats de baixa.
3. Fórmula del Model 210 a validar amb l'assessoria (el PDF aplica dues vegades el tipus de gravamen).
4. Adaptar la importació d'IBI al format real del fitxer.
5. Enviament de correus directe (sense obrir Outlook) i amb fotos adjuntes. Ja hi ha SMTP configurable (Configuració → Correu sortint)
   i la funció `supabase/functions/admi-felicitacions` (felicitacions automàtiques); falta fer-la servir per a notes i revisions.
6. ~~Que el tipus de contracte amagui les funcions que no inclou~~ (fet: `contractFeatures()` a `src/data/admin.ts`; sense contracte, tot habilitat).
7. Migració de les dades reals del programa antic.
8. ~~Provar la pujada de fotos amb el Supabase real~~ (permisos del bucket `fotos` provats; falta una prova des d'un mòbil real).
9. ~~Reanomenar les taules existents amb el prefix `admi_`~~ (fet: migració `20261025000002`; noms descriptius, p. ex. `admi_users`, `admi_change_history`, `admi_tradespeople`).

# MareMontis · Administració immobiliària

Modernització del programa d'administració antic (Ceigrup). Els requisits són a `docs/PLAN_FUNCIONAL_PDF.md`.

## Com està organitzat

```
supabase/
  migrations/20261023000001_esquema_inicial.sql   ← TOTES les taules, regles de seguretat i funcions
  reset_dev.sql                                   ← esborra-ho tot (només base de PROVES)
src/
  lib/          supabase.ts (connexió), format.ts (dates, 430…, DNI), constants.ts (desplegables)
  data/         accés a la base de dades (un fitxer per mòdul). Les pantalles NO criden Supabase directament
  components/   peces reutilitzables (camps, panells, avisos)
  modules/
    auth/       pantalla d'accés
    layout/     menú lateral i barra superior
    dashboard/  Inici (només dades reals)
    clients/    llista, fitxa i formulari d'alta/modificació  ← FET
    alerts/     panell d'alertes (dins la fitxa del client)    ← FET
    properties/ llista i consulta d'immobles                   ← parcial (fase 2)
    pending/    pantalla provisional dels mòduls pendents
  ui/           App.tsx (navegació), styles.css, modules.css
```

Regla per continuar: **un mòdul nou = una carpeta a `src/modules/` + un fitxer a `src/data/`**. Si cal una taula o camp nou, es crea un fitxer nou a `supabase/migrations/` (mai modificar el que ja s'ha aplicat a producció).

## Posar-ho en marxa

1. **Base de dades (Supabase → SQL Editor)**
   - Base de proves amb dades velles: executa primer `supabase/reset_dev.sql`.
   - Executa `supabase/migrations/20261023000001_esquema_inicial.sql`.
   - Cada usuari que es crea a *Authentication* rep automàticament un perfil amb rol `consulta`. Per donar-li permisos:
     ```sql
     update profiles set role = 'admin', is_responsible = true, full_name = 'Nom Cognom'
     where email = 'usuari@empresa.com';
     ```
     Rols: `admin` (tot), `oficina` (crear/modificar), `consulta` (només lectura). `is_responsible` = surt al desplegable «Responsable assignat».
     Si l'usuari ja existia abans d'executar l'script, crea-li el perfil a mà:
     ```sql
     insert into profiles (id, email, full_name, role, is_responsible)
     select id, email, 'Nom Cognom', 'admin', true from auth.users where email = 'usuari@empresa.com';
     ```
2. **Configuració**: copia `.env.example` a `.env` i omple la URL i la clau publicable del projecte Supabase.
3. **Executar**: `npm install` i després `npm run dev` (obre l'app d'escriptori Electron).
4. **Comprovar abans de pujar**: `npm run build` ha d'acabar sense errors.

## Estat

| Fase | Mòdul | Estat |
|---|---|---|
| 1 | Base de dades completa + seguretat per rols | ✅ |
| 2a | Clients: alta, modificació, baixa lògica, varis telèfons/e-mails, cònjuge i copropietaris, matrícules, ruta documental, responsable | ✅ |
| 2a | Alertes del client (data de gestió, checklist, històric 6 mesos, caducitat de passaports i aniversaris automàtics) | ✅ |
| 2b | Immobles: alta amb núm. d'administració reutilitzable, titulars amb %, fitxa completa | ⏳ |
| 3 | Tipus de contracte | ⏳ |
| 4 | Revisions / control de cases | ⏳ |
| 5 | Claus, incidències, notes de servei, industrials | ⏳ |
| 6 | Impostos, model 210, NRC, exportació comptable (dBase/ODBC) | ⏳ |
| 7 | Configuració, permisos a la interfície, estadístiques | ⏳ |

# Plan de completar INMO según los PDF

## Objetivo y reglas de trabajo
Completar la aplicación existente de MareMontis Inmobiliaria conservando el diseño y los flujos ya iniciados. No reconstruir desde cero ni sustituir las pantallas por una maqueta simplificada. No presentar datos ficticios como reales. No desplegar cambios incompletos directamente a producción.

## Estado comprobado en el código actual
- La interfaz usa React, TypeScript y Vite.
- El componente principal está concentrado en `src/ui/App.tsx`; los estilos, en `src/ui/styles.css`.
- Clientes y fincas muestran datos de ejemplo definidos en el código.
- La mayoría de los campos se renderizan con `defaultValue`, no con un modelo persistente; guardar no persiste los cambios.
- Las pestañas de las fichas cambian el rótulo seleccionado, pero no renderizan su contenido específico.
- El Inicio contiene cifras, fechas, tareas y alertas de ejemplo.
- La navegación contiene Inicio, Clientes/Propietarios, Inmuebles, Revisiones, Incidencias, Gestión económica, Estadísticas y Configuración; faltan accesos operativos separados para Alertas, Llaves, Notas de servicio, Contratos, Documentación, Industriales e Impuestos.

## Requisitos extraídos de PROGRAMA ADMINISTRACIO.pdf y PROGRAMA_20ADMINISTRACIO_2.pdf

### 1. Clientes y propietarios
- Código de cliente y número de administración.
- Tratamiento, nombre, apellidos, nombre reducido, NIF/CIF y responsable asignado.
- Dirección estructurada: tipo de vía, dirección, zona, municipio, código postal, provincia y país.
- Varios teléfonos con tipo, prefijo internacional y número; varios correos con tipo.
- Idioma, nacionalidad, fecha y lugar de nacimiento, código postal del país de nacimiento, NIE/DNI.
- Campo Documental para la ruta o ubicación de documentos.
- Cónyuge y varios copropietarios integrados en la gestión de clientes; cada titular con porcentaje de propiedad, dirección y contactos.
- Varios vehículos/matrículas, incluyendo marca y modelo.
- Separar observaciones de alertas.

### 2. Inmuebles / fincas
- Datos completos de identificación, dirección, zona, municipio, número de administración y control de numeración del armario de llaves.
- Asociación a uno o varios titulares con porcentaje de propiedad.
- Uso de alquiler turístico/urbano.
- Datos catastrales y registrales que correspondan.
- Contrato asociado y sus prestaciones.
- Datos de Internet (compañía, usuario, contraseña y área de cliente), alarma, seguros, cédula de habitabilidad, certificado energético, HUT y NRUA.
- Equipamientos, instalaciones, datos interiores/exteriores y contactos de industriales.
- Custodia de llaves en la ficha del inmueble.
- Documentación, observaciones, revisiones, incidencias e historial vinculados.
- Una finca dada de baja no se elimina físicamente: mantener la información histórica necesaria, especialmente la fiscal del ejercicio siguiente. El número de administración/armario debe quedar disponible para reutilización cuando proceda.
- El histórico de bajas conserva contactos, datos de finca e impuestos, y la información de mantenimiento de piscina y jardín; el PDF indica que no hace falta guardar los suministros en ese histórico.

### 3. Tipos de contrato
Tabla configurable con descripción, precio, número de revisiones y opciones booleanas para revisión del inmueble, renta/Modelo 210, visitas, custodia de llaves y recibos. Estas opciones determinan qué funciones están habilitadas para cada finca.

### 4. Revisiones y control de casas
- Calendario/planificación de revisiones de octubre a junio, excluyendo Navidad y Semana Santa; periodicidad orientativa cada 2,5 meses, editable y condicionada al contrato.
- Añadir revisiones complementarias.
- Fecha de inicio y número de revisiones; cálculo de las siguientes fechas.
- Filtro por fecha para localizar fincas que deben revisarse.
- Registrar lecturas anteriores/actuales y número de contador; la lectura anterior se recupera de la última revisión.
- Incluir observaciones de las fichas interior/exterior.
- Equipamientos: teléfono/Internet, baños, cocina, limpieza y Humidry; separar el descalcificador. El PDF complementario aclara que el control de Humidry se hace durante la revisión programada o a petición del cliente, y que se eliminan las fechas de inicio/caducidad previstas para ese elemento.
- Fotos genéricas de inventario y fotos específicas de cada revisión, con nombre descriptivo; mínimo una foto según el documento.
- Historial de revisiones y notas de aviso/seguimiento.
- Correo del estado de revisión al responsable y al propietario en el idioma configurado para el cliente. Para el correo de estado, incluir únicamente elementos marcados como «Mal estado» y sus observaciones.

### 5. Incidencias y notas de servicio
- Incidencias clasificables como informativas o que requieren gestión.
- Vinculación con finca, cliente e industrial.
- Incidencias detectadas en revisiones comunicables al industrial, sin facturación.
- Crear notas de servicio en PDF, con envío por correo al industrial.
- Registrar autor y modificador, confirmación de envío y estado de finalización del trabajo.
- Sin opción de facturación para las notas de servicio.

### 6. Custodia de llaves
- Módulo accesible desde Inicio y vinculado a la finca.
- Fecha de entrega, finca, entregado por, destinatario/industrial, fecha estimada de devolución (una semana después por defecto, editable) y fecha real de devolución.
- Alerta si no se devuelve en la fecha estimada.

### 7. Alertas
- Registro con fecha de inicio, propietario de la finca, observaciones y fecha de finalización.
- Crear alertas manuales y predeterminadas por caducidad de documentos de identidad/fechas de nacimiento.
- Fecha de gestión editable; completar mediante checklist.
- En Inicio, ordenadas por fecha; consultables desde cualquier pestaña.
- Alertas completadas al histórico durante seis meses; las pendientes y no vencidas siguen visibles.
- Posibilidad de llevarlas al calendario o gestionarlas por correo.

### 8. Impuestos, Modelo 210 y contabilidad
- Importar datos de IBI.
- Base imponible = valor catastral * revalorización / 100.
- Cuota de renta = base imponible * tipo de gravamen / 100.
- Gestionar propietarios/copropietarios, pagos, Modelo 210 y datos NRC/AEAT. La fórmula de cuota a pagar transcrita en el PDF debe validarse con el cliente/asesoría antes de producción.
- Importar datos del programa actual para contabilidad, respetando exactamente los nombres de campos existentes.
- La fecha de pago y el indicador «Impostos pagament» = «S» condicionan la importación indicada en el PDF.
- Facturas de administración de inicio de año solo para clientes no dados de baja.
- El PDF requiere acceso ODBC para exportación/importación contable; definir el contrato de integración y formatos NRC/AEAT antes de construirlo.

### 9. Inicio, estadísticas y configuración
- El Inicio debe mostrar únicamente datos reales y accesos directos a los registros.
- Indicadores, tareas, alertas, vencimientos y calendario se calculan desde los módulos, no desde constantes de ejemplo.
- Estadísticas e informes calculados sobre datos persistidos. El PDF no especifica todos los informes concretos; definirlos sin inventar requisitos.
- Configuración de usuarios/permisos para restringir creación, consulta y edición.
- Interfaz con idioma consistente; el idioma de interfaz es distinto del idioma usado para correos a propietarios.

## Orden de implementación y criterios de aceptación

### Fase 1 — Base de datos y persistencia
1. Inspeccionar las tablas reales y las políticas RLS antes de crear o modificar esquema.
2. Crear/ajustar migraciones versionadas y relaciones con claves foráneas.
3. Sustituir registros de ejemplo por consultas reales; mostrar estados vacíos cuando no haya datos.
4. Implementar altas, edición, guardado, borrado lógico y carga al reabrir registros.
5. Probar con un registro de prueba que todos los cambios persisten y que los usuarios no ven datos ajenos.

**Aceptación:** ningún botón de guardar simula éxito; al recargar, los datos siguen guardados en Supabase y las relaciones son correctas.

### Fase 2 — Clientes e inmuebles
Completar los campos, relaciones y pestañas enumeradas arriba; probar clientes con varios teléfonos, correos, fincas y copropietarios. Implementar baja histórica no destructiva.

**Aceptación:** las fichas muestran solo sus datos reales; un cambio en un titular se refleja donde corresponda; una finca dada de baja sigue disponible en el histórico.

### Fase 3 — Contratos y equipamientos
Configurar tipos de contrato y activar/desactivar funciones según el contrato de cada finca.

**Aceptación:** las prestaciones de una finca derivan de su contrato, no de texto fijo.

### Fase 4 — Revisiones
Planificación, filtros, lecturas, fotos, observaciones, historial y comunicaciones.

**Aceptación:** la siguiente revisión se calcula a partir de contrato/fecha/número de revisiones; las lecturas anteriores se recuperan de la última revisión; las fotos tienen nombre descriptivo.

### Fase 5 — Incidencias, notas, llaves y alertas
Implementar flujos, estados, fechas, relación con fincas/industriales y alertas por vencimiento.

**Aceptación:** una incidencia de revisión puede generar nota de servicio no facturable; una llave vencida genera alerta; las alertas completadas pasan al histórico por seis meses.

### Fase 6 — Impuestos y contabilidad
Implementar cálculos documentados, importaciones y exportaciones tras verificar formatos y nombres de campo; validar cálculos fiscales antes de habilitarlos en producción.

**Aceptación:** resultados reproducibles con casos de prueba aprobados; importaciones idempotentes; bajas e impuestos históricos conservados.

### Fase 7 — Inicio, estadísticas, permisos y validación final
Conectar los resúmenes a datos reales, aplicar permisos y probar la aplicación completa en entorno de validación antes de publicar.

**Aceptación:** build limpio, ausencia de datos ficticios, flujos principales probados y despliegue verificado.

## Restricciones de seguridad y calidad
- No desactivar RLS ni hacer públicas las tablas para evitar problemas de login.
- No introducir credenciales privadas en el código.
- No borrar datos ni migraciones existentes sin revisar su impacto.
- No marcar como terminada una fase sin probar la persistencia y el flujo real.
- No publicar en producción un cambio que no haya pasado el build.
- Mantener este documento como checklist de trazabilidad entre el PDF, la implementación y las pruebas.

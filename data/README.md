# Datos

## Primera carga: OSD-575

| Archivo original | Carpeta de destino |
|---|---|
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv | data/raw/OSD-575/ |
| OSD-575_metadata_OSD-575-ISA.zip | data/metadata/OSD-575/ |

Metadatos ZIP incorporados. CSV de resultados pendiente de incorporar. Mantener los nombres originales.

El CSV es una tabla procesada por NASA. Se guarda en raw porque conservamos la descarga sin cambios locales. Incluye resultados de laboratorio antes y después del vuelo, con unidades y valores ausentes.

El ZIP contiene metadatos del estudio, las muestras y los ensayos. Conservarlo junto al CSV como referencia de interpretación.

## Carpetas

- raw/: descargas originales; no editarlas.
- metadata/: documentación y metadatos de la fuente.
- processed/: tablas transformadas por el equipo y reproducibles desde los originales.
- simulated/: escenarios sintéticos identificados como tales.

Registrar la procedencia de cada nuevo conjunto en docs/references/README.md. Seleccionar archivos pequeños y relevantes; los datos masivos se documentan mediante enlaces.

Los resultados de laboratorio no equivalen a lecturas continuas de sensores. Los rangos incluidos en el archivo no son, por sí solos, reglas operativas de emergencia.

Git conserva archivos: .gitkeep permite incluir carpetas todavía vacías.

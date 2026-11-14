# Trabajo en equipo

## Clonar una vez

En PowerShell, desde la carpeta donde guardarás el proyecto:

```powershell
git clone https://github.com/dziertp/nasa_space_apps.git
Set-Location nasa_space_apps
code .
```

El repositorio es privado: cada integrante necesita acceso y debe autenticarse con su cuenta de GitHub si Git lo solicita.

## Empezar una tarea

Con los cambios anteriores guardados en un commit:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/nombre-de-la-tarea
```

Usar una rama distinta por tarea y evitar editar simultáneamente los mismos archivos.

## Subir cambios

Seleccionar los archivos de la tarea; estos son ejemplos:

```powershell
git status
git add README.md
git commit -m "docs: actualizar alcance del prototipo"
git push -u origin HEAD
```

Abrir un pull request en GitHub desde la rama de trabajo hacia main. Revisar el cambio e integrarlo cuando funcione.

## Primera carga de datos

Desde la raíz del repositorio, después de crear una rama:

```powershell
Copy-Item -LiteralPath "$env:USERPROFILE\Downloads\LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv" -Destination ".\data\raw\OSD-575\"
Copy-Item -LiteralPath "$env:USERPROFILE\Downloads\OSD-575_metadata_OSD-575-ISA.zip" -Destination ".\data\metadata\OSD-575\"
git status
git add data/raw/OSD-575/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv data/metadata/OSD-575/OSD-575_metadata_OSD-575-ISA.zip
git commit -m "data: agregar archivos publicos de OSD-575"
git push -u origin HEAD
```

Ajustar las rutas de Downloads si los archivos se guardaron en otra carpeta. Tras incorporar los archivos, actualizar el estado de carga en data/README.md y registrar la fecha real de descarga en docs/references/README.md.

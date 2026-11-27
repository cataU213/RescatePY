# Módulo OCR de RescatePY

## Qué hace

- Permite a una cuenta de tipo `ORGANIZACION` cargar hasta cinco archivos por envío.
- Acepta PDF, PNG y JPG/JPEG, con un máximo de 12 MB por archivo.
- Guarda el archivo original en `RP_DOCUMENTOS_COMEDOR.CONTENIDO` (BLOB).
- Ejecuta Tesseract en español e inglés.
- Para PDF, renderiza hasta 10 páginas y aplica OCR página por página.
- Guarda el texto en `RP_RESULTADOS_OCR.TEXTO_EXTRAIDO` (CLOB).
- Compara RUC y CI detectados con los datos de `ORGANIZACIONES`.
- Presenta `COINCIDE`, `NO_COINCIDE` o `REVISAR`.

**Importante:** los resultados son una ayuda de lectura y consistencia. No equivalen a una certificación oficial ni aprueban automáticamente un comedor. La decisión final requiere revisión humana.

## Requisitos

- Node.js 22.13 o superior (o Node.js 24).
- Las tres tablas OCR ya creadas en el esquema `RESCATEPY`.
- Variables Oracle configuradas en `backend/.env`.
- Acceso a Internet la primera vez que Tesseract descargue los datos de idioma `spa` y `eng`.

## Instalar dependencias

Desde PowerShell:

```powershell
cd C:\Users\Admin\Downloads\RescatePY-con-git\backend

# Instala dependencias del backend y del OCR desde el lockfile.
npm ci

# Comprueba la sintaxis de los archivos principales.
node --check .\server.js
node --check .\ocr-service.js

# Inicia el backend.
npm start
```

No compartas `backend/.env`. El archivo `.env.example` es solamente una plantilla.

## Uso

1. Iniciá sesión en RescatePY con una cuenta registrada como `ORGANIZACION`.
2. Abrí el menú ODS y seleccioná **Documentos del comedor (OCR)**.
3. Seleccioná el tipo de documento.
4. Adjuntá uno o varios PDF/JPG/PNG (máximo cinco por envío).
5. Pulsá **Cargar y procesar con OCR**.
6. Revisá el historial y los campos extraídos.

El backend protege las rutas con JWT y verifica que el usuario tenga un registro asociado en `ORGANIZACIONES`.

## Rutas

- `GET /api/comedor/documentos`: lista los documentos y sus resultados del usuario autenticado.
- `POST /api/comedor/documentos`: recibe archivos en el campo multipart `documentos` y el campo `tipoDocumento`.

## Tablas utilizadas

- `RP_EXPEDIENTES_COMEDOR`
- `RP_DOCUMENTOS_COMEDOR`
- `RP_RESULTADOS_OCR`
- `ORGANIZACIONES`
- `USUARIOS`

Si Oracle devuelve `ORA-00904` o `ORA-00932`, verificá los nombres y tipos de las columnas en `ALL_TAB_COLUMNS`: el código utiliza los nombres de las columnas que se confirmaron para las tablas OCR del proyecto.

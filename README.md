# YT-DLP Importer — Panel para Adobe Premiere Pro

Descarga video (MP4) o audio (MP3) de YouTube con `yt-dlp` + `ffmpeg` e
importa el archivo directamente al proyecto activo de Premiere. Incluye
selector de calidad, recorte con forma de onda real, y conversión automática
a codecs compatibles con Premiere.

## Requisitos

| Herramienta | Obligatoria | Para qué | Instalar |
|---|---|---|---|
| **Adobe Premiere Pro** | Sí | CC 2019 o superior | — |
| **yt-dlp** | Sí | Las descargas | `winget install yt-dlp.yt-dlp` |
| **ffmpeg** | Sí | MP3, merge video+audio, conversión de codecs | `winget install Gyan.FFmpeg` |
| **Node.js** | Recomendado | Sin él yt-dlp no ve algunos formatos de YouTube | `winget install OpenJS.NodeJS.LTS` |

También funciona con Scoop (`scoop install yt-dlp ffmpeg nodejs-lts`) o
instaladores manuales. Lo importante es que estén en el **PATH**.

## Instalación (recomendada)

1. Descarga `YTDLP-Importer-Setup-v1.0.0.exe` del release.
2. Ejecútalo. El asistente:
   - **Detecta las herramientas** instaladas (yt-dlp / ffmpeg / Node.js) y
     muestra su estado. Si falta alguna, al finalizar puedes instalarla
     automáticamente con winget.
   - Te pide **una sola ruta**: la carpeta de extensiones de Adobe
     (viene precargada con la correcta:
     `C:\Users\<usuario>\AppData\Roaming\Adobe\CEP\extensions`).
   - Activa `PlayerDebugMode` en el registro (necesario para extensiones
     sin firma) para CSXS.9–12.
3. Reinicia Premiere Pro → **Ventana → Extensiones → YT-DLP Importer**.

Para desinstalar: *Agregar o quitar programas* → YT-DLP Importer.

## Instalación manual (alternativa)

1. Copia la carpeta `com.ytdlp.premierepanel` a:
   ```
   %APPDATA%\Adobe\CEP\extensions\
   ```
2. Activa PlayerDebugMode en CMD:
   ```bat
   reg add "HKCU\Software\Adobe\CSXS.9"  /v PlayerDebugMode /t REG_SZ /d 1
   reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1
   reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1
   reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1
   ```
3. Reinicia Premiere → **Ventana → Extensiones → YT-DLP Importer**.

## Uso

1. **Pega la URL** de YouTube — el panel analiza el video automáticamente.
2. **Recorta** (opcional): activa *Recortar* y arrastra los handles sobre la
   forma de onda, mueve la región, o escribe tiempos (`mm:ss`).
3. **Elige formato y calidad**: MP4 (hasta 4K o un techo de resolución) o
   MP3 (bitrate hasta 320 kbps).
4. **Descargar e Importar** — el archivo llega a la raíz del proyecto.
   El botón se vuelve *Cancelar* durante el proceso.

Las descargas van a `%USERPROFILE%\Videos\yt-dlp` por defecto; las rutas de
los ejecutables y la carpeta se pueden ajustar en la sección *Configuración*
(del panel). Todo persiste entre sesiones.

El historial de operaciones está plegado bajo *Estado*; se despliega solo
si ocurre un error.

## Compatibilidad de codecs

Premiere no importa VP9/AV1/Opus. El panel lo resuelve en dos pasos:

1. yt-dlp prefiere streams `avc1` (H.264) + `mp4a` (AAC).
2. `ffprobe` verifica los codecs del archivo descargado; si no son
   compatibles, `ffmpeg` lo transcodifica a **H.264 + AAC** (con progreso
   en la barra) conservando el nombre.

## Compilar el instalador (desarrollo)

Requiere [Inno Setup 6](https://jrsoftware.org/isinfo.php):

```bat
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
```

Genera `dist\YTDLP-Importer-Setup-v1.0.0.exe`.

## Estructura

```
com.ytdlp.premierepanel/
├── CSXS/manifest.xml      → Declaración de la extensión + habilita Node.js
├── html/index.html        → Interfaz del panel
├── css/style.css          → Tema oscuro estilo Premiere
├── js/
│   ├── CSInterface.js     → Puente JS ↔ ExtendScript
│   └── app.js             → Lógica (descarga, trimmer, codecs, log)
└── jsx/hostscript.jsx     → importFiles() dentro de Premiere
installer.iss              → Script del instalador (Inno Setup)
```

## Depuración

Crea un archivo `.debug` en la raíz de la extensión con este contenido:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionList>
    <Extension Id="com.ytdlp.premierepanel.panel">
        <HostList>
            <Host Name="PPRO" Port="8090"/>
        </HostList>
    </Extension>
</ExtensionList>
```

Con Premiere abierto y el panel visible, abre `http://localhost:8090` en
Chrome para acceder a las DevTools del panel. Los logs de CEP están en
`%LOCALAPPDATA%\Temp\CEP12-PPRO.log`.

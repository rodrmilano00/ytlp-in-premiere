# YT-DLP Importer — Panel CEP para Adobe Premiere Pro

Panel que descarga video (MP4) o audio (MP3) de YouTube con `yt-dlp` + `ffmpeg`
locales e importa el archivo resultante al proyecto activo de Premiere.

## Estructura

```
com.ytdlp.premierepanel/
├── CSXS/
│   └── manifest.xml      → Declaración de la extensión + habilita Node.js
├── html/
│   └── index.html        → Interfaz del panel
├── css/
│   └── style.css         → Tema oscuro estilo Spectrum
├── js/
│   ├── CSInterface.js    → Puente JS ↔ ExtendScript
│   └── app.js            → Lógica Node.js (spawn de yt-dlp)
└── jsx/
    └── hostscript.jsx    → importFiles() dentro de Premiere
```

## Instalación

### 1. Copiar la carpeta de la extensión

Copia `com.ytdlp.premierepanel` a una de estas ubicaciones:

- **Solo tu usuario (recomendado):**
  ```
  %APPDATA%\Adobe\CEP\extensions\
  ```
  (equivale a `C:\Users\<tu-usuario>\AppData\Roaming\Adobe\CEP\extensions\`)

- **Todos los usuarios (requiere admin):**
  ```
  C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\
  ```

### 2. Activar PlayerDebugMode

Sin esto Premiere no carga extensiones sin firmar. En CMD (como usuario normal):

```bat
reg add "HKCU\Software\Adobe\CSXS.9"  /v PlayerDebugMode /t REG_SZ /d 1
reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1
```

Se añaden las cuatro claves porque la versión de CSXS depende de tu versión de
Premiere (CSXS.9 ≈ CC2019–2021, CSXS.10 ≈ 2022, CSXS.11 ≈ 2023–2024,
CSXS.12 ≈ 2025 en adelante).

En macOS el equivalente es:
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
```

### 3. Reiniciar Premiere Pro

Abre el panel desde **Ventana → Extensiones → YT-DLP Importer**.

## Configuración del panel

En la sección **Configuración** del panel:

- **yt-dlp**: ruta completa a `yt-dlp.exe`, o simplemente `yt-dlp` si está en el PATH.
- **ffmpeg**: ruta a `ffmpeg.exe` o a su carpeta contenedora.
- **Carpeta de descargas**: dónde se guardarán los archivos (se crea si no existe).

Las rutas se guardan en `localStorage` y persisten entre sesiones.
Mientras falte alguna, el botón de descarga aparece deshabilitado con una
advertencia amarilla.

## Depuración (opcional)

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
Chrome para acceder a las DevTools del panel.

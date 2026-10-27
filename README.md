# YT-DLP Importer — Adobe Premiere Pro panel

A [CEP extension](https://github.com/Adobe-CEP/CEP-Resources) for Adobe Premiere
Pro that downloads YouTube videos or audio with your local
[yt-dlp](https://github.com/yt-dlp/yt-dlp) installation, guarantees the result
is compatible with Premiere, and imports it into the active project —
all without leaving the app.

The panel automatically uses the tools in your `PATH`: paste a link, pick the
format and quality, optionally trim, and download.

## Features

- Paste a YouTube URL and download:
  - **MP4 video** — resolution up to Best available, 4K, 1440p, 1080p, 720p,
    480p or 360p (maximum cap; if the video doesn't reach it, the best
    available is downloaded).
  - **MP3 audio** — quality Best (VBR), 320, 256, 192, 128 or 96 kbps.
- **Trimmer** — paste the URL and the panel shows a timeline with a real
  waveform, video title and duration:
  - Progressively generated waveform, with a loading screen and live
    percentage estimated from the video duration.
  - Draggable in/out handles, draggable region, click outside to move the
    nearest edge, double click to reset.
  - Time inputs (`mm:ss` or `hh:mm:ss.d`).
  - Trim uses `yt-dlp --download-sections` + `--force-keyframes-at-cuts`
    (re-encodes edges for frame-accurate cuts). Works for MP3 too.
- **Codec compatibility** — always prefers H.264 + AAC. If YouTube only has
  the video in another codec (VP9, AV1, Opus…), it downloads the best
  available and automatically transcodes with `ffmpeg` so Premiere accepts it.
- **Auto import** — when the download finishes, the file is added to the root
  of the active project.
- **Automatic interface language** — the panel reads Premiere's UI language
  (`appUILocale`) and displays itself in Spanish or English; any other
  language falls back to English. The installer wizard also runs in Spanish
  or English.
- **Cancel** — during download, the button becomes *Cancel*: it kills the
  yt-dlp/ffmpeg processes and cleans up temporary files.
- **Collapsible logs** — hidden by default with a live preview of the last
  message; expands automatically on errors.
- Optional **Settings** section — custom paths for yt-dlp/ffmpeg and download
  folder. Defaults: tools resolved from `PATH`, downloads to
  `Videos\yt-dlp`. Everything persists across sessions.

## Requirements

| Tool | Required | Install | Purpose |
|------|----------|---------|---------|
| `yt-dlp` | **Yes** | `winget install yt-dlp.yt-dlp` | YouTube downloads |
| `ffmpeg` | **Yes** | `winget install Gyan.FFmpeg` | audio conversion, merging, waveform, transcoding |
| `node` | Recommended | `winget install OpenJS.NodeJS.LTS` | modern yt-dlp needs a JS runtime to see every YouTube format |

All three must be reachable from `PATH` (Scoop, winget, Chocolatey and manual
installations all work). The installer detects them automatically. If `node`
is missing the panel still works, but some videos may fail to download.

## Install with the installer (recommended)

Download `YTDLP-Importer-Setup-vX.X.X.exe` from
[Releases](https://github.com/rodrmilano00/ytdlp-in-premiere/releases) and run
it. The wizard (available in Spanish and English):

1. **Checks your tools** — shows yt-dlp, ffmpeg and Node.js status with the
   exact `winget` command for each missing one. At the end it can install the
   missing tools automatically.
2. **Asks only for the Adobe extensions folder** — prefilled with the default
   `%APPDATA%\Adobe\CEP\extensions`.
3. **Copies the panel** there and enables `PlayerDebugMode` for CSXS.9–12
   (all current Premiere versions).
4. Done — restart Premiere Pro.

It installs per-user, no admin rights required. Includes an uninstaller.

## Manual install (alternative)

1. Copy the `com.ytdlp.premierepanel` folder to:

   ```
   %APPDATA%\Adobe\CEP\extensions\com.ytdlp.premierepanel
   ```

2. Since the extension is unsigned, enable debug mode (one-time, per CEP
   version). In `cmd.exe`:

   ```cmd
   for %i in (9 10 11 12) do reg add "HKCU\Software\Adobe\CSXS.%i" /v PlayerDebugMode /t REG_SZ /d 1 /f
   ```

   | Premiere | CSXS |
   |---|---|
   | 2021 (15.x) | 9 |
   | 2022 (22.x) | 10 |
   | 2023 (23.x) / 2024 (24.x) | 11 |
   | 2025 (25.x) | 12 |

3. Restart Premiere and open the panel from **Window → Extensions →
   YT-DLP Importer**.

## Usage

1. Open **Window → Extensions → YT-DLP Importer**.
2. Paste a YouTube URL — the panel analyzes it automatically and shows title,
   duration and the waveform timeline.
3. Optional: check **Trim** and drag the handles to pick a range.
4. Pick **MP4** (resolution) or **MP3** (bitrate).
5. Press **Download & Import**. Progress shows in the bar; at the end the file
   appears in the project root.

Settings, format and quality choices persist between sessions.

## Codec compatibility

YouTube serves most content in VP9/AV1/Opus, which Premiere **cannot** import.
The panel handles it in two layers:

- **Smart selector**: `-f` prefers `avc1` (H.264) + `mp4a` (AAC) at the chosen
  resolution, falling back to the best available.
- **Post-download check**: `ffprobe` inspects the real codecs; if they aren't
  H.264/AAC, `ffmpeg` transcodes the file (keeping the filename) to
  `-c:v libx264 -preset veryfast -crf 18 -c:a aac 192k`.

Either way, the imported file always opens in Premiere.

## Development

### Layout

```
com.ytdlp.premierepanel/
├── CSXS/manifest.xml       # CEP manifest (bundle + panel version)
├── html/index.html         # UI (translatable via data-i18n)
├── css/style.css
├── js/CSInterface.js       # Adobe bridge
├── js/app.js               # logic + i18n dictionary
└── jsx/hostscript.jsx      # runs inside Premiere (importFiles)
```

To develop with live reload, replace the installed copy with a junction to the
repo (`cmd.exe`):

```cmd
rmdir "%APPDATA%\Adobe\CEP\extensions\com.ytdlp.premierepanel"
mklink /J "%APPDATA%\Adobe\CEP\extensions\com.ytdlp.premierepanel" "<repo>\com.ytdlp.premierepanel"
```

Debug the panel in Chrome DevTools by creating `.debug` in the extension
folder:

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

then open `http://localhost:8090` while the panel is visible in Premiere.
CEP logs live at `%LOCALAPPDATA%\Temp\CEP12-PPRO.log`.

### Building the installer

[Inno Setup 6](https://jrsoftware.org/isinfo.php) is required
(`winget install JRSoftware.InnoSetup`):

```cmd
"%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" installer.iss
```

Output goes to `dist\YTDLP-Importer-Setup-vX.X.X.exe` (the version comes from
`AppVersion` in `installer.iss`).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Doesn't appear in *Window → Extensions* | Restart Premiere; check the folder exists under `%APPDATA%\Adobe\CEP\extensions` |
| Appears but won't open | `PlayerDebugMode` missing for your CSXS version — run the `reg add` command above |
| *yt-dlp not found in PATH* | Install it (`winget install yt-dlp.yt-dlp`) or set the path in **Settings** |
| Some videos won't download | Install Node.js — modern yt-dlp needs a JS runtime for YouTube |
| Nothing imports after download | Make sure the Premiere project is saved/has a valid location |

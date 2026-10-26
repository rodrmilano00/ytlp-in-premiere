/* ============================================================
   app.js — Lógica del panel (Node.js embebido en CEF vía
   --enable-nodejs / --mixed-context).
   ============================================================ */

(function () {
    "use strict";

    /* ---------------- Módulos Node ---------------- */

    var fs, path, spawn, os;
    var nodeAvailable = true;

    try {
        fs = require("fs");
        path = require("path");
        spawn = require("child_process").spawn;
        os = require("os");
    } catch (e) {
        nodeAvailable = false;
    }

    var csInterface = new CSInterface();

    /* ---------------- Referencias DOM ---------------- */

    var el = {
        configSection: document.getElementById("config-section"),
        cfgYtdlp: document.getElementById("cfg-ytdlp"),
        cfgFfmpeg: document.getElementById("cfg-ffmpeg"),
        cfgDest: document.getElementById("cfg-dest"),
        btnSaveConfig: document.getElementById("btn-save-config"),
        configFeedback: document.getElementById("config-feedback"),
        configWarning: document.getElementById("config-warning"),
        url: document.getElementById("url"),
        btnDownload: document.getElementById("btn-download"),
        progressBar: document.getElementById("progress-bar"),
        progressText: document.getElementById("progress-text"),
        log: document.getElementById("log"),
        statusDot: document.getElementById("status-dot")
    };

    var CONFIG_KEY = "ytdlp.panel.config";
    var downloading = false;

    // Defaults: usa los binarios del PATH y una carpeta de descargas propia.
    // La sección Configuración sirve solo como override.
    var DEFAULTS = {
        ytdlp: "yt-dlp",
        ffmpeg: "ffmpeg",
        dest: nodeAvailable
            ? path.join(os.homedir(), "Videos", "yt-dlp")
            : ""
    };

    /* ---------------- Utilidades de UI ---------------- */

    function log(msg, kind) {
        var div = document.createElement("div");
        div.className = "log-entry log-" + (kind || "info");
        div.textContent = msg;
        el.log.appendChild(div);
        el.log.scrollTop = el.log.scrollHeight;
    }

    function setDot(state) {
        el.statusDot.className = "dot dot-" + state;
    }

    function setProgress(pct, cls) {
        pct = Math.max(0, Math.min(100, pct));
        el.progressBar.style.width = pct + "%";
        el.progressText.textContent = pct.toFixed(pct % 1 === 0 ? 0 : 1) + "%";
        el.progressBar.className = "progress-bar" + (cls ? " " + cls : "");
    }

    /* ---------------- Configuración persistente ---------------- */

    function loadConfig() {
        try {
            var raw = localStorage.getItem(CONFIG_KEY);
            var saved = raw ? JSON.parse(raw) : {};
            el.cfgYtdlp.value = saved.ytdlp || "";
            el.cfgFfmpeg.value = saved.ffmpeg || "";
            el.cfgDest.value = saved.dest || "";
            // Los placeholders muestran el valor por defecto efectivo.
            el.cfgYtdlp.placeholder = "vacío = " + DEFAULTS.ytdlp;
            el.cfgFfmpeg.placeholder = "vacío = " + DEFAULTS.ffmpeg;
            el.cfgDest.placeholder = "vacío = " + DEFAULTS.dest;
        } catch (e) {
            log("No se pudo leer la configuración guardada.", "warn");
        }
    }

    function saveConfig() {
        var cfg = getConfig();
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
            el.configFeedback.textContent = "Configuración guardada.";
            setTimeout(function () {
                el.configFeedback.textContent = "";
            }, 2500);
        } catch (e) {
            log("No se pudo guardar la configuración: " + e.message, "error");
        }
    }

    function getConfig() {
        return {
            ytdlp: el.cfgYtdlp.value.trim() || DEFAULTS.ytdlp,
            ffmpeg: el.cfgFfmpeg.value.trim() || DEFAULTS.ffmpeg,
            dest: el.cfgDest.value.trim() || DEFAULTS.dest
        };
    }

    function isPathLike(v) {
        return /[\\/:]/.test(v);
    }

    /** Valida rutas; devuelve lista de problemas (vacía = todo OK). */
    function validateConfig(cfg) {
        var problems = [];

        if (nodeAvailable) {
            if (isPathLike(cfg.ytdlp) && !fs.existsSync(cfg.ytdlp)) {
                problems.push("ruta de yt-dlp no existe");
            }
            if (isPathLike(cfg.ffmpeg) && !fs.existsSync(cfg.ffmpeg)) {
                problems.push("ruta de ffmpeg no existe");
            }
            if (!fs.existsSync(cfg.dest)) {
                try {
                    fs.mkdirSync(cfg.dest, { recursive: true });
                } catch (e) {
                    problems.push("no se pudo crear la carpeta de destino");
                }
            }
        }
        return problems;
    }

    /** Ejecuta `cmd args` y devuelve la primera línea de stdout (o null). */
    function probeVersion(cmd, args, cb) {
        if (!nodeAvailable || isPathLike(cmd)) { cb(null); return; }
        var out = "";
        var proc;
        try {
            proc = spawn(cmd, args, { windowsHide: true });
        } catch (e) {
            cb(null);
            return;
        }
        proc.stdout.on("data", function (d) { out += d.toString(); });
        proc.on("error", function () { cb(null); });
        proc.on("close", function (code) {
            cb(code === 0 ? out.split(/\r?\n/)[0].trim() : null);
        });
    }

    function refreshUiState() {
        var problems = validateConfig(getConfig());
        var ready = problems.length === 0 && nodeAvailable;

        el.btnDownload.disabled = !ready || downloading;
        el.configWarning.classList.toggle("hidden", ready);

        if (!nodeAvailable) {
            el.configWarning.textContent =
                "Node.js no está disponible. Revisa --enable-nodejs en el manifest.";
        } else if (!ready) {
            el.configWarning.textContent =
                "Falta configurar: " + problems.join(", ") + ".";
        }
        return ready;
    }

    /* ---------------- Construcción de argumentos ---------------- */

    function buildArgs(cfg, url) {
        var format = document.querySelector('input[name="format"]:checked').value;

        var args = [
            "--newline",                // progreso línea a línea
            "--no-playlist",
            "--restrict-filenames",     // nombres seguros para importar en Windows
            "--js-runtimes", "node",    // sin runtime JS faltan formatos de YouTube
            "-P", cfg.dest,             // carpeta de destino
            "-o", "%(title)s.%(ext)s",
            "--print", "after_move:filepath",   // imprime la ruta final al terminar
            "--no-simulate"
        ];

        // Solo pasa --ffmpeg-location si es una ruta; un nombre suelto
        // ("ffmpeg") lo resuelve yt-dlp solo desde el PATH.
        if (isPathLike(cfg.ffmpeg)) {
            args.push("--ffmpeg-location", cfg.ffmpeg);
        }

        if (format === "audio") {
            args.push("-x", "--audio-format", "mp3", "--audio-quality", "0");
        } else {
            // Preferir streams H.264+AAC (nativos de Premiere). Si el video
            // solo existe en VP9/AV1, baja el mejor disponible y luego
            // ensureCompatible() lo transcodifica con ffmpeg.
            args.push(
                "-f",
                "bv*[vcodec^=avc1][ext=mp4]+ba[acodec^=mp4a]/" +
                "bv*[vcodec^=avc1]+ba[acodec^=mp4a]/" +
                "b[vcodec^=avc1]/" +
                "bv*+ba/b",
                "--merge-output-format", "mp4"
            );
        }

        args.push(url);
        return args;
    }

    /* ---------------- Parseo de salida de yt-dlp ---------------- */

    var RE_PROGRESS = /\[download\]\s+(\d{1,3}(?:\.\d+)?)%/;
    var RE_ALREADY = /\[download\]\s+(.+?)\s+has already been downloaded/;
    var RE_DESTINATIONS = [
        /\[download\]\s+Destination:\s*(.+?)\s*$/,
        /\[Merger\]\s+Merging formats into\s*"?(.*?)"?\s*$/,
        /\[ExtractAudio\]\s+Destination:\s*(.+?)\s*$/,
        /\[Fixup\w+\].*?"([^"]+)"/,
        /\[MoveFiles\] Moving file.*?"([^"]+)"\s+to\s+"([^"]+)"/
    ];

    function looksLikePath(line, destDir) {
        // Líneas impresas por --print: rutas absolutas limpias.
        if (/^[A-Za-z]:[\\/]/.test(line) || /^[\\/]{1,2}/.test(line) || line.indexOf("/") === 0) {
            if (destDir && line.toLowerCase().indexOf(destDir.toLowerCase()) === 0) {
                return line;
            }
        }
        return null;
    }

    function handleLine(line, ctx) {
        var m;

        if ((m = RE_PROGRESS.exec(line))) {
            setProgress(parseFloat(m[1]));
            return;
        }
        if ((m = RE_ALREADY.exec(line))) {
            ctx.finalPath = m[1];
            setProgress(100);
            log("El archivo ya estaba descargado: " + m[1], "dim");
            return;
        }
        for (var i = 0; i < RE_DESTINATIONS.length; i++) {
            if ((m = RE_DESTINATIONS[i].exec(line))) {
                ctx.finalPath = m[2] || m[1];
                return;
            }
        }
        if (line.indexOf("[Merger]") === 0) {
            log("Combinando audio y video...", "dim");
        } else if (line.indexOf("[ExtractAudio]") === 0) {
            log("Procesando audio...", "dim");
        }

        var p = looksLikePath(line, ctx.destDir);
        if (p) ctx.printedPath = p;
    }

    /* ---------------- Descarga ---------------- */

    function startDownload() {
        if (downloading) return;

        var cfg = getConfig();
        var url = el.url.value.trim();

        if (!url) {
            log("Introduce una URL de YouTube.", "warn");
            return;
        }
        if (!refreshUiState()) return;

        downloading = true;
        el.btnDownload.disabled = true;
        setProgress(0);
        setDot("busy");
        log("Descargando: " + url, "info");

        var args = buildArgs(cfg, url);
        var ctx = { finalPath: null, printedPath: null, destDir: cfg.dest };

        var proc;
        try {
            proc = spawn(cfg.ytdlp, args, { windowsHide: true });
        } catch (e) {
            finishError("No se pudo lanzar yt-dlp: " + e.message);
            return;
        }

        var leftoverOut = "", leftoverErr = "";

        proc.stdout.on("data", function (data) {
            leftoverOut += data.toString();
            var lines = leftoverOut.split(/\r?\n/);
            leftoverOut = lines.pop();
            lines.forEach(function (l) { if (l.trim()) handleLine(l.trim(), ctx); });
        });

        proc.stderr.on("data", function (data) {
            leftoverErr += data.toString();
            var lines = leftoverErr.split(/\r?\n/);
            leftoverErr = lines.pop();
            lines.forEach(function (l) {
                if (!l.trim()) return;
                handleLine(l.trim(), ctx);
                if (/^(ERROR|WARNING)/i.test(l.trim())) {
                    log(l.trim(), /^ERROR/i.test(l.trim()) ? "error" : "warn");
                }
            });
        });

        proc.on("error", function (e) {
            finishError("Error al ejecutar yt-dlp: " + e.message);
        });

        proc.on("close", function (code) {
            var finalPath = ctx.printedPath || ctx.finalPath;

            if (code !== 0) {
                finishError("yt-dlp terminó con código " + code + ". Revisa el log.");
                return;
            }
            if (!finalPath) {
                finishError("Descarga completada pero no se detectó la ruta del archivo.");
                return;
            }

            log("Descarga completada: " + finalPath, "ok");
            ensureCompatible(finalPath, cfg, function (readyPath) {
                setProgress(100, "done");
                importIntoPremiere(readyPath);
            });
        });
    }

    /* ---------------- Compatibilidad de codecs (Premiere) ---------------- */

    var OK_VIDEO_CODEC = { h264: 1, hevc: 1 };

    function ffmpegExe(cfgVal) {
        if (isPathLike(cfgVal)) {
            try {
                if (fs.existsSync(cfgVal) && fs.statSync(cfgVal).isDirectory()) {
                    return path.join(cfgVal, "ffmpeg.exe");
                }
            } catch (e) {}
            return cfgVal;
        }
        return "ffmpeg";
    }

    function ffprobeExe(cfgVal) {
        if (isPathLike(cfgVal)) {
            try {
                if (fs.existsSync(cfgVal)) {
                    var p = fs.statSync(cfgVal).isDirectory()
                        ? cfgVal
                        : path.dirname(cfgVal);
                    return path.join(p, "ffprobe.exe");
                }
            } catch (e) {}
        }
        return "ffprobe";
    }

    function probeMedia(file, cfg, cb) {
        var out = "";
        var proc;
        try {
            proc = spawn(ffprobeExe(cfg.ffmpeg), [
                "-v", "error",
                "-show_entries", "stream=codec_type,codec_name:format=duration",
                "-of", "json", file
            ], { windowsHide: true });
        } catch (e) { cb(null); return; }
        proc.stdout.on("data", function (d) { out += d.toString(); });
        proc.on("error", function () { cb(null); });
        proc.on("close", function (code) {
            if (code !== 0) { cb(null); return; }
            try { cb(JSON.parse(out)); } catch (e) { cb(null); }
        });
    }

    function isCompatible(streams) {
        for (var i = 0; i < streams.length; i++) {
            var s = streams[i];
            if (s.codec_type === "video" && !OK_VIDEO_CODEC[s.codec_name]) return false;
            if (s.codec_type === "audio" && !/^(aac|mp3|flac|alac|pcm_)/.test(s.codec_name)) return false;
        }
        return true;
    }

    function transcodeToH264(src, cfg, durationSec, done) {
        var tmp = src.replace(/\.[^.\\]+$/, "") + ".pr-convert.mp4";
        var args = [
            "-y", "-i", src,
            "-map", "0:v:0?", "-map", "0:a:0?",
            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            tmp
        ];

        log("Codec no compatible con Premiere. Convirtiendo a H.264/AAC...", "info");
        setDot("busy");

        var proc;
        try {
            proc = spawn(ffmpegExe(cfg.ffmpeg), args, { windowsHide: true });
        } catch (e) {
            log("No se pudo lanzar ffmpeg: " + e.message + ". Importando original.", "warn");
            done(src);
            return;
        }

        var leftover = "";
        proc.stderr.on("data", function (d) {
            leftover += d.toString();
            var m;
            while ((m = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(leftover))) {
                var secs = (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
                if (durationSec > 0) setProgress((secs / durationSec) * 100);
                leftover = leftover.slice(m.index + m[0].length);
                if (leftover.length > 4096) leftover = leftover.slice(-1024);
            }
        });

        proc.on("error", function (e) {
            log("ffmpeg falló: " + e.message + ". Importando original.", "warn");
            done(src);
        });

        proc.on("close", function (code) {
            if (code === 0) {
                try {
                    fs.unlinkSync(src);
                    fs.renameSync(tmp, src);
                    log("Convertido a H.264/AAC correctamente.", "ok");
                } catch (e) {
                    log("Conversión hecha pero no se pudo reemplazar el archivo: " + e.message, "warn");
                    try { fs.unlinkSync(tmp); } catch (e2) {}
                }
            } else {
                try { fs.unlinkSync(tmp); } catch (e) {}
                log("La conversión falló (código " + code + "). Importando original.", "warn");
            }
            done(src);
        });
    }

    /** Garantiza que el archivo use codecs que Premiere puede importar. */
    function ensureCompatible(filePath, cfg, done) {
        if (!nodeAvailable) { done(filePath); return; }

        probeMedia(filePath, cfg, function (info) {
            if (!info || !info.streams) {
                log("No se pudo verificar el codec (ffprobe). Importando igual.", "warn");
                done(filePath);
                return;
            }
            if (isCompatible(info.streams)) {
                done(filePath);
                return;
            }
            var dur = info.format ? parseFloat(info.format.duration) || 0 : 0;
            transcodeToH264(filePath, cfg, dur, done);
        });
    }

    /* ---------------- Importación a Premiere ---------------- */

    function importIntoPremiere(filePath) {
        log("Importando a Premiere...", "info");

        // JSON.stringify escapa correctamente \ y " para el literal ExtendScript.
        var script = 'importMedia(' + JSON.stringify(filePath.replace(/\//g, "\\")) + ')';

        csInterface.evalScript(script, function (result) {
            downloading = false;
            refreshUiState();

            if (result === "OK") {
                setDot("ok");
                log("Archivo importado al proyecto correctamente.", "ok");
            } else if (result === "EvalScript error.") {
                setDot("error");
                log("Error al ejecutar el script en Premiere.", "error");
            } else {
                setDot("error");
                log(String(result), "error");
            }
        });
    }

    function finishError(msg) {
        downloading = false;
        setProgress(parseFloat(el.progressText.textContent) || 0, "error");
        setDot("error");
        log(msg, "error");
        refreshUiState();
    }

    /* ---------------- Eventos ---------------- */

    el.btnSaveConfig.addEventListener("click", function () {
        saveConfig();
        refreshUiState();
    });

    [el.cfgYtdlp, el.cfgFfmpeg, el.cfgDest].forEach(function (input) {
        input.addEventListener("input", refreshUiState);
        input.addEventListener("change", function () {
            saveConfig();
            refreshUiState();
        });
    });

    el.url.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !el.btnDownload.disabled) startDownload();
    });

    el.btnDownload.addEventListener("click", startDownload);

    /* ---------------- Arranque ---------------- */

    if (!nodeAvailable) {
        log("Node.js no disponible en este panel. Verifica el manifest y la versión de CEP.", "error");
    }

    loadConfig();

    var startupCfg = getConfig();
    probeVersion(startupCfg.ytdlp, ["--version"], function (v) {
        log(v ? "yt-dlp " + v + " listo."
              : "yt-dlp no encontrado en el PATH. Configura la ruta arriba.",
            v ? "ok" : "warn");
    });
    probeVersion(startupCfg.ffmpeg, ["-version"], function (v) {
        if (v) log(v.split(" Copyright")[0] + " listo.", "ok");
    });

    if (!refreshUiState()) {
        el.configSection.open = true;   // abrir config si falta algo
        log("Revisa la configuración: hay rutas que no existen.", "info");
    } else {
        log("Listo: pega una URL y descarga.", "ok");
    }
    setDot("idle");
})();

/* ============================================================
   app.js — Lógica del panel (Node.js embebido en CEF vía
   --enable-nodejs / --mixed-context).
   ============================================================ */

(function () {
    "use strict";

    /* ---------------- Módulos Node ---------------- */

    var fs, path, spawn;
    var nodeAvailable = true;

    try {
        fs = require("fs");
        path = require("path");
        spawn = require("child_process").spawn;
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
            var cfg = raw ? JSON.parse(raw) : {};
            el.cfgYtdlp.value = cfg.ytdlp || "";
            el.cfgFfmpeg.value = cfg.ffmpeg || "";
            el.cfgDest.value = cfg.dest || "";
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
            ytdlp: el.cfgYtdlp.value.trim(),
            ffmpeg: el.cfgFfmpeg.value.trim(),
            dest: el.cfgDest.value.trim()
        };
    }

    function isPathLike(v) {
        return /[\\/:]/.test(v);
    }

    /** Valida rutas; devuelve lista de problemas (vacía = todo OK). */
    function validateConfig(cfg) {
        var problems = [];
        if (!cfg.ytdlp) problems.push("yt-dlp");
        if (!cfg.ffmpeg) problems.push("ffmpeg");
        if (!cfg.dest) problems.push("carpeta de destino");

        if (nodeAvailable && problems.length === 0) {
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
            "--ffmpeg-location", cfg.ffmpeg,
            "-P", cfg.dest,             // carpeta de destino
            "-o", "%(title)s.%(ext)s",
            "--print", "after_move:filepath",   // imprime la ruta final al terminar
            "--no-simulate"
        ];

        if (format === "audio") {
            args.push("-x", "--audio-format", "mp3", "--audio-quality", "0");
        } else {
            args.push(
                "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]",
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

            setProgress(100, "done");
            log("Descarga completada: " + finalPath, "ok");
            importIntoPremiere(finalPath);
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

    if (!refreshUiState()) {
        el.configSection.open = true;   // abrir config si falta algo
        log("Bienvenido. Configura las rutas para comenzar.", "info");
    } else {
        log("Configuración cargada. Listo para descargar.", "ok");
    }
    setDot("idle");
})();

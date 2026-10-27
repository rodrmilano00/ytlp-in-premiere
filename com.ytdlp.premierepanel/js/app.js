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

    /* ---------------- i18n (sincronizado con el idioma de Premiere) ---------------- */

    var STR = {
        en: {
            "ui.config": "Settings",
            "ui.cfgYtdlp": "yt-dlp executable",
            "ui.cfgFfmpeg": "ffmpeg executable",
            "ui.cfgDest": "Downloads folder",
            "ui.cfgSave": "Save settings",
            "ui.fmtVideo": "Video (MP4)",
            "ui.fmtAudio": "Audio only (MP3)",
            "ui.vqLabel": "Video quality",
            "ui.vqBest": "Best available",
            "ui.aqLabel": "Audio bitrate",
            "ui.aqBest": "Best (VBR)",
            "ui.trim": "Trim",
            "ui.trimAll": "All",
            "ui.status": "Log",
            "ui.state": "Status",
            "ui.btnDownload": "Download & Import",
            "ui.btnCancel": "Cancel",
            "ui.analyzing": "Analyzing…",
            "ui.fetchInfo": "Fetching video info…",
            "ui.genWave": "Generating waveform… ",
            "ui.emptyPh": "empty = ",

            "prob.ytdlp": "yt-dlp",
            "prob.ffmpeg": "ffmpeg",
            "prob.dest": "downloads folder",
            "prob.ytdlpPath": "yt-dlp path does not exist",
            "prob.ffmpegPath": "ffmpeg path does not exist",
            "prob.destCreate": "could not create downloads folder",

            "warn.node": "Node.js is not available. Check --enable-nodejs in the manifest.",
            "warn.missing": "Missing configuration: ",

            "log.cfgRead": "Could not read saved settings.",
            "log.cfgSaved": "Settings saved.",
            "log.cfgWrite": "Could not save settings: {0}",
            "log.noUrl": "Enter a YouTube URL.",
            "log.downloading": "Downloading: {0}",
            "log.trim": "Trim: {0} → {1}",
            "log.ytdlpReady": "yt-dlp {0} ready.",
            "log.noYtdlp": "yt-dlp not found in PATH. Set its path in Settings.",
            "log.ffmpegReady": "{0} ready.",
            "log.cfgCheck": "Check settings: some paths do not exist.",
            "log.ready": "Ready: paste a URL and download.",
            "log.noNode": "Node.js unavailable in this panel. Check the manifest and CEP version.",
            "log.already": "Already downloaded: {0}",
            "log.merging": "Merging audio and video...",
            "log.procAudio": "Processing audio...",
            "log.ytdlpErr": "Could not launch yt-dlp: {0}",
            "log.cancelled": "Download cancelled by user.",
            "log.exitCode": "yt-dlp exited with code {0}. Check the log.",
            "log.noPath": "Download finished but the file path was not detected.",
            "log.dlDone": "Download complete: {0}",
            "log.importing": "Importing into Premiere...",
            "log.importOk": "File imported to the project.",
            "log.importErr": "Error running the script in Premiere.",
            "log.converting": "Codec not supported by Premiere. Converting to H.264/AAC...",
            "log.ffLaunch": "Could not launch ffmpeg: {0}. Importing original.",
            "log.ffFail": "ffmpeg failed: {0}. Importing original.",
            "log.convOk": "Converted to H.264/AAC.",
            "log.convReplace": "Converted but could not replace the file: {0}",
            "log.convFail": "Conversion failed (code {0}). Importing original.",
            "log.probeFail": "Could not check codec (ffprobe). Importing anyway.",
            "log.ytdlpNA": "yt-dlp unavailable.",
            "log.noInfo": "yt-dlp could not fetch video info.",
            "log.noWave": "Could not generate the waveform.",
            "log.waveSlow": "Waveform took too long."
        },
        es: {
            "ui.config": "Configuración",
            "ui.cfgYtdlp": "Ejecutable yt-dlp",
            "ui.cfgFfmpeg": "Ejecutable ffmpeg",
            "ui.cfgDest": "Carpeta de descargas",
            "ui.cfgSave": "Guardar configuración",
            "ui.fmtVideo": "Video (MP4)",
            "ui.fmtAudio": "Solo audio (MP3)",
            "ui.vqLabel": "Calidad de video",
            "ui.vqBest": "Mejor disponible",
            "ui.aqLabel": "Bitrate de audio",
            "ui.aqBest": "Mejor (VBR)",
            "ui.trim": "Recortar",
            "ui.trimAll": "Todo",
            "ui.status": "Estado",
            "ui.state": "Estado",
            "ui.btnDownload": "Descargar e Importar",
            "ui.btnCancel": "Cancelar",
            "ui.analyzing": "Analizando…",
            "ui.fetchInfo": "Obteniendo info del video…",
            "ui.genWave": "Generando forma de onda… ",
            "ui.emptyPh": "vacío = ",

            "prob.ytdlp": "yt-dlp",
            "prob.ffmpeg": "ffmpeg",
            "prob.dest": "carpeta de destino",
            "prob.ytdlpPath": "la ruta de yt-dlp no existe",
            "prob.ffmpegPath": "la ruta de ffmpeg no existe",
            "prob.destCreate": "no se pudo crear la carpeta de destino",

            "warn.node": "Node.js no está disponible. Revisa --enable-nodejs en el manifest.",
            "warn.missing": "Falta configurar: ",

            "log.cfgRead": "No se pudo leer la configuración guardada.",
            "log.cfgSaved": "Configuración guardada.",
            "log.cfgWrite": "No se pudo guardar la configuración: {0}",
            "log.noUrl": "Introduce una URL de YouTube.",
            "log.downloading": "Descargando: {0}",
            "log.trim": "Recorte: {0} → {1}",
            "log.ytdlpReady": "yt-dlp {0} listo.",
            "log.noYtdlp": "yt-dlp no encontrado en el PATH. Configura la ruta arriba.",
            "log.ffmpegReady": "{0} listo.",
            "log.cfgCheck": "Revisa la configuración: hay rutas que no existen.",
            "log.ready": "Listo: pega una URL y descarga.",
            "log.noNode": "Node.js no disponible en este panel. Verifica el manifest y la versión de CEP.",
            "log.already": "El archivo ya estaba descargado: {0}",
            "log.merging": "Combinando audio y video...",
            "log.procAudio": "Procesando audio...",
            "log.ytdlpErr": "No se pudo lanzar yt-dlp: {0}",
            "log.cancelled": "Descarga cancelada por el usuario.",
            "log.exitCode": "yt-dlp terminó con código {0}. Revisa el log.",
            "log.noPath": "Descarga completada pero no se detectó la ruta del archivo.",
            "log.dlDone": "Descarga completada: {0}",
            "log.importing": "Importando a Premiere...",
            "log.importOk": "Archivo importado al proyecto correctamente.",
            "log.importErr": "Error al ejecutar el script en Premiere.",
            "log.converting": "Codec no compatible con Premiere. Convirtiendo a H.264/AAC...",
            "log.ffLaunch": "No se pudo lanzar ffmpeg: {0}. Importando original.",
            "log.ffFail": "ffmpeg falló: {0}. Importando original.",
            "log.convOk": "Convertido a H.264/AAC correctamente.",
            "log.convReplace": "Conversión hecha pero no se pudo reemplazar el archivo: {0}",
            "log.convFail": "La conversión falló (código {0}). Importando original.",
            "log.probeFail": "No se pudo verificar el codec (ffprobe). Importando igual.",
            "log.ytdlpNA": "yt-dlp no disponible.",
            "log.noInfo": "yt-dlp no pudo obtener info del video.",
            "log.noWave": "No se pudo generar la forma de onda.",
            "log.waveSlow": "La forma de onda tardó demasiado."
        }
    };

    var LANG = "en";
    try {
        var env = csInterface.getHostEnvironment();
        var loc = (env && (env.appUILocale || env.appLocale)) || "";
        if (/^es/i.test(loc)) LANG = "es";
    } catch (e) {}

    function t(k) {
        var s = (STR[LANG] && STR[LANG][k]) || STR.en[k] || k;
        for (var i = 1; i < arguments.length; i++) {
            s = s.replace("{" + (i - 1) + "}", arguments[i]);
        }
        return s;
    }

    function applyI18n() {
        document.documentElement.lang = LANG;
        var nodes = document.querySelectorAll("[data-i18n]");
        for (var i = 0; i < nodes.length; i++) {
            nodes[i].textContent = t(nodes[i].getAttribute("data-i18n"));
        }
        var titled = document.querySelectorAll("[data-i18n-title]");
        for (var j = 0; j < titled.length; j++) {
            titled[j].title = t(titled[j].getAttribute("data-i18n-title"));
        }
    }

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
        selVq: document.getElementById("sel-vq"),
        selAq: document.getElementById("sel-aq"),
        fieldVq: document.getElementById("field-vq"),
        fieldAq: document.getElementById("field-aq"),
        formatRadios: document.querySelectorAll('input[name="format"]'),
        trimCard: document.getElementById("trim-card"),
        trimTitle: document.getElementById("trim-title"),
        trimDuration: document.getElementById("trim-duration"),
        trimCanvas: document.getElementById("trim-canvas"),
        trimLoading: document.getElementById("trim-loading"),
        chkTrim: document.getElementById("chk-trim"),
        trimStart: document.getElementById("trim-start"),
        trimEnd: document.getElementById("trim-end"),
        btnTrimReset: document.getElementById("btn-trim-reset"),
        btnDownload: document.getElementById("btn-download"),
        progressBar: document.getElementById("progress-bar"),
        progressText: document.getElementById("progress-text"),
        log: document.getElementById("log"),
        logDetails: document.getElementById("log-details"),
        logLast: document.getElementById("log-last"),
        statusDot: document.getElementById("status-dot")
    };

    var CONFIG_KEY = "ytdlp.panel.config";
    var downloading = false;
    var activeProc = null;
    var cancelled = false;

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
        el.logLast.textContent = msg;
        el.logLast.className = "log-last last-" + (kind || "info");
        if (kind === "error") el.logDetails.open = true;  // errores siempre visibles
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
            el.cfgYtdlp.placeholder = t("ui.emptyPh") + DEFAULTS.ytdlp;
            el.cfgFfmpeg.placeholder = t("ui.emptyPh") + DEFAULTS.ffmpeg;
            el.cfgDest.placeholder = t("ui.emptyPh") + DEFAULTS.dest;
        } catch (e) {
            log(t("log.cfgRead"), "warn");
        }
    }

    function saveConfig() {
        var cfg = getConfig();
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
            el.configFeedback.textContent = t("log.cfgSaved");
            setTimeout(function () {
                el.configFeedback.textContent = "";
            }, 2500);
        } catch (e) {
            log(t("log.cfgWrite", e.message), "error");
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
                problems.push(t("prob.ytdlpPath"));
            }
            if (isPathLike(cfg.ffmpeg) && !fs.existsSync(cfg.ffmpeg)) {
                problems.push(t("prob.ffmpegPath"));
            }
            if (!fs.existsSync(cfg.dest)) {
                try {
                    fs.mkdirSync(cfg.dest, { recursive: true });
                } catch (e) {
                    problems.push(t("prob.destCreate"));
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

        el.btnDownload.disabled = downloading ? false : !ready;
        el.configWarning.classList.toggle("hidden", ready);

        if (!nodeAvailable) {
            el.configWarning.textContent = t("warn.node");
        } else if (!ready) {
            el.configWarning.textContent =
                t("warn.missing") + problems.join(", ") + ".";
        }
        return ready;
    }

    /* ---------------- Preferencias (formato/calidad) ---------------- */

    var PREFS_KEY = "ytdlp.panel.prefs";

    function currentFormat() {
        var r = document.querySelector('input[name="format"]:checked');
        return r ? r.value : "video";
    }

    /** Muestra el selector relevante según el formato elegido. */
    function refreshQualityFields() {
        var f = currentFormat();
        el.fieldVq.classList.toggle("hidden", f !== "video");
        el.fieldAq.classList.toggle("hidden", f !== "audio");
    }

    function loadPrefs() {
        try {
            var p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
            if (p.vq) el.selVq.value = p.vq;
            if (p.aq) el.selAq.value = p.aq;
            if (p.format) {
                var r = document.querySelector(
                    'input[name="format"][value="' + p.format + '"]'
                );
                if (r) r.checked = true;
            }
        } catch (e) {}
    }

    function savePrefs() {
        try {
            localStorage.setItem(PREFS_KEY, JSON.stringify({
                format: currentFormat(),
                vq: el.selVq.value,
                aq: el.selAq.value
            }));
        } catch (e) {}
    }

    /* ---------------- Trimmer ---------------- */

    var media = { url: "", duration: 0, title: "", peaks: null };
    var trimSel = { start: 0, end: 0, enabled: false };
    var infoToken = 0;
    var infoTimer = null;
    var canvasW = 0;

    function fadeTrimLoading() {
        if (el.trimLoading.classList.contains("hidden")) return;
        el.trimLoading.classList.add("fade");
        setTimeout(function () {
            el.trimLoading.classList.add("hidden");
        }, 480);
    }

    function fmtTime(t) {
        t = Math.max(0, Math.round(t * 10) / 10);
        var h = Math.floor(t / 3600),
            m = Math.floor((t % 3600) / 60),
            s = t % 60;
        var ss = s.toFixed(s % 1 ? 1 : 0);
        if (s < 10) ss = "0" + ss;
        return (h ? h + ":" + (m < 10 ? "0" : "") + m : m) + ":" + ss;
    }

    function parseTime(str) {
        var parts = String(str).trim().split(":");
        if (parts.length > 3) return null;
        var sec = 0;
        for (var i = 0; i < parts.length; i++) {
            var v = parseFloat(parts[i]);
            if (isNaN(v) || v < 0) return null;
            sec = sec * 60 + v;
        }
        return sec;
    }

    function trimActive(url) {
        return trimSel.enabled && media.url === url && media.duration > 0 &&
               (trimSel.start > 0.05 || trimSel.end < media.duration - 0.05);
    }

    function hideTrim(msg) {
        el.trimCard.classList.add("hidden");
        media.url = "";
        killPeaks();
        if (msg) log(msg, "warn");
    }

    /* ----- Análisis de la URL (debounced) ----- */

    function fetchMediaInfo(url, cfg) {
        if (!nodeAvailable) return;
        var token = ++infoToken;

        media = { url: url, duration: 0, title: "", peaks: null };
        trimSel.start = 0; trimSel.end = 0; trimSel.enabled = false;
        el.chkTrim.checked = false;
        refreshTrimEnabled();

        el.trimCard.classList.remove("hidden");
        el.trimLoading.classList.remove("hidden", "fade");
        el.trimLoading.textContent = t("ui.fetchInfo");
        el.trimTitle.textContent = t("ui.analyzing");
        el.trimDuration.textContent = "";
        drawTrim();

        // La descarga del audio del waveform arranca en paralelo al -J;
        // drainPeaks() espera a que llegue la duración para colocar picos.
        startPeaks(url, cfg, token);

        var proc, out = "";
        try {
            proc = spawn(cfg.ytdlp, [
                "--js-runtimes", "node", "--no-playlist", "-s",
                "--print", "%(title)s", "--print", "%(duration)s", url
            ], { windowsHide: true });
        } catch (e) { hideTrim(t("log.ytdlpNA")); return; }

        proc.stdout.on("data", function (d) { out += d.toString(); });
        proc.on("error", function () {
            if (token === infoToken) hideTrim(t("log.ytdlpNA"));
        });
        proc.on("close", function (code) {
            if (token !== infoToken) return;
            // Última línea = duración; el resto = título (puede tener saltos)
            var lines = out.split(/\r?\n/).filter(function (l) { return l.trim(); });
            var dur = parseFloat(lines.pop() || "");
            if (code !== 0 || !isFinite(dur) || dur <= 0) {
                hideTrim(t("log.noInfo"));
                return;
            }
            media.duration = dur;
            media.title = lines.join(" ") || "Video";
            trimSel.end = media.duration;
            el.trimTitle.textContent = media.title;
            el.trimDuration.textContent = fmtTime(media.duration);
            updateLoadingPct();
            syncTrimInputs();
            refreshTrimEnabled();

            drainPeaks();   // por si el PCM ya llegó antes que la duración
            drawTrim();
        });
    }

    /* ----- Waveform real: yt-dlp → ffmpeg → PCM → picos progresivos ----- */

    var peakState = null;
    var WAVE_RATE = 1000;   // Hz mono — picos visuales, mitad de datos

    function killPeaks() {
        var ps = peakState;
        if (!ps) return;
        if (ps.timer) clearTimeout(ps.timer);
        if (ps.pctTimer) clearInterval(ps.pctTimer);
        if (ps.procs) {
            ps.procs.forEach(function (p) { try { p.kill(); } catch (e) {} });
        }
        peakState = null;
    }

    /**
     * ETA en segundos para generar la onda según la duración del video:
     * ~2.5 s de overhead (spawn + resolución de formatos) y el audio se
     * baja/decodifica a ~12× su tiempo real en conexiones típicas.
     */
    function estimateEta(durationSec) {
        return 2.5 + durationSec * 0.08;
    }

    /**
     * Progreso mostrado al usuario: máximo entre lo real (PCM recibido) y
     * lo estimado por la ETA — lineal al 90% durante la ETA y asíntota
     * hacia 99% si tarda más. Nunca dice 100 hasta terminar de verdad.
     */
    function updateLoadingPct() {
        var ps = peakState;
        if (!ps || ps.token !== infoToken ||
            el.trimLoading.classList.contains("hidden") ||
            el.trimLoading.classList.contains("fade")) return;
        if (!media.duration) return;   // sigue "Obteniendo info…"

        var real = ps.expected ? ps.samplesDone / ps.expected : 0;
        var r = (Date.now() - ps.startedAt) / 1000 / estimateEta(media.duration);
        var est = r < 1 ? 0.9 * r : 0.9 + 0.09 * (1 - Math.exp(-(r - 1)));

        var pct = Math.round(Math.min(ps.done ? 1 : 0.99, Math.max(real, est)) * 100);
        el.trimLoading.textContent = t("ui.genWave") + pct + "%";
        if (pct >= 100) fadeTrimLoading();
    }

    function startPeaks(url, cfg, token) {
        killPeaks();
        // Selectores de fallback: si worstaudio no existe, bestaudio; si no, default.
        var selectors = ["worstaudio/worst", "ba/w", null];
        var attempt = 0;

        var ps = peakState = {
            token: token,
            B: 0, min: null, max: null, expected: 0,
            pending: [], samplesDone: 0, received: 0,
            procs: null, timer: null, pctTimer: null,
            done: false, lastDraw: 0, startedAt: Date.now()
        };
        ps.pctTimer = setInterval(updateLoadingPct, 300);

        function launch() {
            var ytd, ff;
            var args = ["--js-runtimes", "node", "--no-playlist", "-o", "-"];
            if (selectors[attempt]) args.push("-f", selectors[attempt]);
            args.push(url);
            try {
                ytd = spawn(cfg.ytdlp, args, { windowsHide: true });
                ff = spawn(ffmpegExe(cfg.ffmpeg), [
                    "-v", "error", "-i", "pipe:0",
                    "-vn", "-ac", "1", "-ar", String(WAVE_RATE),
                    "-f", "s16le", "pipe:1"
                ], { windowsHide: true });
            } catch (e) { retry(); return; }

            ps.procs = [ytd, ff];
            ytd.stdout.pipe(ff.stdin);
            ff.stdin.on("error", function () {});
            ytd.on("error", function () { try { ff.stdin.end(); } catch (e) {} });

            var failed = false;
            ff.stdout.on("data", function (c) {
                ps.pending.push(c);
                ps.received += c.length;
                var now = Date.now();
                if (now - ps.lastDraw > 150) {
                    ps.lastDraw = now;
                    drainPeaks();
                }
            });
            ff.on("error", function () {
                if (!failed) { failed = true; retry(); }
            });
            ff.on("close", function (code) {
                if (ps.done || failed) return;
                if (code !== 0 && ps.received === 0) { failed = true; retry(); return; }
                ps.done = true;
                drainPeaks();
                updateLoadingPct();
            });
        }

        function retry() {
            if (ps.done || token !== infoToken) return;
            attempt++;
            if (attempt < selectors.length) {
                ps.pending = [];
                ps.received = 0;
                ps.samplesDone = 0;
                launch();
            } else {
                ps.done = true;
                if (token === infoToken && ps.received === 0) {
                    log(t("log.noWave"), "dim");
                    fadeTrimLoading();
                }
            }
        }

        ps.timer = setTimeout(function () {
            var p = peakState;
            killPeaks();
            if (p && token === infoToken && !p.done) {
                log(t("log.waveSlow"), "dim");
                fadeTrimLoading();
            }
        }, 60000);

        launch();
    }

    /** Consume el PCM pendiente y actualiza media.peaks progresivamente. */
    function drainPeaks() {
        var ps = peakState;
        if (!ps || ps.token !== infoToken || !media.duration || !ps.pending.length) return;
        if (!ps.B) {
            ps.B = Math.max(240, Math.min(1400, Math.floor(media.duration * 8)));
            ps.min = new Float32Array(ps.B).fill(Infinity);
            ps.max = new Float32Array(ps.B).fill(-Infinity);
            ps.expected = Math.max(1, media.duration * WAVE_RATE);
        }
        var buf = ps.pending.length === 1 ? ps.pending[0] : Buffer.concat(ps.pending);
        ps.pending = [];
        var n = Math.floor(buf.length / 2),
            B = ps.B, min = ps.min, max = ps.max, base = ps.samplesDone;
        for (var j = 0; j < n; j++) {
            var b = Math.floor(((base + j) * B) / ps.expected);
            if (b >= B) break;
            var s = buf.readInt16LE(j * 2) / 32768;
            if (s < min[b]) min[b] = s;
            if (s > max[b]) max[b] = s;
        }
        ps.samplesDone += n;
        media.peaks = {
            min: min, max: max, n: B,
            filled: Math.min(1, ps.samplesDone / ps.expected)
        };
        drawTrim();
    }

    /* ----- Render del timeline ----- */

    function drawHandle(c, x, h) {
        c.fillStyle = "#e8e8e8";
        c.fillRect(x - 1, 0, 2, h);
        c.fillStyle = "#2680eb";
        c.fillRect(x - 4, 0, 8, 10);
    }

    function drawTrim() {
        var cv = el.trimCanvas;
        if (!cv || el.trimCard.classList.contains("hidden")) return;
        var w = cv.clientWidth, h = cv.clientHeight;
        if (!w || !h) return;
        var dpr = window.devicePixelRatio || 1;
        if (cv.width !== Math.round(w * dpr)) {
            cv.width = Math.round(w * dpr);
            cv.height = Math.round(h * dpr);
        }
        var c = cv.getContext("2d");
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        canvasW = w;

        var dur = media.duration || 0;
        var x0 = dur ? (trimSel.start / dur) * w : 0,
            x1 = dur ? (trimSel.end / dur) * w : w;

        c.fillStyle = "#141414";
        c.fillRect(0, 0, w, h);

        var mid = h / 2, amp = h / 2 - 6;
        if (media.peaks && media.peaks.filled > 0) {
            var pk = media.peaks, norm = 0.02;
            for (var i = 0; i < pk.n; i++) {
                var a = Math.max(
                    pk.max[i] === -Infinity ? 0 : pk.max[i],
                    pk.min[i] === Infinity ? 0 : -pk.min[i]);
                if (a > norm) norm = a;
            }
            var fillEnd = Math.floor(pk.filled * w);
            for (var x = 0; x < fillEnd; x++) {
                var bi = Math.min(pk.n - 1, Math.floor((x / w) * pk.n));
                var lo = pk.min[bi], hi = pk.max[bi];
                if (lo === Infinity) { lo = 0; hi = 0; }
                var yT = mid - (hi / norm) * amp,
                    yB = mid - (lo / norm) * amp;
                if (yB - yT < 1) yB = yT + 1;
                c.fillStyle = (x >= x0 && x <= x1) ? "#5b8fd4" : "#3a4a5e";
                c.fillRect(x, yT, 1, yB - yT);
            }
            // borde de carga + línea base en la zona pendiente
            c.fillStyle = "rgba(91,143,212,0.55)";
            c.fillRect(fillEnd, 2, 1, h - 4);
            if (fillEnd < w) {
                c.fillStyle = "rgba(58,74,94,0.4)";
                c.fillRect(fillEnd + 1, mid, w - fillEnd - 1, 1);
            }
        } else {
            c.fillStyle = "#333";
            c.fillRect(0, mid, w, 1);
        }

        // ticks de tiempo: orientación útil desde el primer segundo
        if (dur) {
            var step = dur / 7;
            var steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
            for (i = 0; i < steps.length; i++) {
                if (steps[i] >= step) { step = steps[i]; break; }
            }
            c.fillStyle = "rgba(255,255,255,0.18)";
            for (var t = step; t < dur; t += step) {
                c.fillRect(Math.floor((t / dur) * w), 2, 1, 4);
            }
        }

        // oscurecer fuera de la selección + borde
        c.fillStyle = "rgba(10,10,12,0.6)";
        c.fillRect(0, 0, x0, h);
        c.fillRect(x1, 0, w - x1, h);
        c.fillStyle = "#2680eb";
        c.fillRect(x0, 0, x1 - x0, 2);
        c.fillRect(x0, h - 2, x1 - x0, 2);

        drawHandle(c, x0, h);
        drawHandle(c, x1, h);

        // etiquetas in/out dentro del timeline
        c.font = "9px Consolas, monospace";
        c.fillStyle = "#e8e8e8";
        c.fillText(fmtTime(trimSel.start), Math.min(x0 + 6, w - 34), h - 5);
        var eLbl = fmtTime(trimSel.end);
        c.fillText(eLbl, Math.max(x1 - 6 - c.measureText(eLbl).width, 2), h - 5);
    }

    /* ----- Interacción (handles + región) ----- */

    var dragMode = null, grabOff = 0;

    function x2t(px) {
        return media.duration
            ? Math.max(0, Math.min(media.duration, (px / canvasW) * media.duration))
            : 0;
    }

    function applyDrag(px) {
        var t = x2t(px), span = trimSel.end - trimSel.start;
        if (dragMode === "l") {
            trimSel.start = Math.min(t, trimSel.end - 0.1);
        } else if (dragMode === "r") {
            trimSel.end = Math.max(t, trimSel.start + 0.1);
        } else if (dragMode === "move") {
            var ns = Math.max(0, Math.min(media.duration - span, t - grabOff));
            trimSel.start = ns;
            trimSel.end = ns + span;
        }
        trimSel.start = Math.max(0, Math.min(media.duration, trimSel.start));
        trimSel.end = Math.max(0, Math.min(media.duration, trimSel.end));
        syncTrimInputs();
        drawTrim();
    }

    /* ----- Controles ----- */

    function syncTrimInputs() {
        el.trimStart.value = fmtTime(trimSel.start);
        el.trimEnd.value = fmtTime(trimSel.end);
    }

    function commitTrimInput(which) {
        var inp = which === "start" ? el.trimStart : el.trimEnd;
        var t = parseTime(inp.value);
        if (t === null) { syncTrimInputs(); return; }
        if (which === "start") {
            trimSel.start = Math.max(0, Math.min(t, trimSel.end - 0.1));
        } else {
            trimSel.end = Math.min(media.duration, Math.max(t, trimSel.start + 0.1));
        }
        syncTrimInputs();
        drawTrim();
    }

    function refreshTrimEnabled() {
        trimSel.enabled = el.chkTrim.checked;
        var on = trimSel.enabled && media.duration > 0;
        el.trimStart.disabled = !on;
        el.trimEnd.disabled = !on;
        el.btnTrimReset.disabled = !on;
        el.trimCard.classList.toggle("trim-off", !trimSel.enabled);
        drawTrim();
    }

    function resetTrim() {
        if (!media.duration) return;
        trimSel.start = 0;
        trimSel.end = media.duration;
        syncTrimInputs();
        drawTrim();
    }

    /* ---------------- Construcción de argumentos ---------------- */

    /**
     * Cadena -f de yt-dlp: prefiere H.264+AAC; si maxHeight limita la
     * resolución y al final hay fallback sin restricción para no fallar.
     */
    function videoFormatSelector(maxHeight) {
        var h = maxHeight ? "[height<=" + maxHeight + "]" : "";
        return "bv*[vcodec^=avc1]" + h + "[ext=mp4]+ba[acodec^=mp4a]/" +
               "bv*[vcodec^=avc1]" + h + "+ba[acodec^=mp4a]/" +
               "b[vcodec^=avc1]" + h + "/" +
               "bv*" + h + "+ba/" +
               "b" + h + "/" +
               "bv*+ba/b";
    }

    function buildArgs(cfg, url) {
        var format = currentFormat();

        var args = [
            "--newline",                // progreso línea a línea
            "--no-playlist",
            "-N", "4",                  // fragmentos concurrentes (DASH/HLS)
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
            args.push(
                "-x", "--audio-format", "mp3",
                "--audio-quality", el.selAq.value
            );
        } else {
            // Preferir streams H.264+AAC (nativos de Premiere). Si el video
            // solo existe en VP9/AV1, baja el mejor disponible y luego
            // ensureCompatible() lo transcodifica con ffmpeg.
            var maxH = el.selVq.value === "best" ? "" : el.selVq.value;
            args.push(
                "-f", videoFormatSelector(maxH),
                "--merge-output-format", "mp4"
            );
        }

        // Recorte: --download-sections corta durante la descarga vía ffmpeg.
        // --force-keyframes-at-cuts re-encoda en los bordes para que el corte
        // sea exacto (solo video; en audio no aplica).
        if (trimActive(url)) {
            args.push(
                "--download-sections",
                "*" + trimSel.start.toFixed(2) + "-" + trimSel.end.toFixed(2)
            );
            if (format === "video") args.push("--force-keyframes-at-cuts");
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
            log(t("log.already", m[1]), "dim");
            return;
        }
        for (var i = 0; i < RE_DESTINATIONS.length; i++) {
            if ((m = RE_DESTINATIONS[i].exec(line))) {
                ctx.finalPath = m[2] || m[1];
                return;
            }
        }
        if (line.indexOf("[Merger]") === 0) {
            log(t("log.merging"), "dim");
        } else if (line.indexOf("[ExtractAudio]") === 0) {
            log(t("log.procAudio"), "dim");
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
            log(t("log.noUrl"), "warn");
            return;
        }
        if (!refreshUiState()) return;

        downloading = true;
        cancelled = false;
        el.btnDownload.disabled = false;
        el.btnDownload.textContent = t("ui.btnCancel");
        el.btnDownload.classList.add("btn-danger");
        setProgress(0);
        setDot("busy");
        log(t("log.downloading", url), "info");
        if (trimActive(url)) {
            log(t("log.trim", fmtTime(trimSel.start), fmtTime(trimSel.end)), "info");
        }

        var args = buildArgs(cfg, url);
        var ctx = { finalPath: null, printedPath: null, destDir: cfg.dest };

        var proc;
        try {
            proc = spawn(cfg.ytdlp, args, { windowsHide: true });
            activeProc = proc;
        } catch (e) {
            finishError(t("log.ytdlpErr", e.message));
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
            finishError(t("log.ytdlpErr", e.message));
        });

        proc.on("close", function (code) {
            var finalPath = ctx.printedPath || ctx.finalPath;

            if (cancelled) {
                finishError(t("log.cancelled"));
                return;
            }
            if (code !== 0) {
                finishError(t("log.exitCode", code));
                return;
            }
            if (!finalPath) {
                finishError(t("log.noPath"));
                return;
            }

            log(t("log.dlDone", finalPath), "ok");
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
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            tmp
        ];

        log(t("log.converting"), "info");
        setDot("busy");

        var proc;
        try {
            proc = spawn(ffmpegExe(cfg.ffmpeg), args, { windowsHide: true });
            activeProc = proc;
        } catch (e) {
            log(t("log.ffLaunch", e.message), "warn");
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
            log(t("log.ffFail", e.message), "warn");
            done(src);
        });

        proc.on("close", function (code) {
            if (cancelled) {
                try { fs.unlinkSync(tmp); } catch (e) {}
                finishError(t("log.cancelled"));
                return;
            }
            if (code === 0) {
                try {
                    fs.unlinkSync(src);
                    fs.renameSync(tmp, src);
                    log(t("log.convOk"), "ok");
                } catch (e) {
                    log(t("log.convReplace", e.message), "warn");
                    try { fs.unlinkSync(tmp); } catch (e2) {}
                }
            } else {
                try { fs.unlinkSync(tmp); } catch (e) {}
                log(t("log.convFail", code), "warn");
            }
            done(src);
        });
    }

    /** Garantiza que el archivo use codecs que Premiere puede importar. */
    function ensureCompatible(filePath, cfg, done) {
        if (!nodeAvailable) { done(filePath); return; }

        probeMedia(filePath, cfg, function (info) {
            if (!info || !info.streams) {
                log(t("log.probeFail"), "warn");
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
        log(t("log.importing"), "info");

        // JSON.stringify escapa correctamente \ y " para el literal ExtendScript.
        var script = 'importMedia(' + JSON.stringify(filePath.replace(/\//g, "\\")) + ')';

        csInterface.evalScript(script, function (result) {
            downloading = false;
            activeProc = null;
            resetDownloadBtn();

            if (result === "OK") {
                setDot("ok");
                log(t("log.importOk"), "ok");
            } else if (result === "EvalScript error.") {
                setDot("error");
                log(t("log.importErr"), "error");
            } else {
                setDot("error");
                log(String(result), "error");
            }
        });
    }

    function finishError(msg) {
        downloading = false;
        activeProc = null;
        setProgress(parseFloat(el.progressText.textContent) || 0, "error");
        setDot("error");
        log(msg, "error");
        resetDownloadBtn();
    }

    function resetDownloadBtn() {
        el.btnDownload.textContent = t("ui.btnDownload");
        el.btnDownload.classList.remove("btn-danger");
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

    el.formatRadios.forEach(function (r) {
        r.addEventListener("change", function () {
            refreshQualityFields();
            savePrefs();
        });
    });

    [el.selVq, el.selAq].forEach(function (sel) {
        sel.addEventListener("change", savePrefs);
    });

    /* ----- Trimmer: eventos ----- */

    el.url.addEventListener("input", function () {
        clearTimeout(infoTimer);
        var u = el.url.value.trim();
        if (u === media.url) return;
        if (!/^https?:\/\/\S+$/i.test(u)) {
            infoToken++;                     // invalida fetch en curso
            killPeaks();
            el.trimCard.classList.add("hidden");
            media.url = "";
            return;
        }
        infoTimer = setTimeout(function () {
            fetchMediaInfo(u, getConfig());
        }, 800);
    });

    el.trimCanvas.addEventListener("mousedown", function (e) {
        if (!media.duration || !trimSel.enabled) return;
        var x = e.offsetX;
        var x0 = (trimSel.start / media.duration) * canvasW,
            x1 = (trimSel.end / media.duration) * canvasW;
        if (Math.abs(x - x0) <= 7) dragMode = "l";
        else if (Math.abs(x - x1) <= 7) dragMode = "r";
        else if (x > x0 && x < x1) { dragMode = "move"; grabOff = x2t(x) - trimSel.start; }
        else if (Math.abs(x - x0) <= Math.abs(x - x1)) {
            trimSel.start = Math.min(x2t(x), trimSel.end - 0.1);
            dragMode = "l";
        } else {
            trimSel.end = Math.max(x2t(x), trimSel.start + 0.1);
            dragMode = "r";
        }
        syncTrimInputs();
        drawTrim();
        e.preventDefault();
    });

    el.trimCanvas.addEventListener("mousemove", function (e) {
        if (dragMode || !media.duration || !trimSel.enabled) {
            el.trimCanvas.style.cursor = "crosshair";
            return;
        }
        var x = e.offsetX;
        var x0 = (trimSel.start / media.duration) * canvasW,
            x1 = (trimSel.end / media.duration) * canvasW;
        el.trimCanvas.style.cursor =
            (Math.abs(x - x0) <= 7 || Math.abs(x - x1) <= 7) ? "ew-resize" :
            (x > x0 && x < x1) ? "grab" : "crosshair";
    });

    window.addEventListener("mousemove", function (e) {
        if (!dragMode) return;
        var r = el.trimCanvas.getBoundingClientRect();
        applyDrag(e.clientX - r.left);
    });

    window.addEventListener("mouseup", function () { dragMode = null; });

    el.trimCanvas.addEventListener("dblclick", resetTrim);
    el.btnTrimReset.addEventListener("click", resetTrim);
    el.chkTrim.addEventListener("change", refreshTrimEnabled);
    el.trimStart.addEventListener("change", function () { commitTrimInput("start"); });
    el.trimEnd.addEventListener("change", function () { commitTrimInput("end"); });
    window.addEventListener("resize", drawTrim);

    el.btnDownload.addEventListener("click", function () {
        if (downloading) {
            cancelled = true;
            if (activeProc) { try { activeProc.kill(); } catch (e) {} }
            return;
        }
        startDownload();
    });

    /* ---------------- Arranque ---------------- */

    if (!nodeAvailable) {
        log(t("log.noNode"), "error");
    }

    applyI18n();
    loadConfig();
    loadPrefs();
    refreshQualityFields();

    var startupCfg = getConfig();
    probeVersion(startupCfg.ytdlp, ["--version"], function (v) {
        log(v ? t("log.ytdlpReady", v) : t("log.noYtdlp"),
            v ? "ok" : "warn");
    });
    probeVersion(startupCfg.ffmpeg, ["-version"], function (v) {
        if (v) log(t("log.ffmpegReady", v.split(" Copyright")[0]), "ok");
    });

    if (!refreshUiState()) {
        el.configSection.open = true;   // abrir config si falta algo
        log(t("log.cfgCheck"), "info");
    } else {
        log(t("log.ready"), "ok");
    }
    setDot("idle");
})();

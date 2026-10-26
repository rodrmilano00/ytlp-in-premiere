/*
 * CSInterface.js — Implementación compacta de la API de Adobe CEP.
 * Cubre los métodos necesarios para comunicar el panel (JS/CEF) con
 * ExtendScript dentro de Premiere Pro.
 *
 * Puedes reemplazar este archivo por el CSInterface.js oficial de
 * https://github.com/Adobe-CEP/CEP-Resources si lo prefieres.
 */

/* ---------------- Tipos auxiliares ---------------- */

function Version(major, minor, micro, special) {
    this.major = major;
    this.minor = minor;
    this.micro = micro;
    this.special = special;
}

Version.prototype.majorNum = function () { return this.major; };

var SystemPath = {
    USER_DATA: "userData",
    COMMON_FILES: "commonFiles",
    MY_DOCUMENTS: "myDocuments",
    HOST_APPLICATION: "hostApplication",
    EXTENSION: "extension"
};

var CSEventScope = { APPLICATION: "APPLICATION", GLOBAL: "GLOBAL" };

function CSEvent(type, scope, appId, extensionId) {
    this.type = type;
    this.scope = scope;
    this.appId = appId;
    this.extensionId = extensionId;
}

function Event(type, scope, appId, extensionId) {
    this.type = type;
    this.scope = scope;
    this.appId = appId;
    this.extensionId = extensionId;
}

/* ---------------- Clase principal ---------------- */

function CSInterface() {}

CSInterface.THEME_COLOR_CHANGED_EVENT = "com.adobe.csxs.events.ThemeColorChanged";
CSInterface.EVALSCRIPT_ERR_CALLBACK = 1;

/**
 * Ejecuta un script ExtendScript en la aplicación host.
 * @param {string}   script   Código JSX a evaluar.
 * @param {function} callback Recibe el valor devuelto por el script.
 */
CSInterface.prototype.evalScript = function (script, callback) {
    if (callback === null || callback === undefined) {
        callback = function (result) {};
    }
    window.__adobe_cep__.evalScript(script, callback);
};

/** Cierra esta extensión. */
CSInterface.prototype.closeExtension = function () {
    window.__adobe_cep__.closeExtension();
};

/** Devuelve una ruta del sistema (SystemPath.*). */
CSInterface.prototype.getSystemPath = function (pathType) {
    var path = decodeURIComponent(window.__adobe_cep__.getSystemPath(pathType));
    var OSVersion = this.getOSInformation();
    if (OSVersion.indexOf("Windows") >= 0) {
        path = path.replace("file:///", "");
    } else {
        path = path.replace("file://", "");
    }
    return path;
};

/** ID de esta extensión, según el manifest. */
CSInterface.prototype.getExtensionID = function () {
    return window.__adobe_cep__.getExtensionId();
};

/** Información del host (appId, appName, appVersion, appLocale...). */
CSInterface.prototype.getHostEnvironment = function () {
    var hostEnv = window.__adobe_cep__.getHostEnvironment();
    return JSON.parse(hostEnv);
};

/** Información del sistema operativo donde corre CEP. */
CSInterface.prototype.getOSInformation = function () {
    var userAgent = window.navigator.userAgent;
    if (userAgent.indexOf("Windows") > -1) {
        return "Windows Operation System";
    }
    if (userAgent.indexOf("Mac") > -1) {
        return "Macintosh Operation System";
    }
    return "Operation System Information Unknown <userAgent: " + userAgent + ">";
};

/** Abre una URL en el navegador predeterminado del sistema. */
CSInterface.prototype.openURLInDefaultBrowser = function (url) {
    return cep.util.openURLInDefaultBrowser(url);
};

/** Registra un listener para un evento CEP. */
CSInterface.prototype.addEventListener = function (type, listener, obj) {
    window.__adobe_cep__.addEventListener(type, function (event) {
        listener.call(obj, event);
    });
};

/** Quita un listener registrado con addEventListener. */
CSInterface.prototype.removeEventListener = function (type, listener) {
    window.__adobe_cep__.removeEventListener(type, listener);
};

/** Despacha un evento CEP (para comunicación entre extensiones). */
CSInterface.prototype.dispatchEvent = function (event) {
    if (typeof event.data === "object") {
        event.data = JSON.stringify(event.data);
    }
    window.__adobe_cep__.dispatchEvent(event);
};

/** Carga el .jsx indicado en el motor ExtendScript del host. */
CSInterface.prototype.loadBundle = function (extensionPath, startupScript) {
    try {
        var bundleRoot = this.getSystemPath(SystemPath.EXTENSION);
        var scriptPath = bundleRoot + "/" + startupScript;
        window.__adobe_cep__.evalScript(
            'new File("' + scriptPath + '").exists ? $.evalFile("' +
            scriptPath.replace(/\\/g, "/") + '") : "NOT_FOUND"'
        );
    } catch (e) { /* noop */ }
};

/* ============================================================
   hostscript.jsx — ExtendScript ejecutado dentro de Premiere Pro
   Recibe la ruta absoluta del archivo descargado y lo importa
   al proyecto activo.
   ============================================================ */

/**
 * Importa un archivo de media al proyecto activo de Premiere.
 * @param  {string} filePath  Ruta absoluta del archivo (se pasa ya escapada).
 * @return {string} "OK" o un mensaje "ERROR: ..." legible desde app.js.
 */
function importMedia(filePath) {
    try {
        if (!app || !app.project) {
            return "ERROR: No hay ningún proyecto abierto en Premiere.";
        }

        var ok = app.project.importFiles(
            [filePath],              // array de rutas a importar
            true,                    // suppressUI: sin diálogos de importación
            app.project.rootItem,    // destino: raíz del panel Proyecto
            false                    // importAsNumberedStills: no aplica
        );

        if (ok) {
            return "OK";
        }
        return "ERROR: app.project.importFiles devolvió false.";
    } catch (e) {
        return "ERROR: " + e.toString();
    }
}

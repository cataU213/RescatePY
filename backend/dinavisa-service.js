"use strict";

// Consulta automatizada del Registro de Establecimientos (RE).
// Utiliza el formulario XAJAX público del portal; no intenta saltar CAPTCHA
// ni controles de acceso. Si el portal impide la consulta, devuelve rechazo.

const https = require("https");

const URL_BASE = "https://gestion.inan.gov.py/consultaRe/";
const URL_BUSQUEDA = new URL("index.server.php", URL_BASE);

function solicitar(url, { method = "GET", headers = {}, body = "" } = {}) {
    // Petición HTTPS nativa para no agregar dependencias al proyecto.
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method,
            headers: {
                "User-Agent": "RescatePY/1.0 (verificacion documental)",
                "Accept": "text/html,application/xml,text/xml,*/*",
                ...headers
            },
            timeout: 25000
        }, (res) => {
            let contenido = "";

            res.setEncoding("utf8");
            res.on("data", parte => { contenido += parte; });
            res.on("end", () => {
                resolve({
                    statusCode: res.statusCode || 0,
                    headers: res.headers,
                    body: contenido
                });
            });
        });

        req.on("timeout", () => req.destroy(new Error("Tiempo de espera agotado al consultar el portal oficial.")));
        req.on("error", reject);

        if (body) req.write(body);
        req.end();
    });
}

function obtenerCookies(headers) {
    // Conserva las cookies de sesión entregadas por el portal.
    const cookies = headers["set-cookie"] || [];
    return cookies.map(cookie => cookie.split(";")[0]).filter(Boolean).join("; ");
}

function decodificarHTML(valor) {
    return String(valor || "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function textoCelda(html) {
    // Convierte las celdas HTML de la tabla en texto legible.
    return decodificarHTML(
        String(html || "")
            .replace(/<br\s*\/?>/gi, " | ")
            .replace(/<[^>]*>/g, " ")
    ).replace(/\s+/g, " ").trim();
}

function normalizarRUC(valor) {
    return String(valor || "").replace(/\D/g, "");
}

function normalizarNombre(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}

function fechaParaguayaAFecha(valor) {
    // Convierte DD-MM-AAAA a fecha local, evitando errores de zona horaria.
    const match = String(valor || "").match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return null;

    const dia = Number(match[1]);
    const mes = Number(match[2]);
    const anio = Number(match[3]);
    const fecha = new Date(anio, mes - 1, dia);

    if (
        fecha.getFullYear() !== anio ||
        fecha.getMonth() !== mes - 1 ||
        fecha.getDate() !== dia
    ) return null;

    fecha.setHours(0, 0, 0, 0);
    return fecha;
}

function extraerComandoDataTable(xml) {
    // Obtiene el HTML devuelto dentro del CDATA del comando data-table.
    const match = String(xml || "").match(
        /<cmd\b[^>]*\bt=["']data-table["'][^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/cmd>/i
    );
    return match ? match[1] : "";
}

function analizarRegistros(html) {
    const filas = [...String(html || "").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    const registros = [];

    for (const fila of filas) {
        const celdas = [...fila[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
            .map(item => item[1]);

        if (celdas.length < 5) continue;

        const registroRE = textoCelda(celdas[0]).replace(/\s+/g, "");
        const empresaTexto = textoCelda(celdas[1]).split("|");
        const ruc = (empresaTexto[0] || "").trim();
        const razonSocial = (empresaTexto.slice(1).join(" ") || "").trim();
        const localidad = textoCelda(celdas[2]);

        // El estado viene en una etiqueta HTML y la fecha debajo de ella.
        const estadoMatch = celdas[3].match(/<span\b[^>]*>([\s\S]*?)<\/span>/i);
        const estado = estadoMatch
            ? textoCelda(estadoMatch[1]).toUpperCase()
            : textoCelda(celdas[3]).split("|")[0].toUpperCase();

        const vencimientoMatch = textoCelda(celdas[3]).match(/\b\d{2}-\d{2}-\d{4}\b/);
        const vencimiento = vencimientoMatch ? vencimientoMatch[0] : null;
        const actividad = textoCelda(celdas[4]);

        if (!registroRE || !ruc) continue;

        registros.push({
            registroRE,
            ruc,
            razonSocial,
            localidad,
            estado,
            vencimiento,
            actividad
        });
    }

    return registros;
}

async function consultarRegistroRE({ ruc, razonSocial } = {}) {
    const rucBuscado = normalizarRUC(ruc);

    if (!rucBuscado) {
        return {
            estado: "RECHAZADO",
            verificado: false,
            motivo: "RUC_NO_INFORMADO",
            registros: []
        };
    }

    try {
        // Primero se abre el formulario para obtener la sesión y las cookies.
        const inicial = await solicitar(URL_BASE);
        if (inicial.statusCode < 200 || inicial.statusCode >= 400) {
            throw new Error(`El portal respondió HTTP ${inicial.statusCode} al iniciar la sesión.`);
        }

        const cookies = obtenerCookies(inicial.headers);

        // Estos son los campos observados en la petición real del navegador.
        const consulta = [
            "id1=",
            "id0=",
            "page=1",
            "page-limit=1",
            "re=",
            `ruc=${encodeURIComponent(ruc)}`,
            "nombre=",
            "domicilio=",
            "index=1",
            "denominacion=0",
            "base=0",
            "categoria=0"
        ].join("&");

        const xmlArgumento = `<xjxquery><q>${consulta}</q></xjxquery>`;
        const form = new URLSearchParams();
        form.set("xajax", "search");
        form.set("xajaxr", String(Date.now()));
        form.append("xajaxargs[]", xmlArgumento);

        const respuesta = await solicitar(URL_BUSQUEDA, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Content-Length": Buffer.byteLength(form.toString()),
                "Origin": "https://gestion.inan.gov.py",
                "Referer": URL_BASE,
                "X-Requested-With": "XMLHttpRequest",
                ...(cookies ? { Cookie: cookies } : {})
            },
            body: form.toString()
        });

        if (respuesta.statusCode < 200 || respuesta.statusCode >= 300) {
            throw new Error(`La consulta oficial respondió HTTP ${respuesta.statusCode}.`);
        }

        const htmlTabla = extraerComandoDataTable(respuesta.body);
        if (!htmlTabla) {
            throw new Error("El portal no devolvió el bloque data-table esperado.");
        }

        const registros = analizarRegistros(htmlTabla);
        const coincidenciasRUC = registros.filter(
            registro => normalizarRUC(registro.ruc) === rucBuscado
        );

        const nombreBuscado = normalizarNombre(razonSocial);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const evaluados = coincidenciasRUC.map(registro => {
            const fechaVencimiento = fechaParaguayaAFecha(registro.vencimiento);
            const vigente = Boolean(fechaVencimiento && fechaVencimiento >= hoy);
            const activo = registro.estado === "ACTIVO";
            const coincideRazonSocial = nombreBuscado
                ? normalizarNombre(registro.razonSocial) === nombreBuscado
                : false;

            return {
                ...registro,
                coincideRazonSocial,
                activo,
                vigente,
                valido: activo && vigente && (!nombreBuscado || coincideRazonSocial)
            };
        });

        // Basta un registro RE activo y vigente que coincida con el RUC
        // y, si se proporcionó, con la razón social registrada.
        const registroValido = evaluados.find(item => item.valido) || null;

        return {
            estado: registroValido ? "APROBADO" : "RECHAZADO",
            verificado: Boolean(registroValido),
            motivo: registroValido
                ? "RUC y registro RE encontrados en el portal oficial; registro activo y vigente."
                : registros.length === 0
                    ? "EL_PORTAL_NO_DEVOLVIO_REGISTROS"
                    : coincidenciasRUC.length === 0
                        ? "RUC_NO_ENCONTRADO_EN_DINAVISA"
                        : "SIN_REGISTRO_ACTIVO_VIGENTE_O_RAZON_SOCIAL_COINCIDENTE",
            registros: evaluados,
            fuente: URL_BASE
        };

    } catch (error) {
        // Ante una consulta fallida no se aprueba por suposición.
        return {
            estado: "RECHAZADO",
            verificado: false,
            motivo: "NO_SE_PUDO_VERIFICAR_EN_FUENTE_OFICIAL",
            detalle: error.message,
            registros: [],
            fuente: URL_BASE
        };
    }
}

module.exports = {
    consultarRegistroRE,
    analizarRegistros,
    normalizarRUC,
    normalizarNombre
};
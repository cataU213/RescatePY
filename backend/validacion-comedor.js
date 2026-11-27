const DINAVISA_URL =
    "https://gestion.inan.gov.py/reportes_publicos/re_01/";

// Normaliza textos para facilitar la identificación documental.
function normalizar(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/\s+/g, " ")
        .trim();
}

// Identifica los documentos por sus títulos y contenido.
function clasificarDocumentos(texto) {
    const t = normalizar(texto);
    const tipos = [];

    if (/CEDULA TRIBUTARIA|CONSTANCIA DE INSCRIPCION EN EL RUC/.test(t)) {
        tipos.push("CEDULA_TRIBUTARIA");
    }

    if (/CEDULA DE IDENTIDAD|IDENTIFICACION CIVIL/.test(t)) {
        tipos.push("CI_REPRESENTANTE");
    }

    // Evitar depender de que el OCR lea perfectamente DINAVISA.
    if (
        /REGISTRO DE ESTABLECIMIENTO/.test(t) &&
        /VIGILANCIA SANITARIA|DINAVISA/.test(t)
    ) {
        tipos.push("REGISTRO_DINAVISA");
    }

    if (
        /LICENCIA MUNICIPAL|PATENTE COMERCIAL|HABILITACION MUNICIPAL/.test(t)
    ) {
        tipos.push("HABILITACION_MUNICIPAL");
    }

    return [...new Set(tipos)];
}

function extraerDatosDocumentales(texto) {
    // Normalizar acentos sin eliminar las líneas originales.
    const contenido = String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .toUpperCase();

    const lineas = contenido.split("\n")
        .map(linea => linea.trim())
        .filter(Boolean);

    // Buscar cada campo únicamente al inicio de una línea.
    const buscarLinea = (regex) => {
        for (const linea of lineas) {
            const resultado = linea.match(regex);
            if (resultado) return resultado[1].trim();
        }
        return null;
    };

    // Identificar RUC sin confundirlo con otros números.
    const ruc = buscarLinea(
        /^(?:R\.?\s*U\.?\s*C\.?|REGISTRO\s+UNICO\s+DE\s+CONTRIBUYENTES)\s*(?:N(?:RO|[°ºO])?\.?)?\s*[:#-]?\s*([0-9][0-9./\- ]{4,20})$/i
    );

    // CI solamente cuando aparece como etiqueta independiente.
    const ci = buscarLinea(
        /^(?:C\.?\s*I\.?|CEDULA(?:\s+DE\s+IDENTIDAD)?|DOCUMENTO\s+DE\s+IDENTIDAD)\s*(?:N(?:RO|[°ºO])?\.?)?\s*[:#-]?\s*([0-9][0-9.\- ]{3,15})$/i
    );

    // Extraer razón social sin incorporar otras líneas.
    const razonSocial = buscarLinea(
        /^(?:N?OMBRE\/RAZON SOCIAL|RAZON SOCIAL)\s*[:#-]\s*(.+)$/i
    );

    // Extraer el representante.
    const representante = buscarLinea(
        /^(?:REPRESENTANTE(?: LEGAL)?|NOMBRE DEL REPRESENTANTE)\s*[:#-]\s*(.+)$/i
    );

    // Identificar el registro sanitario.
    const numeroRE = buscarLinea(
        /^(?:R\.?\s*E\.?|REGISTRO DE ESTABLECIMIENTO)\s*(?:N(?:RO|[°ºO])?\.?)?\s*[:#-]?\s*([0-9][0-9./-]{3,20})$/i
    );

    // Leer fecha de vencimiento.
    const vencimiento = buscarLinea(
        /^(?:VALIDO HASTA|VENCIMIENTO|FECHA DE VENCIMIENTO|VENCE EL)\s*[:#-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})$/i
    );

    // Recuperar domicilio sin mezclarlo con otros campos.
    const direccion = buscarLinea(
        /^(?:D?IRECCION|DOMICILIO)\s*[:#-]\s*(.+)$/i
    );

    return {
        tipos: clasificarDocumentos(texto),
        ruc,
        ci,
        razonSocial,
        representante,
        numeroRE,
        vencimiento,
        direccion
    };
}
// Comprueba si están presentes los cuatro documentos exigidos.
function verificarDocumentosObligatorios(documentos) {
    const requeridos = [
        "CEDULA_TRIBUTARIA",
        "CI_REPRESENTANTE",
        "REGISTRO_DINAVISA",
        "HABILITACION_MUNICIPAL"
    ];

    const encontrados = new Set(
        documentos.flatMap(item => item.tipos || [])
    );

    const faltantes = requeridos.filter(
        tipo => !encontrados.has(tipo)
    );

    return {
        completo: faltantes.length === 0,
        encontrados: [...encontrados],
        faltantes
    };
}

// Separa el número RUC de su dígito verificador.
function separarRUC(valor) {
    const coincidencia = String(valor || "")
        .trim()
        .match(/^(\d{5,10})[-/](\d)$/);

    if (!coincidencia) return null;

    return {
        ruc: coincidencia[1],
        dv: coincidencia[2]
    };
}

// Consulta el servicio REST oficial de DNIT.
async function consultarDNIT(valorRUC) {
    const apiKey = process.env.DNIT_API_KEY;

    if (!apiKey) {
        return {
            verificado: false,
            motivo: "Falta configurar la API Key de DNIT."
        };
    }

    const datos = separarRUC(valorRUC);

    if (!datos) {
        return {
            verificado: false,
            motivo: "El RUC no tiene un formato válido."
        };
    }

    const url = new URL(
        "https://servicios.set.gov.py/EsetApiWS/ApiWS/consultaRUC"
    );

    // Enviar los parámetros exigidos por DNIT.
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("ruc", datos.ruc);
    url.searchParams.set("dv", datos.dv);

    try {
        const respuesta = await fetch(url, {
            signal: AbortSignal.timeout(10000)
        });

        if (!respuesta.ok) {
            throw new Error("Servicio DNIT no disponible.");
        }

        const resultado = await respuesta.json();
        const contribuyente = resultado.contribuyente || {};

        const valido =
            resultado.estado === "VALIDO" &&
            resultado.codigo === "VALIDO" &&
            contribuyente.estado === "ACTIVO";

        return {
            verificado: valido,
            razonSocial: contribuyente.razonSocial || null,
            estado: contribuyente.estado || resultado.estado,
            tipoPersona: contribuyente.tipoPersona || null,
            nombreComercial: contribuyente.nombreComercial || null,
            motivo: valido
                ? "RUC confirmado por DNIT."
                : resultado.mensaje || "RUC no validado por DNIT."
        };

    } catch (error) {
        return {
            verificado: false,
            motivo: error.message || "Error consultando DNIT."
        };
    }
}

// Normaliza razones sociales para comparar resultados oficiales.
function compararRazonSocial(a, b) {
    return normalizar(a) === normalizar(b);
}

module.exports = {
    clasificarDocumentos,
    extraerDatosDocumentales,
    verificarDocumentosObligatorios,
    separarRUC,
    consultarDNIT,
    compararRazonSocial,
    DINAVISA_URL
};
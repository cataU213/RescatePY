
const { createWorker } = require("tesseract.js");
const { createCanvas } = require("@napi-rs/canvas");

// Limitar los PDF a 10 páginas.
const MAX_PDF_PAGES = 10;

// Reutilizar el motor OCR.
let workerPromise = null;

// Inicializar reconocimiento en español e inglés.
async function obtenerWorkerOCR() {
    if (!workerPromise) {
        workerPromise = createWorker("spa+eng").catch(error => {
            workerPromise = null;
            throw error;
        });
    }

    return workerPromise;
}

// Reconocer texto de una imagen.
async function reconocerImagen(buffer, worker) {
    const resultado = await worker.recognize(buffer);

    return {
        texto: resultado.data.text.trim(),
        confianza: Number(resultado.data.confidence || 0)
    };
}

// Procesar PDF página por página.
async function reconocerPDF(buffer, worker) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const tareaPDF = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true
    });

    const documento = await tareaPDF.promise;

    try {
        if (documento.numPages > MAX_PDF_PAGES) {
            throw new Error(
                `El PDF supera el máximo de ${MAX_PDF_PAGES} páginas.`
            );
        }

        const paginas = [];
        let confianzaTotal = 0;

        for (let numero = 1; numero <= documento.numPages; numero++) {
            const pagina = await documento.getPage(numero);

            // Convertir la página en imagen.
            const viewport = pagina.getViewport({ scale: 1.5 });

            const canvas = createCanvas(
                Math.ceil(viewport.width),
                Math.ceil(viewport.height)
            );

            const contexto = canvas.getContext("2d");

            await pagina.render({
                canvasContext: contexto,
                viewport
            }).promise;

            // Ejecutar OCR.
            const imagen = canvas.toBuffer("image/png");
            const resultado = await reconocerImagen(imagen, worker);

            paginas.push(
                `--- Página ${numero} ---\n${resultado.texto}`
            );

            confianzaTotal += resultado.confianza;

            pagina.cleanup();
        }

        return {
            texto: paginas.join("\n\n"),
            confianza: confianzaTotal / documento.numPages,
            paginas: documento.numPages
        };

    } finally {
        // Liberar memoria del PDF.
        await tareaPDF.destroy();
    }
}

// Función principal del servicio OCR.
async function extraerTextoDocumento({
    buffer,
    mimetype,
    originalname
}) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new Error("El documento está vacío.");
    }

    const nombre = String(originalname || "").toLowerCase();
    const tipo = String(mimetype || "").toLowerCase();

    const esPDF =
        tipo === "application/pdf" ||
        nombre.endsWith(".pdf");

    // Aceptar imágenes PNG y JPG.
    const esImagen =
        ["image/png", "image/jpeg", "image/jpg"].includes(tipo) ||
        /\.(png|jpe?g)$/i.test(nombre);

    if (!esPDF && !esImagen) {
        throw new Error(
            "Formato no permitido. Utilizá PDF, PNG o JPG."
        );
    }

    const worker = await obtenerWorkerOCR();

    if (esPDF) {
        return await reconocerPDF(buffer, worker);
    }

    const resultado = await reconocerImagen(buffer, worker);

    return {
        texto: resultado.texto,
        confianza: resultado.confianza,
        paginas: 1
    };
}

// Cerrar el motor OCR al detener el servidor.
async function cerrarOCR() {
    if (workerPromise) {
        const worker = await workerPromise;
        await worker.terminate();
        workerPromise = null;
    }
}

module.exports = {
    extraerTextoDocumento,
    cerrarOCR
};

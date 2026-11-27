const motor = require("./validacion-comedor");

const sanitario = `
DIRECCIÓN NACIONAL DE VIGILANCIA SANITARIA
REGISTRO DE ESTABLECIMIENTO
R.E. N°: 801047480/3
Nombre/Razón Social: Serendipity S.A.
Dirección: Las Perlas y Legión Civil Extranjera 4639
Válido Hasta: 29-09-2030
`;

const municipal = `
LICENCIA MUNICIPAL COMERCIAL PROVISORIA
REPRESENTANTE: Javier Viveros Filortiga
C.I. N°: 2.355.490
RAZÓN SOCIAL: Serendipity S.A.
`;

const documentos = [
    motor.extraerDatosDocumentales(sanitario),
    motor.extraerDatosDocumentales(municipal)
];

console.dir(documentos, { depth: null });
console.log("\n=== DOCUMENTOS OBLIGATORIOS ===");
console.log(motor.verificarDocumentosObligatorios(documentos));
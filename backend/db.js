// =========================================================
// RESCATEPY - CONEXIÓN A ORACLE DATABASE
// =========================================================
require("dotenv").config();

const oracledb = require("oracledb");

// Devuelve las consultas SELECT como objetos.
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// Valida que las credenciales de Oracle estén configuradas.
function validarConfiguracionOracle() {
    const requeridas = [
        "ORACLE_USER",
        "ORACLE_PASSWORD",
        "ORACLE_CONNECT_STRING"
    ];

    const faltantes = requeridas.filter(
        (nombre) => !process.env[nombre]
    );

    if (faltantes.length > 0) {
        throw new Error(
            `Faltan variables de Oracle en backend/.env: ${faltantes.join(", ")}`
        );
    }
}

// Crea un pool pequeño y suficiente para este proyecto.
async function iniciarPool() {
    validarConfiguracionOracle();

    await oracledb.createPool({
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: process.env.ORACLE_CONNECT_STRING,
        poolMin: 1,
        poolMax: 5,
        poolIncrement: 1
    });

    console.log("Oracle conectado correctamente.");
}

// Obtiene una conexión del pool.
async function obtenerConexion() {
    return oracledb.getConnection();
}

// Cierra el pool al detener el servidor.
async function cerrarPool() {
    try {
        const pool = oracledb.getPool();
        await pool.close(10);
    } catch (error) {
        // Si el pool todavía no existe, no hay nada que cerrar.
    }
}

module.exports = {
    oracledb,
    iniciarPool,
    obtenerConexion,
    cerrarPool
};

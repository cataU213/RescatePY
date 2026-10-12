// Middleware de autenticación con JWT.
require("dotenv").config();

const jwt = require("jsonwebtoken");

// La clave JWT debe existir únicamente en el archivo .env.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error(
        "Falta JWT_SECRET. Copiá backend/.env.example como backend/.env y configurá una clave segura."
    );
}

function autenticar(req, res, next) {
    const cabecera = req.headers.authorization || "";

    if (!cabecera.startsWith("Bearer ")) {
        return res.status(401).json({
            mensaje: "Debés iniciar sesión."
        });
    }

    try {
        // Verifica la sesión del usuario conectado.
        const token = cabecera.slice(7);
        req.usuario = jwt.verify(token, JWT_SECRET);

        next();
    } catch (error) {
        return res.status(401).json({
            mensaje: "Sesión inválida o vencida."
        });
    }
}

module.exports = {
    autenticar,
    JWT_SECRET
};

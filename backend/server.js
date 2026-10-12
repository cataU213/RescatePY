// =========================================================
// RESCATEPY - BACKEND CON NODE + EXPRESS + ORACLE
// =========================================================
require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
    oracledb,
    iniciarPool,
    obtenerConexion,
    cerrarPool
} = require("./db");

const {
    autenticar,
    JWT_SECRET
} = require("./auth");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

// Sirve también el frontend desde el mismo servidor.
app.use(express.static(path.join(__dirname, "..")));


// =========================================================
// UTILIDADES ORACLE
// =========================================================

// Ejecuta SELECT y devuelve todas las filas.
async function obtenerTodos(sql, binds = {}) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            sql,
            binds
        );

        return resultado.rows || [];
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

// Ejecuta SELECT y devuelve una sola fila.
async function obtenerUno(sql, binds = {}) {
    const filas = await obtenerTodos(sql, binds);
    return filas[0] || null;
}

// Ejecuta INSERT / UPDATE / DELETE con commit automático.
async function ejecutar(sql, binds = {}, opciones = {}) {
    let conexion;

    try {
        conexion = await obtenerConexion();

        return await conexion.execute(
            sql,
            binds,
            {
                autoCommit: true,
                ...opciones
            }
        );
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
}

// Convierte una fecha Oracle/JS al formato que usa el frontend.
function fechaISO(valor) {
    if (!valor) return null;

    if (valor instanceof Date) {
        return valor.toISOString();
    }

    return String(valor);
}

// Convierte una fila Oracle al formato que ya usa el frontend.
function mapearDonacion(fila) {
    return {
        id: String(fila.ID),
        ownerId: fila.USUARIO_ID,
        ownerName: fila.AUTOR || "",
        donorType: fila.DONOR_TYPE,
        donorName: fila.DONOR_NAME,
        food: fila.FOOD,
        quantity: fila.QUANTITY,
        unit: fila.UNIT,
        city: fila.CITY,
        address: fila.ADDRESS,
        foodType: fila.FOOD_TYPE || "",
        foodCondition: fila.FOOD_CONDITION || "",
        hygiene: fila.HYGIENE || "",
        requiresCold: Boolean(fila.REQUIRES_COLD),
        coldChain: fila.COLD_CHAIN || "",
        expiryDate: fila.EXPIRY_DATE || "",
        preparedStorage: fila.PREPARED_STORAGE || "",
        notes: fila.NOTES || "",
        status: fila.STATUS,
        publishedAt: fechaISO(fila.PUBLISHED_AT),
        updatedAt: fechaISO(fila.UPDATED_AT),
        reservedAt: fechaISO(fila.RESERVED_AT),
        withdrawnAt: fechaISO(fila.WITHDRAWN_AT),
        cancelledAt: fechaISO(fila.CANCELLED_AT),
        receiver: fila.RECEIVER_NAME
            ? {
                type: fila.RECEIVER_TYPE || "Otro",
                name: fila.RECEIVER_NAME,
                responsible: fila.RECEIVER_RESPONSIBLE || "",
                city: fila.RECEIVER_CITY || ""
            }
            : null
    };
}

async function obtenerDonacionCompleta(id) {
    const fila = await obtenerUno(
        `
            SELECT
                d.*,
                u.nombre AS autor
            FROM donaciones d
            INNER JOIN usuarios u
                ON u.id = d.usuario_id
            WHERE d.id = :id
        `,
        {
            id: Number(id)
        }
    );

    return fila ? mapearDonacion(fila) : null;
}


// =========================================================
// ESTADO
// =========================================================

app.get("/api/estado", async (req, res) => {
    try {
        await obtenerUno(
            "SELECT 1 AS OK FROM DUAL"
        );

        res.json({
            ok: true,
            mensaje: "RescatePY funcionando con Oracle."
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: "El backend funciona, pero no pudo conectarse a Oracle."
        });
    }
});


// =========================================================
// REGISTRO Y LOGIN
// =========================================================

app.post("/api/auth/registro", async (req, res) => {
    try {
        const nombre =
            String(req.body.nombre || "").trim();

        const email =
            String(req.body.email || "")
                .trim()
                .toLowerCase();

        const password =
            String(req.body.password || "");

        if (!nombre || !email || password.length < 6) {
            return res.status(400).json({
                mensaje:
                    "Completá nombre, email y una contraseña de al menos 6 caracteres."
            });
        }

        const existe = await obtenerUno(
            `
                SELECT id
                FROM usuarios
                WHERE email = :email
            `,
            {
                email
            }
        );

        if (existe) {
            return res.status(409).json({
                mensaje: "Ese email ya está registrado."
            });
        }

        // Nunca guardamos la contraseña en texto plano.
        const passwordHash =
            await bcrypt.hash(password, 10);

        const resultado = await ejecutar(
            `
                INSERT INTO usuarios (
                    nombre,
                    email,
                    password_hash,
                    creado_en
                )
                VALUES (
                    :nombre,
                    :email,
                    :passwordHash,
                    SYSTIMESTAMP
                )
                RETURNING id INTO :id
            `,
            {
                nombre,
                email,
                passwordHash,
                id: {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER
                }
            }
        );

        const usuarioId =
            resultado.outBinds.id[0];

        res.status(201).json({
            mensaje: "Usuario registrado correctamente.",
            usuario: {
                id: usuarioId,
                nombre,
                email
            }
        });
    } catch (error) {
        console.error(error);

        // ORA-00001: email duplicado por restricción UNIQUE.
        if (error && error.errorNum === 1) {
            return res.status(409).json({
                mensaje: "Ese email ya está registrado."
            });
        }

        res.status(500).json({
            mensaje: "No se pudo registrar el usuario."
        });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const email =
            String(req.body.email || "")
                .trim()
                .toLowerCase();

        const password =
            String(req.body.password || "");

        const usuario = await obtenerUno(
            `
                SELECT
                    id,
                    nombre,
                    email,
                    password_hash
                FROM usuarios
                WHERE email = :email
            `,
            {
                email
            }
        );

        if (
            !usuario
            ||
            !(await bcrypt.compare(
                password,
                usuario.PASSWORD_HASH
            ))
        ) {
            return res.status(401).json({
                mensaje: "Email o contraseña incorrectos."
            });
        }

        // El token permite identificar al autor de cada acción.
        const token = jwt.sign(
            {
                id: usuario.ID,
                nombre: usuario.NOMBRE,
                email: usuario.EMAIL
            },
            JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        res.json({
            token,
            usuario: {
                id: usuario.ID,
                nombre: usuario.NOMBRE,
                email: usuario.EMAIL
            }
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: "No se pudo iniciar sesión."
        });
    }
});

app.get("/api/auth/yo", autenticar, async (req, res) => {
    try {
        const usuario = await obtenerUno(
            `
                SELECT
                    id,
                    nombre,
                    email
                FROM usuarios
                WHERE id = :id
            `,
            {
                id: Number(req.usuario.id)
            }
        );

        if (!usuario) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        res.json({
            id: usuario.ID,
            nombre: usuario.NOMBRE,
            email: usuario.EMAIL
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: "No se pudo cargar el usuario."
        });
    }
});


// =========================================================
// DONACIONES
// =========================================================

app.get("/api/donaciones", async (req, res) => {
    try {
        const filas = await obtenerTodos(
            `
                SELECT
                    d.*,
                    u.nombre AS autor
                FROM donaciones d
                INNER JOIN usuarios u
                    ON u.id = d.usuario_id
                WHERE d.status <> 'CANCELADA'
                ORDER BY d.id ASC
            `
        );

        res.json(
            filas.map(mapearDonacion)
        );
    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: "No se pudieron cargar las donaciones."
        });
    }
});

app.post("/api/donaciones", autenticar, async (req, res) => {
    try {
        const d = req.body || {};

        if (
            !d.donorName
            ||
            !d.food
            ||
            Number(d.quantity) <= 0
            ||
            !d.city
            ||
            !d.address
        ) {
            return res.status(400).json({
                mensaje: "Faltan datos obligatorios de la donación."
            });
        }

        const resultado = await ejecutar(
            `
                INSERT INTO donaciones (
                    usuario_id,
                    donor_type,
                    donor_name,
                    food,
                    quantity,
                    unit,
                    city,
                    address,
                    food_type,
                    food_condition,
                    hygiene,
                    requires_cold,
                    cold_chain,
                    expiry_date,
                    prepared_storage,
                    notes,
                    status,
                    published_at
                )
                VALUES (
                    :usuarioId,
                    :donorType,
                    :donorName,
                    :food,
                    :quantity,
                    :unit,
                    :city,
                    :address,
                    :foodType,
                    :foodCondition,
                    :hygiene,
                    :requiresCold,
                    :coldChain,
                    :expiryDate,
                    :preparedStorage,
                    :notes,
                    'ACTIVA',
                    SYSTIMESTAMP
                )
                RETURNING id INTO :id
            `,
            {
                usuarioId: Number(req.usuario.id),
                donorType: d.donorType || "Otro",
                donorName: d.donorName,
                food: d.food,
                quantity: Number(d.quantity),
                unit: d.unit || "kg",
                city: d.city,
                address: d.address,
                foodType: d.foodType || "",
                foodCondition: d.foodCondition || "",
                hygiene: d.hygiene || "",
                requiresCold: d.requiresCold ? 1 : 0,
                coldChain: d.coldChain || "",
                expiryDate: d.expiryDate || "",
                preparedStorage: d.preparedStorage || "",
                notes: d.notes || "",
                id: {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER
                }
            }
        );

        const donacionId =
            resultado.outBinds.id[0];

        res.status(201).json(
            await obtenerDonacionCompleta(
                donacionId
            )
        );
    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: "No se pudo publicar la donación."
        });
    }
});

app.put("/api/donaciones/:id", autenticar, async (req, res) => {
    try {
        const id =
            Number(req.params.id);

        const existente = await obtenerUno(
            `
                SELECT *
                FROM donaciones
                WHERE id = :id
            `,
            {
                id
            }
        );

        if (!existente) {
            return res.status(404).json({
                mensaje: "Donación no encontrada."
            });
        }

        // La seguridad se valida en el backend.
        if (
            Number(existente.USUARIO_ID)
            !==
            Number(req.usuario.id)
        ) {
            return res.status(403).json({
                mensaje: "No podés editar una publicación ajena."
            });
        }

        const d = req.body || {};

        await ejecutar(
            `
                UPDATE donaciones
                SET
                    donor_type = :donorType,
                    donor_name = :donorName,
                    food = :food,
                    quantity = :quantity,
                    unit = :unit,
                    city = :city,
                    address = :address,
                    food_type = :foodType,
                    food_condition = :foodCondition,
                    hygiene = :hygiene,
                    requires_cold = :requiresCold,
                    cold_chain = :coldChain,
                    expiry_date = :expiryDate,
                    prepared_storage = :preparedStorage,
                    notes = :notes,
                    updated_at = SYSTIMESTAMP
                WHERE id = :id
            `,
            {
                donorType:
                    d.donorType ?? existente.DONOR_TYPE,

                donorName:
                    d.donorName ?? existente.DONOR_NAME,

                food:
                    d.food ?? existente.FOOD,

                quantity:
                    Number(
                        d.quantity ?? existente.QUANTITY
                    ),

                unit:
                    d.unit ?? existente.UNIT,

                city:
                    d.city ?? existente.CITY,

                address:
                    d.address ?? existente.ADDRESS,

                foodType:
                    d.foodType ?? existente.FOOD_TYPE,

                foodCondition:
                    d.foodCondition ?? existente.FOOD_CONDITION,

                hygiene:
                    d.hygiene ?? existente.HYGIENE,

                requiresCold:
                    (
                        d.requiresCold
                        ??
                        Boolean(existente.REQUIRES_COLD)
                    )
                        ? 1
                        : 0,

                coldChain:
                    d.coldChain ?? existente.COLD_CHAIN,

                expiryDate:
                    d.expiryDate ?? existente.EXPIRY_DATE,

                preparedStorage:
                    d.preparedStorage ?? existente.PREPARED_STORAGE,

                notes:
                    d.notes ?? existente.NOTES,

                id
            }
        );

        res.json(
            await obtenerDonacionCompleta(id)
        );
    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: "No se pudo actualizar la donación."
        });
    }
});

app.delete("/api/donaciones/:id", autenticar, async (req, res) => {
    try {
        const id =
            Number(req.params.id);

        const existente = await obtenerUno(
            `
                SELECT *
                FROM donaciones
                WHERE id = :id
            `,
            {
                id
            }
        );

        if (!existente) {
            return res.status(404).json({
                mensaje: "Donación no encontrada."
            });
        }

        if (
            Number(existente.USUARIO_ID)
            !==
            Number(req.usuario.id)
        ) {
            return res.status(403).json({
                mensaje: "No podés eliminar una publicación ajena."
            });
        }

        await ejecutar(
            `
                UPDATE donaciones
                SET
                    status = 'CANCELADA',
                    cancelled_at = SYSTIMESTAMP
                WHERE id = :id
            `,
            {
                id
            }
        );

        res.json({
            mensaje: "Donación eliminada."
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: "No se pudo eliminar la donación."
        });
    }
});


// =========================================================
// RESERVAS Y NOTIFICACIONES
// =========================================================

app.post("/api/donaciones/:id/reservar", autenticar, async (req, res) => {
    let conexion;

    try {
        const id =
            Number(req.params.id);

        conexion =
            await obtenerConexion();

        // Bloquea la donación mientras se procesa la reserva
        // para evitar dos reservas simultáneas.
        const resultadoDonacion =
            await conexion.execute(
                `
                    SELECT *
                    FROM donaciones
                    WHERE id = :id
                    FOR UPDATE
                `,
                {
                    id
                }
            );

        const donacion =
            resultadoDonacion.rows[0];

        if (!donacion) {
            await conexion.rollback();

            return res.status(404).json({
                mensaje: "Donación no encontrada."
            });
        }

        if (
            Number(donacion.USUARIO_ID)
            ===
            Number(req.usuario.id)
        ) {
            await conexion.rollback();

            return res.status(400).json({
                mensaje: "No podés reservar tu propia donación."
            });
        }

        if (
            donacion.STATUS !==
            "ACTIVA"
        ) {
            await conexion.rollback();

            return res.status(409).json({
                mensaje: "Esta donación ya no está disponible."
            });
        }

        const r = req.body || {};

        if (
            !r.receiverName
            ||
            !r.receiverResponsible
            ||
            !r.receiverCity
        ) {
            await conexion.rollback();

            return res.status(400).json({
                mensaje: "Completá los datos del receptor."
            });
        }

        const resultadoReserva =
            await conexion.execute(
                `
                    INSERT INTO reservas (
                        donacion_id,
                        usuario_solicitante_id,
                        receiver_type,
                        receiver_name,
                        receiver_responsible,
                        receiver_city,
                        estado,
                        creado_en
                    )
                    VALUES (
                        :donacionId,
                        :usuarioSolicitanteId,
                        :receiverType,
                        :receiverName,
                        :receiverResponsible,
                        :receiverCity,
                        'PENDIENTE',
                        SYSTIMESTAMP
                    )
                    RETURNING id INTO :id
                `,
                {
                    donacionId: id,
                    usuarioSolicitanteId:
                        Number(req.usuario.id),

                    receiverType:
                        r.receiverType || "Otro",

                    receiverName:
                        r.receiverName,

                    receiverResponsible:
                        r.receiverResponsible,

                    receiverCity:
                        r.receiverCity,

                    id: {
                        dir: oracledb.BIND_OUT,
                        type: oracledb.NUMBER
                    }
                }
            );

        const reservaId =
            resultadoReserva.outBinds.id[0];

        await conexion.execute(
            `
                UPDATE donaciones
                SET
                    status = 'RESERVADA',
                    reserved_at = SYSTIMESTAMP,
                    receiver_type = :receiverType,
                    receiver_name = :receiverName,
                    receiver_responsible = :receiverResponsible,
                    receiver_city = :receiverCity
                WHERE id = :id
            `,
            {
                receiverType:
                    r.receiverType || "Otro",

                receiverName:
                    r.receiverName,

                receiverResponsible:
                    r.receiverResponsible,

                receiverCity:
                    r.receiverCity,

                id
            }
        );

        await conexion.execute(
            `
                INSERT INTO notificaciones (
                    usuario_id,
                    reserva_id,
                    mensaje,
                    leida,
                    creado_en
                )
                VALUES (
                    :usuarioId,
                    :reservaId,
                    :mensaje,
                    0,
                    SYSTIMESTAMP
                )
            `,
            {
                usuarioId:
                    Number(donacion.USUARIO_ID),

                reservaId,

                mensaje:
                    `${req.usuario.nombre} solicitó reservar tu donación de ${donacion.FOOD}.`
            }
        );

        // Reserva, donación y notificación se confirman juntas.
        await conexion.commit();

        res.status(201).json({
            mensaje:
                "Reserva enviada. El propietario recibió una notificación.",

            donacion:
                await obtenerDonacionCompleta(id)
        });
    } catch (error) {
        if (conexion) {
            try {
                await conexion.rollback();
            } catch (_) {
                // Evita ocultar el error original.
            }
        }

        console.error(error);

        res.status(500).json({
            mensaje: "No se pudo realizar la reserva."
        });
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
});

app.post("/api/donaciones/:id/retirar", autenticar, async (req, res) => {
    let conexion;

    try {
        const id =
            Number(req.params.id);

        conexion =
            await obtenerConexion();

        const resultado =
            await conexion.execute(
                `
                    SELECT *
                    FROM donaciones
                    WHERE id = :id
                    FOR UPDATE
                `,
                {
                    id
                }
            );

        const donacion =
            resultado.rows[0];

        if (!donacion) {
            await conexion.rollback();

            return res.status(404).json({
                mensaje: "Donación no encontrada."
            });
        }

        if (
            Number(donacion.USUARIO_ID)
            !==
            Number(req.usuario.id)
        ) {
            await conexion.rollback();

            return res.status(403).json({
                mensaje: "Solo el propietario puede confirmar el retiro."
            });
        }

        if (
            donacion.STATUS !==
            "RESERVADA"
        ) {
            await conexion.rollback();

            return res.status(409).json({
                mensaje: "La donación debe estar reservada."
            });
        }

        await conexion.execute(
            `
                UPDATE donaciones
                SET
                    status = 'RETIRADA',
                    withdrawn_at = SYSTIMESTAMP
                WHERE id = :id
            `,
            {
                id
            }
        );

        await conexion.execute(
            `
                UPDATE reservas
                SET
                    estado = 'RETIRADA'
                WHERE
                    donacion_id = :id
                    AND estado = 'PENDIENTE'
            `,
            {
                id
            }
        );

        await conexion.commit();

        res.json(
            await obtenerDonacionCompleta(id)
        );
    } catch (error) {
        if (conexion) {
            try {
                await conexion.rollback();
            } catch (_) {
                // Evita ocultar el error original.
            }
        }

        console.error(error);

        res.status(500).json({
            mensaje: "No se pudo confirmar el retiro."
        });
    } finally {
        if (conexion) {
            await conexion.close();
        }
    }
});


// =========================================================
// NOTIFICACIONES
// =========================================================

app.get("/api/notificaciones", autenticar, async (req, res) => {
    try {
        const filas = await obtenerTodos(
            `
                SELECT
                    id,
                    mensaje,
                    leida,
                    creado_en
                FROM notificaciones
                WHERE usuario_id = :usuarioId
                ORDER BY id DESC
            `,
            {
                usuarioId:
                    Number(req.usuario.id)
            }
        );

        res.json(
            filas.map((fila) => ({
                id: fila.ID,
                mensaje: fila.MENSAJE,
                leida: fila.LEIDA,
                creado_en: fechaISO(fila.CREADO_EN)
            }))
        );
    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: "No se pudieron cargar las notificaciones."
        });
    }
});

app.patch("/api/notificaciones/:id/leida", autenticar, async (req, res) => {
    try {
        await ejecutar(
            `
                UPDATE notificaciones
                SET leida = 1
                WHERE
                    id = :id
                    AND usuario_id = :usuarioId
            `,
            {
                id:
                    Number(req.params.id),

                usuarioId:
                    Number(req.usuario.id)
            }
        );

        res.json({
            mensaje: "Notificación marcada como leída."
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: "No se pudo actualizar la notificación."
        });
    }
});


// =========================================================
// FRONTEND Y ARRANQUE
// =========================================================

app.get("*", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "..",
            "index.html"
        )
    );
});

async function iniciarServidor() {
    try {
        // El servidor empieza solo si Oracle está disponible.
        await iniciarPool();

        app.listen(PORT, () => {
            console.log(
                `RescatePY disponible en http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error(
            "No se pudo iniciar RescatePY:",
            error.message || error
        );

        process.exit(1);
    }
}

// Cierre ordenado del pool de Oracle.
process.on("SIGINT", async () => {
    await cerrarPool();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await cerrarPool();
    process.exit(0);
});

iniciarServidor();

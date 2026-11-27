// RESCATEPY - BACKEND CON NODE + EXPRESS + ORACLE

// =========================================================

require("dotenv").config();

const path = require("path");

const express = require("express");

const cors = require("cors");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

// Funciones criptográficas para hashes y tokens seguros.
const crypto = require("crypto");

// Servicio de consulta oficial del Registro RE del INAN.
const {
    consultarRegistroRE,
    normalizarRUC,
    normalizarNombre
} = require("./dinavisa-service");


// Envío de correo mediante Gmail API (HTTPS), sin SMTP.

// Esta opción funciona en Render Free porque utiliza HTTPS por el puerto 443.

// Solicita un access token nuevo usando el refresh token de Google.

async function obtenerAccessTokenGoogle() {

    const requeridas = [

        "GOOGLE_CLIENT_ID",

        "GOOGLE_CLIENT_SECRET",

        "GOOGLE_REFRESH_TOKEN"

    ];

    const faltantes = requeridas.filter((nombre) => !process.env[nombre]);

    if (faltantes.length > 0) {

        throw new Error(

            `Faltan variables de Gmail OAuth: ${faltantes.join(", ")}`

        );

    }

    // Google entrega un access token temporal a partir del refresh token.

    const respuesta = await fetch("https://oauth2.googleapis.com/token", {

        method: "POST",

        headers: {

            "Content-Type": "application/x-www-form-urlencoded"

        },

        body: new URLSearchParams({

            client_id: process.env.GOOGLE_CLIENT_ID,

            client_secret: process.env.GOOGLE_CLIENT_SECRET,

            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,

            grant_type: "refresh_token"

        })

    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok || !datos.access_token) {

        // No registrar tokens ni secretos en los logs.

        console.error("Error de autenticación con Google:", {

            status: respuesta.status,

            error: datos.error,

            descripcion: datos.error_description

        });

        throw new Error("Google no autorizó el acceso para enviar el correo.");

    }

    return datos.access_token;

}

// Codifica el mensaje MIME en Base64 URL-safe, como exige Gmail API.

function codificarMensajeBase64Url(mensaje) {

    return Buffer.from(mensaje, "utf8")

        .toString("base64")

        .replace(/\+/g, "-")

        .replace(/\//g, "_")

        .replace(/=+$/, "");

}

// Envía correos de recuperación usando Gmail API por HTTPS.

async function enviarCorreo(destinatario, asunto, contenidoHTML) {

    if (!process.env.SMTP_USER) {

        throw new Error("Falta configurar SMTP_USER con la cuenta Gmail remitente.");

    }

    const accessToken = await obtenerAccessTokenGoogle();

    // Codificar el asunto y el cuerpo para admitir tildes y caracteres especiales.

    const asuntoCodificado = `=?UTF-8?B?${Buffer.from(asunto, "utf8").toString("base64")}?=`;

    const cuerpoBase64 = Buffer.from(contenidoHTML, "utf8")

        .toString("base64")

        .replace(/.{1,76}/g, "$&\r\n");

    const mensajeMIME = [

        `From: "RescatePY" <${process.env.SMTP_USER}>`,

        `To: ${destinatario}`,

        `Subject: ${asuntoCodificado}`,

        "MIME-Version: 1.0",

        'Content-Type: text/html; charset="UTF-8"',

        "Content-Transfer-Encoding: base64",

        "",

        cuerpoBase64

    ].join("\r\n");

    const raw = codificarMensajeBase64Url(mensajeMIME);

    // Gmail API envía el correo sin utilizar los puertos SMTP bloqueados por Render Free.

    const respuesta = await fetch(

        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",

        {

            method: "POST",

            headers: {

                Authorization: `Bearer ${accessToken}`,

                "Content-Type": "application/json"

            },

            body: JSON.stringify({ raw })

        }

    );

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {

        // El mensaje de error no contiene el access token ni el refresh token.

        console.error("Error de Gmail API al enviar:", {

            status: respuesta.status,

            mensaje: datos.error?.message || "Error sin descripción"

        });

        throw new Error(`Gmail API no pudo enviar el correo (HTTP ${respuesta.status}).`);

    }

    return datos;

}

// Conexión existente con Oracle.

const {

    oracledb,

    iniciarPool,

    obtenerConexion,

    cerrarPool

} = require("./db");

// Autenticación existente.

const {

    autenticar,

    JWT_SECRET

} = require("./auth");

const app = express();

const PORT = Number(process.env.PORT || 3000);

app.use(cors());

app.use(express.json());

// Publica el frontend desde el mismo servidor.

app.use(express.static(path.join(__dirname, "..", "frontend")));

// =========================================================

// UTILIDADES ORACLE

// =========================================================

// Ejecuta consultas SELECT.

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

// Obtiene un solo registro.

async function obtenerUno(sql, binds = {}) {

    const filas = await obtenerTodos(sql, binds);

    return filas[0] || null;

}

// Ejecuta INSERT, UPDATE y DELETE.

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

// Crea la tabla de recuperación si no existe.

async function asegurarTablaRecuperacion() {

    const sql = `

    BEGIN

        EXECUTE IMMEDIATE '

            CREATE TABLE tokens_recuperacion (

                id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,

                usuario_id NUMBER NOT NULL,

                token_hash VARCHAR2(64) NOT NULL UNIQUE,

                expira_en TIMESTAMP WITH TIME ZONE NOT NULL,

                usado_en TIMESTAMP WITH TIME ZONE,

                creado_en TIMESTAMP WITH TIME ZONE

                    DEFAULT SYSTIMESTAMP NOT NULL,

                CONSTRAINT fk_token_usuario

                    FOREIGN KEY (usuario_id)

                    REFERENCES usuarios(id)

            )';

    EXCEPTION

        WHEN OTHERS THEN

            IF SQLCODE != -955 THEN

                RAISE;

            END IF;

    END;`;

    await ejecutar(sql);

    console.log("Tabla de recuperación verificada.");

}

// Convierte fechas al formato del frontend.

function fechaISO(valor) {

    if (!valor) return null;

    if (valor instanceof Date) {

        return valor.toISOString();

    }

    return String(valor);

}

// Convierte una fila Oracle a objeto de donación.

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


// =========================================================
// ESTADO

// =========================================================

const entregas = require("./entregas");
entregas.instalarEntregas(app, { autenticar, obtenerTodos, obtenerConexion });

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


// Evita que dos solicitudes simultáneas cambien el mismo expediente.
const registrosEnCurso = new Set();
app.post("/api/auth/registro", async (req, res) => {
    let conexion;
    let usuarioId = null;
    let correoBloqueado = null;
    let cuentaReutilizada = false;

    try {
        const nombre = String(req.body.nombre || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        const tipoCuenta = String(req.body.tipoCuenta || "DONANTE").trim().toUpperCase();

        const nombreOrganizacion = String(req.body.nombreOrganizacion || "").trim();
        const tipoOrganizacion = String(req.body.tipoOrganizacion || "").trim();
        const representante = String(req.body.representante || nombre).trim();
        const ciRepresentante = String(req.body.ciRepresentante || "").trim();
        const ruc = String(req.body.ruc || "").trim();
        const telefono = String(req.body.telefono || "").trim();
        const departamento = String(req.body.departamento || "").trim();
        const distrito = String(req.body.distrito || "").trim();
        const direccion = String(req.body.direccion || "").trim();
        const comensales = Number(req.body.comensales);


        if (!nombre || !email || password.length < 6) {
            return res.status(400).json({
                mensaje: "Completá nombre, correo y contraseña."
            });
        }

        if (!["DONANTE", "ORGANIZACION"].includes(tipoCuenta)) {
            return res.status(400).json({
                mensaje: "Tipo de cuenta inválido."
            });
        }

        if (tipoCuenta === "ORGANIZACION") {
            if (
                !nombreOrganizacion ||
                !tipoOrganizacion ||
                !ruc ||
                !representante ||
                !ciRepresentante ||
                !telefono ||
                !departamento ||
                !distrito ||
                !direccion ||
                !Number.isSafeInteger(comensales) ||
                comensales <= 0
            ) {
                return res.status(400).json({
                    mensaje: "Completá todos los datos institucionales, incluido el RUC."
                });
            }


        }

        if (registrosEnCurso.has(email)) {
            return res.status(409).json({ mensaje: "Ya hay un registro en proceso para ese correo." });
        }
        registrosEnCurso.add(email);
        correoBloqueado = email;

        // Resultado de la consulta oficial del INAN.
        let consultaINAN = null;
        let estadoOrganizacion = "PENDIENTE";

        if (tipoCuenta === "ORGANIZACION") {

            try {

                // Consultar los registros oficiales utilizando RUC y razón social.
                consultaINAN = await consultarRegistroRE({
                    ruc,
                    razonSocial: nombreOrganizacion
                });

            } catch (error) {

                // Si la fuente oficial no responde, no se aprueba el registro.
                console.error("Error consultando INAN:", error.message);

                return res.status(503).json({
                    mensaje: "No se pudo consultar el registro oficial. Intentá nuevamente."
                });
            }

            // Recuperar los registros encontrados.
            const registros = Array.isArray(consultaINAN?.registros)
                ? consultaINAN.registros
                : [];

            // Normalizar los datos para evitar diferencias de formato.
            const rucBuscado = normalizarRUC(ruc);
            const nombreBuscado = normalizarNombre(nombreOrganizacion);

            // Exigir coincidencia de RUC, razón social, estado y vigencia.
            const registroCoincidente = registros.some(registro => {

                return (
                    normalizarRUC(registro.ruc) === rucBuscado &&
                    normalizarNombre(registro.razonSocial) === nombreBuscado &&
                    registro.coincideRazonSocial === true &&
                    registro.activo === true &&
                    registro.vigente === true &&
                    registro.valido === true
                );
            });

            // La consulta oficial debe confirmar expresamente la coincidencia.
            const verificacionCorrecta =
                consultaINAN?.verificado === true &&
                consultaINAN.estado === "APROBADO" &&
                registroCoincidente;

            // Activación por consulta RE, sin OCR ni afirmación de validación municipal.
            estadoOrganizacion = verificacionCorrecta ? "ACTIVA" : "PENDIENTE";

            // Preparar la respuesta de la consulta oficial.
            consultaINAN = {
                verificado: verificacionCorrecta,
                estado: verificacionCorrecta ? "APROBADO" : "RECHAZADO",
                motivo: verificacionCorrecta
                    ? "RUC, razón social y registro RE confirmados por INAN."
                    : "No se encontró un registro RE coincidente, activo y vigente.",
                registros,
                fuente: consultaINAN?.fuente || null
            };
        }

        // Crear cuenta nueva o reutilizar la cuenta institucional pendiente.
        const passwordHash = await bcrypt.hash(password, 10);
        const estadoCuentaInicial = tipoCuenta === "ORGANIZACION" ? estadoOrganizacion : "ACTIVA";

        conexion = await obtenerConexion();

        const existe = await conexion.execute(
            `
                SELECT ID, PASSWORD_HASH, TIPO_CUENTA, ESTADO_CUENTA
                FROM USUARIOS
                WHERE LOWER(EMAIL) = :email FOR UPDATE
            `,
            { email }
        );

        if (existe.rows.length > 0) {
            const usuarioExistente = existe.rows[0];

            // Un correo de donante o de otro tipo no se convierte en comedor.
            if (
                tipoCuenta !== "ORGANIZACION" ||
                String(usuarioExistente.TIPO_CUENTA || "").toUpperCase() !== "ORGANIZACION"
            ) {
                return res.status(409).json({
                    mensaje: "Ese correo ya pertenece a otra cuenta."
                });
            }

            // Solo el titular que conoce la contraseña puede reintentar el expediente.
            const passwordCorrecta = await bcrypt.compare(
                password,
                usuarioExistente.PASSWORD_HASH
            );

            if (!passwordCorrecta) {
                return res.status(401).json({
                    mensaje: "Ingresá la contraseña original de la cuenta para reintentar el registro."
                });
            }

            usuarioId = Number(usuarioExistente.ID);

            if (usuarioExistente.ESTADO_CUENTA === "ACTIVA") {
                return res.status(409).json({ mensaje: "Esta cuenta ya existe. Iniciá sesión con tu correo y contraseña." });
            }
            if (usuarioExistente.ESTADO_CUENTA !== "PENDIENTE") {
                return res.status(403).json({ mensaje: "La cuenta no admite reintentos." });
            }

            // Reutilizar la cuenta y actualizar los datos declarados, sin duplicar el email.
            await conexion.execute(
                `
                    UPDATE USUARIOS
                    SET NOMBRE = :nombre,
                        ESTADO_CUENTA = :estadoCuenta
                    WHERE ID = :usuarioId
                `,
                { nombre, usuarioId, estadoCuenta: estadoCuentaInicial },
                { autoCommit: false }
            );

            const organizacionExistente = await conexion.execute(
                `SELECT ID FROM ORGANIZACIONES WHERE USUARIO_ID = :usuarioId`,
                { usuarioId }
            );

            if (organizacionExistente.rows.length > 0) {
                await conexion.execute(
                    `
                        UPDATE ORGANIZACIONES
                        SET NOMBRE_ORGANIZACION = :nombreOrganizacion,
                            TIPO_ORGANIZACION = :tipoOrganizacion,
                            RUC = :ruc,
                            REPRESENTANTE = :representante,
                            CI_REPRESENTANTE = :ciRepresentante,
                            TELEFONO = :telefono,
                            DEPARTAMENTO = :departamento,
                            DISTRITO = :distrito,
                            DIRECCION = :direccion,
                            COMENSALES = :comensales,
                            ESTADO = :estadoOrganizacion
                        WHERE USUARIO_ID = :usuarioId
                    `,
                    {
                        usuarioId,
                        nombreOrganizacion,
                        tipoOrganizacion,
                        ruc: ruc || null,
                        representante,
                        ciRepresentante,
                        telefono,
                        departamento,
                        distrito,
                        direccion,
                        comensales,
                        estadoOrganizacion
                    },
                    { autoCommit: false }
                );
            } else {
                await conexion.execute(
                    `
                        INSERT INTO ORGANIZACIONES (
                            USUARIO_ID, NOMBRE_ORGANIZACION, TIPO_ORGANIZACION, RUC,
                            REPRESENTANTE, CI_REPRESENTANTE, TELEFONO, DEPARTAMENTO,
                            DISTRITO, DIRECCION, COMENSALES, ESTADO, CREADO_EN
                        )
                        VALUES (
                            :usuarioId, :nombreOrganizacion, :tipoOrganizacion, :ruc,
                            :representante, :ciRepresentante, :telefono, :departamento,
                            :distrito, :direccion, :comensales, :estadoOrganizacion, SYSTIMESTAMP
                        )
                    `,
                    {
                        usuarioId,
                        nombreOrganizacion,
                        tipoOrganizacion,
                        ruc: ruc || null,
                        representante,
                        ciRepresentante,
                        telefono,
                        departamento,
                        distrito,
                        direccion,
                        comensales,
                        estadoOrganizacion
                    },
                    { autoCommit: false }
                );
            }

            cuentaReutilizada = true;

        } else {
            // Registro inicial: crear el usuario y su organización en la misma transacción.
            const resultadoUsuario = await conexion.execute(
                `
                    INSERT INTO USUARIOS (
                        NOMBRE, EMAIL, PASSWORD_HASH, TIPO_CUENTA, ESTADO_CUENTA, CREADO_EN
                    )
                    VALUES (
                        :nombre, :email, :passwordHash, :tipoCuenta, :estadoCuenta, SYSTIMESTAMP
                    )
                    RETURNING ID INTO :id
                `,
                {
                    nombre,
                    email,
                    passwordHash,
                    tipoCuenta,
                    estadoCuenta: estadoCuentaInicial,
                    id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                },
                { autoCommit: false }
            );

            usuarioId = Number(resultadoUsuario.outBinds.id[0]);

            if (tipoCuenta === "ORGANIZACION") {
                await conexion.execute(
                    `
                        INSERT INTO ORGANIZACIONES (
                            USUARIO_ID, NOMBRE_ORGANIZACION, TIPO_ORGANIZACION, RUC,
                            REPRESENTANTE, CI_REPRESENTANTE, TELEFONO, DEPARTAMENTO,
                            DISTRITO, DIRECCION, COMENSALES, ESTADO, CREADO_EN
                        )
                        VALUES (
                            :usuarioId, :nombreOrganizacion, :tipoOrganizacion, :ruc,
                            :representante, :ciRepresentante, :telefono, :departamento,
                            :distrito, :direccion, :comensales, :estadoOrganizacion, SYSTIMESTAMP
                        )
                    `,
                    {
                        usuarioId,
                        nombreOrganizacion,
                        tipoOrganizacion,
                        ruc: ruc || null,
                        representante,
                        ciRepresentante,
                        telefono,
                        departamento,
                        distrito,
                        direccion,
                        comensales,
                        estadoOrganizacion
                    },
                    { autoCommit: false }
                );
            }
        }

        await conexion.commit();
        await conexion.close();
        conexion = null;

        // Resultado operativo: no equivale a certificación documental ni tributaria.
        const aprobado = tipoCuenta === "ORGANIZACION" && consultaINAN?.verificado === true;
        return res.status(cuentaReutilizada ? 200 : 201).json({
            mensaje: tipoCuenta === "DONANTE" ? "Donante registrado correctamente." : aprobado
                ? "Cuenta habilitada. Registro sanitario RE confirmado; sin OCR ni validación municipal o DNIT."
                : "No se confirmó el registro RE. Podés reintentar con el mismo correo y contraseña.",
            estadoValidacion: tipoCuenta === "DONANTE" ? null : aprobado ? "APROBADO" : "RECHAZADO",
            consultaINAN, cuentaReutilizada,
            usuario: { id: usuarioId, nombre, email, tipoCuenta, estadoCuenta: estadoCuentaInicial }
        });

    } catch (error) {
        if (conexion) {
            await conexion.rollback().catch(() => {});
        }

        console.error("Error en registro:", error);

        return res.status(500).json({
            mensaje: "No se pudo completar el registro. Verificá los datos e intentá nuevamente."
        });

    } finally {
        if (correoBloqueado) registrosEnCurso.delete(correoBloqueado);
        if (conexion) {
            await conexion.close().catch(() => {});
        }
    }
});


// LOGIN DE RESCATEPY
app.post("/api/auth/login", async (req, res) => {
    try {
        // Normalizar los datos recibidos.
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        const password = String(req.body.password || "");

        // Recuperar también el tipo y estado de la cuenta.
        const usuario = await obtenerUno(
            `
                SELECT
                    id,
                    nombre,
                    email,
                    password_hash,
                    tipo_cuenta,
                    estado_cuenta,
                    (SELECT o.ESTADO FROM ORGANIZACIONES o WHERE o.USUARIO_ID = u.ID FETCH FIRST 1 ROW ONLY) AS ESTADO_ORGANIZACION
                FROM usuarios u
                WHERE LOWER(u.email) = :email
            `,
            { email }
        );

        // Comprobar usuario y contraseña.
        if (
            !usuario ||
            !(await bcrypt.compare(
                password,
                usuario.PASSWORD_HASH
            ))
        ) {
            return res.status(401).json({
                mensaje: "Email o contraseña incorrectos."
            });
        }

        // El acceso depende del estado operativo, no de expedientes OCR históricos.
        if (usuario.ESTADO_CUENTA !== "ACTIVA" ||
            (usuario.TIPO_CUENTA === "ORGANIZACION" && usuario.ESTADO_ORGANIZACION !== "ACTIVA")) {
            return res.status(403).json({ mensaje: "Cuenta no habilitada. Si está pendiente, reintentá el registro con el mismo correo y contraseña." });
        }
        usuario.ESTADO_VALIDACION = usuario.TIPO_CUENTA === "ORGANIZACION" ? "APROBADO" : null;

        // Generar JWT con identificación, tipo y estado de validación.
        const token = jwt.sign(
            {
                id: usuario.ID,
                nombre: usuario.NOMBRE,
                email: usuario.EMAIL,
                tipoCuenta: usuario.TIPO_CUENTA,
                estadoCuenta: usuario.ESTADO_CUENTA,
                estadoValidacion: usuario.ESTADO_VALIDACION || null
            },
            JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        // Devolver los datos de sesión al frontend.
        return res.json({
            token,
            usuario: {
                id: usuario.ID,
                nombre: usuario.NOMBRE,
                email: usuario.EMAIL,
                tipoCuenta: usuario.TIPO_CUENTA,
                estadoCuenta: usuario.ESTADO_CUENTA,
                estadoValidacion: usuario.ESTADO_VALIDACION || null
            }
        });

    } catch (error) {
        console.error("Error en login:", error);

        return res.status(500).json({
            mensaje: "No se pudo iniciar sesión."
        });
    }
});


// =========================================================

// DATOS DEL USUARIO AUTENTICADO

// =========================================================

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


// =========================================================
// DONACIONES

// =========================================================

// Obtener todas las donaciones disponibles.

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

        res.json(filas.map(mapearDonacion));

    } catch (error) {

        console.error(error);

        res.status(500).json({

            mensaje: "No se pudieron cargar las donaciones."

        });

    }

});

// Registrar una nueva donación.

app.post("/api/donaciones", autenticar, exigirDonante, async (req, res) => {

    try {

        const d = req.body || {};

        if (

            !d.donorName ||

            !d.food ||

            Number(d.quantity) <= 0 ||

            !d.city ||

            !d.address

        ) {

            return res.status(400).json({

                mensaje: "Faltan datos obligatorios de la donación."

            });

        }

        // Revalidar la inocuidad declarada también en el servidor.
        const errorAlimento = require("./reglas-reserva").validarAlimento({
            FOOD_TYPE: d.foodType, FOOD_CONDITION: d.foodCondition, HYGIENE: d.hygiene,
            REQUIRES_COLD: d.requiresCold ? 1 : 0, COLD_CHAIN: d.coldChain,
            EXPIRY_DATE: d.expiryDate, PREPARED_STORAGE: d.preparedStorage, QUANTITY: d.quantity
        });
        if (errorAlimento) return res.status(400).json({ mensaje: errorAlimento });

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

        const donacionId = resultado.outBinds.id[0];

        res.status(201).json(

            await obtenerDonacionCompleta(donacionId)

        );

    } catch (error) {

        console.error(error);

        res.status(500).json({

            mensaje: "No se pudo publicar la donación."

        });

    }

});

// Actualizar una donación existente.

app.put("/api/donaciones/:id", autenticar, exigirDonante, async (req, res) => {

    try {

        const id = Number(req.params.id);

        const existente = await obtenerUno(

            `SELECT * FROM donaciones WHERE id = :id`,

            { id }

        );

        if (!existente) {

            return res.status(404).json({

                mensaje: "Donación no encontrada."

            });

        }

        // Solo el propietario puede editar.

        if (Number(existente.USUARIO_ID) !== Number(req.usuario.id)) {

            return res.status(403).json({

                mensaje: "No podés editar una publicación ajena."

            });

        }

        if (existente.STATUS !== "ACTIVA") return res.status(409).json({ mensaje: "Solo se editan donaciones activas." });
        const d = req.body || {};

        const errorAlimento = require("./reglas-reserva").validarAlimento({
            FOOD_TYPE: d.foodType ?? existente.FOOD_TYPE,
            FOOD_CONDITION: d.foodCondition ?? existente.FOOD_CONDITION,
            HYGIENE: d.hygiene ?? existente.HYGIENE,
            REQUIRES_COLD: (d.requiresCold ?? Boolean(existente.REQUIRES_COLD)) ? 1 : 0,
            COLD_CHAIN: d.coldChain ?? existente.COLD_CHAIN,
            EXPIRY_DATE: d.expiryDate ?? existente.EXPIRY_DATE,
            PREPARED_STORAGE: d.preparedStorage ?? existente.PREPARED_STORAGE,
            QUANTITY: d.quantity ?? existente.QUANTITY
        });
        if (errorAlimento) return res.status(400).json({ mensaje: errorAlimento });

        const cambio = await ejecutar(

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

                WHERE id = :id AND status = 'ACTIVA'

            `,

            {

                donorType: d.donorType ?? existente.DONOR_TYPE,

                donorName: d.donorName ?? existente.DONOR_NAME,

                food: d.food ?? existente.FOOD,

                quantity: Number(d.quantity ?? existente.QUANTITY),

                unit: d.unit ?? existente.UNIT,

                city: d.city ?? existente.CITY,

                address: d.address ?? existente.ADDRESS,

                foodType: d.foodType ?? existente.FOOD_TYPE,

                foodCondition: d.foodCondition ?? existente.FOOD_CONDITION,

                hygiene: d.hygiene ?? existente.HYGIENE,

                requiresCold:

                    (d.requiresCold ?? Boolean(existente.REQUIRES_COLD)) ? 1 : 0,

                coldChain: d.coldChain ?? existente.COLD_CHAIN,

                expiryDate: d.expiryDate ?? existente.EXPIRY_DATE,

                preparedStorage: d.preparedStorage ?? existente.PREPARED_STORAGE,

                notes: d.notes ?? existente.NOTES,

                id

            }

        );

        if (cambio.rowsAffected !== 1) return res.status(409).json({mensaje:"La donación cambió de estado."});
        res.json(await obtenerDonacionCompleta(id));

    } catch (error) {

        console.error(error);

        res.status(500).json({

            mensaje: "No se pudo actualizar la donación."

        });

    }

});

// Cancelar una donación.

app.delete("/api/donaciones/:id", autenticar, exigirDonante, async (req, res) => {

    try {

        const id = Number(req.params.id);

        const existente = await obtenerUno(

            `SELECT * FROM donaciones WHERE id = :id`,

            { id }

        );

        if (!existente) {

            return res.status(404).json({

                mensaje: "Donación no encontrada."

            });

        }

        // Evita cancelar publicaciones de otros usuarios.

        if (Number(existente.USUARIO_ID) !== Number(req.usuario.id)) {

            return res.status(403).json({

                mensaje: "No podés eliminar una publicación ajena."

            });

        }

        const cambio = await ejecutar(

            `

                UPDATE donaciones

                SET

                    status = 'CANCELADA',

                    cancelled_at = SYSTIMESTAMP

                WHERE id = :id AND status = 'ACTIVA'

            `,

            { id }

        );

        if (cambio.rowsAffected !== 1) return res.status(409).json({mensaje:"Solo se cancelan donaciones activas."});
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

// RESERVAS DE DONACIONES

// =========================================================

// Consulta el estado actual en Oracle, sin confiar en el rol enviado por el navegador.
async function exigirOrganizacion(req, res, next) {
    try {
        const org = await obtenerUno(`SELECT o.ID, o.NOMBRE_ORGANIZACION, o.REPRESENTANTE,
            o.DISTRITO, o.TIPO_ORGANIZACION, o.COMENSALES FROM ORGANIZACIONES o
            JOIN USUARIOS u ON u.ID = o.USUARIO_ID
            WHERE u.ID = :id AND u.TIPO_CUENTA = 'ORGANIZACION'
            AND u.ESTADO_CUENTA = 'ACTIVA' AND o.ESTADO = 'ACTIVA'`, { id: Number(req.usuario.id) });
        if (!org) return res.status(403).json({ mensaje: "Solo organizaciones activas pueden reservar." });
        req.organizacion = org;
        next();
    } catch (error) { console.error(error); res.status(500).json({ mensaje: "No se pudo comprobar la cuenta." }); }
}

// El rol real se comprueba en Oracle en cada operación de donación.
async function exigirDonante(req, res, next) {
    try {
        const donante = await obtenerUno("SELECT ID FROM USUARIOS WHERE ID = :id AND TIPO_CUENTA = 'DONANTE' AND ESTADO_CUENTA = 'ACTIVA'", { id: Number(req.usuario.id) });
        if (!donante) return res.status(403).json({ mensaje: "Solo donantes activos pueden realizar esta acción." });
        next();
    } catch (error) { console.error(error); res.status(500).json({ mensaje: "No se pudo comprobar la cuenta." }); }
}
const { asegurarTablaNecesidades, instalarRutasNecesidades } = require("./necesidades");
instalarRutasNecesidades(app, { autenticar, exigirOrganizacion, exigirDonante, obtenerTodos, ejecutar });

// Historial privado de reservas de la organización autenticada.
app.get("/api/comedor/reservas", autenticar, exigirOrganizacion, async (req, res) => {
    try {
        const filas = await obtenerTodos(`SELECT r.ID, r.ESTADO, r.CREADO_EN, d.ID AS DONACION_ID,
            d.FOOD, d.QUANTITY, d.UNIT, d.CITY, d.ADDRESS, d.DONOR_NAME, d.WITHDRAWN_AT
            FROM RESERVAS r JOIN DONACIONES d ON d.ID = r.DONACION_ID
            WHERE r.USUARIO_SOLICITANTE_ID = :id ORDER BY r.ID DESC`, { id: Number(req.usuario.id) });
        res.json({ organizacion: req.organizacion, reservas: filas });
    } catch (error) { console.error(error); res.status(500).json({ mensaje: "No se pudieron consultar tus reservas." }); }
});

app.post("/api/donaciones/:id/reservar", autenticar, exigirOrganizacion, async (req, res) => {

    let conexion;

    try {

        const id = Number(req.params.id);

        conexion = await obtenerConexion();

        // Bloquea la donación para evitar reservas simultáneas.

        const resultado = await conexion.execute(

            `SELECT * FROM donaciones WHERE id = :id FOR UPDATE`,

            { id }

        );

        const donacion = resultado.rows[0];

        if (!donacion) {

            await conexion.rollback();

            return res.status(404).json({ mensaje: "Donación no encontrada." });

        }

        if (Number(donacion.USUARIO_ID) === Number(req.usuario.id)) {

            await conexion.rollback();

            return res.status(400).json({ mensaje: "No podés reservar tu propia donación." });

        }

        if (donacion.STATUS !== "ACTIVA") {

            await conexion.rollback();

            return res.status(409).json({ mensaje: "Esta donación ya no está disponible." });

        }

        const propietario = (await conexion.execute("SELECT ID FROM USUARIOS WHERE ID=:usuarioId AND TIPO_CUENTA='DONANTE' AND ESTADO_CUENTA='ACTIVA'",{usuarioId:donacion.USUARIO_ID})).rows[0];
        if (!propietario) { await conexion.rollback(); return res.status(409).json({mensaje:"Esta publicación no pertenece a un donante activo."}); }
        // Verifica nuevamente inocuidad y vencimiento antes de reservar.
        const errorAlimento = require("./reglas-reserva").validarAlimento(donacion);
        if (errorAlimento) { await conexion.rollback(); return res.status(409).json({ mensaje: errorAlimento }); }
        // El receptor se obtiene de Oracle, no de datos manipulables del formulario.
        let retiroMs;
        try { retiroMs = entregas.validarFecha(req.body.fechaRetiro, donacion); }
        catch (error) { await conexion.rollback(); return res.status(400).json({ mensaje: error.message }); }
        const r = { receiverType: req.organizacion.TIPO_ORGANIZACION,
            receiverName: req.organizacion.NOMBRE_ORGANIZACION,
            receiverResponsible: req.organizacion.REPRESENTANTE, receiverCity: req.organizacion.DISTRITO };

        // Registra la solicitud de reserva.

        const reserva = await conexion.execute(

            `INSERT INTO reservas (

                donacion_id, usuario_solicitante_id,

                receiver_type, receiver_name,

                receiver_responsible, receiver_city,

                estado, creado_en

            ) VALUES (

                :donacionId, :usuarioId,

                :receiverType, :receiverName,

                :responsible, :city,

                'PENDIENTE', SYSTIMESTAMP

            ) RETURNING id INTO :id`,

            {

                donacionId: id,

                usuarioId: Number(req.usuario.id),

                receiverType: r.receiverType || "Otro",

                receiverName: r.receiverName,

                responsible: r.receiverResponsible,

                city: r.receiverCity,

                id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }

            }

        );

        const reservaId = reserva.outBinds.id[0];
        await entregas.crearCoordinacion(conexion, reservaId, retiroMs);

        // Cambia el estado de la donación.

        await conexion.execute(

            `UPDATE donaciones SET

                status = 'RESERVADA',

                reserved_at = SYSTIMESTAMP,

                receiver_type = :type,

                receiver_name = :name,

                receiver_responsible = :responsible,

                receiver_city = :city

             WHERE id = :id`,

            {

                type: r.receiverType || "Otro",

                name: r.receiverName,

                responsible: r.receiverResponsible,

                city: r.receiverCity,

                id

            }

        );

        // Notifica al donante.

        await conexion.execute(

            `INSERT INTO notificaciones (

                usuario_id, reserva_id, mensaje, leida, creado_en

            ) VALUES (

                :usuarioId, :reservaId, :mensaje, 0, SYSTIMESTAMP

            )`,

            {

                usuarioId: Number(donacion.USUARIO_ID),

                reservaId,

                mensaje: `${req.usuario.nombre} reservó ${donacion.FOOD}. Retiro previsto: ${entregas.mostrarFecha(retiroMs)} (hora Paraguay).`

            }

        );

        await conexion.commit();

        res.status(201).json({

            mensaje: "Reserva enviada correctamente.",

            donacion: await obtenerDonacionCompleta(id)

        });

    } catch (error) {

        if (conexion) await conexion.rollback();

        console.error(error);

        res.status(500).json({ mensaje: "No se pudo realizar la reserva." });

    } finally {

        if (conexion) await conexion.close();

    }

});

// =========================================================

// Cancelar únicamente la reserva propia y liberar el lote.
app.post("/api/comedor/reservas/:id/cancelar", autenticar, exigirOrganizacion, async (req, res) => {
    let conexion;
    try {
        conexion = await obtenerConexion();
        const id = Number(req.params.id), usuarioId = Number(req.usuario.id);
        if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ mensaje: "Reserva inválida." });
        const previa = (await conexion.execute(`SELECT DONACION_ID FROM RESERVAS WHERE ID=:id AND USUARIO_SOLICITANTE_ID=:usuarioId`, {id, usuarioId})).rows[0];
        if (!previa) return res.status(404).json({mensaje:"Reserva no encontrada."});
        const donacionId = previa.DONACION_ID;
        const lote = (await conexion.execute(`SELECT STATUS, USUARIO_ID FROM DONACIONES WHERE ID=:donacionId FOR UPDATE`, {donacionId})).rows[0];
        if (lote?.STATUS !== "RESERVADA") { await conexion.rollback(); return res.status(409).json({mensaje:"La reserva ya no se puede cancelar."}); }
        const coordinacion = (await conexion.execute('SELECT * FROM RP_ENTREGAS WHERE RESERVA_ID=:id FOR UPDATE',{id})).rows[0];
        if (coordinacion && (coordinacion.DONANTE_RESP || coordinacion.ORGANIZACION_RESP || Number(coordinacion.RETIRO_MS)<=Date.now())) { await conexion.rollback(); return res.status(409).json({mensaje:'Confirmá el resultado de la entrega en lugar de cancelar.'}); }
        const cambio = await conexion.execute(`UPDATE RESERVAS SET ESTADO='CANCELADA' WHERE ID=:id AND USUARIO_SOLICITANTE_ID=:usuarioId AND ESTADO='PENDIENTE'`, {id, usuarioId});
        if (cambio.rowsAffected !== 1) { await conexion.rollback(); return res.status(409).json({mensaje:"La reserva ya no está activa."}); }
        await conexion.execute("UPDATE RP_ENTREGAS SET RESULTADO='CANCELADA' WHERE RESERVA_ID=:id",{id});
        await conexion.execute(`UPDATE DONACIONES SET STATUS='ACTIVA', RESERVED_AT=NULL, RECEIVER_TYPE=NULL, RECEIVER_NAME=NULL, RECEIVER_RESPONSIBLE=NULL, RECEIVER_CITY=NULL WHERE ID=:donacionId`, {donacionId});
        await conexion.execute(`INSERT INTO NOTIFICACIONES (USUARIO_ID, RESERVA_ID, MENSAJE, LEIDA, CREADO_EN) VALUES (:usuarioId,:id,:mensaje,0,SYSTIMESTAMP)`, {usuarioId:lote.USUARIO_ID,id,mensaje:"La organización canceló su reserva."});
        await conexion.commit(); res.json({mensaje:"Reserva cancelada."});
    } catch(error) { if(conexion) await conexion.rollback().catch(()=>{}); console.error(error); res.status(500).json({mensaje:"No se pudo cancelar."}); }
    finally { if(conexion) await conexion.close().catch(()=>{}); }
});

// CONFIRMAR RETIRO DE DONACIÓN

// =========================================================

// La ruta anterior no puede saltarse la confirmación bilateral.
app.post("/api/donaciones/:id/retirar", autenticar, exigirDonante, async (req,res) => {
    res.status(409).json({mensaje:"Usá el panel Entregas para confirmar el resultado."});
});

// =========================================================

// NOTIFICACIONES

// =========================================================

// Consultar notificaciones del usuario.

app.get("/api/notificaciones", autenticar, async (req, res) => {

    try {

        const filas = await obtenerTodos(

            `SELECT id, mensaje, leida, creado_en

             FROM notificaciones

             WHERE usuario_id = :usuarioId

             ORDER BY id DESC`,

            { usuarioId: Number(req.usuario.id) }

        );

        res.json(filas.map(fila => ({

            id: fila.ID,

            mensaje: fila.MENSAJE,

            leida: fila.LEIDA,

            creado_en: fechaISO(fila.CREADO_EN)

        })));

    } catch (error) {

        console.error(error);

        res.status(500).json({ mensaje: "No se pudieron cargar las notificaciones." });

    }

});

// Marcar una notificación como leída.

app.patch("/api/notificaciones/:id/leida", autenticar, async (req, res) => {

    try {

        await ejecutar(

            `UPDATE notificaciones

             SET leida = 1

             WHERE id = :id AND usuario_id = :usuarioId`,

            {

                id: Number(req.params.id),

                usuarioId: Number(req.usuario.id)

            }

        );

        res.json({ mensaje: "Notificación marcada como leída." });

    } catch (error) {

        console.error(error);

        res.status(500).json({ mensaje: "No se pudo actualizar la notificación." });

    }

});

// =========================================================

// RECUPERAR CONTRASEÑA

// =========================================================

// Solicitar recuperación mediante correo electrónico.

app.post("/api/auth/recuperar", async (req, res) => {

    try {

        const email = String(req.body.email || "")

            .trim()

            .toLowerCase();

        const respuesta = {

            mensaje: "Si el correo está registrado, recibirás instrucciones."

        };

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

            return res.status(400).json({

                mensaje: "Correo electrónico inválido."

            });

        }

        const usuario = await obtenerUno(

            `SELECT id, nombre, email

             FROM usuarios

             WHERE LOWER(email) = :email`,

            { email }

        );

        if (!usuario) return res.json(respuesta);

        // Verificar configuración del correo.

        if (!process.env.SMTP_USER ||

            !process.env.GOOGLE_CLIENT_ID ||

            !process.env.GOOGLE_CLIENT_SECRET ||

            !process.env.GOOGLE_REFRESH_TOKEN ||

            !process.env.APP_URL) {

            throw new Error("Configuración de Gmail API incompleta.");

        }

        const usuarioId = Number(usuario.ID);

        // Invalidar tokens anteriores.

        await ejecutar(

            `UPDATE tokens_recuperacion

             SET usado_en = SYSTIMESTAMP

             WHERE usuario_id = :usuarioId

             AND usado_en IS NULL`,

            { usuarioId }

        );

        // Generar token seguro y guardar solamente su hash.

        const token = crypto.randomBytes(32).toString("hex");

        const tokenHash = crypto.createHash("sha256")

            .update(token).digest("hex");

        await ejecutar(

            `INSERT INTO tokens_recuperacion

             (usuario_id, token_hash, expira_en)

             VALUES (

                :usuarioId,

                :tokenHash,

                SYSTIMESTAMP + INTERVAL '30' MINUTE

             )`,

            { usuarioId, tokenHash }

        );

        const url = process.env.APP_URL.replace(/\/+$/, "");

        const enlace = `${url}/restablecer.html?token=${token}`;

        // Enviar enlace al correo del usuario.

        await enviarCorreo(

            usuario.EMAIL,

            "Recuperación de contraseña - RescatePY",

            `<h2>RescatePY</h2>

             <p>Hola ${String(usuario.NOMBRE).replace(/[&<>"']/g, "")},</p>

             <p>Solicitaste recuperar tu contraseña.</p>

             <p><a href="${enlace}">Restablecer mi contraseña</a></p>

             <p>El enlace vence en 30 minutos y solo puede utilizarse una vez.</p>

             <p>Si no solicitaste este cambio, ignorá este correo.</p>`

        );

        res.json(respuesta);

    } catch (error) {

        console.error("Error de recuperación:", error);

        res.status(500).json({

            mensaje: "No se pudo procesar la solicitud."

        });

    }

});

// =========================================================

// RESTABLECER CONTRASEÑA

// =========================================================

app.post("/api/auth/restablecer", async (req, res) => {

    let conexion;

    try {

        const token = String(req.body.token || "").trim();

        const password = String(req.body.password || "");

        if (!/^[a-f0-9]{64}$/i.test(token)) {

            return res.status(400).json({

                mensaje: "Enlace inválido o vencido."

            });

        }

        if (password.length < 8 || password.length > 128) {

            return res.status(400).json({

                mensaje: "La contraseña debe tener entre 8 y 128 caracteres."

            });

        }

        const tokenHash = crypto.createHash("sha256")

            .update(token).digest("hex");

        const passwordHash = await bcrypt.hash(password, 10);

        conexion = await obtenerConexion();

        // Validar token, vencimiento y uso anterior.

        const resultado = await conexion.execute(

            `SELECT id, usuario_id

             FROM tokens_recuperacion

             WHERE token_hash = :tokenHash

             AND usado_en IS NULL

             AND expira_en > SYSTIMESTAMP

             FOR UPDATE`,

            { tokenHash }

        );

        const registro = resultado.rows[0];

        if (!registro) {

            await conexion.rollback();

            return res.status(400).json({

                mensaje: "Enlace inválido o vencido."

            });

        }

        const usuarioId = Number(registro.USUARIO_ID);

        // Actualizar contraseña cifrada.

        const actualizacion = await conexion.execute(

            `UPDATE usuarios

             SET password_hash = :passwordHash

             WHERE id = :usuarioId`,

            { passwordHash, usuarioId }

        );

        if (actualizacion.rowsAffected !== 1) {

            throw new Error("Usuario no encontrado.");

        }

        // Invalidar todos los enlaces pendientes del usuario.

        await conexion.execute(

            `UPDATE tokens_recuperacion

             SET usado_en = SYSTIMESTAMP

             WHERE usuario_id = :usuarioId

             AND usado_en IS NULL`,

            { usuarioId }

        );

        await conexion.commit();

        res.json({

            mensaje: "Contraseña actualizada correctamente."

        });

    } catch (error) {

        if (conexion) await conexion.rollback();

        console.error("Error al cambiar contraseña:", error);

        res.status(500).json({

            mensaje: "No se pudo actualizar la contraseña."

        });

    } finally {

        if (conexion) await conexion.close();

    }

});

// =========================================================

// FRONTEND Y ARRANQUE

// =========================================================

app.get("*", (req, res) => {

    res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));

});

// Iniciar servidor y conexión Oracle.

async function iniciarServidor() {

    try {

        await iniciarPool();

        // Crear tabla de recuperación si no existe.

        await asegurarTablaRecuperacion();
        try { await entregas.asegurarTablaEntregas(ejecutar); console.log("Tabla de entregas verificada."); }
        catch (error) { console.error("No se pudo preparar RP_ENTREGAS:", error.message); }
        // La falta de permiso CREATE TABLE no detiene las funciones anteriores.
        try { await asegurarTablaNecesidades(ejecutar); console.log("Tabla de necesidades verificada."); }
        catch (error) { console.error("No se pudo crear RP_NECESIDADES; revisá permisos Oracle.", error.message); }

        app.listen(PORT, () => {

            console.log(

                `RescatePY disponible en puerto ${PORT}`

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

// Cierre ordenado del pool.

process.on("SIGINT", async () => {

    
    await cerrarPool();

    process.exit(0);

});

process.on("SIGTERM", async () => {

    
    await cerrarPool();

    process.exit(0);

});

// Ejecutar servidor.

iniciarServidor();
// =========================================================
// RESCATEPY - SESIÓN, LOGIN Y CONEXIÓN CON LA API
// =========================================================

(() => {
    const TOKEN_KEY = "rescatepy_token";
    const USER_KEY = "rescatepy_usuario";
    const DONATIONS_KEY = "alimentapy_donaciones";

    // Dirección de la API del backend.
    const API_BASE = "/api";

    // =====================================================
    // GESTIÓN DE SESIÓN
    // =====================================================

    function leerUsuario() {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY) || "null");
        } catch (error) {
            return null;
        }
    }

    function guardarSesion(token, usuario) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(usuario));
        actualizarCabecera();
    }

    function cerrarSesion() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        actualizarCabecera();
        sincronizarDonaciones();
    }

    // =====================================================
    // CONEXIÓN CON EL BACKEND
    // =====================================================

    async function api(ruta, opciones = {}) {
        const esFormData =
            typeof FormData !== "undefined" &&
            opciones.body instanceof FormData;

        const headers = {
            ...(!esFormData ? { "Content-Type": "application/json" } : {}),
            ...(opciones.headers || {})
        };

        const token = localStorage.getItem(TOKEN_KEY);

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const respuesta = await fetch(`${API_BASE}${ruta}`, {
            ...opciones,
            headers
        });

        let datos = {};

        try {
            datos = await respuesta.json();
        } catch (error) {
            datos = {};
        }

        if (!respuesta.ok) {
            if (respuesta.status === 401) {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                actualizarCabecera();
            }

            throw new Error(
                datos.mensaje || "No se pudo completar la operación."
            );
        }

        return datos;
    }

    // =====================================================
    // MODAL DE AUTENTICACIÓN
    // =====================================================

    function abrirAcceso(modo = "login") {
        const modal = document.getElementById("authModal");

        modal?.classList.add("activo");

        cambiarModo(modo);
    }

    function cerrarAcceso() {
        document.getElementById("authModal")
            ?.classList.remove("activo");

        const mensaje = document.getElementById("authMessage");

        if (mensaje) mensaje.textContent = "";
    }

    function cambiarModo(modo) {
        const login = document.getElementById("loginForm");
        const registro = document.getElementById("registerForm");
        const titulo = document.getElementById("authTitle");

        const btnLogin = document.getElementById("authTabLogin");
        const btnRegistro = document.getElementById("authTabRegister");

        const esLogin = modo === "login";

        login?.classList.toggle("campo-oculto", !esLogin);
        registro?.classList.toggle("campo-oculto", esLogin);

        btnLogin?.classList.toggle("activo", esLogin);
        btnRegistro?.classList.toggle("activo", !esLogin);

        if (titulo) {
            titulo.textContent = esLogin
                ? "Iniciar sesión"
                : "Crear cuenta";
        }
    }

    function requiereLogin() {
        if (leerUsuario()) return true;

        abrirAcceso("login");

        return false;
    }

    // =====================================================
    // ACTUALIZAR CABECERA
    // =====================================================

    function actualizarCabecera() {
        const usuario = leerUsuario();

        const authButton = document.getElementById("authButton");
        const logoutButton = document.getElementById("logoutButton");
        const notificationButton = document.getElementById("notificationButton");

        if (authButton) {
            authButton.textContent = usuario
                ? `👤 ${usuario.nombre}`
                : "Iniciar sesión";
        }

        logoutButton?.classList.toggle("campo-oculto", !usuario);

        notificationButton?.classList.toggle("campo-oculto", !usuario);
        document.getElementById("misReservasBtn")?.classList.toggle("campo-oculto", usuario?.tipoCuenta !== "ORGANIZACION");

        const esOrganizacion = usuario?.tipoCuenta === "ORGANIZACION";
        // Las organizaciones reciben alimentos, pero pueden donar artículos.
        document.getElementById("abrirDonacionBtn")?.classList.toggle("campo-oculto", esOrganizacion);
        document.getElementById("abrirAyudarBtn")?.classList.toggle("campo-oculto", usuario?.tipoCuenta === "DONANTE");
        document.getElementById("necesidadesOrganizacionBtn")?.classList.toggle("campo-oculto", !esOrganizacion);
        document.getElementById("necesidadesDonanteBtn")?.classList.toggle("campo-oculto", usuario?.tipoCuenta !== "DONANTE");
        // Cerrar formularios privados si cambia la sesión.
        document.dispatchEvent(new CustomEvent("rescate:sesion", { detail: usuario }));

        if (usuario) {
            actualizarContadorNotificaciones();
        } else {
            const contador = document.getElementById("notificationCount");

            if (contador) contador.textContent = "";
        }
    }

    // =====================================================
    // SINCRONIZACIÓN DE DONACIONES
    // =====================================================

    async function sincronizarDonaciones() {
        try {
            const donaciones = await api("/donaciones", {
                method: "GET"
            });

            localStorage.setItem(
                DONATIONS_KEY,
                JSON.stringify(donaciones)
            );

            // Actualiza las vistas existentes del proyecto.
            window.mostrarDonaciones?.();
            window.renderizarInteligenciaSocial?.();

        } catch (error) {
            console.warn("Backend no disponible:", error.message);
        }
    }

    // =====================================================
    // NOTIFICACIONES
    // =====================================================

    // Consultar avisos periódicamente y marcar los visibles al abrir la campana.
    let consultandoAvisos = false;
    let leyendoAvisos = false;
    function pintarContador(n) {
        const contador = document.getElementById("notificationCount");
        if (contador) { contador.textContent = n ? String(n) : ""; contador.hidden = !n; }
    }
    async function actualizarContadorNotificaciones() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!leerUsuario() || !token || consultandoAvisos || leyendoAvisos) return;
        consultandoAvisos = true;
        try {
            const filas = await api("/notificaciones", { method: "GET", cache: "no-store" });
            if (token === localStorage.getItem(TOKEN_KEY) && !leyendoAvisos)
                pintarContador(filas.filter(n => !Number(n.leida)).length);
        } catch (error) { console.warn(error.message); }
        finally { consultandoAvisos = false; }
    }
    async function mostrarNotificaciones() {
        if (!requiereLogin() || leyendoAvisos) return;
        const token = localStorage.getItem(TOKEN_KEY);
        const lista = document.getElementById("notificationList");
        const modal = document.getElementById("notificationModal");
        modal?.classList.add("activo");
        if (!lista) return;
        leyendoAvisos = true;
        lista.textContent = "Cargando...";
        try {
            const filas = await api("/notificaciones", { method: "GET", cache: "no-store" });
            if (token !== localStorage.getItem(TOKEN_KEY)) return;
            // Marcar solo las notificaciones recibidas, sin borrar el historial.
            let fallos = 0;
            for (const n of filas.filter(n => !Number(n.leida))) {
                if (token !== localStorage.getItem(TOKEN_KEY)) return;
                try { await api(`/notificaciones/${n.id}/leida`, { method: "PATCH" }); n.leida = 1; }
                catch (e) { fallos++; }
            }
            if (token !== localStorage.getItem(TOKEN_KEY)) return;
            pintarContador(fallos);
            lista.replaceChildren();
            if (!filas.length) lista.textContent = "Todavía no tenés notificaciones.";
            for (const n of filas) {
                const item = document.createElement("div");
                item.className = `notificacion-item ${Number(n.leida) ? "leida" : ""}`;
                item.innerHTML = `<strong>Notificación</strong><span>${escapeHTML(n.mensaje)}</span><small>${formatear(n.creado_en)}</small>`;
                lista.appendChild(item);
            }
            const chat = document.createElement("button");
            chat.type = "button"; chat.className = "notificacion-item"; chat.textContent = "Abrir mis conversaciones";
            chat.onclick = () => { modal?.classList.remove("activo"); window.RescateSeguimiento?.conversaciones(); };
            lista.appendChild(chat);
            if (fallos) lista.append("No se pudieron marcar todos los avisos. Volvé a abrir la campana para reintentar.");
        } catch (error) { if (token === localStorage.getItem(TOKEN_KEY)) lista.textContent = error.message; }
        finally { leyendoAvisos = false; actualizarContadorNotificaciones(); }
    }

    // =====================================================
    // UTILIDADES
    // =====================================================

    function escapeHTML(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatear(valor) {
        if (!valor) return "";

        const fecha = new Date(valor);

        return Number.isNaN(fecha.getTime())
            ? valor
            : fecha.toLocaleString("es-PY");
    }

    // =====================================================
    // API PÚBLICA PARA APP.JS
    // =====================================================

    window.RescateAuth = {
        api,
        getUser: leerUsuario,
        requireAuth: requiereLogin,
        open: abrirAcceso,
        syncDonations: sincronizarDonaciones,
        refreshNotifications: actualizarContadorNotificaciones
    };

    // =====================================================
    // EVENTOS DEL SISTEMA
    // =====================================================

    document.addEventListener("DOMContentLoaded", () => {

        actualizarCabecera();

        sincronizarDonaciones();

        // Botón de inicio de sesión.
        document.getElementById("authButton")
            ?.addEventListener("click", () => {

                const usuario = leerUsuario();

                if (usuario) return;

                abrirAcceso("login");
            });

        // Cerrar sesión.
        document.getElementById("logoutButton")
            ?.addEventListener("click", cerrarSesion);

        // Actualizar la campana sin recargar la página.
        setInterval(actualizarContadorNotificaciones, 5000);
        window.addEventListener("focus", actualizarContadorNotificaciones);
        // Notificaciones.
        document.getElementById("notificationButton")
            ?.addEventListener("click", mostrarNotificaciones);

        document.getElementById("closeNotifications")
            ?.addEventListener("click", () => {
                document.getElementById("notificationModal")
                    ?.classList.remove("activo");
            });

        document.getElementById("notificationBackdrop")
            ?.addEventListener("click", () => {
                document.getElementById("notificationModal")
                    ?.classList.remove("activo");
            });

        // Cierre del modal de autenticación.
        document.getElementById("closeAuth")
            ?.addEventListener("click", cerrarAcceso);

        document.getElementById("authBackdrop")
            ?.addEventListener("click", cerrarAcceso);

        // Cambiar entre login y registro.
        document.getElementById("authTabLogin")
            ?.addEventListener("click", () => cambiarModo("login"));

        document.getElementById("authTabRegister")
            ?.addEventListener("click", () => cambiarModo("registro"));

        // =================================================
        // RECUPERACIÓN DE CONTRASEÑA
        // =================================================

        document.getElementById("forgotPasswordBtn")
            ?.addEventListener("click", async () => {

                const emailInput = document.getElementById("loginEmail");
                const mensaje = document.getElementById("authMessage");
                const boton = document.getElementById("forgotPasswordBtn");

                const email = emailInput?.value.trim() || "";

                // Verificar que el usuario ingrese su correo.
                if (!email) {
                    if (mensaje) {
                        mensaje.textContent =
                            "Ingresá tu correo electrónico para continuar.";
                    }

                    emailInput?.focus();

                    return;
                }

                // Validación básica del formato del correo.
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    if (mensaje) {
                        mensaje.textContent =
                            "Ingresá un correo electrónico válido.";
                    }

                    emailInput?.focus();

                    return;
                }

                try {
                    // Deshabilita temporalmente el botón.
                    if (boton) {
                        boton.disabled = true;
                        boton.textContent = "Enviando...";
                    }

                    // Solicita al backend enviar el enlace de recuperación.
                    const resultado = await api("/auth/recuperar", {
                        method: "POST",
                        body: JSON.stringify({ email })
                    });

                    if (mensaje) {
                        mensaje.textContent = resultado.mensaje ||
                            "Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.";
                    }

                } catch (error) {
                    if (mensaje) {
                        mensaje.textContent = error.message;
                    }

                } finally {
                    // Habilita nuevamente el botón.
                    if (boton) {
                        boton.disabled = false;
                        boton.textContent = "¿Olvidaste tu contraseña?";
                    }
                }
            });

        // =================================================
        // INICIAR SESIÓN
        // =================================================

        document.getElementById("loginForm")
            ?.addEventListener("submit", async (evento) => {

                evento.preventDefault();

                const mensaje = document.getElementById("authMessage");

                try {
                    const respuesta = await api("/auth/login", {
                        method: "POST",
                        body: JSON.stringify({
                            email: document.getElementById("loginEmail").value,
                            password: document.getElementById("loginPassword").value
                        })
                    });

                    // Guarda el token y los datos del usuario.
                    guardarSesion(respuesta.token, respuesta.usuario);

                    if (mensaje) {
                        mensaje.textContent =
                            "Sesión iniciada correctamente.";
                    }

                    await sincronizarDonaciones();

                    setTimeout(cerrarAcceso, 350);

                } catch (error) {
                    if (mensaje) {
                        mensaje.textContent = error.message;
                    }
                }
            });

        // =================================================
        // SELECCIÓN DEL TIPO DE CUENTA
        // =================================================

        const btnDonante = document.getElementById("registerRoleDonante");
        const btnComedor = document.getElementById("registerRoleComedor");

        const tipoCuentaInput = document.getElementById("registerAccountType");
        const camposOrganizacion = document.getElementById("registerOrganizationFields");

        // Activa los campos correspondientes al tipo de cuenta.
        function seleccionarTipoCuenta(tipo) {
            const esOrganizacion = tipo === "ORGANIZACION";

            if (tipoCuentaInput) {
                tipoCuentaInput.value = tipo;
            }

            camposOrganizacion?.classList.toggle(
                "campo-oculto",
                !esOrganizacion
            );

            btnDonante?.classList.toggle("activo", !esOrganizacion);
            btnComedor?.classList.toggle("activo", esOrganizacion);

            // Los datos institucionales son obligatorios para comedores.
            const campos = [
                ["registerOrgName", true],
                ["registerOrgType", true],
                ["registerOrgRuc", true],
                ["registerRepresentative", true],
                ["registerCiRepresentative", true],
                ["registerPhone", true],
                ["registerDepartment", true],
                ["registerDistrict", true],
                ["registerAddress", true],
                ["registerDiners", true]
            ];

            campos.forEach(([id, obligatorio]) => {
                const campo = document.getElementById(id);

                if (campo) {
                    campo.required = esOrganizacion && obligatorio;
                }
            });
        }

        // Selección de donante.
        btnDonante?.addEventListener("click", () => {
            seleccionarTipoCuenta("DONANTE");
        });

        // Selección de comedor.
        btnComedor?.addEventListener("click", () => {
            seleccionarTipoCuenta("ORGANIZACION");
        });

        // Inicializa el formulario como donante.
        seleccionarTipoCuenta("DONANTE");


        // =================================================
        // REGISTRO DE USUARIOS
        // =================================================

        document.getElementById("registerForm")
            ?.addEventListener("submit", async (evento) => {

                evento.preventDefault();

                const mensaje = document.getElementById("authMessage");

                const password =
                    document.getElementById("registerPassword").value;

                const repetir =
                    document.getElementById("registerPassword2").value;

                const tipoCuenta =
                    tipoCuentaInput?.value || "DONANTE";

                // Comprueba que las contraseñas coincidan.
                if (password !== repetir) {
                    if (mensaje) {
                        mensaje.textContent = "Las contraseñas no coinciden.";
                    }
                    return;
                }

                // Prepara los datos generales.
                const datosRegistro = {
                    nombre: document.getElementById("registerName").value.trim(),
                    email: document.getElementById("registerEmail").value.trim(),
                    password,
                    tipoCuenta
                };

                // Agrega los datos institucionales si es un comedor.
                if (tipoCuenta === "ORGANIZACION") {
                    datosRegistro.nombreOrganizacion =
                        document.getElementById("registerOrgName").value.trim();

                    datosRegistro.tipoOrganizacion =
                        document.getElementById("registerOrgType").value.trim();

                    datosRegistro.ruc =
                        document.getElementById("registerOrgRuc").value.trim();

                    datosRegistro.representante =
                        document.getElementById("registerRepresentative").value.trim();

                    datosRegistro.ciRepresentante =
                        document.getElementById("registerCiRepresentative").value.trim();

                    datosRegistro.telefono =
                        document.getElementById("registerPhone").value.trim();

                    datosRegistro.departamento =
                        document.getElementById("registerDepartment").value.trim();

                    datosRegistro.distrito =
                        document.getElementById("registerDistrict").value.trim();

                    datosRegistro.direccion =
                        document.getElementById("registerAddress").value.trim();

                    datosRegistro.comensales =
                        Number(document.getElementById("registerDiners").value);
                }

                try {
                    // Registro institucional sin carga de archivos ni OCR.
                    const respuesta = await api("/auth/registro", { method: "POST", body: JSON.stringify(datosRegistro) });

                    if (mensaje) {
                        mensaje.textContent = respuesta.mensaje ||
                            (tipoCuenta === "ORGANIZACION"
                                ? "Estado de registro: " + (respuesta.estadoValidacion || "PENDIENTE")
                                : "Donante registrado correctamente.");
                    }

                    // Conserva el correo para iniciar sesión cuando la cuenta esté aprobada.
                    document.getElementById("loginEmail").value = datosRegistro.email;

                    if (tipoCuenta === "DONANTE" || respuesta.estadoValidacion === "APROBADO") {
                        cambiarModo("login");
                    } else {
                        // La cuenta pendiente permanece en el formulario para permitir otro envío con el mismo correo.
                        const passwordActual = document.getElementById("registerPassword");
                        const repetirActual = document.getElementById("registerPassword2");
                        if (passwordActual) passwordActual.value = password;
                        if (repetirActual) repetirActual.value = repetir;
                    }

                } catch (error) {
                    if (mensaje) {
                        mensaje.textContent = error.message;
                    }
                }
            });

    });

})();
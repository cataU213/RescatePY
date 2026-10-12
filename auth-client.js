// =========================================================
// RESCATEPY - SESIÓN, LOGIN Y CONEXIÓN CON LA API
// =========================================================
(() => {
    const TOKEN_KEY = "rescatepy_token";
    const USER_KEY = "rescatepy_usuario";
    const DONATIONS_KEY = "alimentapy_donaciones";

    // Usa la misma dirección donde está publicado RescatePY.
    // Funciona tanto en localhost como en un hosting con Node.js.
    const API_BASE = "/api";

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

    async function api(ruta, opciones = {}) {
        const headers = {
            "Content-Type": "application/json",
            ...(opciones.headers || {})
        };

        const token = localStorage.getItem(TOKEN_KEY);
        if (token) headers.Authorization = `Bearer ${token}`;

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
            throw new Error(datos.mensaje || "No se pudo completar la operación.");
        }

        return datos;
    }

    function abrirAcceso(modo = "login") {
        const modal = document.getElementById("authModal");
        modal?.classList.add("activo");
        cambiarModo(modo);
    }

    function cerrarAcceso() {
        document.getElementById("authModal")?.classList.remove("activo");
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
        if (titulo) titulo.textContent = esLogin ? "Iniciar sesión" : "Crear cuenta";
    }

    function requiereLogin() {
        if (leerUsuario()) return true;
        abrirAcceso("login");
        return false;
    }

    function actualizarCabecera() {
        const usuario = leerUsuario();
        const authButton = document.getElementById("authButton");
        const logoutButton = document.getElementById("logoutButton");
        const notificationButton = document.getElementById("notificationButton");

        if (authButton) {
            authButton.textContent = usuario ? `👤 ${usuario.nombre}` : "Iniciar sesión";
        }
        logoutButton?.classList.toggle("campo-oculto", !usuario);
        notificationButton?.classList.toggle("campo-oculto", !usuario);

        if (usuario) actualizarContadorNotificaciones();
        else {
            const contador = document.getElementById("notificationCount");
            if (contador) contador.textContent = "";
        }
    }

    async function sincronizarDonaciones() {
        try {
            const donaciones = await api("/donaciones", { method: "GET" });
            localStorage.setItem(DONATIONS_KEY, JSON.stringify(donaciones));

            // Reutiliza el renderizado existente del proyecto.
            window.mostrarDonaciones?.();
            window.renderizarInteligenciaSocial?.();
        } catch (error) {
            console.warn("Backend no disponible:", error.message);
        }
    }

    async function actualizarContadorNotificaciones() {
        if (!leerUsuario()) return;
        try {
            const notificaciones = await api("/notificaciones", { method: "GET" });
            const pendientes = notificaciones.filter(item => !Number(item.leida)).length;
            const contador = document.getElementById("notificationCount");
            if (contador) contador.textContent = pendientes ? String(pendientes) : "";
        } catch (error) {
            console.warn(error.message);
        }
    }

    async function mostrarNotificaciones() {
        if (!requiereLogin()) return;

        const lista = document.getElementById("notificationList");
        const modal = document.getElementById("notificationModal");
        modal?.classList.add("activo");
        if (lista) lista.innerHTML = '<p class="notificacion-vacia">Cargando...</p>';

        try {
            const notificaciones = await api("/notificaciones", { method: "GET" });

            if (!lista) return;
            if (!notificaciones.length) {
                lista.innerHTML = '<p class="notificacion-vacia">Todavía no tenés notificaciones.</p>';
                return;
            }

            lista.innerHTML = "";
            notificaciones.forEach((n) => {
                const item = document.createElement("button");
                item.type = "button";
                item.className = `notificacion-item ${Number(n.leida) ? "leida" : ""}`;
                item.innerHTML = `
                    <strong>${Number(n.leida) ? "Notificación" : "Nueva solicitud"}</strong>
                    <span>${escapeHTML(n.mensaje)}</span>
                    <small>${formatear(n.creado_en)}</small>
                `;

                item.addEventListener("click", async () => {
                    if (!Number(n.leida)) {
                        await api(`/notificaciones/${n.id}/leida`, { method: "PATCH" });
                        item.classList.add("leida");
                        n.leida = 1;
                        actualizarContadorNotificaciones();
                    }
                });
                lista.appendChild(item);
            });
        } catch (error) {
            if (lista) lista.innerHTML = `<p class="notificacion-vacia">${escapeHTML(error.message)}</p>`;
        }
    }

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
        return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleString("es-PY");
    }

    // API pública utilizada desde app.js.
    window.RescateAuth = {
        api,
        getUser: leerUsuario,
        requireAuth: requiereLogin,
        open: abrirAcceso,
        syncDonations: sincronizarDonaciones,
        refreshNotifications: actualizarContadorNotificaciones
    };

    document.addEventListener("DOMContentLoaded", () => {
        actualizarCabecera();
        sincronizarDonaciones();

        document.getElementById("authButton")?.addEventListener("click", () => {
            const usuario = leerUsuario();
            if (usuario) return;
            abrirAcceso("login");
        });

        document.getElementById("logoutButton")?.addEventListener("click", cerrarSesion);
        document.getElementById("notificationButton")?.addEventListener("click", mostrarNotificaciones);
        document.getElementById("closeNotifications")?.addEventListener("click", () => {
            document.getElementById("notificationModal")?.classList.remove("activo");
        });
        document.getElementById("notificationBackdrop")?.addEventListener("click", () => {
            document.getElementById("notificationModal")?.classList.remove("activo");
        });

        document.getElementById("closeAuth")?.addEventListener("click", cerrarAcceso);
        document.getElementById("authBackdrop")?.addEventListener("click", cerrarAcceso);
        document.getElementById("authTabLogin")?.addEventListener("click", () => cambiarModo("login"));
        document.getElementById("authTabRegister")?.addEventListener("click", () => cambiarModo("registro"));

        document.getElementById("loginForm")?.addEventListener("submit", async (evento) => {
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
                guardarSesion(respuesta.token, respuesta.usuario);
                if (mensaje) mensaje.textContent = "Sesión iniciada correctamente.";
                await sincronizarDonaciones();
                setTimeout(cerrarAcceso, 350);
            } catch (error) {
                if (mensaje) mensaje.textContent = error.message;
            }
        });

        document.getElementById("registerForm")?.addEventListener("submit", async (evento) => {
            evento.preventDefault();
            const mensaje = document.getElementById("authMessage");
            const password = document.getElementById("registerPassword").value;
            const repetir = document.getElementById("registerPassword2").value;

            if (password !== repetir) {
                if (mensaje) mensaje.textContent = "Las contraseñas no coinciden.";
                return;
            }

            try {
                await api("/auth/registro", {
                    method: "POST",
                    body: JSON.stringify({
                        nombre: document.getElementById("registerName").value,
                        email: document.getElementById("registerEmail").value,
                        password
                    })
                });
                if (mensaje) mensaje.textContent = "Cuenta creada. Ahora podés iniciar sesión.";
                cambiarModo("login");
                document.getElementById("loginEmail").value = document.getElementById("registerEmail").value;
            } catch (error) {
                if (mensaje) mensaje.textContent = error.message;
            }
        });
    });
})();

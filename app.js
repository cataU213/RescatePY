/* =========================================================
   ALIMENTAPY
   app.js COMPLETO

   Incluye:
   1. Red institucional
   2. Ayuda territorial
   3. Menú ODS
   4. Donaciones de alimentos
   5. Alimentos disponibles
   6. Reserva y retiro de alimentos
   7. Quiero ayudar
   8. Tu ayuda cerca
   9. Manos que suman
   10. EcoValor
   11. Impacto ODS
   12. Persistencia con localStorage

   IMPORTANTE:
   Reemplazá completamente tu app.js actual por este archivo.
========================================================= */


/* =========================================================
   UTILIDADES GENERALES
========================================================= */

/* Devuelve un elemento por su id. */
function obtenerElemento(id) {
    return document.getElementById(id);
}


/* Evita insertar HTML escrito por el usuario. */
function escaparHTML(texto = "") {
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* Lee un arreglo guardado en localStorage. */
function leerArregloLocal(clave) {
    try {
        const datos = localStorage.getItem(clave);

        if (!datos) {
            return [];
        }

        const arreglo = JSON.parse(datos);

        return Array.isArray(arreglo)
            ? arreglo
            : [];
    } catch (error) {
        console.error(
            `No se pudo leer ${clave}:`,
            error
        );

        return [];
    }
}


/* Guarda un arreglo en localStorage. */
function guardarArregloLocal(
    clave,
    arreglo
) {
    localStorage.setItem(
        clave,
        JSON.stringify(arreglo)
    );
}


/* Fecha y hora legible para Paraguay. */
function formatearFecha(fechaISO) {
    if (!fechaISO) {
        return "-";
    }

    const fecha = new Date(fechaISO);

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return "-";
    }

    return fecha.toLocaleString(
        "es-PY",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );
}


/* Formato monetario en guaraníes. */
function formatearGuaranies(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return "-";
    }

    return new Intl.NumberFormat(
        "es-PY",
        {
            style: "currency",
            currency: "PYG",
            maximumFractionDigits: 0
        }
    ).format(numero);
}


/* Cierra un modal que utiliza la clase activo. */
function cerrarModalPorId(id) {
    obtenerElemento(id)
        ?.classList
        .remove("activo");
}


/* =========================================================
   1. RED INSTITUCIONAL
========================================================= */

const instituciones = [
    {
        nombre:
            "Ministerio de Desarrollo Social - MDS / CONADA",

        tipo:
            "Institución pública de desarrollo social",

        direccion:
            "Av. Mariscal López y Coronel Pampliega, Fernando de la Mora, Paraguay",

        mapa:
            "Ministerio de Desarrollo Social Paraguay, Av. Mariscal López y Coronel Pampliega, Fernando de la Mora"
    },

    {
        nombre:
            "Instituto Nacional de Alimentación y Nutrición - INAN",

        tipo:
            "Institución técnica de alimentación y nutrición",

        direccion:
            "Av. Santísima Trinidad esq. Itapúa, Asunción, Paraguay",

        mapa:
            "Instituto Nacional de Alimentación y Nutrición INAN, Asunción, Paraguay"
    },

    {
        nombre:
            "Fundación Banco de Alimentos Paraguay",

        tipo:
            "Organización de rescate y distribución de alimentos",

        direccion:
            "Av. Defensores del Chaco, Mercado de Abasto, Asunción, Paraguay",

        mapa:
            "Fundación Banco de Alimentos Paraguay, Mercado de Abasto, Asunción"
    }
];


/* Muestra las instituciones registradas. */
function mostrarInstituciones() {
    const contenedor =
        obtenerElemento(
            "listaOrganizaciones"
        );

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = "";

    instituciones.forEach(
        (institucion) => {
            const tarjeta =
                document.createElement(
                    "article"
                );

            tarjeta.className =
                "organizacion-card";

            tarjeta.innerHTML = `
                <span class="organizacion-tipo">
                    ${escaparHTML(institucion.tipo)}
                </span>

                <h3>
                    ${escaparHTML(institucion.nombre)}
                </h3>

                <p>
                    <strong>Dirección:</strong>
                    ${escaparHTML(institucion.direccion)}
                </p>

                <div class="botones-card">
                    <button
                        type="button"
                        class="boton-card">
                        Cómo llegar
                    </button>
                </div>
            `;

            tarjeta
                .querySelector(
                    ".boton-card"
                )
                ?.addEventListener(
                    "click",
                    () => {
                        comoLlegar(
                            institucion.mapa
                        );
                    }
                );

            contenedor.appendChild(
                tarjeta
            );
        }
    );
}


/* =========================================================
   2. AYUDA TERRITORIAL
========================================================= */

const comedores = [
    {
        nombre:
            "Comedor Comunitario San Felipe",

        ciudad:
            "Asunción",

        direccion:
            "Av. Artigas y Perú, Asunción, Paraguay",

        mapa:
            "Comedor Comunitario San Felipe, Av. Artigas y Perú, Asunción, Paraguay"
    },

    {
        nombre:
            "Comedor Comunitario Milagro de Jesús",

        ciudad:
            "Asunción",

        direccion:
            "Barrio Virgen de Luján, Bañado Sur, Asunción, Paraguay",

        mapa:
            "Comedor Comunitario Milagro de Jesús, Bañado Sur, Asunción, Paraguay"
    },

    {
        nombre:
            "Comedor 14 de Mayo",

        ciudad:
            "San Lorenzo",

        direccion:
            "Gral. Caballero 183, San Lorenzo, Paraguay",

        mapa:
            "Comedor 14 de Mayo, Gral. Caballero 183, San Lorenzo, Paraguay"
    },

    {
        nombre:
            "Comedor Jesús el Buen Pastor",

        ciudad:
            "San Lorenzo",

        direccion:
            "MFQH+C89, San Lorenzo 111403, Paraguay",

        mapa:
            "Comedor Jesús el Buen Pastor, San Lorenzo, Paraguay"
    },

    {
        nombre:
            "Comedor Santa Lucía",

        ciudad:
            "Capiatá",

        direccion:
            "JH8P+HJH, Capiatá 110226, Paraguay",

        mapa:
            "Comedor Santa Lucía, Capiatá, Paraguay"
    }
];


/* Filtra y muestra los comedores. */
function mostrarComedores(
    filtro = ""
) {
    const contenedor =
        obtenerElemento(
            "listaComedores"
        );

    if (!contenedor) {
        return;
    }

    const texto =
        filtro
            .trim()
            .toLowerCase();

    const resultados =
        comedores.filter(
            (comedor) => {
                return (
                    comedor.nombre
                        .toLowerCase()
                        .includes(texto)

                    ||

                    comedor.ciudad
                        .toLowerCase()
                        .includes(texto)

                    ||

                    comedor.direccion
                        .toLowerCase()
                        .includes(texto)
                );
            }
        );

    contenedor.innerHTML = "";

    if (
        resultados.length === 0
    ) {
        contenedor.innerHTML = `
            <p
                style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 30px;
                ">
                No se encontraron comedores.
            </p>
        `;

        return;
    }

    resultados.forEach(
        (comedor) => {
            const tarjeta =
                document.createElement(
                    "article"
                );

            tarjeta.className =
                "comedor-card";

            tarjeta.innerHTML = `
                <span class="organizacion-tipo">
                    ${escaparHTML(comedor.ciudad)}
                </span>

                <h3>
                    ${escaparHTML(comedor.nombre)}
                </h3>

                <p>
                    <strong>Dirección:</strong>
                    ${escaparHTML(comedor.direccion)}
                </p>

                <div class="botones-card">
                    <button
                        type="button"
                        class="boton-card">
                        Cómo llegar
                    </button>
                </div>
            `;

            tarjeta
                .querySelector(
                    ".boton-card"
                )
                ?.addEventListener(
                    "click",
                    () => {
                        comoLlegar(
                            comedor.mapa
                        );
                    }
                );

            contenedor.appendChild(
                tarjeta
            );
        }
    );
}


/* =========================================================
   GOOGLE MAPS
========================================================= */

/* Abre una ruta hacia un destino. */
function comoLlegar(destino) {
    const destinoCodificado =
        encodeURIComponent(
            destino
        );

    const url =
        "https://www.google.com/maps/dir/" +
        "?api=1" +
        "&destination=" +
        destinoCodificado;

    window.open(
        url,
        "_blank",
        "noopener"
    );
}


/* Busca una dirección o zona. */
function abrirMapa(
    direccion,
    ciudad = ""
) {
    const texto =
        [
            direccion,
            ciudad,
            "Paraguay"
        ]
        .filter(Boolean)
        .join(", ");

    const destino =
        encodeURIComponent(texto);

    const url =
        "https://www.google.com/maps/search/" +
        "?api=1" +
        "&query=" +
        destino;

    window.open(
        url,
        "_blank",
        "noopener"
    );
}


/* Genera una URL de búsqueda en Maps. */
function crearUrlGoogleMaps(
    consulta
) {
    return (
        "https://www.google.com/maps/search/" +
        "?api=1&query=" +
        encodeURIComponent(consulta)
    );
}




/* =========================================================
   INTELIGENCIA SOCIAL - REPORTE TERRITORIAL
   Usa los datos ya guardados en localStorage.
========================================================= */

/*
   Normaliza una ciudad para agrupar correctamente
   "Luque", "luque" y " LUQUE ".
*/
function normalizarZona(texto = "") {
    return String(texto)
        .trim()
        .toLocaleLowerCase("es-PY");
}


/* Convierte la primera letra de cada palabra a mayúscula. */
function nombreVisibleZona(texto = "") {
    return String(texto)
        .trim()
        .toLocaleLowerCase("es-PY")
        .replace(
            /(^|\s)\S/g,
            (letra) =>
                letra.toLocaleUpperCase("es-PY")
        );
}


/*
   Genera los datos territoriales usando:
   - donaciones de alimentos
   - ayudas no alimentarias
   - reservas
   - retiros confirmados
*/
function obtenerDatosInteligenciaSocial() {

    const zonas =
        new Map();


    /* Crea la zona si todavía no existe. */
    function asegurarZona(nombreZona) {

        const nombre =
            String(nombreZona || "")
                .trim();

        if (!nombre) {
            return null;
        }


        const clave =
            normalizarZona(nombre);


        if (!zonas.has(clave)) {
            zonas.set(
                clave,
                {
                    zona:
                        nombreVisibleZona(nombre),

                    donaciones:
                        0,

                    solicitudes:
                        0,

                    retiros:
                        0
                }
            );
        }


        return zonas.get(
            clave
        );
    }


    /* =============================================
       DONACIONES DE ALIMENTOS
    ============================================= */

    obtenerDonaciones()
        .filter(
            (donacion) =>
                donacion.status !==
                "CANCELADA"
        )
        .forEach(
            (donacion) => {

                /* Oferta publicada en la ciudad del donante. */
                const zonaDonacion =
                    asegurarZona(
                        donacion.city
                    );

                if (zonaDonacion) {
                    zonaDonacion.donaciones++;
                }


                /*
                   Una reserva o retiro representa
                   una solicitud atendida.
                */
                if (
                    donacion.receiver
                    &&
                    (
                        donacion.status ===
                        "RESERVADA"
                        ||
                        donacion.status ===
                        "RETIRADA"
                    )
                ) {

                    const zonaSolicitud =
                        asegurarZona(
                            donacion.receiver.city
                        );

                    if (zonaSolicitud) {
                        zonaSolicitud.solicitudes++;

                        if (
                            donacion.status ===
                            "RETIRADA"
                        ) {
                            zonaSolicitud.retiros++;
                        }
                    }
                }
            }
        );


    /* =============================================
       AYUDAS NO ALIMENTARIAS
    ============================================= */

    obtenerAyudas()
        .filter(
            (ayuda) =>
                ayuda.status !==
                "CANCELADA"
        )
        .forEach(
            (ayuda) => {

                const zonaDonacion =
                    asegurarZona(
                        ayuda.city
                    );

                if (zonaDonacion) {
                    zonaDonacion.donaciones++;
                }


                if (
                    ayuda.receiver
                    &&
                    (
                        ayuda.status ===
                        "RESERVADA"
                        ||
                        ayuda.status ===
                        "RETIRADA"
                    )
                ) {

                    const zonaSolicitud =
                        asegurarZona(
                            ayuda.receiver.city
                        );

                    if (zonaSolicitud) {
                        zonaSolicitud.solicitudes++;

                        if (
                            ayuda.status ===
                            "RETIRADA"
                        ) {
                            zonaSolicitud.retiros++;
                        }
                    }
                }
            }
        );


    return Array.from(
        zonas.values()
    );
}


/* Define el estado de cobertura de una zona. */
function obtenerEstadoZonaInteligencia(
    item
) {

    const balance =
        item.donaciones -
        item.solicitudes;


    if (
        item.solicitudes === 0
        ||
        balance >= 0
    ) {
        return {
            texto:
                "Cubierto",

            clase:
                "cubierto"
        };
    }


    const cobertura =
        item.donaciones /
        item.solicitudes;


    if (
        cobertura < 0.5
    ) {
        return {
            texto:
                "Crítico",

            clase:
                "critico"
        };
    }


    return {
        texto:
            "Atención",

        clase:
            "atencion"
    };
}


/* =========================================================
   INTELIGENCIA SOCIAL - DASHBOARD VISUAL
   Mantiene los datos dinámicos del sistema.
========================================================= */

/*
   Crea la estructura visual del reporte una sola vez.
   De esta forma no necesitás reescribir todo el HTML del proyecto.
*/
function prepararDashboardInteligenciaSocial() {

    const modal =
        obtenerElemento(
            "modalSocial"
        );

    if (!modal) {
        return;
    }

    /* Evita reconstruir el reporte más de una vez. */
    if (
        modal.querySelector(
            ".reporte-dashboard-final"
        )
    ) {
        return;
    }

    const contenido =
        modal.querySelector(
            ".modal-contenido"
        );

    if (!contenido) {
        return;
    }

    contenido.classList.add(
        "modal-dashboard",
        "reporte-social"
    );

    contenido.innerHTML = `
        <div class="reporte-dashboard-final">

            <!-- Título principal -->
            <header class="reporte-cabecera-simple">

                <h2>
                    Inteligencia social
                </h2>

                <button
                    type="button"
                    class="cerrar-modal cerrar-reporte-social"
                    aria-label="Cerrar">
                    ×
                </button>
            </header>


            <!-- =========================================
                 PARTE SUPERIOR
            ========================================== -->
            <section class="reporte-superior">

                <!-- Indicadores -->
                <div class="reporte-metricas">

                    <article class="metrica-dashboard metrica-verde">

                        <span>
                            Donaciones
                        </span>

                        <div class="metrica-contenido">

                            <strong id="intelTotalDonaciones">
                                0
                            </strong>

                            <div class="mini-barras">
                                <i></i>
                                <i></i>
                                <i></i>
                                <i></i>
                            </div>

                        </div>

                        <small>
                            Ofertas registradas
                        </small>

                    </article>


                    <article class="metrica-dashboard metrica-roja">

                        <span>
                            Solicitudes
                        </span>

                        <div class="metrica-contenido">

                            <strong id="intelTotalSolicitudes">
                                0
                            </strong>

                            <div class="mini-barras">
                                <i></i>
                                <i></i>
                                <i></i>
                                <i></i>
                            </div>

                        </div>

                        <small>
                            Demanda activa
                        </small>

                    </article>


                    <article class="metrica-dashboard metrica-azul">

                        <span>
                            Zonas
                        </span>

                        <div class="metrica-contenido">

                            <strong id="intelTotalZonas">
                                0
                            </strong>

                            <div class="mini-barras">
                                <i></i>
                                <i></i>
                                <i></i>
                                <i></i>
                            </div>

                        </div>

                        <small>
                            Analizadas
                        </small>

                    </article>


                    <article class="metrica-dashboard metrica-amarilla">

                        <span>
                            Déficit máximo
                        </span>

                        <div class="metrica-contenido">

                            <strong id="intelDeficitMaximo">
                                0
                            </strong>

                            <div class="mini-barras">
                                <i></i>
                                <i></i>
                                <i></i>
                                <i></i>
                            </div>

                        </div>

                        <small>
                            Solicitudes - donaciones
                        </small>

                    </article>

                </div>


                <!-- Distribución territorial -->
                <article class="distribucion-panel">

                    <h3>
                        Distribución territorial
                    </h3>

                    <div class="distribucion-contenido">

                        <div
                            id="intelGraficoTerritorial"
                            class="grafico-dona">

                            <div class="grafico-centro">

                                <strong id="intelGraficoTotal">
                                    0
                                </strong>

                                <span>
                                    Zonas<br>
                                    analizadas
                                </span>

                            </div>

                        </div>


                        <div
                            id="intelDistribucionLeyenda"
                            class="distribucion-leyenda">
                        </div>

                    </div>

                </article>

            </section>


            <!-- =========================================
                 PARTE MEDIA
            ========================================== -->
            <section class="reporte-medio">

                <!-- Sin barras horizontales:
                     muestra cantidades por zona. -->
                <article class="balance-panel">

                    <h3>
                        Donaciones vs. solicitudes
                    </h3>

                    <div
                        id="intelBalanceLista"
                        class="balance-zonas">
                    </div>

                </article>


                <article class="prioridad-panel">

                    <h3>
                        Zona prioritaria
                    </h3>

                    <div class="prioridad-contenido">

                        <small>
                            Mayor necesidad detectada
                        </small>

                        <strong id="intelZonaPrioritaria">
                            -
                        </strong>

                        <p id="intelZonaResumen">
                            Sin datos para analizar.
                        </p>

                    </div>

                </article>

            </section>


            <!-- =========================================
                 RESUMEN TERRITORIAL
            ========================================== -->
            <article class="resumen-panel">

                <h3>
                    Resumen territorial
                </h3>

                <div class="tabla-reporte-wrap">

                    <table class="tabla-reporte">

                        <thead>
                            <tr>
                                <th>Zona</th>
                                <th>Donaciones</th>
                                <th>Solicitudes</th>
                                <th>Balance</th>
                                <th>Estado</th>
                            </tr>
                        </thead>

                        <tbody id="intelTablaBody">
                        </tbody>

                    </table>

                </div>

            </article>

        </div>
    `;

    /*
       Como el botón se genera dinámicamente,
       agregamos aquí su evento de cierre.
    */
    contenido
        .querySelector(
            ".cerrar-reporte-social"
        )
        ?.addEventListener(
            "click",
            () => {
                modal.classList.remove(
                    "activo"
                );
            }
        );


    /*
       Volver atrás: cierra Inteligencia social y
       muestra nuevamente el desplegable ODS abierto.
    */
    contenido
        .querySelector(
            ".volver-social"
        )
        ?.addEventListener(
            "click",
            (evento) => {

                // Evita que el clic cierre el menú ODS inmediatamente.
                evento.stopPropagation();

                modal.classList.remove(
                    "activo"
                );

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

                // Se abre al terminar el clic para que quede visible.
                setTimeout(
                    () => {
                        odsDropdown
                            ?.classList
                            .add(
                                "activo"
                            );
                    },
                    0
                );
            }
        );
}


/* Renderiza el dashboard territorial con los datos actuales. */
function renderizarInteligenciaSocial() {

    /* Garantiza que la estructura visual exista. */
    prepararDashboardInteligenciaSocial();


    const datos =
        obtenerDatosInteligenciaSocial();


    const totalDonacionesEl =
        obtenerElemento(
            "intelTotalDonaciones"
        );

    const totalSolicitudesEl =
        obtenerElemento(
            "intelTotalSolicitudes"
        );

    const totalZonasEl =
        obtenerElemento(
            "intelTotalZonas"
        );

    const deficitMaximoEl =
        obtenerElemento(
            "intelDeficitMaximo"
        );

    const balanceLista =
        obtenerElemento(
            "intelBalanceLista"
        );

    const zonaPrioritariaEl =
        obtenerElemento(
            "intelZonaPrioritaria"
        );

    const zonaResumenEl =
        obtenerElemento(
            "intelZonaResumen"
        );

    const tablaBody =
        obtenerElemento(
            "intelTablaBody"
        );

    const grafico =
        obtenerElemento(
            "intelGraficoTerritorial"
        );

    const graficoTotal =
        obtenerElemento(
            "intelGraficoTotal"
        );

    const leyenda =
        obtenerElemento(
            "intelDistribucionLeyenda"
        );


    /*
       Si por alguna razón el modal todavía
       no está disponible, no se intenta renderizar.
    */
    if (
        !totalDonacionesEl
        ||
        !totalSolicitudesEl
        ||
        !totalZonasEl
        ||
        !deficitMaximoEl
        ||
        !balanceLista
        ||
        !zonaPrioritariaEl
        ||
        !zonaResumenEl
        ||
        !tablaBody
    ) {
        return;
    }


    /* =============================================
       SIN DATOS
    ============================================= */

    if (
        datos.length === 0
    ) {

        totalDonacionesEl.textContent =
            "0";

        totalSolicitudesEl.textContent =
            "0";

        totalZonasEl.textContent =
            "0";

        deficitMaximoEl.textContent =
            "0";


        if (graficoTotal) {
            graficoTotal.textContent =
                "0";
        }


        if (grafico) {
            grafico.style.background =
                "#4b5160";
        }


        if (leyenda) {
            leyenda.innerHTML =
                "";
        }


        balanceLista.innerHTML = `
            <div class="sin-donaciones">
                Todavía no hay datos territoriales suficientes.
            </div>
        `;


        zonaPrioritariaEl.textContent =
            "Sin datos";


        zonaResumenEl.textContent =
            "Registrá donaciones, reservas y retiros para generar el análisis territorial.";


        tablaBody.innerHTML =
            "";


        return;
    }


    /* =============================================
       CÁLCULOS GENERALES
    ============================================= */

    const datosCalculados =
        datos
            .map(
                (item) => ({
                    ...item,

                    balance:
                        item.donaciones -
                        item.solicitudes
                })
            )
            .sort(
                (a, b) =>
                    b.solicitudes -
                    a.solicitudes
                    ||
                    b.retiros -
                    a.retiros
            );


    const totalDonaciones =
        datosCalculados.reduce(
            (total, item) =>
                total +
                item.donaciones,
            0
        );


    const totalSolicitudes =
        datosCalculados.reduce(
            (total, item) =>
                total +
                item.solicitudes,
            0
        );


    const deficitMaximo =
        Math.max(
            0,

            ...datosCalculados.map(
                (item) =>
                    item.solicitudes -
                    item.donaciones
            )
        );


    totalDonacionesEl.textContent =
        totalDonaciones;

    totalSolicitudesEl.textContent =
        totalSolicitudes;

    totalZonasEl.textContent =
        datosCalculados.length;

    deficitMaximoEl.textContent =
        deficitMaximo;


    if (graficoTotal) {
        graficoTotal.textContent =
            datosCalculados.length;
    }


    /* =============================================
       DONACIONES VS. SOLICITUDES
       Sin líneas/barras horizontales.
    ============================================= */

    balanceLista.innerHTML =
        datosCalculados
            .map(
                (item) => `
                    <article class="balance-zona">

                        <h4>
                            ${escaparHTML(item.zona)}
                        </h4>

                        <div class="balance-numeros">

                            <div class="balance-dato">

                                <strong>
                                    ${item.donaciones}
                                </strong>

                                <span>
                                    Donaciones
                                </span>

                            </div>


                            <div class="balance-dato">

                                <strong>
                                    ${item.solicitudes}
                                </strong>

                                <span>
                                    Solicitudes
                                </span>

                            </div>

                        </div>

                    </article>
                `
            )
            .join("");


    /* =============================================
       DISTRIBUCIÓN TERRITORIAL
    ============================================= */

    const totalActividad =
        datosCalculados.reduce(
            (total, item) =>
                total +
                item.donaciones +
                item.solicitudes,
            0
        );


    /*
       Colores del gráfico.
       Mantienen el aspecto del diseño aprobado.
    */
    const colores = [
        "#37cfba",
        "#8781df",
        "#44a9e9",
        "#edb42a",
        "#ef6b68"
    ];


    let gradosAcumulados =
        0;

    const segmentos =
        [];


    datosCalculados.forEach(
        (item, indice) => {

            const actividad =
                item.donaciones +
                item.solicitudes;


            const porcentaje =
                totalActividad > 0
                    ? (
                        actividad /
                        totalActividad
                    ) * 100
                    : (
                        100 /
                        datosCalculados.length
                    );


            const grados =
                porcentaje *
                3.6;


            segmentos.push(
                `${colores[
                    indice %
                    colores.length
                ]} ${gradosAcumulados}deg ${gradosAcumulados + grados}deg`
            );


            gradosAcumulados +=
                grados;
        }
    );


    if (
        grafico
        &&
        segmentos.length > 0
    ) {
        grafico.style.background =
            `conic-gradient(${segmentos.join(", ")})`;
    }


    if (leyenda) {

        leyenda.innerHTML =
            datosCalculados
                .map(
                    (item, indice) => {

                        const actividad =
                            item.donaciones +
                            item.solicitudes;


                        const porcentaje =
                            totalActividad > 0
                                ? Math.round(
                                    (
                                        actividad /
                                        totalActividad
                                    ) * 100
                                )
                                : Math.round(
                                    100 /
                                    datosCalculados.length
                                );


                        const color =
                            colores[
                                indice %
                                colores.length
                            ];


                        return `
                            <div class="distribucion-item">

                                <span
                                    class="distribucion-color"
                                    style="background:${color};">
                                </span>


                                <div class="distribucion-info">

                                    <strong>
                                        ${escaparHTML(item.zona)}
                                    </strong>

                                    <span
                                        style="color:${color};">

                                        ${porcentaje}%

                                    </span>

                                </div>

                            </div>
                        `;
                    }
                )
                .join("");
    }


    /* =============================================
       ZONA PRIORITARIA
    ============================================= */

    const zonasConDemanda =
        datosCalculados.filter(
            (item) =>
                item.solicitudes > 0
        );


    let zonaPrioritaria =
        null;


    if (
        zonasConDemanda.length > 0
    ) {

        zonaPrioritaria =
            zonasConDemanda
                .slice()
                .sort(
                    (a, b) => {

                        const deficitA =
                            a.solicitudes -
                            a.donaciones;

                        const deficitB =
                            b.solicitudes -
                            b.donaciones;


                        return (
                            deficitB -
                            deficitA
                            ||
                            b.retiros -
                            a.retiros
                        );
                    }
                )[0];

    } else {

        /* Si no hay solicitudes, usa la zona con más donaciones. */
        zonaPrioritaria =
            datosCalculados
                .slice()
                .sort(
                    (a, b) =>
                        b.donaciones -
                        a.donaciones
                )[0];
    }


    if (zonaPrioritaria) {

        zonaPrioritariaEl.textContent =
            zonaPrioritaria.zona;


        const deficit =
            zonaPrioritaria.solicitudes -
            zonaPrioritaria.donaciones;


        if (
            zonaPrioritaria.solicitudes > 0
        ) {

            zonaResumenEl.textContent =
                `${zonaPrioritaria.zona} registra ${zonaPrioritaria.solicitudes} solicitud(es), `
                +
                `${zonaPrioritaria.donaciones} donación(es) y `
                +
                `${zonaPrioritaria.retiros} retiro(s) confirmado(s). `
                +
                (
                    deficit > 0
                        ? `Presenta un déficit de ${deficit}, por lo que requiere mayor atención.`
                        : "Actualmente presenta cobertura suficiente."
                );

        } else {

            zonaResumenEl.textContent =
                `${zonaPrioritaria.zona} todavía no registra solicitudes, `
                +
                `pero concentra ${zonaPrioritaria.donaciones} donación(es).`;
        }
    }


    /* =============================================
       RESUMEN TERRITORIAL
    ============================================= */

    tablaBody.innerHTML =
        datosCalculados
            .map(
                (item) => {

                    const estado =
                        obtenerEstadoZonaInteligencia(
                            item
                        );


                    return `
                        <tr>

                            <td>
                                ${escaparHTML(item.zona)}
                            </td>

                            <td>
                                ${item.donaciones}
                            </td>

                            <td>
                                ${item.solicitudes}
                            </td>

                            <td>
                                ${item.balance}
                            </td>

                            <td>

                                <span
                                    class="estado-reporte ${estado.clase}">

                                    ${escaparHTML(
                                        estado.texto
                                    )}

                                </span>

                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   MODALES PRINCIPALES
========================================================= */

document
    .querySelectorAll(
        "[data-modal]"
    )
    .forEach(
        (boton) => {
            boton.addEventListener(
                "click",
                () => {
                    const idModal =
                        boton.dataset.modal;

                    const modal =
                        obtenerElemento(
                            idModal
                        );

                    if (!modal) {
                        return;
                    }

                    if (
                        idModal ===
                        "modalInstitucional"
                    ) {
                        mostrarInstituciones();
                    }

                    if (
                        idModal ===
                        "modalTerritorial"
                    ) {
                        mostrarComedores();
                    }


                    /* Actualiza el reporte al abrir Inteligencia social. */
                    if (
                        idModal ===
                        "modalSocial"
                    ) {
                        renderizarInteligenciaSocial();
                    }


                    modal.classList.add(
                        "activo"
                    );
                }
            );
        }
    );


/* Botones X de modales principales. */
document
    .querySelectorAll(
        ".cerrar-modal"
    )
    .forEach(
        (boton) => {
            boton.addEventListener(
                "click",
                () => {
                    boton
                        .closest(".modal")
                        ?.classList
                        .remove("activo");
                }
            );
        }
    );


/* Fondo oscuro de modales principales. */
document
    .querySelectorAll(
        ".modal-fondo"
    )
    .forEach(
        (fondo) => {
            fondo.addEventListener(
                "click",
                () => {
                    fondo
                        .closest(".modal")
                        ?.classList
                        .remove("activo");
                }
            );
        }
    );


/* Buscador de comedores. */
const buscadorComedores =
    obtenerElemento(
        "buscarComedor"
    );

buscadorComedores?.addEventListener(
    "input",
    (evento) => {
        mostrarComedores(
            evento.target.value
        );
    }
);


/* =========================================================
   MODO CLARO / OSCURO
========================================================= */

const botonTema =
    obtenerElemento(
        "themeToggle"
    );

/* Aplica el tema guardado al cargar la página. */
const temaGuardado =
    localStorage.getItem("rescatepy_tema");

if (temaGuardado === "oscuro") {
    document.body.classList.add("modo-oscuro");
}

if (botonTema) {
    botonTema.textContent =
        document.body.classList.contains("modo-oscuro")
            ? "☀"
            : "☾";
}

botonTema?.addEventListener(
    "click",
    () => {
        /* Cambia entre modo claro y oscuro. */
        document.body.classList.toggle("modo-oscuro");

        const oscuro =
            document.body.classList.contains("modo-oscuro");

        botonTema.textContent =
            oscuro ? "☀" : "☾";

        /* Guarda la preferencia del usuario. */
        localStorage.setItem(
            "rescatepy_tema",
            oscuro ? "oscuro" : "claro"
        );
    }
);


/* =========================================================
   3. MENÚ ODS
========================================================= */

const odsMenuBtn =
    obtenerElemento(
        "odsMenuBtn"
    );

const odsDropdown =
    obtenerElemento(
        "odsDropdown"
    );

if (
    odsMenuBtn &&
    odsDropdown
) {
    odsMenuBtn.addEventListener(
        "click",
        (evento) => {
            evento.stopPropagation();

            odsDropdown
                .classList
                .toggle(
                    "activo"
                );
        }
    );

    odsDropdown.addEventListener(
        "click",
        (evento) => {
            evento.stopPropagation();
        }
    );

    document.addEventListener(
        "click",
        () => {
            odsDropdown
                .classList
                .remove(
                    "activo"
                );
        }
    );
}


/* =========================================================
   4. DONACIONES DE ALIMENTOS
========================================================= */

const DONATIONS_KEY =
    "alimentapy_donaciones";


function obtenerDonaciones() {
    return leerArregloLocal(
        DONATIONS_KEY
    );
}


function guardarDonaciones(
    donaciones
) {
    guardarArregloLocal(
        DONATIONS_KEY,
        donaciones
    );
}


/* Genera un ID simple para el prototipo. */
function generarIdDonacion() {
    return (
        "DON-" +
        Date.now() +
        "-" +
        Math.floor(
            Math.random() * 1000
        )
    );
}


/* null = nueva / ID = edición. */
let donacionEnEdicion =
    null;


/* =========================================================
   MODAL QUIERO DONAR
========================================================= */

const donationModal =
    obtenerElemento(
        "donationModal"
    );

const abrirDonacionBtn =
    obtenerElemento(
        "abrirDonacionBtn"
    );

const cerrarDonacionBtn =
    obtenerElemento(
        "cerrarDonacionBtn"
    );

const donationBackdrop =
    obtenerElemento(
        "donationBackdrop"
    );

const donationForm =
    obtenerElemento(
        "donationForm"
    );

const validationResult =
    obtenerElemento(
        "validationResult"
    );


/* Abre formulario para una nueva donación. */
abrirDonacionBtn?.addEventListener(
    "click",
    () => {
        // Para publicar una donación es obligatorio iniciar sesión.
        if (!window.RescateAuth?.requireAuth()) {
            return;
        }

        odsDropdown
            ?.classList
            .remove(
                "activo"
            );

        donacionEnEdicion =
            null;

        donationForm?.reset();

        if (validationResult) {
            validationResult.className =
                "resultado-validacion campo-oculto";

            validationResult.innerHTML =
                "";
        }

        const botonGuardar =
            donationForm
                ?.querySelector(
                    ".ejecutar-validacion"
                );

        if (botonGuardar) {
            botonGuardar.textContent =
                "Registrar donación";
        }

        donationModal
            ?.classList
            .add(
                "activo"
            );
    }
);


function cerrarModalDonacion() {
    donationModal
        ?.classList
        .remove(
            "activo"
        );
}


cerrarDonacionBtn?.addEventListener(
    "click",
    cerrarModalDonacion
);


donationBackdrop?.addEventListener(
    "click",
    cerrarModalDonacion
);


/* =========================================================
   CAMPOS DINÁMICOS DE ALIMENTOS
========================================================= */

const foodType =
    obtenerElemento(
        "foodType"
    );

const requiresCold =
    obtenerElemento(
        "requiresCold"
    );

const expiryGroup =
    obtenerElemento(
        "expiryGroup"
    );

const coldChainGroup =
    obtenerElemento(
        "coldChainGroup"
    );

const preparedGroup =
    obtenerElemento(
        "preparedGroup"
    );


function actualizarFormularioDonacion() {
    if (
        !foodType ||
        !requiresCold
    ) {
        return;
    }

    const tipo =
        foodType.value;

    const requiereFrio =
        requiresCold.value;

    expiryGroup
        ?.classList
        .toggle(
            "campo-oculto",
            tipo !== "dated"
        );

    preparedGroup
        ?.classList
        .toggle(
            "campo-oculto",
            tipo !== "prepared"
        );

    coldChainGroup
        ?.classList
        .toggle(
            "campo-oculto",
            requiereFrio !== "yes"
        );
}


foodType?.addEventListener(
    "change",
    actualizarFormularioDonacion
);


requiresCold?.addEventListener(
    "change",
    actualizarFormularioDonacion
);


/* Días entre hoy y vencimiento. */
function diasHastaVencimiento(
    fecha
) {
    if (!fecha) {
        return null;
    }

    const hoy =
        new Date();

    hoy.setHours(
        0,
        0,
        0,
        0
    );

    const vencimiento =
        new Date(
            fecha +
            "T00:00:00"
        );

    return Math.ceil(
        (
            vencimiento -
            hoy
        )
        /
        86400000
    );
}


/* =========================================================
   VALIDAR / CREAR / EDITAR ALIMENTO
========================================================= */

donationForm?.addEventListener(
    "submit",
    async (evento) => {
        evento.preventDefault();

        // El backend necesita saber quién publica o modifica.
        if (!window.RescateAuth?.requireAuth()) {
            return;
        }

        const tipo =
            foodType?.value || "";

        const estado =
            obtenerElemento(
                "foodCondition"
            )?.value || "";

        const higiene =
            obtenerElemento(
                "hygiene"
            )?.value || "";

        const requiereFrio =
            requiresCold?.value ===
            "yes";

        const cadenaFrio =
            obtenerElemento(
                "coldChain"
            )?.value || "";

        const vencimiento =
            obtenerElemento(
                "expiryDate"
            )?.value || "";

        const conservacionPreparada =
            obtenerElemento(
                "preparedStorage"
            )?.value || "";

        const errores = [];

        const observaciones = [];

        const fundamentos =
            new Set();


        /* Deterioro o contaminación. */
        if (
            estado ===
            "deteriorated"
            ||
            estado ===
            "contaminated"
        ) {
            errores.push(
                "El alimento presenta deterioro, alteración o posible contaminación."
            );

            fundamentos.add(
                "Código Sanitario - Ley 836/1980, art. 157."
            );
        }


        /* Higiene no garantizada. */
        if (
            higiene === "no"
        ) {
            errores.push(
                "No se puede garantizar una manipulación higiénica adecuada."
            );

            fundamentos.add(
                "Ley 6601/2020 y Código Sanitario."
            );
        }


        /* Cadena de frío. */
        if (
            requiereFrio
            &&
            cadenaFrio === "no"
        ) {
            errores.push(
                "El alimento requiere refrigeración pero la cadena de frío no está garantizada."
            );

            fundamentos.add(
                "Código Sanitario - condiciones de conservación."
            );
        }


        /* Producto con fecha. */
        if (
            tipo === "dated"
        ) {
            if (!vencimiento) {
                errores.push(
                    "Debe registrar la fecha de vencimiento."
                );
            } else {
                const dias =
                    diasHastaVencimiento(
                        vencimiento
                    );

                if (
                    dias <= 0
                ) {
                    errores.push(
                        "El producto está vencido."
                    );

                    fundamentos.add(
                        "Ley 6601/2020."
                    );
                } else if (
                    dias <= 3
                ) {
                    observaciones.push(
                        "Producto próximo a vencer: requiere distribución prioritaria."
                    );

                    fundamentos.add(
                        "Ley 6601/2020."
                    );
                }
            }
        }


        /* Alimento fresco. */
        if (
            tipo === "fresh"
            &&
            errores.length === 0
        ) {
            observaciones.push(
                "Alimento fresco: la decisión se basa en estado, higiene y conservación."
            );

            fundamentos.add(
                "Ley 6601/2020, art. 2; Código Sanitario, art. 157."
            );
        }


        /* Comida preparada. */
        if (
            tipo === "prepared"
            &&
            conservacionPreparada ===
            "unknown"
        ) {
            errores.push(
                "No puede comprobarse una conservación adecuada de la comida preparada."
            );

            fundamentos.add(
                "Código Sanitario."
            );
        }


        validationResult
            ?.classList
            .remove(
                "campo-oculto",
                "aceptado",
                "rechazado",
                "revision"
            );


        /* Rechazada: no guardar. */
        if (
            errores.length > 0
        ) {
            if (!validationResult) {
                return;
            }

            validationResult
                .classList
                .add(
                    "rechazado"
                );

            validationResult.innerHTML = `
                <h3>Donación rechazada</h3>

                <p>
                    El alimento no puede continuar
                    con los datos registrados.
                </p>

                <strong>Motivos:</strong>

                <ul>
                    ${errores
                        .map(
                            (error) =>
                                `<li>${escaparHTML(error)}</li>`
                        )
                        .join("")
                    }
                </ul>

                <strong>Fundamento aplicado:</strong>

                <ul>
                    ${[...fundamentos]
                        .map(
                            (fundamento) =>
                                `<li>${escaparHTML(fundamento)}</li>`
                        )
                        .join("")
                    }
                </ul>
            `;

            validationResult.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });

            return;
        }


        const donorType =
            obtenerElemento(
                "donorType"
            )?.value || "Otro";

        const donorName =
            obtenerElemento(
                "donorName"
            )?.value.trim() || "";

        const food =
            obtenerElemento(
                "foodName"
            )?.value.trim() || "";

        const quantity =
            Number(
                obtenerElemento(
                    "foodQuantity"
                )?.value || 0
            );

        const unit =
            obtenerElemento(
                "foodUnit"
            )?.value || "kg";

        const city =
            obtenerElemento(
                "donationCity"
            )?.value.trim() || "";

        const address =
            obtenerElemento(
                "pickupAddress"
            )?.value.trim() || "";

        const notes =
            obtenerElemento(
                "foodNotes"
            )?.value.trim() || "";


        if (
            !donorName
            ||
            !food
            ||
            quantity <= 0
            ||
            !city
            ||
            !address
        ) {
            if (!validationResult) {
                return;
            }

            validationResult
                .classList
                .add(
                    "rechazado"
                );

            validationResult.innerHTML = `
                <h3>
                    Faltan datos de la donación
                </h3>

                <p>
                    Completá el donante, alimento,
                    cantidad, ciudad y lugar de retiro.
                </p>
            `;

            return;
        }


        const datosDonacion = {
            donorType,
            donorName,
            food,
            quantity,
            unit,
            city,
            address,
            foodType: tipo,
            foodCondition: estado,
            hygiene: higiene,
            requiresCold: requiereFrio,
            coldChain: cadenaFrio,
            expiryDate: vencimiento,
            preparedStorage:
                conservacionPreparada,
            notes
        };


        const donaciones =
            obtenerDonaciones();

        const esEdicion =
            donacionEnEdicion !== null;

        try {
            if (esEdicion) {
                // El backend valida que la donación pertenezca al usuario conectado.
                const guardada =
                    await window.RescateAuth.api(
                        `/donaciones/${donacionEnEdicion}`,
                        {
                            method: "PUT",
                            body: JSON.stringify(datosDonacion)
                        }
                    );

                const indice =
                    donaciones.findIndex(
                        (item) =>
                            String(item.id) ===
                            String(donacionEnEdicion)
                    );

                if (indice >= 0) {
                    donaciones[indice] =
                        guardada;
                }
            } else {
                // El usuario autenticado queda registrado como propietario.
                const nuevaDonacion =
                    await window.RescateAuth.api(
                        "/donaciones",
                        {
                            method: "POST",
                            body: JSON.stringify(datosDonacion)
                        }
                    );

                donaciones.push(
                    nuevaDonacion
                );
            }

            // LocalStorage queda como caché para reutilizar el render existente.
            guardarDonaciones(
                donaciones
            );
        } catch (error) {
            if (validationResult) {
                validationResult.classList.add("rechazado");
                validationResult.innerHTML = `
                    <h3>No se pudo guardar</h3>
                    <p>${escaparHTML(error.message)}</p>
                `;
            }
            return;
        }


        if (validationResult) {
            const titulo =
                esEdicion
                    ? "Donación actualizada"
                    : "Donación registrada";

            validationResult
                .classList
                .add(
                    observaciones.length > 0
                        ? "revision"
                        : "aceptado"
                );

            validationResult.innerHTML = `
                <h3>
                    ${titulo}
                </h3>

                <p>
                    ${
                        esEdicion
                            ? "Los cambios fueron guardados correctamente."
                            : "La donación quedó publicada como <strong>ACTIVA</strong>."
                    }
                </p>

                ${
                    observaciones.length > 0
                        ? `
                            <strong>Observaciones:</strong>

                            <ul>
                                ${observaciones
                                    .map(
                                        (texto) =>
                                            `<li>${escaparHTML(texto)}</li>`
                                    )
                                    .join("")
                                }
                            </ul>

                            <strong>Fundamento aplicado:</strong>

                            <ul>
                                ${[...fundamentos]
                                    .map(
                                        (texto) =>
                                            `<li>${escaparHTML(texto)}</li>`
                                    )
                                    .join("")
                                }
                            </ul>
                        `
                        : ""
                }
            `;

            validationResult.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
        }


        donacionEnEdicion =
            null;

        const botonGuardar =
            donationForm
                .querySelector(
                    ".ejecutar-validacion"
                );

        if (botonGuardar) {
            botonGuardar.textContent =
                "Registrar donación";
        }

        mostrarDonaciones();
        window.RescateAuth?.refreshNotifications?.();

        /* Actualiza métricas territoriales. */
        renderizarInteligenciaSocial();
    }
);


/* Reset del formulario. */
donationForm?.addEventListener(
    "reset",
    () => {
        setTimeout(
            () => {
                actualizarFormularioDonacion();

                donacionEnEdicion =
                    null;

                if (validationResult) {
                    validationResult.className =
                        "resultado-validacion campo-oculto";

                    validationResult.innerHTML =
                        "";
                }

                const boton =
                    donationForm
                        .querySelector(
                            ".ejecutar-validacion"
                        );

                if (boton) {
                    boton.textContent =
                        "Registrar donación";
                }
            },
            0
        );
    }
);


/* =========================================================
   5. ALIMENTOS DISPONIBLES
========================================================= */

const abrirDisponiblesBtn =
    obtenerElemento(
        "abrirDisponiblesBtn"
    );

const availableModal =
    obtenerElemento(
        "availableModal"
    );

const availableBackdrop =
    obtenerElemento(
        "availableBackdrop"
    );

const cerrarDisponiblesBtn =
    obtenerElemento(
        "cerrarDisponiblesBtn"
    );

const availableDonations =
    obtenerElemento(
        "availableDonations"
    );

let filtroActual =
    "TODAS";


function claseEstadoDonacion(
    estado
) {
    if (
        estado === "RESERVADA"
    ) {
        return "estado-reservada";
    }

    if (
        estado === "RETIRADA"
        ||
        estado === "CANCELADA"
    ) {
        return "estado-retirada";
    }

    return "estado-activa";
}


/* Crea una tarjeta de alimento. */
function crearTarjetaDonacion(
    donacion
) {
    const tarjeta =
        document.createElement(
            "article"
        );

    tarjeta.className =
        "donacion-publicada";


    // Solo el autor de la publicación puede editar, eliminar o confirmar retiro.
    const usuarioActual =
        window.RescateAuth?.getUser?.();

    const esPropietario =
        Boolean(usuarioActual)
        &&
        Number(donacion.ownerId) ===
        Number(usuarioActual.id);


    const receptorHTML =
        donacion.receiver
            ? `
                <div class="donacion-receptor">
                    <span>
                        Receptor
                    </span>

                    <strong>
                        ${escaparHTML(donacion.receiver.name)}
                    </strong>

                    <p>
                        ${escaparHTML(donacion.receiver.type)}
                        ·
                        ${escaparHTML(donacion.receiver.city)}
                    </p>

                    ${
                        donacion.receiver.responsible
                            ? `
                                <p>
                                    <strong>Responsable:</strong>
                                    ${escaparHTML(donacion.receiver.responsible)}
                                </p>
                            `
                            : ""
                    }
                </div>
            `
            : "";


    tarjeta.innerHTML = `
        <div class="donacion-superior">

            <div>
                <span class="donacion-donante">
                    ${escaparHTML(donacion.donorType)}
                </span>

                <h3>
                    ${escaparHTML(donacion.food)}
                </h3>

                <div class="donacion-cantidad">
                    ${escaparHTML(donacion.quantity)}
                    ${escaparHTML(donacion.unit)}
                </div>
            </div>

            <span
                class="
                    estado-donacion
                    ${claseEstadoDonacion(donacion.status)}
                ">
                ${escaparHTML(donacion.status)}
            </span>

        </div>


        <div class="donacion-detalles">

            <p>
                <strong>Donante:</strong>
                ${escaparHTML(donacion.donorName)}
            </p>

            <p>
                <strong>Ubicación:</strong>
                ${escaparHTML(donacion.city)}
            </p>

            <p>
                <strong>Retiro:</strong>
                ${escaparHTML(donacion.address)}
            </p>

            <p>
                <strong>Publicada:</strong>
                ${formatearFecha(donacion.publishedAt)}
            </p>

            ${
                donacion.updatedAt
                    ? `
                        <p>
                            <strong>Última modificación:</strong>
                            ${formatearFecha(donacion.updatedAt)}
                        </p>
                    `
                    : ""
            }

            ${
                donacion.reservedAt
                    ? `
                        <p>
                            <strong>Reservada:</strong>
                            ${formatearFecha(donacion.reservedAt)}
                        </p>
                    `
                    : ""
            }

            ${
                donacion.withdrawnAt
                    ? `
                        <p>
                            <strong>Retirada:</strong>
                            ${formatearFecha(donacion.withdrawnAt)}
                        </p>
                    `
                    : ""
            }

        </div>

        ${receptorHTML}

        <div class="acciones-donacion">
        </div>
    `;


    const acciones =
        tarjeta.querySelector(
            ".acciones-donacion"
        );


    if (
        donacion.status ===
        "ACTIVA"
        &&
        !esPropietario
    ) {
        const solicitar =
            document.createElement(
                "button"
            );

        solicitar.type =
            "button";

        solicitar.className =
            "accion-donacion";

        solicitar.textContent =
            "Solicitar donación";

        solicitar.addEventListener(
            "click",
            () => {
                abrirReserva(
                    donacion.id
                );
            }
        );

        acciones.appendChild(
            solicitar
        );


        const mapa =
            document.createElement(
                "button"
            );

        mapa.type =
            "button";

        mapa.className =
            "accion-donacion secundaria";

        mapa.textContent =
            "Ver ubicación";

        mapa.addEventListener(
            "click",
            () => {
                abrirMapa(
                    donacion.address,
                    donacion.city
                );
            }
        );

        acciones.appendChild(
            mapa
        );



    }


    if (
        donacion.status ===
        "RESERVADA"
        &&
        esPropietario
    ) {
        const retiro =
            document.createElement(
                "button"
            );

        retiro.type =
            "button";

        retiro.className =
            "accion-donacion";

        retiro.textContent =
            "Confirmar retiro";

        retiro.addEventListener(
            "click",
            () => {
                confirmarRetiro(
                    donacion.id
                );
            }
        );

        acciones.appendChild(
            retiro
        );


        const mapa =
            document.createElement(
                "button"
            );

        mapa.type =
            "button";

        mapa.className =
            "accion-donacion secundaria";

        mapa.textContent =
            "Ver ubicación";

        mapa.addEventListener(
            "click",
            () => {
                abrirMapa(
                    donacion.address,
                    donacion.city
                );
            }
        );

        acciones.appendChild(
            mapa
        );
    }


    /*
       El botón Editar aparece únicamente
       cuando estamos en el filtro "Todas".
    */
    if (
        filtroActual === "TODAS"
        &&
        donacion.status !== "CANCELADA"
    ) {
        const editar =
            document.createElement(
                "button"
            );

        editar.type =
            "button";

        editar.className =
            "accion-donacion secundaria";

        editar.textContent =
            "Editar";

        editar.addEventListener(
            "click",
            () => {
                editarDonacion(
                    donacion.id
                );
            }
        );

        acciones.appendChild(
            editar
        );
    }


    /*
       El botón Eliminar conserva
       el comportamiento que ya tenía.
    */
    if (
        esPropietario
        &&
        donacion.status !==
        "CANCELADA"
    ) {
        const eliminar =
            document.createElement(
                "button"
            );

        eliminar.type =
            "button";

        eliminar.className =
            "accion-donacion boton-eliminar";

        eliminar.textContent =
            "Eliminar";

        eliminar.addEventListener(
            "click",
            () => {
                cancelarDonacion(
                    donacion.id
                );
            }
        );

        acciones.appendChild(
            eliminar
        );
    }


    return tarjeta;
}


/* Edita una publicación activa. */
function editarDonacion(id) {
    // Además del backend, el frontend evita abrir ediciones ajenas.
    if (!window.RescateAuth?.requireAuth()) {
        return;
    }

    const donaciones =
        obtenerDonaciones();

    const donacion =
        donaciones.find(
            (item) =>
                item.id === id
        );

    if (
        !donacion
        ||
        donacion.status ===
        "CANCELADA"
    ) {
        alert(
            "Esta publicación ya fue eliminada y no puede modificarse."
        );

        return;
    }

    donacionEnEdicion =
        donacion.id;

    obtenerElemento("donorType").value =
        donacion.donorType || "Otro";

    obtenerElemento("donorName").value =
        donacion.donorName || "";

    obtenerElemento("foodName").value =
        donacion.food || "";

    obtenerElemento("foodQuantity").value =
        donacion.quantity ?? "";

    obtenerElemento("foodUnit").value =
        donacion.unit || "kg";

    obtenerElemento("donationCity").value =
        donacion.city || "";

    obtenerElemento("pickupAddress").value =
        donacion.address || "";

    obtenerElemento("foodType").value =
        donacion.foodType || "fresh";

    obtenerElemento("foodCondition").value =
        donacion.foodCondition || "good";

    obtenerElemento("hygiene").value =
        donacion.hygiene || "yes";

    obtenerElemento("requiresCold").value =
        donacion.requiresCold
            ? "yes"
            : "no";

    obtenerElemento("coldChain").value =
        donacion.coldChain || "yes";

    obtenerElemento("expiryDate").value =
        donacion.expiryDate || "";

    obtenerElemento("preparedStorage").value =
        donacion.preparedStorage ||
        "controlled";

    obtenerElemento("foodNotes").value =
        donacion.notes || "";

    actualizarFormularioDonacion();

    if (validationResult) {
        validationResult.className =
            "resultado-validacion campo-oculto";

        validationResult.innerHTML =
            "";
    }

    cerrarDisponibles();

    donationModal
        ?.classList
        .add(
            "activo"
        );

    const boton =
        donationForm
            ?.querySelector(
                ".ejecutar-validacion"
            );

    if (boton) {
        boton.textContent =
            "Guardar cambios";
    }
}


/* Eliminar = cancelar, para conservar historial. */
async function cancelarDonacion(id) {
    if (!window.RescateAuth?.requireAuth()) {
        return;
    }

    const donaciones =
        obtenerDonaciones();

    const donacion =
        donaciones.find(
            (item) =>
                item.id === id
        );

    if (
        !donacion
        ||
        donacion.status ===
        "CANCELADA"
    ) {
        alert(
            "Esta publicación ya fue eliminada."
        );

        return;
    }

    const confirmar =
        window.confirm(
            "¿Querés eliminar esta publicación?"
        );

    if (!confirmar) {
        return;
    }

    try {
        // El servidor confirma que el usuario sea el propietario.
        await window.RescateAuth.api(
            `/donaciones/${id}`,
            { method: "DELETE" }
        );
    } catch (error) {
        alert(error.message);
        return;
    }

    donacion.status =
        "CANCELADA";

    donacion.cancelledAt =
        new Date()
            .toISOString();

    guardarDonaciones(
        donaciones
    );

    mostrarDonaciones();
}


/* Renderiza alimentos según filtro. */
function mostrarDonaciones() {
    if (!availableDonations) {
        return;
    }

    const donaciones =
        obtenerDonaciones();

    const filtradas =
        filtroActual === "TODAS"
            ? donaciones.filter(
                (item) =>
                    item.status !==
                    "CANCELADA"
            )
            : donaciones.filter(
                (item) =>
                    item.status ===
                    filtroActual
            );

    availableDonations.innerHTML =
        "";

    if (
        filtradas.length === 0
    ) {
        availableDonations.innerHTML = `
            <div class="sin-donaciones">
                No hay donaciones
                en esta categoría.
            </div>
        `;

        return;
    }

    filtradas
        .slice()
        .reverse()
        .forEach(
            (donacion) => {
                availableDonations
                    .appendChild(
                        crearTarjetaDonacion(
                            donacion
                        )
                    );
            }
        );
}


/* Abrir alimentos disponibles. */
abrirDisponiblesBtn?.addEventListener(
    "click",
    () => {
        odsDropdown
            ?.classList
            .remove(
                "activo"
            );

        mostrarDonaciones();

        availableModal
            ?.classList
            .add(
                "activo"
            );
    }
);


function cerrarDisponibles() {
    availableModal
        ?.classList
        .remove(
            "activo"
        );
}


cerrarDisponiblesBtn?.addEventListener(
    "click",
    cerrarDisponibles
);


availableBackdrop?.addEventListener(
    "click",
    cerrarDisponibles
);


/* Filtros de alimentos. */
document
    .querySelectorAll(
        ".filtro-donacion"
    )
    .forEach(
        (boton) => {
            boton.addEventListener(
                "click",
                () => {
                    filtroActual =
                        boton.dataset.status;

                    document
                        .querySelectorAll(
                            ".filtro-donacion"
                        )
                        .forEach(
                            (item) =>
                                item
                                    .classList
                                    .remove(
                                        "activo"
                                    )
                        );

                    boton
                        .classList
                        .add(
                            "activo"
                        );

                    mostrarDonaciones();
                }
            );
        }
    );


/* =========================================================
   6. RESERVA DE ALIMENTOS
========================================================= */

const reservationModal =
    obtenerElemento(
        "reservationModal"
    );

const reservationForm =
    obtenerElemento(
        "reservationForm"
    );

const cerrarReservaBtn =
    obtenerElemento(
        "cerrarReservaBtn"
    );

const reservationBackdrop =
    obtenerElemento(
        "reservationBackdrop"
    );


function abrirReserva(id) {
    if (!window.RescateAuth?.requireAuth()) {
        return;
    }

    const donacion =
        obtenerDonaciones().find(
            (item) => String(item.id) === String(id)
        );

    const usuario =
        window.RescateAuth?.getUser?.();

    if (
        donacion
        && usuario
        && Number(donacion.ownerId) === Number(usuario.id)
    ) {
        alert("No podés reservar tu propia donación.");
        return;
    }

    const campo =
        obtenerElemento(
            "reservationDonationId"
        );

    if (campo) {
        campo.value =
            id;
    }

    reservationModal
        ?.classList
        .add(
            "activo"
        );
}


function cerrarReserva() {
    reservationModal
        ?.classList
        .remove(
            "activo"
        );
}


cerrarReservaBtn?.addEventListener(
    "click",
    cerrarReserva
);


reservationBackdrop?.addEventListener(
    "click",
    cerrarReserva
);


reservationForm?.addEventListener(
    "submit",
    async (evento) => {
        evento.preventDefault();

        const id =
            obtenerElemento(
                "reservationDonationId"
            )?.value;

        const donaciones =
            obtenerDonaciones();

        const donacion =
            donaciones.find(
                (item) =>
                    String(item.id) === String(id)
            );

        if (
            !donacion
            ||
            donacion.status !==
            "ACTIVA"
        ) {
            alert(
                "Esta donación ya no está disponible."
            );

            cerrarReserva();

            mostrarDonaciones();

            return;
        }

        const nombre =
            obtenerElemento(
                "receiverName"
            )?.value.trim() || "";

        const responsable =
            obtenerElemento(
                "receiverResponsible"
            )?.value.trim() || "";

        const ciudad =
            obtenerElemento(
                "receiverCity"
            )?.value.trim() || "";

        if (
            !nombre
            ||
            !responsable
            ||
            !ciudad
        ) {
            alert(
                "Completá todos los datos del receptor."
            );

            return;
        }

        const datosReserva = {
            receiverType:
                obtenerElemento(
                    "receiverType"
                )?.value || "Otro",
            receiverName:
                nombre,
            receiverResponsible:
                responsable,
            receiverCity:
                ciudad
        };

        try {
            // La reserva se guarda en SQLite y genera una notificación al propietario.
            const respuesta =
                await window.RescateAuth.api(
                    `/donaciones/${id}/reservar`,
                    {
                        method: "POST",
                        body: JSON.stringify(datosReserva)
                    }
                );

            const indice =
                donaciones.findIndex(
                    (item) => String(item.id) === String(id)
                );

            if (indice >= 0) {
                donaciones[indice] =
                    respuesta.donacion;
            }

            guardarDonaciones(
                donaciones
            );
        } catch (error) {
            alert(error.message);
            return;
        }

        reservationForm.reset();

        cerrarReserva();

        mostrarDonaciones();
        window.RescateAuth?.refreshNotifications?.();

        /* Actualiza métricas territoriales. */
        renderizarInteligenciaSocial();
    }
);


/* Confirma retiro del alimento. */
async function confirmarRetiro(id) {
    if (!window.RescateAuth?.requireAuth()) {
        return;
    }

    const donaciones =
        obtenerDonaciones();

    const donacion =
        donaciones.find(
            (item) =>
                String(item.id) === String(id)
        );

    if (
        !donacion
        ||
        donacion.status !==
        "RESERVADA"
    ) {
        alert(
            "La donación debe estar reservada antes de confirmar el retiro."
        );

        return;
    }

    const confirmar =
        window.confirm(
            "¿Confirmar que esta donación fue retirada?"
        );

    if (!confirmar) {
        return;
    }

    try {
        const actualizada =
            await window.RescateAuth.api(
                `/donaciones/${id}/retirar`,
                { method: "POST" }
            );

        const indice =
            donaciones.findIndex(
                (item) => String(item.id) === String(id)
            );

        if (indice >= 0) {
            donaciones[indice] = actualizada;
        }

        guardarDonaciones(
            donaciones
        );
    } catch (error) {
        alert(error.message);
        return;
    }

    mostrarDonaciones();

    /* Actualiza métricas territoriales. */
    renderizarInteligenciaSocial();
}


/* =========================================================
   7. QUIERO AYUDAR
========================================================= */

const HELP_KEY =
    "alimentapy_ayudas";


function obtenerAyudas() {
    return leerArregloLocal(
        HELP_KEY
    );
}


function guardarAyudas(
    ayudas
) {
    guardarArregloLocal(
        HELP_KEY,
        ayudas
    );
}


const abrirAyudarBtn =
    obtenerElemento(
        "abrirAyudarBtn"
    );

const helpModal =
    obtenerElemento(
        "helpModal"
    );

const helpBackdrop =
    obtenerElemento(
        "helpBackdrop"
    );

const cerrarAyudarBtn =
    obtenerElemento(
        "cerrarAyudarBtn"
    );

const helpForm =
    obtenerElemento(
        "helpForm"
    );

const helpResult =
    obtenerElemento(
        "helpResult"
    );


/* Abre formulario de ayuda no alimentaria. */
abrirAyudarBtn?.addEventListener(
    "click",
    () => {
        odsDropdown
            ?.classList
            .remove(
                "activo"
            );

        /* Abrimos el formulario en modo nueva ayuda. */
        ayudaEnEdicion =
            null;

        helpForm?.reset();

        const botonGuardarAyuda =
            helpForm
                ?.querySelector(
                    ".ejecutar-validacion"
                );

        if (botonGuardarAyuda) {
            botonGuardarAyuda.textContent =
                "Registrar ayuda";
        }

        if (helpResult) {
            helpResult.className =
                "resultado-validacion campo-oculto";

            helpResult.innerHTML =
                "";
        }

        helpModal
            ?.classList
            .add(
                "activo"
            );
    }
);


function cerrarAyudar() {
    helpModal
        ?.classList
        .remove(
            "activo"
        );
}


cerrarAyudarBtn?.addEventListener(
    "click",
    cerrarAyudar
);


helpBackdrop?.addEventListener(
    "click",
    cerrarAyudar
);


/* Guarda o actualiza ropa, calzado, útiles, etc. */
helpForm?.addEventListener(
    "submit",
    (evento) => {
        evento.preventDefault();

        const donorName =
            obtenerElemento(
                "helpDonorName"
            )?.value.trim() || "";

        const item =
            obtenerElemento(
                "helpItem"
            )?.value.trim() || "";

        const quantity =
            Number(
                obtenerElemento(
                    "helpQuantity"
                )?.value || 0
            );

        const city =
            obtenerElemento(
                       )?.value.trim() || "";

        if (
            !donorName
            ||
            !item
            ||
            quantity <= 0
            ||
            !city
        ) {
            alert(
                "Completá los datos requeridos."
            );

            return;
        }

        const ayudas =
            obtenerAyudas();

        const datosAyuda = {
            donorType:
                obtenerElemento(
                    "helpDonorType"
                )?.value ||
                "Persona particular",

            donorName,

            category:
                obtenerElemento(
                    "helpCategory"
                )?.value || "Otro",

            item,

            quantity,

            condition:
                obtenerElemento(
                    "helpCondition"
                )?.value ||
                "Buen estado",

            city,

            zone:
                obtenerElemento(
                    "helpZone"
                )?.value.trim() || "",

            notes:
                obtenerElemento(
                    "helpNotes"
                )?.value.trim() || ""
        };


        /* Si hay ID, actualizamos la ayuda existente. */
        if (ayudaEnEdicion) {

            const ayuda =
                ayudas.find(
                    (itemAyuda) =>
                        itemAyuda.id ===
                        ayudaEnEdicion
                );

            if (
                !ayuda
                ||
                ayuda.status ===
                "CANCELADA"
            ) {
                alert(
                    "Esta ayuda ya fue eliminada y no puede editarse."
                );

                ayudaEnEdicion =
                    null;

                return;
            }

            Object.assign(
                ayuda,
                datosAyuda
            );

            ayuda.updatedAt =
                new Date()
                    .toISOString();

        } else {

            /* Si no hay ID, registramos una nueva ayuda. */
            ayudas.push({
                id:
                    "AYU-" +
                    Date.now() +
                    "-" +
                    Math.floor(
                        Math.random() * 1000
                    ),

                ...datosAyuda,

                status:
                    "ACTIVA",

                createdAt:
                    new Date()
                        .toISOString(),

                updatedAt:
                    null,

                receiver:
                    null,

                reservedAt:
                    null,

                withdrawnAt:
                    null,

                cancelledAt:
                    null
            });
        }


        guardarAyudas(
            ayudas
        );


        if (helpResult) {
            helpResult.className =
                "resultado-validacion aceptado";

            helpResult.innerHTML = `
                <h3>
                    ${
                        ayudaEnEdicion
                            ? "Ayuda actualizada"
                            : "¡Gracias por sumarte!"
                    }
                </h3>

                <p>
                    ${
                        ayudaEnEdicion
                            ? "Los cambios fueron guardados correctamente."
                            : "Tu ayuda fue registrada correctamente y ya puede verse en <strong>Manos que suman</strong>."
                    }
                </p>
            `;
        }


        ayudaEnEdicion =
            null;

        helpForm.reset();

        const botonGuardarAyuda =
            helpForm.querySelector(
                ".ejecutar-validacion"
            );

        if (botonGuardarAyuda) {
            botonGuardarAyuda.textContent =
                "Registrar ayuda";
        }

        mostrarAyudasDisponibles();

        /* Actualiza métricas territoriales. */
        renderizarInteligenciaSocial();
    }
);


/* =========================================================
   8. TU AYUDA CERCA
========================================================= */

const centrosAyuda = [
    {
        nombre:
            "Comedor De Niños",

        tipo:
            "Comedor comunitario",

        ciudad:
            "San Lorenzo",

        direccion:
            "MF6R+MJ6, 14 de Mayo, San Lorenzo 111423, Paraguay",

        recibe:
            "Consultar previamente los artículos aceptados."
    },

    {
        nombre:
            "Comedor Jesús el Buen Pastor",

        tipo:
            "Centro comunitario",

        ciudad:
            "San Lorenzo",

        direccion:
            "MFQH+C89, San Lorenzo 111403, Paraguay",

        recibe:
            "Consultar previamente los artículos aceptados."
    },

    {
        nombre:
            "Comedor San Miguel",

        tipo:
            "Comedor comunitario",

        ciudad:
            "San Lorenzo",

        direccion:
            "MGFC+84H, San Lorenzo 111415, Paraguay",

        recibe:
            "Consultar previamente los artículos aceptados."
    },

    {
        nombre:
            "Albergue Fausta Massolo",

        tipo:
            "Albergue",

        ciudad:
            "San Lorenzo",

        direccion:
            "Av. Laguna Grande 991 c/ Gral. Eusebio Garay, San Lorenzo, Paraguay",

        recibe:
            "Donaciones y colaboración social; consultar previamente."
    },

    {
        nombre:
            "Centro Comunitario Comedor Pececito",

        tipo:
            "Centro comunitario",

        ciudad:
            "Asunción",

        direccion:
            "QC9F+WGP, Sargento Florentin, Asunción 001501, Paraguay",

        recibe:
            "Consultar previamente los artículos aceptados."
    }
];


const abrirAyudaCercaBtn =
    obtenerElemento(
        "abrirAyudaCercaBtn"
    );

const nearbyHelpModal =
    obtenerElemento(
        "nearbyHelpModal"
    );

const nearbyHelpBackdrop =
    obtenerElemento(
        "nearbyHelpBackdrop"
    );

const cerrarAyudaCercaBtn =
    obtenerElemento(
        "cerrarAyudaCercaBtn"
    );

const buscarCentrosBtn =
    obtenerElemento(
        "buscarCentrosBtn"
    );

const listaCentrosAyuda =
    obtenerElemento(
        "listaCentrosAyuda"
    );


/* Renderiza centros registrados o Maps. */
function mostrarCentrosAyuda() {
    if (!listaCentrosAyuda) {
        return;
    }

    const ciudadOriginal =
        obtenerElemento(
            "buscarCiudadAyuda"
        )?.value.trim() || "";

    const ciudad =
        ciudadOriginal.toLowerCase();

    const tipo =
        obtenerElemento(
            "buscarTipoCentro"
        )?.value || "";

    const resultados =
        centrosAyuda.filter(
            (centro) => {
                const coincideCiudad =
                    !ciudad
                    ||
                    centro.ciudad
                        .toLowerCase()
                        .includes(ciudad);

                const coincideTipo =
                    !tipo
                    ||
                    centro.tipo === tipo;

                return (
                    coincideCiudad
                    &&
                    coincideTipo
                );
            }
        );

    listaCentrosAyuda.innerHTML =
        "";

    if (
        resultados.length === 0
    ) {
        const consulta =
            [
                tipo ||
                "centro de ayuda",

                ciudadOriginal,

                "Paraguay"
            ]
            .filter(Boolean)
            .join(" ");

        const url =
            crearUrlGoogleMaps(
                consulta
            );

        listaCentrosAyuda.innerHTML = `
            <div class="sin-donaciones">

                <p>
                    No encontramos lugares registrados
                    con esos criterios.
                </p>

                <p>
                    Podés ampliar la búsqueda
                    directamente en Google Maps.
                </p>

                <a
                    href="${url}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="accion-donacion">

                    Explorar lugares cercanos

                </a>

            </div>
        `;

        return;
    }

    resultados.forEach(
        (centro) => {
            const tarjeta =
                document.createElement(
                    "article"
                );

            tarjeta.className =
                "donacion-publicada";

            tarjeta.innerHTML = `
                <span class="donacion-donante">
                    ${escaparHTML(centro.tipo)}
                </span>

                <h3>
                    ${escaparHTML(centro.nombre)}
                </h3>

                <div class="donacion-detalles">

                    <p>
                        <strong>Ciudad:</strong>
                        ${escaparHTML(centro.ciudad)}
                    </p>

                    <p>
                        <strong>Dirección:</strong>
                        ${escaparHTML(centro.direccion)}
                    </p>

                    <p>
                        ${escaparHTML(centro.recibe)}
                    </p>

                </div>

                <div class="acciones-donacion">

                    <button
                        type="button"
                        class="accion-donacion">
                        Cómo llegar
                    </button>

                </div>
            `;

            tarjeta
                .querySelector(
                    ".accion-donacion"
                )
                ?.addEventListener(
                    "click",
                    () => {
                        abrirMapa(
                            centro.direccion,
                            centro.ciudad
                        );
                    }
                );

            listaCentrosAyuda.appendChild(
                tarjeta
            );
        }
    );
}


abrirAyudaCercaBtn?.addEventListener(
    "click",
    () => {
        odsDropdown
            ?.classList
            .remove(
                "activo"
            );

        nearbyHelpModal
            ?.classList
            .add(
                "activo"
            );

        mostrarCentrosAyuda();
    }
);


function cerrarAyudaCerca() {
    nearbyHelpModal
        ?.classList
        .remove(
            "activo"
        );
}


cerrarAyudaCercaBtn?.addEventListener(
    "click",
    cerrarAyudaCerca
);


nearbyHelpBackdrop?.addEventListener(
    "click",
    cerrarAyudaCerca
);


buscarCentrosBtn?.addEventListener(
    "click",
    mostrarCentrosAyuda
);


/* =========================================================
   9. MANOS QUE SUMAN
========================================================= */

const abrirManosSumanBtn =
    obtenerElemento(
        "abrirManosSumanBtn"
    );

const helpAvailableModal =
    obtenerElemento(
        "helpAvailableModal"
    );

const helpAvailableBackdrop =
    obtenerElemento(
        "helpAvailableBackdrop"
    );

const cerrarManosSumanBtn =
    obtenerElemento(
        "cerrarManosSumanBtn"
    );

const helpAvailableItems =
    obtenerElemento(
        "helpAvailableItems"
    );

let filtroAyudaActual =
    "TODAS";


/* Guarda el ID de la ayuda que se está editando. */
let ayudaEnEdicion =
    null;


/* Nombre comercial del estado. */
function textoEstadoAyuda(
    estado
) {
    if (
        estado === "ACTIVA"
    ) {
        return "DISPONIBLE";
    }

    if (
        estado === "RESERVADA"
    ) {
        return "PENDIENTE DE RETIRO";
    }

    if (
        estado === "RETIRADA"
    ) {
        return "RETIRADA";
    }

    return estado || "-";
}


/* Reutiliza clases visuales de alimentos. */
function claseEstadoAyuda(
    estado
) {
    return claseEstadoDonacion(
        estado
    );
}


/* Crea tarjeta de ayuda general. */
function crearTarjetaAyuda(
    ayuda
) {
    const tarjeta =
        document.createElement(
            "article"
        );

    tarjeta.className =
        "donacion-publicada";


    const receptorHTML =
        ayuda.receiver
            ? `
                <div class="donacion-receptor">

                    <span>
                        Receptor
                    </span>

                    <strong>
                        ${escaparHTML(ayuda.receiver.name)}
                    </strong>

                    <p>
                        ${escaparHTML(ayuda.receiver.type)}
                        ·
                        ${escaparHTML(ayuda.receiver.city)}
                    </p>

                    <p>
                        <strong>
                            Responsable:
                        </strong>

                        ${escaparHTML(ayuda.receiver.responsible)}
                    </p>

                </div>
            `
            : "";


    tarjeta.innerHTML = `
        <div class="donacion-superior">

            <div>
                <span class="donacion-donante">
                    ${escaparHTML(ayuda.category)}
                </span>

                <h3>
                    ${escaparHTML(ayuda.item)}
                </h3>

                <div class="donacion-cantidad">
                    ${escaparHTML(ayuda.quantity)}
                    unidad(es)
                </div>
            </div>

            <span
                class="
                    estado-donacion
                    ${claseEstadoAyuda(ayuda.status)}
                ">
                ${escaparHTML(
                    textoEstadoAyuda(
                        ayuda.status
                    )
                )}
            </span>

        </div>


        <div class="donacion-detalles">

            <p>
                <strong>Donante:</strong>
                ${escaparHTML(ayuda.donorName)}
            </p>

            <p>
                <strong>Tipo:</strong>
                ${escaparHTML(ayuda.donorType)}
            </p>

            <p>
                <strong>Estado del artículo:</strong>
                ${escaparHTML(ayuda.condition)}
            </p>

            <p>
                <strong>Ciudad:</strong>
                ${escaparHTML(ayuda.city)}
            </p>

            ${
                ayuda.zone
                    ? `
                        <p>
                            <strong>Barrio / zona:</strong>
                            ${escaparHTML(ayuda.zone)}
                        </p>
                    `
                    : ""
            }

            ${
                ayuda.notes
                    ? `
                        <p>
                            <strong>Observación:</strong>
                            ${escaparHTML(ayuda.notes)}
                        </p>
                    `
                    : ""
            }

            <p>
                <strong>Publicada:</strong>
                ${formatearFecha(ayuda.createdAt)}
            </p>

            ${
                ayuda.updatedAt
                    ? `
                        <p>
                            <strong>Última modificación:</strong>
                            ${formatearFecha(ayuda.updatedAt)}
                        </p>
                    `
                    : ""
            }

            ${
                ayuda.reservedAt
                    ? `
                        <p>
                            <strong>Reservada:</strong>
                            ${formatearFecha(ayuda.reservedAt)}
                        </p>
                    `
                    : ""
            }

            ${
                ayuda.withdrawnAt
                    ? `
                        <p>
                            <strong>Retirada:</strong>
                            ${formatearFecha(ayuda.withdrawnAt)}
                        </p>
                    `
                    : ""
            }

        </div>


        ${receptorHTML}


        <div class="acciones-donacion">
        </div>
    `;


    const acciones =
        tarjeta.querySelector(
            ".acciones-donacion"
        );


    if (
        ayuda.status ===
        "ACTIVA"
    ) {
        const recibir =
            document.createElement(
                "button"
            );

        recibir.type =
            "button";

        recibir.className =
            "accion-donacion";

        recibir.textContent =
            "Quiero recibirlo";

        recibir.addEventListener(
            "click",
            () => {
                abrirReservaAyuda(
                    ayuda.id
                );
            }
        );

        acciones.appendChild(
            recibir
        );


        const ubicacion =
            document.createElement(
                "button"
            );

        ubicacion.type =
            "button";

        ubicacion.className =
            "accion-donacion secundaria";

        ubicacion.textContent =
            "Ver zona";

        ubicacion.addEventListener(
            "click",
            () => {
                abrirMapa(
                    ayuda.zone ||
                    ayuda.city,
                    ayuda.city
                );
            }
        );

        acciones.appendChild(
            ubicacion
        );



    }


    if (
        ayuda.status ===
        "RESERVADA"
    ) {
        const retiro =
            document.createElement(
                "button"
            );

        retiro.type =
            "button";

        retiro.className =
            "accion-donacion";

        retiro.textContent =
            "Confirmar retiro";

        retiro.addEventListener(
            "click",
            () => {
                confirmarRetiroAyuda(
                    ayuda.id
                );
            }
        );

        acciones.appendChild(
            retiro
        );
    }


    /*
       El botón Editar aparece únicamente
       cuando estamos en el filtro "Todas".
    */
    if (
        filtroAyudaActual === "TODAS"
        &&
        ayuda.status !== "CANCELADA"
    ) {
        const editar =
            document.createElement(
                "button"
            );

        editar.type =
            "button";

        editar.className =
            "accion-donacion secundaria";

        editar.textContent =
            "Editar";

        editar.addEventListener(
            "click",
            () => {
                editarAyuda(
                    ayuda.id
                );
            }
        );

        acciones.appendChild(
            editar
        );
    }


    /*
       El botón Eliminar conserva
       el comportamiento que ya tenía.
    */
    if (
        ayuda.status !==
        "CANCELADA"
    ) {
        const eliminar =
            document.createElement(
                "button"
            );

        eliminar.type =
            "button";

        eliminar.className =
            "accion-donacion boton-eliminar";

        eliminar.textContent =
            "Eliminar";

        eliminar.addEventListener(
            "click",
            () => {
                eliminarAyuda(
                    ayuda.id
                );
            }
        );

        acciones.appendChild(
            eliminar
        );
    }


    return tarjeta;
}


/* Edita una ayuda no alimentaria disponible. */
function editarAyuda(id) {

    const ayudas =
        obtenerAyudas();

    const ayuda =
        ayudas.find(
            (item) =>
                item.id === id
        );


    if (
        !ayuda
        ||
        ayuda.status ===
        "CANCELADA"
    ) {
        alert(
            "Esta ayuda ya fue eliminada y no puede editarse."
        );

        return;
    }


    ayudaEnEdicion =
        ayuda.id;


    obtenerElemento(
        "helpDonorType"
    ).value =
        ayuda.donorType ||
        "Persona particular";

    obtenerElemento(
        "helpDonorName"
    ).value =
        ayuda.donorName || "";

    obtenerElemento(
        "helpCategory"
    ).value =
        ayuda.category || "Otro";

    obtenerElemento(
        "helpItem"
    ).value =
        ayuda.item || "";

    obtenerElemento(
        "helpQuantity"
    ).value =
        ayuda.quantity ?? "";

    obtenerElemento(
        "helpCondition"
    ).value =
        ayuda.condition ||
        "Buen estado";

    obtenerElemento(
        "helpCity"
    ).value =
        ayuda.city || "";

    obtenerElemento(
        "helpZone"
    ).value =
        ayuda.zone || "";

    obtenerElemento(
        "helpNotes"
    ).value =
        ayuda.notes || "";


    /* Cerramos el listado y abrimos el formulario. */
    cerrarManosSuman();

    helpModal
        ?.classList
        .add(
            "activo"
        );


    if (helpResult) {
        helpResult.className =
            "resultado-validacion campo-oculto";

        helpResult.innerHTML =
            "";
    }


    const botonGuardarAyuda =
        helpForm
            ?.querySelector(
                ".ejecutar-validacion"
            );

    if (botonGuardarAyuda) {
        botonGuardarAyuda.textContent =
            "Guardar cambios";
    }
}


/*
   Eliminar es lógico:
   se conserva el historial y se oculta del listado.
*/
function eliminarAyuda(id) {

    const ayudas =
        obtenerAyudas();

    const ayuda =
        ayudas.find(
            (item) =>
                item.id === id
        );


    if (
        !ayuda
        ||
        ayuda.status ===
        "CANCELADA"
    ) {
        alert(
            "Esta ayuda ya fue eliminada."
        );

        return;
    }


    const confirmar =
        window.confirm(
            "¿Querés eliminar esta publicación?"
        );


    if (!confirmar) {
        return;
    }


    ayuda.status =
        "CANCELADA";

    ayuda.cancelledAt =
        new Date()
            .toISOString();


    guardarAyudas(
        ayudas
    );

    mostrarAyudasDisponibles();

    /* Actualiza métricas territoriales. */
    renderizarInteligenciaSocial();
}


/* Muestra ayudas según filtro. */
function mostrarAyudasDisponibles() {
    if (!helpAvailableItems) {
        return;
    }

    const ayudas =
        obtenerAyudas();

    const filtradas =
        filtroAyudaActual ===
        "TODAS"
            ? ayudas.filter(
                (ayuda) =>
                    ayuda.status !==
                    "CANCELADA"
            )
            : ayudas.filter(
                (ayuda) =>
                    ayuda.status ===
                    filtroAyudaActual
            );

    helpAvailableItems.innerHTML =
        "";

    if (
        filtradas.length === 0
    ) {
        helpAvailableItems.innerHTML = `
            <div class="sin-donaciones">
                Todavía no hay ayudas
                en esta categoría.
            </div>
        `;

        return;
    }

    filtradas
        .slice()
        .reverse()
        .forEach(
            (ayuda) => {
                helpAvailableItems
                    .appendChild(
                        crearTarjetaAyuda(
                            ayuda
                        )
                    );
            }
        );
}


/* Abre Manos que suman. */
abrirManosSumanBtn?.addEventListener(
    "click",
    () => {
        odsDropdown
            ?.classList
            .remove(
                "activo"
            );

        mostrarAyudasDisponibles();

        helpAvailableModal
            ?.classList
            .add(
                "activo"
            );
    }
);


function cerrarManosSuman() {
    helpAvailableModal
        ?.classList
        .remove(
            "activo"
        );
}


cerrarManosSumanBtn?.addEventListener(
    "click",
    cerrarManosSuman
);


helpAvailableBackdrop?.addEventListener(
    "click",
    cerrarManosSuman
);


/* Filtros de Manos que suman. */
document
    .querySelectorAll(
        ".filtro-ayuda"
    )
    .forEach(
        (boton) => {
            boton.addEventListener(
                "click",
                () => {
                    filtroAyudaActual =
                        boton.dataset.helpStatus;

                    document
                        .querySelectorAll(
                            ".filtro-ayuda"
                        )
                        .forEach(
                            (item) =>
                                item
                                    .classList
                                    .remove(
                                        "activo"
                                    )
                        );

                    boton
                        .classList
                        .add(
                            "activo"
                        );

                    mostrarAyudasDisponibles();
                }
            );
        }
    );


/* =========================================================
   10. RESERVAR AYUDA NO ALIMENTARIA
========================================================= */

const helpReservationModal =
    obtenerElemento(
        "helpReservationModal"
    );

const helpReservationBackdrop =
    obtenerElemento(
        "helpReservationBackdrop"
    );

const cerrarHelpReservaBtn =
    obtenerElemento(
        "cerrarHelpReservaBtn"
    );

const helpReservationForm =
    obtenerElemento(
        "helpReservationForm"
    );


function abrirReservaAyuda(id) {
    const campo =
        obtenerElemento(
            "helpReservationItemId"
        );

    if (campo) {
        campo.value =
            id;
    }

    helpReservationModal
        ?.classList
        .add(
            "activo"
        );
}


function cerrarReservaAyuda() {
    helpReservationModal
        ?.classList
        .remove(
            "activo"
        );
}


cerrarHelpReservaBtn?.addEventListener(
    "click",
    cerrarReservaAyuda
);


helpReservationBackdrop?.addEventListener(
    "click",
    cerrarReservaAyuda
);


helpReservationForm?.addEventListener(
    "submit",
    (evento) => {
        evento.preventDefault();

        const id =
            obtenerElemento(
                "helpReservationItemId"
            )?.value;

        const ayudas =
            obtenerAyudas();

        const ayuda =
            ayudas.find(
                (item) =>
                    item.id === id
            );

        if (
            !ayuda
            ||
            ayuda.status !==
            "ACTIVA"
        ) {
            alert(
                "Esta ayuda ya no está disponible."
            );

            cerrarReservaAyuda();

            mostrarAyudasDisponibles();

            return;
        }

        const nombre =
            obtenerElemento(
                "helpReceiverName"
            )?.value.trim() || "";

        const responsable =
            obtenerElemento(
                "helpReceiverResponsible"
            )?.value.trim() || "";

        const ciudad =
            obtenerElemento(
                "helpReceiverCity"
            )?.value.trim() || "";

        if (
            !nombre
            ||
            !responsable
            ||
            !ciudad
        ) {
            alert(
                "Completá todos los datos del receptor."
            );

            return;
        }

        ayuda.status =
            "RESERVADA";

        ayuda.reservedAt =
            new Date()
                .toISOString();

        ayuda.receiver = {
            type:
                obtenerElemento(
                    "helpReceiverType"
                )?.value || "Otro",

            name:
                nombre,

            responsible:
                responsable,

            city:
                ciudad
        };

        guardarAyudas(
            ayudas
        );

        helpReservationForm.reset();

        cerrarReservaAyuda();

        mostrarAyudasDisponibles();
    }
);


/* Confirma retiro de ropa, calzado, etc. */
function confirmarRetiroAyuda(id) {
    const ayudas =
        obtenerAyudas();

    const ayuda =
        ayudas.find(
            (item) =>
                item.id === id
        );

    if (
        !ayuda
        ||
        ayuda.status !==
        "RESERVADA"
    ) {
        alert(
            "La ayuda debe estar reservada antes de confirmar el retiro."
        );

        return;
    }

    const confirmar =
        window.confirm(
            "¿Confirmar que esta ayuda fue retirada?"
        );

    if (!confirmar) {
        return;
    }

    ayuda.status =
        "RETIRADA";

    ayuda.withdrawnAt =
        new Date()
            .toISOString();

    guardarAyudas(
        ayudas
    );

    mostrarAyudasDisponibles();

    /* Actualiza métricas territoriales. */
    renderizarInteligenciaSocial();
}


/* =========================================================
   11. ECOVALOR
========================================================= */

const abrirEcoValorBtn =
    obtenerElemento(
        "abrirEcoValorBtn"
    );

const ecoValorModal =
    obtenerElemento(
        "ecoValorModal"
    );

const ecoValorBackdrop =
    obtenerElemento(
        "ecoValorBackdrop"
    );

const cerrarEcoValorBtn =
    obtenerElemento(
        "cerrarEcoValorBtn"
    );

const buscarEcoValorBtn =
    obtenerElemento(
        "buscarEcoValorBtn"
    );

const ecoValueResult =
    obtenerElemento(
        "ecoValueResult"
    );

const recyclingCenters =
    obtenerElemento(
        "recyclingCenters"
    );


/*
   PRECIOS DE DEMOSTRACIÓN.
   NO representan cotización real de mercado.
   Más adelante deben venir de una fuente verificada.
*/
const preciosEcoValorDemo = {
    "Latas de aluminio": 6000,
    "Plástico PET": 1000,
    "Plástico mixto": 500,
    "Cartón": 800,
    "Papel": 500,
    "Hierro": 1500,
    "Cobre": 50000,
    "Bronce": 25000,
    "Vidrio": 200,
    "Otros metales": 2000
};


/*
   Dejamos la lista preparada.
   Agregá aquí recicladoras verificadas
   cuando tengas sus datos reales.
*/
const centrosReciclaje = [];


/* Abre EcoValor. */
abrirEcoValorBtn?.addEventListener(
    "click",
    () => {
        odsDropdown
            ?.classList
            .remove(
                "activo"
            );

        ecoValorModal
            ?.classList
            .add(
                "activo"
            );
    }
);


function cerrarEcoValor() {
    ecoValorModal
        ?.classList
        .remove(
            "activo"
        );
}


cerrarEcoValorBtn?.addEventListener(
    "click",
    cerrarEcoValor
);


ecoValorBackdrop?.addEventListener(
    "click",
    cerrarEcoValor
);


/* Calcula valor y lugares. */
function ejecutarEcoValor() {
    const material =
        obtenerElemento(
            "recycleMaterial"
        )?.value || "";

    const kilos =
        Number(
            obtenerElemento(
                "recycleKg"
            )?.value || 0
        );

    const ciudad =
        obtenerElemento(
            "recycleCity"
        )?.value.trim() || "";


    if (
        !material
        ||
        kilos <= 0
        ||
        !ciudad
    ) {
        alert(
            "Elegí un material, ingresá los kilos y tu ciudad."
        );

        return;
    }


    const precioKg =
        preciosEcoValorDemo[
            material
        ];


    const valorEstimado =
        Number.isFinite(
            precioKg
        )
            ? kilos * precioKg
            : null;


    if (ecoValueResult) {
        ecoValueResult.className =
            "resultado-validacion revision";

        ecoValueResult.innerHTML = `
            <h3>
                ${escaparHTML(material)}
            </h3>

            <p>
                <strong>Cantidad:</strong>
                ${escaparHTML(kilos)} kg
            </p>

            ${
                Number.isFinite(precioKg)
                    ? `
                        <p>
                            <strong>
                                Precio DEMO:
                            </strong>

                            ${formatearGuaranies(precioKg)}
                            / kg
                        </p>

                        <p>
                            <strong>
                                Valor estimado DEMO:
                            </strong>

                            ${formatearGuaranies(valorEstimado)}
                        </p>
                    `
                    : `
                        <p>
                            Precio de referencia
                            todavía no disponible.
                        </p>
                    `
            }

            <p>
                <small>
                    Los precios mostrados son valores de prueba
                    del prototipo y no una cotización real.
                    Deben reemplazarse por una fuente verificada.
                </small>
            </p>
        `;
    }


    mostrarCentrosReciclaje(
        material,
        ciudad
    );
}


/* Busca recicladoras registradas o Maps. */
function mostrarCentrosReciclaje(
    material,
    ciudad
) {
    if (!recyclingCenters) {
        return;
    }

    const ciudadNormalizada =
        ciudad.toLowerCase();

    const resultados =
        centrosReciclaje.filter(
            (centro) => {
                const coincideCiudad =
                    centro.ciudad
                        .toLowerCase()
                        .includes(
                            ciudadNormalizada
                        );

                const aceptaMaterial =
                    centro.materiales
                        .some(
                            (item) =>
                                item
                                    .toLowerCase()
                                    .includes(
                                        material
                                            .toLowerCase()
                                    )
                        );

                return (
                    coincideCiudad
                    &&
                    aceptaMaterial
                );
            }
        );


    recyclingCenters.innerHTML =
        "";


    if (
        resultados.length === 0
    ) {
        const consulta =
            `recicladora compra ${material} ${ciudad} Paraguay`;

        const url =
            crearUrlGoogleMaps(
                consulta
            );

        recyclingCenters.innerHTML = `
            <div class="sin-donaciones">

                <p>
                    Todavía no tenemos compradores
                    verificados para este material
                    y ciudad.
                </p>

                <a
                    href="${url}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="accion-donacion">

                    Explorar compradores en Google Maps

                </a>

            </div>
        `;

        return;
    }


    resultados.forEach(
        (centro) => {
            const tarjeta =
                document.createElement(
                    "article"
                );

            tarjeta.className =
                "donacion-publicada";

            tarjeta.innerHTML = `
                <span class="donacion-donante">
                    RECICLAJE
                </span>

                <h3>
                    ${escaparHTML(centro.nombre)}
                </h3>

                <div class="donacion-detalles">

                    <p>
                        <strong>Ciudad:</strong>
                        ${escaparHTML(centro.ciudad)}
                    </p>

                    <p>
                        <strong>Dirección:</strong>
                        ${escaparHTML(centro.direccion)}
                    </p>

                    <p>
                        <strong>Materiales:</strong>
                        ${escaparHTML(
                            centro.materiales.join(", ")
                        )}
                    </p>

                </div>

                <div class="acciones-donacion">

                    <button
                        type="button"
                        class="accion-donacion">
                        Cómo llegar
                    </button>

                </div>
            `;

            tarjeta
                .querySelector(
                    ".accion-donacion"
                )
                ?.addEventListener(
                    "click",
                    () => {
                        abrirMapa(
                            centro.direccion,
                            centro.ciudad
                        );
                    }
                );

            recyclingCenters.appendChild(
                tarjeta
            );
        }
    );
}


buscarEcoValorBtn?.addEventListener(
    "click",
    ejecutarEcoValor
);


/* =========================================================
   12. IMPACTO ODS
========================================================= */

const abrirOdsImpactoBtn =
    obtenerElemento(
        "abrirOdsImpactoBtn"
    );

const odsImpactModal =
    obtenerElemento(
        "odsImpactModal"
    );

const odsImpactBackdrop =
    obtenerElemento(
        "odsImpactBackdrop"
    );

const cerrarOdsImpactoBtn =
    obtenerElemento(
        "cerrarOdsImpactoBtn"
    );


/* El contenido ODS ya está escrito en el HTML. */
abrirOdsImpactoBtn?.addEventListener(
    "click",
    () => {
        odsDropdown
            ?.classList
            .remove(
                "activo"
            );

        odsImpactModal
            ?.classList
            .add(
                "activo"
            );
    }
);


function cerrarOdsImpacto() {
    odsImpactModal
        ?.classList
        .remove(
            "activo"
        );
}


cerrarOdsImpactoBtn?.addEventListener(
    "click",
    cerrarOdsImpacto
);


odsImpactBackdrop?.addEventListener(
    "click",
    cerrarOdsImpacto
);


/* =========================================================
   CERRAR TODO CON ESC
========================================================= */

document.addEventListener(
    "keydown",
    (evento) => {
        if (
            evento.key !==
            "Escape"
        ) {
            return;
        }

        document
            .querySelectorAll(
                ".modal.activo"
            )
            .forEach(
                (modal) =>
                    modal
                        .classList
                        .remove(
                            "activo"
                        )
            );

        cerrarModalDonacion();
        cerrarDisponibles();
        cerrarReserva();
        cerrarAyudar();
        cerrarAyudaCerca();
        cerrarManosSuman();
        cerrarReservaAyuda();
        cerrarEcoValor();
        cerrarOdsImpacto();

        odsDropdown
            ?.classList
            .remove(
                "activo"
            );
    }
);



/* =========================================================
   CARGA INICIAL
========================================================= */

mostrarInstituciones();

mostrarComedores();

actualizarFormularioDonacion();

mostrarDonaciones();

mostrarAyudasDisponibles();

/* Carga los indicadores disponibles al iniciar. */
renderizarInteligenciaSocial();


/* =========================================================
   AJUSTES PUNTUALES SOLICITADOS
   Se agregan sin modificar la lógica existente.
========================================================= */


/* =========================================================
   1. MODAL DEL EQUIPO
========================================================= */

const integrantesRescatePY = [
    "Deolina Maidana",
    "Luana Espinola",
    "Catalina Ullon",
    "Mateo Gamarra",
    "Gabriel Rivas"
];


/* Crea el modal del equipo solo si todavía no existe. */
function crearModalEquipoSiHaceFalta() {

    let modal =
        obtenerElemento(
            "teamModal"
        );

    if (modal) {
        return modal;
    }


    modal =
        document.createElement(
            "div"
        );

    modal.id =
        "teamModal";

    modal.className =
        "donacion-modal-overlay";


    modal.innerHTML = `
        <div
            id="teamBackdrop"
            class="donacion-modal-fondo">
        </div>

        <section
            class="donacion-modal modal-reserva">

            <header
                class="donacion-modal-header">

                <div>

                    <span
                        class="donacion-etiqueta">
                        EQUIPO RESCATEPY
                    </span>

                    <h2>
                        Personas que impulsan esta idea
                    </h2>

                </div>

                <button
                    id="cerrarEquipoBtn"
                    class="cerrar-donacion"
                    type="button">
                    ×
                </button>

            </header>

            <div
                class="donacion-modal-body">

                <div
                    class="equipo-lista">

                    ${integrantesRescatePY
                        .map(
                            (nombre) => `
                                <div
                                    class="equipo-item">
                                    ${escaparHTML(nombre)}
                                </div>
                            `
                        )
                        .join("")
                    }

                </div>

            </div>

        </section>
    `;


    document.body.appendChild(
        modal
    );


    obtenerElemento(
        "cerrarEquipoBtn"
    )
    ?.addEventListener(
        "click",
        cerrarModalEquipo
    );


    obtenerElemento(
        "teamBackdrop"
    )
    ?.addEventListener(
        "click",
        cerrarModalEquipo
    );


    return modal;
}


/* Abre el modal desde el botón que ya está en tu HTML. */
obtenerElemento(
    "abrirEquipoBtn"
)
?.addEventListener(
    "click",
    () => {

        const modal =
            crearModalEquipoSiHaceFalta();

        modal.classList.add(
            "activo"
        );
    }
);


/* Cierra el modal del equipo. */
function cerrarModalEquipo() {

    obtenerElemento(
        "teamModal"
    )
    ?.classList
    .remove(
        "activo"
    );
}


/* =========================================================
   2. ECOVALOR - AJUSTE VISUAL Y GOOGLE MAPS
========================================================= */

/*
    Coloca el botón de Google Maps al lado de
    "Dónde vender cerca", sin tocar tu HTML.
*/
function prepararEcoValorVisual() {

    const contenedor =
        obtenerElemento(
            "recyclingCenters"
        )
        ?.closest(
            ".observacion-donacion"
        );

    if (!contenedor) {
        return;
    }


    const titulo =
        contenedor.querySelector(
            "h3"
        );

    if (!titulo) {
        return;
    }


    let encabezado =
        contenedor.querySelector(
            ".eco-encabezado"
        );


    if (!encabezado) {

        encabezado =
            document.createElement(
                "div"
            );

        encabezado.className =
            "eco-encabezado";


        titulo.parentNode.insertBefore(
            encabezado,
            titulo
        );


        encabezado.appendChild(
            titulo
        );
    }


    let enlace =
        obtenerElemento(
            "ecoMapsLink"
        );


    if (!enlace) {

        enlace =
            document.createElement(
                "a"
            );

        enlace.id =
            "ecoMapsLink";

        enlace.className =
            "accion-donacion eco-maps-btn";

        enlace.target =
            "_blank";

        enlace.rel =
            "noopener noreferrer";

        enlace.textContent =
            "Explorar compradores en Google Maps";


        encabezado.appendChild(
            enlace
        );
    }


    /* Limpia el cuadro inicial de tu HTML. */
    const lista =
        obtenerElemento(
            "recyclingCenters"
        );

    if (lista) {
        lista.innerHTML =
            "";
    }


    /* Búsqueda genérica hasta completar material y ciudad. */
    enlace.href =
        crearUrlGoogleMaps(
            "recicladora compra materiales reciclables Paraguay"
        );
}


/*
    Después del cálculo actual:
    - quitamos DEMO
    - quitamos el texto de advertencia
    - quitamos el cuadro gigante
    - actualizamos Google Maps con material y ciudad
*/
function limpiarResultadoEcoValor() {

    const material =
        obtenerElemento(
            "recycleMaterial"
        )?.value || "";

    const ciudad =
        obtenerElemento(
            "recycleCity"
        )?.value.trim() || "";

    const resultado =
        obtenerElemento(
            "ecoValueResult"
        );


    if (resultado) {

        /* Quita la palabra DEMO de los títulos. */
        resultado.innerHTML =
            resultado.innerHTML
                .replaceAll(
                    "Precio DEMO:",
                    "Precio por kg:"
                )
                .replaceAll(
                    "Valor estimado DEMO:",
                    "Valor estimado:"
                );


        /* Quita el texto pequeño de advertencia. */
        resultado
            .querySelectorAll(
                "small"
            )
            .forEach(
                (elemento) =>
                    elemento
                        .closest("p")
                        ?.remove()
            );
    }


    /* Elimina cualquier cuadro de "sin compradores". */
    const lista =
        obtenerElemento(
            "recyclingCenters"
        );

    if (lista) {
        lista.innerHTML =
            "";
    }


    /* Actualiza el enlace de Maps según la búsqueda. */
    const enlace =
        obtenerElemento(
            "ecoMapsLink"
        );

    if (
        enlace
        &&
        material
        &&
        ciudad
    ) {

        enlace.href =
            crearUrlGoogleMaps(
                `recicladora compra ${material} ${ciudad} Paraguay`
            );
    }
}


/* Prepara EcoValor cuando se abre. */
obtenerElemento(
    "abrirEcoValorBtn"
)
?.addEventListener(
    "click",
    () => {

        prepararEcoValorVisual();
    }
);


/*
    Este segundo listener se ejecuta después del listener
    original de buscarEcoValorBtn que ya tenés.
*/
obtenerElemento(
    "buscarEcoValorBtn"
)
?.addEventListener(
    "click",
    () => {

        limpiarResultadoEcoValor();
    }
);


/* =========================================================
   3. CERRAR EQUIPO CON ESC
========================================================= */

document.addEventListener(
    "keydown",
    (evento) => {

        if (
            evento.key ===
            "Escape"
        ) {
            cerrarModalEquipo();
        }
    }
);


/* =========================================================
   4. PREPARACIÓN INICIAL
========================================================= */

/* Deja EcoValor limpio desde el inicio. */
prepararEcoValorVisual();


/* =========================================================
   BOTÓN VOLVER ATRÁS - TODOS LOS MODALES
========================================================= */

/*
   Agrega automáticamente un botón "Volver atrás" en cada modal.
   - En apartados abiertos desde el menú ODS, vuelve a la pantalla principal.
   - En modales secundarios (por ejemplo, una reserva), cierra solo el modal actual.
*/
function agregarBotonesVolverAtras() {
    const cabeceras = document.querySelectorAll(
        ".modal-cabecera, .donacion-modal-header"
    );

    cabeceras.forEach((cabecera) => {

        /* Obtiene el modal al que pertenece esta cabecera. */
        const modalActual = cabecera.closest(
            ".modal, .donacion-modal-overlay"
        );

        /*
           No agregamos "Volver atrás" en los 3 modales principales:
           Red institucional, Ayuda territorial e Inteligencia social.
        */
        if (
            modalActual?.id === "modalInstitucional"
            ||
            modalActual?.id === "modalTerritorial"
            ||
            modalActual?.id === "modalSocial"
            ||
            modalActual?.id === "authModal"
            ||
            modalActual?.id === "notificationModal"
        ) {
            return;
        }

        /* Evita duplicar el botón si la función se ejecuta más de una vez. */
        if (cabecera.querySelector(".volver-atras-modal")) {
            return;
        }

        const botonVolver = document.createElement("button");

        botonVolver.type = "button";
        botonVolver.className = "volver-atras-modal";
        botonVolver.innerHTML = "← Volver atrás";

        botonVolver.addEventListener("click", (evento) => {
            /* Evita que el clic afecte otros listeners globales. */
            evento.stopPropagation();

            /* Detecta el modal actual. */
            const modalActual = cabecera.closest(
                ".modal, .donacion-modal-overlay"
            );

            /*
               Caso puntual:
               desde "Quiero donar" vuelve a la portada
               con el menú ODS desplegado.
            */
            if (
                modalActual?.id === "donationModal"
            ) {
                /* Cierra solo el formulario de donación. */
                cerrarModalDonacion();

                /* Vuelve a la parte superior de la portada. */
                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

                /*
                   Abre el menú ODS al terminar el clic,
                   evitando que el listener global lo cierre.
                */
                setTimeout(() => {
                    odsDropdown
                        ?.classList
                        .add("activo");
                }, 0);

                return;
            }

            /*
               Desde "Reservar ayuda" vuelve al formulario
               principal "Quiero ayudar".
            */
            if (
                modalActual?.id === "helpReservationModal"
            ) {
                cerrarReservaAyuda();

                helpModal
                    ?.classList
                    .add("activo");

                return;
            }

            /* En los demás casos, cierra el modal actual. */
            modalActual?.classList.remove("activo");

            /* Lleva la vista hacia la parte superior. */
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

            /*
               En los demás apartados mantiene
               el comportamiento de volver al menú ODS abierto.
            */
            setTimeout(() => {
                odsDropdown?.classList.add("activo");
            }, 0);
        });

        /* Coloca el botón al inicio de la cabecera. */
        cabecera.prepend(botonVolver);
    });
}

/* Crea los botones cuando todo el HTML ya está disponible. */
agregarBotonesVolverAtras();

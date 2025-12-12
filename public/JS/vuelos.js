/* ============================================================
   vuelos.js — Listado + Filtros desde URL + modal + carrito
===============================================================*/

document.addEventListener("DOMContentLoaded", () => {

    // ========= Helpers de autenticación (los conservamos) ==========
    function secureHeaders() {
        const token = localStorage.getItem("token") || "";
        return {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": "Bearer " + token } : {})
        };
    }

    async function secureFetch(url, options = {}) {
        options.headers = secureHeaders();
        const res = await fetch(url, options);

        if (res.status === 401) {
            alert("Tu sesión expiró. Inicia sesión nuevamente.");
            localStorage.clear();
            window.location.href = "LogIn.html";
            return Promise.reject(new Error("401"));
        }

        return res;
    }

    // ========= PARÁMETROS DE BÚSQUEDA DESDE INDEX.HTML =========
    function obtenerParametrosBusqueda() {
        const params = new URLSearchParams(window.location.search);

        return {
            origen: (params.get("origen") || "").toLowerCase(),
            destino: (params.get("destino") || "").toLowerCase(),
            fecha: params.get("fecha") || "",
            pasajeros: parseInt(params.get("pasajeros") || "1", 10)
        };
    }

    const filtrosIniciales = obtenerParametrosBusqueda();
    let pasajerosBusqueda = filtrosIniciales.pasajeros;

    // ========= DOM ==========
    const flightList = document.getElementById("flightList");
    const mensajeVuelos = document.getElementById("mensajeVuelos");
    const chips = document.querySelectorAll("#chipsVuelos .chip");

    let vuelosBD = [];

    // ========= Cargar vuelos desde backend ==========
    async function cargarVuelos() {
        mensajeVuelos.textContent = "Cargando vuelos...";
        flightList.innerHTML = "";

        try {
            const res = await fetch("/api/vuelos");
            const data = await res.json();

            vuelosBD = data.vuelos || [];

            // FILTRO AUTOMÁTICO POR URL
            let filtrados = [...vuelosBD];

            if (filtrosIniciales.origen) {
                filtrados = filtrados.filter(v =>
                    v.origen_ciudad.toLowerCase().includes(filtrosIniciales.origen)
                );
            }

            if (filtrosIniciales.destino) {
                filtrados = filtrados.filter(v =>
                    v.destino_ciudad.toLowerCase().includes(filtrosIniciales.destino)
                );
            }

            if (filtrosIniciales.fecha) {
                filtrados = filtrados.filter(v =>
                    v.fecha_salida.startsWith(filtrosIniciales.fecha)
                );
            }

            renderVuelos(filtrados);

            mensajeVuelos.textContent = filtrados.length
                ? `Se encontraron ${filtrados.length} vuelos disponibles`
                : "No se encontraron vuelos con esos criterios.";

        } catch (e) {
            console.error(e);
            mensajeVuelos.textContent = "Error al conectar con el servidor.";
        }
    }

    // ========= Utilidades de formato ==========
    function formatoHora(iso) {
        return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function formatoFecha(iso) {
        return new Date(iso).toLocaleDateString();
    }

    function formatoDuracion(min) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        return `${h}h ${m}m`;
    }

    // ========= Renderizar listado ==========
    function renderVuelos(lista) {
        flightList.innerHTML = "";

        if (!lista.length) {
            flightList.innerHTML = `<p class="texto-muted">No se encontraron vuelos disponibles.</p>`;
            return;
        }

        lista.forEach(v => {
            const card = document.createElement("article");
            card.className = "flight-card glass";

            const duracion = formatoDuracion(v.duracion_min);
            const precioDesde = Number(v.precio_desde || 0).toFixed(2);

            card.innerHTML = `
                <div class="flight-card__airline">
                    <img src="imagenes/AEROMEXICO.jpg">
                    <div>
                        <h3>Vuelo #${v.id_vuelo}</h3>
                        <span class="flight-card__tag ${v.escala === "DIRECTO" ? "" : "flight-card__tag--secondary"}">
                            ${v.escala === "DIRECTO" ? "Vuelo directo" : "Con escalas"}
                        </span>
                    </div>
                </div>

                <div class="flight-card__route">
                    <div>
                        <span>${v.origen_ciudad}</span>
                        <span>${formatoHora(v.fecha_salida)}</span>
                    </div>
                    <div class="flight-card__line">
                        <span class="flight-card__duration">${duracion}</span>
                    </div>
                    <div>
                        <span>${v.destino_ciudad}</span>
                        <span>${formatoHora(v.fecha_llegada)}</span>
                    </div>
                </div>

                <div class="flight-card__info">
                    <strong>$${precioDesde} MXN</strong>
                    <button 
                        class="btn btn--primary btn--sm btn-seleccionar-vuelo"
                        data-id-vuelo="${v.id_vuelo}">
                        Seleccionar vuelo
                    </button>
                </div>
            `;

            flightList.appendChild(card);
        });
    }

    // ========= Chips: directos / precio / duración ==========
    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            chips.forEach(c => c.classList.remove("chip--active"));
            chip.classList.add("chip--active");

            let lista = [...vuelosBD];

            if (chip.dataset.filtro === "directos") {
                lista = lista.filter(v => v.escala === "DIRECTO");
            } else if (chip.dataset.filtro === "precio") {
                lista.sort((a, b) => a.precio_desde - b.precio_desde);
            } else if (chip.dataset.filtro === "duracion") {
                lista.sort((a, b) => a.duracion_min - b.duracion_min);
            }

            renderVuelos(lista);
        });
    });

    // ========= Abrir modal de vuelo ==========
    async function abrirModalVuelo(id_vuelo) {
        try {
            const res = await fetch(`/api/vuelos/${id_vuelo}`);
            const data = await res.json();

            if (data.error) {
                alert("No se pudo obtener detalle del vuelo.");
                return;
            }

            const vuelo = data.vuelo;
            const asientos = data.asientos || [];
            const equipajes = data.equipaje || [];

            const modal = document.createElement("div");
            modal.className = "flight-modal";

            modal.innerHTML = `
                <div class="flight-modal__content glass">
                    <div class="flight-modal__header">
                        <h3>Vuelo #${vuelo.id_vuelo}</h3>
                        <button class="flight-modal__close">&times;</button>
                    </div>

                    <p>
                        ${vuelo.origen_ciudad} → ${vuelo.destino_ciudad}<br>
                        <strong>Salida:</strong> ${formatoFecha(vuelo.fecha_salida)} ${formatoHora(vuelo.fecha_salida)}<br>
                        <strong>Llegada:</strong> ${formatoFecha(vuelo.fecha_llegada)} ${formatoHora(vuelo.fecha_llegada)}<br>
                        <strong>Duración:</strong> ${formatoDuracion(vuelo.duracion_min)}
                    </p>

                    <h4>Selecciona asiento</h4>
                    <div class="flight-modal__options">
                        ${
                            asientos.map(a => `
                                <label class="option-pill">
                                    <input type="radio" name="asiento" value="${a.id_asiento}" data-precio="${a.precio}">
                                    <span>${a.tipo_asiento} — $${a.precio}</span>
                                </label>
                            `).join("")
                        }
                    </div>

                    ${
                        equipajes.length ? `
                        <h4>Equipaje</h4>
                        <div class="flight-modal__options">
                            <label class="option-pill">
                                <input type="radio" name="equipaje" value="" data-precio="0" checked>
                                <span>Sin equipaje</span>
                            </label>
                            ${
                                equipajes.map(e => `
                                    <label class="option-pill">
                                        <input type="radio" name="equipaje" value="${e.id_equipaje}" data-precio="${e.precio_extra}">
                                        <span>${e.tipo} — +$${e.precio_extra}</span>
                                    </label>
                                `).join("")
                            }
                        </div>
                        ` : ""
                    }

                    <div class="flight-modal__footer">
                        <div>
                            Total (${pasajerosBusqueda} pasajero/s): 
                            <strong id="modalTotalVuelo">$0.00 MXN</strong>
                        </div>
                        <button id="btnAgregarCarrito" class="btn btn--primary">Agregar al carrito</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // ========= Cálculo de total ==========
            const totalSpan = modal.querySelector("#modalTotalVuelo");

            function calcularTotal() {
                const asientoSel = modal.querySelector("input[name='asiento']:checked");
                const equipajeSel = modal.querySelector("input[name='equipaje']:checked");

                const pAsiento = asientoSel ? Number(asientoSel.dataset.precio) : 0;
                const pEquipaje = equipajeSel ? Number(equipajeSel.dataset.precio) : 0;

                const total = (pAsiento + pEquipaje) * pasajerosBusqueda;
                totalSpan.textContent = `$${total.toFixed(2)} MXN`;
            }

            modal.querySelectorAll("input[name='asiento']").forEach(r =>
                r.addEventListener("change", calcularTotal)
            );
            modal.querySelectorAll("input[name='equipaje']").forEach(r =>
                r.addEventListener("change", calcularTotal)
            );

            calcularTotal();

            // ========= Cerrar modal ==========
            modal.querySelector(".flight-modal__close").addEventListener("click", () => modal.remove());
            modal.addEventListener("click", e => {
                if (e.target === modal) modal.remove();
            });

            // ========= Agregar al carrito ==========
            modal.querySelector("#btnAgregarCarrito").addEventListener("click", () => {
                const asientoSel = modal.querySelector("input[name='asiento']:checked");

                if (!asientoSel) {
                    alert("Selecciona un asiento.");
                    return;
                }

                const equipajeSel = modal.querySelector("input[name='equipaje']:checked");

                const item = {
                    id_vuelo: vuelo.id_vuelo,
                    origen: vuelo.origen_ciudad,
                    destino: vuelo.destino_ciudad,
                    fecha_salida: vuelo.fecha_salida,
                    fecha_llegada: vuelo.fecha_llegada,
                    id_asiento: Number(asientoSel.value),
                    precio_asiento: Number(asientoSel.dataset.precio),
                    id_equipaje: equipajeSel?.value || null,
                    precio_equipaje: Number(equipajeSel?.dataset.precio || 0),
                    pasajeros: pasajerosBusqueda
                };

                const carrito = JSON.parse(localStorage.getItem("carrito") || "[]");
                carrito.push(item);
                localStorage.setItem("carrito", JSON.stringify(carrito));

                alert("Vuelo agregado al carrito.");
                modal.remove();
            });

        } catch (e) {
            console.error(e);
            alert("Error al obtener el detalle del vuelo.");
        }
    }

    // ========= Listener de cards ==========
    flightList.addEventListener("click", e => {
        const btn = e.target.closest(".btn-seleccionar-vuelo");
        if (!btn) return;

        const id_vuelo = Number(btn.dataset.idVuelo);

        const token = localStorage.getItem("token");
        if (!token) {
            if (confirm("Debes iniciar sesión. ¿Ir al login?"))
                window.location.href = "LogIn.html";
            return;
        }

        abrirModalVuelo(id_vuelo);
    });

    // ========= Iniciar ==========
    cargarVuelos();
});
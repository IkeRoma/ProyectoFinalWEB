/* ============================================================
   vuelos.js — Listado de vuelos + modal de detalle + carrito
===============================================================*/

document.addEventListener("DOMContentLoaded", () => {
    // ========= Helpers de autenticación opcionales ==========
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

    // ========= Referencias DOM =========
    const formBusqueda = document.getElementById("formBusquedaVuelos");
    const inputOrigen = document.getElementById("inputOrigen");
    const inputDestino = document.getElementById("inputDestino");
    const inputFechaSalida = document.getElementById("inputFechaSalida");
    const inputPasajeros = document.getElementById("inputPasajeros");
    const flightList = document.getElementById("flightList");
    const mensajeVuelos = document.getElementById("mensajeVuelos");
    const chips = document.querySelectorAll("#chipsVuelos .chip");

    let vuelosBD = [];
    let pasajerosBusqueda = 1;

    // ========= Cargar vuelos desde backend =========
    async function cargarVuelos() {
        mensajeVuelos.textContent = "Cargando vuelos...";
        flightList.innerHTML = "";

        try {
            const res = await fetch("/api/vuelos");
            const data = await res.json();

            if (data.error) {
                mensajeVuelos.textContent = data.message || "No se pudieron cargar los vuelos.";
                return;
            }

            vuelosBD = data.vuelos || [];
            renderVuelos(vuelosBD);
            mensajeVuelos.textContent = vuelosBD.length
                ? `Se encontraron ${vuelosBD.length} vuelos activos.`
                : "No hay vuelos configurados todavía.";
        } catch (e) {
            console.error(e);
            mensajeVuelos.textContent = "Error al conectar con el servidor.";
        }
    }

    // ========= Renderizar cards de vuelos =========
    function formatoHora(fechaISO) {
        const d = new Date(fechaISO);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function formatoFecha(fechaISO) {
        const d = new Date(fechaISO);
        return d.toLocaleDateString();
    }

    function formatoDuracion(minutos) {
        if (!minutos || minutos <= 0) return "-";
        const h = Math.floor(minutos / 60);
        const m = minutos % 60;
        return `${h}h ${m}m`;
    }

    function renderVuelos(lista) {
        flightList.innerHTML = "";

        if (!lista || lista.length === 0) {
            flightList.innerHTML = "<p class='texto-muted'>No se encontraron vuelos con los filtros seleccionados.</p>";
            return;
        }

        lista.forEach(v => {
            const card = document.createElement("article");
            card.className = "flight-card glass";

            const duracion = formatoDuracion(v.duracion_min);
            const precioDesde = v.precio_desde ? Number(v.precio_desde).toFixed(2) : "0.00";

            card.innerHTML = `
                <div class="flight-card__airline">
                    <img src="imagenes/AEROMEXICO.jpg" alt="Aerolínea">
                    <div>
                        <h3>Vuelo #${v.id_vuelo}</h3>
                        <span class="flight-card__tag ${v.escala === "DIRECTO" ? "" : "flight-card__tag--secondary"}">
                            ${v.escala === "DIRECTO" ? "Vuelo directo" : "Con escalas"}
                        </span>
                    </div>
                </div>
                <div class="flight-card__route">
                    <div>
                        <span class="flight-card__city">${v.origen_ciudad}</span>
                        <span class="flight-card__time">${formatoHora(v.fecha_salida)}</span>
                    </div>
                    <div class="flight-card__line">
                        <span class="flight-card__duration">${duracion}</span>
                        <span class="flight-card__dots"></span>
                    </div>
                    <div>
                        <span class="flight-card__city">${v.destino_ciudad}</span>
                        <span class="flight-card__time">${formatoHora(v.fecha_llegada)}</span>
                    </div>
                </div>
                <div class="flight-card__info">
                    <div class="flight-card__price">
                        <span>Desde</span>
                        <strong>$${precioDesde} MXN</strong>
                    </div>
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

    // ========= Filtro del formulario =========
    formBusqueda.addEventListener("submit", (e) => {
        e.preventDefault();

        const origen = inputOrigen.value.trim().toLowerCase();
        const destino = inputDestino.value.trim().toLowerCase();
        const fecha = inputFechaSalida.value;
        pasajerosBusqueda = parseInt(inputPasajeros.value || "1", 10);

        let filtrados = [...vuelosBD];

        if (origen) {
            filtrados = filtrados.filter(v =>
                (v.origen_ciudad || "").toLowerCase().includes(origen)
            );
        }
        if (destino) {
            filtrados = filtrados.filter(v =>
                (v.destino_ciudad || "").toLowerCase().includes(destino)
            );
        }
        if (fecha) {
            filtrados = filtrados.filter(v => {
                const f = new Date(v.fecha_salida).toISOString().slice(0, 10);
                return f === fecha;
            });
        }

        renderVuelos(filtrados);
        mensajeVuelos.textContent = filtrados.length
            ? `Se encontraron ${filtrados.length} vuelos para tu búsqueda.`
            : "No se encontraron vuelos con esos criterios.";
    });

    // ========= Filtros de chips (directos, precio, duración) =========
    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            chips.forEach(c => c.classList.remove("chip--active"));
            chip.classList.add("chip--active");

            const tipo = chip.dataset.filtro;
            let lista = [...vuelosBD];

            if (tipo === "directos") {
                lista = lista.filter(v => v.escala === "DIRECTO");
            } else if (tipo === "precio") {
                lista.sort((a, b) => (a.precio_desde || 0) - (b.precio_desde || 0));
            } else if (tipo === "duracion") {
                lista.sort((a, b) => (a.duracion_min || 0) - (b.duracion_min || 0));
            }

            renderVuelos(lista);
        });
    });

    // ========= Modal de detalle de vuelo =========
    async function abrirModalVuelo(id_vuelo) {
        try {
            const res = await fetch(`/api/vuelos/${id_vuelo}`);
            const data = await res.json();

            if (data.error) {
                alert(data.message || "No se pudo obtener el detalle del vuelo.");
                return;
            }

            const vuelo = data.vuelo;
            const asientos = data.asientos || [];
            const equipajes = data.equipaje || [];

            const precioBase = asientos.length ? Number(asientos[0].precio || 0) : 0;

            const modal = document.createElement("div");
            modal.className = "flight-modal";

            modal.innerHTML = `
                <div class="flight-modal__content glass">
                    <div class="flight-modal__header">
                        <div>
                            <h3>Vuelo #${vuelo.id_vuelo}</h3>
                            <p class="texto-muted">
                                ${vuelo.origen_ciudad} → ${vuelo.destino_ciudad}<br>
                                <strong>Salida:</strong> ${formatoFecha(vuelo.fecha_salida)} ${formatoHora(vuelo.fecha_salida)}<br>
                                <strong>Llegada:</strong> ${formatoFecha(vuelo.fecha_llegada)} ${formatoHora(vuelo.fecha_llegada)}<br>
                                <strong>Duración:</strong> ${formatoDuracion(vuelo.duracion_min)}
                            </p>
                        </div>
                        <button class="flight-modal__close" aria-label="Cerrar">&times;</button>
                    </div>

                    <div class="flight-modal__body">
                        <h4>Tipo de asiento</h4>
                        <div class="flight-modal__options">
                            ${
                                asientos.length
                                    ? asientos.map(a => `
                                        <label class="option-pill">
                                            <input type="radio" name="asiento" 
                                                value="${a.id_asiento}" 
                                                data-precio="${a.precio}">
                                            <span>${a.tipo_asiento} — $${Number(a.precio).toFixed(2)} MXN</span>
                                        </label>
                                    `).join("")
                                    : "<p class='texto-muted'>No hay asientos configurados para este vuelo.</p>"
                            }
                        </div>

                        ${
                            equipajes.length
                                ? `
                                <h4>Equipaje (opcional)</h4>
                                <div class="flight-modal__options">
                                    <label class="option-pill">
                                        <input type="radio" name="equipaje" value="" data-precio="0" checked>
                                        <span>Sin equipaje extra</span>
                                    </label>
                                    ${
                                        equipajes.map(e => `
                                            <label class="option-pill">
                                                <input type="radio" name="equipaje" 
                                                    value="${e.id_equipaje}" 
                                                    data-precio="${e.precio_extra}">
                                                <span>Tamaño ${e.tipo} — +$${Number(e.precio_extra).toFixed(2)} MXN</span>
                                            </label>
                                        `).join("")
                                    }
                                </div>
                                `
                                : ""
                        }

                        <div class="flight-modal__footer">
                            <div>
                                <span class="texto-muted">Total aproximado (${pasajerosBusqueda} pasajero(s))</span><br>
                                <strong id="modalTotalVuelo">$0.00 MXN</strong>
                            </div>
                            <button class="btn btn--primary" id="btnAgregarCarrito">
                                Agregar al carrito
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const btnCerrar = modal.querySelector(".flight-modal__close");
            const btnAgregarCarrito = modal.querySelector("#btnAgregarCarrito");
            const radiosAsiento = modal.querySelectorAll("input[name='asiento']");
            const radiosEquipaje = modal.querySelectorAll("input[name='equipaje']");
            const totalSpan = modal.querySelector("#modalTotalVuelo");

            function calcularTotal() {
                let precioAsiento = 0;
                let precioEquipaje = 0;

                const selAsiento = modal.querySelector("input[name='asiento']:checked");
                const selEquipaje = modal.querySelector("input[name='equipaje']:checked");

                if (selAsiento) precioAsiento = Number(selAsiento.dataset.precio || 0);
                if (selEquipaje) precioEquipaje = Number(selEquipaje.dataset.precio || 0);

                const total = (precioAsiento + precioEquipaje) * pasajerosBusqueda;
                totalSpan.textContent = `$${total.toFixed(2)} MXN`;
            }

            radiosAsiento.forEach(r => r.addEventListener("change", calcularTotal));
            radiosEquipaje.forEach(r => r.addEventListener("change", calcularTotal));
            calcularTotal();

            function cerrar() {
                modal.remove();
            }

            btnCerrar.addEventListener("click", cerrar);
            modal.addEventListener("click", (e) => {
                if (e.target === modal) cerrar();
            });

            btnAgregarCarrito.addEventListener("click", () => {
                const selAsiento = modal.querySelector("input[name='asiento']:checked");
                if (!selAsiento) {
                    alert("Selecciona al menos un tipo de asiento.");
                    return;
                }

                const selEquipaje = modal.querySelector("input[name='equipaje']:checked");
                const id_asiento = Number(selAsiento.value);
                const precio_asiento = Number(selAsiento.dataset.precio || 0);
                const id_equipaje = selEquipaje && selEquipaje.value ? Number(selEquipaje.value) : null;
                const precio_equipaje = selEquipaje ? Number(selEquipaje.dataset.precio || 0) : 0;

                const item = {
                    id_vuelo: vuelo.id_vuelo,
                    origen: vuelo.origen_ciudad,
                    destino: vuelo.destino_ciudad,
                    fecha_salida: vuelo.fecha_salida,
                    fecha_llegada: vuelo.fecha_llegada,
                    tipo_asiento: asientos.find(a => a.id_asiento === id_asiento)?.tipo_asiento || "",
                    id_asiento,
                    id_equipaje,
                    descripcion_equipaje: id_equipaje
                        ? (equipajes.find(e => e.id_equipaje === id_equipaje)?.tipo || "")
                        : "Sin equipaje extra",
                    precio_asiento,
                    precio_equipaje,
                    pasajeros: pasajerosBusqueda
                };

                const carrito = JSON.parse(localStorage.getItem("carrito") || "[]");
                carrito.push(item);
                localStorage.setItem("carrito", JSON.stringify(carrito));

                alert("Vuelo agregado al carrito.");
                cerrar();
            });

        } catch (e) {
            console.error(e);
            alert("Error al obtener el detalle del vuelo.");
        }
    }

    // ========= Listener del botón "Seleccionar vuelo" =========
    flightList.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-seleccionar-vuelo");
        if (!btn) return;

        const id_vuelo = Number(btn.dataset.idVuelo || btn.getAttribute("data-id-vuelo"));
        if (!id_vuelo) return;

        const token = localStorage.getItem("token");
        if (!token) {
            if (confirm("Necesitas iniciar sesión para continuar con la compra. ¿Ir al login?")) {
                window.location.href = "LogIn.html";
            }
            return;
        }

        abrirModalVuelo(id_vuelo);
    });

    // ========= Inicio =========
    cargarVuelos();
});
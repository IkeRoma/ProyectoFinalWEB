/* ============================================================
   carrito.js — Resumen del pedido + pago + ticket virtual
   Incluye múltiples envíos de equipaje
===============================================================*/

document.addEventListener("DOMContentLoaded", () => {

    function secureHeaders() {
        return {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        };
    }

    async function secureFetch(url, options = {}) {
        options.headers = secureHeaders();
        const res = await fetch(url, options);

        if (res.status === 401) {
            alert("Tu sesión expiró. Vuelve a iniciar sesión.");
            localStorage.clear();
            window.location.href = "LogIn.html";
            throw new Error("401");
        }

        return res;
    }

    const usr = JSON.parse(localStorage.getItem("usuario") || "null");
    if (!usr) {
        alert("Debes iniciar sesión para ver tu carrito.");
        window.location.href = "LogIn.html";
        return;
    }

    // === Elementos DOM ===
    const tbody = document.querySelector("#tablaCarrito tbody");
    const textoVacio = document.getElementById("carritoVacio");

    const totalVuelosSpan = document.getElementById("carritoTotalVuelos");
    const totalEnvioSpan = document.getElementById("carritoTotalEnvio");
    const totalSpan = document.getElementById("carritoTotal");

    const rowEnvio = document.getElementById("rowEnvio");
    const envioResumenTexto = document.getElementById("envioResumenTexto");
    const enviosDetalleCarrito = document.getElementById("enviosDetalleCarrito");

    const selectMetodoPago = document.getElementById("selectMetodoPago");
    const btnPagar = document.getElementById("btnPagar");
    const ticketContainer = document.getElementById("ticketContainer");

    // Modal resumen
    const modalResumen = document.getElementById("modalResumen");
    const modalCarritoDetalle = document.getElementById("modalCarritoDetalle");
    const modalEnviosDetalle = document.getElementById("modalEnviosDetalle");
    const modalMetodoPago = document.getElementById("modalMetodoPago");
    const modalTotal = document.getElementById("modalTotal");
    const btnCerrarModal = document.getElementById("btnCerrarModal");
    const btnConfirmarPago = document.getElementById("btnConfirmarPago");

    let carrito = [];
    let enviosEquipaje = [];


    /* ============================================================
       1. Cargar envíos desde localStorage (múltiples)
    ============================================================*/
    function cargarEnviosLocal() {
        // Soporte para versión vieja (envioEquipaje singular)
        const rawArray = localStorage.getItem("enviosEquipaje");
        const rawSingle = localStorage.getItem("envioEquipaje");
        enviosEquipaje = [];

        if (rawArray) {
            try {
                const arr = JSON.parse(rawArray);
                if (Array.isArray(arr)) enviosEquipaje = arr;
            } catch (e) {
                console.error("Error parseando enviosEquipaje:", e);
            }
        } else if (rawSingle) {
            try {
                const e = JSON.parse(rawSingle);
                if (e) enviosEquipaje = [e];
                localStorage.removeItem("envioEquipaje");
                localStorage.setItem("enviosEquipaje", JSON.stringify(enviosEquipaje));
            } catch (e) {
                console.error("Error parseando envioEquipaje:", e);
            }
        }

        enviosDetalleCarrito.innerHTML = "";
        let totalEnvio = 0;

        if (!enviosEquipaje.length) {
            rowEnvio.style.display = "none";
            totalEnvioSpan.textContent = "0.00";
            envioResumenTexto.textContent = "";
            return 0;
        }

        rowEnvio.style.display = "flex";

        enviosEquipaje.forEach((envio, idx) => {
            const costo = Number(envio.precio_total || 0);
            totalEnvio += costo;

            const div = document.createElement("div");
            div.className = "envio-item-carrito";
            div.innerHTML = `
                <div>
                    <strong>${envio.nombre_tipo}</strong> — ${envio.peso} kg<br>
                    <small>Dirección ID: ${envio.id_direccion || "N/D"}</small>
                </div>
                <div>
                    $${costo.toFixed(2)} MXN
                    <button class="btn-cerrar btn-cerrar--sm" data-envio-index="${idx}" title="Eliminar envío">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            enviosDetalleCarrito.appendChild(div);
        });

        totalEnvioSpan.textContent = totalEnvio.toFixed(2);
        envioResumenTexto.textContent = `Tienes ${enviosEquipaje.length} envío(s) de equipaje.`;

        return totalEnvio;
    }


    /* ============================================================
       2. Cargar carrito (vuelos)
    ============================================================*/
    function cargarCarritoLocal() {
        carrito = JSON.parse(localStorage.getItem("carrito") || "[]");
        tbody.innerHTML = "";
        let totalVuelos = 0;

        if (!carrito.length) {
            textoVacio.style.display = "block";
        } else {
            textoVacio.style.display = "none";
        }

        carrito.forEach((item, index) => {
            const precioAsiento = Number(item.precio_asiento || 0);
            const precioEquipaje = Number(item.precio_equipaje || 0);
            const pasajeros = Number(item.pasajeros || 1);

            const subtotal = (precioAsiento + precioEquipaje) * pasajeros;
            totalVuelos += subtotal;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.origen} → ${item.destino}</td>
                <td>${new Date(item.fecha_salida).toLocaleString()}</td>
                <td>${item.tipo_asiento}<br><small>${item.descripcion_equipaje || ""}</small></td>
                <td>${pasajeros}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td>
                    <button class="btn-cerrar btn-cerrar--sm" data-index="${index}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        totalVuelosSpan.textContent = totalVuelos.toFixed(2);

        const totalEnvio = cargarEnviosLocal();
        const totalGeneral = totalVuelos + totalEnvio;
        totalSpan.textContent = totalGeneral.toFixed(2);
    }


    /* ============================================================
       3. Eliminar item del carrito (vuelos)
    ============================================================*/
    tbody.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-index]");
        if (!btn) return;

        const idx = Number(btn.dataset.index);
        carrito.splice(idx, 1);
        localStorage.setItem("carrito", JSON.stringify(carrito));
        ticketContainer.innerHTML = "";
        cargarCarritoLocal();
    });


    /* ============================================================
       4. Eliminar envío de equipaje desde el carrito
    ============================================================*/
    enviosDetalleCarrito.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-envio-index]");
        if (!btn) return;

        const idx = Number(btn.dataset.envioIndex);
        enviosEquipaje.splice(idx, 1);
        localStorage.setItem("enviosEquipaje", JSON.stringify(enviosEquipaje));
        ticketContainer.innerHTML = "";
        cargarCarritoLocal();
    });


    /* ============================================================
       5. Cargar métodos de pago
    ============================================================*/
    async function cargarMetodosPago() {
        try {
            const res = await secureFetch(`/api/wallet/list/${usr.ID}`);
            const data = await res.json();

            selectMetodoPago.innerHTML =
                `<option value="">Selecciona una tarjeta guardada</option>`;

            if (data.error) return;

            (data.wallet || []).forEach(w => {
                const opt = document.createElement("option");
                opt.value = w.id_wallet;
                opt.textContent = `${w.tipo} •••• ${w.ultimos4} (exp. ${w.fecha_expiracion})`;
                selectMetodoPago.appendChild(opt);
            });

        } catch (e) {
            console.error(e);
        }
    }


    /* ============================================================
       6. Mostrar Tickets + Resumen de envíos
    ============================================================*/
    function mostrarTickets(boletos, pedido, enviosPagados = []) {
        ticketContainer.innerHTML = "";

        if (!boletos || boletos.length === 0) {
            ticketContainer.innerHTML =
                `<p class="texto-muted">No fue posible generar el ticket.</p>`;
            return;
        }

        boletos.forEach(b => {
            const div = document.createElement("div");
            div.className = "ticket-card glass";

            div.innerHTML = `
                <div class="ticket-card__header">
                    <span class="ticket-route">${b.origen_ciudad} → ${b.destino_ciudad}</span>
                    <span class="ticket-code">Código: ${b.codigo_boleto}</span>
                </div>

                <p><strong>Vuelo:</strong> #${b.id_vuelo} | <strong>Asiento:</strong> ${b.tipo_asiento}</p>
                <p><strong>Salida:</strong> ${new Date(b.fecha_salida).toLocaleString()}</p>
                <p><strong>Precio:</strong> $${Number(b.precio_total).toFixed(2)} MXN</p>

                <p class="texto-muted">Pedido #${pedido.id_pedido} | Estado: ${b.estado || "Activo"}</p>
            `;

            ticketContainer.appendChild(div);
        });

        if (enviosPagados && enviosPagados.length) {
            const divEnvios = document.createElement("div");
            divEnvios.className = "ticket-card glass";

            let htmlEnvios = `
                <div class="ticket-card__header">
                    <span class="ticket-route"><i class="fa-solid fa-box"></i> Envíos de equipaje</span>
                    <span class="ticket-code">Total: ${enviosPagados.length}</span>
                </div>
            `;

            let totalEnvio = 0;
            enviosPagados.forEach((e, idx) => {
                const costo = Number(e.precio_total || 0);
                totalEnvio += costo;
                htmlEnvios += `
                    <p><strong>Envío ${idx + 1}:</strong> ${e.nombre_tipo}, ${e.peso} kg — $${costo.toFixed(2)} MXN<br>
                    <small>Dirección ID: ${e.id_direccion || "N/D"}</small></p>
                `;
            });

            htmlEnvios += `<p class="texto-muted"><strong>Total envío:</strong> $${totalEnvio.toFixed(2)} MXN</p>`;
            divEnvios.innerHTML = htmlEnvios;
            ticketContainer.appendChild(divEnvios);
        }
    }


    /* ============================================================
       7. Pago — función real de pago
    ============================================================*/
    async function realizarPago() {
        if (!carrito.length && !enviosEquipaje.length) {
            alert("No tienes nada en el carrito.");
            return;
        }

        const id_wallet = selectMetodoPago.value;
        if (!id_wallet) {
            alert("Selecciona un método de pago.");
            return;
        }

        const items = carrito.map(item => ({
            id_vuelo: item.id_vuelo,
            id_asiento: item.id_asiento,
            id_equipaje: item.id_equipaje || null,
            cantidad: item.pasajeros || 1
        }));

        // Agregamos envíos como un solo objeto con total + detalle
        let envioPayload = null;
        if (enviosEquipaje.length) {
            const totalEnvio = enviosEquipaje.reduce(
                (acc, e) => acc + Number(e.precio_total || 0), 0
            );
            envioPayload = {
                precio_total: totalEnvio,
                envios: enviosEquipaje
            };
        }

        const enviosPagados = [...enviosEquipaje]; // copia para mostrar en ticket

        try {
            const res = await secureFetch("/api/carrito/pagar", {
                method: "POST",
                body: JSON.stringify({
                    id_usuario: usr.ID,
                    id_wallet,
                    items,
                    envio: envioPayload
                })
            });

            const data = await res.json();

            if (data.error) {
                alert(data.message || "No se pudo procesar el pago.");
                return;
            }

            alert("Pago realizado correctamente. Se generó tu ticket virtual.");

            // Limpiamos carrito y envíos
            localStorage.removeItem("carrito");
            localStorage.removeItem("enviosEquipaje");

            cargarCarritoLocal();
            mostrarTickets(
                data.boletos || [],
                data.pedido || { id_pedido: "??" },
                enviosPagados
            );

        } catch (e) {
            console.error(e);
            alert("Error al procesar el pago.");
        }
    }


    /* ============================================================
       8. Abrir modal de resumen antes de pagar
    ============================================================*/
    function abrirModalResumen() {
        if (!carrito.length && !enviosEquipaje.length) {
            alert("Tu carrito está vacío.");
            return;
        }

        const id_wallet = selectMetodoPago.value;
        if (!id_wallet) {
            alert("Selecciona un método de pago.");
            return;
        }

        // Detalle de vuelos
        modalCarritoDetalle.innerHTML = "";
        let totalVuelos = 0;

        carrito.forEach(item => {
            const precioAsiento = Number(item.precio_asiento || 0);
            const precioEquipaje = Number(item.precio_equipaje || 0);
            const pasajeros = Number(item.pasajeros || 1);

            const subtotal = (precioAsiento + precioEquipaje) * pasajeros;
            totalVuelos += subtotal;

            const p = document.createElement("p");
            p.innerHTML = `
                <strong>${item.origen} → ${item.destino}</strong><br>
                ${new Date(item.fecha_salida).toLocaleString()} — 
                ${item.tipo_asiento} x${pasajeros} — $${subtotal.toFixed(2)} MXN
            `;
            modalCarritoDetalle.appendChild(p);
        });

        // Detalle de envíos
        modalEnviosDetalle.innerHTML = "";
        let totalEnvio = 0;

        if (enviosEquipaje.length) {
            enviosEquipaje.forEach((e, idx) => {
                const coste = Number(e.precio_total || 0);
                totalEnvio += coste;

                const p = document.createElement("p");
                p.innerHTML = `
                    <strong>Envío ${idx + 1}:</strong> ${e.nombre_tipo}, ${e.peso} kg — $${coste.toFixed(2)} MXN<br>
                    <small>Dirección ID: ${e.id_direccion || "N/D"}</small>
                `;
                modalEnviosDetalle.appendChild(p);
            });
        } else {
            modalEnviosDetalle.innerHTML = `<p class="texto-muted">No tienes envíos de equipaje.</p>`;
        }

        // Método de pago
        const opt = selectMetodoPago.options[selectMetodoPago.selectedIndex];
        modalMetodoPago.textContent = opt ? opt.textContent : "";

        const totalGeneral = totalVuelos + totalEnvio;
        modalTotal.textContent = `$${totalGeneral.toFixed(2)} MXN`;

        modalResumen.style.display = "flex";
    }

    function cerrarModalResumen() {
        modalResumen.style.display = "none";
    }


    /* ============================================================
       9. Eventos de botones
    ============================================================*/
    btnPagar.addEventListener("click", (e) => {
        e.preventDefault();
        abrirModalResumen();
    });

    btnCerrarModal.addEventListener("click", (e) => {
        e.preventDefault();
        cerrarModalResumen();
    });

    modalResumen.addEventListener("click", (e) => {
        if (e.target.id === "modalResumen") {
            cerrarModalResumen();
        }
    });

    btnConfirmarPago.addEventListener("click", async (e) => {
        e.preventDefault();
        cerrarModalResumen();
        await realizarPago();
    });


    /* ============================================================
       10. Inicio
    ============================================================*/
    cargarCarritoLocal();
    cargarMetodosPago();
});
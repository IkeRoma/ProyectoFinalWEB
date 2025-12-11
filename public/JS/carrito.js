/* ============================================================
   carrito.js — Resumen del pedido + pago + ticket virtual
   Incluye costo de envío de equipaje
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

    // === Elementos ===
    const tbody = document.querySelector("#tablaCarrito tbody");
    const textoVacio = document.getElementById("carritoVacio");

    const totalVuelosSpan = document.getElementById("carritoTotalVuelos");
    const totalEnvioSpan = document.getElementById("carritoTotalEnvio");
    const totalSpan = document.getElementById("carritoTotal");

    const rowEnvio = document.getElementById("rowEnvio");
    const envioResumenTexto = document.getElementById("envioResumenTexto");

    const selectMetodoPago = document.getElementById("selectMetodoPago");
    const btnPagar = document.getElementById("btnPagar");
    const ticketContainer = document.getElementById("ticketContainer");

    let carrito = [];
    let envioEquipaje = null;


    /* ============================================================
       1. Cargar Envío desde localStorage
    ============================================================*/
    function cargarEnvioLocal() {
        const raw = localStorage.getItem("envioEquipaje");
        if (!raw) {
            envioEquipaje = null;
            rowEnvio.style.display = "none";
            envioResumenTexto.textContent = "";
            return 0;
        }

        try {
            envioEquipaje = JSON.parse(raw);
        } catch (e) {
            envioEquipaje = null;
        }

        if (!envioEquipaje || !envioEquipaje.precio_total) {
            rowEnvio.style.display = "none";
            return 0;
        }

        const costo = Number(envioEquipaje.precio_total) || 0;

        rowEnvio.style.display = "flex";
        totalEnvioSpan.textContent = costo.toFixed(2);
        envioResumenTexto.textContent =
            `Envío de maleta: ${envioEquipaje.nombre_tipo} (${envioEquipaje.peso}kg) — $${costo.toFixed(2)} MXN`;

        return costo;
    }


    /* ============================================================
       2. Cargar Carrito
    ============================================================*/
    function cargarCarritoLocal() {
        carrito = JSON.parse(localStorage.getItem("carrito") || "[]");
        tbody.innerHTML = "";
        let totalVuelos = 0;

        if (carrito.length === 0) {
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

        const costoEnvio = cargarEnvioLocal();
        const totalGeneral = totalVuelos + costoEnvio;

        totalSpan.textContent = totalGeneral.toFixed(2);
    }


    /* ============================================================
       3. Eliminar item del carrito
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
       4. Cargar Métodos de Pago
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
       5. Generar Tickets Virtuales
    ============================================================*/
    function mostrarTickets(boletos, pedido) {
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
    }


    /* ============================================================
       6. Pagar
    ============================================================*/
    btnPagar.addEventListener("click", async () => {
        if (!carrito.length) {
            alert("Tu carrito está vacío.");
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

        try {
            const res = await secureFetch("/api/carrito/pagar", {
                method: "POST",
                body: JSON.stringify({
                    id_usuario: usr.ID,
                    id_wallet,
                    items,
                    envio: envioEquipaje || null
                })
            });

            const data = await res.json();

            if (data.error) {
                alert(data.message || "No se pudo procesar el pago.");
                return;
            }

            alert("Pago realizado correctamente. Se generó tu ticket virtual.");

            localStorage.removeItem("carrito");
            localStorage.removeItem("envioEquipaje");

            cargarCarritoLocal();
            mostrarTickets(data.boletos || [], data.pedido || { id_pedido: "??" });

        } catch (e) {
            console.error(e);
            alert("Error al procesar el pago.");
        }
    });


    /* ============================================================
       INICIO
    ============================================================*/
    cargarCarritoLocal();
    cargarMetodosPago();
});
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
            alert("Tu sesión expiró. Inicia sesión nuevamente.");
            localStorage.clear();
            window.location.href = "LogIn.html";
        }

        return res;
    }

    const usr = JSON.parse(localStorage.getItem("usuario") || "null");
    if (!usr) {
        window.location.href = "LogIn.html";
        return;
    }

    const selPedido = document.getElementById("selectPedido");
    const selDireccion = document.getElementById("selectDireccion");
    const cantidad = document.getElementById("cantidad");
    const msg = document.getElementById("msgEnvio");
    const listaEnvios = document.getElementById("listaEnvios");

    /* ================================
       CARGAR PEDIDOS PAGADOS
    ================================= */
    async function cargarPedidos() {
        const res = await secureFetch(`/api/envio/pedidos/${usr.ID}`);
        const data = await res.json();

        selPedido.innerHTML = "";

        if (!data.pedidos || data.pedidos.length === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No tienes pedidos pagados disponibles";
            selPedido.appendChild(opt);
            selPedido.disabled = true;
            return;
        }

        selPedido.disabled = false;

        data.pedidos.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id_pedido;
            opt.textContent = `Pedido #${p.id_pedido} — $${p.total}`;
            selPedido.appendChild(opt);
        });
    }

    /* ================================
       CARGAR DIRECCIONES
    ================================= */
    async function cargarDirecciones() {
        const res = await secureFetch(`/api/envio/direcciones/${usr.ID}`);
        const data = await res.json();

        selDireccion.innerHTML = "";

        if (!data.direcciones || data.direcciones.length === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No tienes direcciones registradas (ve a Mi Perfil)";
            selDireccion.appendChild(opt);
            selDireccion.disabled = true;
            return;
        }

        selDireccion.disabled = false;

        data.direcciones.forEach(d => {
            const opt = document.createElement("option");
            opt.value = d.id_direccion;
            opt.textContent = `${d.calle}, ${d.ciudad}, ${d.estado}, C.P. ${d.cp}`;
            selDireccion.appendChild(opt);
        });
    }

    /* ================================
       HISTORIAL DE ENVÍOS
    ================================= */
    async function cargarHistorial() {
        const res = await secureFetch(`/api/envio/historial/${usr.ID}`);
        const data = await res.json();

        listaEnvios.innerHTML = "";

        if (!data.envios || data.envios.length === 0) {
            listaEnvios.innerHTML = "<p>Aún no tienes envíos registrados.</p>";
            return;
        }

        data.envios.forEach(e => {
            const div = document.createElement("div");
            div.className = "envio-item glass";

            div.innerHTML = `
                <p><strong>Envío #${e.id_envio}</strong></p>
                <p>Pedido: ${e.id_pedido}</p>
                <p>Cantidad: ${e.cantidad}</p>
                <p>Estado: ${e.estado_envio}</p>
                <p>Fecha: ${new Date(e.fecha_envio).toLocaleString()}</p>
                <p>Costo: $${e.costo_envio}</p>
            `;

            listaEnvios.appendChild(div);
        });
    }

    /* ================================
       ENVIAR EQUIPAJE
    ================================= */
    document.getElementById("btnEnviarEquipaje").onclick = async () => {

        msg.textContent = "";
        msg.style.color = "red";

        if (!selPedido.value) {
            msg.textContent = "Selecciona un pedido válido.";
            return;
        }

        if (!selDireccion.value) {
            msg.textContent = "Selecciona una dirección de destino.";
            return;
        }

        if (!cantidad.value || parseInt(cantidad.value) <= 0) {
            msg.textContent = "La cantidad debe ser mayor a 0.";
            return;
        }

        const body = {
            id_usuario: usr.ID,
            id_pedido: selPedido.value,
            id_direccion: selDireccion.value,
            cantidad: parseInt(cantidad.value, 10)
        };

        const res = await secureFetch("/api/envio/crear", {
            method: "POST",
            body: JSON.stringify(body)
        });

        const data = await res.json();

        msg.textContent = data.message;
        msg.style.color = data.error ? "red" : "lime";

        if (!data.error) {
            cargarHistorial();
        }
    };

    /* ================================
       AUTO INICIO
    ================================= */
    cargarPedidos();
    cargarDirecciones();
    cargarHistorial();
});
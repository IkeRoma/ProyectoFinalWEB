/* ============================================================
   admin.js — Panel del Administrador (con JWT)
===============================================================*/

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

document.addEventListener("DOMContentLoaded", () => {
    const usr = JSON.parse(localStorage.getItem("usuario") || "null");
    if (!usr || usr.Rol !== 1) {
        window.location.href = "Index.html";
        return;
    }

    document.getElementById("adminNombre").textContent = usr.Nombre;

    // Carga inicial de cada sección
    cargarUsuarios();
    cargarWalletAdmin();
    cargarAeropuertos();
    cargarVuelosAdmin();
    cargarAsientos();
    cargarEquipaje();
    cargarTiposMaleta();
    cargarPedidos();
    cargarPagos();
    cargarBoletos();

    // ===== Filtros & botones =====
    document.getElementById("btnFiltrarUsuarios").onclick = () => {
        const id = document.getElementById("filtroUsuarioId").value;
        cargarUsuarios(id || null);
    };
    document.getElementById("btnVerTodosUsuarios").onclick = () => cargarUsuarios();

    document.getElementById("btnFiltrarAeropuertos").onclick = () => {
        const id = document.getElementById("filtroAeropuertoId").value;
        cargarAeropuertos(id || null);
    };
    document.getElementById("btnVerTodosAeropuertos").onclick = () => cargarAeropuertos();

    document.getElementById("btnFiltrarVuelos").onclick = () => {
        const id = document.getElementById("filtroVueloId").value;
        cargarVuelosAdmin(id || null);
    };
    document.getElementById("btnVerTodosVuelos").onclick = () => cargarVuelosAdmin();

    document.getElementById("btnFiltrarAsientos").onclick = () => {
        const id = document.getElementById("filtroAsientoId").value;
        cargarAsientos(id || null);
    };
    document.getElementById("btnVerTodosAsientos").onclick = () => cargarAsientos();

    document.getElementById("btnFiltrarEquipaje").onclick = () => {
        const id = document.getElementById("filtroEquipajeId").value;
        cargarEquipaje(id || null);
    };
    document.getElementById("btnVerTodoEquipaje").onclick = () => cargarEquipaje();

    document.getElementById("btnFiltrarMaletas").onclick = () => {
        const id = document.getElementById("filtroMaletaId").value;
        cargarTiposMaleta(id || null);
    };
    document.getElementById("btnVerTodasMaletas").onclick = () => cargarTiposMaleta();

    document.getElementById("btnFiltrarPedidos").onclick = () => {
        const id = document.getElementById("filtroPedidoId").value;
        cargarPedidos(id || null);
    };
    document.getElementById("btnVerTodosPedidos").onclick = () => cargarPedidos();

    document.getElementById("btnFiltrarPagos").onclick = () => {
        const id = document.getElementById("filtroPagoId").value;
        cargarPagos(id || null);
    };
    document.getElementById("btnVerTodosPagos").onclick = () => cargarPagos();

    document.getElementById("btnFiltrarBoletos").onclick = () => {
        const id = document.getElementById("filtroBoletoId").value;
        cargarBoletos(id || null);
    };
    document.getElementById("btnVerTodosBoletos").onclick = () => cargarBoletos();

    // Formularios
    document.getElementById("formAeropuerto").addEventListener("submit", guardarAeropuerto);
    document.getElementById("formVuelo").addEventListener("submit", guardarVuelo);
    document.getElementById("formAsiento").addEventListener("submit", guardarAsiento);
    document.getElementById("formEquipaje").addEventListener("submit", guardarEquipaje);
    document.getElementById("formMaleta").addEventListener("submit", guardarMaleta);
    document.getElementById("formPedido").addEventListener("submit", guardarPedidoAdmin);
    document.getElementById("formPago").addEventListener("submit", guardarPagoAdmin);
    document.getElementById("formBoleto").addEventListener("submit", guardarBoletoAdmin);
});

// ================================
// Usuarios
// ================================
async function cargarUsuarios(idFiltro = null) {
    const res = await secureFetch("/api/listar");
    const data = await res.json();

    const tbody = document.querySelector("#tablaUsuarios tbody");
    tbody.innerHTML = "";

    let lista = data.usuarios || [];
    if (idFiltro) {
        lista = lista.filter(u => u.ID === Number(idFiltro));
    }

    lista.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td>${u.ID}</td>
                <td>${u.Nombre} ${u.Apellido}</td>
                <td>${u.Correo}</td>
                <td>${u.Rol === 1 ? "Admin" : "Usuario"}</td>
                <button class="btnVV" onclick='abrirModalEditarUsuario(${JSON.stringify(u)})'>Editar</button>
                <button class="btnVV-cerrar" onclick="eliminarUsuario(${u.ID})">Eliminar</button>
            </tr>
        `;
    });
}

async function eliminarUsuario(id) {
    if (!confirm("¿Eliminar este usuario?")) return;

    const res = await secureFetch("/api/eliminar", {
        method: "POST",
        body: JSON.stringify({ id })
    });

    const data = await res.json();
    alert(data.message);
    cargarUsuarios();
}

// ================================
// Wallet global
// ================================
async function cargarWalletAdmin() {
    const resUsuarios = await secureFetch("/api/listar");
    const usuarios = (await resUsuarios.json()).usuarios;

    const tbody = document.querySelector("#tablaWallet tbody");
    tbody.innerHTML = "";

    for (const user of usuarios) {
        const res = await secureFetch(`/api/wallet/list/${user.ID}`);
        const data = await res.json();

        (data.wallet || []).forEach(w => {
            tbody.innerHTML += `
                <tr>
                    <td>${w.id_wallet}</td>
                    <td>${user.Nombre} ${user.Apellido}</td>
                    <td>${w.tipo}</td>
                    <td>${w.bin}</td>
                    <td>${w.ultimos4}</td>
                    <td>${w.fecha_expiracion}</td>
                    <td><button onclick="adminEliminarTarjeta(${w.id_wallet})">Eliminar</button></td>
                </tr>
            `;
        });
    }
}

async function adminEliminarTarjeta(id_wallet) {
    if (!confirm("¿Eliminar esta tarjeta?")) return;

    const res = await secureFetch("/api/wallet/delete", {
        method: "POST",
        body: JSON.stringify({ id_wallet })
    });

    const data = await res.json();
    alert(data.message);
    cargarWalletAdmin();
}

// ================================
// Aeropuertos
// ================================
async function cargarAeropuertos(idFiltro = null) {
    let url = "/api/admin/aeropuertos";
    if (idFiltro) url += `?id=${encodeURIComponent(idFiltro)}`;

    const res = await secureFetch(url);
    const data = await res.json();

    const tbody = document.querySelector("#tablaAeropuertos tbody");
    tbody.innerHTML = "";

    (data.aeropuertos || []).forEach(a => {
        tbody.innerHTML += `
            <tr>
                <td>${a.id_aeropuerto}</td>
                <td>${a.nombre}</td>
                <td>${a.ciudad}</td>
                <td>${a.estado}</td>
                <td>${a.activo ? "Sí" : "No"}</td>
                <td>
                    <button onclick='editarAeropuerto(${a.id_aeropuerto})'>Editar</button>
                    <button onclick='eliminarAeropuerto(${a.id_aeropuerto})'>Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarAeropuerto(id) {
    const res = await secureFetch(`/api/admin/aeropuertos?id=${id}`);
    const data = await res.json();
    const a = (data.aeropuertos || [])[0];
    if (!a) return;

    document.getElementById("aeropuertoId").value = a.id_aeropuerto;
    document.getElementById("aeropuertoNombre").value = a.nombre;
    document.getElementById("aeropuertoCiudad").value = a.ciudad;
    document.getElementById("aeropuertoEstado").value = a.estado;
}

async function eliminarAeropuerto(id) {
    if (!confirm("¿Eliminar aeropuerto (DELETE real)?")) return;

    const res = await secureFetch("/api/admin/aeropuertos/delete", {
        method: "POST",
        body: JSON.stringify({ id_aeropuerto: id })
    });

    const data = await res.json();
    alert(data.message);
    cargarAeropuertos();
}

async function guardarAeropuerto(e) {
    e.preventDefault();

    const id = document.getElementById("aeropuertoId").value;
    const nombre = document.getElementById("aeropuertoNombre").value.trim();
    const ciudad = document.getElementById("aeropuertoCiudad").value.trim();
    const estado = document.getElementById("aeropuertoEstado").value.trim();

    if (!nombre || !ciudad || !estado) {
        alert("Completa todos los campos de aeropuerto.");
        return;
    }

    const ruta = id ? "/api/admin/aeropuertos/update" : "/api/admin/aeropuertos/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({ id_aeropuerto: id || null, nombre, ciudad, estado })
    });

    const data = await res.json();
    alert(data.message);

    e.target.reset();
    document.getElementById("aeropuertoId").value = "";
    cargarAeropuertos();
}

// ================================
// Vuelos
// ================================
async function cargarVuelosAdmin(idFiltro = null) {
    let url = "/api/admin/vuelos";
    if (idFiltro) url += `?id=${encodeURIComponent(idFiltro)}`;

    const res = await secureFetch(url);
    const data = await res.json();

    const tbody = document.querySelector("#tablaVuelos tbody");
    tbody.innerHTML = "";

    (data.vuelos || []).forEach(v => {
        tbody.innerHTML += `
            <tr>
                <td>${v.id_vuelo}</td>
                <td>${v.origen_ciudad}</td>
                <td>${v.destino_ciudad}</td>
                <td>${new Date(v.fecha_salida).toLocaleString()}</td>
                <td>${new Date(v.fecha_llegada).toLocaleString()}</td>
                <td>${v.escala}</td>
                <td>${v.activo ? "Sí" : "No"}</td>
                <td>
                    <button onclick="editarVuelo(${v.id_vuelo})">Editar</button>
                    <button onclick="eliminarVuelo(${v.id_vuelo})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarVuelo(id) {
    const res = await secureFetch(`/api/admin/vuelos?id=${id}`);
    const data = await res.json();
    const v = (data.vuelos || [])[0];
    if (!v) return;

    document.getElementById("vueloId").value = v.id_vuelo;
    document.getElementById("vueloOrigen").value = v.id_origen;
    document.getElementById("vueloDestino").value = v.id_destino;
    document.getElementById("vueloFechaSalida").value = v.fecha_salida.replace(" ", "T");
    document.getElementById("vueloFechaLlegada").value = v.fecha_llegada.replace(" ", "T");
    document.getElementById("vueloEscala").value = v.escala;
    document.getElementById("vueloNumEscalas").value = v.numero_escalas || 0;
}

async function eliminarVuelo(id) {
    if (!confirm("¿Eliminar vuelo (DELETE real)?")) return;

    const res = await secureFetch("/api/admin/vuelos/delete", {
        method: "POST",
        body: JSON.stringify({ id_vuelo: id })
    });

    const data = await res.json();
    alert(data.message);
    cargarVuelosAdmin();
}

async function guardarVuelo(e) {
    e.preventDefault();

    const id_vuelo = document.getElementById("vueloId").value;
    const id_origen = Number(document.getElementById("vueloOrigen").value);
    const id_destino = Number(document.getElementById("vueloDestino").value);
    const fecha_salida = document.getElementById("vueloFechaSalida").value;
    const fecha_llegada = document.getElementById("vueloFechaLlegada").value;
    const escala = document.getElementById("vueloEscala").value;
    const numero_escalas = Number(document.getElementById("vueloNumEscalas").value || "0");

    if (!id_origen || !id_destino || !fecha_salida || !fecha_llegada) {
        alert("Completa todos los campos del vuelo.");
        return;
    }

    const ruta = id_vuelo ? "/api/admin/vuelos/update" : "/api/admin/vuelos/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({
            id_vuelo: id_vuelo || null,
            id_origen,
            id_destino,
            fecha_salida,
            fecha_llegada,
            escala,
            numero_escalas
        })
    });

    const data = await res.json();
    alert(data.message);

    e.target.reset();
    document.getElementById("vueloId").value = "";
    cargarVuelosAdmin();
}

// ================================
// Asientos
// ================================
async function cargarAsientos(idFiltro = null) {
    let url = "/api/admin/asientos";
    if (idFiltro) url += `?id=${encodeURIComponent(idFiltro)}`;

    const res = await secureFetch(url);
    const data = await res.json();

    const tbody = document.querySelector("#tablaAsientos tbody");
    tbody.innerHTML = "";

    (data.asientos || []).forEach(a => {
        tbody.innerHTML += `
            <tr>
                <td>${a.id_asiento}</td>
                <td>${a.id_vuelo}</td>
                <td>${a.tipo_asiento}</td>
                <td>${Number(a.precio).toFixed(2)}</td>
                <td>${a.stock}</td>
                <td>${a.activo ? "Sí" : "No"}</td>
                <td>
                    <button onclick="editarAsiento(${a.id_asiento})">Editar</button>
                    <button onclick="eliminarAsiento(${a.id_asiento})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarAsiento(id) {
    const res = await secureFetch(`/api/admin/asientos?id=${id}`);
    const data = await res.json();
    const a = (data.asientos || [])[0];
    if (!a) return;

    document.getElementById("asientoId").value = a.id_asiento;
    document.getElementById("asientoVuelo").value = a.id_vuelo;
    document.getElementById("asientoTipo").value = a.tipo_asiento;
    document.getElementById("asientoPrecio").value = a.precio;
    document.getElementById("asientoStock").value = a.stock;
}

async function eliminarAsiento(id) {
    if (!confirm("¿Eliminar asiento (DELETE real)?")) return;

    const res = await secureFetch("/api/admin/asientos/delete", {
        method: "POST",
        body: JSON.stringify({ id_asiento: id })
    });

    const data = await res.json();
    alert(data.message);
    cargarAsientos();
}

async function guardarAsiento(e) {
    e.preventDefault();

    const id_asiento = document.getElementById("asientoId").value;
    const id_vuelo = Number(document.getElementById("asientoVuelo").value);
    const tipo_asiento = document.getElementById("asientoTipo").value;
    const precio = Number(document.getElementById("asientoPrecio").value);
    const stock = Number(document.getElementById("asientoStock").value);

    if (!id_vuelo || !precio || stock < 0) {
        alert("Completa correctamente los campos del asiento.");
        return;
    }

    const ruta = id_asiento ? "/api/admin/asientos/update" : "/api/admin/asientos/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({
            id_asiento: id_asiento || null,
            id_vuelo,
            tipo_asiento,
            precio,
            stock
        })
    });

    const data = await res.json();
    alert(data.message);

    e.target.reset();
    document.getElementById("asientoId").value = "";
    cargarAsientos();
}

// ================================
// Equipaje Vuelo
// ================================
async function cargarEquipaje(idFiltro = null) {
    let url = "/api/admin/equipaje";
    if (idFiltro) url += `?id=${encodeURIComponent(idFiltro)}`;

    const res = await secureFetch(url);
    const data = await res.json();

    const tbody = document.querySelector("#tablaEquipaje tbody");
    tbody.innerHTML = "";

    (data.equipaje || []).forEach(e => {
        tbody.innerHTML += `
            <tr>
                <td>${e.id_equipaje}</td>
                <td>${e.id_vuelo}</td>
                <td>${e.tipo}</td>
                <td>${Number(e.precio_extra).toFixed(2)}</td>
                <td>${e.activo ? "Sí" : "No"}</td>
                <td>
                    <button onclick="editarEquipaje(${e.id_equipaje})">Editar</button>
                    <button onclick="eliminarEquipaje(${e.id_equipaje})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarEquipaje(id) {
    const res = await secureFetch(`/api/admin/equipaje?id=${id}`);
    const data = await res.json();
    const e = (data.equipaje || [])[0];
    if (!e) return;

    document.getElementById("equipajeId").value = e.id_equipaje;
    document.getElementById("equipajeVuelo").value = e.id_vuelo;
    document.getElementById("equipajeTipo").value = e.tipo;
    document.getElementById("equipajePrecio").value = e.precio_extra;
}

async function eliminarEquipaje(id) {
    if (!confirm("¿Eliminar configuración de equipaje (DELETE real)?")) return;

    const res = await secureFetch("/api/admin/equipaje/delete", {
        method: "POST",
        body: JSON.stringify({ id_equipaje: id })
    });

    const data = await res.json();
    alert(data.message);
    cargarEquipaje();
}

async function guardarEquipaje(e) {
    e.preventDefault();

    const id_equipaje = document.getElementById("equipajeId").value;
    const id_vuelo = Number(document.getElementById("equipajeVuelo").value);
    const tipo = document.getElementById("equipajeTipo").value;
    const precio_extra = Number(document.getElementById("equipajePrecio").value);

    if (!id_vuelo || !precio_extra) {
        alert("Completa los campos de equipaje.");
        return;
    }

    const ruta = id_equipaje ? "/api/admin/equipaje/update" : "/api/admin/equipaje/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({
            id_equipaje: id_equipaje || null,
            id_vuelo,
            tipo,
            precio_extra
        })
    });

    const data = await res.json();
    alert(data.message);

    e.target.reset();
    document.getElementById("equipajeId").value = "";
    cargarEquipaje();
}

// ================================
// Tipos de maleta (envío)
// ================================
async function cargarTiposMaleta(idFiltro = null) {
    let url = "/api/admin/tipos-maleta";
    if (idFiltro) url += `?id=${encodeURIComponent(idFiltro)}`;

    const res = await secureFetch(url);
    const data = await res.json();

    const tbody = document.querySelector("#tablaMaletas tbody");
    tbody.innerHTML = "";

    (data.tipos || []).forEach(t => {
        tbody.innerHTML += `
            <tr>
                <td>${t.id_tipo_maleta}</td>
                <td>${t.nombre}</td>
                <td>${t.peso_max} kg</td>
                <td>$${Number(t.precio_base).toFixed(2)}</td>
                <td>$${Number(t.tarifa_kg_extra).toFixed(2)}</td>
                <td>
                    <button onclick="editarMaleta(${t.id_tipo_maleta})">Editar</button>
                    <button onclick="eliminarMaleta(${t.id_tipo_maleta})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarMaleta(id) {
    const res = await secureFetch(`/api/admin/tipos-maleta?id=${id}`);
    const data = await res.json();
    const t = (data.tipos || [])[0];
    if (!t) return;

    document.getElementById("maletaId").value = t.id_tipo_maleta;
    document.getElementById("maletaNombre").value = t.nombre;
    document.getElementById("maletaPesoMax").value = t.peso_max;
    document.getElementById("maletaBase").value = t.precio_base;
    document.getElementById("maletaTarifa").value = t.tarifa_kg_extra;
}

async function eliminarMaleta(id) {
    if (!confirm("¿Eliminar tipo de maleta (DELETE real)?")) return;

    const res = await secureFetch("/api/admin/tipos-maleta/delete", {
        method: "POST",
        body: JSON.stringify({ id_tipo_maleta: id })
    });

    const data = await res.json();
    alert(data.message);
    cargarTiposMaleta();
}

async function guardarMaleta(e) {
    e.preventDefault();

    const id_tipo_maleta = document.getElementById("maletaId").value;
    const nombre = document.getElementById("maletaNombre").value.trim();
    const peso_max = Number(document.getElementById("maletaPesoMax").value);
    const precio_base = Number(document.getElementById("maletaBase").value);
    const tarifa_kg_extra = Number(document.getElementById("maletaTarifa").value);

    if (!nombre || !peso_max || !precio_base || !tarifa_kg_extra) {
        alert("Completa todos los campos del tipo de maleta.");
        return;
    }

    const ruta = id_tipo_maleta ? "/api/admin/tipos-maleta/update" : "/api/admin/tipos-maleta/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({
            id_tipo_maleta: id_tipo_maleta || null,
            nombre,
            peso_max,
            precio_base,
            tarifa_kg_extra
        })
    });

    const data = await res.json();
    alert(data.message);

    e.target.reset();
    document.getElementById("maletaId").value = "";
    cargarTiposMaleta();
}

// ================================
// PEDIDOS (admin)
// ================================
async function cargarPedidos(idFiltro = null) {
    let url = "/api/admin/pedidos";
    if (idFiltro) url += `?id=${encodeURIComponent(idFiltro)}`;

    const res = await secureFetch(url);
    const data = await res.json();
    const tbody = document.querySelector("#tablaPedidos tbody");
    tbody.innerHTML = "";

    (data.pedidos || []).forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.id_pedido}</td>
                <td>${p.id_usuario}</td>
                <td>${p.id_wallet}</td>
                <td>$${Number(p.total).toFixed(2)}</td>
                <td>${p.estado}</td>
                <td>
                    <button onclick="editarPedidoAdmin(${p.id_pedido})">Editar</button>
                    <button onclick="eliminarPedidoAdmin(${p.id_pedido})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarPedidoAdmin(id) {
    const res = await secureFetch(`/api/admin/pedidos?id=${id}`);
    const data = await res.json();
    const p = (data.pedidos || [])[0];
    if (!p) return;

    document.getElementById("pedidoId").value = p.id_pedido;
    document.getElementById("pedidoUsuario").value = p.id_usuario;
    document.getElementById("pedidoWallet").value = p.id_wallet;
    document.getElementById("pedidoTotal").value = p.total;
    document.getElementById("pedidoEstado").value = p.estado;
}

async function eliminarPedidoAdmin(id) {
    if (!confirm("¿Eliminar pedido (DELETE real)?")) return;

    const res = await secureFetch("/api/admin/pedidos/delete", {
        method: "POST",
        body: JSON.stringify({ id_pedido: id })
    });

    const data = await res.json();
    alert(data.message);
    cargarPedidos();
}

async function guardarPedidoAdmin(e) {
    e.preventDefault();

    const id_pedido = document.getElementById("pedidoId").value;
    const id_usuario = Number(document.getElementById("pedidoUsuario").value);
    const id_wallet = Number(document.getElementById("pedidoWallet").value);
    const total = Number(document.getElementById("pedidoTotal").value);
    const estado = document.getElementById("pedidoEstado").value.trim();

    if (!id_usuario || !id_wallet || !total || !estado) {
        alert("Completa todos los campos del pedido.");
        return;
    }

    const ruta = id_pedido ? "/api/admin/pedidos/update" : "/api/admin/pedidos/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({
            id_pedido: id_pedido || null,
            id_usuario,
            id_wallet,
            total,
            estado
        })
    });

    const data = await res.json();
    alert(data.message);

    e.target.reset();
    document.getElementById("pedidoId").value = "";
    cargarPedidos();
}

// ================================
// PAGOS (admin)
// ================================
async function cargarPagos(idFiltro = null) {
    let url = "/api/admin/pagos";
    if (idFiltro) url += `?id=${encodeURIComponent(idFiltro)}`;

    const res = await secureFetch(url);
    const data = await res.json();
    const tbody = document.querySelector("#tablaPagos tbody");
    tbody.innerHTML = "";

    (data.pagos || []).forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.id_pago}</td>
                <td>${p.id_usuario}</td>
                <td>${p.id_pedido}</td>
                <td>$${Number(p.monto).toFixed(2)}</td>
                <td>${p.estado}</td>
                <td>
                    <button onclick="editarPagoAdmin(${p.id_pago})">Editar</button>
                    <button onclick="eliminarPagoAdmin(${p.id_pago})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarPagoAdmin(id) {
    const res = await secureFetch(`/api/admin/pagos?id=${id}`);
    const data = await res.json();
    const p = (data.pagos || [])[0];
    if (!p) return;

    document.getElementById("pagoId").value = p.id_pago;
    document.getElementById("pagoUsuario").value = p.id_usuario;
    document.getElementById("pagoPedido").value = p.id_pedido;
    document.getElementById("pagoMonto").value = p.monto;
    document.getElementById("pagoEstado").value = p.estado;
}

async function eliminarPagoAdmin(id) {
    if (!confirm("¿Eliminar pago (DELETE real)?")) return;

    const res = await secureFetch("/api/admin/pagos/delete", {
        method: "POST",
        body: JSON.stringify({ id_pago: id })
    });

    const data = await res.json();
    alert(data.message);
    cargarPagos();
}

async function guardarPagoAdmin(e) {
    e.preventDefault();

    const id_pago = document.getElementById("pagoId").value;
    const id_usuario = Number(document.getElementById("pagoUsuario").value);
    const id_pedido = Number(document.getElementById("pagoPedido").value);
    const monto = Number(document.getElementById("pagoMonto").value);
    const estado = document.getElementById("pagoEstado").value.trim();

    if (!id_usuario || !id_pedido || !monto || !estado) {
        alert("Completa todos los campos del pago.");
        return;
    }

    const ruta = id_pago ? "/api/admin/pagos/update" : "/api/admin/pagos/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({
            id_pago: id_pago || null,
            id_usuario,
            id_pedido,
            monto,
            estado
        })
    });

    const data = await res.json();
    alert(data.message);

    e.target.reset();
    document.getElementById("pagoId").value = "";
    cargarPagos();
}

// ================================
// BOLETOS (admin)
// ================================
async function cargarBoletos(idFiltro = null) {
    let url = "/api/admin/boletos";
    if (idFiltro) url += `?id=${encodeURIComponent(idFiltro)}`;

    const res = await secureFetch(url);
    const data = await res.json();
    const tbody = document.querySelector("#tablaBoletos tbody");
    tbody.innerHTML = "";

    (data.boletos || []).forEach(b => {
        tbody.innerHTML += `
            <tr>
                <td>${b.id_boleto}</td>
                <td>${b.id_usuario}</td>
                <td>${b.id_vuelo}</td>
                <td>${b.id_asiento}</td>
                <td>${b.id_equipaje || "-"}</td>
                <td>${b.id_pedido}</td>
                <td>$${Number(b.precio_total).toFixed(2)}</td>
                <td>${b.estado}</td>
                <td>
                    <button onclick="editarBoletoAdmin(${b.id_boleto})">Editar</button>
                    <button onclick="eliminarBoletoAdmin(${b.id_boleto})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarBoletoAdmin(id) {
    const res = await secureFetch(`/api/admin/boletos?id=${id}`);
    const data = await res.json();
    const b = (data.boletos || [])[0];
    if (!b) return;

    document.getElementById("boletoId").value = b.id_boleto;
    document.getElementById("boletoUsuario").value = b.id_usuario;
    document.getElementById("boletoVuelo").value = b.id_vuelo;
    document.getElementById("boletoAsiento").value = b.id_asiento;
    document.getElementById("boletoEquipaje").value = b.id_equipaje || "";
    document.getElementById("boletoPedido").value = b.id_pedido;
    document.getElementById("boletoPrecio").value = b.precio_total;
    document.getElementById("boletoEstado").value = b.estado;
}

async function eliminarBoletoAdmin(id) {
    if (!confirm("¿Eliminar boleto (DELETE real)?")) return;

    const res = await secureFetch("/api/admin/boletos/delete", {
        method: "POST",
        body: JSON.stringify({ id_boleto: id })
    });

    const data = await res.json();
    alert(data.message);
    cargarBoletos();
}

async function guardarBoletoAdmin(e) {
    e.preventDefault();

    const id_boleto = document.getElementById("boletoId").value;
    const id_usuario = Number(document.getElementById("boletoUsuario").value);
    const id_vuelo = Number(document.getElementById("boletoVuelo").value);
    const id_asiento = Number(document.getElementById("boletoAsiento").value);
    const id_equipaje = document.getElementById("boletoEquipaje").value
        ? Number(document.getElementById("boletoEquipaje").value)
        : null;
    const id_pedido = Number(document.getElementById("boletoPedido").value);
    const precio_total = Number(document.getElementById("boletoPrecio").value);
    const estado = document.getElementById("boletoEstado").value.trim();

    if (!id_usuario || !id_vuelo || !id_asiento || !id_pedido || !precio_total || !estado) {
        alert("Completa todos los campos obligatorios del boleto.");
        return;
    }

    const ruta = id_boleto ? "/api/admin/boletos/update" : "/api/admin/boletos/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({
            id_boleto: id_boleto || null,
            id_usuario,
            id_vuelo,
            id_asiento,
            id_equipaje,
            id_pedido,
            precio_total,
            estado
        })
    });

    const data = await res.json();
    alert(data.message);

    e.target.reset();
    document.getElementById("boletoId").value = "";
    cargarBoletos();
}

    // =====================
    // CREAR USUARIO (modal)
    // =====================
    function abrirModalCrearUsuario() {
        document.getElementById("modalCrearUsuario").classList.remove("oculto");
    }

    function cerrarModalCrearUsuario() {
        document.getElementById("modalCrearUsuario").classList.add("oculto");
    }

    // =====================
    // EDITAR USUARIO (modal)
    // =====================
    function abrirModalEditarUsuario() {
        document.getElementById("modalEditarUsuario").classList.remove("oculto");
    }

    function cerrarModalEditarUsuario() {
        document.getElementById("modalEditarUsuario").classList.add("oculto");
    }

    // =============================================
// CREAR USUARIO
// =============================================
async function crearUsuario() {
    const usuario = {
        Nombre: document.getElementById("nuevoNombre").value.trim(),
        Apellido: document.getElementById("nuevoApellido").value.trim(),
        Correo: document.getElementById("nuevoCorreo").value.trim(),
        Telefono: document.getElementById("nuevoTelefono").value.trim(),
        Contrasena: document.getElementById("nuevoPassword").value,
        Rol: Number(document.getElementById("nuevoRol").value)
    };

    if (!usuario.Nombre || !usuario.Apellido || !usuario.Correo || !usuario.Contrasena) {
        return alert("Completa todos los campos obligatorios.");
    }

    alert("Aquí llamas a tu endpoint para crear usuario.");

    cerrarModalCrearUsuario();
    cargarUsuarios();
}

    // =============================================
    // CARGAR USUARIO EN MODAL DE EDICIÓN
    // =============================================
    async function editarUsuario(id) {
        const res = await secureFetch("/api/listar");
        const data = await res.json();

        const u = data.usuarios.find(x => x.ID === id);
        if (!u) return alert("Usuario no encontrado.");

        document.getElementById("editUserId").value = u.ID;
        document.getElementById("editNombre").value = u.Nombre;
        document.getElementById("editApellido").value = u.Apellido;
        document.getElementById("editCorreo").value = u.Correo;
        document.getElementById("editTelefono").value = u.Telefono || "";
        document.getElementById("editRol").value = u.Rol;

        abrirModalEditarUsuario();
    }

    // =============================================
    // GUARDAR CAMBIOS DE USUARIO
    // =============================================
    async function guardarEdicionUsuario() {
        const usuario = {
            ID: Number(document.getElementById("editUserId").value),
            Nombre: document.getElementById("editNombre").value.trim(),
            Apellido: document.getElementById("editApellido").value.trim(),
            Correo: document.getElementById("editCorreo").value.trim(),
            Telefono: document.getElementById("editTelefono").value.trim(),
            Rol: Number(document.getElementById("editRol").value)
        };

        alert("Aquí llamas a tu endpoint para actualizar usuario.");

        cerrarModalEditarUsuario();
        cargarUsuarios();
    }

    /* ============================
   MODALES: ABRIR / CERRAR
============================ */

function abrirModalCrearUsuario() {
    document.getElementById("modalCrearUsuario").classList.remove("oculto");
}

function cerrarModalCrearUsuario() {
    document.getElementById("modalCrearUsuario").classList.add("oculto");
}

function abrirModalEditarUsuario(u) {
    document.getElementById("modalEditarUsuario").classList.remove("oculto");

    document.getElementById("editID").value = u.ID;
    document.getElementById("editNombre").value = u.Nombre;
    document.getElementById("editApellido").value = u.Apellido;
    document.getElementById("editCorreo").value = u.Correo;
    document.getElementById("editTelefono").value = u.Telefono;
    document.getElementById("editRol").value = u.Rol;
}

function cerrarModalEditarUsuario() {
    document.getElementById("modalEditarUsuario").classList.add("oculto");
}

/* ============================
    GUARDAR USUARIO (FRONT ONLY)
============================ */

function guardarNuevoUsuario() {
    alert("Aquí llamas a tu endpoint /add para crear usuario.");
    cerrarModalCrearUsuario();
}

function guardarEdicionUsuario() {
    alert("Aquí llamas a tu endpoint /update para editar usuario.");
    cerrarModalEditarUsuario();
}

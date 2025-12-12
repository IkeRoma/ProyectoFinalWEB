/* ============================================================
   admin.js — Panel del Administrador (Optimizado)
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

/* ============================================================
   INICIO DEL PANEL ADMIN — CARGA SECUENCIAL
===============================================================*/
document.addEventListener("DOMContentLoaded", async () => {
    const usr = JSON.parse(localStorage.getItem("usuario") || "null");
    if (!usr || usr.Rol !== 1) {
        window.location.href = "Index.html";
        return;
    }

    document.getElementById("adminNombre").textContent = usr.Nombre;

    /* 🔥 CARGA SECUENCIAL INTELIGENTE */
    try {
        await cargarUsuarios();       // Primero usuarios
        await cargarWalletAdmin();    // Luego wallet (dependiente)
        await cargarAeropuertos();
        await cargarVuelosAdmin();
        await cargarAsientos();
        await cargarEquipaje();
        await cargarTiposMaleta();
        await cargarPedidos();
        await cargarPagos();
        await cargarBoletos();

        console.log("✔ Panel cargado correctamente.");
    } catch (e) {
        console.error("❌ Error en la carga secuencial:", e);
    }

    /* EVENTOS DE BOTONES / FILTROS */
    asignarEventos();
});

/* ============================================================
   ASIGNACIÓN DE EVENTOS CENTRALIZADA
===============================================================*/
function asignarEventos() {
    const eventos = [
        ["btnFiltrarUsuarios", () => cargarUsuarios(document.getElementById("filtroUsuarioId").value)],
        ["btnVerTodosUsuarios", () => cargarUsuarios()],

        ["btnFiltrarAeropuertos", () => cargarAeropuertos(document.getElementById("filtroAeropuertoId").value)],
        ["btnVerTodosAeropuertos", () => cargarAeropuertos()],

        ["btnFiltrarVuelos", () => cargarVuelosAdmin(document.getElementById("filtroVueloId").value)],
        ["btnVerTodosVuelos", () => cargarVuelosAdmin()],

        ["btnFiltrarAsientos", () => cargarAsientos(document.getElementById("filtroAsientoId").value)],
        ["btnVerTodosAsientos", () => cargarAsientos()],

        ["btnFiltrarEquipaje", () => cargarEquipaje(document.getElementById("filtroEquipajeId").value)],
        ["btnVerTodoEquipaje", () => cargarEquipaje()],

        ["btnFiltrarMaletas", () => cargarTiposMaleta(document.getElementById("filtroMaletaId").value)],
        ["btnVerTodasMaletas", () => cargarTiposMaleta()],

        ["btnFiltrarPedidos", () => cargarPedidos(document.getElementById("filtroPedidoId").value)],
        ["btnVerTodosPedidos", () => cargarPedidos()],

        ["btnFiltrarPagos", () => cargarPagos(document.getElementById("filtroPagoId").value)],
        ["btnVerTodosPagos", () => cargarPagos()],

        ["btnFiltrarBoletos", () => cargarBoletos(document.getElementById("filtroBoletoId").value)],
        ["btnVerTodosBoletos", () => cargarBoletos()]
    ];

    eventos.forEach(([id, fn]) => {
        let el = document.getElementById(id);
        if (el) el.onclick = fn;
    });

    // formularios
    document.getElementById("formAeropuerto").onsubmit = guardarAeropuerto;
    document.getElementById("formVuelo").onsubmit = guardarVuelo;
    document.getElementById("formAsiento").onsubmit = guardarAsiento;
    document.getElementById("formEquipaje").onsubmit = guardarEquipaje;
    document.getElementById("formMaleta").onsubmit = guardarMaleta;
    document.getElementById("formPedido").onsubmit = guardarPedidoAdmin;
    document.getElementById("formPago").onsubmit = guardarPagoAdmin;
    document.getElementById("formBoleto").onsubmit = guardarBoletoAdmin;
}

/* ============================================================
   CARGA DE USUARIOS
===============================================================*/
async function cargarUsuarios(idFiltro = null) {
    const res = await secureFetch("/api/listar");
    const data = await res.json();

    const tbody = document.querySelector("#tablaUsuarios tbody");
    tbody.innerHTML = "";

    let lista = data.usuarios || [];
    if (idFiltro) lista = lista.filter(u => u.ID === Number(idFiltro));

    lista.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td>${u.ID}</td>
                <td>${u.Nombre} ${u.Apellido}</td>
                <td>${u.Correo}</td>
                <td>${u.Rol === 1 ? "Admin" : "Usuario"}</td>
                <td>
                    <button class="btn-edit" onclick='abrirModalEditarUsuario(${JSON.stringify(u)})'>Editar</button>
                    <button class="btn-delete" onclick="eliminarUsuario(${u.ID})">Eliminar</button>
                </td>
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

    alert((await res.json()).message);
    await cargarUsuarios();
}

/* ============================================================
   WALLET ADMIN — OPTIMIZADO PARA N TARJETAS
===============================================================*/
async function cargarWalletAdmin() {
    const listaUsuarios = (await (await secureFetch("/api/listar")).json()).usuarios;
    const tbody = document.querySelector("#tablaWallet tbody");
    tbody.innerHTML = "";

    // 🔥 Peticiones paralelas sin bloquear async/await
    const promesas = listaUsuarios.map(u =>
        secureFetch(`/api/wallet/list/${u.ID}`)
            .then(r => r.json())
            .then(walletData => ({ usuario: u, wallet: walletData.wallet || [] }))
    );

    const resultados = await Promise.all(promesas);

    resultados.forEach(r => {
        r.wallet.forEach(w => {
            tbody.innerHTML += `
                <tr>
                    <td>${w.id_wallet}</td>
                    <td>${r.usuario.Nombre} ${r.usuario.Apellido}</td>
                    <td>${w.tipo}</td>
                    <td>${w.bin}</td>
                    <td>${w.ultimos4}</td>
                    <td>${w.fecha_expiracion}</td>
                    <td>
                        <button class="btn-delete" onclick="adminEliminarTarjeta(${w.id_wallet})">Eliminar</button>
                    </td>
                </tr>
            `;
        });
    });
}

async function adminEliminarTarjeta(id_wallet) {
    if (!confirm("¿Eliminar esta tarjeta?")) return;

    const res = await secureFetch("/api/wallet/delete", {
        method: "POST",
        body: JSON.stringify({ id_wallet })
    });

    alert((await res.json()).message);
    await cargarWalletAdmin();
}

/* ============================================================
   AEROPUERTOS — CRUD
===============================================================*/
async function cargarAeropuertos(idFiltro = null) {
    let url = "/api/admin/aeropuertos";
    if (idFiltro) url += `?id=${idFiltro}`;

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
                    <button class="btn-edit" onclick="editarAeropuerto(${a.id_aeropuerto})">Editar</button>
                    <button class="btn-delete" onclick="eliminarAeropuerto(${a.id_aeropuerto})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarAeropuerto(id) {
    const res = await secureFetch(`/api/admin/aeropuertos?id=${id}`);
    const a = (await res.json()).aeropuertos[0];
    if (!a) return;

    document.getElementById("aeropuertoId").value = a.id_aeropuerto;
    document.getElementById("aeropuertoNombre").value = a.nombre;
    document.getElementById("aeropuertoCiudad").value = a.ciudad;
    document.getElementById("aeropuertoEstado").value = a.estado;
}

async function eliminarAeropuerto(id) {
    if (!confirm("¿Eliminar aeropuerto?")) return;

    const res = await secureFetch("/api/admin/aeropuertos/delete", {
        method: "POST",
        body: JSON.stringify({ id_aeropuerto: id })
    });

    alert((await res.json()).message);
    await cargarAeropuertos();
}

async function guardarAeropuerto(e) {
    e.preventDefault();

    const id = document.getElementById("aeropuertoId").value;
    const nombre = document.getElementById("aeropuertoNombre").value;
    const ciudad = document.getElementById("aeropuertoCiudad").value;
    const estado = document.getElementById("aeropuertoEstado").value;

    const ruta = id ? "/api/admin/aeropuertos/update" : "/api/admin/aeropuertos/add";

    await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({ id_aeropuerto: id || null, nombre, ciudad, estado })
    });

    e.target.reset();
    document.getElementById("aeropuertoId").value = "";
    await cargarAeropuertos();
}

/* ============================================================
   VUELOS — CRUD
===============================================================*/
async function cargarVuelosAdmin(idFiltro = null) {
    let url = "/api/admin/vuelos";
    if (idFiltro) url += `?id=${idFiltro}`;

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
                    <button class="btn-edit" onclick="editarVuelo(${v.id_vuelo})">Editar</button>
                    <button class="btn-delete" onclick="eliminarVuelo(${v.id_vuelo})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarVuelo(id) {
    const res = await secureFetch(`/api/admin/vuelos?id=${id}`);
    const v = (await res.json()).vuelos[0];
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
    if (!confirm("¿Eliminar vuelo?")) return;

    await secureFetch("/api/admin/vuelos/delete", {
        method: "POST",
        body: JSON.stringify({ id_vuelo: id })
    });

    await cargarVuelosAdmin();
}

async function guardarVuelo(e) {
    e.preventDefault();

    const id_vuelo = document.getElementById("vueloId").value;
    const id_origen = Number(document.getElementById("vueloOrigen").value);
    const id_destino = Number(document.getElementById("vueloDestino").value);
    const fecha_salida = document.getElementById("vueloFechaSalida").value;
    const fecha_llegada = document.getElementById("vueloFechaLlegada").value;
    const escala = document.getElementById("vueloEscala").value;
    const numero_escalas = Number(document.getElementById("vueloNumEscalas").value);

    const ruta = id_vuelo ? "/api/admin/vuelos/update" : "/api/admin/vuelos/add";

    await secureFetch(ruta, {
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

    e.target.reset();
    document.getElementById("vueloId").value = "";
    await cargarVuelosAdmin();
}

/* ============================================================
   ASIENTOS — CRUD
===============================================================*/
async function cargarAsientos(idFiltro = null) {
    let url = "/api/admin/asientos";
    if (idFiltro) url += `?id=${idFiltro}`;

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
                <td>$${Number(a.precio).toFixed(2)}</td>
                <td>${a.stock}</td>
                <td>${a.activo ? "Sí" : "No"}</td>
                <td>
                    <button class="btn-edit" onclick="editarAsiento(${a.id_asiento})">Editar</button>
                    <button class="btn-delete" onclick="eliminarAsiento(${a.id_asiento})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarAsiento(id) {
    const res = await secureFetch(`/api/admin/asientos?id=${id}`);
    const a = (await res.json()).asientos[0];
    if (!a) return;

    document.getElementById("asientoId").value = a.id_asiento;
    document.getElementById("asientoVuelo").value = a.id_vuelo;
    document.getElementById("asientoTipo").value = a.tipo_asiento;
    document.getElementById("asientoPrecio").value = a.precio;
    document.getElementById("asientoStock").value = a.stock;
}

async function eliminarAsiento(id) {
    if (!confirm("¿Eliminar asiento?")) return;

    await secureFetch("/api/admin/asientos/delete", {
        method: "POST",
        body: JSON.stringify({ id_asiento: id })
    });

    await cargarAsientos();
}

async function guardarAsiento(e) {
    e.preventDefault();

    const id_asiento = document.getElementById("asientoId").value;
    const id_vuelo = Number(document.getElementById("asientoVuelo").value);
    const tipo_asiento = document.getElementById("asientoTipo").value;
    const precio = Number(document.getElementById("asientoPrecio").value);
    const stock = Number(document.getElementById("asientoStock").value);

    const ruta = id_asiento ? "/api/admin/asientos/update" : "/api/admin/asientos/add";

    await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({ id_asiento: id_asiento || null, id_vuelo, tipo_asiento, precio, stock })
    });

    e.target.reset();
    document.getElementById("asientoId").value = "";
    await cargarAsientos();
}

/* ============================================================
   EQUIPAJE VUELO — CRUD
===============================================================*/
async function cargarEquipaje(idFiltro = null) {
    let url = "/api/admin/equipaje";
    if (idFiltro) url += `?id=${idFiltro}`;

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
                <td>$${Number(e.precio_extra).toFixed(2)}</td>
                <td>${e.activo ? "Sí" : "No"}</td>
                <td>
                    <button class="btn-edit" onclick="editarEquipaje(${e.id_equipaje})">Editar</button>
                    <button class="btn-delete" onclick="eliminarEquipaje(${e.id_equipaje})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarEquipaje(id) {
    const res = await secureFetch(`/api/admin/equipaje?id=${id}`);
    const e = (await res.json()).equipaje[0];
    if (!e) return;

    document.getElementById("equipajeId").value = e.id_equipaje;
    document.getElementById("equipajeVuelo").value = e.id_vuelo;
    document.getElementById("equipajeTipo").value = e.tipo;
    document.getElementById("equipajePrecio").value = e.precio_extra;
}

async function eliminarEquipaje(id) {
    if (!confirm("¿Eliminar equipaje?")) return;

    await secureFetch("/api/admin/equipaje/delete", {
        method: "POST",
        body: JSON.stringify({ id_equipaje: id })
    });

    await cargarEquipaje();
}

async function guardarEquipaje(e) {
    e.preventDefault();

    const id_equipaje = document.getElementById("equipajeId").value;
    const id_vuelo = Number(document.getElementById("equipajeVuelo").value);
    const tipo = document.getElementById("equipajeTipo").value;
    const precio_extra = Number(document.getElementById("equipajePrecio").value);

    const ruta = id_equipaje ? "/api/admin/equipaje/update" : "/api/admin/equipaje/add";

    await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({ id_equipaje: id_equipaje || null, id_vuelo, tipo, precio_extra })
    });

    e.target.reset();
    document.getElementById("equipajeId").value = "";
    await cargarEquipaje();
}

/* ============================================================
   TIPOS DE MALETA — CRUD
===============================================================*/
async function cargarTiposMaleta(idFiltro = null) {
    let url = "/api/admin/tipos-maleta";
    if (idFiltro) url += `?id=${idFiltro}`;

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
                    <button class="btn-edit" onclick="editarMaleta(${t.id_tipo_maleta})">Editar</button>
                    <button class="btn-delete" onclick="eliminarMaleta(${t.id_tipo_maleta})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarMaleta(id) {
    const res = await secureFetch(`/api/admin/tipos-maleta?id=${id}`);
    const t = (await res.json()).tipos[0];
    if (!t) return;

    document.getElementById("maletaId").value = t.id_tipo_maleta;
    document.getElementById("maletaNombre").value = t.nombre;
    document.getElementById("maletaPesoMax").value = t.peso_max;
    document.getElementById("maletaBase").value = t.precio_base;
    document.getElementById("maletaTarifa").value = t.tarifa_kg_extra;
}

async function eliminarMaleta(id) {
    if (!confirm("¿Eliminar tipo de maleta?")) return;

    await secureFetch("/api/admin/tipos-maleta/delete", {
        method: "POST",
        body: JSON.stringify({ id_tipo_maleta: id })
    });

    await cargarTiposMaleta();
}

async function guardarMaleta(e) {
    e.preventDefault();

    const id_tipo_maleta = document.getElementById("maletaId").value;
    const nombre = document.getElementById("maletaNombre").value;
    const peso_max = Number(document.getElementById("maletaPesoMax").value);
    const precio_base = Number(document.getElementById("maletaBase").value);
    const tarifa_kg_extra = Number(document.getElementById("maletaTarifa").value);

    const ruta = id_tipo_maleta ? "/api/admin/tipos-maleta/update" : "/api/admin/tipos-maleta/add";

    await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({
            id_tipo_maleta: id_tipo_maleta || null,
            nombre,
            peso_max,
            precio_base,
            tarifa_kg_extra
        })
    });

    e.target.reset();
    document.getElementById("maletaId").value = "";
    await cargarTiposMaleta();
}

/* ============================================================
   PEDIDOS — CRUD
===============================================================*/
async function cargarPedidos(idFiltro = null) {
    let url = "/api/admin/pedidos";
    if (idFiltro) url += `?id=${idFiltro}`;

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
                    <button class="btn-edit" onclick="editarPedidoAdmin(${p.id_pedido})">Editar</button>
                    <button class="btn-delete" onclick="eliminarPedidoAdmin(${p.id_pedido})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarPedidoAdmin(id) {
    const res = await secureFetch(`/api/admin/pedidos?id=${id}`);
    const p = (await res.json()).pedidos[0];
    if (!p) return;

    document.getElementById("pedidoId").value = p.id_pedido;
    document.getElementById("pedidoUsuario").value = p.id_usuario;
    document.getElementById("pedidoWallet").value = p.id_wallet;
    document.getElementById("pedidoTotal").value = p.total;
    document.getElementById("pedidoEstado").value = p.estado;
}

async function eliminarPedidoAdmin(id) {
    if (!confirm("¿Eliminar pedido?")) return;

    await secureFetch("/api/admin/pedidos/delete", {
        method: "POST",
        body: JSON.stringify({ id_pedido: id })
    });

    await cargarPedidos();
}

async function guardarPedidoAdmin(e) {
    e.preventDefault();

    const id_pedido = document.getElementById("pedidoId").value;
    const id_usuario = Number(document.getElementById("pedidoUsuario").value);
    const id_wallet = Number(document.getElementById("pedidoWallet").value);
    const total = Number(document.getElementById("pedidoTotal").value);
    const estado = document.getElementById("pedidoEstado").value.trim();

    const ruta = id_pedido ? "/api/admin/pedidos/update" : "/api/admin/pedidos/add";

    await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({
            id_pedido: id_pedido || null,
            id_usuario,
            id_wallet,
            total,
            estado
        })
    });

    e.target.reset();
    document.getElementById("pedidoId").value = "";
    await cargarPedidos();
}

/* ============================================================
   PAGOS — CRUD
===============================================================*/
async function cargarPagos(idFiltro = null) {
    let url = "/api/admin/pagos";
    if (idFiltro) url += `?id=${idFiltro}`;

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
                    <button class="btn-edit" onclick="editarPagoAdmin(${p.id_pago})">Editar</button>
                    <button class="btn-delete" onclick="eliminarPagoAdmin(${p.id_pago})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarPagoAdmin(id) {
    const res = await secureFetch(`/api/admin/pagos?id=${id}`);
    const p = (await res.json()).pagos[0];
    if (!p) return;

    document.getElementById("pagoId").value = p.id_pago;
    document.getElementById("pagoUsuario").value = p.id_usuario;
    document.getElementById("pagoPedido").value = p.id_pedido;
    document.getElementById("pagoMonto").value = p.monto;
    document.getElementById("pagoEstado").value = p.estado;
}

async function eliminarPagoAdmin(id) {
    if (!confirm("¿Eliminar pago?")) return;

    await secureFetch("/api/admin/pagos/delete", {
        method: "POST",
        body: JSON.stringify({ id_pago: id })
    });

    await cargarPagos();
}

async function guardarPagoAdmin(e) {
    e.preventDefault();

    const id_pago = document.getElementById("pagoId").value;
    const id_usuario = Number(document.getElementById("pagoUsuario").value);
    const id_pedido = Number(document.getElementById("pagoPedido").value);
    const monto = Number(document.getElementById("pagoMonto").value);
    const estado = document.getElementById("pagoEstado").value.trim();

    const ruta = id_pago ? "/api/admin/pagos/update" : "/api/admin/pagos/add";

    await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({
            id_pago: id_pago || null,
            id_usuario,
            id_pedido,
            monto,
            estado
        })
    });

    e.target.reset();
    document.getElementById("pagoId").value = "";
    await cargarPagos();
}

/* ============================================================
   BOLETOS — CRUD
===============================================================*/
async function cargarBoletos(idFiltro = null) {
    let url = "/api/admin/boletos";
    if (idFiltro) url += `?id=${idFiltro}`;

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
                    <button class="btn-edit" onclick="editarBoletoAdmin(${b.id_boleto})">Editar</button>
                    <button class="btn-delete" onclick="eliminarBoletoAdmin(${b.id_boleto})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarBoletoAdmin(id) {
    const res = await secureFetch(`/api/admin/boletos?id=${id}`);
    const b = (await res.json()).boletos[0];
    if (!b) return;

    document.getElementById("boletoId").value = b.id_boleto;
    document.getElementById("boletoUsuario").value = b.id_usuario;
    document.getElementById("boletoVuelo").value = b.id_vuelo;
    document.getElementById("boletoAsiento").value = b.id_asiento;
    document.getElementById("boletoEquipaje").value = b.id_equipaje;
    document.getElementById("boletoPedido").value = b.id_pedido;
    document.getElementById("boletoPrecio").value = b.precio_total;
    document.getElementById("boletoEstado").value = b.estado;
}

async function eliminarBoletoAdmin(id) {
    if (!confirm("¿Eliminar boleto?")) return;

    await secureFetch("/api/admin/boletos/delete", {
        method: "POST",
        body: JSON.stringify({ id_boleto: id })
    });

    await cargarBoletos();
}

async function guardarBoletoAdmin(e) {
    e.preventDefault();

    const id_boleto = document.getElementById("boletoId").value;
    const id_usuario = Number(document.getElementById("boletoUsuario").value);
    const id_vuelo = Number(document.getElementById("boletoVuelo").value);
    const id_asiento = Number(document.getElementById("boletoAsiento").value);
    const id_equipaje = document.getElementById("boletoEquipaje").value || null;
    const id_pedido = Number(document.getElementById("boletoPedido").value);
    const precio_total = Number(document.getElementById("boletoPrecio").value);
    const estado = document.getElementById("boletoEstado").value;

    const ruta = id_boleto ? "/api/admin/boletos/update" : "/api/admin/boletos/add";

    await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify({
            id_boleto: id_boleto || null,
            id_usuario,
            id_vuelo,
            id_asiento,
            id_equipaje: id_equipaje ? Number(id_equipaje) : null,
            id_pedido,
            precio_total,
            estado
        })
    });

    e.target.reset();
    document.getElementById("boletoId").value = "";
    await cargarBoletos();
}

/* ============================================================
   MODALES USUARIOS
===============================================================*/
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

function guardarNuevoUsuario() {
    alert("Aquí llamas a tu endpoint /add para crear usuario.");
    cerrarModalCrearUsuario();
}

function guardarEdicionUsuario() {
    alert("Aquí llamas a tu endpoint /update para editar usuario.");
    cerrarModalEditarUsuario();
}
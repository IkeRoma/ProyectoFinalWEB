/* ============================================================
   admin.js — Panel del Administrador con JWT
   Versión optimizada y estandarizada
=============================================================== */

/* ---------------------------
   HEADERS + SECURE FETCH
-----------------------------*/
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
        throw new Error("401 - Sesión expirada");
    }

    return res;
}

/* ============================================================
   CARGA INICIAL
=============================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const usr = JSON.parse(localStorage.getItem("usuario") || "null");

    if (!usr || usr.Rol !== 1) {
        window.location.href = "Index.html";
        return;
    }

    document.getElementById("adminNombre").textContent = usr.Nombre;

    // Cargar todas las tablas del panel
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

    // Filtros
    registrarEventosFiltros();

    // Formularios
    registrarEventosFormularios();
});

/* ============================================================
   REGISTRO DE EVENTOS
=============================================================== */

function registrarEventosFiltros() {
    const filtros = [
        ["btnFiltrarUsuarios", "filtroUsuarioId", cargarUsuarios],
        ["btnVerTodosUsuarios", null, cargarUsuarios],

        ["btnFiltrarAeropuertos", "filtroAeropuertoId", cargarAeropuertos],
        ["btnVerTodosAeropuertos", null, cargarAeropuertos],

        ["btnFiltrarVuelos", "filtroVueloId", cargarVuelosAdmin],
        ["btnVerTodosVuelos", null, cargarVuelosAdmin],

        ["btnFiltrarAsientos", "filtroAsientoId", cargarAsientos],
        ["btnVerTodosAsientos", null, cargarAsientos],

        ["btnFiltrarEquipaje", "filtroEquipajeId", cargarEquipaje],
        ["btnVerTodoEquipaje", null, cargarEquipaje],

        ["btnFiltrarMaletas", "filtroMaletaId", cargarTiposMaleta],
        ["btnVerTodasMaletas", null, cargarTiposMaleta],

        ["btnFiltrarPedidos", "filtroPedidoId", cargarPedidos],
        ["btnVerTodosPedidos", null, cargarPedidos],

        ["btnFiltrarPagos", "filtroPagoId", cargarPagos],
        ["btnVerTodosPagos", null, cargarPagos],

        ["btnFiltrarBoletos", "filtroBoletoId", cargarBoletos],
        ["btnVerTodosBoletos", null, cargarBoletos]
    ];

    filtros.forEach(([btnId, inputId, fn]) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        btn.onclick = () => {
            const filtro = inputId ? document.getElementById(inputId).value : null;
            fn(filtro || null);
        };
    });
}

function registrarEventosFormularios() {
    document.getElementById("formAeropuerto").addEventListener("submit", guardarAeropuerto);
    document.getElementById("formVuelo").addEventListener("submit", guardarVuelo);
    document.getElementById("formAsiento").addEventListener("submit", guardarAsiento);
    document.getElementById("formEquipaje").addEventListener("submit", guardarEquipaje);
    document.getElementById("formMaleta").addEventListener("submit", guardarMaleta);
    document.getElementById("formPedido").addEventListener("submit", guardarPedidoAdmin);
    document.getElementById("formPago").addEventListener("submit", guardarPagoAdmin);
    document.getElementById("formBoleto").addEventListener("submit", guardarBoletoAdmin);
}

/* ============================================================
   USUARIOS — CRUD REAL
=============================================================== */

async function cargarUsuarios(idFiltro = null) {
    const res = await secureFetch("/api/listar");
    const data = await res.json();

    const tbody = document.querySelector("#tablaUsuarios tbody");
    tbody.innerHTML = "";

    let lista = data.usuarios || [];
    if (idFiltro) lista = lista.filter(u => u.ID == idFiltro);

    lista.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td>${u.ID}</td>
                <td>${u.Nombre} ${u.Apellido}</td>
                <td>${u.Correo}</td>
                <td>${u.Rol == 1 ? "Admin" : "Usuario"}</td>
                <td>
                    <button class="btn-admin btn-edit" onclick='abrirModalEditarUsuario(${JSON.stringify(u)})'>Editar</button>
                    <button class="btn-admin btn-delete" onclick="eliminarUsuario(${u.ID})">Eliminar</button>
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
    cargarUsuarios();
}

/* ---------------- MODAL: CREAR ---------------- */
function abrirModalCrearUsuario() {
    document.getElementById("modalCrearUsuario").classList.remove("oculto");
}

function cerrarModalCrearUsuario() {
    document.getElementById("modalCrearUsuario").classList.add("oculto");
}

async function guardarNuevoUsuario() {
    const usuario = {
        nombre: document.getElementById("crearNombre").value.trim(),
        apellidos: document.getElementById("crearApellido").value.trim(),
        email: document.getElementById("crearCorreo").value.trim(),
        telefono: document.getElementById("crearTelefono").value.trim(),
        password: document.getElementById("crearPassword").value.trim()
    };

    if (!usuario.nombre || !usuario.apellidos || !usuario.email || !usuario.password)
        return alert("Completa todos los campos obligatorios.");

    const res = await secureFetch("/api/admin/usuarios/add", {
        method: "POST",
        body: JSON.stringify(usuario)
    });

    alert((await res.json()).message);
    cerrarModalCrearUsuario();
    cargarUsuarios();
}

/* ---------------- MODAL: EDITAR ---------------- */
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

async function guardarEdicionUsuario() {
    const usuario = {
        ID: document.getElementById("editID").value,
        Nombre: document.getElementById("editNombre").value.trim(),
        Apellido: document.getElementById("editApellido").value.trim(),
        Correo: document.getElementById("editCorreo").value.trim(),
        Telefono: document.getElementById("editTelefono").value.trim(),
        Rol: Number(document.getElementById("editRol").value)
    };

    const res = await secureFetch("/api/updateUser", {
        method: "POST",
        body: JSON.stringify(usuario)
    });

    alert((await res.json()).message);
    cerrarModalEditarUsuario();
    cargarUsuarios();
}

/* ============================================================
   WALLET ADMIN — Tarjetas con diseño moderno
=============================================================== */

async function cargarWalletAdmin() {
    const resUsuarios = await secureFetch("/api/listar");
    const usuarios = (await resUsuarios.json()).usuarios || [];

    const tbody = document.querySelector("#tablaWallet tbody");
    tbody.innerHTML = "";

    for (const u of usuarios) {
        const res = await secureFetch(`/api/wallet/list/${u.ID}`);
        const data = await res.json();

        (data.wallet || []).forEach(w => {
            tbody.innerHTML += `
                <tr>
                    <td>${w.id_wallet}</td>
                    <td>${u.Nombre} ${u.Apellido}</td>
                    <td>${w.tipo}</td>
                    <td>${w.bin}</td>
                    <td>${w.ultimos4}</td>
                    <td>${w.fecha_expiracion}</td>
                    <td>
                        <button class="btn-admin btn-delete" onclick="adminEliminarTarjeta(${w.id_wallet})">Eliminar</button>
                    </td>
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

    alert((await res.json()).message);
    cargarWalletAdmin();
}

/* ============================================================
   CRUD: AEROPUERTOS
=============================================================== */

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
                    <button class="btn-admin btn-edit" onclick="editarAeropuerto(${a.id_aeropuerto})">Editar</button>
                    <button class="btn-admin btn-delete" onclick="eliminarAeropuerto(${a.id_aeropuerto})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarAeropuerto(id) {
    const res = await secureFetch(`/api/admin/aeropuertos?id=${id}`);
    const a = (await res.json()).aeropuertos[0];

    document.getElementById("aeropuertoId").value = a.id_aeropuerto;
    document.getElementById("aeropuertoNombre").value = a.nombre;
    document.getElementById("aeropuertoCiudad").value = a.ciudad;
    document.getElementById("aeropuertoEstado").value = a.estado;
}

async function eliminarAeropuerto(id) {
    if (!confirm("¿Desactivar aeropuerto?")) return;

    const res = await secureFetch("/api/admin/aeropuertos/delete", {
        method: "POST",
        body: JSON.stringify({ id_aeropuerto: id })
    });

    alert((await res.json()).message);
    cargarAeropuertos();
}

async function guardarAeropuerto(e) {
    e.preventDefault();

    const info = {
        id_aeropuerto: document.getElementById("aeropuertoId").value || null,
        nombre: document.getElementById("aeropuertoNombre").value.trim(),
        ciudad: document.getElementById("aeropuertoCiudad").value.trim(),
        estado: document.getElementById("aeropuertoEstado").value.trim()
    };

    const ruta = info.id_aeropuerto ? "/api/admin/aeropuertos/update" : "/api/admin/aeropuertos/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify(info)
    });

    alert((await res.json()).message);
    e.target.reset();
    cargarAeropuertos();
}

/* ============================================================
   CRUD: VUELOS
=============================================================== */

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
                    <button class="btn-admin btn-edit" onclick="editarVuelo(${v.id_vuelo})">Editar</button>
                    <button class="btn-admin btn-delete" onclick="eliminarVuelo(${v.id_vuelo})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarVuelo(id) {
    const res = await secureFetch(`/api/admin/vuelos?id=${id}`);
    const v = (await res.json()).vuelos[0];

    document.getElementById("vueloId").value = v.id_vuelo;
    document.getElementById("vueloOrigen").value = v.id_origen;
    document.getElementById("vueloDestino").value = v.id_destino;
    document.getElementById("vueloFechaSalida").value = v.fecha_salida.replace(" ", "T");
    document.getElementById("vueloFechaLlegada").value = v.fecha_llegada.replace(" ", "T");
    document.getElementById("vueloEscala").value = v.escala;
    document.getElementById("vueloNumEscalas").value = v.numero_escalas;
}

async function eliminarVuelo(id) {
    if (!confirm("¿Desactivar vuelo?")) return;

    const res = await secureFetch("/api/admin/vuelos/delete", {
        method: "POST",
        body: JSON.stringify({ id_vuelo: id })
    });

    alert((await res.json()).message);
    cargarVuelosAdmin();
}

async function guardarVuelo(e) {
    e.preventDefault();

    const info = {
        id_vuelo: document.getElementById("vueloId").value || null,
        id_origen: Number(document.getElementById("vueloOrigen").value),
        id_destino: Number(document.getElementById("vueloDestino").value),
        fecha_salida: document.getElementById("vueloFechaSalida").value,
        fecha_llegada: document.getElementById("vueloFechaLlegada").value,
        escala: document.getElementById("vueloEscala").value,
        numero_escalas: Number(document.getElementById("vueloNumEscalas").value)
    };

    const ruta = info.id_vuelo ? "/api/admin/vuelos/update" : "/api/admin/vuelos/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify(info)
    });

    alert((await res.json()).message);
    e.target.reset();
    cargarVuelosAdmin();
}

/* ============================================================
   CRUD: ASIENTOS
=============================================================== */

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
                <td>${Number(a.precio).toFixed(2)}</td>
                <td>${a.stock}</td>
                <td>${a.activo ? "Sí" : "No"}</td>
                <td>
                    <button class="btn-admin btn-edit" onclick="editarAsiento(${a.id_asiento})">Editar</button>
                    <button class="btn-admin btn-delete" onclick="eliminarAsiento(${a.id_asiento})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarAsiento(id) {
    const res = await secureFetch(`/api/admin/asientos?id=${id}`);
    const a = (await res.json()).asientos[0];

    document.getElementById("asientoId").value = a.id_asiento;
    document.getElementById("asientoVuelo").value = a.id_vuelo;
    document.getElementById("asientoTipo").value = a.tipo_asiento;
    document.getElementById("asientoPrecio").value = a.precio;
    document.getElementById("asientoStock").value = a.stock;
}

async function eliminarAsiento(id) {
    if (!confirm("¿Desactivar asiento?")) return;

    const res = await secureFetch("/api/admin/asientos/delete", {
        method: "POST",
        body: JSON.stringify({ id_asiento: id })
    });

    alert((await res.json()).message);
    cargarAsientos();
}

async function guardarAsiento(e) {
    e.preventDefault();

    const info = {
        id_asiento: document.getElementById("asientoId").value || null,
        id_vuelo: Number(document.getElementById("asientoVuelo").value),
        tipo_asiento: document.getElementById("asientoTipo").value,
        precio: Number(document.getElementById("asientoPrecio").value),
        stock: Number(document.getElementById("asientoStock").value),
    };

    const ruta = info.id_asiento ? "/api/admin/asientos/update" : "/api/admin/asientos/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify(info)
    });

    alert((await res.json()).message);
    
    e.target.reset();
    cargarAsientos();
}

/* ============================================================
   CRUD: EQUIPAJE
=============================================================== */

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
                <td>${Number(e.precio_extra).toFixed(2)}</td>
                <td>${e.activo ? "Sí" : "No"}</td>
                <td>
                    <button class="btn-admin btn-edit" onclick="editarEquipaje(${e.id_equipaje})">Editar</button>
                    <button class="btn-admin btn-delete" onclick="eliminarEquipaje(${e.id_equipaje})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarEquipaje(id) {
    const res = await secureFetch(`/api/admin/equipaje?id=${id}`);
    const e = (await res.json()).equipaje[0];

    document.getElementById("equipajeId").value = e.id_equipaje;
    document.getElementById("equipajeVuelo").value = e.id_vuelo;
    document.getElementById("equipajeTipo").value = e.tipo;
    document.getElementById("equipajePrecio").value = e.precio_extra;
}

async function eliminarEquipaje(id) {
    if (!confirm("¿Desactivar equipaje?")) return;

    const res = await secureFetch("/api/admin/equipaje/delete", {
        method: "POST",
        body: JSON.stringify({ id_equipaje: id })
    });

    alert((await res.json()).message);
    cargarEquipaje();
}

async function guardarEquipaje(e) {
    e.preventDefault();

    const info = {
        id_equipaje: document.getElementById("equipajeId").value || null,
        id_vuelo: Number(document.getElementById("equipajeVuelo").value),
        tipo: document.getElementById("equipajeTipo").value,
        precio_extra: Number(document.getElementById("equipajePrecio").value)
    };

    const ruta = info.id_equipaje ? "/api/admin/equipaje/update" : "/api/admin/equipaje/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify(info)
    });

    alert((await res.json()).message);
    
    e.target.reset();
    cargarEquipaje();
}

/* ============================================================
   CRUD: TIPOS DE MALETA
=============================================================== */

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
                    <button class="btn-admin btn-edit" onclick="editarMaleta(${t.id_tipo_maleta})">Editar</button>
                    <button class="btn-admin btn-delete" onclick="eliminarMaleta(${t.id_tipo_maleta})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarMaleta(id) {
    const res = await secureFetch(`/api/admin/tipos-maleta?id=${id}`);
    const t = (await res.json()).tipos[0];

    document.getElementById("maletaId").value = t.id_tipo_maleta;
    document.getElementById("maletaNombre").value = t.nombre;
    document.getElementById("maletaPesoMax").value = t.peso_max;
    document.getElementById("maletaBase").value = t.precio_base;
    document.getElementById("maletaTarifa").value = t.tarifa_kg_extra;
}

async function eliminarMaleta(id) {
    if (!confirm("¿Eliminar tipo de maleta?")) return;

    const res = await secureFetch("/api/admin/tipos-maleta/delete", {
        method: "POST",
        body: JSON.stringify({ id_tipo_maleta: id })
    });

    alert((await res.json()).message);
    cargarTiposMaleta();
}

async function guardarMaleta(e) {
    e.preventDefault();

    const info = {
        id_tipo_maleta: document.getElementById("maletaId").value || null,
        nombre: document.getElementById("maletaNombre").value.trim(),
        peso_max: Number(document.getElementById("maletaPesoMax").value),
        precio_base: Number(document.getElementById("maletaBase").value),
        tarifa_kg_extra: Number(document.getElementById("maletaTarifa").value)
    };

    const ruta = info.id_tipo_maleta ? "/api/admin/tipos-maleta/update" : "/api/admin/tipos-maleta/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify(info)
    });

    alert((await res.json()).message);
    e.target.reset();
    cargarTiposMaleta();
}

/* ============================================================
   CRUD: PEDIDOS
=============================================================== */

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
                    <button class="btn-admin btn-edit" onclick="editarPedidoAdmin(${p.id_pedido})">Editar</button>
                    <button class="btn-admin btn-delete" onclick="eliminarPedidoAdmin(${p.id_pedido})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarPedidoAdmin(id) {
    const res = await secureFetch(`/api/admin/pedidos?id=${id}`);
    const p = (await res.json()).pedidos[0];

    document.getElementById("pedidoId").value = p.id_pedido;
    document.getElementById("pedidoUsuario").value = p.id_usuario;
    document.getElementById("pedidoWallet").value = p.id_wallet;
    document.getElementById("pedidoTotal").value = p.total;
    document.getElementById("pedidoEstado").value = p.estado;
}

async function eliminarPedidoAdmin(id) {
    if (!confirm("¿Eliminar pedido?")) return;

    const res = await secureFetch("/api/admin/pedidos/delete", {
        method: "POST",
        body: JSON.stringify({ id_pedido: id })
    });

    alert((await res.json()).message);
    cargarPedidos();
}

async function guardarPedidoAdmin(e) {
    e.preventDefault();

    const info = {
        id_pedido: document.getElementById("pedidoId").value || null,
        id_usuario: Number(document.getElementById("pedidoUsuario").value),
        id_wallet: Number(document.getElementById("pedidoWallet").value),
        total: Number(document.getElementById("pedidoTotal").value),
        estado: document.getElementById("pedidoEstado").value
    };

    const ruta = info.id_pedido ? "/api/admin/pedidos/update" : "/api/admin/pedidos/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify(info)
    });

    alert((await res.json()).message);

    e.target.reset();
    cargarPedidos();
}

/* ============================================================
   CRUD: PAGOS
=============================================================== */

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
                    <button class="btn-admin btn-edit" onclick="editarPagoAdmin(${p.id_pago})">Editar</button>
                    <button class="btn-admin btn-delete" onclick="eliminarPagoAdmin(${p.id_pago})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarPagoAdmin(id) {
    const res = await secureFetch(`/api/admin/pagos?id=${id}`);
    const p = (await res.json()).pagos[0];

    document.getElementById("pagoId").value = p.id_pago;
    document.getElementById("pagoUsuario").value = p.id_usuario;
    document.getElementById("pagoPedido").value = p.id_pedido;
    document.getElementById("pagoMonto").value = p.monto;
    document.getElementById("pagoEstado").value = p.estado;
}

async function eliminarPagoAdmin(id) {
    if (!confirm("¿Eliminar pago?")) return;

    const res = await secureFetch("/api/admin/pagos/delete", {
        method: "POST",
        body: JSON.stringify({ id_pago: id })
    });

    alert((await res.json()).message);
    cargarPagos();
}

async function guardarPagoAdmin(e) {
    e.preventDefault();

    const info = {
        id_pago: document.getElementById("pagoId").value || null,
        id_usuario: Number(document.getElementById("pagoUsuario").value),
        id_pedido: Number(document.getElementById("pagoPedido").value),
        monto: Number(document.getElementById("pagoMonto").value),
        estado: document.getElementById("pagoEstado").value
    };

    const ruta = info.id_pago ? "/api/admin/pagos/update" : "/api/admin/pagos/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify(info)
    });

    alert((await res.json()).message);

    e.target.reset();
    cargarPagos();
}

/* ============================================================
   CRUD: BOLETOS
=============================================================== */

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
                    <button class="btn-admin btn-edit" onclick="editarBoletoAdmin(${b.id_boleto})">Editar</button>
                    <button class="btn-admin btn-delete" onclick="eliminarBoletoAdmin(${b.id_boleto})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarBoletoAdmin(id) {
    const res = await secureFetch(`/api/admin/boletos?id=${id}`);
    const b = (await res.json()).boletos[0];

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
    if (!confirm("¿Eliminar boleto?")) return;

    const res = await secureFetch("/api/admin/boletos/delete", {
        method: "POST",
        body: JSON.stringify({ id_boleto: id })
    });

    alert((await res.json()).message);
    cargarBoletos();
}

async function guardarBoletoAdmin(e) {
    e.preventDefault();

    const info = {
        id_boleto: document.getElementById("boletoId").value || null,
        id_usuario: Number(document.getElementById("boletoUsuario").value),
        id_vuelo: Number(document.getElementById("boletoVuelo").value),
        id_asiento: Number(document.getElementById("boletoAsiento").value),
        id_equipaje: document.getElementById("boletoEquipaje").value
            ? Number(document.getElementById("boletoEquipaje").value)
            : null,
        id_pedido: Number(document.getElementById("boletoPedido").value),
        precio_total: Number(document.getElementById("boletoPrecio").value),
        estado: document.getElementById("boletoEstado").value.trim()
    };

    const ruta = info.id_boleto ? "/api/admin/boletos/update" : "/api/admin/boletos/add";

    const res = await secureFetch(ruta, {
        method: "POST",
        body: JSON.stringify(info)
    });

    alert((await res.json()).message);
    e.target.reset();
    cargarBoletos();
}

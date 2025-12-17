/* ============================================================
   ADMIN.JS — Panel Admin
===============================================================*/

async function secureFetch(url, options = {}) {
    const token = localStorage.getItem("token");
    options.headers = options.headers || {};
    options.headers["Content-Type"] = "application/json";
    if (token) options.headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, options);
    return res;
}

/* ============================================================
   HELPERS — Fechas, modales, selects
===============================================================*/
function toDatetimeLocal(value) {
    if (!value) return "";
    const d = new Date(value);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

function abrirModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove("oculto");
}

function cerrarModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add("oculto");
}

function setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
}

function setSelectValue(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    const v = (val ?? "").toString();
    el.value = v;
}

let __cacheAeropuertos = [];
let __cacheVuelos = [];

function poblarSelectAeropuertos(lista) {
    __cacheAeropuertos = Array.isArray(lista) ? lista : [];
    const selOrigen = document.getElementById("vueloOrigen");
    const selDestino = document.getElementById("vueloDestino");
    if (!selOrigen || !selDestino) return;

    const opts = (__cacheAeropuertos.length ? __cacheAeropuertos : []).map(a => {
        const nombre = a.nombre || "Aeropuerto";
        const ciudad = a.ciudad ? ` — ${a.ciudad}` : "";
        const estado = a.estado ? `, ${a.estado}` : "";
        const activo = a.activo === 0 || a.activo === false ? " (INACTIVO)" : "";
        return `<option value="${a.id_aeropuerto}">${a.id_aeropuerto} - ${nombre}${ciudad}${estado}${activo}</option>`;
    }).join("");

    const empty = `<option value="">(Sin aeropuertos)</option>`;
    selOrigen.innerHTML = opts || empty;
    selDestino.innerHTML = opts || empty;
}

function poblarSelectVuelos(lista) {
    __cacheVuelos = Array.isArray(lista) ? lista : [];
    const selAsientoVuelo = document.getElementById("asientoVuelo");
    const selEquipajeVuelo = document.getElementById("equipajeVuelo");
    if (!selAsientoVuelo && !selEquipajeVuelo) return;

    const opts = (__cacheVuelos.length ? __cacheVuelos : []).map(v => {
        const origen = v.origen_ciudad || v.id_origen || "Origen";
        const destino = v.destino_ciudad || v.id_destino || "Destino";
        const activo = v.activo === 0 || v.activo === false ? " (INACTIVO)" : "";
        return `<option value="${v.id_vuelo}">#${v.id_vuelo} — ${origen} → ${destino}${activo}</option>`;
    }).join("");

    const empty = `<option value="">(Sin vuelos)</option>`;
    if (selAsientoVuelo) selAsientoVuelo.innerHTML = opts || empty;
    if (selEquipajeVuelo) selEquipajeVuelo.innerHTML = opts || empty;
}

/* ============================================================
   INICIO DE CARGA
===============================================================*/
document.addEventListener("DOMContentLoaded", async () => {
    const usr = JSON.parse(localStorage.getItem("usuario"));
    if (usr) document.getElementById("adminNombre").textContent = usr.Nombre;

    asignarEventos();

    await cargarUsuarios();
    await cargarWalletAdmin();

    await cargarAeropuertos();
    await cargarVuelosAdmin();
    await cargarAsientos();
    await cargarEquipaje();
    await cargarTiposMaleta();

    await cargarPedidos();
    await cargarPagos();
    await cargarBoletos();
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
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
    });

    // formularios (inline)
    const formAeropuerto = document.getElementById("formAeropuerto");
    if (formAeropuerto) formAeropuerto.onsubmit = guardarAeropuerto;

    const formVuelo = document.getElementById("formVuelo");
    if (formVuelo) formVuelo.onsubmit = guardarVuelo;

    const formAsiento = document.getElementById("formAsiento");
    if (formAsiento) formAsiento.onsubmit = guardarAsiento;

    const formEquipaje = document.getElementById("formEquipaje");
    if (formEquipaje) formEquipaje.onsubmit = guardarEquipaje;

    const formMaleta = document.getElementById("formMaleta");
    if (formMaleta) formMaleta.onsubmit = guardarMaleta;

    // formularios (modales)
    const formCrearUsuario = document.getElementById("formCrearUsuario");
    if (formCrearUsuario) formCrearUsuario.onsubmit = guardarNuevoUsuario;

    const formEditarUsuario = document.getElementById("formEditarUsuario");
    if (formEditarUsuario) formEditarUsuario.onsubmit = guardarEdicionUsuario;

    const formEditarPedido = document.getElementById("formEditarPedido");
    if (formEditarPedido) formEditarPedido.onsubmit = guardarPedidoAdmin;

    const formEditarPago = document.getElementById("formEditarPago");
    if (formEditarPago) formEditarPago.onsubmit = guardarPagoAdmin;

    const formEditarBoleto = document.getElementById("formEditarBoleto");
    if (formEditarBoleto) formEditarBoleto.onsubmit = guardarBoletoAdmin;

    // UX: si el vuelo es DIRECTO, forzar número de escalas = 0
    const selEscala = document.getElementById("vueloEscala");
    const inpNumEscalas = document.getElementById("vueloNumEscalas");
    if (selEscala && inpNumEscalas) {
        const sync = () => {
            if (selEscala.value === "DIRECTO") {
                inpNumEscalas.value = 0;
                inpNumEscalas.readOnly = true;
            } else {
                inpNumEscalas.readOnly = false;
                if (inpNumEscalas.value === "" || Number(inpNumEscalas.value) < 1) inpNumEscalas.value = 1;
            }
        };
        selEscala.addEventListener("change", sync);
        sync();
    }
}

/* ============================================================
   LOGOUT
===============================================================*/
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "Index.html";
}

/* ============================================================
   USUARIOS
===============================================================*/
async function cargarUsuarios(idFiltro = null) {
    const tbody = document.querySelector("#tablaUsuarios tbody");
    tbody.innerHTML = "";

    const res = await secureFetch("/api/listar");
    const data = await res.json();
    let lista = data.usuarios || [];

    if (idFiltro) {
        lista = lista.filter(u => u.ID == idFiltro);
    }

    lista.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td>${u.ID}</td>
                <td>${u.Nombre} ${u.Apellido}</td>
                <td>${u.Correo}</td>
                <td>${u.Rol == 1 ? "Admin" : "Usuario"}</td>
                <td>
                    <button class="btn-edit" onclick='abrirModalEditarUsuario(${JSON.stringify(u)})'>Editar</button>
                    <button class="btn-delete" onclick="eliminarUsuario(${u.ID})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function eliminarUsuario(id) {
    if (!confirm("¿Eliminar usuario?")) return;
    const res = await secureFetch("/api/eliminar", {
        method: "POST",
        body: JSON.stringify({ id })
    });
    const data = await res.json();
    alert(data.message || "Usuario eliminado");
    await cargarUsuarios();
    await cargarWalletAdmin();
}

/* ============================================================
   WALLET ADMIN
===============================================================*/
async function cargarWalletAdmin() {
    const filtro = document.getElementById("filtroWalletUsuarioId");
    const idUsuario = filtro ? filtro.value : "";

    let url = "/api/wallet/admin";
    if (idUsuario) url += `?id_usuario=${idUsuario}`;

    const tbody = document.querySelector("#tablaWallet tbody");
    tbody.innerHTML = "";

    const res = await secureFetch(url);
    const data = await res.json();

    (data.wallet || []).forEach(w => {
        tbody.innerHTML += `
            <tr>
                <td>${w.id_wallet}</td>
                <td>${w.id_usuario}</td>
                <td>${w.tipo}</td>
                <td>${w.ultimos4}</td>
                <td>${w.nombre_titular}</td>
                <td>${w.fecha_exp}</td>
                <td>${w.activo ? "Sí" : "No"}</td>
                <td>
                    <button class="btn-delete" onclick="eliminarWalletAdmin(${w.id_wallet})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function eliminarWalletAdmin(id_wallet) {
    if (!confirm("¿Eliminar tarjeta?")) return;
    const res = await secureFetch("/api/wallet/delete", {
        method: "POST",
        body: JSON.stringify({ id_wallet })
    });
    const data = await res.json();
    alert(data.message || "Tarjeta eliminada");
    await cargarWalletAdmin();
}

/* ============================================================
   AEROPUERTOS
===============================================================*/
async function cargarAeropuertos(idFiltro = null) {
    let url = "/api/admin/aeropuertos";
    if (idFiltro) url += `?id=${idFiltro}`;

    const res = await secureFetch(url);
    const data = await res.json();

    if (!idFiltro) {
        poblarSelectAeropuertos(data.aeropuertos || []);
    }

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

async function guardarAeropuerto(e) {
    e.preventDefault();
    const id = document.getElementById("aeropuertoId").value;
    const nombre = document.getElementById("aeropuertoNombre").value;
    const ciudad = document.getElementById("aeropuertoCiudad").value;
    const estado = document.getElementById("aeropuertoEstado").value;

    const endpoint = id ? "/api/admin/aeropuertos/update" : "/api/admin/aeropuertos/add";
    const payload = id
        ? { id_aeropuerto: Number(id), nombre, ciudad, estado }
        : { nombre, ciudad, estado };

    const res = await secureFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    alert(data.message || "Guardado");

    document.getElementById("formAeropuerto").reset();
    document.getElementById("aeropuertoId").value = "";

    await cargarAeropuertos();
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
    const data = await res.json();
    alert(data.message || "Eliminado");
    await cargarAeropuertos();
}

/* ============================================================
   VUELOS
===============================================================*/
async function cargarVuelosAdmin(idFiltro = null) {
    let url = "/api/admin/vuelos";
    if (idFiltro) url += `?id=${idFiltro}`;

    const res = await secureFetch(url);
    const data = await res.json();

    if (!idFiltro) {
        poblarSelectVuelos(data.vuelos || []);
    }

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

async function guardarVuelo(e) {
    e.preventDefault();

    const id = document.getElementById("vueloId").value;
    const id_origen = Number(document.getElementById("vueloOrigen").value);
    const id_destino = Number(document.getElementById("vueloDestino").value);
    const fecha_salida = document.getElementById("vueloFechaSalida").value.replace("T", " ");
    const fecha_llegada = document.getElementById("vueloFechaLlegada").value.replace("T", " ");
    const escala = document.getElementById("vueloEscala").value;
    const numero_escalas = Number(document.getElementById("vueloNumEscalas").value || 0);

    const endpoint = id ? "/api/admin/vuelos/update" : "/api/admin/vuelos/add";
    const payload = id
        ? { id_vuelo: Number(id), id_origen, id_destino, fecha_salida, fecha_llegada, escala, numero_escalas }
        : { id_origen, id_destino, fecha_salida, fecha_llegada, escala, numero_escalas };

    const res = await secureFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    alert(data.message || "Guardado");

    document.getElementById("formVuelo").reset();
    document.getElementById("vueloId").value = "";

    await cargarVuelosAdmin();
}

async function editarVuelo(id) {
    const res = await secureFetch(`/api/admin/vuelos?id=${id}`);
    const v = (await res.json()).vuelos[0];
    if (!v) return;

    document.getElementById("vueloId").value = v.id_vuelo;

    if (!__cacheAeropuertos.length) {
        await cargarAeropuertos();
    }

    document.getElementById("vueloOrigen").value = v.id_origen;
    document.getElementById("vueloDestino").value = v.id_destino;

    document.getElementById("vueloFechaSalida").value = toDatetimeLocal(v.fecha_salida);
    document.getElementById("vueloFechaLlegada").value = toDatetimeLocal(v.fecha_llegada);

    document.getElementById("vueloEscala").value = v.escala;

    const num = document.getElementById("vueloNumEscalas");
    if (num) {
        if (v.escala === "DIRECTO") {
            num.value = 0;
            num.readOnly = true;
        } else {
            num.readOnly = false;
            num.value = v.numero_escalas || 1;
        }
    }
}

async function eliminarVuelo(id) {
    if (!confirm("¿Eliminar vuelo?")) return;
    const res = await secureFetch("/api/admin/vuelos/delete", {
        method: "POST",
        body: JSON.stringify({ id_vuelo: id })
    });
    const data = await res.json();
    alert(data.message || "Eliminado");
    await cargarVuelosAdmin();
}

/* ============================================================
   ASIENTOS
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

async function guardarAsiento(e) {
    e.preventDefault();

    const id = document.getElementById("asientoId").value;
    const id_vuelo = Number(document.getElementById("asientoVuelo").value);
    const tipo_asiento = document.getElementById("asientoTipo").value;
    const precio = Number(document.getElementById("asientoPrecio").value);
    const stock = Number(document.getElementById("asientoStock").value);

    const endpoint = id ? "/api/admin/asientos/update" : "/api/admin/asientos/add";
    const payload = id
        ? { id_asiento: Number(id), id_vuelo, tipo_asiento, precio, stock }
        : { id_vuelo, tipo_asiento, precio, stock };

    const res = await secureFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    alert(data.message || "Guardado");

    document.getElementById("formAsiento").reset();
    document.getElementById("asientoId").value = "";

    await cargarAsientos();
}

async function editarAsiento(id) {
    const res = await secureFetch(`/api/admin/asientos?id=${id}`);
    const a = (await res.json()).asientos[0];
    if (!a) return;

    if (!__cacheVuelos.length) {
        await cargarVuelosAdmin();
    }

    document.getElementById("asientoId").value = a.id_asiento;
    document.getElementById("asientoVuelo").value = a.id_vuelo;
    document.getElementById("asientoTipo").value = a.tipo_asiento;
    document.getElementById("asientoPrecio").value = a.precio;
    document.getElementById("asientoStock").value = a.stock;
}

async function eliminarAsiento(id) {
    if (!confirm("¿Eliminar asiento?")) return;
    const res = await secureFetch("/api/admin/asientos/delete", {
        method: "POST",
        body: JSON.stringify({ id_asiento: id })
    });
    const data = await res.json();
    alert(data.message || "Eliminado");
    await cargarAsientos();
}

/* ============================================================
   EQUIPAJE
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

async function guardarEquipaje(e) {
    e.preventDefault();

    const id = document.getElementById("equipajeId").value;
    const id_vuelo = Number(document.getElementById("equipajeVuelo").value);
    const tipo = document.getElementById("equipajeTipo").value;
    const precio_extra = Number(document.getElementById("equipajePrecio").value);

    const endpoint = id ? "/api/admin/equipaje/update" : "/api/admin/equipaje/add";
    const payload = id
        ? { id_equipaje: Number(id), id_vuelo, tipo, precio_extra }
        : { id_vuelo, tipo, precio_extra };

    const res = await secureFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    alert(data.message || "Guardado");

    document.getElementById("formEquipaje").reset();
    document.getElementById("equipajeId").value = "";

    await cargarEquipaje();
}

async function editarEquipaje(id) {
    const res = await secureFetch(`/api/admin/equipaje?id=${id}`);
    const e = (await res.json()).equipaje[0];
    if (!e) return;

    if (!__cacheVuelos.length) {
        await cargarVuelosAdmin();
    }

    document.getElementById("equipajeId").value = e.id_equipaje;
    document.getElementById("equipajeVuelo").value = e.id_vuelo;
    document.getElementById("equipajeTipo").value = e.tipo;
    document.getElementById("equipajePrecio").value = e.precio_extra;
}

async function eliminarEquipaje(id) {
    if (!confirm("¿Eliminar equipaje?")) return;
    const res = await secureFetch("/api/admin/equipaje/delete", {
        method: "POST",
        body: JSON.stringify({ id_equipaje: id })
    });
    const data = await res.json();
    alert(data.message || "Eliminado");
    await cargarEquipaje();
}

/* ============================================================
   TIPOS DE MALETA
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
                <td>${t.id_tipo}</td>
                <td>${t.tipo}</td>
                <td>$${Number(t.precio).toFixed(2)}</td>
                <td>${t.activo ? "Sí" : "No"}</td>
                <td>
                    <button class="btn-edit" onclick="editarMaleta(${t.id_tipo})">Editar</button>
                    <button class="btn-delete" onclick="eliminarMaleta(${t.id_tipo})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function guardarMaleta(e) {
    e.preventDefault();

    const id = document.getElementById("maletaId").value;
    const tipo = document.getElementById("maletaTipo").value;
    const precio = Number(document.getElementById("maletaPrecio").value);

    const endpoint = id ? "/api/admin/tipos-maleta/update" : "/api/admin/tipos-maleta/add";
    const payload = id ? { id_tipo: Number(id), tipo, precio } : { tipo, precio };

    const res = await secureFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    alert(data.message || "Guardado");

    document.getElementById("formMaleta").reset();
    document.getElementById("maletaId").value = "";

    await cargarTiposMaleta();
}

async function editarMaleta(id) {
    const res = await secureFetch(`/api/admin/tipos-maleta?id=${id}`);
    const t = (await res.json()).tipos[0];
    if (!t) return;

    document.getElementById("maletaId").value = t.id_tipo;
    document.getElementById("maletaTipo").value = t.tipo;
    document.getElementById("maletaPrecio").value = t.precio;
}

async function eliminarMaleta(id) {
    if (!confirm("¿Eliminar tipo de maleta?")) return;
    const res = await secureFetch("/api/admin/tipos-maleta/delete", {
        method: "POST",
        body: JSON.stringify({ id_tipo: id })
    });
    const data = await res.json();
    alert(data.message || "Eliminado");
    await cargarTiposMaleta();
}

/* ============================================================
   PEDIDOS
===============================================================*/
async function cargarPedidos(idFiltro = null) {
    let url = "/api/admin/pedidos";
    if (idFiltro) url += `?id=${idFiltro}`;

    const res = await secureFetch(url);
    const data = await res.json();

    const tbody = document.querySelector("#tablaPedidos tbody");
    tbody.innerHTML = "";

    (data.pedidos || []).forEach(p => {
        const fecha = p.fecha ? new Date(p.fecha).toLocaleString() : "-";
        tbody.innerHTML += `
            <tr>
                <td>${p.id_pedido}</td>
                <td>${p.id_usuario}</td>
                <td>${fecha}</td>
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

    setInputValue("pedidoModalId", p.id_pedido);
    setInputValue("pedidoModalUsuario", p.id_usuario);
    setInputValue("pedidoModalWallet", p.id_wallet);
    setInputValue("pedidoModalFecha", p.fecha ? new Date(p.fecha).toLocaleString() : "");
    setInputValue("pedidoModalTotal", Number(p.total).toFixed(2));
    setSelectValue("pedidoModalEstado", p.estado);

    abrirModal("modalEditarPedido");
}

async function guardarPedidoAdmin(e) {
    e.preventDefault();

    const id_pedido = Number(document.getElementById("pedidoModalId").value);
    if (!id_pedido) return alert("ID_pedido faltante");

    const id_usuario = Number(document.getElementById("pedidoModalUsuario").value);
    const id_wallet = Number(document.getElementById("pedidoModalWallet").value);
    const total = Number(document.getElementById("pedidoModalTotal").value);
    const estado = document.getElementById("pedidoModalEstado").value;

    const res = await secureFetch("/api/admin/pedidos/update", {
        method: "POST",
        body: JSON.stringify({ id_pedido, id_usuario, id_wallet, total, estado })
    });

    const data = await res.json();
    alert(data.message || (data.error ? "Error al actualizar pedido" : "Pedido actualizado"));

    if (!data.error) {
        cerrarModalEditarPedido();
        await cargarPedidos();
    }
}

async function eliminarPedidoAdmin(id) {
    if (!confirm("¿Eliminar pedido?")) return;
    const res = await secureFetch("/api/admin/pedidos/delete", {
        method: "POST",
        body: JSON.stringify({ id_pedido: id })
    });
    const data = await res.json();
    alert(data.message || "Eliminado");
    await cargarPedidos();
}

/* ============================================================
   PAGOS
===============================================================*/
async function cargarPagos(idFiltro = null) {
    let url = "/api/admin/pagos";
    if (idFiltro) url += `?id=${idFiltro}`;

    const res = await secureFetch(url);
    const data = await res.json();

    const tbody = document.querySelector("#tablaPagos tbody");
    tbody.innerHTML = "";

    (data.pagos || []).forEach(p => {
        const metodo = (p.tipo && p.ultimos4) ? `${p.tipo} •••• ${p.ultimos4}` : "-";
        const fecha = p.fecha_pago ? new Date(p.fecha_pago).toLocaleString() : "-";

        tbody.innerHTML += `
            <tr>
                <td>${p.id_pago}</td>
                <td>${p.id_pedido}</td>
                <td>${metodo}</td>
                <td>$${Number(p.monto).toFixed(2)}</td>
                <td>${fecha}</td>
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

    setInputValue("pagoModalId", p.id_pago);
    setInputValue("pagoModalUsuario", p.id_usuario);
    setInputValue("pagoModalPedido", p.id_pedido);
    setInputValue("pagoModalFecha", p.fecha_pago ? new Date(p.fecha_pago).toLocaleString() : "");
    setInputValue("pagoModalMonto", Number(p.monto).toFixed(2));
    setSelectValue("pagoModalEstado", p.estado);

    abrirModal("modalEditarPago");
}

async function guardarPagoAdmin(e) {
    e.preventDefault();

    const id_pago = Number(document.getElementById("pagoModalId").value);
    if (!id_pago) return alert("ID_pago faltante");

    const id_usuario = Number(document.getElementById("pagoModalUsuario").value);
    const id_pedido = Number(document.getElementById("pagoModalPedido").value);
    const monto = Number(document.getElementById("pagoModalMonto").value);
    const estado = document.getElementById("pagoModalEstado").value;

    const res = await secureFetch("/api/admin/pagos/update", {
        method: "POST",
        body: JSON.stringify({ id_pago, id_usuario, id_pedido, monto, estado })
    });

    const data = await res.json();
    alert(data.message || (data.error ? "Error al actualizar pago" : "Pago actualizado"));

    if (!data.error) {
        cerrarModalEditarPago();
        await cargarPagos();
    }
}

async function eliminarPagoAdmin(id) {
    if (!confirm("¿Eliminar pago?")) return;
    const res = await secureFetch("/api/admin/pagos/delete", {
        method: "POST",
        body: JSON.stringify({ id_pago: id })
    });
    const data = await res.json();
    alert(data.message || "Eliminado");
    await cargarPagos();
}

/* ============================================================
   BOLETOS
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
                <td>${b.estado}</td>
                <td>${b.codigo_boleto || "-"}</td>
                <td>$${Number(b.precio_total).toFixed(2)}</td>
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

    setInputValue("boletoModalId", b.id_boleto);
    setInputValue("boletoModalUsuario", b.id_usuario);
    setInputValue("boletoModalVuelo", b.id_vuelo);
    setInputValue("boletoModalAsiento", b.id_asiento);
    setInputValue("boletoModalEquipaje", b.id_equipaje ?? "");
    setInputValue("boletoModalPedido", b.id_pedido);
    setInputValue("boletoModalPrecio", Number(b.precio_total).toFixed(2));
    setSelectValue("boletoModalEstado", b.estado);

    abrirModal("modalEditarBoleto");
}

async function guardarBoletoAdmin(e) {
    e.preventDefault();

    const id_boleto = Number(document.getElementById("boletoModalId").value);
    if (!id_boleto) return alert("ID_boleto faltante");

    const id_usuario = Number(document.getElementById("boletoModalUsuario").value);
    const id_vuelo = Number(document.getElementById("boletoModalVuelo").value);
    const id_asiento = Number(document.getElementById("boletoModalAsiento").value);
    const equipajeRaw = document.getElementById("boletoModalEquipaje").value;
    const id_equipaje = equipajeRaw === "" ? null : Number(equipajeRaw);
    const id_pedido = Number(document.getElementById("boletoModalPedido").value);
    const precio_total = Number(document.getElementById("boletoModalPrecio").value);
    const estado = document.getElementById("boletoModalEstado").value;

    const res = await secureFetch("/api/admin/boletos/update", {
        method: "POST",
        body: JSON.stringify({ id_boleto, id_usuario, id_vuelo, id_asiento, id_equipaje, id_pedido, precio_total, estado })
    });

    const data = await res.json();
    alert(data.message || (data.error ? "Error al actualizar boleto" : "Boleto actualizado"));

    if (!data.error) {
        cerrarModalEditarBoleto();
        await cargarBoletos();
    }
}

async function eliminarBoletoAdmin(id) {
    if (!confirm("¿Eliminar boleto?")) return;
    const res = await secureFetch("/api/admin/boletos/delete", {
        method: "POST",
        body: JSON.stringify({ id_boleto: id })
    });
    const data = await res.json();
    alert(data.message || "Eliminado");
    await cargarBoletos();
}

/* ============================================================
   MODALES: USUARIOS
===============================================================*/
function abrirModalCrearUsuario() {
    const form = document.getElementById("formCrearUsuario");
    if (form) form.reset();
    abrirModal("modalCrearUsuario");
}

function cerrarModalCrearUsuario() {
    cerrarModal("modalCrearUsuario");
}

function abrirModalEditarUsuario(u) {
    let user = u;
    if (typeof u === "string") {
        try { user = JSON.parse(u); } catch (e) { user = {}; }
    }
    if (!user) return;

    setInputValue("editarUsuarioId", user.ID);
    setInputValue("editarUsuarioNombre", user.Nombre);
    setInputValue("editarUsuarioApellido", user.Apellido);
    setInputValue("editarUsuarioCorreo", user.Correo);
    setInputValue("editarUsuarioTelefono", user.Telefono);
    setSelectValue("editarUsuarioRol", user.Rol);

    abrirModal("modalEditarUsuario");
}

function cerrarModalEditarUsuario() {
    cerrarModal("modalEditarUsuario");
}

function cerrarModalEditarPedido() {
    cerrarModal("modalEditarPedido");
}

function cerrarModalEditarPago() {
    cerrarModal("modalEditarPago");
}

function cerrarModalEditarBoleto() {
    cerrarModal("modalEditarBoleto");
}

async function guardarNuevoUsuario(e) {
    e.preventDefault();

    const Nombre = document.getElementById("nuevoUsuarioNombre").value.trim();
    const Apellido = document.getElementById("nuevoUsuarioApellido").value.trim();
    const Correo = document.getElementById("nuevoUsuarioCorreo").value.trim();
    const Telefono = document.getElementById("nuevoUsuarioTelefono").value.trim();
    const Contrasena = document.getElementById("nuevoUsuarioPassword").value;
    const Rol = Number(document.getElementById("nuevoUsuarioRol").value);

    if (!Nombre || !Apellido || !Correo || !Telefono || !Contrasena) {
        return alert("Completa todos los campos.");
    }

    const res = await secureFetch("/api/admin/usuarios/add", {
        method: "POST",
        body: JSON.stringify({ Nombre, Apellido, Correo, Contrasena, Telefono, Rol })
    });

    const data = await res.json();
    alert(data.message || (data.error ? "Error al crear usuario" : "Usuario creado"));

    if (!data.error) {
        cerrarModalCrearUsuario();
        await cargarUsuarios();
        await cargarWalletAdmin();
    }
}

async function guardarEdicionUsuario(e) {
    e.preventDefault();

    const ID = Number(document.getElementById("editarUsuarioId").value);
    const Nombre = document.getElementById("editarUsuarioNombre").value.trim();
    const Apellido = document.getElementById("editarUsuarioApellido").value.trim();
    const Correo = document.getElementById("editarUsuarioCorreo").value.trim();
    const Telefono = document.getElementById("editarUsuarioTelefono").value.trim();
    const Rol = Number(document.getElementById("editarUsuarioRol").value);

    if (!ID) return alert("ID de usuario inválido");
    if (!Nombre || !Apellido || !Correo || !Telefono) return alert("Completa todos los campos.");

    const res = await secureFetch("/api/admin/usuarios/update", {
        method: "POST",
        body: JSON.stringify({ ID, Nombre, Apellido, Correo, Telefono, Rol })
    });

    const data = await res.json();
    alert(data.message || (data.error ? "Error al actualizar usuario" : "Usuario actualizado"));

    if (!data.error) {
        cerrarModalEditarUsuario();
        await cargarUsuarios();
        await cargarWalletAdmin();
    }
}
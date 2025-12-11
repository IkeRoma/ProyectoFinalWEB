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

    // Usuarios y wallet
    cargarUsuarios();
    cargarWalletAdmin();

    // Catálogos de vuelos
    cargarAeropuertos();
    cargarVuelosAdmin();
    cargarAsientos();
    cargarEquipaje();

    // Filtros
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

    // Formularios
    document.getElementById("formAeropuerto").addEventListener("submit", guardarAeropuerto);
    document.getElementById("formVuelo").addEventListener("submit", guardarVuelo);
    document.getElementById("formAsiento").addEventListener("submit", guardarAsiento);
    document.getElementById("formEquipaje").addEventListener("submit", guardarEquipaje);
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
                <td>
                    <button onclick="eliminarUsuario(${u.ID})">Eliminar</button>
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

    const data = await res.json();
    alert(data.message);
    cargarUsuarios();
}

// ================================
// Wallet global (todas las tarjetas)
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
                    <td>
                        <button onclick="adminEliminarTarjeta(${w.id_wallet})">Eliminar</button>
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
                    <button onclick='editarAeropuerto(${JSON.stringify(a.id_aeropuerto)})'>Editar</button>
                    <button onclick='eliminarAeropuerto(${a.id_aeropuerto})'>Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editarAeropuerto(id) {
    let url = "/api/admin/aeropuertos?id=" + id;
    const res = await secureFetch(url);
    const data = await res.json();
    const a = (data.aeropuertos || [])[0];
    if (!a) return;

    document.getElementById("aeropuertoId").value = a.id_aeropuerto;
    document.getElementById("aeropuertoNombre").value = a.nombre;
    document.getElementById("aeropuertoCiudad").value = a.ciudad;
    document.getElementById("aeropuertoEstado").value = a.estado;
}

async function eliminarAeropuerto(id) {
    if (!confirm("¿Eliminar aeropuerto? Se desactivará lógicamente.")) return;

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
    let url = "/api/admin/vuelos?id=" + id;
    const res = await secureFetch(url);
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
    if (!confirm("¿Eliminar vuelo? Se desactivará lógicamente.")) return;

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
    let url = "/api/admin/asientos?id=" + id;
    const res = await secureFetch(url);
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
    if (!confirm("¿Eliminar asiento?")) return;

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
// Equipaje
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
    let url = "/api/admin/equipaje?id=" + id;
    const res = await secureFetch(url);
    const data = await res.json();
    const e = (data.equipaje || [])[0];
    if (!e) return;

    document.getElementById("equipajeId").value = e.id_equipaje;
    document.getElementById("equipajeVuelo").value = e.id_vuelo;
    document.getElementById("equipajeTipo").value = e.tipo;
    document.getElementById("equipajePrecio").value = e.precio_extra;
}

async function eliminarEquipaje(id) {
    if (!confirm("¿Eliminar configuración de equipaje?")) return;

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

/* Cabecera y filtros de tarjetas del admin */


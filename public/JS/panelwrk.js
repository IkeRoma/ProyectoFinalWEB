/* ============================================================
   Panel WRK (Rol=2)
   - Reutiliza admin.js para la mayoría de CRUD (usuarios/vuelos/asientos/equipaje/pedidos/pagos/boletos/tipos maleta)
   - Este archivo agrega:
       1) CRUD de Envío de equipaje
       2) CRUD de Reseñas
===============================================================*/

(function () {
    // Fallback si por alguna razón admin.js no definió secureFetch
    async function secureFetchFallback(url, options = {}) {
        const token = localStorage.getItem("token");
        options.headers = options.headers || {};
        options.headers["Content-Type"] = "application/json";
        if (token) options.headers["Authorization"] = `Bearer ${token}`;
        return fetch(url, options);
    }

    const secure = (typeof window.secureFetch === "function") ? window.secureFetch : secureFetchFallback;

    /* =========================
       ENVÍOS
    ==========================*/
    async function cargarEnvios(idFiltro = null) {
        const tbody = document.querySelector("#tablaEnvios tbody");
        if (!tbody) return;

        let url = "/api/admin/envios";
        if (idFiltro) url += `?id=${encodeURIComponent(idFiltro)}`;

        const res = await secure(url);
        const data = await res.json();

        tbody.innerHTML = "";
        (data.envios || []).forEach(e => {
            tbody.innerHTML += `
                <tr>
                    <td>${e.id_envio}</td>
                    <td>${e.id_usuario}</td>
                    <td>${e.id_pedido}</td>
                    <td>${e.id_direccion}</td>
                    <td>${e.cantidad}</td>
                    <td>${e.fecha_envio ? new Date(e.fecha_envio).toLocaleString() : ""}</td>
                    <td>${e.estado_envio}</td>
                    <td>$${Number(e.costo_envio || 0).toFixed(2)}</td>
                    <td>
                        <button class="btn-edit" onclick="editarEnvioWRK(${e.id_envio})">Editar</button>
                        <button class="btn-delete" onclick="eliminarEnvioWRK(${e.id_envio})">Eliminar</button>
                    </td>
                </tr>
            `;
        });
    }

    async function guardarEnvio(e) {
        e.preventDefault();

        const id_envio = document.getElementById("envioId").value;
        const id_usuario = Number(document.getElementById("envioUsuario").value);
        const id_pedido = Number(document.getElementById("envioPedido").value);
        const id_direccion = Number(document.getElementById("envioDireccion").value);
        const cantidad = Number(document.getElementById("envioCantidad").value);
        const costo_envio = Number(document.getElementById("envioCosto").value);
        const estado_envio = document.getElementById("envioEstado").value;

        if (!id_usuario || !id_pedido || !id_direccion || !cantidad || !estado_envio || !Number.isFinite(costo_envio)) {
            return alert("Completa todos los datos del envío.");
        }

        const endpoint = id_envio ? "/api/admin/envios/update" : "/api/admin/envios/add";
        const payload = id_envio
            ? { id_envio: Number(id_envio), id_usuario, id_pedido, id_direccion, cantidad, estado_envio, costo_envio }
            : { id_usuario, id_pedido, id_direccion, cantidad, estado_envio, costo_envio };

        const res = await secure(endpoint, { method: "POST", body: JSON.stringify(payload) });
        const data = await res.json();

        alert(data.message || "Guardado");

        if (!data.error) {
            document.getElementById("formEnvio").reset();
            document.getElementById("envioId").value = "";
            await cargarEnvios();
        }
    }

    async function editarEnvioWRK(id) {
        const res = await secure(`/api/admin/envios?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        const e = (data.envios || [])[0];
        if (!e) return;

        document.getElementById("envioId").value = e.id_envio;
        document.getElementById("envioUsuario").value = e.id_usuario;
        document.getElementById("envioPedido").value = e.id_pedido;
        document.getElementById("envioDireccion").value = e.id_direccion;
        document.getElementById("envioCantidad").value = e.cantidad;
        document.getElementById("envioCosto").value = e.costo_envio || 0;
        document.getElementById("envioEstado").value = e.estado_envio || "PENDIENTE";
    }

    async function eliminarEnvioWRK(id) {
        if (!confirm("¿Eliminar envío?")) return;

        const res = await secure("/api/admin/envios/delete", {
            method: "POST",
            body: JSON.stringify({ id_envio: id })
        });
        const data = await res.json();
        alert(data.message || "Eliminado");
        if (!data.error) await cargarEnvios();
    }

    // Exponer para onclick (HTML inline)
    window.editarEnvioWRK = editarEnvioWRK;
    window.eliminarEnvioWRK = eliminarEnvioWRK;

    /* =========================
       RESEÑAS
    ==========================*/
    async function cargarResenas({ id = null, usuarioID = null } = {}) {
        const tbody = document.querySelector("#tablaResenas tbody");
        if (!tbody) return;

        const params = [];
        if (id) params.push(`id=${encodeURIComponent(id)}`);
        if (usuarioID) params.push(`usuarioID=${encodeURIComponent(usuarioID)}`);

        const url = "/api/admin/reviews" + (params.length ? `?${params.join("&")}` : "");

        const res = await secure(url);
        const data = await res.json();

        tbody.innerHTML = "";
        (data.reseñas || []).forEach(r => {
            tbody.innerHTML += `
                <tr>
                    <td>${r.ID}</td>
                    <td>${r.UsuarioID}</td>
                    <td>${r.Nombre}</td>
                    <td>${r.Apellido}</td>
                    <td>${r.Reseña}</td>
                    <td>${r.Fecha ? new Date(r.Fecha).toLocaleString() : ""}</td>
                    <td>
                        <button class="btn-edit" onclick="editarResenaWRK(${r.ID})">Editar</button>
                        <button class="btn-delete" onclick="eliminarResenaWRK(${r.ID})">Eliminar</button>
                    </td>
                </tr>
            `;
        });
    }

    async function guardarResena(e) {
        e.preventDefault();

        const ID = document.getElementById("resenaId").value;
        const UsuarioID = Number(document.getElementById("resenaUsuario").value);
        const texto = document.getElementById("resenaTexto").value.trim();

        if (!UsuarioID || !texto) {
            return alert("Completa usuario y texto de reseña.");
        }

        if (ID) {
            // Update
            const res = await secure("/api/admin/reviews/update", {
                method: "POST",
                body: JSON.stringify({ ID: Number(ID), texto })
            });
            const data = await res.json();
            alert(data.message || "Actualizado");

            if (!data.error) {
                document.getElementById("formResena").reset();
                document.getElementById("resenaId").value = "";
                await cargarResenas();
            }
        } else {
            // Create
            const res = await secure("/api/admin/reviews/add", {
                method: "POST",
                body: JSON.stringify({ usuarioID: UsuarioID, texto })
            });
            const data = await res.json();
            alert(data.message || "Creado");

            if (!data.error) {
                document.getElementById("formResena").reset();
                await cargarResenas();
            }
        }
    }

    async function editarResenaWRK(id) {
        const res = await secure(`/api/admin/reviews?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        const r = (data.reseñas || [])[0];
        if (!r) return;

        document.getElementById("resenaId").value = r.ID;
        document.getElementById("resenaUsuario").value = r.UsuarioID;
        document.getElementById("resenaTexto").value = r.Reseña;
    }

    async function eliminarResenaWRK(id) {
        if (!confirm("¿Eliminar reseña?")) return;

        const res = await secure("/api/admin/reviews/delete", {
            method: "POST",
            body: JSON.stringify({ ID: id })
        });
        const data = await res.json();
        alert(data.message || "Eliminado");
        if (!data.error) await cargarResenas();
    }

    window.editarResenaWRK = editarResenaWRK;
    window.eliminarResenaWRK = eliminarResenaWRK;

    /* =========================
       INIT
    ==========================*/
    document.addEventListener("DOMContentLoaded", () => {
        // ENVÍOS
        const formEnvio = document.getElementById("formEnvio");
        if (formEnvio) formEnvio.addEventListener("submit", guardarEnvio);

        const btnFiltrarEnvios = document.getElementById("btnFiltrarEnvios");
        const btnVerTodosEnvios = document.getElementById("btnVerTodosEnvios");
        if (btnFiltrarEnvios) {
            btnFiltrarEnvios.addEventListener("click", (ev) => {
                ev.preventDefault();
                const id = document.getElementById("filtroEnvioId").value;
                cargarEnvios(id || null);
            });
        }
        if (btnVerTodosEnvios) {
            btnVerTodosEnvios.addEventListener("click", (ev) => {
                ev.preventDefault();
                document.getElementById("filtroEnvioId").value = "";
                cargarEnvios();
            });
        }
        cargarEnvios();

        // RESEÑAS
        const formResena = document.getElementById("formResena");
        if (formResena) formResena.addEventListener("submit", guardarResena);

        const btnFiltrarResenas = document.getElementById("btnFiltrarResenas");
        const btnVerTodasResenas = document.getElementById("btnVerTodasResenas");

        if (btnFiltrarResenas) {
            btnFiltrarResenas.addEventListener("click", (ev) => {
                ev.preventDefault();
                const id = document.getElementById("filtroResenaId").value;
                const usuarioID = document.getElementById("filtroResenaUsuario").value;
                cargarResenas({ id: id || null, usuarioID: usuarioID || null });
            });
        }

        if (btnVerTodasResenas) {
            btnVerTodasResenas.addEventListener("click", (ev) => {
                ev.preventDefault();
                document.getElementById("filtroResenaId").value = "";
                document.getElementById("filtroResenaUsuario").value = "";
                cargarResenas();
            });
        }

        cargarResenas();
    });
})();

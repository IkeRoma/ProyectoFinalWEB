document.addEventListener("DOMContentLoaded", () => {

    /* ==========================================================
        LISTA DE ESTADOS MEXICANOS (NO EDITABLE)
    ========================================================== */
    const ESTADOS_MEXICO = [
        "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
        "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango",
        "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "México", "Michoacán",
        "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
        "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco",
        "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
    ];

    function cargarSelectEstados(select) {
        select.innerHTML = "";
        ESTADOS_MEXICO.forEach(est => {
            const opt = document.createElement("option");
            opt.value = est;
            opt.textContent = est;
            select.appendChild(opt);
        });
    }

    /* ==========================================================
        FETCH SEGURO (TOKEN + VALIDACIÓN)
    ========================================================== */
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
            alert("Tu sesión expiró.");
            localStorage.clear();
            window.location.href = "LogIn.html";
        }

        return res;
    }

    /* ==========================================================
        DATOS DEL USUARIO
    ========================================================== */
    const usr = JSON.parse(localStorage.getItem("usuario"));
    if (!usr) return;

    document.getElementById("perfilNombre").textContent = usr.Nombre;
    document.getElementById("perfilNombreComp").textContent = usr.Nombre + " " + usr.Apellido;
    document.getElementById("perfilCorreo").textContent = usr.Correo;
    document.getElementById("perfilTelefono").textContent = usr.Telefono;

    /* ==========================================================
        MODALES
    ========================================================== */
    const modalEditarInfo = document.getElementById("modalEditarInfo");
    const modalPassword = document.getElementById("modalPassword");
    const modalReseñas = document.getElementById("modalReseñas");
    const modalHistorial = document.getElementById("modalHistorial");
    const modalAgregarDireccion = document.getElementById("modalAgregarDireccion");
    const modalEditarDireccion = document.getElementById("modalEditarDireccion");

    function open(modal) { modal.style.display = "flex"; }
    function close() {
        document.querySelectorAll(".modal").forEach(m => m.style.display = "none");
    }

    document.querySelectorAll("[data-close]").forEach(btn =>
        btn.addEventListener("click", close)
    );

    /* ==========================================================
        EDITAR INFORMACIÓN PERSONAL
    ========================================================== */
    document.getElementById("btnEditarInfo").onclick = () => {
        document.getElementById("inputNombre").value = usr.Nombre + " " + usr.Apellido;
        document.getElementById("inputCorreo").value = usr.Correo;
        document.getElementById("inputTelefono").value = usr.Telefono;
        open(modalEditarInfo);
    };

    document.getElementById("guardarInfo").onclick = async () => {
        const nombreCompleto = document.getElementById("inputNombre").value.trim().split(" ");
        const nombre = nombreCompleto[0];
        const apellido = nombreCompleto.slice(1).join(" ");
        const correo = document.getElementById("inputCorreo").value;
        const telefono = document.getElementById("inputTelefono").value;

        const body = { ID: usr.ID, Nombre: nombre, Apellido: apellido, Correo: correo, Telefono: telefono };

        const res = await secureFetch("/api/updateUser", {
            method: "POST",
            body: JSON.stringify(body)
        });

        const data = await res.json();
        alert(data.message);

        usr.Nombre = nombre;
        usr.Apellido = apellido;
        usr.Correo = correo;
        usr.Telefono = telefono;

        localStorage.setItem("usuario", JSON.stringify(usr));

        location.reload();
    };

    /* ==========================================================
        CAMBIAR CONTRASEÑA
    ========================================================== */
    const btnCambiarPassword = document.getElementById("btnCambiarPassword");
    if (btnCambiarPassword) btnCambiarPassword.onclick = () => open(modalPassword);

    const btnGuardarPassword = document.getElementById("guardarPassword");
    if (btnGuardarPassword) {
        btnGuardarPassword.onclick = async () => {
            const actual = document.getElementById("passActual").value;
            const nueva = document.getElementById("passNueva").value;
            const confirm = document.getElementById("passConfirm").value;

            if (!actual || !nueva || !confirm)
                return alert("Completa todos los campos.");

            if (nueva !== confirm)
                return alert("Las contraseñas no coinciden.");

            const res = await secureFetch("/api/updatePassword", {
                method: "POST",
                body: JSON.stringify({ ID: usr.ID, actual, nueva })
            });

            const data = await res.json();
            alert(data.message);

            if (data.success) close();
        };
    }

    /* ==========================================================
        VER RESEÑAS DEL USUARIO
    ========================================================== */
    document.getElementById("btnVerReseñas").onclick = async () => {
        open(modalReseñas);

        const cont = document.getElementById("listaReseñasUser");
        cont.innerHTML = "<p>Cargando...</p>";

        const res = await fetch("/api/reviews/byUser/" + usr.ID);
        const data = await res.json();

        cont.innerHTML = "";

        data.reseñas.forEach(r => {
            const p = document.createElement("p");
            p.textContent = `"${r.Reseña}" — ${new Date(r.Fecha).toLocaleDateString()}`;
            cont.appendChild(p);
        });
    };

    document.getElementById("btnHistorial").onclick = () => open(modalHistorial);

    /* ==========================================================
        GESTIÓN DE DIRECCIONES
    ========================================================== */
    const listaDirecciones = document.getElementById("listaDirecciones");
    const btnAgregarDireccion = document.getElementById("btnAgregarDireccion");

    async function cargarDirecciones() {
        const res = await secureFetch(`/api/envio/direcciones/${usr.ID}`);
        const data = await res.json();

        listaDirecciones.innerHTML = "";

        if (!data.direcciones.length) {
            listaDirecciones.innerHTML = "<p>No tienes direcciones registradas.</p>";
            return;
        }

        data.direcciones.forEach(dir => {
            const div = document.createElement("div");
            div.className = "direccion-item glass";
            div.innerHTML = `
                <p><strong>${dir.calle}</strong></p>
                <p>${dir.ciudad}, ${dir.estado}, C.P. ${dir.cp}</p>

                <button class="btn-azul" onclick="editarDireccionModal(${dir.id_direccion}, '${dir.calle}', '${dir.ciudad}', '${dir.estado}', '${dir.cp}')">
                    Editar
                </button>

                <button class="btn-cerrar" onclick="eliminarDireccion(${dir.id_direccion})">
                    Eliminar
                </button>
            `;

            listaDirecciones.appendChild(div);
        });
    }

    /* =======================
        AÑADIR DIRECCIÓN
    ======================= */
    btnAgregarDireccion.onclick = () => {
        cargarSelectEstados(dirEstado);
        open(modalAgregarDireccion);
    };

    document.getElementById("guardarDireccion").onclick = async () => {
        const body = {
            id_usuario: usr.ID,
            calle: dirCalle.value,
            ciudad: dirCiudad.value,
            estado: dirEstado.value,
            cp: dirCP.value
        };

        const res = await secureFetch("/api/envio/agregarDireccion", {
            method: "POST",
            body: JSON.stringify(body)
        });

        const data = await res.json();
        alert(data.message);

        close();
        cargarDirecciones();
    };

    /* =======================
        EDITAR DIRECCIÓN
    ======================= */
    window.editarDireccionModal = function(id, calle, ciudad, estado, cp) {
        cargarSelectEstados(editDirEstado);

        editDirID.value = id;
        editDirCalle.value = calle;
        editDirCiudad.value = ciudad;
        editDirEstado.value = estado;
        editDirCP.value = cp;

        open(modalEditarDireccion);
    };

    document.getElementById("actualizarDireccion").onclick = async () => {
        const body = {
            id_direccion: editDirID.value,
            calle: editDirCalle.value,
            ciudad: editDirCiudad.value,
            estado: editDirEstado.value,
            cp: editDirCP.value
        };

        const res = await secureFetch("/api/envio/editarDireccion", {
            method: "POST",
            body: JSON.stringify(body)
        });

        const data = await res.json();
        alert(data.message);

        close();
        cargarDirecciones();
    };

    /* =======================
        ELIMINAR DIRECCIÓN
    ======================= */
    window.eliminarDireccion = async function(id) {
        if (!confirm("¿Eliminar esta dirección?")) return;

        const res = await secureFetch("/api/envio/eliminarDireccion", {
            method: "POST",
            body: JSON.stringify({ id_direccion: id })
        });

        const data = await res.json();
        alert(data.message);

        cargarDirecciones();
    };

    /* =======================
        AUTO INICIO
    ======================= */
    cargarDirecciones();

});
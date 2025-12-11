document.addEventListener("DOMContentLoaded", () => {

    const usr = JSON.parse(localStorage.getItem("usuario"));

    if (!usr) return;

    // Mostrar datos iniciales
    document.getElementById("perfilNombre").textContent = usr.Nombre;
    document.getElementById("perfilNombreComp").textContent = usr.Nombre + " " + usr.Apellido;
    document.getElementById("perfilCorreo").textContent = usr.Correo;
    document.getElementById("perfilTelefono").textContent = usr.Telefono;

    /* ================================
       MODALES
    ================================= */
    const modalEditarInfo = document.getElementById("modalEditarInfo");
    const modalPassword = document.getElementById("modalPassword");
    const modalReseñas = document.getElementById("modalReseñas");
    const modalHistorial = document.getElementById("modalHistorial");

    const open = modal => modal.style.display = "flex";
    const close = () =>
        document.querySelectorAll(".modal").forEach(m => (m.style.display = "none"));

    document.querySelectorAll("[data-close]").forEach(btn =>
        btn.addEventListener("click", close)
    );

    /* =================================================
       ABRIR EDITAR INFORMACIÓN
    ================================================= */
    document.getElementById("btnEditarInfo").onclick = () => {
        document.getElementById("inputNombre").value = usr.Nombre + " " + usr.Apellido;
        document.getElementById("inputCorreo").value = usr.Correo;
        document.getElementById("inputTelefono").value = usr.Telefono;
        open(modalEditarInfo);
    };

    /* =================================================
       GUARDAR INFORMACIÓN PERSONAL — UPDATE USER
    ================================================= */
    document.getElementById("guardarInfo").onclick = async () => {
        const nombreCompleto = document.getElementById("inputNombre").value.trim().split(" ");
        const nombre = nombreCompleto[0];
        const apellido = nombreCompleto.slice(1).join(" ");
        const correo = document.getElementById("inputCorreo").value;
        const telefono = document.getElementById("inputTelefono").value;

        const body = {
            ID: usr.ID,
            Nombre: nombre,
            Apellido: apellido,
            Correo: correo,
            Telefono: telefono
        };

        const res = await fetch("/api/updateUser", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        alert(data.message);

        // Actualizar localStorage
        usr.Nombre = nombre;
        usr.Apellido = apellido;
        usr.Correo = correo;
        usr.Telefono = telefono;
        localStorage.setItem("usuario", JSON.stringify(usr));

        location.reload();
    };

    /* =================================================
       ABRIR MODAL CONTRASEÑA
    ================================================= */
    const btnCambiarPassword = document.getElementById("btnCambiarPassword");
    if (btnCambiarPassword) btnCambiarPassword.onclick = () => open(modalPassword);

    /* =================================================
       GUARDAR NUEVA CONTRASEÑA — UPDATE PASSWORD
    ================================================= */
    const btnGuardarPassword = document.getElementById("guardarPassword");
    if (btnGuardarPassword) {
        btnGuardarPassword.onclick = async () => {
            const actual = document.getElementById("passActual").value;
            const nueva = document.getElementById("passNueva").value;
            const confirm = document.getElementById("passConfirm").value;

            if (!actual || !nueva || !confirm)
                return alert("Debes llenar todos los campos.");

            if (nueva !== confirm)
                return alert("Las contraseñas no coinciden.");

            const res = await fetch("/api/updatePassword", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ID: usr.ID,
                    actual,
                    nueva
                })
            });

            const data = await res.json();
            alert(data.message);

            if (data.success) close();
        };
    }

    /* =================================================
       VER RESEÑAS DEL USUARIO
    ================================================= */
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

    /* =================================================
       HISTORIAL
    ================================================= */
    document.getElementById("btnHistorial").onclick = () => open(modalHistorial);
});
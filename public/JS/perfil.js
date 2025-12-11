/* ============================================================
   perfil.js — Control del panel de usuario
===============================================================*/

document.addEventListener("DOMContentLoaded", () => {
    const usr = JSON.parse(localStorage.getItem("usuario"));
    if (!usr) return;

    document.getElementById("perfilNombre").textContent = usr.Nombre;
    document.getElementById("perfilNombreComp").textContent =
        `${usr.Nombre} ${usr.Apellido}`;
    document.getElementById("perfilCorreo").textContent = usr.Correo;
    document.getElementById("perfilTelefono").textContent = usr.Telefono;
});
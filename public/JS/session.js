// ------ SESIÓN GLOBAL ------

// Verifica si existe un usuario en localStorage
function checkSession() {
    const user = localStorage.getItem("usuario");
    if (!user) {
        // Si no hay sesión, volver al login
        window.location.href = "login.html";
    }
}

// Cerrar sesión
function logout() {
    localStorage.removeItem("usuario");
    window.location.href = "login.html";
}
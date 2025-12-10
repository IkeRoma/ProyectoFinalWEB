document.addEventListener("DOMContentLoaded", () => {
    const nav = document.getElementById("mainNav");
    const navLinksContainer = document.querySelector('[data-nav="links"]');

    if (!navLinksContainer) return;

    // Crear un link del navbar
    function crearLink(texto, href, extraClass = "") {
        const a = document.createElement("a");
        a.textContent = texto;
        a.href = href;
        a.className = "nav__link " + extraClass;
        return a;
    }

    // Crear botón de cerrar sesión
    function crearBotonLogout() {
        const btn = document.createElement("button");
        btn.textContent = "Cerrar sesión";
        btn.className = "btn btn--ghost nav__link--primary";
        btn.style.borderRadius = "999px";

        btn.onclick = () => {
            localStorage.removeItem("usuario");
            window.location.href = "Index.html";
        };

        return btn;
    }

    function construirNavbar() {
        navLinksContainer.innerHTML = "";

        // Links básicos
        navLinksContainer.appendChild(crearLink("Inicio", "Index.html"));
        navLinksContainer.appendChild(crearLink("Vuelos", "Vuelos.html"));

        // Obtener usuario de localStorage
        let usuario = null;
        try {
            const raw = localStorage.getItem("usuario");
            if (raw) usuario = JSON.parse(raw);
        } catch (e) {
            console.error("Error parsing usuario:", e);
        }

        // Si NO está logueado
        if (!usuario) {
            navLinksContainer.appendChild(crearLink("Iniciar sesión", "LogIn.html", "nav__link--primary"));
            navLinksContainer.appendChild(crearLink("Registrarse", "Registro.html"));
            return;
        }

        // Si SÍ hay sesión
        const rol = usuario.Rol ?? 0;

        if (rol === 1) {
            // ADMIN
            navLinksContainer.appendChild(crearLink("Panel Admin", "#", "nav__link--primary"));
        } else {
            // USUARIO NORMAL
            navLinksContainer.appendChild(crearLink("Mi perfil", "#"));
        }

        navLinksContainer.appendChild(crearBotonLogout());
    }

    construirNavbar();

    // Efecto de navbar al hacer scroll
    window.addEventListener("scroll", () => {
        if (!nav) return;

        if (window.scrollY > 10) {
            nav.classList.add("nav--scrolled");
        } else {
            nav.classList.remove("nav--scrolled");
        }
    });
});

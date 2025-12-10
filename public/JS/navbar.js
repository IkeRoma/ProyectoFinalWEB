document.addEventListener("DOMContentLoaded", () => {

    /* ======================================================
       SISTEMA EXPIRACIÓN POR INACTIVIDAD (2 HORAS)
       ====================================================== */
    const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;

    function actualizarActividad() {
        localStorage.setItem("lastActivity", Date.now().toString());
    }

    function validarExpiracion() {
        const last = localStorage.getItem("lastActivity");
        if (!last) return actualizarActividad();

        const diff = Date.now() - parseInt(last);

        if (diff >= SESSION_TIMEOUT) {
            localStorage.removeItem("usuario");
            localStorage.removeItem("lastActivity");
            alert("Tu sesión ha expirado por inactividad. Por favor inicia sesión nuevamente.");
            window.location.href = "LogIn.html";
        }
    }

    ["mousemove", "keydown", "click", "touchstart"].forEach(ev =>
        document.addEventListener(ev, actualizarActividad)
    );

    validarExpiracion();


    /* ======================================================
       NAVBAR DINÁMICO
       ====================================================== */

    const nav = document.getElementById("mainNav");
    const navLinksContainer = document.querySelector('[data-nav="links"]');

    if (!navLinksContainer) return;

    function crearLink(texto, href, extraClass = "") {
        const a = document.createElement("a");
        a.textContent = texto;
        a.href = href;
        a.className = "nav__link " + extraClass;
        return a;
    }

    function crearBotonLogout() {
        const btn = document.createElement("button");
        btn.textContent = "Cerrar sesión";
        btn.className = "btn btn--ghost nav__link--primary";
        btn.style.borderRadius = "999px";
        btn.onclick = () => {
            localStorage.removeItem("usuario");
            localStorage.removeItem("lastActivity");
            window.location.href = "Index.html";
        };
        return btn;
    }

    function construirNavbar() {
        navLinksContainer.innerHTML = "";

        navLinksContainer.appendChild(crearLink("Inicio", "Index.html"));
        navLinksContainer.appendChild(crearLink("Vuelos", "Vuelos.html"));

        let usuario = null;

        try {
            usuario = JSON.parse(localStorage.getItem("usuario"));
        } catch {}

        if (!usuario) {
            navLinksContainer.appendChild(crearLink("Iniciar sesión", "LogIn.html", "nav__link--primary"));
            navLinksContainer.appendChild(crearLink("Registrarse", "Registro.html"));
            return;
        }

        if (usuario.Rol === 1) {
            navLinksContainer.appendChild(crearLink("Panel Admin", "#", "nav__link--primary"));
        } else {
            navLinksContainer.appendChild(crearLink("Mi Perfil", "#"));
        }

        navLinksContainer.appendChild(crearBotonLogout());
    }

    construirNavbar();

    window.addEventListener("scroll", () => {
        if (window.scrollY > 10) nav.classList.add("nav--scrolled");
        else nav.classList.remove("nav--scrolled");
    });

});

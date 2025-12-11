document.addEventListener("DOMContentLoaded", () => {

    /* ======================================================
       VERIFICADOR DE TOKEN JWT
    ====================================================== */
    function tokenValido() {
        const token = localStorage.getItem("token");
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const exp = payload.exp * 1000;

            // Si ya expiró
            if (Date.now() >= exp) {
                localStorage.removeItem("usuario");
                localStorage.removeItem("token");
                return false;
            }

            return true;
        } catch (e) {
            localStorage.removeItem("usuario");
            localStorage.removeItem("token");
            return false;
        }
    }

    /* ======================================================
       LIMPIEZA BÁSICA AL CARGAR
    ====================================================== */
    if (!tokenValido()) {
        localStorage.removeItem("usuario");
        localStorage.removeItem("token");
    }

    /* ======================================================
       CERRAR SESIÓN SOLO AL CERRAR PESTAÑA (NO EN REFRESH)
    ====================================================== */
    window.addEventListener("pagehide", (event) => {
        // Si la página se mantiene en caché (back/forward), no borramos nada
        if (event.persisted) return;

        localStorage.removeItem("usuario");
        localStorage.removeItem("lastActivity");
        localStorage.removeItem("token");
    });

    /* ======================================================
       BANNER COOKIES (NO ROMPE EN PÁGINAS SIN BANNER)
    ====================================================== */
    const cookieBanner = document.getElementById("cookieBanner");
    const btnCookies   = document.getElementById("aceptarCookies");

    if (cookieBanner && btnCookies) {
        if (!localStorage.getItem("cookiesAceptadas")) {
            cookieBanner.style.display = "block";
        }

        btnCookies.addEventListener("click", () => {
            localStorage.setItem("cookiesAceptadas", "true");
            cookieBanner.style.display = "none";
        });
    }

    /* ======================================================
       EXPIRACIÓN POR INACTIVIDAD (2 HORAS)
    ====================================================== */
    const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;

    function actualizarActividad() {
        localStorage.setItem("lastActivity", Date.now().toString());
    }

    function validarExpiracion() {
        const last = localStorage.getItem("lastActivity");
        if (!last) return;

        const diff = Date.now() - parseInt(last, 10);

        if (diff >= SESSION_TIMEOUT) {
            localStorage.removeItem("usuario");
            localStorage.removeItem("token");
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

    if (!nav || !navLinksContainer) return;

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
        btn.onclick = () => {
            localStorage.removeItem("usuario");
            localStorage.removeItem("token");
            localStorage.removeItem("lastActivity");
            window.location.href = "Index.html";
        };
        return btn;
    }

    function construirNavbar() {
        navLinksContainer.innerHTML = "";

        // Links comunes
        navLinksContainer.appendChild(crearLink("Inicio", "Index.html"));
        navLinksContainer.appendChild(crearLink("Vuelos", "Vuelos.html"));

        const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
        const tokenOK = tokenValido();

        // SIN SESIÓN
        if (!usuario || !tokenOK) {
            navLinksContainer.appendChild(
                crearLink("Iniciar sesión", "LogIn.html", "nav__link--primary")
            );
            navLinksContainer.appendChild(
                crearLink("Registrarse", "Registro.html")
            );
            return;
        }

        // ADMIN
        if (usuario.Rol === 1) {
            navLinksContainer.appendChild(
                crearLink("Panel Admin", "PanelAdmin.html", "nav__link--primary")
            );
        }

        // USUARIO NORMAL
        if (usuario.Rol === 0) {
            navLinksContainer.appendChild(
                crearLink("Mi Perfil", "MiPerfil.html")
            );
            navLinksContainer.appendChild(
                crearLink("Envio de equipaje", "EnvioEquipaje.html")
            );
        }

        navLinksContainer.appendChild(crearBotonLogout());
    }

    construirNavbar();

    /* ======================================================
       NAVBAR QUE APARECE AL ACERCAR EL CURSOR
    ====================================================== */
    const navBar   = document.getElementById("mainNav");
    const trigger  = document.getElementById("navTrigger");
    let hideTimeout;

    function mostrarNavbar() {
        if (!navBar) return;

        navBar.classList.add("nav--visible");
        if (hideTimeout) clearTimeout(hideTimeout);

        hideTimeout = setTimeout(() => {
            navBar.classList.remove("nav--visible");
        }, 2000);
    }

    if (trigger) {
        // Mostrar navbar cuando el cursor toca el área superior
        trigger.addEventListener("mousemove", mostrarNavbar);
    }

    // También mostrarlo si el usuario mueve la rueda estando arriba
    window.addEventListener("scroll", () => {
        if (window.scrollY < 20) mostrarNavbar();
    });
});
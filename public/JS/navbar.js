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

            if (Date.now() >= exp) {
                localStorage.removeItem("usuario");
                localStorage.removeItem("token");
                localStorage.removeItem("lastActivity");
                return false;
            }

            return true;
        } catch {
            localStorage.removeItem("usuario");
            localStorage.removeItem("token");
            return false;
        }
    }

    /* ======================================================
       VERIFICAR TOKEN AL CARGAR PÁGINA
    ====================================================== */
    if (!tokenValido()) {
        localStorage.removeItem("usuario");
        localStorage.removeItem("token");
    }

    /* ======================================================
       CERRAR SESIÓN SOLO AL CERRAR PESTAÑA (NO EN REFRESH)
    ====================================================== */
    window.addEventListener("pagehide", (event) => {
        if (event.persisted) return; // 🔥 evita borrar sesión en recarga
        localStorage.removeItem("usuario");
        localStorage.removeItem("lastActivity");
        localStorage.removeItem("token");
    });

    /* ======================================================
       BANNER COOKIES
    ====================================================== */
    if (!localStorage.getItem("cookiesAceptadas")) {
        document.getElementById("cookieBanner").style.display = "block";
    }

    document.getElementById("aceptarCookies").addEventListener("click", () => {
        localStorage.setItem("cookiesAceptadas", "true");
        document.getElementById("cookieBanner").style.display = "none";
    });

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

        const diff = Date.now() - parseInt(last);

        if (diff >= SESSION_TIMEOUT) {
            localStorage.removeItem("usuario");
            localStorage.removeItem("token");
            localStorage.removeItem("lastActivity");
            alert("Tu sesión ha expirado por inactividad.");
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

        navLinksContainer.appendChild(crearLink("Inicio", "Index.html"));
        navLinksContainer.appendChild(crearLink("Vuelos", "Vuelos.html"));

        const usuario = JSON.parse(localStorage.getItem("usuario"));
        const tokenOK = tokenValido();

        if (!usuario || !tokenOK) {
            navLinksContainer.appendChild(
                crearLink("Iniciar sesión", "LogIn.html", "nav__link--primary")
            );
            navLinksContainer.appendChild(
                crearLink("Registrarse", "Registro.html")
            );
            return;
        }

        if (usuario.Rol === 1) {
            navLinksContainer.appendChild(
                crearLink("Panel Admin", "PanelAdmin.html", "nav__link--primary")
            );
        }

        if (usuario.Rol === 0) {
            navLinksContainer.appendChild(crearLink("Mi Perfil", "MiPerfil.html"));
            navLinksContainer.appendChild(crearLink("Envio de Equipaje", "EnvioEquipaje.html"));
        }

        navLinksContainer.appendChild(crearBotonLogout());
    }

    construirNavbar();

    /* ======================================================
       EFECTO SCROLL
    ====================================================== */
    window.addEventListener("scroll", () => {
        if (window.scrollY > 10) nav.classList.add("nav--scrolled");
        else nav.classList.remove("nav--scrolled");
    });

    /* ======================================================
    NAVBAR QUE APARECE AL ACERCAR EL CURSOR
    ====================================================== */

    const navBar = document.getElementById("mainNav");
    const trigger = document.getElementById("navTrigger");

    let hideTimeout;

    function mostrarNavbar() {
        navBar.classList.add("nav--visible");
        if (hideTimeout) clearTimeout(hideTimeout);

        hideTimeout = setTimeout(() => {
            navBar.classList.remove("nav--visible");
        }, 2000);
    }

    // Mostrar navbar cuando el cursor toca el área superior
    trigger.addEventListener("mousemove", mostrarNavbar);

    // También mostrarlo si el usuario mueve la rueda en la parte superior
    window.addEventListener("scroll", () => {
        if (window.scrollY < 20) mostrarNavbar();
    });

});
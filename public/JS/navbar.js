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
            localStorage.removeItem("lastActivity");
            return false;
        }
    }

    /* ======================================================
       COOKIES
    ====================================================== */
    const cookieBanner = document.getElementById("cookieBanner");
    const btnCookies = document.getElementById("aceptarCookies");

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

    document.addEventListener("mousemove", actualizarActividad);
    document.addEventListener("keydown", actualizarActividad);
    document.addEventListener("click", actualizarActividad);

    function verificarInactividad() {
        const last = Number(localStorage.getItem("lastActivity") || "0");
        if (!last) {
            actualizarActividad();
            return;
        }

        if (Date.now() - last > SESSION_TIMEOUT) {
            alert("Tu sesión ha expirado por inactividad.");
            localStorage.clear();
            window.location.href = "LogIn.html";
        }
    }

    setInterval(verificarInactividad, 60 * 1000);

    /* ======================================================
       CONSTRUCCIÓN DEL NAVBAR
    ====================================================== */
    const navBar = document.getElementById("mainNav");
    const navLinksContainer = document.querySelector("[data-nav='links']");
    const trigger = document.getElementById("navTrigger");
    let hideTimeout = null;

    if (!navBar || !navLinksContainer) return;

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

        // Carrito disponible para usuarios con sesión
        navLinksContainer.appendChild(crearLink("Carrito", "Carrito.html"));

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
       NAVBAR FLOTANTE (mostrar al acercar el mouse arriba)
    ====================================================== */
    function mostrarNavbar() {
        navBar.classList.add("nav--visible");

        if (hideTimeout) clearTimeout(hideTimeout);

        hideTimeout = setTimeout(() => {
            navBar.classList.remove("nav--visible");
        }, 2000);
    }

    if (trigger) {
        trigger.addEventListener("mousemove", mostrarNavbar);
    }

    window.addEventListener("scroll", () => {
        if (window.scrollY < 20) mostrarNavbar();
    });
});
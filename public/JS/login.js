document.addEventListener("DOMContentLoaded", () => {

    // ============================
    //     FUNCIONES DE VALIDACIÓN
    // ============================
    function validarEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validarContrasena(password) {
        const tieneEspacios = /\s/.test(password);
        if (tieneEspacios) return false;
        if (password.length < 8) return false;
        if (!/[A-Z]/.test(password)) return false;
        if (!/[^a-zA-Z0-9]/.test(password)) return false;
        return true;
    }

    function validarTelefono(telefono) {
        return /^[0-9]{10}$/.test(telefono);
    }

    // ============================
    //            LOGIN
    // ============================
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("usuario").value.trim();
            const password = document.getElementById("contrasena").value.trim();
            const resultado = document.getElementById("resultado");

            if (!validarEmail(email)) {
                resultado.textContent = "⚠️ Ingresa un correo válido.";
                resultado.style.color = "red";
                return;
            }

            if (password.length === 0) {
                resultado.textContent = "⚠️ Ingresa una contraseña.";
                resultado.style.color = "red";
                return;
            }

            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (data.error) {
                resultado.textContent = data.message;
                resultado.style.color = "red";
            } else {
                // Guardamos el usuario con su Rol
                localStorage.setItem("usuario", JSON.stringify(data.user));

                resultado.textContent = "Inicio de sesión exitoso.";
                resultado.style.color = "green";

                setTimeout(() => {
                    window.location.href = "Index.html";
                }, 1000);
            }
        });
    }

    // ============================
    //          REGISTRO
    // ============================
    const registroForm = document.getElementById("registroForm");
    if (registroForm) {
        registroForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nombre = document.getElementById("regNombre").value.trim();
            const apellidos = document.getElementById("regApellidos").value.trim();
            const email = document.getElementById("regEmail").value.trim();
            const telefono = document.getElementById("regTelefono").value.trim();
            const password = document.getElementById("regPassword").value.trim();
            const password2 = document.getElementById("regPassword2").value.trim();
            const msg = document.getElementById("registroMsg");

            if (!validarEmail(email)) {
                msg.textContent = "⚠️ Ingresa un correo válido.";
                msg.style.color = "red";
                return;
            }

            if (!validarTelefono(telefono)) {
                msg.textContent = "⚠️ El teléfono debe tener 10 dígitos.";
                msg.style.color = "red";
                return;
            }

            if (!validarContrasena(password)) {
                msg.textContent = "⚠️ La contraseña no cumple los requisitos.";
                msg.style.color = "red";
                return;
            }

            if (password !== password2) {
                msg.textContent = "⚠️ Las contraseñas no coinciden.";
                msg.style.color = "red";
                return;
            }

            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, apellidos, email, telefono, password })
            });

            const data = await res.json();

            msg.textContent = data.message;
            msg.style.color = data.error ? "red" : "green";

            if (!data.error) {
                setTimeout(() => {
                    window.location.href = "LogIn.html";
                }, 1500);
            }
        });
    }

    // ============================
    //     RESET DE CONTRASEÑA
    // ============================
    const passwordForm = document.getElementById("passwordForm");
    if (passwordForm) {
        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("resetEmail").value.trim();
            const passwordNueva = document.getElementById("resetPassword").value.trim();
            const passwordNueva2 = document.getElementById("resetPassword2").value.trim();
            const msg = document.getElementById("resetMsg");

            if (!validarEmail(email)) {
                msg.textContent = "⚠️ Ingresa un correo válido.";
                msg.style.color = "red";
                return;
            }

            if (!validarContrasena(passwordNueva)) {
                msg.textContent = "⚠️ La contraseña no cumple los requisitos.";
                msg.style.color = "red";
                return;
            }

            if (passwordNueva !== passwordNueva2) {
                msg.textContent = "⚠️ Las contraseñas no coinciden.";
                msg.style.color = "red";
                return;
            }

            const res = await fetch("/api/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, passwordNueva })
            });

            const data = await res.json();

            msg.textContent = data.message;
            msg.style.color = data.error ? "red" : "green";

            if (!data.error) {
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1500);
            }
        });
    }

});

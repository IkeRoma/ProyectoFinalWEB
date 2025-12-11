document.addEventListener("DOMContentLoaded", () => {

    /* ============================
       VALIDACIONES
       ============================ */
    function validarEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validarContrasena(password) {
        return (
            password.length >= 8 &&
            !/\s/.test(password) &&
            /[A-Z]/.test(password) &&
            /[^a-zA-Z0-9]/.test(password)
        );
    }

    function validarTelefono(telefono) {
        return /^[0-9]{10}$/.test(telefono);
    }

    function mostrarMensaje(elemento, mensaje, tipo = "error") {
        elemento.textContent = mensaje;
        elemento.className = `form-message ${tipo}`;
        elemento.style.display = "block";

        setTimeout(() => {
            elemento.classList.add("fade-out");
        }, 3500);
    }

    /* ============================
       LOGIN
       ============================ */
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.setAttribute("novalidate", "true");

        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("usuario").value.trim();
            const password = document.getElementById("contrasena").value.trim();
            const msg = document.getElementById("resultado");

            if (!validarEmail(email)) {
                mostrarMensaje(msg, "⚠️ Ingresa un correo válido.");
                return;
            }

            if (!password) {
                mostrarMensaje(msg, "⚠️ Ingresa una contraseña.");
                return;
            }

            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (data.error) {
                mostrarMensaje(msg, data.message, "error");
            } else {

                // GUARDAR SESIÓN
                localStorage.setItem("usuario", JSON.stringify(data.user));
                localStorage.setItem("token", data.token);

                // 🔥 BORRAR CARRITO Y ENVÍOS AL INICIAR SESIÓN
                localStorage.removeItem("carrito");
                localStorage.removeItem("enviosEquipaje");
                localStorage.removeItem("envioEquipaje");

                mostrarMensaje(msg, "Inicio de sesión exitoso.", "success");

                setTimeout(() => {
                    window.location.href = "Index.html";
                }, 1000);
            }
        });
    }

    /* ============================
       REGISTRO
       ============================ */
    const registroForm = document.getElementById("registroForm");

    if (registroForm) {
        registroForm.setAttribute("novalidate", "true");

        registroForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nombre = document.getElementById("regNombre").value.trim();
            const apellidos = document.getElementById("regApellidos").value.trim();
            const email = document.getElementById("regEmail").value.trim();
            const telefono = document.getElementById("regTelefono").value.trim();
            const password = document.getElementById("regPassword").value.trim();
            const password2 = document.getElementById("regPassword2").value.trim();
            const msg = document.getElementById("registroMsg");

            if (!validarEmail(email)) return mostrarMensaje(msg, "⚠️ Ingresa un correo válido.");
            if (!validarTelefono(telefono)) return mostrarMensaje(msg, "⚠️ El teléfono debe tener 10 dígitos.");
            if (!validarContrasena(password)) return mostrarMensaje(msg, "⚠️ La contraseña no cumple los requisitos.");
            if (password !== password2) return mostrarMensaje(msg, "⚠️ Las contraseñas no coinciden.");

            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, apellidos, email, telefono, password })
            });

            const data = await res.json();

            mostrarMensaje(msg, data.message, data.error ? "error" : "success");

            if (!data.error) {
                setTimeout(() => window.location.href = "LogIn.html", 1500);
            }
        });
    }

    /* ============================
       RESET PASSWORD
       ============================ */
    const passwordForm = document.getElementById("passwordForm");

    if (passwordForm) {
        passwordForm.setAttribute("novalidate", "true");

        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("resetEmail").value.trim();
            const p1 = document.getElementById("resetPassword").value.trim();
            const p2 = document.getElementById("resetPassword2").value.trim();
            const msg = document.getElementById("resetMsg");

            if (!validarEmail(email)) return mostrarMensaje(msg, "⚠️ Ingresa un correo válido.");
            if (!validarContrasena(p1)) return mostrarMensaje(msg, "⚠️ La contraseña no cumple los requisitos.");
            if (p1 !== p2) return mostrarMensaje(msg, "⚠️ Las contraseñas no coinciden.");

            const res = await fetch("/api/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, passwordNueva: p1 })
            });

            const data = await res.json();

            mostrarMensaje(msg, data.message, data.error ? "error" : "success");

            if (!data.error) {
                setTimeout(() => window.location.href = "LogIn.html", 1800);
            }
        });
    }


    /* =======================================================
       SISTEMA GLOBAL DE VALIDACIÓN VISUAL
    ======================================================= */
    function marcarInput(input, valido, msg = "", contenedorMsg = null) {
        input.classList.remove("input-valid", "input-invalid", "shake");

        if (valido) {
            input.classList.add("input-valid");
            if (contenedorMsg) {
                contenedorMsg.textContent = msg;
                contenedorMsg.className = "form-msg success show";
            }
        } else {
            input.classList.add("input-invalid", "shake");
            if (contenedorMsg) {
                contenedorMsg.textContent = msg;
                contenedorMsg.className = "form-msg error show";
            }
        }
    }

});

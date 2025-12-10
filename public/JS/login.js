document.addEventListener("DOMContentLoaded", function() {

  // ===========================================================
  //  VALIDACIONES COMUNES
  // ===========================================================

  function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email)
      ? { valido: true, mensaje: "" }
      : { valido: false, mensaje: "⚠️ El formato del correo no es válido." };
  }

  function validarContrasena(password) {
    if (/\s/.test(password))
      return { valido: false, mensaje: "⚠️ La contraseña no puede contener espacios." };

    if (password.length < 8)
      return { valido: false, mensaje: "⚠️ La contraseña debe contener mínimo 8 caracteres." };

    if (!/[A-Z]/.test(password))
      return { valido: false, mensaje: "⚠️ La contraseña debe incluir al menos una letra mayúscula." };

    if (!/[^A-Za-z0-9]/.test(password))
      return { valido: false, mensaje: "⚠️ La contraseña debe incluir al menos un carácter especial." };

    return { valido: true, mensaje: "" };
  }

  function validarTelefono(tel) {
    if (!/^[0-9]+$/.test(tel))
      return { valido: false, mensaje: "⚠️ El teléfono solo puede contener números." };

    if (tel.length !== 10)
      return { valido: false, mensaje: "⚠️ El teléfono debe contener exactamente 10 dígitos." };

    return { valido: true, mensaje: "" };
  }

  // ===========================================================
  //  LOGIN
  // ===========================================================

  document.getElementById("loginForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();

    const email = document.getElementById("usuario").value.trim();
    const password = document.getElementById("contrasena").value.trim();
    const msg = document.getElementById("resultado");

    const vEmail = validarEmail(email);
    const vPass = validarContrasena(password);

    if (!vEmail.valido || !vPass.valido) {
      msg.style.color = "red";
      msg.innerText =
        (!vEmail.valido ? vEmail.mensaje + "\n" : "") +
        (!vPass.valido ? vPass.mensaje : "");
      return;
    }

    try {
      // 🔥 RUTA CORREGIDA
    const res = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });


      const data = await res.json();

      if (!data.error) {
        localStorage.setItem("usuario", JSON.stringify(data.user));

        msg.style.color = "green";
        msg.innerText = data.message;

        alert("✅ " + data.message);

        setTimeout(() => {
          window.location.href = "Index.html";
        }, 1000);
      } else {
        msg.style.color = "red";
        msg.innerText = data.message;
        alert("❌ " + data.message);
      }

    } catch (error) {
      msg.style.color = "red";
      msg.innerText = "⚠️ Problemas en los servidores.";
      alert("⚠️ Problemas en los servidores");
      console.error(error);
    }
  });

  // ===========================================================
  //  REGISTRO
  // ===========================================================

  document.getElementById("registroForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();

    const nombre = document.getElementById("regNombre").value.trim();
    const apellidos = document.getElementById("regApellidos").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const telefono = document.getElementById("regTelefono").value.trim();
    const password = document.getElementById("regPassword").value;
    const password2 = document.getElementById("regPassword2").value;
    const msg = document.getElementById("registroMsg");

    const vEmail = validarEmail(email);
    const vPass = validarContrasena(password);
    const vTel = validarTelefono(telefono);

    if (!nombre || !apellidos) {
      msg.style.color = "red";
      msg.innerText = "⚠️ Debes ingresar nombre y apellidos.";
      return;
    }

    if (!vEmail.valido || !vPass.valido || !vTel.valido) {
      msg.style.color = "red";
      msg.innerText =
        (!vTel.valido ? vTel.mensaje + "\n" : "") +
        (!vEmail.valido ? vEmail.mensaje + "\n" : "") +
        (!vPass.valido ? vPass.mensaje : "");
      return;
    }

    if (password !== password2) {
      msg.style.color = "red";
      msg.innerText = "⚠️ Las contraseñas no coinciden.";
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, apellidos, email, telefono, password }),
    });


      const data = await res.json();

      msg.style.color = data.error ? "red" : "green";
      msg.innerText = data.message;

      if (!data.error) {
        alert("✅ " + data.message);
        setTimeout(() => window.location.href = "LogIn.html", 1500);
      } else {
        alert("❌ " + data.message);
      }

    } catch (err) {
      msg.style.color = "red";
      msg.innerText = "⚠️ Problemas en los servidores.";
      alert("⚠️ Problemas en los servidores");
      console.error(err);
    }
  });

  // ===========================================================
  //  RECUPERAR CONTRASEÑA
  // ===========================================================

  document.getElementById("passwordForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();

    const email = document.getElementById("resetEmail").value.trim();
    const password = document.getElementById("resetPassword").value;
    const password2 = document.getElementById("resetPassword2").value;
    const msg = document.getElementById("resetMsg");

    const vEmail = validarEmail(email);
    if (!vEmail.valido) {
      msg.style.color = "red";
      msg.innerText = vEmail.mensaje;
      return;
    }

    if (password !== password2) {
      msg.style.color = "red";
      msg.innerText = "⚠️ Las contraseñas no coinciden.";
      return;
    }

    const vPass = validarContrasena(password);
    if (!vPass.valido) {
      msg.style.color = "red";
      msg.innerText = vPass.mensaje;
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, passwordNueva: password }),
    });

      const data = await res.json();

      msg.style.color = data.error ? "red" : "green";
      msg.innerText = data.message;

      if (!data.error) {
        alert("✅ " + data.message);
        setTimeout(() => window.location.href = "login.html", 1500);
      } else {
        alert("❌ " + data.message);
      }

    } catch (err) {
      msg.style.color = "red";
      msg.innerText = "⚠️ Problemas en los servidores.";
      alert("⚠️ Problemas en los servidores");
      console.error(err);
    }
  });

});

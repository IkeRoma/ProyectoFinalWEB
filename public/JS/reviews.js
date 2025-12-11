document.addEventListener("DOMContentLoaded", () => {
    
    const contenedor = document.getElementById("contenedorReseñas");
    const user = JSON.parse(localStorage.getItem("usuario"));
    const formReseña = document.getElementById("formularioReseña");
    const btnEnviar = document.getElementById("btnEnviarReseña");
    const msgReseña = document.getElementById("msgReseña");

    // === Mostrar formulario solo si hay usuario logueado ===
    if (user) {
        formReseña.style.display = "block";
    }

    // =========================
    // CARGAR RESEÑAS DESDE EL SERVIDOR
    // =========================
    async function cargarReseñas() {
        const res = await fetch("/api/reviews/list");
        const data = await res.json();
        contenedor.innerHTML = "";

        data.reseñas.forEach(r => {
            const div = document.createElement("div");
            div.classList.add("review-card");

            div.innerHTML = `
                <p class="review-text">"${r.Reseña}"</p>
                <p class="review-user">— ${r.Nombre} ${r.Apellido}</p>
                <p class="review-date">${new Date(r.Fecha).toLocaleDateString()}</p>
            `;

            contenedor.appendChild(div);
        });
    }

    cargarReseñas(); // cargar al entrar


    // =========================
    // ENVIAR RESEÑA
    // =========================
    btnEnviar?.addEventListener("click", async () => {
        const texto = document.getElementById("textoReseña").value.trim();

        if (!texto) {
            msgReseña.textContent = "La reseña no puede estar vacía.";
            msgReseña.className = "form-message error";
            return;
        }

        const body = {
            usuarioID: user?.ID,
            texto
        };

        const res = await fetch("/api/reviews/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (data.message.includes("éxito")) {
            msgReseña.textContent = "Reseña enviada correctamente.";
            msgReseña.className = "form-message success";

            document.getElementById("textoReseña").value = "";

            cargarReseñas(); // actualizar dinámicamente
        } else {
            msgReseña.textContent = "Error al enviar reseña.";
            msgReseña.className = "form-message error";
        }
    });

});

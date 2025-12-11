document.addEventListener("DOMContentLoaded", () => {

    const contenedor = document.getElementById("contenedorReseñas");
    const user = JSON.parse(localStorage.getItem("usuario"));
    const formReseña = document.getElementById("formularioReseña");
    const btnEnviar = document.getElementById("btnEnviarReseña");
    const msgReseña = document.getElementById("msgReseña");

    // Mostrar formulario solo si el usuario inició sesión
    if (user) {
        formReseña.style.display = "flex";
    }

    // =====================================================
    // FUNCIÓN PARA CARGAR RESEÑAS DESDE EL SERVIDOR
    // =====================================================
    async function cargarReseñas() {
        const res = await fetch("/api/reviews/list");
        const data = await res.json();

        contenedor.innerHTML = "";

        data.reseñas.forEach((r, index) => {
            const div = document.createElement("div");
            div.classList.add("review-card");

            // Crear avatar con iniciales
            const iniciales = (r.Nombre[0] + r.Apellido[0]).toUpperCase();

            // Construcción de la tarjeta premium
            div.innerHTML = `
                <div class="review-avatar">${iniciales}</div>

                <div class="review-content">
                    <div class="review-user">${r.Nombre} ${r.Apellido}</div>
                    <div class="review-date">${new Date(r.Fecha).toLocaleDateString()}</div>

                    <div class="review-stars">★★★★★</div>

                    <div class="review-text">"${r.Reseña}"</div>
                </div>
            `;

            contenedor.appendChild(div);

            // Animación de aparición con retraso escalonado
            setTimeout(() => {
                div.classList.add("visible");
            }, 120 * index);
        });
    }

    cargarReseñas(); // Cargar al entrar en la página


    // =====================================================
    // ENVIAR UNA NUEVA RESEÑA
    // =====================================================
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

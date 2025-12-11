document.addEventListener("DOMContentLoaded", () => {

    // ELEMENTOS DEL DOM
    const bloque = document.getElementById("bloqueAgregarReseña");
    const textarea = document.getElementById("textoReseña");
    const btnEnviar = document.getElementById("btnEnviarReseña");
    const msgReseña = document.getElementById("msgReseña");

    const carrusel = document.getElementById("carouselResenas");
    const btnLeft = document.getElementById("btnLeft");
    const btnRight = document.getElementById("btnRight");

    // USUARIO ACTUAL
    const user = JSON.parse(localStorage.getItem("usuario"));

    // Mostrar formulario solo si hay usuario logueado
    if (user) {
        bloque.style.display = "block";
    } else {
        bloque.style.display = "none";
    }


    /* =====================================================
         FUNCIÓN PARA CARGAR TODAS LAS RESEÑAS
    ===================================================== */
    async function cargarReseñas() {
        try {
            const res = await fetch("/api/reviews/list");
            const data = await res.json();

            if (!data.reseñas) return;

            // Limpiar carrusel
            carrusel.innerHTML = "";

            // Insertar reseñas
            data.reseñas.forEach(r => {
                const card = document.createElement("div");
                card.classList.add("review-card");

                card.innerHTML = `
                    <p class="review-text">"${r.Reseña}"</p>
                    <p class="review-author">— ${r.Nombre} ${r.Apellido}</p>
                    <p class="review-date">${new Date(r.Fecha).toLocaleDateString()}</p>
                `;

                carrusel.appendChild(card);
            });

        } catch (error) {
            console.error("Error cargando reseñas:", error);
        }
    }


    /* =====================================================
         FUNCIÓN PARA ENVIAR UNA RESEÑA
    ===================================================== */
    btnEnviar?.addEventListener("click", async () => {

        if (!user) {
            msgReseña.style.color = "red";
            msgReseña.textContent = "Debes iniciar sesión para enviar una reseña.";
            return;
        }

        const texto = textarea.value.trim();

        if (texto.length < 5) {
            msgReseña.style.color = "red";
            msgReseña.textContent = "La reseña es demasiado corta.";
            return;
        }

        try {
            const res = await fetch("/api/reviews/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usuarioID: user.ID,
                    texto: texto
                })
            });

            const data = await res.json();

            msgReseña.style.color = "lime";
            msgReseña.textContent = data.message;

            textarea.value = "";

            // VOLVER A CARGAR DESPUÉS DE AGREGAR UNA RESEÑA
            cargarReseñas();

        } catch (error) {
            console.error("Error al enviar reseña:", error);
        }
    });


    /* =====================================================
         BOTONES DEL CARRUSEL
    ===================================================== */
    btnLeft?.addEventListener("click", () => {
        carrusel.scrollLeft -= 300;
    });

    btnRight?.addEventListener("click", () => {
        carrusel.scrollLeft += 300;
    });


    /* =====================================================
         CARGAR LAS RESEÑAS AL INICIO
    ===================================================== */
    cargarReseñas();

});
document.addEventListener("DOMContentLoaded", () => {

    // ELEMENTOS DEL DOM
    const bloque = document.getElementById("bloqueAgregarReseña");
    const textarea = document.getElementById("textoReseña");
    const btnEnviar = document.getElementById("btnEnviarReseña");
    const msgReseña = document.getElementById("msgReseña");

    const carrusel = document.getElementById("carouselResenas");
    const btnLeft = document.getElementById("btnLeft");
    const btnRight = document.getElementById("btnRight");

    const user = JSON.parse(localStorage.getItem("usuario"));

    // Mostrar formulario si hay sesión
    bloque.style.display = user ? "block" : "none";


    /* =====================================================
         CARGAR TODAS LAS RESEÑAS
    ===================================================== */
    async function cargarReseñas() {
        if (!carrusel) return;

        try {
            const res = await fetch("/api/reviews/list");
            const data = await res.json();

            carrusel.innerHTML = "";

            if (!data.reseñas || data.reseñas.length === 0) {
                carrusel.innerHTML = `<p class="no-resenas">No hay reseñas todavía.</p>`;
                return;
            }

            data.reseñas.forEach(r => {
                const card = document.createElement("div");
                card.classList.add("review-card");

                card.innerHTML = `
                    <p class="review-text">"${r.Reseña}"</p>
                    <p class="review-author">— ${r.Nombre} ${r.Apellido}</p>
                    <p class="review-date">${new Date(r.Fecha).toLocaleDateString()}</p>
                `;

                // Animación de selección
                card.addEventListener("click", () => {
                    document.querySelectorAll(".review-card").forEach(c =>
                        c.classList.remove("selected")
                    );
                    card.classList.add("selected");
                });

                carrusel.appendChild(card);
            });

            iniciarAutoScroll();

        } catch (error) {
            console.error("Error cargando reseñas:", error);
        }
    }


    /* =====================================================
         AUTO-SCROLL DEL CARRUSEL (MEJORADO)
    ===================================================== */

    let autoScrollInterval;
    const SCROLL_SPEED = 1;     // velocidad del movimiento (px por tick)
    const TICK_RATE = 15;       // intervalo del movimiento (ms)
    const PAUSE_TIME = 2500;    // pausa cuando se llega al final

    function iniciarAutoScroll() {
        detenerAutoScroll(); // Reiniciar si ya estaba corriendo

        autoScrollInterval = setInterval(() => {
            carrusel.scrollLeft += SCROLL_SPEED;

            // Si llega al final → reinicia con pausa
            if (carrusel.scrollLeft + carrusel.clientWidth >= carrusel.scrollWidth) {
                detenerAutoScroll();
                setTimeout(() => {
                    carrusel.scrollLeft = 0;
                    iniciarAutoScroll();
                }, PAUSE_TIME);
            }
        }, TICK_RATE);
    }

    function detenerAutoScroll() {
        clearInterval(autoScrollInterval);
    }

    // Pausar al pasar el mouse
    carrusel?.addEventListener("mouseenter", detenerAutoScroll);
    carrusel?.addEventListener("mouseleave", iniciarAutoScroll);


    /* =====================================================
         MANEJO DE BOTONES
    ===================================================== */
    btnLeft?.addEventListener("click", () => {
        carrusel.scrollBy({ left: -300, behavior: "smooth" });
    });

    btnRight?.addEventListener("click", () => {
        carrusel.scrollBy({ left: 300, behavior: "smooth" });
    });


    /* =====================================================
         ENVÍO DE RESEÑA
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
                    texto
                })
            });

            const data = await res.json();
            msgReseña.style.color = "lime";
            msgReseña.textContent = data.message;

            textarea.value = "";
            cargarReseñas();

        } catch (error) {
            console.error("Error al enviar reseña:", error);
        }
    });


    /* =====================================================
         INICIO
    ===================================================== */
    cargarReseñas();
});
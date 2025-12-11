document.addEventListener("DOMContentLoaded", () => {

    const contenedor = document.getElementById("contenedorReseñas");
    const bloque = document.getElementById("bloqueAgregarReseña");
    const textarea = document.getElementById("textoReseña");
    const btnEnviar = document.getElementById("btnEnviarReseña");
    const msgReseña = document.getElementById("msgReseña");

    const user = JSON.parse(localStorage.getItem("usuario"));

    // Mostrar el formulario solo si hay usuario logueado
    if (user) bloque.style.display = "block";
    else bloque.style.display = "none";


    /* =======================
       CARGAR TODAS LAS RESEÑAS
    ======================== */
    async function cargarReseñas() {
        const res = await fetch("/api/reviews/list");
        const data = await res.json();

        contenedor.innerHTML = "";

        data.reseñas.forEach(r => {
            const div = document.createElement("div");
            div.classList.add("review-card");

            div.innerHTML = `
                <p class="review-text">"${r.Reseña}"</p>
                <p class="review-author">— ${r.Nombre} ${r.Apellido}</p>
                <p class="review-date">${new Date(r.Fecha).toLocaleDateString()}</p>
            `;

            contenedor.appendChild(div);
        });
    }


    /* =======================
       ENVIAR RESEÑA
    ======================== */
    btnEnviar?.addEventListener("click", async () => {

        if (!user) {
            msgReseña.textContent = "Debes iniciar sesión para enviar una reseña.";
            msgReseña.style.color = "red";
            return;
        }

        const texto = textarea.value.trim();
        if (texto.length < 5) {
            msgReseña.textContent = "La reseña es demasiado corta.";
            msgReseña.style.color = "red";
            return;
        }

        const res = await fetch("/api/reviews/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioID: user.ID, texto })
        });

        const data = await res.json();
        msgReseña.textContent = data.message;
        msgReseña.style.color = "lime";

        textarea.value = "";
        cargarReseñas();
    });

    // Cargar reseñas al iniciar
    cargarReseñas();

    // --- CARRUSEL --- //
    const carrusel = document.getElementById("carouselResenas");
    const leftBtn = document.getElementById("btnLeft");
    const rightBtn = document.getElementById("btnRight");

    leftBtn.addEventListener("click", () => {
        carrusel.scrollLeft -= 300;
    });
    rightBtn.addEventListener("click", () => {
        carrusel.scrollLeft += 300;
    });

}); //fin DOOM

document.addEventListener("DOMContentLoaded", async () => {

    async function cargarAeropuertos() {
        try {
            const res = await fetch("/api/aeropuertos");
            const data = await res.json();

            if (data.error) return [];

            return data.aeropuertos || [];
        } catch (e) {
            console.error("Error cargando aeropuertos", e);
            return [];
        }
    }

    const aeropuertos = await cargarAeropuertos();

    function llenarSelect(select) {
        if (!select) return;

        aeropuertos.forEach(a => {
            const opt = document.createElement("option");
            opt.value = a.ciudad;
            opt.textContent = a.ciudad;
            select.appendChild(opt);
        });
    }

    // Index.html
    llenarSelect(document.getElementById("origen"));
    llenarSelect(document.getElementById("destino"));

    // Vuelos.html
    llenarSelect(document.getElementById("inputOrigen"));
    llenarSelect(document.getElementById("inputDestino"));
});
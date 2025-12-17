// JS/indexBusqueda.js
document.addEventListener("DOMContentLoaded", () => {

    /* ============================
       UTILIDAD: obtener valores
    ============================ */
    function obtenerValoresBusqueda(prefijo = "") {
        const origenEl = document.getElementById(prefijo + "origen");
        const destinoEl = document.getElementById(prefijo + "destino");
        const fechaEl = document.getElementById(prefijo + "salida");
        const pasajerosEl = document.getElementById(prefijo + "pasajeros");

        if (!origenEl || !destinoEl || !fechaEl || !pasajerosEl) return null;

        return {
            origen: origenEl.value.trim(),
            destino: destinoEl.value.trim(),
            fecha: fechaEl.value,
            pasajeros: pasajerosEl.value || 1
        };
    }

    /* ============================
       REDIRECCIÓN UNIFICADA
    ============================ */
    function ejecutarBusqueda(valores) {
        if (!valores.origen || !valores.destino || !valores.fecha) {
            alert("Completa origen, destino y fecha");
            return;
        }

        if (valores.origen === valores.destino) {
            alert("El origen y destino no pueden ser iguales");
            return;
        }

        const url = `Vuelos.html?` +
            `origen=${encodeURIComponent(valores.origen)}` +
            `&destino=${encodeURIComponent(valores.destino)}` +
            `&fecha=${encodeURIComponent(valores.fecha)}` +
            `&pasajeros=${encodeURIComponent(valores.pasajeros)}`;

        window.location.href = url;
    }

    /* ============================
       INDEX.HTML
    ============================ */
    const btnIndex = document.getElementById("btnBuscarIndex");
    if (btnIndex) {
        btnIndex.addEventListener("click", () => {
            const valores = obtenerValoresBusqueda("");
            if (valores) ejecutarBusqueda(valores);
        });
    }

    /* ============================
       VUELOS.HTML
    ============================ */
    const formVuelos = document.getElementById("formBusquedaVuelos");
    if (formVuelos) {
        formVuelos.addEventListener("submit", e => {
            e.preventDefault();

            const valores = {
                origen: document.getElementById("inputOrigen")?.value.trim(),
                destino: document.getElementById("inputDestino")?.value.trim(),
                fecha: document.getElementById("inputFechaSalida")?.value,
                pasajeros: document.getElementById("inputPasajeros")?.value || 1
            };

            ejecutarBusqueda(valores);
        });
    }
});
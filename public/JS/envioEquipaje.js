/* ============================================================
   envioEquipaje.js — Registro del envío y cálculo del precio
   Compatible con carrito.js (usa localStorage)
===============================================================*/

document.addEventListener("DOMContentLoaded", () => {

    const usr = JSON.parse(localStorage.getItem("usuario") || "null");
    if (!usr) {
        window.location.href = "LogIn.html";
        return;
    }

    const form = document.getElementById("formEnvio");
    const selectTamano = document.getElementById("selectTamanoMaleta");
    const inputPeso = document.getElementById("inputPesoMaleta");
    const labelPrecio = document.getElementById("envioPrecioLabel");

    // Configuración del modelo C (debe coincidir con la BD)
    const tiposMaleta = {
        1: { nombre: "Pequeña", peso_max: 10, precio_base: 200, tarifa_extra: 25 },
        2: { nombre: "Mediana", peso_max: 20, precio_base: 300, tarifa_extra: 25 },
        3: { nombre: "Grande", peso_max: 30, precio_base: 400, tarifa_extra: 25 },
        4: { nombre: "XL",      peso_max: 45, precio_base: 550, tarifa_extra: 25 }
    };

    function calcularPrecio(id, peso) {
        const m = tiposMaleta[id];
        if (!m) return 0;

        const extra = Math.max(0, peso - m.peso_max);
        return m.precio_base + extra * m.tarifa_extra;
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const idMaleta = Number(selectTamano.value);
        const peso = Number(inputPeso.value);

        if (!idMaleta || !peso) {
            alert("Ingresa valores válidos.");
            return;
        }

        const precio = calcularPrecio(idMaleta, peso);

        const data = {
            id_tipo_maleta: idMaleta,
            nombre_tipo: tiposMaleta[idMaleta].nombre,
            peso,
            precio_total: precio
        };

        // Guardamos para que carrito.js lo use
        localStorage.setItem("envioEquipaje", JSON.stringify(data));

        labelPrecio.textContent =
            `Costo de envío: $${precio.toFixed(2)} MXN (Ya puedes pagar en el carrito).`;
        labelPrecio.style.color = "lime";
    });

});

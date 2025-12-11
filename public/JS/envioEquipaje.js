/* ============================================================
   envioEquipaje.js — Selección de dirección + múltiples envíos
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
    const selectDireccion = document.getElementById("selectDireccion");
    const labelPrecio = document.getElementById("envioPrecioLabel");

    // Configuración del modelo C (debe coincidir con tipos_maleta en BD)
    const tiposMaleta = {
        1: { nombre: "Pequeña", peso_max: 10, precio_base: 200, tarifa_extra: 25 },
        2: { nombre: "Mediana", peso_max: 20, precio_base: 300, tarifa_extra: 25 },
        3: { nombre: "Grande", peso_max: 30, precio_base: 400, tarifa_extra: 25 },
        4: { nombre: "XL",      peso_max: 45, precio_base: 550, tarifa_extra: 25 }
    };

    function secureHeaders() {
        return {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        };
    }

    async function secureFetch(url) {
        const res = await fetch(url, { headers: secureHeaders() });
        if (res.status === 401) {
            alert("Tu sesión expiró. Inicia sesión nuevamente.");
            localStorage.clear();
            window.location.href = "LogIn.html";
        }
        return res;
    }

    /* ================================
       1. Cargar direcciones del usuario
    =================================*/
    async function cargarDirecciones() {
        try {
            const res = await secureFetch(`/api/envio/direcciones/${usr.ID}`);
            const data = await res.json();

            selectDireccion.innerHTML = "";

            if (!data.direcciones || data.direcciones.length === 0) {
                selectDireccion.innerHTML =
                    `<option value="">No tienes direcciones registradas (ve a Mi Perfil)</option>`;
                selectDireccion.disabled = true;
                return;
            }

            data.direcciones.forEach(d => {
                const opt = document.createElement("option");
                opt.value = d.id_direccion;
                opt.textContent = `${d.calle}, ${d.ciudad}, ${d.estado}, C.P. ${d.cp}`;
                selectDireccion.appendChild(opt);
            });

            selectDireccion.disabled = false;
        } catch (e) {
            console.error(e);
            selectDireccion.innerHTML =
                `<option value="">Error al cargar direcciones</option>`;
            selectDireccion.disabled = true;
        }
    }

    cargarDirecciones();


    /* ================================
       2. Cálculo del precio del envío
    =================================*/
    function calcularPrecio(idMaleta, peso) {
        const m = tiposMaleta[idMaleta];
        if (!m) return 0;
        const extraKg = Math.max(0, peso - m.peso_max);
        return m.precio_base + extraKg * m.tarifa_extra;
    }


    /* ================================
       3. Guardar envío en localStorage
       (múltiples envíos)
    =================================*/
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const idMaleta = Number(selectTamano.value);
        const peso = Number(inputPeso.value);
        const idDireccion = Number(selectDireccion.value);

        if (!idMaleta) {
            alert("Selecciona un tamaño de maleta.");
            return;
        }
        if (!peso || peso <= 0) {
            alert("Ingresa un peso válido.");
            return;
        }
        if (!idDireccion) {
            alert("Selecciona una dirección de entrega.");
            return;
        }

        const precio = calcularPrecio(idMaleta, peso);

        let envios = [];
        try {
            envios = JSON.parse(localStorage.getItem("enviosEquipaje") || "[]");
            if (!Array.isArray(envios)) envios = [];
        } catch {
            envios = [];
        }

        const envioData = {
            id_local: Date.now(), // identificador local
            id_tipo_maleta: idMaleta,
            nombre_tipo: tiposMaleta[idMaleta].nombre,
            peso,
            precio_total: precio,
            id_direccion: idDireccion
        };

        envios.push(envioData);
        localStorage.setItem("enviosEquipaje", JSON.stringify(envios));

        labelPrecio.textContent =
            `Envío agregado: ${envioData.nombre_tipo}, ${peso} kg — $${precio.toFixed(2)} MXN.
Puedes añadir más envíos o ir al carrito para pagar.`;
        labelPrecio.style.color = "lime";
    });

});
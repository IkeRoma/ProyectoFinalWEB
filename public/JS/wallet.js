/* ============================================================
   wallet.js — Gestión de tarjetas con JWT
===============================================================*/

function secureHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
    };
}

async function secureFetch(url, options = {}) {
    options.headers = secureHeaders();

    const res = await fetch(url, options);

    if (res.status === 401) {
        alert("Tu sesión expiró. Inicia sesión nuevamente.");
        localStorage.clear();
        window.location.href = "LogIn.html";
    }

    return res;
}

function detectarTipoTarjeta(numero) {
    if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(numero)) return "Visa";
    if (/^5[1-5][0-9]{14}$/.test(numero)) return "MasterCard";
    if (/^2(2[2-9]|[3-6]|7[01]|720)[0-9]{12}$/.test(numero)) return "MasterCard";
    return "Desconocida";
}

// ================================
// Cargar tarjetas del usuario
// ================================
async function cargarWallet() {
    const usr = JSON.parse(localStorage.getItem("usuario"));
    if (!usr) return;

    const res = await secureFetch(`/api/wallet/list/${usr.ID}`);
    const data = await res.json();

    const cont = document.getElementById("walletLista");
    cont.innerHTML = "";

    if (data.wallet.length === 0) {
        cont.innerHTML = "<p>No tienes tarjetas registradas.</p>";
        return;
    }

    data.wallet.forEach(card => {
        const div = document.createElement("div");
        div.classList.add(
            "wallet-card",
            card.tipo === "Visa" ? "wallet-visa" : "wallet-mastercard"
        );

        div.innerHTML = `
            <div class="wallet-logo">${card.tipo}</div>
            <div class="wallet-info">
                <div class="wallet-number">•••• •••• •••• ${card.ultimos4}</div>
                <div class="wallet-exp">Expira: ${card.fecha_expiracion}</div>
                <div class="wallet-exp">${card.nombre_titular}</div>
            </div>

            <button class="wallet-delete" onclick="eliminarTarjeta(${card.id_wallet})">
                Eliminar
            </button>
        `;

        cont.appendChild(div);
    });
}

// =====================
// Modal agregar tarjeta
// =====================
function mostrarModalTarjeta() {
    const modal = document.createElement("div");
    modal.className = "wallet-modal";

    modal.innerHTML = `
        <div class="wallet-modal-content">
            <h3>Agregar tarjeta</h3>

            <input type="text" id="cardNumero" placeholder="Número de tarjeta">
            <input type="text" id="cardTitular" placeholder="Nombre del titular">
            <input type="text" id="cardExp" placeholder="MM/AAAA">

            <button class="btn-submit" onclick="guardarTarjeta()">Guardar</button>
        </div>
    `;

    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    document.body.appendChild(modal);
}

// =====================
// Guardar tarjeta
// =====================
async function guardarTarjeta() {
    const numero = document.getElementById("cardNumero").value.replace(/\s/g, "");
    const titular = document.getElementById("cardTitular").value;
    const exp = document.getElementById("cardExp").value;

    const tipo = detectarTipoTarjeta(numero);
    if (tipo === "Desconocida") return alert("Tarjeta inválida.");

    const usr = JSON.parse(localStorage.getItem("usuario"));

    const res = await secureFetch("/api/wallet/add", {
        method: "POST",
        body: JSON.stringify({
            id_usuario: usr.ID,
            numero,
            titular,
            expiracion: exp
        })
    });

    const data = await res.json();
    alert(data.message);

    document.querySelector(".wallet-modal")?.remove();
    cargarWallet();
}

// =====================
// Eliminar tarjeta
// =====================
async function eliminarTarjeta(id) {
    const res = await secureFetch("/api/wallet/delete", {
        method: "POST",
        body: JSON.stringify({ id_wallet: id })
    });

    const data = await res.json();
    alert(data.message);

    cargarWallet();
}

setTimeout(() => {
    if (document.getElementById("walletLista"))
        cargarWallet();

    const btn = document.getElementById("btnAgregarTarjeta");
    if (btn) btn.onclick = mostrarModalTarjeta;
}, 300);
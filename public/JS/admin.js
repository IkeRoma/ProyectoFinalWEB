/* ============================================================
   admin.js — Panel del Administrador
===============================================================*/

document.addEventListener("DOMContentLoaded", () => {
    const usr = JSON.parse(localStorage.getItem("usuario"));
    if (!usr || usr.Rol !== 1) return;

    document.getElementById("adminNombre").textContent = usr.Nombre;

    cargarUsuarios();
    cargarWalletAdmin();
});

// ================================
// Cargar usuarios
// ================================
async function cargarUsuarios() {
    const res = await fetch("/api/listar");
    const data = await res.json();

    const tbody = document.querySelector("#tablaUsuarios tbody");
    tbody.innerHTML = "";

    data.usuarios.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td>${u.ID}</td>
                <td>${u.Nombre} ${u.Apellido}</td>
                <td>${u.Correo}</td>
                <td>${u.Rol === 1 ? "Admin" : "Usuario"}</td>
                <td>
                    <button onclick="eliminarUsuario(${u.ID})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

// ================================
// Eliminar usuario
// ================================
async function eliminarUsuario(id) {
    const res = await fetch("/api/eliminar", {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ id })
    });

    const data = await res.json();
    alert(data.message);
    cargarUsuarios();
}

// ================================
// Cargar métodos de pago globales
// ================================
async function cargarWalletAdmin() {
    const resUsuarios = await fetch("/api/listar");
    const usuarios = (await resUsuarios.json()).usuarios;

    const tbody = document.querySelector("#tablaWallet tbody");
    tbody.innerHTML = "";

    for (const user of usuarios) {
        const res = await fetch(`/api/wallet/list/${user.ID}`);
        const data = await res.json();

        data.wallet.forEach(w => {
            tbody.innerHTML += `
                <tr>
                    <td>${w.id_wallet}</td>
                    <td>${user.Nombre} ${user.Apellido}</td>
                    <td>${w.tipo}</td>
                    <td>${w.bin}</td>
                    <td>${w.ultimos4}</td>
                    <td>${w.fecha_expiracion}</td>
                    <td>
                        <button onclick="adminEliminarTarjeta(${w.id_wallet})">Eliminar</button>
                    </td>
                </tr>
            `;
        });
    }
}

async function adminEliminarTarjeta(id) {
    const res = await fetch("/api/wallet/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ id_wallet: id })
    });

    const data = await res.json();
    alert(data.message);
    cargarWalletAdmin();
}
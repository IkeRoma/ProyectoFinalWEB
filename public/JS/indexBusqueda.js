// JS/indexBusqueda.js

document.addEventListener("DOMContentLoaded", () => {
    
    const btnBuscar = document.getElementById("btnBuscarIndex");

    btnBuscar.addEventListener("click", () => {
        
        const origen = document.getElementById("origen").value.trim();
        const destino = document.getElementById("destino").value.trim();
        const fecha = document.getElementById("salida").value;
        const pasajeros = document.getElementById("pasajeros").value;

        const url = `Vuelos.html?origen=${encodeURIComponent(origen)}&destino=${encodeURIComponent(destino)}&fecha=${encodeURIComponent(fecha)}&pasajeros=${encodeURIComponent(pasajeros)}`;

        window.location.href = url;
    });
});
/* ============================================================
   Dashboard de ventas (PanelAdmin y PanelWRK) — ESTABLE FINAL
===============================================================*/
(function () {
    let chartInstance = null;

    /* ============================
       FETCH CON TOKEN
    ============================ */
    async function secureFetch(url) {
        const token = localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        return fetch(url, { headers });
    }

    /* ============================
       HELPERS
    ============================ */
    const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun",
                    "Jul","Ago","Sep","Oct","Nov","Dic"];

    function normalizarTotalesPorMes(input) {
        const totales = Array(12).fill(0);
        if (!Array.isArray(input)) return totales;

        // Caso backend: [100,200,...]
        if (typeof input[0] === "number") {
            return input.map(v => Number(v) || 0);
        }

        // Caso backend: [{ mes: 1, total: 500 }]
        input.forEach(r => {
            const m = Number(r.mes);
            if (m >= 1 && m <= 12) {
                totales[m - 1] += Number(r.total) || 0;
            }
        });

        return totales;
    }

    function calcularTotalAnual(totales) {
        return totales.reduce((a, b) => a + b, 0);
    }

    function acumulado(arr) {
        let sum = 0;
        return arr.map(v => (sum += v));
    }

    function formatoMXN(v) {
        return `$${Number(v).toLocaleString("es-MX", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    function ensureElements() {
        return {
            yearSel: document.getElementById("ventasYear"),
            canvas: document.getElementById("ventasChart"),
            totalAnual: document.getElementById("ventasTotalAnual"),
            ticket: document.getElementById("ventasTicketPromedio"),
            topRutas: document.getElementById("ventasTopRutas"),
            topUsuarios: document.getElementById("ventasTopUsuarios")
        };
    }

    /* ============================
       ESPERAR A CHART.JS
    ============================ */
    function waitForChartJS() {
        return new Promise((resolve, reject) => {
            let tries = 0;
            const i = setInterval(() => {
                if (window.Chart) {
                    clearInterval(i);
                    resolve();
                }
                if (++tries > 40) {
                    clearInterval(i);
                    reject("Chart.js no cargó");
                }
            }, 100);
        });
    }

    /* ============================
       API
    ============================ */
    async function cargarAnios() {
        const r = await secureFetch("/api/dashboard/ventas/anios");
        const j = await r.json();
        return j.anios || [];
    }

    async function cargarVentas(anio) {
        const r = await secureFetch(`/api/dashboard/ventas?anio=${anio}`);
        return r.json();
    }

    async function cargarTopRutas(anio) {
        const r = await secureFetch(`/api/dashboard/top-rutas?anio=${anio}`);
        return r.json();
    }

    async function cargarTicketPromedio(anio) {
        const r = await secureFetch(`/api/dashboard/ticket-promedio?anio=${anio}`);
        return r.json();
    }

    async function cargarTopUsuarios(anio) {
        const r = await secureFetch(`/api/dashboard/top-usuarios?anio=${anio}`);
        return r.json();
    }

    /* ============================
       CHART
    ============================ */
    function renderChart(canvas, anio, mensuales) {
        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(canvas.getContext("2d"), {
            data: {
                labels: MONTHS,
                datasets: [
                    {
                        type: "bar",
                        label: `Ventas ${anio}`,
                        data: mensuales
                    },
                    {
                        type: "line",
                        label: "Acumulado",
                        data: acumulado(mensuales),
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: ctx => formatoMXN(ctx.parsed.y || 0)
                        }
                    }
                }
            }
        });
    }

    /* ============================
       FUNCIÓN CENTRAL
    ============================ */
    async function actualizar(anio) {
        const els = ensureElements();

        try {
            /* Ventas */
            const data = await cargarVentas(anio);
            if (data?.error) return;

            const totales = normalizarTotalesPorMes(data.totales);
            renderChart(els.canvas, anio, totales);

            /* Total anual */
            if (els.totalAnual) {
                els.totalAnual.textContent =
                    `Total anual ${anio}: ${formatoMXN(calcularTotalAnual(totales))}`;
            }

            /* Ticket promedio */
            const ticket = await cargarTicketPromedio(anio);
            if (els.ticket) {
                els.ticket.textContent = ticket && !ticket.error
                    ? `Ticket promedio: ${formatoMXN(ticket.promedio)}`
                    : "Ticket promedio: $0.00";
            }

            /* Top rutas */
            if (els.topRutas) {
                const rutas = await cargarTopRutas(anio);
                els.topRutas.innerHTML = "";
                (rutas?.rutas || []).forEach(r => {
                    const li = document.createElement("li");
                    li.textContent = `${r.origen} → ${r.destino}: ${formatoMXN(r.total)}`;
                    els.topRutas.appendChild(li);
                });
                if (!rutas?.rutas?.length) els.topRutas.innerHTML = "<li>Sin datos</li>";
            }

            /* Top usuarios */
            if (els.topUsuarios) {
                const usuarios = await cargarTopUsuarios(anio);
                els.topUsuarios.innerHTML = "";
                (usuarios?.usuarios || []).forEach(u => {
                    const li = document.createElement("li");
                    li.textContent =
                        `${u.nombre} (${u.pedidos} pedidos): ${formatoMXN(u.total)}`;
                    els.topUsuarios.appendChild(li);
                });
                if (!usuarios?.usuarios?.length)
                    els.topUsuarios.innerHTML = "<li>Sin datos</li>";
            }

        } catch (e) {
            console.error("Dashboard error:", e);
        }
    }

    /* ============================
       INIT
    ============================ */
    async function init() {
        const { yearSel, canvas } = ensureElements();
        if (!yearSel || !canvas) return;

        canvas.style.minHeight = "320px";
        await waitForChartJS();

        const anios = await cargarAnios();
        if (!anios.length) return;

        yearSel.innerHTML = "";
        anios.forEach(a => {
            const opt = document.createElement("option");
            opt.value = a;
            opt.textContent = a;
            yearSel.appendChild(opt);
        });

        yearSel.value = anios[0];
        await actualizar(anios[0]);

        yearSel.addEventListener("change", () => {
            actualizar(Number(yearSel.value));
        });
    }

    document.addEventListener("DOMContentLoaded", init);
})();
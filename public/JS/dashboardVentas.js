/* ============================================================
   Dashboard de ventas (PanelAdmin y PanelWRK) — INTEGRADO PRO
===============================================================*/

(function () {
    let chartInstance = null;

    /* ============================
       FETCH CON TOKEN
    ============================ */
    async function secureFetch(url, options = {}) {
        const token = localStorage.getItem("token");
        options.headers = options.headers || {};
        options.headers["Content-Type"] = "application/json";
        if (token) options.headers["Authorization"] = `Bearer ${token}`;
        return fetch(url, options);
    }

    /* ============================
       HELPERS
    ============================ */
    const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun",
                    "Jul","Ago","Sep","Oct","Nov","Dic"];

    function normalizarTotalesPorMes(input) {
        const totales = Array(12).fill(0);
        if (!input) return totales;

        // Caso backend: [100,200,...]
        if (Array.isArray(input) && typeof input[0] === "number") {
            return input.map(v => Number(v) || 0);
        }

        // Caso backend: [{ mes: 1, total: 500 }]
        if (Array.isArray(input) && typeof input[0] === "object") {
            const mesesTexto = {
                ene:0,feb:1,mar:2,abr:3,may:4,jun:5,
                jul:6,ago:7,sep:8,oct:9,nov:10,dic:11
            };

            input.forEach(r => {
                let idx = -1;
                if (typeof r.mes === "number") idx = r.mes - 1;
                else if (typeof r.mes === "string")
                    idx = mesesTexto[r.mes.toLowerCase().slice(0,3)];

                if (idx >= 0 && idx < 12)
                    totales[idx] += Number(r.total) || 0;
            });
        }

        return totales;
    }

    function calcularTotalAnual(totales) {
        return totales.reduce((a,b)=>a+b,0);
    }

    function calcularMejorMes(totales) {
        let max = 0, idx = -1;
        totales.forEach((v,i)=>{
            if (v > max) { max = v; idx = i; }
        });
        return idx >= 0 ? { mes: MONTHS[idx], total: max } : null;
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
            total: document.getElementById("ventasTotalAnual"),
            mejor: document.getElementById("ventasMejorMes"),
            comparativa: document.getElementById("ventasComparativa")
        };
    }

    /* ============================
       ESPERAR A CHART.JS
    ============================ */
    function waitForChartJS() {
        return new Promise((resolve, reject) => {
            let tries = 0;
            const interval = setInterval(() => {
                if (window.Chart) {
                    clearInterval(interval);
                    resolve();
                }
                if (++tries > 40) {
                    clearInterval(interval);
                    reject("Chart.js no cargó");
                }
            }, 100);
        });
    }

    /* ============================
       API
    ============================ */
    async function cargarAnios() {
        const res = await secureFetch("/api/dashboard/ventas/anios");
        const data = await res.json();
        return data.anios || [];
    }

    async function cargarVentas(anio) {
        const res = await secureFetch(`/api/dashboard/ventas?anio=${anio}`);
        return res.json();
    }

    /* ============================
       RENDER CHART
    ============================ */
    function renderChart(canvas, anio, mensuales) {
        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(canvas.getContext("2d"), {
            data: {
                labels: MONTHS,
                datasets: [
                    {
                        type: "bar",
                        label: `Ventas ${anio} (MXN)`,
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
                scales: {
                    y: { beginAtZero: true }
                },
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
       INIT
    ============================ */
    async function init() {
        const {
            yearSel, canvas,
            total, mejor, comparativa
        } = ensureElements();

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

        async function actualizarDashboard(anio) {
        // =========================
        // Ventas mensuales
        // =========================
        const data = await cargarVentas(anio);
        const totales = normalizarTotalesPorMes(data.totales || []);
        const totalAnual = calcularTotalAnual(totales);

        renderChart(canvas, anio, totales);
        renderResumen(resumen, anio, totalAnual);

        // =========================
        // Ticket promedio
        // =========================
        const ticket = await cargarTicketPromedio(anio);
        const elTicket = document.getElementById("ventasTicketPromedio");
        if (elTicket && !ticket.error) {
            elTicket.textContent =
                `Ticket promedio: ${formatoMXN(ticket.promedio)}`;
        }

        // =========================
        // Top rutas
        // =========================
        const rutas = await cargarTopRutas(anio);
        const ulRutas = document.getElementById("ventasTopRutas");
        if (ulRutas) {
            ulRutas.innerHTML = "";

            (rutas.rutas || []).forEach(r => {
                const li = document.createElement("li");
                li.textContent =
                    `${r.origen} → ${r.destino}: ${formatoMXN(r.total)}`;
                ulRutas.appendChild(li);
            });

            if (!rutas.rutas?.length) {
                ulRutas.innerHTML = "<li>Sin datos</li>";
            }
        }

        // =========================
        // Top usuarios
        // =========================
        const usuarios = await cargarTopUsuarios(anio);
        const ulUsuarios = document.getElementById("ventasTopUsuarios");
        if (ulUsuarios) {
            ulUsuarios.innerHTML = "";

            (usuarios.usuarios || []).forEach(u => {
                const li = document.createElement("li");
                li.textContent =
                    `${u.nombre}: ${formatoMXN(u.total)}`;
                ulUsuarios.appendChild(li);
            });

            if (!usuarios.usuarios?.length) {
                ulUsuarios.innerHTML = "<li>Sin datos</li>";
            }
        }
    }


        yearSel.value = anios[0];
        await actualizar(anios[0]);

        yearSel.addEventListener("change", () => {
            actualizar(yearSel.value);
        });
    }

    async function cargarTopRutas(anio) {
    const res = await secureFetch(`/api/dashboard/top-rutas?anio=${anio}`);
    return res.json();
    }

    async function cargarTicketPromedio(anio) {
        const res = await secureFetch(`/api/dashboard/ticket-promedio?anio=${anio}`);
        return res.json();
    }

    async function cargarTopUsuarios(anio) {
    const res = await secureFetch(`/api/dashboard/top-usuarios?anio=${anio}`);
    return res.json();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
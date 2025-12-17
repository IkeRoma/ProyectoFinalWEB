/* ============================================================
   Dashboard de ventas (PanelAdmin y PanelWRK)
   - Requiere Chart.js (CDN) incluido en el HTML
   - APIs usadas:
       GET /api/dashboard/ventas/anios
       GET /api/dashboard/ventas?anio=YYYY
===============================================================*/

(function () {
    let chartInstance = null;

    /* ============================
       FETCH SEGURO CON TOKEN
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
    function getMonthLabels() {
        return ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
                "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    }

    function ensureElements() {
        const yearSel = document.getElementById("ventasYear");
        const canvas = document.getElementById("ventasChart");
        return { yearSel, canvas };
    }

    /* ============================
       NORMALIZAR TOTALES POR MES
       (CLAVE DEL FIX)
    ============================ */
    function normalizarTotalesPorMes(registros) {
        const totales = Array(12).fill(0);

        if (!Array.isArray(registros)) return totales;

        registros.forEach(r => {
            const mesIndex = Number(r.mes) - 1; // Enero = 0
            if (mesIndex >= 0 && mesIndex < 12) {
                totales[mesIndex] += Number(r.total) || 0;
            }
        });

        return totales;
    }

    /* ============================
       API CALLS
    ============================ */
    async function cargarAnios() {
        const res = await secureFetch("/api/dashboard/ventas/anios");
        const data = await res.json();
        if (data.error) {
            console.error("Error años:", data);
            return [];
        }
        return data.anios || [];
    }

    async function cargarVentas(anio) {
        const res = await secureFetch(`/api/dashboard/ventas?anio=${encodeURIComponent(anio)}`);
        const data = await res.json();
        if (data.error) {
            console.error("Error ventas:", data);
            return null;
        }
        return data;
    }

    /* ============================
       RENDER CHART
    ============================ */
    function renderChart(canvas, anio, totales) {
        const labels = getMonthLabels();

        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }

        chartInstance = new Chart(canvas, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: `Ventas ${anio} (MXN)`,
                        data: totales,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const val = ctx.parsed.y || 0;
                                return ` $${val.toLocaleString("es-MX")}`;
                            }
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
        const { yearSel, canvas } = ensureElements();
        if (!yearSel || !canvas) return;

        canvas.style.minHeight = "320px";

        const anios = await cargarAnios();
        const defaultYear = anios.length ? anios[0] : new Date().getFullYear();

        // Llenar selector de años
        yearSel.innerHTML = "";
        (anios.length ? anios : [defaultYear]).forEach(a => {
            const opt = document.createElement("option");
            opt.value = String(a);
            opt.textContent = String(a);
            yearSel.appendChild(opt);
        });

        yearSel.value = String(defaultYear);

        // Primera carga
        const data = await cargarVentas(defaultYear);
        if (data) {
            const totalesMes = normalizarTotalesPorMes(data.totales);
            renderChart(canvas, data.anio, totalesMes);
        }

        // Cambio de año
        yearSel.addEventListener("change", async () => {
            const year = yearSel.value;
            const resp = await cargarVentas(year);
            if (resp) {
                const totalesMes = normalizarTotalesPorMes(resp.totales);
                renderChart(canvas, resp.anio, totalesMes);
            }
        });
    }

    document.addEventListener("DOMContentLoaded", init);
})();

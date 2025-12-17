/* ============================================================
   Dashboard de ventas (PanelAdmin y PanelWRK)
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
    function getMonthLabels() {
        return ["Ene","Feb","Mar","Abr","May","Jun",
                "Jul","Ago","Sep","Oct","Nov","Dic"];
    }

    function normalizarTotalesPorMes(registros) {
        const totales = Array(12).fill(0);
        if (!Array.isArray(registros)) return totales;

        registros.forEach(r => {
            const mes = Number(r.mes) - 1;
            if (mes >= 0 && mes < 12) {
                totales[mes] += Number(r.total) || 0;
            }
        });

        return totales;
    }

    function calcularTotalAnual(totales) {
        return totales.reduce((acc, v) => acc + v, 0);
    }

    function formatoMXN(valor) {
        return `$${valor.toLocaleString("es-MX", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    function ensureElements() {
        return {
            yearSel: document.getElementById("ventasYear"),
            canvas: document.getElementById("ventasChart"),
            resumen: document.getElementById("ventasResumen")
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
                    reject();
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
       RENDER
    ============================ */
    function renderChart(canvas, anio, totales) {
        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(canvas.getContext("2d"), {
            type: "bar",
            data: {
                labels: getMonthLabels(),
                datasets: [{
                    label: `Ventas ${anio} (MXN)`,
                    data: totales
                }]
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
                            label: ctx =>
                                formatoMXN(ctx.parsed.y || 0)
                        }
                    }
                }
            }
        });
    }

    function renderResumen(resumenEl, anio, total) {
        if (!resumenEl) return;
        resumenEl.textContent = `Total anual ${anio}: ${formatoMXN(total)}`;
    }

    /* ============================
       INIT
    ============================ */
    async function init() {
        const { yearSel, canvas, resumen } = ensureElements();
        if (!yearSel || !canvas) return;

        canvas.style.minHeight = "320px";

        await waitForChartJS();

        const anios = await cargarAnios();
        const currentYear = new Date().getFullYear();
        const defaultYear = anios.includes(currentYear)
            ? currentYear
            : anios[0] || currentYear;

        yearSel.innerHTML = "";
        (anios.length ? anios : [defaultYear]).forEach(a => {
            const opt = document.createElement("option");
            opt.value = a;
            opt.textContent = a;
            yearSel.appendChild(opt);
        });

        yearSel.value = defaultYear;

        async function actualizarDashboard(anio) {
            const data = await cargarVentas(anio);
            const totales = normalizarTotalesPorMes(data.totales || []);
            const totalAnual = calcularTotalAnual(totales);

            renderChart(canvas, anio, totales);
            renderResumen(resumen, anio, totalAnual);
        }

        await actualizarDashboard(defaultYear);

        yearSel.addEventListener("change", () => {
            actualizarDashboard(yearSel.value);
        });
    }

    document.addEventListener("DOMContentLoaded", init);
})();
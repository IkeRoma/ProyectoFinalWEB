/* ============================================================
   Dashboard de ventas (PanelAdmin y PanelWRK)
   - Requiere Chart.js (CDN) incluido en el HTML
   - Usa APIs:
       GET /api/dashboard/ventas/anios
       GET /api/dashboard/ventas?anio=YYYY
===============================================================*/

(function () {
    let chartInstance = null;

    async function secureFetch(url, options = {}) {
        const token = localStorage.getItem("token");
        options.headers = options.headers || {};
        options.headers["Content-Type"] = "application/json";
        if (token) options.headers["Authorization"] = `Bearer ${token}`;
        return fetch(url, options);
    }

    function getMonthLabels() {
        return ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    }

    function ensureElements() {
        const yearSel = document.getElementById("ventasYear");
        const canvas = document.getElementById("ventasChart");
        return { yearSel, canvas };
    }

    async function cargarAnios() {
        const res = await secureFetch("/api/dashboard/ventas/anios");
        const data = await res.json();

        if (data.error) {
            console.error(data);
            return [];
        }
        return data.anios || [];
    }

    async function cargarVentas(anio) {
        const res = await secureFetch(`/api/dashboard/ventas?anio=${encodeURIComponent(anio)}`);
        const data = await res.json();
        if (data.error) {
            console.error(data);
            return null;
        }
        return data;
    }

    function renderChart(canvas, anio, totales) {
        const labels = getMonthLabels();

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(canvas, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: `Ventas ${anio} (MXN)`,
                        data: totales || [],
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    async function init() {
        const { yearSel, canvas } = ensureElements();
        if (!yearSel || !canvas) return;

        // Ajuste visual: darle un alto al canvas
        canvas.style.minHeight = "320px";

        const anios = await cargarAnios();
        const defaultYear = anios.length ? anios[0] : new Date().getFullYear();

        // llenar select
        yearSel.innerHTML = "";
        if (anios.length) {
            anios.forEach(a => {
                const opt = document.createElement("option");
                opt.value = String(a);
                opt.textContent = String(a);
                yearSel.appendChild(opt);
            });
        } else {
            const opt = document.createElement("option");
            opt.value = String(defaultYear);
            opt.textContent = String(defaultYear);
            yearSel.appendChild(opt);
        }

        yearSel.value = String(defaultYear);

        const data = await cargarVentas(defaultYear);
        if (data) renderChart(canvas, data.anio, data.totales);

        yearSel.addEventListener("change", async () => {
            const year = yearSel.value;
            const resp = await cargarVentas(year);
            if (resp) renderChart(canvas, resp.anio, resp.totales);
        });
    }

    document.addEventListener("DOMContentLoaded", init);
})();

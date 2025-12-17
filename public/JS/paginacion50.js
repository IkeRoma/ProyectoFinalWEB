/**
 * Paginación "Ver más" (50 en 50) para tablas del PanelAdmin.
 * - No depende de cómo se rendericen las tablas (admin.js)
 * - Oculta filas > 50 y muestra un botón "Ver más" al final de la tabla
 * - Si la tabla se vuelve a renderizar (cambia su tbody), se re-aplica automáticamente
 */

(function () {
    const PAGE_SIZE = 50;

    function getButtonClass() {
        // Reutiliza estilo existente si encuentra alguno
        const candidates = [
            ".btn-action-big",
            ".btn-admin",
            ".btn-action",
            ".btn"
        ];
        for (const sel of candidates) {
            const el = document.querySelector(sel);
            if (el && el.className) return el.className;
        }
        return "btn-admin";
    }

    function removeExisting(table) {
        const existing = table.parentElement?.querySelector(`.loadmore-container[data-for='${table.id}']`);
        if (existing) existing.remove();
    }

    function applyToTable(table) {
        if (!table || !table.tBodies || !table.tBodies[0]) return;
        const tbody = table.tBodies[0];
        const rows = Array.from(tbody.rows || []);

        // Reset: mostrar todas primero
        rows.forEach(r => (r.style.display = ""));

        removeExisting(table);

        if (rows.length <= PAGE_SIZE) return;

        // Ocultar filas sobrantes
        rows.slice(PAGE_SIZE).forEach(r => (r.style.display = "none"));

        const container = document.createElement("div");
        container.className = "loadmore-container";
        container.dataset.for = table.id;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Ver más";
        btn.className = getButtonClass();
        btn.dataset.shown = String(PAGE_SIZE);

        btn.addEventListener("click", () => {
            const shown = Number(btn.dataset.shown || PAGE_SIZE);
            const next = shown + PAGE_SIZE;

            rows.slice(shown, next).forEach(r => (r.style.display = ""));

            btn.dataset.shown = String(next);

            if (next >= rows.length) {
                container.remove();
            }
        });

        container.appendChild(btn);

        // Insertar justo al final de la tabla
        table.insertAdjacentElement("afterend", container);
        table.dataset.paginating = "0";
    }

    function initObservers() {
        const tables = Array.from(document.querySelectorAll("table")).filter(table => {
            const tbody = table.tBodies && table.tBodies[0];
            return tbody && tbody.rows.length > 50;
        });

        tables.forEach(table => {
            applyToTable(table);

            const tbody = table.tBodies[0];
            if (!tbody) return;

            const obs = new MutationObserver(() => {
                applyToTable(table);
            });

            obs.observe(tbody, { childList: true, subtree: true });
        });
    }


    // Solo en PanelAdmin
    const isPanelAdmin = /PanelAdmin\.html/i.test(location.pathname) || 
        document.body?.textContent?.includes("Panel de Administración");
    if (!isPanelAdmin) return;


    document.addEventListener("DOMContentLoaded", initObservers);
})();

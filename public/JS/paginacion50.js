/**
 * Paginación "Ver más" (50 en 50) — ESTABLE
 * - Se ejecuta SOLO cuando admin.js termina de renderizar
 * - NO modifica tablas ya paginadas
 * - NO entra en bucles infinitos
 */

(function () {
    const PAGE_SIZE = 50;

    function getButtonClass() {
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

    function applyToTable(table) {
        if (!table || !table.tBodies || !table.tBodies[0]) return;

        // ⛔ NO volver a paginar
        if (table.dataset.paginated === "1") return;

        const tbody = table.tBodies[0];
        const rows = Array.from(tbody.rows);

        if (rows.length <= PAGE_SIZE) return;

        // Ocultar filas extra
        rows.slice(PAGE_SIZE).forEach(r => r.style.display = "none");

        // Botón
        const container = document.createElement("div");
        container.className = "loadmore-container";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Ver más";
        btn.className = getButtonClass();
        btn.dataset.shown = PAGE_SIZE;

        btn.onclick = () => {
            const shown = Number(btn.dataset.shown);
            const next = shown + PAGE_SIZE;

            rows.slice(shown, next).forEach(r => r.style.display = "");

            btn.dataset.shown = next;
            if (next >= rows.length) container.remove();
        };

        container.appendChild(btn);
        table.insertAdjacentElement("afterend", container);

        // 🔒 Marcar como paginada
        table.dataset.paginated = "1";
    }

    function paginateAll() {
        document.querySelectorAll("table.admin-table").forEach(applyToTable);
    }

    // SOLO reaccionar cuando admin.js termina
    document.addEventListener("admin:table-updated", paginateAll);

})();
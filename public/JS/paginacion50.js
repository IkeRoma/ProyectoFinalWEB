/**
 * Paginación "Ver más" (50 en 50) para PanelAdmin
 * - Se reaplica cada vez que admin.js actualiza una tabla
 * - No bloquea la UI
 */

(function () {
    const PAGE_SIZE = 50;
    const HIDE_CHUNK = 100;

    function applyToTable(table) {
        const tbody = table.tBodies?.[0];
        if (!tbody) return;

        const rows = Array.from(tbody.rows);
        if (rows.length <= PAGE_SIZE) {
            rows.forEach(r => r.style.display = "");
            removeButton(table);
            return;
        }

        // Reset total
        rows.forEach(r => r.style.display = "");
        removeButton(table);

        let index = PAGE_SIZE;

        function hideChunk() {
            const end = Math.min(index + HIDE_CHUNK, rows.length);
            for (let i = index; i < end; i++) {
                rows[i].style.display = "none";
            }
            index = end;
            if (index < rows.length) {
                requestAnimationFrame(hideChunk);
            }
        }

        requestAnimationFrame(hideChunk);

        createButton(table, rows);
    }

    function createButton(table, rows) {
        const btn = document.createElement("button");
        btn.textContent = "Ver más";
        btn.className = "btn-admin";

        let shown = PAGE_SIZE;

        btn.onclick = () => {
            const next = Math.min(shown + PAGE_SIZE, rows.length);
            for (let i = shown; i < next; i++) {
                rows[i].style.display = "";
            }
            shown = next;
            if (shown >= rows.length) btn.parentElement.remove();
        };

        const container = document.createElement("div");
        container.className = "loadmore-container";
        container.appendChild(btn);

        table.insertAdjacentElement("afterend", container);
    }

    function removeButton(table) {
        const next = table.nextElementSibling;
        if (next?.classList.contains("loadmore-container")) {
            next.remove();
        }
    }

    document.addEventListener("admin:table-updated", () => {
        document
            .querySelectorAll("table.admin-table")
            .forEach(applyToTable);
    });
})();

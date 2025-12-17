const db = require("./conexion");

/**
 * Dashboard de ventas:
 * - Se basa en tabla pagos (monto) y fecha_pago
 * - Por defecto toma pagos con estado='APROBADO'
 */

exports.ventasAniosDisponibles = (req, res) => {
    const sql = `
        SELECT DISTINCT YEAR(fecha_pago) AS anio
        FROM pagos
        ORDER BY anio DESC
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            console.error("Error ventasAniosDisponibles:", err);
            return res.status(500).json({ error: true, message: "Error al obtener años" });
        }
        res.json({ error: false, anios: (rows || []).map(r => r.anio).filter(Boolean) });
    });
};

exports.ventasPorMes = (req, res) => {
    const anio = Number(req.query.anio);
    const year = Number.isFinite(anio) ? anio : new Date().getFullYear();

    const sql = `
        SELECT MONTH(fecha_pago) AS mes, SUM(monto) AS total
        FROM pagos
        WHERE estado = 'APROBADO' AND YEAR(fecha_pago) = ?
        GROUP BY MONTH(fecha_pago)
        ORDER BY mes ASC
    `;

    db.query(sql, [year], (err, rows) => {
        if (err) {
            console.error("Error ventasPorMes:", err);
            return res.status(500).json({ error: true, message: "Error al obtener ventas" });
        }

        // Normalizar a 12 meses
        const totales = Array.from({ length: 12 }, () => 0);
        (rows || []).forEach(r => {
            const m = Number(r.mes);
            if (m >= 1 && m <= 12) totales[m - 1] = Number(r.total || 0);
        });

        res.json({ error: false, anio: year, totales });
    });
};

// dashboardController.js
exports.topRutas = (req, res) => {
    const anio = Number(req.query.anio);
    if (!anio) return res.json({ error: true });

    const sql = `
        SELECT 
            ao.ciudad AS origen,
            ad.ciudad AS destino,
            SUM(b.precio_total) AS total
        FROM boletos b
        JOIN vuelos v ON b.id_vuelo = v.id_vuelo
        JOIN aeropuertos ao ON v.id_origen = ao.id_aeropuerto
        JOIN aeropuertos ad ON v.id_destino = ad.id_aeropuerto
        WHERE YEAR(b.fecha_compra) = ?
        GROUP BY origen, destino
        ORDER BY total DESC
        LIMIT 5
    `;

    db.query(sql, [anio], (err, rows) => {
        if (err) {
            console.error(err);
            return res.json({ error: true });
        }
        res.json({ error: false, rutas: rows });
    });
};

exports.ticketPromedio = (req, res) => {
    const anio = Number(req.query.anio);
    if (!anio) return res.json({ error: true });

    const sql = `
        SELECT 
            COUNT(*) AS pedidos,
            SUM(total) AS total
        FROM pedidos
        WHERE estado = 'PAGADO'
          AND YEAR(fecha) = ?
    `;

    db.query(sql, [anio], (err, rows) => {
        if (err) {
            console.error(err);
            return res.json({ error: true });
        }

        const pedidos = rows[0].pedidos || 0;
        const total = rows[0].total || 0;
        const promedio = pedidos ? total / pedidos : 0;

        res.json({
            error: false,
            pedidos,
            total,
            promedio
        });
    });
};

// Ticket promedio
const ticket = await cargarTicketPromedio(anio);
if (!ticket.error) {
    document.getElementById("ventasTicketPromedio").textContent =
        `Ticket promedio: ${formatoMXN(ticket.promedio)}`;
}

// Top rutas
const rutas = await cargarTopRutas(anio);
const ul = document.getElementById("ventasTopRutas");
if (ul) {
    ul.innerHTML = "";
    (rutas.rutas || []).forEach(r => {
        const li = document.createElement("li");
        li.textContent =
            `${r.origen} → ${r.destino}: ${formatoMXN(r.total)}`;
        ul.appendChild(li);
    });

    if (!rutas.rutas?.length) {
        ul.innerHTML = "<li>Sin datos</li>";
    }
}

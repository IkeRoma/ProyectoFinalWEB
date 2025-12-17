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

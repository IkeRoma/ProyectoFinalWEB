const db = require("./conexion");

/**
 * Dashboard de ventas:
 * - Ventas por mes: tabla pagos (monto) por fecha_pago, estado='APROBADO'
 * - Ticket promedio: tabla pedidos (total) por fecha, estado='PAGADO'
 * - Top rutas / Top usuarios: se calculan desde pedidos+boletos, evitando depender de campos inexistentes
 */

/* ============================================================
   AÑOS DISPONIBLES (basado en pagos aprobados)
=============================================================== */
exports.ventasAniosDisponibles = (req, res) => {
    const sql = `
        SELECT DISTINCT YEAR(fecha_pago) AS anio
        FROM pagos
        WHERE estado = 'APROBADO'
        ORDER BY anio DESC
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            console.error("Error ventasAniosDisponibles:", err);
            return res.status(500).json({ error: true, message: "Error al obtener años" });
        }

        res.json({
            error: false,
            anios: (rows || []).map(r => r.anio).filter(Boolean)
        });
    });
};

/* ============================================================
   VENTAS POR MES (pagos aprobados)
=============================================================== */
exports.ventasPorMes = (req, res) => {
    const anio = Number(req.query.anio) || new Date().getFullYear();

    const sql = `
        SELECT MONTH(fecha_pago) AS mes, SUM(monto) AS total
        FROM pagos
        WHERE estado = 'APROBADO'
          AND YEAR(fecha_pago) = ?
        GROUP BY mes
        ORDER BY mes
    `;

    db.query(sql, [anio], (err, rows) => {
        if (err) {
            console.error("Error ventasPorMes:", err);
            return res.status(500).json({ error: true, message: "Error al obtener ventas" });
        }

        const totales = Array(12).fill(0);
        (rows || []).forEach(r => {
            const m = Number(r.mes);
            if (m >= 1 && m <= 12) totales[m - 1] = Number(r.total || 0);
        });

        res.json({ error: false, anio, totales });
    });
};

/* ============================================================
   TOP RUTAS (por ventas)
   - Se basa en pedidos PAGADO del año y suma precio_total de boletos
=============================================================== */
exports.topRutas = (req, res) => {
    const anio = Number(req.query.anio);
    if (!anio) return res.json({ error: true, message: "Falta anio" });

    const sql = `
        SELECT 
            ao.ciudad AS origen,
            ad.ciudad AS destino,
            SUM(b.precio_total) AS total
        FROM pedidos p
        JOIN boletos b ON b.id_pedido = p.id_pedido
        JOIN vuelos v ON b.id_vuelo = v.id_vuelo
        JOIN aeropuertos ao ON v.id_origen = ao.id_aeropuerto
        JOIN aeropuertos ad ON v.id_destino = ad.id_aeropuerto
        WHERE p.estado = 'PAGADO'
          AND YEAR(p.fecha) = ?
        GROUP BY origen, destino
        ORDER BY total DESC
        LIMIT 5
    `;

    db.query(sql, [anio], (err, rows) => {
        if (err) {
            console.error("Error topRutas:", err);
            return res.status(500).json({ error: true, message: "Error top rutas" });
        }
        res.json({ error: false, rutas: rows || [] });
    });
};

/* ============================================================
   TICKET PROMEDIO
   - Promedio = SUM(total) / COUNT(pedidos)
=============================================================== */
exports.ticketPromedio = (req, res) => {
    const anio = Number(req.query.anio);
    if (!anio) return res.json({ error: true, message: "Falta anio" });

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
            console.error("Error ticketPromedio:", err);
            return res.status(500).json({ error: true, message: "Error ticket promedio" });
        }

        const pedidos = Number(rows?.[0]?.pedidos || 0);
        const total = Number(rows?.[0]?.total || 0);
        const promedio = pedidos ? total / pedidos : 0;

        res.json({ error: false, pedidos, total, promedio });
    });
};

/* ============================================================
   TOP USUARIOS (por ventas)
   - Suma total de pedidos PAGADO por usuario en el año
=============================================================== */
exports.topUsuarios = (req, res) => {
    const anio = Number(req.query.anio);
    if (!anio) return res.json({ error: true, message: "Falta anio" });

    const sql = `
        SELECT
            u.ID AS id_usuario,
            CONCAT(u.Nombre, ' ', u.Apellido) AS nombre,
            u.Correo AS correo,
            COUNT(p.id_pedido) AS pedidos,
            SUM(p.total) AS total
        FROM pedidos p
        JOIN Usuarios u ON u.ID = p.id_usuario
        WHERE p.estado = 'PAGADO'
          AND YEAR(p.fecha) = ?
        GROUP BY u.ID, u.Nombre, u.Apellido, u.Correo
        ORDER BY total DESC
        LIMIT 5
    `;

    db.query(sql, [anio], (err, rows) => {
        if (err) {
            console.error("Error topUsuarios:", err);
            return res.status(500).json({ error: true, message: "Error top usuarios" });
        }

        res.json({ error: false, usuarios: rows || [] });
    });
};
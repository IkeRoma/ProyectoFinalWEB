const conexion = require("./conexion");

exports.crearReseña = (req, res) => {
    const { usuarioID, texto } = req.body;

    if (!usuarioID || !texto) {
        return res.status(400).json({ message: "Datos incompletos." });
    }

    const query = "INSERT INTO Reseñas (UsuarioID, Reseña) VALUES (?, ?)";
    conexion.query(query, [usuarioID, texto], (err, result) => {
        if (err) {
            console.error("Error al insertar reseña:", err);
            return res.status(500).json({ message: "Error interno del servidor." });
        }
        res.json({ message: "Reseña agregada con éxito." });
    });
};

exports.obtenerReseñas = (req, res) => {
    const query = `
        SELECT Reseñas.Reseña, Reseñas.Fecha, Usuarios.Nombre, Usuarios.Apellido
        FROM Reseñas
        INNER JOIN Usuarios ON Usuarios.ID = Reseñas.UsuarioID
        ORDER BY Reseñas.Fecha DESC
    `;

    conexion.query(query, (err, results) => {
        if (err) {
            console.error("Error al obtener reseñas:", err);
            return res.status(500).json({ message: "Error interno del servidor." });
        }
        res.json({ reseñas: results });
    });
};

exports.reseñasPorUsuario = (req, res) => {
    const idUsuario = req.params.id;

    if (!idUsuario) {
        return res.status(400).json({ message: "Falta el ID del usuario." });
    }

    const query = `
        SELECT Reseña, Fecha
        FROM Reseñas
        WHERE UsuarioID = ?
        ORDER BY Fecha DESC
    `;

    conexion.query(query, [idUsuario], (err, results) => {
        if (err) {
            console.error("Error al obtener reseñas del usuario:", err);
            return res.status(500).json({ message: "Error interno del servidor." });
        }

        res.json({ reseñas: results });
    });
};

/* ============================================================
   ADMIN/WRK — CRUD de reseñas (para PanelWRK)
   (No afecta las rutas públicas /api/reviews/*)
===============================================================*/

exports.adminListarReseñas = (req, res) => {
    const { id, usuarioID } = req.query;

    let query = `
        SELECT 
            r.ID,
            r.UsuarioID,
            r.Reseña,
            r.Fecha,
            u.Nombre,
            u.Apellido
        FROM Reseñas r
        INNER JOIN Usuarios u ON u.ID = r.UsuarioID
    `;

    const params = [];
    const where = [];

    if (id) {
        where.push("r.ID = ?");
        params.push(id);
    }
    if (usuarioID) {
        where.push("r.UsuarioID = ?");
        params.push(usuarioID);
    }

    if (where.length) query += " WHERE " + where.join(" AND ");
    query += " ORDER BY r.Fecha DESC";

    conexion.query(query, params, (err, results) => {
        if (err) {
            console.error("Error adminListarReseñas:", err);
            return res.status(500).json({ message: "Error interno del servidor." });
        }
        res.json({ reseñas: results });
    });
};

exports.adminActualizarReseña = (req, res) => {
    const { ID, texto } = req.body;

    if (!ID || !texto) {
        return res.status(400).json({ message: "Datos incompletos." });
    }

    const query = "UPDATE Reseñas SET Reseña = ? WHERE ID = ?";
    conexion.query(query, [texto, ID], (err) => {
        if (err) {
            console.error("Error adminActualizarReseña:", err);
            return res.status(500).json({ message: "Error interno del servidor." });
        }
        res.json({ message: "Reseña actualizada con éxito." });
    });
};

exports.adminEliminarReseña = (req, res) => {
    const { ID } = req.body;

    if (!ID) {
        return res.status(400).json({ message: "Falta el ID de la reseña." });
    }

    const query = "DELETE FROM Reseñas WHERE ID = ?";
    conexion.query(query, [ID], (err) => {
        if (err) {
            console.error("Error adminEliminarReseña:", err);
            return res.status(500).json({ message: "Error interno del servidor." });
        }
        res.json({ message: "Reseña eliminada con éxito." });
    });
};

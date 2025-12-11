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

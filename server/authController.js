// =========================================
// authController.js COMPLETO CON WALLET
// =========================================

const db = require("./conexion");
const crypto = require("crypto");

// =========================================
// Helper: Tokenizar tarjeta (SHA-256)
// =========================================
function tokenizar(numeroTarjeta) {
    return crypto.createHash("sha256").update(numeroTarjeta).digest("hex");
}

// =========================================
// Helper: Detectar tipo de tarjeta
// =========================================
function detectarTipo(numero) {
    if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(numero)) return "Visa";

    // Mastercard (51–55)
    if (/^5[1-5][0-9]{14}$/.test(numero)) return "MasterCard";

    // Mastercard (2221–2720)
    if (/^2(2[2-9][0-9]{12}|[3-6][0-9]{13}|7[01][0-9]{12}|720[0-9]{12})$/.test(numero)) {
        return "MasterCard";
    }

    return "Desconocida";
}

// =========================================
// LOGIN
// =========================================
exports.login = (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM Usuarios WHERE Correo = ?";
    db.query(sql, [email], (err, rows) => {
        if (err) return res.status(500).json({ error: true, message: "Error en servidor" });

        if (rows.length === 0)
            return res.json({ error: true, message: "El usuario no existe" });

        const usuario = rows[0];

        if (usuario.Contrasena !== password)
            return res.json({ error: true, message: "Contraseña incorrecta" });

        return res.json({
            error: false,
            user: {
                ID: usuario.ID,
                Nombre: usuario.Nombre,
                Apellido: usuario.Apellido,
                Correo: usuario.Correo,
                Telefono: usuario.Telefono,
                Rol: usuario.Rol
            }
        });
    });
};

// =========================================
// REGISTRO
// =========================================
exports.registrar = (req, res) => {
    const { nombre, apellidos, email, telefono, password } = req.body;

    const esAdmin = email.endsWith("@admin.com") ? 1 : 0;

    const sql = `
        INSERT INTO Usuarios (Nombre, Apellido, Correo, Contrasena, Telefono, Rol)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [nombre, apellidos, email, password, telefono, esAdmin], (err) => {
        if (err) return res.json({ error: true, message: "Correo ya registrado" });

        res.json({ error: false, message: "Registro exitoso" });
    });
};

// =========================================
// RESET PASSWORD
// =========================================
exports.resetPassword = (req, res) => {
    const { email, passwordNueva } = req.body;

    const sql = "UPDATE Usuarios SET Contrasena = ? WHERE Correo = ?";
    db.query(sql, [passwordNueva, email], (err, result) => {
        if (err) return res.json({ error: true, message: "Error al actualizar" });

        if (result.affectedRows === 0)
            return res.json({ error: true, message: "El correo no existe" });

        res.json({ error: false, message: "Contraseña actualizada" });
    });
};

// =========================================
// ELIMINAR USUARIO
// =========================================
exports.eliminarUsuario = (req, res) => {
    const { id } = req.body;

    const sql = "DELETE FROM Usuarios WHERE ID = ?";
    db.query(sql, [id], (err) => {
        if (err) return res.json({ error: true, message: "Error al eliminar" });

        res.json({ error: false, message: "Usuario eliminado" });
    });
};

// =========================================
// LISTAR USUARIOS
// =========================================
exports.listarUsuarios = (req, res) => {
    const sql = "SELECT ID, Nombre, Apellido, Correo, Telefono, Rol FROM Usuarios";

    db.query(sql, (err, rows) => {
        if (err) return res.json({ error: true, message: "Error al listar" });

        res.json({ error: false, usuarios: rows });
    });
};

// =========================================
// WALLET — LISTAR TARJETAS
// =========================================
exports.listarWallet = (req, res) => {
    const { id_usuario } = req.params;

    const sql = `
        SELECT id_wallet, bin, ultimos4, tipo, nombre_titular, fecha_expiracion, activo
        FROM wallet
        WHERE id_usuario = ? AND activo = 1
    `;

    db.query(sql, [id_usuario], (err, rows) => {
        if (err) return res.json({ error: true, message: "Error al obtener wallet" });

        res.json({ error: false, wallet: rows });
    });
};

// =========================================
// WALLET — AGREGAR TARJETA
// =========================================
exports.agregarTarjeta = (req, res) => {
    const { id_usuario, numero, titular, expiracion } = req.body;

    if (!numero || !titular || !expiracion)
        return res.json({ error: true, message: "Datos incompletos" });

    const tipo = detectarTipo(numero);
    if (tipo === "Desconocida")
        return res.json({ error: true, message: "Tarjeta no válida" });

    const bin = numero.substring(0, 6);
    const ultimos4 = numero.slice(-4);
    const hash = tokenizar(numero);

    // Prevenir duplicados
    const sqlCheck = "SELECT id_wallet FROM wallet WHERE hash_tarjeta = ? AND id_usuario = ?";
    db.query(sqlCheck, [hash, id_usuario], (err, rows) => {
        if (rows?.length > 0)
            return res.json({ error: true, message: "Esta tarjeta ya está registrada." });

        const sql = `
            INSERT INTO wallet (id_usuario, bin, ultimos4, tipo, nombre_titular, fecha_expiracion, hash_tarjeta)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(sql,
            [id_usuario, bin, ultimos4, tipo, titular, expiracion, hash],
            (err) => {
                if (err) return res.json({ error: true, message: "Error al guardar tarjeta" });

                res.json({ error: false, message: "Tarjeta agregada correctamente" });
            }
        );
    });
};

// =========================================
// WALLET — ELIMINAR TARJETA
// =========================================
exports.eliminarTarjeta = (req, res) => {
    const { id_wallet } = req.body;

    const sql = "UPDATE wallet SET activo = 0 WHERE id_wallet = ?";
    db.query(sql, [id_wallet], (err) => {
        if (err) return res.json({ error: true, message: "Error al eliminar tarjeta" });

        res.json({ error: false, message: "Tarjeta eliminada" });
    });
};

// =========================================
// WALLET — ACTUALIZAR TARJETA (OPCIONAL)
// =========================================
exports.actualizarTarjeta = (req, res) => {
    const { id_wallet, titular, expiracion } = req.body;

    const sql = `
        UPDATE wallet
        SET nombre_titular = ?, fecha_expiracion = ?
        WHERE id_wallet = ?
    `;

    db.query(sql, [titular, expiracion, id_wallet], (err) => {
        if (err) return res.json({ error: true, message: "Error al actualizar tarjeta" });

        res.json({ error: false, message: "Tarjeta actualizada" });
    });
};
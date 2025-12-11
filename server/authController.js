// =========================================
// authController.js — Seguridad completa
// =========================================

const db = require("./conexion");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =========================================
// CONFIGURACIÓN JWT
// =========================================
const JWT_SECRET = process.env.JWT_SECRET || "CAMBIA_ESTA_CLAVE_EN_PRODUCCION_123";
const JWT_EXPIRES_IN = "2h";

// Estados válidos de México
const ESTADOS_MX = new Set([
    "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas",
    "Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Guanajuato",
    "Guerrero","Hidalgo","Jalisco","México","Michoacán","Morelos","Nayarit",
    "Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí",
    "Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas"
]);

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
    if (/^5[1-5][0-9]{14}$/.test(numero)) return "MasterCard";
    if (/^2(2[2-9]|[3-6]|7[01]|720)[0-9]{12}$/.test(numero)) return "MasterCard";
    return "Desconocida";
}

// =========================================
// Crear token JWT
// =========================================
function crearToken(usuario) {
    return jwt.sign(
        { id: usuario.ID, rol: usuario.Rol },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// =========================================
// MIDDLEWARE — Verificar token
// =========================================
exports.verificarToken = (req, res, next) => {
    const header = req.headers["authorization"];

    if (!header)
        return res.status(401).json({ error: true, message: "Falta token de autenticación" });

    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token)
        return res.status(401).json({ error: true, message: "Token inválido" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err)
            return res.status(401).json({ error: true, message: "Token expirado o corrupto" });

        req.user = { ID: decoded.id, Rol: decoded.rol };
        next();
    });
};

// =========================================
// MIDDLEWARE — Solo Admin
// =========================================
exports.soloAdmin = (req, res, next) => {
    if (!req.user || req.user.Rol !== 1)
        return res.status(403).json({ error: true, message: "Acceso restringido (solo admin)" });

    next();
};

// =========================================
// LOGIN — bcrypt + migración de texto plano
// =========================================
exports.login = (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM Usuarios WHERE Correo = ?", [email], (err, rows) => {
        if (err) return res.status(500).json({ error: true, message: "Error en servidor" });

        if (rows.length === 0)
            return res.json({ error: true, message: "El usuario no existe" });

        const usuario = rows[0];
        const hashBD = usuario.Contrasena || "";
        const esHash = hashBD.startsWith("$2a$") || hashBD.startsWith("$2b$") || hashBD.startsWith("$2y$");

        // Caso 1: contraseña vieja guardada en texto plano
        if (!esHash) {
            if (hashBD !== password)
                return res.json({ error: true, message: "Contraseña incorrecta" });

            // Migrar a bcrypt
            bcrypt.hash(password, 10, (errH, nuevoHash) => {
                if (!errH) {
                    db.query("UPDATE Usuarios SET Contrasena = ? WHERE ID = ?", [nuevoHash, usuario.ID]);
                    usuario.Contrasena = nuevoHash;
                }
                continuar(usuario, password);
            });
        } else {
            // Ya está hasheada
            continuar(usuario, password);
        }

        function continuar(usr, plainPassword) {
            bcrypt.compare(plainPassword, usr.Contrasena, (err2, ok) => {
                if (err2)
                    return res.json({ error: true, message: "Error interno" });

                if (!ok)
                    return res.json({ error: true, message: "Contraseña incorrecta" });

                const token = crearToken(usr);

                res.json({
                    error: false,
                    message: "Inicio de sesión correcto",
                    user: {
                        ID: usr.ID,
                        Nombre: usr.Nombre,
                        Apellido: usr.Apellido,
                        Correo: usr.Correo,
                        Telefono: usr.Telefono,
                        Rol: usr.Rol
                    },
                    token
                });
            });
        }
    });
};

// =========================================
// REGISTRO — contraseñas seguras
// =========================================
exports.registrar = (req, res) => {
    const { nombre, apellidos, email, telefono, password } = req.body;

    const rol = email.endsWith("@admin.com") ? 1 : 0;

    bcrypt.hash(password, 10, (errHash, hash) => {
        if (errHash)
            return res.json({ error: true, message: "Error procesando contraseña" });

        const sql = `
            INSERT INTO Usuarios (Nombre, Apellido, Correo, Contrasena, Telefono, Rol)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(sql, [nombre, apellidos, email, hash, telefono, rol], (err) => {
            if (err)
                return res.json({ error: true, message: "El correo ya está registrado" });

            res.json({ error: false, message: "Usuario registrado exitosamente" });
        });
    });
};

// =========================================
// RESET PASSWORD — bcrypt
// =========================================
exports.resetPassword = (req, res) => {
    const { email, passwordNueva } = req.body;

    bcrypt.hash(passwordNueva, 10, (errHash, hash) => {
        if (errHash)
            return res.status(500).json({ error: true, message: "Error procesando contraseña" });

        db.query("UPDATE Usuarios SET Contrasena = ? WHERE Correo = ?", [hash, email], (err, result) => {
            if (err)
                return res.json({ error: true, message: "Error interno" });

            if (result.affectedRows === 0)
                return res.json({ error: true, message: "El correo no existe" });

            res.json({ error: false, message: "Contraseña actualizada correctamente" });
        });
    });
};

// =========================================

// =========================================
exports.eliminarUsuario = (req, res) => {
    const { id } = req.body;

    db.query("DELETE FROM Usuarios WHERE ID = ?", [id], (err) => {
        if (err)
            return res.json({ error: true, message: "Error al eliminar usuario" });

        res.json({ error: false, message: "Usuario eliminado" });
    });
};

// =========================================
// ADMIN — Listar usuarios
// =========================================
exports.listarUsuarios = (req, res) => {
    db.query("SELECT ID, Nombre, Apellido, Correo, Telefono, Rol FROM Usuarios", (err, rows) => {
        if (err)
            return res.json({ error: true, message: "Error al listar usuarios" });

        res.json({ error: false, usuarios: rows });
    });
};

// =========================================
// WALLET — Listar tarjetas
// =========================================
exports.listarWallet = (req, res) => {
    const { id_usuario } = req.params;

    const sql = `
        SELECT id_wallet, bin, ultimos4, tipo, nombre_titular, fecha_expiracion
        FROM wallet
        WHERE id_usuario = ? AND activo = 1
    `;

    db.query(sql, [id_usuario], (err, rows) => {
        if (err)
            return res.json({ error: true, message: "Error al obtener wallet" });

        res.json({ error: false, wallet: rows });
    });
};

// =========================================
// WALLET — Agregar tarjeta
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

    db.query(
        "SELECT id_wallet FROM wallet WHERE hash_tarjeta = ? AND id_usuario = ? AND activo = 1",
        [hash, id_usuario],
        (err, rows) => {
            if (rows?.length > 0)
                return res.json({ error: true, message: "Esta tarjeta ya está registrada" });

            const sql = `
                INSERT INTO wallet (id_usuario, bin, ultimos4, tipo, nombre_titular, fecha_expiracion, hash_tarjeta, activo)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `;

            db.query(sql, [id_usuario, bin, ultimos4, tipo, titular, expiracion, hash], (err) => {
                if (err)
                    return res.json({ error: true, message: "Error al guardar tarjeta" });

                res.json({ error: false, message: "Tarjeta agregada correctamente" });
            });
        }
    );
};

// =========================================
// WALLET — Eliminar tarjeta (soft delete)
// =========================================
exports.eliminarTarjeta = (req, res) => {
    const { id_wallet } = req.body;

    db.query("UPDATE wallet SET activo = 0 WHERE id_wallet = ?", [id_wallet], (err) => {
        if (err)
            return res.json({ error: true, message: "Error al eliminar tarjeta" });

        res.json({ error: false, message: "Tarjeta eliminada" });
    });
};

// =========================================
// WALLET — Actualizar tarjeta
// =========================================
exports.actualizarTarjeta = (req, res) => {
    const { id_wallet, titular, expiracion } = req.body;

    db.query(
        "UPDATE wallet SET nombre_titular = ?, fecha_expiracion = ? WHERE id_wallet = ?",
        [titular, expiracion, id_wallet],
        (err) => {
            if (err)
                return res.json({ error: true, message: "Error al actualizar tarjeta" });

            res.json({ error: false, message: "Datos actualizados" });
        }
    );
};

// =========================================
// PERFIL — Actualizar datos
// =========================================
exports.updateUser = (req, res) => {
    const { ID, Nombre, Apellido, Correo, Telefono } = req.body;

    db.query(
        `
        UPDATE Usuarios
        SET Nombre = ?, Apellido = ?, Correo = ?, Telefono = ?
        WHERE ID = ?
        `,
        [Nombre, Apellido, Correo, Telefono, ID],
        (err) => {
            if (err)
                return res.json({ success: false, message: "Error al actualizar datos" });

            res.json({ success: true, message: "Datos actualizados correctamente" });
        }
    );
};

// =========================================
// PERFIL — Actualizar contraseña (soporta hash viejo y nuevo)
// =========================================
exports.updatePassword = (req, res) => {
    const { ID, actual, nueva } = req.body;

    if (!ID || !actual || !nueva)
        return res.json({ success: false, message: "Datos incompletos" });

    db.query("SELECT Contrasena FROM Usuarios WHERE ID = ?", [ID], (err, rows) => {
        if (err || rows.length === 0)
            return res.json({ success: false, message: "Usuario no encontrado" });

        const hashBD = rows[0].Contrasena || "";
        const esHash = hashBD.startsWith("$2a$") || hashBD.startsWith("$2b$") || hashBD.startsWith("$2y$");

        // Contraseña antigua en texto plano
        if (!esHash) {
            if (hashBD !== actual)
                return res.json({ success: false, message: "La contraseña actual es incorrecta" });

            bcrypt.hash(nueva, 10, (errHash, nuevoHash) => {
                if (errHash)
                    return res.json({ success: false, message: "Error procesando contraseña" });

                db.query("UPDATE Usuarios SET Contrasena = ? WHERE ID = ?", [nuevoHash, ID], (err2) => {
                    if (err2)
                        return res.json({ success: false, message: "Error al actualizar contraseña" });

                    return res.json({ success: true, message: "Contraseña actualizada correctamente" });
                });
            });
        } else {
            // Contraseña ya hasheada
            bcrypt.compare(actual, hashBD, (err2, ok) => {
                if (err2)
                    return res.json({ success: false, message: "Error interno" });

                if (!ok)
                    return res.json({ success: false, message: "La contraseña actual es incorrecta" });

                bcrypt.hash(nueva, 10, (errHash, nuevoHash) => {
                    if (errHash)
                        return res.json({ success: false, message: "Error procesando contraseña" });

                    db.query("UPDATE Usuarios SET Contrasena = ? WHERE ID = ?", [nuevoHash, ID], (err3) => {
                        if (err3)
                            return res.json({ success: false, message: "Error al actualizar contraseña" });

                        return res.json({ success: true, message: "Contraseña actualizada correctamente" });
                    });
                });
            });
        }
    });
};

// ================================================================
// ENVÍO DE EQUIPAJE — Obtener pedidos pagados
// ================================================================
exports.obtenerPedidosPagados = (req, res) => {
    const { id_usuario } = req.params;

    const sql = `
        SELECT id_pedido, total 
        FROM pedidos 
        WHERE id_usuario = ? AND estado = 'PAGADO'
    `;

    db.query(sql, [id_usuario], (err, rows) => {
        if (err) return res.json({ error: true, message: "Error al obtener pedidos" });
        res.json({ error: false, pedidos: rows });
    });
};

// ================================================================
// ENVÍO DE EQUIPAJE — Obtener direcciones del usuario
// ================================================================
exports.obtenerDireccionesUsuario = (req, res) => {
    const { id_usuario } = req.params;

    const sql = `
        SELECT id_direccion, calle, ciudad, estado, cp
        FROM direcciones
        WHERE id_usuario = ?
    `;

    db.query(sql, [id_usuario], (err, rows) => {
        if (err) return res.json({ error: true, message: "Error al obtener direcciones" });
        res.json({ error: false, direcciones: rows });
    });
};

// ================================================================
// ENVÍO DE EQUIPAJE — Crear envío
// ================================================================
exports.crearEnvio = (req, res) => {
    const { id_usuario, id_pedido, id_direccion, cantidad } = req.body;

    if (!id_usuario || !id_pedido || !id_direccion || !cantidad)
        return res.json({ error: true, message: "Datos incompletos para crear el envío" });

    const sql = `
        INSERT INTO envio_equipaje (id_usuario, id_pedido, id_direccion, cantidad)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [id_usuario, id_pedido, id_direccion, cantidad], (err) => {
        if (err) return res.json({ error: true, message: "Error al crear envío" });

        res.json({ error: false, message: "Envío registrado correctamente" });
    });
};

// ================================================================
// ENVÍO DE EQUIPAJE — Historial
// ================================================================
exports.obtenerHistorialEnvios = (req, res) => {
    const { id_usuario } = req.params;

    const sql = `
        SELECT id_envio, id_pedido, cantidad, fecha_envio, estado_envio, costo_envio
        FROM envio_equipaje
        WHERE id_usuario = ?
        ORDER BY fecha_envio DESC
    `;

    db.query(sql, [id_usuario], (err, rows) => {
        if (err) return res.json({ error: true, message: "Error al obtener historial" });

        res.json({ error: false, envios: rows });
    });
};

// ================================================================
// DIRECCIONES — Agregar
// ================================================================
exports.agregarDireccion = (req, res) => {
    const { id_usuario, calle, ciudad, estado, cp } = req.body;

    if (!ESTADOS_MX.has(estado))
        return res.json({ error: true, message: "Estado inválido" });

    const sql = `
        INSERT INTO direcciones (id_usuario, calle, ciudad, estado, cp)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [id_usuario, calle, ciudad, estado, cp], err => {
        if (err) return res.json({ error: true, message: "Error al agregar dirección" });

        res.json({ error: false, message: "Dirección agregada" });
    });
};

// ================================================================
// DIRECCIONES — Editar
// ================================================================
exports.editarDireccion = (req, res) => {
    const { id_direccion, calle, ciudad, estado, cp } = req.body;

    if (!ESTADOS_MX.has(estado))
        return res.json({ error: true, message: "Estado inválido" });

    const sql = `
        UPDATE direcciones
        SET calle = ?, ciudad = ?, estado = ?, cp = ?
        WHERE id_direccion = ?
    `;

    db.query(sql, [calle, ciudad, estado, cp, id_direccion], err => {
        if (err) return res.json({ error: true, message: "Error al actualizar dirección" });

        res.json({ error: false, message: "Dirección actualizada" });
    });
};

// ================================================================
// DIRECCIONES — Eliminar
// ================================================================
exports.eliminarDireccion = (req, res) => {
    const { id_direccion } = req.body;

    db.query("DELETE FROM direcciones WHERE id_direccion = ?", [id_direccion], err => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar" });

        res.json({ error: false, message: "Dirección eliminada" });
    });
};
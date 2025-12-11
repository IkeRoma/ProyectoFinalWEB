// =========================================
// authController.js — Seguridad completa
// =========================================

const express = require("express");
const db = require("./conexion");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =========================================
// CONFIGURACIÓN JWT
// =========================================
const JWT_SECRET = process.env.JWT_SECRET || "CAMBIA_ESTA_CLAVE_EN_PRODUCCION_123";
const JWT_EXPIRES_IN = "2h";

const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

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

// ================================================================
// VUELOS PÚBLICOS
// ================================================================
exports.listarVuelosPublico = async (req, res) => {
    try {
        const sql = `
            SELECT 
                v.*,
                ao.ciudad AS origen_ciudad,
                ad.ciudad AS destino_ciudad,
                MIN(a.precio) AS precio_desde,
                TIMESTAMPDIFF(MINUTE, v.fecha_salida, v.fecha_llegada) AS duracion_min
            FROM vuelos v
            JOIN aeropuertos ao ON v.id_origen = ao.id_aeropuerto
            JOIN aeropuertos ad ON v.id_destino = ad.id_aeropuerto
            LEFT JOIN asientos a ON a.id_vuelo = v.id_vuelo AND a.activo = 1
            WHERE v.activo = 1
            GROUP BY v.id_vuelo
            ORDER BY v.fecha_salida ASC
        `;
        const vuelos = await query(sql);
        res.json({ error: false, vuelos });
    } catch (err) {
        console.error(err);
        res.json({ error: true, message: "Error al listar vuelos" });
    }
};

exports.detalleVuelo = async (req, res) => {
    const { id } = req.params;

    try {
        const vueloRows = await query(
            `
            SELECT 
                v.*,
                ao.ciudad AS origen_ciudad,
                ad.ciudad AS destino_ciudad,
                TIMESTAMPDIFF(MINUTE, v.fecha_salida, v.fecha_llegada) AS duracion_min
            FROM vuelos v
            JOIN aeropuertos ao ON v.id_origen = ao.id_aeropuerto
            JOIN aeropuertos ad ON v.id_destino = ad.id_aeropuerto
            WHERE v.id_vuelo = ?
            `,
            [id]
        );

        if (!vueloRows.length) {
            return res.json({ error: true, message: "Vuelo no encontrado" });
        }

        const asientos = await query(
            "SELECT id_asiento, tipo_asiento, precio, stock FROM asientos WHERE id_vuelo = ? AND activo = 1",
            [id]
        );

        const equipaje = await query(
            "SELECT id_equipaje, tipo, precio_extra FROM equipaje WHERE id_vuelo = ? AND activo = 1",
            [id]
        );

        res.json({
            error: false,
            vuelo: vueloRows[0],
            asientos,
            equipaje
        });
    } catch (err) {
        console.error(err);
        res.json({ error: true, message: "Error al obtener detalle del vuelo" });
    }
};

// ================================================================
// ADMIN – Aeropuertos
// ================================================================
exports.listarAeropuertos = (req, res) => {
    const { id } = req.query;
    let sql = "SELECT * FROM aeropuertos";
    const params = [];

    if (id) {
        sql += " WHERE id_aeropuerto = ?";
        params.push(id);
    }

    db.query(sql, params, (err, rows) => {
        if (err) return res.json({ error: true, message: "Error al listar aeropuertos" });
        res.json({ error: false, aeropuertos: rows });
    });
};

exports.crearAeropuerto = (req, res) => {
    const { nombre, ciudad, estado } = req.body;

    if (!nombre || !ciudad || !estado) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        INSERT INTO aeropuertos (nombre, ciudad, estado, activo)
        VALUES (?, ?, ?, 1)
    `;
    db.query(sql, [nombre, ciudad, estado], (err) => {
        if (err) return res.json({ error: true, message: "Error al crear aeropuerto" });
        res.json({ error: false, message: "Aeropuerto creado correctamente" });
    });
};

exports.actualizarAeropuerto = (req, res) => {
    const { id_aeropuerto, nombre, ciudad, estado } = req.body;

    if (!id_aeropuerto || !nombre || !ciudad || !estado) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        UPDATE aeropuertos
        SET nombre = ?, ciudad = ?, estado = ?
        WHERE id_aeropuerto = ?
    `;
    db.query(sql, [nombre, ciudad, estado, id_aeropuerto], (err) => {
        if (err) return res.json({ error: true, message: "Error al actualizar aeropuerto" });
        res.json({ error: false, message: "Aeropuerto actualizado" });
    });
};

exports.eliminarAeropuerto = (req, res) => {
    const { id_aeropuerto } = req.body;
    if (!id_aeropuerto) return res.json({ error: true, message: "ID faltante" });

    db.query(
        "UPDATE aeropuertos SET activo = 0 WHERE id_aeropuerto = ?",
        [id_aeropuerto],
        (err) => {
            if (err) return res.json({ error: true, message: "No se pudo eliminar" });
            res.json({ error: false, message: "Aeropuerto desactivado" });
        }
    );
};

// ================================================================
// ADMIN – Vuelos
// ================================================================
exports.listarVuelosAdmin = (req, res) => {
    const { id } = req.query;
    let sql = `
        SELECT 
            v.*,
            ao.ciudad AS origen_ciudad,
            ad.ciudad AS destino_ciudad,
            TIMESTAMPDIFF(MINUTE, v.fecha_salida, v.fecha_llegada) AS duracion_min
        FROM vuelos v
        JOIN aeropuertos ao ON v.id_origen = ao.id_aeropuerto
        JOIN aeropuertos ad ON v.id_destino = ad.id_aeropuerto
    `;
    const params = [];

    if (id) {
        sql += " WHERE v.id_vuelo = ?";
        params.push(id);
    }

    db.query(sql, params, (err, rows) => {
        if (err) return res.json({ error: true, message: "Error al listar vuelos" });
        res.json({ error: false, vuelos: rows });
    });
};

exports.crearVuelo = (req, res) => {
    const { id_origen, id_destino, fecha_salida, fecha_llegada, escala, numero_escalas } = req.body;

    if (!id_origen || !id_destino || !fecha_salida || !fecha_llegada) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        INSERT INTO vuelos (id_origen, id_destino, fecha_salida, fecha_llegada, escala, numero_escalas, activo)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    `;

    db.query(sql, [id_origen, id_destino, fecha_salida, fecha_llegada, escala || "DIRECTO", numero_escalas || 0], (err) => {
        if (err) return res.json({ error: true, message: "Error al crear vuelo" });
        res.json({ error: false, message: "Vuelo creado correctamente" });
    });
};

exports.actualizarVuelo = (req, res) => {
    const { id_vuelo, id_origen, id_destino, fecha_salida, fecha_llegada, escala, numero_escalas } = req.body;

    if (!id_vuelo || !id_origen || !id_destino || !fecha_salida || !fecha_llegada) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        UPDATE vuelos
        SET id_origen = ?, id_destino = ?, fecha_salida = ?, fecha_llegada = ?, escala = ?, numero_escalas = ?
        WHERE id_vuelo = ?
    `;

    db.query(sql, [id_origen, id_destino, fecha_salida, fecha_llegada, escala || "DIRECTO", numero_escalas || 0, id_vuelo], (err) => {
        if (err) return res.json({ error: true, message: "Error al actualizar vuelo" });
        res.json({ error: false, message: "Vuelo actualizado" });
    });
};

exports.eliminarVuelo = (req, res) => {
    const { id_vuelo } = req.body;
    if (!id_vuelo) return res.json({ error: true, message: "ID faltante" });

    db.query("UPDATE vuelos SET activo = 0 WHERE id_vuelo = ?", [id_vuelo], (err) => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar vuelo" });
        res.json({ error: false, message: "Vuelo desactivado" });
    });
};

// ================================================================
// ADMIN – Asientos
// ================================================================
exports.listarAsientos = (req, res) => {
    const { id } = req.query;
    let sql = "SELECT * FROM asientos";
    const params = [];

    if (id) {
        sql += " WHERE id_asiento = ?";
        params.push(id);
    }

    db.query(sql, params, (err, rows) => {
        if (err) return res.json({ error: true, message: "Error al listar asientos" });
        res.json({ error: false, asientos: rows });
    });
};

exports.crearAsiento = (req, res) => {
    const { id_vuelo, tipo_asiento, precio, stock } = req.body;

    if (!id_vuelo || !tipo_asiento || !precio || stock == null) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        INSERT INTO asientos (id_vuelo, tipo_asiento, precio, stock, activo)
        VALUES (?, ?, ?, ?, 1)
    `;

    db.query(sql, [id_vuelo, tipo_asiento, precio, stock], (err) => {
        if (err) return res.json({ error: true, message: "Error al crear asiento" });
        res.json({ error: false, message: "Asiento creado correctamente" });
    });
};

exports.actualizarAsiento = (req, res) => {
    const { id_asiento, id_vuelo, tipo_asiento, precio, stock } = req.body;

    if (!id_asiento || !id_vuelo || !tipo_asiento || !precio || stock == null) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        UPDATE asientos
        SET id_vuelo = ?, tipo_asiento = ?, precio = ?, stock = ?
        WHERE id_asiento = ?
    `;

    db.query(sql, [id_vuelo, tipo_asiento, precio, stock, id_asiento], (err) => {
        if (err) return res.json({ error: true, message: "Error al actualizar asiento" });
        res.json({ error: false, message: "Asiento actualizado" });
    });
};

exports.eliminarAsiento = (req, res) => {
    const { id_asiento } = req.body;
    if (!id_asiento) return res.json({ error: true, message: "ID faltante" });

    db.query("UPDATE asientos SET activo = 0 WHERE id_asiento = ?", [id_asiento], (err) => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar asiento" });
        res.json({ error: false, message: "Asiento desactivado" });
    });
};

// ================================================================
// ADMIN – Equipaje
// ================================================================
exports.listarEquipaje = (req, res) => {
    const { id } = req.query;
    let sql = "SELECT * FROM equipaje";
    const params = [];

    if (id) {
        sql += " WHERE id_equipaje = ?";
        params.push(id);
    }

    db.query(sql, params, (err, rows) => {
        if (err) return res.json({ error: true, message: "Error al listar equipaje" });
        res.json({ error: false, equipaje: rows });
    });
};

exports.crearEquipaje = (req, res) => {
    const { id_vuelo, tipo, precio_extra } = req.body;

    if (!id_vuelo || !tipo || !precio_extra) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        INSERT INTO equipaje (id_vuelo, tipo, precio_extra, activo)
        VALUES (?, ?, ?, 1)
    `;

    db.query(sql, [id_vuelo, tipo, precio_extra], (err) => {
        if (err) return res.json({ error: true, message: "Error al crear equipaje" });
        res.json({ error: false, message: "Equipaje creado correctamente" });
    });
};

exports.actualizarEquipaje = (req, res) => {
    const { id_equipaje, id_vuelo, tipo, precio_extra } = req.body;

    if (!id_equipaje || !id_vuelo || !tipo || !precio_extra) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        UPDATE equipaje
        SET id_vuelo = ?, tipo = ?, precio_extra = ?
        WHERE id_equipaje = ?
    `;

    db.query(sql, [id_vuelo, tipo, precio_extra, id_equipaje], (err) => {
        if (err) return res.json({ error: true, message: "Error al actualizar equipaje" });
        res.json({ error: false, message: "Equipaje actualizado" });
    });
};

exports.eliminarEquipaje = (req, res) => {
    const { id_equipaje } = req.body;

    if (!id_equipaje) return res.json({ error: true, message: "ID faltante" });

    db.query("UPDATE equipaje SET activo = 0 WHERE id_equipaje = ?", [id_equipaje], (err) => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar equipaje" });
        res.json({ error: false, message: "Equipaje desactivado" });
    });
};

// ================================================================
// CARRITO / PEDIDOS / PAGOS / BOLETOS
// ================================================================
exports.crearPedidoDesdeCarrito = async (req, res) => {
    const { id_usuario, id_wallet, items, envio } = req.body;

    if (!id_usuario || !id_wallet || !Array.isArray(items) || !items.length) {
        return res.json({ error: true, message: "Datos incompletos del carrito" });
    }

    try {
        const idsAsientos = [...new Set(items.map(i => i.id_asiento))];
        const idsEquipaje = [...new Set(items.map(i => i.id_equipaje).filter(Boolean))];

        const asientosRows = idsAsientos.length
            ? await query("SELECT id_asiento, id_vuelo, precio FROM asientos WHERE id_asiento IN (?)", [idsAsientos])
            : [];

        const equipajeRows = idsEquipaje.length
            ? await query("SELECT id_equipaje, precio_extra FROM equipaje WHERE id_equipaje IN (?)", [idsEquipaje])
            : [];

        const mapAsientos = new Map(asientosRows.map(a => [a.id_asiento, a]));
        const mapEquipaje = new Map(equipajeRows.map(e => [e.id_equipaje, e]));

        let total = 0;
        const detalles = [];

        for (const item of items) {
            const asiento = mapAsientos.get(item.id_asiento);
            if (!asiento) {
                return res.json({ error: true, message: "Asiento no válido en el carrito" });
            }

            const equip = item.id_equipaje ? mapEquipaje.get(item.id_equipaje) : null;
            const cantidad = item.cantidad || 1;

            const precioUnit = Number(asiento.precio) + (equip ? Number(equip.precio_extra) : 0);
            const subtotal = precioUnit * cantidad;

            total += subtotal;

            detalles.push({
                id_vuelo: asiento.id_vuelo,
                id_asiento: item.id_asiento,
                id_equipaje: item.id_equipaje || null,
                cantidad,
                precioUnit,
                subtotal
            });
        }

        // ---- COSTO DE ENVÍO (si viene) ----
        let costo_envio = 0;
        if (envio && envio.precio_total) {
            costo_envio = Number(envio.precio_total) || 0;
            total += costo_envio;
        }

        const pedidoRes = await query(
            "INSERT INTO pedidos (id_usuario, id_wallet, total, estado) VALUES (?, ?, ?, 'PAGADO')",
            [id_usuario, id_wallet, total]
        );
        const id_pedido = pedidoRes.insertId;

        const boletosCreados = [];

        for (const det of detalles) {
            await query(
                "INSERT INTO detalles_pedido (id_pedido, id_vuelo, id_asiento, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?, ?)",
                [id_pedido, det.id_vuelo, det.id_asiento, det.cantidad, det.precioUnit, det.subtotal]
            );

            await query(
                "UPDATE asientos SET stock = GREATEST(stock - ?, 0) WHERE id_asiento = ?",
                [det.cantidad, det.id_asiento]
            );

            for (let i = 0; i < det.cantidad; i++) {
                const boletoRes = await query(
                    "INSERT INTO boletos (id_usuario, id_vuelo, id_asiento, id_equipaje, id_pedido, precio_total) VALUES (?, ?, ?, ?, ?, ?)",
                    [id_usuario, det.id_vuelo, det.id_asiento, det.id_equipaje, id_pedido, det.precioUnit]
                );
                const id_boleto = boletoRes.insertId;

                const infoBoleto = await query(
                    `
                    SELECT 
                        b.id_boleto,
                        b.codigo_boleto,
                        b.precio_total,
                        b.estado,
                        v.id_vuelo,
                        v.fecha_salida,
                        v.fecha_llegada,
                        ao.ciudad AS origen_ciudad,
                        ad.ciudad AS destino_ciudad,
                        a.tipo_asiento
                    FROM boletos b
                    JOIN vuelos v ON b.id_vuelo = v.id_vuelo
                    JOIN aeropuertos ao ON v.id_origen = ao.id_aeropuerto
                    JOIN aeropuertos ad ON v.id_destino = ad.id_aeropuerto
                    JOIN asientos a ON b.id_asiento = a.id_asiento
                    WHERE b.id_boleto = ?
                    `,
                    [id_boleto]
                );

                if (infoBoleto.length) {
                    boletosCreados.push(infoBoleto[0]);
                }
            }
        }

        await query(
            "INSERT INTO pagos (id_usuario, id_pedido, monto, estado) VALUES (?, ?, ?, 'APROBADO')",
            [id_usuario, id_pedido, total]
        );

        res.json({
            error: false,
            message: "Pedido creado y pago registrado",
            pedido: { id_pedido, total, costo_envio },
            boletos: boletosCreados,
            envio: envio || null
        });
    } catch (err) {
        console.error(err);
        res.json({ error: true, message: "Error al procesar el carrito" });
    }
};

// ================================================================
// ADMIN – Tipos de maleta (envío equipaje)
// ================================================================
exports.listarTiposMaleta = (req, res) => {
    const { id } = req.query;
    let sql = "SELECT * FROM tipos_maleta";
    const params = [];

    if (id) {
        sql += " WHERE id_tipo_maleta = ?";
        params.push(id);
    }

    db.query(sql, params, (err, rows) => {
        if (err) return res.json({ error: true, message: "Error al listar tipos de maleta" });
        res.json({ error: false, tipos: rows });
    });
};

exports.crearTipoMaleta = (req, res) => {
    const { nombre, peso_max, precio_base, tarifa_kg_extra } = req.body;
    if (!nombre || !peso_max || !precio_base || !tarifa_kg_extra) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        INSERT INTO tipos_maleta (nombre, peso_max, precio_base, tarifa_kg_extra)
        VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [nombre, peso_max, precio_base, tarifa_kg_extra], (err) => {
        if (err) return res.json({ error: true, message: "Error al crear tipo de maleta" });
        res.json({ error: false, message: "Tipo de maleta creado" });
    });
};

exports.actualizarTipoMaleta = (req, res) => {
    const { id_tipo_maleta, nombre, peso_max, precio_base, tarifa_kg_extra } = req.body;
    if (!id_tipo_maleta || !nombre || !peso_max || !precio_base || !tarifa_kg_extra) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        UPDATE tipos_maleta
        SET nombre = ?, peso_max = ?, precio_base = ?, tarifa_kg_extra = ?
        WHERE id_tipo_maleta = ?
    `;
    db.query(sql, [nombre, peso_max, precio_base, tarifa_kg_extra, id_tipo_maleta], (err) => {
        if (err) return res.json({ error: true, message: "Error al actualizar tipo de maleta" });
        res.json({ error: false, message: "Tipo de maleta actualizado" });
    });
};

exports.eliminarTipoMaleta = (req, res) => {
    const { id_tipo_maleta } = req.body;
    if (!id_tipo_maleta) return res.json({ error: true, message: "ID faltante" });

    db.query("DELETE FROM tipos_maleta WHERE id_tipo_maleta = ?", [id_tipo_maleta], (err) => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar tipo de maleta" });
        res.json({ error: false, message: "Tipo de maleta eliminado" });
    });
};

// ================================================================
// ADMIN – Pedidos
// ================================================================
exports.listarPedidos = (req, res) => {
    const { id } = req.query;
    let sql = "SELECT * FROM pedidos";
    const params = [];

    if (id) {
        sql += " WHERE id_pedido = ?";
        params.push(id);
    }

    db.query(sql, params, (err, rows) => {
        if (err) return res.json({ error: true, message: "Error al listar pedidos" });
        res.json({ error: false, pedidos: rows });
    });
};

exports.crearPedidoAdmin = (req, res) => {
    const { id_usuario, id_wallet, total, estado } = req.body;
    if (!id_usuario || !id_wallet || !total || !estado) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        INSERT INTO pedidos (id_usuario, id_wallet, total, estado)
        VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [id_usuario, id_wallet, total, estado], (err) => {
        if (err) return res.json({ error: true, message: "Error al crear pedido" });
        res.json({ error: false, message: "Pedido creado" });
    });
};

exports.actualizarPedidoAdmin = (req, res) => {
    const { id_pedido, id_usuario, id_wallet, total, estado } = req.body;
    if (!id_pedido || !id_usuario || !id_wallet || !total || !estado) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        UPDATE pedidos
        SET id_usuario = ?, id_wallet = ?, total = ?, estado = ?
        WHERE id_pedido = ?
    `;
    db.query(sql, [id_usuario, id_wallet, total, estado, id_pedido], (err) => {
        if (err) return res.json({ error: true, message: "Error al actualizar pedido" });
        res.json({ error: false, message: "Pedido actualizado" });
    });
};

exports.eliminarPedidoAdmin = (req, res) => {
    const { id_pedido } = req.body;
    if (!id_pedido) return res.json({ error: true, message: "ID faltante" });

    db.query("DELETE FROM pedidos WHERE id_pedido = ?", [id_pedido], (err) => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar pedido" });
        res.json({ error: false, message: "Pedido eliminado" });
    });
};

// ================================================================
// ADMIN – Pagos
// ================================================================
exports.listarPagos = (req, res) => {
    const { id } = req.query;
    let sql = "SELECT * FROM pagos";
    const params = [];

    if (id) {
        sql += " WHERE id_pago = ?";
        params.push(id);
    }

    db.query(sql, params, (err, rows) => {
        if (err) return res.json({ error: true, message: "Error al listar pagos" });
        res.json({ error: false, pagos: rows });
    });
};

exports.crearPagoAdmin = (req, res) => {
    const { id_usuario, id_pedido, monto, estado } = req.body;
    if (!id_usuario || !id_pedido || !monto || !estado) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        INSERT INTO pagos (id_usuario, id_pedido, monto, estado)
        VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [id_usuario, id_pedido, monto, estado], (err) => {
        if (err) return res.json({ error: true, message: "Error al crear pago" });
        res.json({ error: false, message: "Pago creado" });
    });
};

exports.actualizarPagoAdmin = (req, res) => {
    const { id_pago, id_usuario, id_pedido, monto, estado } = req.body;
    if (!id_pago || !id_usuario || !id_pedido || !monto || !estado) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        UPDATE pagos
        SET id_usuario = ?, id_pedido = ?, monto = ?, estado = ?
        WHERE id_pago = ?
    `;
    db.query(sql, [id_usuario, id_pedido, monto, estado, id_pago], (err) => {
        if (err) return res.json({ error: true, message: "Error al actualizar pago" });
        res.json({ error: false, message: "Pago actualizado" });
    });
};

exports.eliminarPagoAdmin = (req, res) => {
    const { id_pago } = req.body;
    if (!id_pago) return res.json({ error: true, message: "ID faltante" });

    db.query("DELETE FROM pagos WHERE id_pago = ?", [id_pago], (err) => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar pago" });
        res.json({ error: false, message: "Pago eliminado" });
    });
};

// ================================================================
// ADMIN – Boletos
// ================================================================
exports.listarBoletos = (req, res) => {
    const { id } = req.query;
    let sql = "SELECT * FROM boletos";
    const params = [];

    if (id) {
        sql += " WHERE id_boleto = ?";
        params.push(id);
    }

    db.query(sql, params, (err, rows) => {
        if (err) return res.json({ error: true, message: "Error al listar boletos" });
        res.json({ error: false, boletos: rows });
    });
};

exports.crearBoletoAdmin = (req, res) => {
    const { id_usuario, id_vuelo, id_asiento, id_equipaje, id_pedido, precio_total, estado } = req.body;
    if (!id_usuario || !id_vuelo || !id_asiento || !id_pedido || !precio_total || !estado) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        INSERT INTO boletos (id_usuario, id_vuelo, id_asiento, id_equipaje, id_pedido, precio_total, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [id_usuario, id_vuelo, id_asiento, id_equipaje || null, id_pedido, precio_total, estado], (err) => {
        if (err) return res.json({ error: true, message: "Error al crear boleto" });
        res.json({ error: false, message: "Boleto creado" });
    });
};

exports.actualizarBoletoAdmin = (req, res) => {
    const { id_boleto, id_usuario, id_vuelo, id_asiento, id_equipaje, id_pedido, precio_total, estado } = req.body;
    if (!id_boleto || !id_usuario || !id_vuelo || !id_asiento || !id_pedido || !precio_total || !estado) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        UPDATE boletos
        SET id_usuario = ?, id_vuelo = ?, id_asiento = ?, id_equipaje = ?, id_pedido = ?, precio_total = ?, estado = ?
        WHERE id_boleto = ?
    `;
    db.query(sql, [id_usuario, id_vuelo, id_asiento, id_equipaje || null, id_pedido, precio_total, estado, id_boleto], (err) => {
        if (err) return res.json({ error: true, message: "Error al actualizar boleto" });
        res.json({ error: false, message: "Boleto actualizado" });
    });
};

exports.eliminarBoletoAdmin = (req, res) => {
    const { id_boleto } = req.body;
    if (!id_boleto) return res.json({ error: true, message: "ID faltante" });

    db.query("DELETE FROM boletos WHERE id_boleto = ?", [id_boleto], (err) => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar boleto" });
        res.json({ error: false, message: "Boleto eliminado" });
    });
};

// Obtener todos los usuarios
router.get('/list', (req, res) => {
    db.query("SELECT * FROM usuarios", (err, rows) => {
        if (err) return res.status(500).json({ error: true });
        res.json({ usuarios: rows });
    });
});

// Buscar usuario por ID
router.get('/id/:id', (req, res) => {
    db.query("SELECT * FROM Usuarios WHERE ID = ?", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: true });
        res.json({ usuario: rows[0] });
    });
});

// Crear usuario
router.post('/add', (req, res) => {
    const usr = req.body;
    db.query("INSERT INTO Usuarios SET ?", usr, (err) => {
        if (err) return res.status(500).json({ error: true });
        res.json({ message: "Usuario creado correctamente" });
    });
});

// Editar usuario
router.put('/update/:id', (req, res) => {
    db.query(
        "UPDATE Usuarios SET ? WHERE ID = ?",
        [req.body, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: true });
            res.json({ message: "Usuario actualizado" });
        }
    );
});

// Eliminar usuario
router.delete('/delete/:id', (req, res) => {
    db.query("DELETE FROM Usuarios WHERE ID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: true });
        res.json({ message: "Usuario eliminado" });
    });
});

exports.crearUsuario = (req, res) => {
    const usuario = req.body;

    db.query("INSERT INTO Usuarios SET ?", usuario, (err) => {
        if (err)
            return res.json({ error: true, message: "Error al crear usuario" });

        res.json({ error: false, message: "Usuario creado correctamente" });
    });
};

module.exports = {
    verificarToken,
    soloAdmin,
    login,
    registrar,
    resetPassword,
    eliminarUsuario,
    listarUsuarios,

    // WALLET
    listarWallet,
    agregarTarjeta,
    eliminarTarjeta,
    actualizarTarjeta,

    // PERFIL
    updateUser,
    updatePassword,

    // DIRECCIONES
    obtenerDireccionesUsuario,
    agregarDireccion,
    editarDireccion,
    eliminarDireccion,

    // ENVÍOS
    obtenerPedidosPagados,
    crearEnvio,
    obtenerHistorialEnvios,

    // VUELOS PÚBLICOS
    listarVuelosPublico,
    detalleVuelo,

    // ADMIN — AEROPUERTOS
    listarAeropuertos,
    crearAeropuerto,
    actualizarAeropuerto,
    eliminarAeropuerto,

    // ADMIN — VUELOS
    listarVuelosAdmin,
    crearVuelo,
    actualizarVuelo,
    eliminarVuelo,

    // ADMIN — ASIENTOS
    listarAsientos,
    crearAsiento,
    actualizarAsiento,
    eliminarAsiento,

    // ADMIN — EQUIPAJE
    listarEquipaje,
    crearEquipaje,
    actualizarEquipaje,
    eliminarEquipaje,

    // CARRITO
    crearPedidoDesdeCarrito,

    // TIPOS MALETA
    listarTiposMaleta,
    crearTipoMaleta,
    actualizarTipoMaleta,
    eliminarTipoMaleta,

    // PEDIDOS ADMIN
    listarPedidos,
    crearPedidoAdmin,
    actualizarPedidoAdmin,
    eliminarPedidoAdmin,

    // PAGOS
    listarPagos,
    crearPagoAdmin,
    actualizarPagoAdmin,
    eliminarPagoAdmin,

    // BOLETOS
    listarBoletos,
    crearBoletoAdmin,
    actualizarBoletoAdmin,
    eliminarBoletoAdmin
};

// =========================================
// authController.js — Controlador principal
// =========================================

const db = require("./conexion");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =========================================
// CONFIG JWT
// =========================================
const JWT_SECRET = process.env.JWT_SECRET || "CAMBIA_ESTA_CLAVE_EN_PRODUCCION_123";
const JWT_EXPIRES_IN = "2h";

// =========================================
// Helper para Promesas SQL
// =========================================
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// =========================================
// Estados válidos de México
// =========================================
const ESTADOS_MX = new Set([
    "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua",
    "Ciudad de México","Coahuila","Colima","Durango","Guanajuato","Guerrero","Hidalgo","Jalisco",
    "México","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro",
    "Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala",
    "Veracruz","Yucatán","Zacatecas"
]);

const soloStaff = (req, res, next) => {
    if (!req.user || ![1, 2].includes(Number(req.user.Rol))) {
        return res.status(403).json({
            error: true,
            message: "Acceso denegado"
        });
    }
    next();
};

// =========================================
// Helpers
// =========================================
function tokenizar(numeroTarjeta) {
    return crypto.createHash("sha256").update(numeroTarjeta).digest("hex");
}

function detectarTipo(numero) {
    if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(numero)) return "Visa";
    if (/^5[1-5][0-9]{14}$/.test(numero)) return "MasterCard";
    if (/^2(2[2-9]|[3-6]|7[01]|720)[0-9]{12}$/.test(numero)) return "MasterCard";
    return "Desconocida";
}

function crearToken(usuario) {
    return jwt.sign(
        { id: usuario.ID, rol: usuario.Rol },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}
// =========================================
// MIDDLEWARE: verificarToken
// =========================================
function verificarToken(req, res, next) {
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
}

// =========================================
// MIDDLEWARE: soloAdmin
// =========================================
function soloAdmin(req, res, next) {
    if (!req.user || req.user.Rol !== 1)
        return res.status(403).json({ error: true, message: "Acceso restringido (solo admin)" });

    next();
}

// =========================================
// LOGIN
// =========================================
function login(req, res) {
    const { email, password } = req.body;

    db.query("SELECT * FROM Usuarios WHERE Correo = ?", [email], (err, rows) => {
        if (err) return res.status(500).json({ error: true, message: "Error en servidor" });

        if (rows.length === 0)
            return res.json({ error: true, message: "El usuario no existe" });

        const usuario = rows[0];
        const hashBD = usuario.Contrasena || "";
        const esHash = hashBD.startsWith("$2");

        // Contraseña en texto plano
        if (!esHash) {
            if (hashBD !== password)
                return res.json({ error: true, message: "Contraseña incorrecta" });

            // Migrar contraseña
            bcrypt.hash(password, 10, (errH, nuevoHash) => {
                if (!errH) {
                    db.query("UPDATE Usuarios SET Contrasena = ? WHERE ID = ?", [nuevoHash, usuario.ID]);
                    usuario.Contrasena = nuevoHash;
                }
                continuar(usuario, password);
            });
        } else {
            continuar(usuario, password);
        }

        function continuar(usr, plainPass) {
            bcrypt.compare(plainPass, usr.Contrasena, (err2, ok) => {
                if (!ok)
                    return res.json({ error: true, message: "Contraseña incorrecta" });

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
                    token: crearToken(usr)
                });
            });
        }
    });
}

// =========================================
// REGISTRO
// =========================================
function registrar(req, res) {
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
}

// =========================================
// RESET PASSWORD
// =========================================
function resetPassword(req, res) {
    const { email, passwordNueva } = req.body;

    bcrypt.hash(passwordNueva, 10, (errHash, hash) => {
        if (errHash)
            return res.status(500).json({ error: true, message: "Error procesando contraseña" });

        db.query("UPDATE Usuarios SET Contrasena = ? WHERE Correo = ?", [hash, email], (err, result) => {
            if (result?.affectedRows === 0)
                return res.json({ error: true, message: "El correo no existe" });

            res.json({ error: false, message: "Contraseña actualizada correctamente" });
        });
    });
}

// =========================================
// ADMIN — Eliminar Usuario
// =========================================
function eliminarUsuario(req, res) {
    const { id } = req.body;

    db.query("DELETE FROM Usuarios WHERE ID = ?", [id], (err) => {
        if (err)
            return res.json({ error: true, message: "Error al eliminar usuario" });

        res.json({ error: false, message: "Usuario eliminado" });
    });
}

// =========================================
// ADMIN — Listar Usuarios
// =========================================
exports.listarUsuariosAdmin = (req, res) => {
    const sql = `
        SELECT id_usuario AS id, Nombre, Apellido, Email, Rol
        FROM Usuarios
        ORDER BY id_usuario DESC
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            console.error("Error listarUsuariosAdmin:", err);
            return res.status(500).json({ error: true, message: "Error al listar usuarios" });
        }
        res.json(rows || []);
    });
};

function listarUsuariosAdmin(req, res) {
    const sql = `
        SELECT 
            ID AS id,
            Nombre,
            Apellido,
            Correo AS Email,
            Rol
        FROM Usuarios
        ORDER BY ID DESC
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            console.error("Error listarUsuariosAdmin:", err);
            return res.status(500).json({
                error: true,
                message: "Error al listar usuarios"
            });
        }
        res.json(rows || []);
    });
}


// =========================================
// WALLET — Listar tarjetas
// =========================================
function listarWallet(req, res) {
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
}

// =========================================
// WALLET — Agregar tarjeta
// =========================================
function agregarTarjeta(req, res) {
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
}

// =========================================
// WALLET — Eliminar tarjeta (soft delete)
// =========================================
function eliminarTarjeta(req, res) {
    const { id_wallet } = req.body;

    db.query("UPDATE wallet SET activo = 0 WHERE id_wallet = ?", [id_wallet], (err) => {
        if (err)
            return res.json({ error: true, message: "Error al eliminar tarjeta" });

        res.json({ error: false, message: "Tarjeta eliminada" });
    });
}

// =========================================
// WALLET — Actualizar tarjeta
// =========================================
function actualizarTarjeta(req, res) {
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
}

// =========================================
// PERFIL — Actualizar usuario
// =========================================
function updateUser(req, res) {
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
}

// =========================================
// PERFIL — Actualizar contraseña
// =========================================
function updatePassword(req, res) {
    const { ID, actual, nueva } = req.body;

    if (!ID || !actual || !nueva)
        return res.json({ success: false, message: "Datos incompletos" });

    db.query("SELECT Contrasena FROM Usuarios WHERE ID = ?", [ID], (err, rows) => {
        if (err || rows.length === 0)
            return res.json({ success: false, message: "Usuario no encontrado" });

        const hashBD = rows[0].Contrasena || "";
        const esHash = hashBD.startsWith("$2");

        // Contraseña vieja en texto plano
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
            // Contraseña ya hash
            bcrypt.compare(actual, hashBD, (err2, ok) => {
                if (!ok)
                    return res.json({ success: false, message: "La contraseña actual es incorrecta" });

                bcrypt.hash(nueva, 10, (errHash, nuevoHash) => {
                    db.query("UPDATE Usuarios SET Contrasena = ? WHERE ID = ?", [nuevoHash, ID], (err3) => {
                        if (err3)
                            return res.json({ success: false, message: "Error al actualizar contraseña" });

                        return res.json({ success: true, message: "Contraseña actualizada correctamente" });
                    });
                });
            });
        }
    });
}

// =========================================
// ENVÍO EQUIPAJE — Pedidos pagados
// =========================================
function obtenerPedidosPagados(req, res) {
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
}

// =========================================
// DIRECCIONES — Obtener del usuario
// =========================================
function obtenerDireccionesUsuario(req, res) {
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
}

// =========================================
// DIRECCIONES — Crear
// =========================================
function agregarDireccion(req, res) {
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
}

// =========================================
// DIRECCIONES — Editar
// =========================================
function editarDireccion(req, res) {
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
}

// =========================================
// DIRECCIONES — Eliminar
// =========================================
function eliminarDireccion(req, res) {
    const { id_direccion } = req.body;

    db.query("DELETE FROM direcciones WHERE id_direccion = ?", [id_direccion], err => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar" });

        res.json({ error: false, message: "Dirección eliminada" });
    });
}

// ================================================================
// ENVÍO DE EQUIPAJE — Crear envío
// ================================================================
function crearEnvio(req, res) {
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
}

// ================================================================
// ENVÍO DE EQUIPAJE — Historial
// ================================================================
function obtenerHistorialEnvios(req, res) {
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
}

// ================================================================
// VUELOS PÚBLICOS
// ================================================================
async function listarVuelosPublico(req, res) {
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
}

async function detalleVuelo(req, res) {
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
}

// ================================================================
// ADMIN – Aeropuertos
// ================================================================
function listarAeropuertos(req, res) {
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
}

function crearAeropuerto(req, res) {
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
}

function actualizarAeropuerto(req, res) {
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
}

function eliminarAeropuerto(req, res) {
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
}

// ================================================================
// ADMIN – Vuelos
// ================================================================
function listarVuelosAdmin(req, res) {
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
}

function crearVuelo(req, res) {
    const { id_origen, id_destino, fecha_salida, fecha_llegada, escala, numero_escalas } = req.body;

    if (!id_origen || !id_destino || !fecha_salida || !fecha_llegada) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        INSERT INTO vuelos (id_origen, id_destino, fecha_salida, fecha_llegada, escala, numero_escalas, activo)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    `;

    db.query(
        sql,
        [id_origen, id_destino, fecha_salida, fecha_llegada, escala || "DIRECTO", numero_escalas || 0],
        (err) => {
            if (err) return res.json({ error: true, message: "Error al crear vuelo" });
            res.json({ error: false, message: "Vuelo creado correctamente" });
        }
    );
}

function actualizarVuelo(req, res) {
    const { id_vuelo, id_origen, id_destino, fecha_salida, fecha_llegada, escala, numero_escalas } = req.body;

    if (!id_vuelo || !id_origen || !id_destino || !fecha_salida || !fecha_llegada) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        UPDATE vuelos
        SET id_origen = ?, id_destino = ?, fecha_salida = ?, fecha_llegada = ?, escala = ?, numero_escalas = ?
        WHERE id_vuelo = ?
    `;

    db.query(
        sql,
        [id_origen, id_destino, fecha_salida, fecha_llegada, escala || "DIRECTO", numero_escalas || 0, id_vuelo],
        (err) => {
            if (err) return res.json({ error: true, message: "Error al actualizar vuelo" });
            res.json({ error: false, message: "Vuelo actualizado" });
        }
    );
}

function eliminarVuelo(req, res) {
    const { id_vuelo } = req.body;
    if (!id_vuelo) return res.json({ error: true, message: "ID faltante" });

    db.query("UPDATE vuelos SET activo = 0 WHERE id_vuelo = ?", [id_vuelo], (err) => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar vuelo" });
        res.json({ error: false, message: "Vuelo desactivado" });
    });
}

// ================================================================
// ADMIN – Asientos
// ================================================================
function listarAsientos(req, res) {
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
}

function crearAsiento(req, res) {
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
}

function actualizarAsiento(req, res) {
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
}

function eliminarAsiento(req, res) {
    const { id_asiento } = req.body;
    if (!id_asiento) return res.json({ error: true, message: "ID faltante" });

    db.query("UPDATE asientos SET activo = 0 WHERE id_asiento = ?", [id_asiento], (err) => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar asiento" });
        res.json({ error: false, message: "Asiento desactivado" });
    });
}

// ================================================================
// ADMIN – Equipaje
// ================================================================
function listarEquipaje(req, res) {
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
}

function crearEquipaje(req, res) {
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
}

function actualizarEquipaje(req, res) {
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
}

function eliminarEquipaje(req, res) {
    const { id_equipaje } = req.body;

    if (!id_equipaje) return res.json({ error: true, message: "ID faltante" });

    db.query("UPDATE equipaje SET activo = 0 WHERE id_equipaje = ?", [id_equipaje], (err) => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar equipaje" });
        res.json({ error: false, message: "Equipaje desactivado" });
    });
}

// ================================================================
// CARRITO / PEDIDOS / PAGOS / BOLETOS
// ================================================================
async function crearPedidoDesdeCarrito(req, res) {
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

        // Costos de envío (si vienen)
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
}

// ================================================================
// ADMIN – Tipos de maleta
// ================================================================
function listarTiposMaleta(req, res) {
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
}

function crearTipoMaleta(req, res) {
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
}

function actualizarTipoMaleta(req, res) {
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
}

function eliminarTipoMaleta(req, res) {
    const { id_tipo_maleta } = req.body;
    if (!id_tipo_maleta) return res.json({ error: true, message: "ID faltante" });

    db.query("DELETE FROM tipos_maleta WHERE id_tipo_maleta = ?", [id_tipo_maleta], (err) => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar tipo de maleta" });
        res.json({ error: false, message: "Tipo de maleta eliminado" });
    });
}

// ================================================================
// ADMIN – Pedidos
// ================================================================
function listarPedidos(req, res) {
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
}

function crearPedidoAdmin(req, res) {
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
}

function actualizarPedidoAdmin(req, res) {
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
}

function eliminarPedidoAdmin(req, res) {
    const { id_pedido } = req.body;
    if (!id_pedido) return res.json({ error: true, message: "ID faltante" });

    db.query("DELETE FROM pedidos WHERE id_pedido = ?", [id_pedido], (err) => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar pedido" });
        res.json({ error: false, message: "Pedido eliminado" });
    });
}

// ================================================================
// ADMIN – Pagos
// ================================================================
function listarPagos(req, res) {
    const { id } = req.query;

    // Incluimos método de pago (tipo/ultimos4) mediante pedidos -> wallet
    let sql = `
        SELECT pa.*, w.tipo, w.ultimos4
        FROM pagos pa
        JOIN pedidos pe ON pa.id_pedido = pe.id_pedido
        JOIN wallet w ON pe.id_wallet = w.id_wallet
    `;

    const params = [];
    if (id) {
        sql += " WHERE pa.id_pago = ?";
        params.push(id);
    }

    db.query(sql, params, (err, rows) => {
        if (err) {
            console.error("Error listarPagos:", err);
            return res.status(500).json({ error: true, message: "Error listar pagos" });
        }
        return res.json({ error: false, pagos: rows });
    });
}

function crearPagoAdmin(req, res) {
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
}

function actualizarPagoAdmin(req, res) {
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
}

function eliminarPagoAdmin(req, res) {
    const { id_pago } = req.body;
    if (!id_pago) return res.json({ error: true, message: "ID faltante" });

    db.query("DELETE FROM pagos WHERE id_pago = ?", [id_pago], (err) => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar pago" });
        res.json({ error: false, message: "Pago eliminado" });
    });
}

// ================================================================
// ADMIN – Boletos
// ================================================================
function listarBoletos(req, res) {
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
}

function crearBoletoAdmin(req, res) {
    const { id_usuario, id_vuelo, id_asiento, id_equipaje, id_pedido, precio_total, estado } = req.body;
    if (!id_usuario || !id_vuelo || !id_asiento || !id_pedido || !precio_total || !estado) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        INSERT INTO boletos (id_usuario, id_vuelo, id_asiento, id_equipaje, id_pedido, precio_total, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(
        sql,
        [id_usuario, id_vuelo, id_asiento, id_equipaje || null, id_pedido, precio_total, estado],
        (err) => {
            if (err) return res.json({ error: true, message: "Error al crear boleto" });
            res.json({ error: false, message: "Boleto creado" });
        }
    );
}

function actualizarBoletoAdmin(req, res) {
    const { id_boleto, id_usuario, id_vuelo, id_asiento, id_equipaje, id_pedido, precio_total, estado } = req.body;
    if (!id_boleto || !id_usuario || !id_vuelo || !id_asiento || !id_pedido || !precio_total || !estado) {
        return res.json({ error: true, message: "Datos incompletos" });
    }

    const sql = `
        UPDATE boletos
        SET id_usuario = ?, id_vuelo = ?, id_asiento = ?, id_equipaje = ?, id_pedido = ?, precio_total = ?, estado = ?
        WHERE id_boleto = ?
    `;
    db.query(
        sql,
        [id_usuario, id_vuelo, id_asiento, id_equipaje || null, id_pedido, precio_total, estado, id_boleto],
        (err) => {
            if (err) return res.json({ error: true, message: "Error al actualizar boleto" });
            res.json({ error: false, message: "Boleto actualizado" });
        }
    );
}

function eliminarBoletoAdmin(req, res) {
    const { id_boleto } = req.body;
    if (!id_boleto) return res.json({ error: true, message: "ID faltante" });

    db.query("DELETE FROM boletos WHERE id_boleto = ?", [id_boleto], (err) => {
        if (err) return res.json({ error: true, message: "No se pudo eliminar boleto" });
        res.json({ error: false, message: "Boleto eliminado" });
    });
}

// ================================================================
// ADMIN – Crear Usuario (para /api/admin/usuarios/add)
// ================================================================
async function crearUsuario(req, res) {
    try {
        const { Nombre, Apellido, Correo, Contrasena, Telefono, Rol } = req.body;

        if (!Nombre || !Apellido || !Correo || !Contrasena || !Telefono) {
            return res.status(400).json({ error: true, message: "Faltan campos obligatorios." });
        }

        const rolNum = (Rol === 1 || Rol === "1") ? 1 : 0;

        // IMPORTANTE: Guardar la contraseña hasheada para que el login (bcrypt.compare) funcione
        const hash = await bcrypt.hash(Contrasena, 10);

        const sql = `
            INSERT INTO Usuarios (Nombre, Apellido, Correo, Contrasena, Telefono, Rol)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(sql, [Nombre, Apellido, Correo, hash, Telefono, rolNum], (err) => {
            if (err) {
                console.error("Error crearUsuario:", err);
                return res.status(500).json({ error: true, message: "Error al crear usuario." });
            }
            return res.json({ error: false, message: "Usuario creado correctamente." });
        });
    } catch (err) {
        console.error("Error crearUsuario:", err);
        return res.status(500).json({ error: true, message: "Error al crear usuario." });
    }
}

// =========================================
// ADMIN: Actualizar usuario (incluye Rol)
// =========================================
function actualizarUsuarioAdmin(req, res) {
    const { ID, Nombre, Apellido, Correo, Telefono, Rol } = req.body;

    if (!ID || !Nombre || !Apellido || !Correo || !Telefono) {
        return res.status(400).json({ error: true, message: "Datos incompletos para actualizar usuario." });
    }

    const rolNum = (Rol === 1 || Rol === "1") ? 1 : 0;

    const sql = `
        UPDATE Usuarios
        SET Nombre = ?, Apellido = ?, Correo = ?, Telefono = ?, Rol = ?
        WHERE ID = ?
    `;

    db.query(sql, [Nombre, Apellido, Correo, Telefono, rolNum, ID], (err) => {
        if (err) {
            console.error("Error actualizarUsuarioAdmin:", err);
            return res.status(500).json({ error: true, message: "Error al actualizar usuario." });
        }
        return res.json({ error: false, message: "Usuario actualizado correctamente." });
    });
}

// =========================================
// PERFIL: Historial de pedidos (ID_pedido) + tarjeta + boletos
// =========================================
async function obtenerHistorialPedidosUsuario(req, res) {
    try {
        const id_usuario = Number(req.params.id_usuario);
        if (!id_usuario) {
            return res.status(400).json({ error: true, message: "ID de usuario inválido." });
        }

        // Seguridad: el usuario solo puede ver su historial,
        // salvo que sea admin (Rol=1)
        if (req.user && req.user.ID !== id_usuario && req.user.Rol !== 1) {
            return res.status(403).json({ error: true, message: "No autorizado." });
        }

        const rows = await query(`
            SELECT 
                p.id_pedido,
                p.fecha,
                p.total,
                p.estado AS estado_pedido,

                w.tipo AS tipo_tarjeta,
                w.ultimos4 AS ultimos4_tarjeta,

                pa.id_pago,
                pa.monto,
                pa.estado AS estado_pago,
                pa.fecha_pago,

                b.id_boleto,
                b.id_vuelo,
                b.id_asiento,
                b.id_equipaje,

                v.fecha_salida,
                v.fecha_llegada,

                ao.ciudad AS origen_ciudad,
                ad.ciudad AS destino_ciudad,

                a.tipo_asiento,
                e.tipo AS tipo_equipaje

            FROM pedidos p
            JOIN wallet w ON p.id_wallet = w.id_wallet
            LEFT JOIN pagos pa ON pa.id_pedido = p.id_pedido
            LEFT JOIN boletos b ON b.id_pedido = p.id_pedido
            LEFT JOIN vuelos v ON b.id_vuelo = v.id_vuelo
            LEFT JOIN aeropuertos ao ON v.id_origen = ao.id_aeropuerto
            LEFT JOIN aeropuertos ad ON v.id_destino = ad.id_aeropuerto
            LEFT JOIN asientos a ON b.id_asiento = a.id_asiento
            LEFT JOIN equipaje e ON b.id_equipaje = e.id_equipaje
            WHERE p.id_usuario = ?
            ORDER BY p.fecha DESC, b.id_boleto ASC
        `, [id_usuario]);

        const map = new Map();

        rows.forEach(r => {
            if (!map.has(r.id_pedido)) {
                map.set(r.id_pedido, {
                    id_pedido: r.id_pedido,
                    fecha: r.fecha,
                    total: r.total,
                    estado_pedido: r.estado_pedido,
                    monto: r.monto ?? r.total,
                    tarjeta: {
                        tipo: r.tipo_tarjeta,
                        ultimos4: r.ultimos4_tarjeta
                    },
                    boletos: []
                });
            }

            const entry = map.get(r.id_pedido);

            if (r.monto != null) entry.monto = r.monto;

            if (r.id_boleto != null) {
                entry.boletos.push({
                    id_boleto: r.id_boleto,
                    id_vuelo: r.id_vuelo,
                    origen_ciudad: r.origen_ciudad,
                    destino_ciudad: r.destino_ciudad,
                    fecha_salida: r.fecha_salida,
                    fecha_llegada: r.fecha_llegada,
                    tipo_asiento: r.tipo_asiento,
                    tipo_equipaje: r.tipo_equipaje
                });
            }
        });

        return res.json({ error: false, historial: Array.from(map.values()) });
    } catch (err) {
        console.error("Error obtenerHistorialPedidosUsuario:", err);
        return res.status(500).json({ error: true, message: "Error al obtener historial." });
    }
}

// ================================================================
// EXPORTS — Todo lo que usa server.js
// ================================================================
module.exports = {

    /* =========================
       Middlewares
    ========================== */
    verificarToken,
    soloAdmin,
    soloStaff,
    /* =========================
       Auth
    ========================== */
    login,
    registrar,
    resetPassword,

    /* =========================
       Usuarios (Admin)
    ========================== */
    listarUsuariosAdmin,
    crearUsuario,
    actualizarUsuarioAdmin,
    eliminarUsuario,

    /* =========================
       Wallet
    ========================== */
    listarWallet,
    agregarTarjeta,
    actualizarTarjeta,
    eliminarTarjeta,

    /* =========================
       Perfil usuario
    ========================== */
    updateUser,
    updatePassword,

    /* =========================
       Direcciones / Envíos
    ========================== */
    obtenerDireccionesUsuario,
    agregarDireccion,
    editarDireccion,
    eliminarDireccion,

    obtenerPedidosPagados,
    crearEnvio,
    obtenerHistorialEnvios,

    /* =========================
       Historial (MiPerfil)
    ========================== */
    obtenerHistorialPedidosUsuario,

    /* =========================
       Vuelos públicos
    ========================== */
    listarVuelosPublico,
    detalleVuelo,

    /* =========================
       Admin — Aeropuertos
    ========================== */
    listarAeropuertos,
    crearAeropuerto,
    actualizarAeropuerto,
    eliminarAeropuerto,

    /* =========================
       Admin — Vuelos
    ========================== */
    listarVuelosAdmin,
    crearVuelo,
    actualizarVuelo,
    eliminarVuelo,

    /* =========================
       Admin — Asientos
    ========================== */
    listarAsientos,
    crearAsiento,
    actualizarAsiento,
    eliminarAsiento,

    /* =========================
       Admin — Equipaje
    ========================== */
    listarEquipaje,
    crearEquipaje,
    actualizarEquipaje,
    eliminarEquipaje,

    /* =========================
       Carrito / Pedido
    ========================== */
    crearPedidoDesdeCarrito,

    /* =========================
       Tipos de maleta
    ========================== */
    listarTiposMaleta,
    crearTipoMaleta,
    actualizarTipoMaleta,
    eliminarTipoMaleta,

    /* =========================
       Admin — Pedidos
    ========================== */
    listarPedidos,
    crearPedidoAdmin,
    actualizarPedidoAdmin,
    eliminarPedidoAdmin,

    /* =========================
       Admin — Pagos
    ========================== */
    listarPagos,
    crearPagoAdmin,
    actualizarPagoAdmin,
    eliminarPagoAdmin,

    /* =========================
       Admin — Boletos
    ========================== */
    listarBoletos,
    crearBoletoAdmin,
    actualizarBoletoAdmin,
    eliminarBoletoAdmin
};

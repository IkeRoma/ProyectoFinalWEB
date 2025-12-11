// ===========================================================
// authController.js — CONTROLADOR COMPLETO CON EXPRESS ROUTER
// ===========================================================

const express = require("express");
const router = express.Router();

const db = require("./conexion");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ===========================================================
// CONFIG JWT
// ===========================================================
const JWT_SECRET = process.env.JWT_SECRET || "CAMBIA_ESTA_CLAVE_EN_PRODUCCION_123";
const JWT_EXPIRES_IN = "2h";

const query = (sql, params = []) =>
    new Promise((resolve, reject) =>
        db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows))
    );

// =========================================
// Estados válidos
// =========================================
const ESTADOS_MX = new Set([
    "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas",
    "Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Guanajuato",
    "Guerrero","Hidalgo","Jalisco","México","Michoacán","Morelos","Nayarit",
    "Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí",
    "Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas"
]);

// ===========================================================
// HELPERS
// ===========================================================
function tokenizar(numero) {
    return crypto.createHash("sha256").update(numero).digest("hex");
}

function detectarTipo(numero) {
    if (/^4[0-9]/.test(numero)) return "Visa";
    if (/^5[1-5]/.test(numero)) return "MasterCard";
    if (/^2/.test(numero)) return "MasterCard";
    return "Desconocida";
}

function crearToken(usuario) {
    return jwt.sign(
        { id: usuario.ID, rol: usuario.Rol },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// ===========================================================
// MIDDLEWARES
// ===========================================================
function verificarToken(req, res, next) {
    const header = req.headers["authorization"];
    if (!header) return res.status(401).json({ error: true, message: "Falta token" });

    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token)
        return res.status(401).json({ error: true, message: "Token inválido" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err)
            return res.status(401).json({ error: true, message: "Token expirado" });

        req.user = { ID: decoded.id, Rol: decoded.rol };
        next();
    });
}

function soloAdmin(req, res, next) {
    if (!req.user || req.user.Rol !== 1)
        return res.status(403).json({ error: true, message: "Solo admin" });
    next();
}

// ===========================================================
// LOGIN
// ===========================================================
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM Usuarios WHERE Correo = ?", [email], (err, rows) => {
        if (err) return res.status(500).json({ error: true, message: "Error servidor" });
        if (rows.length === 0)
            return res.json({ error: true, message: "El usuario no existe" });

        const usuario = rows[0];
        const hashBD = usuario.Contrasena || "";
        const esHash = hashBD.startsWith("$2");

        if (!esHash) {
            if (hashBD !== password)
                return res.json({ error: true, message: "Contraseña incorrecta" });

            bcrypt.hash(password, 10, (errH, newHash) => {
                if (!errH) {
                    db.query("UPDATE Usuarios SET Contrasena = ? WHERE ID = ?", [newHash, usuario.ID]);
                    usuario.Contrasena = newHash;
                }
                validar(usuario, password);
            });
        } else validar(usuario, password);

        function validar(usr, plain) {
            bcrypt.compare(plain, usr.Contrasena, (err2, ok) => {
                if (!ok) return res.json({ error: true, message: "Contraseña incorrecta" });

                const token = crearToken(usr);
                res.json({
                    error: false,
                    message: "Login exitoso",
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
});

// ===========================================================
// REGISTRO
// ===========================================================
router.post("/register", (req, res) => {
    const { nombre, apellidos, email, telefono, password } = req.body;
    const rol = email.endsWith("@admin.com") ? 1 : 0;

    bcrypt.hash(password, 10, (errHash, hash) => {
        if (errHash) return res.json({ error: true, message: "Error al procesar contraseña" });

        const sql = `
            INSERT INTO Usuarios (Nombre, Apellido, Correo, Contrasena, Telefono, Rol)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(sql, [nombre, apellidos, email, hash, telefono, rol], err => {
            if (err) return res.json({ error: true, message: "Correo ya registrado" });
            res.json({ error: false, message: "Usuario registrado" });
        });
    });
});

// ===========================================================
// RESET PASSWORD
// ===========================================================
router.post("/reset", (req, res) => {
    const { email, passwordNueva } = req.body;

    bcrypt.hash(passwordNueva, 10, (errHash, hash) => {
        if (errHash) return res.json({ error: true, message: "Error servidor" });

        db.query("UPDATE Usuarios SET Contrasena = ? WHERE Correo = ?", [hash, email], (err, result) => {
            if (result.affectedRows === 0)
                return res.json({ error: true, message: "Correo no encontrado" });

            res.json({ error: false, message: "Contraseña actualizada" });
        });
    });
});

// ===========================================================
// ADMIN — Listado CRUD Usuarios
// ===========================================================
router.get("/usuarios/list", soloAdmin, (req, res) => {
    db.query("SELECT ID, Nombre, Apellido, Correo, Telefono, Rol FROM Usuarios", (err, rows) =>
        res.json({ error: !!err, usuarios: rows })
    );
});

router.get("/usuarios/id/:id", soloAdmin, (req, res) => {
    db.query("SELECT * FROM Usuarios WHERE ID = ?", [req.params.id], (err, rows) =>
        res.json({ error: !!err, usuario: rows[0] })
    );
});

router.post("/usuarios/add", soloAdmin, (req, res) => {
    db.query("INSERT INTO Usuarios SET ?", req.body, err =>
        res.json({ error: !!err, message: err ? "Error al crear usuario" : "Usuario creado" })
    );
});

router.put("/usuarios/update/:id", soloAdmin, (req, res) => {
    db.query("UPDATE Usuarios SET ? WHERE ID = ?", [req.body, req.params.id], err =>
        res.json({ error: !!err, message: err ? "Error al actualizar" : "Usuario actualizado" })
    );
});

router.delete("/usuarios/delete/:id", soloAdmin, (req, res) => {
    db.query("DELETE FROM Usuarios WHERE ID = ?", [req.params.id], err =>
        res.json({ error: !!err, message: err ? "Error al eliminar" : "Usuario eliminado" })
    );
});

// ===========================================================
// WALLET — Listar tarjetas
// ===========================================================
router.get("/wallet/list/:id_usuario", verificarToken, (req, res) => {
    const { id_usuario } = req.params;

    const sql = `
        SELECT id_wallet, bin, ultimos4, tipo, nombre_titular, fecha_expiracion
        FROM wallet
        WHERE id_usuario = ? AND activo = 1
    `;

    db.query(sql, [id_usuario], (err, rows) => {
        res.json({ error: !!err, wallet: rows });
    });
});

// ===========================================================
// WALLET — Agregar tarjeta
// ===========================================================
router.post("/wallet/add", verificarToken, (req, res) => {
    const { id_usuario, numero, titular, expiracion } = req.body;

    if (!numero || !titular || !expiracion)
        return res.json({ error: true, message: "Datos incompletos" });

    const tipo = detectarTipo(numero);
    if (tipo === "Desconocida")
        return res.json({ error: true, message: "Tarjeta inválida" });

    const bin = numero.substring(0, 6);
    const ultimos4 = numero.slice(-4);
    const hash = tokenizar(numero);

    db.query(
        "SELECT id_wallet FROM wallet WHERE hash_tarjeta = ? AND id_usuario = ? AND activo = 1",
        [hash, id_usuario],
        (err, rows) => {
            if (rows?.length > 0)
                return res.json({ error: true, message: "Tarjeta duplicada" });

            const sql = `
                INSERT INTO wallet (id_usuario, bin, ultimos4, tipo, nombre_titular, fecha_expiracion, hash_tarjeta, activo)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `;

            db.query(sql, [id_usuario, bin, ultimos4, tipo, titular, expiracion, hash], err => {
                res.json({ error: !!err, message: err ? "Error al guardar" : "Tarjeta agregada" });
            });
        }
    );
});

// ===========================================================
// WALLET — Actualizar
// ===========================================================
router.put("/wallet/update", verificarToken, (req, res) => {
    const { id_wallet, titular, expiracion } = req.body;

    db.query(
        "UPDATE wallet SET nombre_titular = ?, fecha_expiracion = ? WHERE id_wallet = ?",
        [titular, expiracion, id_wallet],
        err => res.json({ error: !!err, message: err ? "Error al actualizar" : "Actualizado" })
    );
});

// ===========================================================
// WALLET — Eliminar (soft-delete)
// ===========================================================
router.put("/wallet/delete", verificarToken, (req, res) => {
    const { id_wallet } = req.body;

    db.query("UPDATE wallet SET activo = 0 WHERE id_wallet = ?", [id_wallet], err =>
        res.json({ error: !!err, message: err ? "Error al eliminar" : "Tarjeta eliminada" })
    );
});

// ===========================================================
// DIRECCIONES — Listar
// ===========================================================
router.get("/direcciones/:id_usuario", verificarToken, (req, res) => {
    db.query(
        "SELECT id_direccion, calle, ciudad, estado, cp FROM direcciones WHERE id_usuario = ?",
        [req.params.id_usuario],
        (err, rows) => res.json({ error: !!err, direcciones: rows })
    );
});

// ===========================================================
// DIRECCIONES — Agregar
// ===========================================================
router.post("/direcciones/add", verificarToken, (req, res) => {
    const { id_usuario, calle, ciudad, estado, cp } = req.body;

    if (!ESTADOS_MX.has(estado))
        return res.json({ error: true, message: "Estado inválido" });

    db.query(
        "INSERT INTO direcciones (id_usuario, calle, ciudad, estado, cp) VALUES (?, ?, ?, ?, ?)",
        [id_usuario, calle, ciudad, estado, cp],
        err => res.json({ error: !!err, message: err ? "Error al agregar" : "Dirección agregada" })
    );
});

// ===========================================================
// DIRECCIONES — Editar
// ===========================================================
router.put("/direcciones/update", verificarToken, (req, res) => {
    const { id_direccion, calle, ciudad, estado, cp } = req.body;

    if (!ESTADOS_MX.has(estado))
        return res.json({ error: true, message: "Estado inválido" });

    db.query(
        "UPDATE direcciones SET calle=?, ciudad=?, estado=?, cp=? WHERE id_direccion=?",
        [calle, ciudad, estado, cp, id_direccion],
        err => res.json({ error: !!err, message: err ? "Error al actualizar" : "Dirección actualizada" })
    );
});

// ===========================================================
// DIRECCIONES — Eliminar
// ===========================================================
router.delete("/direcciones/delete/:id", verificarToken, (req, res) => {
    db.query("DELETE FROM direcciones WHERE id_direccion = ?", [req.params.id], err =>
        res.json({ error: !!err, message: err ? "Error al eliminar" : "Dirección eliminada" })
    );
});

// ===========================================================
// ENVÍOS — Pedidos pagados
// ===========================================================
router.get("/envios/pedidos/:id_usuario", verificarToken, (req, res) => {
    const sql = `
        SELECT id_pedido, total 
        FROM pedidos 
        WHERE id_usuario=? AND estado='PAGADO'
    `;
    db.query(sql, [req.params.id_usuario], (err, rows) =>
        res.json({ error: !!err, pedidos: rows })
    );
});

// ===========================================================
// ENVÍOS — Historial
// ===========================================================
router.get("/envios/historial/:id_usuario", verificarToken, (req, res) => {
    const sql = `
        SELECT id_envio, id_pedido, cantidad, fecha_envio, estado_envio, costo_envio
        FROM envio_equipaje
        WHERE id_usuario=?
        ORDER BY fecha_envio DESC
    `;
    db.query(sql, [req.params.id_usuario], (err, rows) =>
        res.json({ error: !!err, envios: rows })
    );
});

// ===========================================================
// VUELOS — Público
// ===========================================================
router.get("/vuelos", async (req, res) => {
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
            LEFT JOIN asientos a ON a.id_vuelo = v.id_vuelo AND a.activo=1
            WHERE v.activo=1
            GROUP BY v.id_vuelo
        `;
        const vuelos = await query(sql);
        res.json({ error: false, vuelos });
    } catch (err) {
        res.json({ error: true, message: "Error al listar vuelos" });
    }
});

// ===========================================================
// VUELO — Detalle
// ===========================================================
router.get("/vuelos/:id", async (req, res) => {
    try {
        const info = await query(`
            SELECT 
                v.*, 
                ao.ciudad AS origen_ciudad,
                ad.ciudad AS destino_ciudad,
                TIMESTAMPDIFF(MINUTE, v.fecha_salida, v.fecha_llegada) AS duracion_min
            FROM vuelos v
            JOIN aeropuertos ao ON v.id_origen = ao.id_aeropuerto
            JOIN aeropuertos ad ON v.id_destino = ad.id_aeropuerto
            WHERE v.id_vuelo = ?
        `, [req.params.id]);

        if (!info.length)
            return res.json({ error: true, message: "Vuelo no encontrado" });

        const asientos = await query(`
            SELECT id_asiento, tipo_asiento, precio, stock 
            FROM asientos 
            WHERE id_vuelo=? AND activo=1
        `, [req.params.id]);

        const equipaje = await query(`
            SELECT id_equipaje, tipo, precio_extra 
            FROM equipaje 
            WHERE id_vuelo=? AND activo=1
        `, [req.params.id]);

        res.json({
            error: false,
            vuelo: info[0],
            asientos,
            equipaje
        });

    } catch (err) {
        res.json({ error: true, message: "Error en detalle" });
    }
});

// ===========================================================
// ADMIN — Aeropuertos
// ===========================================================
router.get("/admin/aeropuertos", soloAdmin, (req, res) => {
    db.query("SELECT * FROM aeropuertos", (err, rows) =>
        res.json({ error: !!err, aeropuertos: rows })
    );
});

router.post("/admin/aeropuertos/add", soloAdmin, (req, res) => {
    const { nombre, ciudad, estado } = req.body;

    db.query(
        "INSERT INTO aeropuertos(nombre, ciudad, estado, activo) VALUES (?, ?, ?, 1)",
        [nombre, ciudad, estado],
        err => res.json({ error: !!err, message: err ? "Error" : "Aeropuerto creado" })
    );
});

// ===========================================================
// ADMIN — Vuelos
// ===========================================================
router.get("/admin/vuelos", soloAdmin, async (req, res) => {
    try {
        const sql = `
            SELECT 
                v.*, 
                ao.ciudad AS origen_ciudad,
                ad.ciudad AS destino_ciudad,
                TIMESTAMPDIFF(MINUTE, v.fecha_salida, v.fecha_llegada) AS duracion_min
            FROM vuelos v
            JOIN aeropuertos ao ON v.id_origen = ao.id_aeropuerto
            JOIN aeropuertos ad ON v.id_destino = ad.id_aeropuerto
        `;
        const vuelos = await query(sql);
        res.json({ error: false, vuelos });

    } catch (err) {
        res.json({ error: true });
    }
});

router.post("/admin/vuelos/add", soloAdmin, (req, res) => {
    const { id_origen, id_destino, fecha_salida, fecha_llegada, escala, numero_escalas } = req.body;

    db.query(`
        INSERT INTO vuelos(id_origen,id_destino,fecha_salida,fecha_llegada,escala,numero_escalas,activo)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    `, 
    [id_origen,id_destino,fecha_salida,fecha_llegada,escala || "DIRECTO",numero_escalas || 0],
    err => res.json({ error: !!err, message: err ? "Error" : "Vuelo creado" }));
});

// ===========================================================
// CARRITO → CREAR PEDIDO
// ===========================================================
router.post("/carrito/pagar", verificarToken, async (req, res) => {
    const { id_usuario, id_wallet, items, envio } = req.body;

    if (!id_usuario || !id_wallet || !Array.isArray(items) || !items.length)
        return res.json({ error: true, message: "Datos incompletos del carrito" });

    try {
        // Obtener asientos/equipaje
        const idsAsientos = [...new Set(items.map(i => i.id_asiento))];
        const idsEquipaje = [...new Set(items.map(i => i.id_equipaje).filter(Boolean))];

        const asientosRows = idsAsientos.length ?
            await query("SELECT id_asiento, id_vuelo, precio FROM asientos WHERE id_asiento IN (?)", [idsAsientos])
            : [];

        const equipajeRows = idsEquipaje.length ?
            await query("SELECT id_equipaje, precio_extra FROM equipaje WHERE id_equipaje IN (?)", [idsEquipaje])
            : [];

        const mapAsientos = new Map(asientosRows.map(a => [a.id_asiento, a]));
        const mapEquipaje = new Map(equipajeRows.map(e => [e.id_equipaje, e]));

        let total = 0;
        const detalles = [];

        for (const item of items) {
            const asiento = mapAsientos.get(item.id_asiento);
            if (!asiento)
                return res.json({ error: true, message: "Asiento no válido" });

            const equip = item.id_equipaje ? mapEquipaje.get(item.id_equipaje) : null;
            const precioUnit = asiento.precio + (equip ? equip.precio_extra : 0);

            const subtotal = precioUnit * (item.cantidad || 1);
            total += subtotal;

            detalles.push({
                id_vuelo: asiento.id_vuelo,
                id_asiento: item.id_asiento,
                id_equipaje: item.id_equipaje || null,
                cantidad: item.cantidad || 1,
                precioUnit,
                subtotal
            });
        }

        // Envío
        let costo_envio = 0;
        if (envio?.precio_total) {
            costo_envio = Number(envio.precio_total);
            total += costo_envio;
        }

        // Crear pedido
        const pedidoRes = await query(
            "INSERT INTO pedidos(id_usuario,id_wallet,total,estado) VALUES (?, ?, ?, 'PAGADO')",
            [id_usuario, id_wallet, total]
        );

        const id_pedido = pedidoRes.insertId;

        const boletos = [];

        for (const det of detalles) {
            await query(
                "INSERT INTO detalles_pedido(id_pedido,id_vuelo,id_asiento,cantidad,precio_unitario,subtotal) VALUES (?, ?, ?, ?, ?, ?)",
                [id_pedido, det.id_vuelo, det.id_asiento, det.cantidad, det.precioUnit, det.subtotal]
            );

            await query(
                "UPDATE asientos SET stock = GREATEST(stock - ?, 0) WHERE id_asiento=?",
                [det.cantidad, det.id_asiento]
            );

            for (let i = 0; i < det.cantidad; i++) {
                const boleto = await query(
                    "INSERT INTO boletos(id_usuario,id_vuelo,id_asiento,id_equipaje,id_pedido,precio_total) VALUES (?, ?, ?, ?, ?, ?)",
                    [id_usuario, det.id_vuelo, det.id_asiento, det.id_equipaje, id_pedido, det.precioUnit]
                );

                const info = await query(`
                    SELECT 
                        b.*, a.tipo_asiento,
                        ao.ciudad AS origen_ciudad,
                        ad.ciudad AS destino_ciudad,
                        v.fecha_salida
                    FROM boletos b
                    JOIN asientos a ON b.id_asiento=a.id_asiento
                    JOIN vuelos v ON v.id_vuelo=b.id_vuelo
                    JOIN aeropuertos ao ON ao.id_aeropuerto=v.id_origen
                    JOIN aeropuertos ad ON ad.id_aeropuerto=v.id_destino
                    WHERE id_boleto=?
                `, [boleto.insertId]);

                boletos.push(info[0]);
            }
        }

        // Registrar pago
        await query(
            "INSERT INTO pagos(id_usuario,id_pedido,monto,estado) VALUES (?, ?, ?, 'APROBADO')",
            [id_usuario, id_pedido, total]
        );

        res.json({
            error: false,
            message: "Pago procesado",
            pedido: { id_pedido, total, costo_envio },
            boletos,
            envio
        });

    } catch (err) {
        console.error(err);
        res.json({ error: true, message: "Error al procesar el pago" });
    }
});

// ===========================================================
// EXPORTACIÓN FINAL DEL ROUTER
// ===========================================================
module.exports = router;

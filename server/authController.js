const conexion = require("./conexion");
const bcrypt = require("bcryptjs");

module.exports = {

    // ============================
    //          LOGIN
    // ============================
    login: async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.json({ error: true, message: "⚠️ Email y contraseña son obligatorios" });
        }

        const query = "SELECT * FROM Usuarios WHERE Correo = ?";
        conexion.query(query, [email], async (err, results) => {
            if (err) {
                console.error("❌ Error en login:", err);
                return res.json({ error: true, message: "❌ Error interno del servidor" });
            }

            if (results.length === 0) {
                return res.json({ error: true, message: "⚠️ Usuario no encontrado" });
            }

            const usuario = results[0];
            const coincide = await bcrypt.compare(password, usuario.Contrasena);

            if (!coincide) {
                return res.json({ error: true, message: "⚠️ Contraseña incorrecta" });
            }

            // Mandamos solo lo necesario al frontend
            return res.json({
                error: false,
                message: "✅ Inicio de sesión exitoso",
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
    },

    // ============================
    //          REGISTRO
    // ============================
    registrar: async (req, res) => {
        const { nombre, apellidos, email, telefono, password } = req.body;

        if (!nombre || !apellidos || !email || !telefono || !password) {
            return res.json({ error: true, message: "⚠️ Todos los campos son obligatorios" });
        }

        try {
            const hash = await bcrypt.hash(password, 10);

            // Determinar si es admin
            const esAdmin = email.endsWith("@admin.com") ? 1 : 0;

            const query = `
                INSERT INTO Usuarios (Nombre, Apellido, Correo, Contrasena, Telefono, Rol)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            conexion.query(
                query,
                [nombre, apellidos, email, hash, telefono, esAdmin],
                (err, results) => {
                    if (err) {
                        console.error("❌ Error al registrar:", err);
                        return res.json({ error: true, message: "❌ Error al registrar usuario" });
                    }

                    return res.json({
                        error: false,
                        message: esAdmin
                            ? "✅ Usuario administrador creado correctamente"
                            : "✅ Usuario creado correctamente"
                    });
                }
            );

        } catch (error) {
            console.error("❌ Error en servidor:", error);
            res.json({ error: true, message: "❌ Error interno del servidor" });
        }
    },

    // ============================
    //     RESET PASSWORD
    // ============================
    resetPassword: async (req, res) => {
        const { email, passwordNueva } = req.body;

        if (!email || !passwordNueva) {
            return res.json({ error: true, message: "⚠️ Datos incompletos" });
        }

        try {
            const hashNueva = await bcrypt.hash(passwordNueva, 10);

            const query = "UPDATE Usuarios SET Contrasena = ? WHERE Correo = ?";

            conexion.query(query, [hashNueva, email], (err, results) => {
                if (err) {
                    console.error("❌ Error reset password:", err);
                    return res.json({ error: true, message: "❌ Error al actualizar contraseña" });
                }

                if (results.affectedRows === 0) {
                    return res.json({ error: true, message: "⚠️ Correo no encontrado" });
                }

                return res.json({
                    error: false,
                    message: "✅ Contraseña actualizada correctamente"
                });
            });

        } catch (err) {
            console.error("❌ Error servidor:", err);
            res.json({ error: true, message: "❌ Error en el servidor" });
        }
    },

    // ============================
    //   ELIMINAR USUARIO
    // ============================
    eliminarUsuario: (req, res) => {
        const { email } = req.body;

        const query = "DELETE FROM Usuarios WHERE Correo = ?";

        conexion.query(query, [email], (err, results) => {
            if (err) {
                console.error("❌ Error eliminar:", err);
                return res.json({ error: true, message: "❌ Error al eliminar usuario" });
            }

            if (results.affectedRows === 0) {
                return res.json({ error: true, message: "⚠️ Usuario no encontrado" });
            }

            return res.json({
                error: false,
                message: "✅ Usuario eliminado correctamente"
            });
        });
    },

    // ============================
    //    LISTAR USUARIOS
    // ============================
    listarUsuarios: (req, res) => {
        const query = "SELECT ID, Nombre, Apellido, Correo, Telefono, Rol FROM Usuarios";

        conexion.query(query, (err, results) => {
            if (err) {
                console.error("❌ Error listar:", err);
                return res.json({ error: true, message: "❌ Error al obtener usuarios" });
            }

            return res.json({
                error: false,
                usuarios: results
            });
        });
    }

};

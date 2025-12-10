const conexion = require("./conexion");
const bcrypt = require("bcryptjs");

module.exports = {
  // LOGIN
  login: async (req, res) => {
    const { email, password } = req.body;
    if(!email || !password) return res.json({ error: true, message: "⚠️ Los campos no pueden estar vacíos" });

    conexion.query("SELECT * FROM Usuarios WHERE Correo = ?", [email], async (err, results) => {
      if(err) return res.json({ error: true, message: "⚠️ Problemas en los servidores" });
      if(results.length === 0) return res.json({ error: true, message: "⚠️ Usuario no encontrado" });

      const coincide = await bcrypt.compare(password, results[0].Contrasena);
      if(!coincide) return res.json({ error: true, message: "⚠️ Contraseña incorrecta" });

      res.json({ error: false, message: "✅ Inicio de sesión exitoso", user: results[0] });
    });
  },

  // REGISTRO
  registrar: async (req, res) => {
    const { nombre, apellidos, email, telefono, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    conexion.query(
      "INSERT INTO Usuarios (Nombre, Apellido, Correo, Contrasena, Telefono) VALUES (?,?,?,?,?)",
      [nombre, apellidos, email, hash, telefono],
      (err) => {
        if(err) return res.json({ error: true, message: "⚠️ Problemas en los servidores" });
        res.json({ error: false, message: "✅ Usuario creado correctamente" });
      }
    );
  },

  // RESET PASSWORD
  resetPassword: async (req, res) => {
    const { email, passwordNueva } = req.body;
    const hash = await bcrypt.hash(passwordNueva, 10);

    conexion.query("UPDATE Usuarios SET Contrasena = ? WHERE Correo = ?", [hash, email], (err, results) => {
      if(err) return res.json({ error: true, message: "⚠️ Problemas en los servidores" });
      if(results.affectedRows === 0) return res.json({ error: true, message: "⚠️ Correo no encontrado" });
      res.json({ error: false, message: "✅ Contraseña actualizada correctamente" });
    });
  },

  // ELIMINAR USUARIO
  eliminarUsuario: (req, res) => {
    const { email } = req.body;
    conexion.query("DELETE FROM Usuarios WHERE Correo = ?", [email], (err, results) => {
      if(err) return res.json({ error: true, message: "⚠️ Error al eliminar usuario" });
      if(results.affectedRows === 0) return res.json({ error: true, message: "⚠️ Usuario no encontrado" });
      res.json({ error: false, message: "✅ Usuario eliminado correctamente" });
    });
  },

  // LISTAR USUARIOS
  listarUsuarios: (req, res) => {
    conexion.query("SELECT ID, Nombre, Apellido, Correo, Telefono FROM Usuarios", (err, results) => {
      if(err) return res.json({ error: true, message: "⚠️ Error al listar usuarios" });
      res.json({ error: false, usuarios: results });
    });
  }
};

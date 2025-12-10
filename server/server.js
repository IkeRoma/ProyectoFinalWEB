// server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { fileURLToPath } = require("url");
const { dirname } = require("path");

const auth = require("./authController");


// Necesario para rutas absolutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos (tu HTML, JS, CSS)
app.use(express.static(path.join(__dirname, "../public")));

// Ruta de prueba
app.get("/", (req, res) => {
    res.json({ mensaje: "Servidor funcionando correctamente" });
});

// ========================================================
//      RUTAS QUE EXIGE TU FRONTEND (LOGIN / REGISTER)
// ========================================================

// LOGIN
app.post("/api/login", auth.login);

// REGISTRO
app.post("/api/register", auth.registrar);

// RESET PASSWORD
app.post("/api/reset", auth.resetPassword);

// ELIMINAR
app.post("/api/eliminar", auth.eliminarUsuario);

// LISTAR
app.get("/api/listar", auth.listarUsuarios);

// ========================================================
//     FIN DE RUTAS
// ========================================================

// Configuración del servidor
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

// Crear servidor HTTP
const server = http.createServer(app);

// Manejo de errores
server.on("error", (err) => {
    console.error("❌ Error al iniciar el servidor:", err.message);
});

// Iniciar servidor
server.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
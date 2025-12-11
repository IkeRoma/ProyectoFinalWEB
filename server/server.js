// server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const reviews = require("./reviewsController");
const auth = require("./authController");

const app = express();

// ========================
//  Middlewares
// ========================
app.use(cors());
app.use(express.json());

// ========================
//  Archivos estáticos
//  (sirve tu carpeta public directamente)
// ========================

app.use(express.static(path.join(__dirname, "../public")));

// Ruta de prueba opcional
app.get("/", (req, res) => {
    res.send("Servidor funcionando correctamente");
});

// ========================
//  Rutas API
// ========================

// LOGIN
app.post("/api/login", auth.login);

// REGISTRO
app.post("/api/register", auth.registrar);

// RESET PASSWORD
app.post("/api/reset", auth.resetPassword);

// ELIMINAR USUARIO
app.post("/api/eliminar", auth.eliminarUsuario);

// LISTAR USUARIOS
app.get("/api/listar", auth.listarUsuarios);

// RESEÑAS DE USUARIOS
app.post("/api/reviews/add", reviews.crearReseña);
app.get("/api/reviews/list", reviews.obtenerReseñas);


// ========================
//  Servidor HTTP
// ========================

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

// Crear servidor HTTP para soportar despliegues en la VM
const server = http.createServer(app);

// Manejo de errores
server.on("error", (err) => {
    console.error("❌ Error al iniciar el servidor:", err.message);
});

// Iniciar servidor
server.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
});

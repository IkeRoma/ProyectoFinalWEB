// =========================================
// server.js — Servidor Principal
// =========================================

const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");

const reviews = require("./reviewsController.js");
const auth = require("./authController.js");

const app = express();

// ========================
//  Middlewares
// ========================
app.use(cors());
app.use(express.json());

// ========================
//  Archivos estáticos (carpeta public)
// ========================
app.use(express.static(path.join(__dirname, "../public")));

// Ruta de prueba
app.get("/", (req, res) => {
    res.send("Servidor funcionando correctamente");
});

// ========================
//  RUTAS API
// ========================

// LOGIN & REGISTER
app.post("/api/login", auth.login);
app.post("/api/register", auth.registrar);

// RESET PASSWORD
app.post("/api/reset", auth.resetPassword);

// USUARIOS
app.post("/api/eliminar", auth.eliminarUsuario);
app.get("/api/listar", auth.listarUsuarios);

// PERFIL — MODIFICAR DATOS & CONTRASEÑA
app.post("/api/updateUser", auth.updateUser);
app.post("/api/updatePassword", auth.updatePassword);

// WALLET
app.get("/api/wallet/list/:id_usuario", auth.listarWallet);
app.post("/api/wallet/add", auth.agregarTarjeta);
app.post("/api/wallet/delete", auth.eliminarTarjeta);
app.post("/api/wallet/update", auth.actualizarTarjeta);

// RESEÑAS
app.post("/api/reviews/add", reviews.crearReseña);
app.get("/api/reviews/list", reviews.obtenerReseñas);
app.get("/api/reviews/byUser/:id", reviews.reseñasPorUsuario);

// ========================
//  Servidor HTTP
// ========================

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const server = http.createServer(app);

// Errores del servidor
server.on("error", (err) => {
    console.error("❌ Error al iniciar servidor:", err.message);
});

// Iniciar servidor
server.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
});

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
const { verificarToken, soloAdmin } = auth;

// LOGIN / REGISTRO
app.post("/api/login", auth.login);
app.post("/api/register", auth.registrar);
app.post("/api/reset", auth.resetPassword);

// WALLET
app.get("/api/wallet/list/:id_usuario", verificarToken, auth.listarWallet);
app.post("/api/wallet/add", verificarToken, auth.agregarTarjeta);
app.post("/api/wallet/delete", verificarToken, auth.eliminarTarjeta);
app.post("/api/wallet/update", verificarToken, auth.actualizarTarjeta);

// PERFIL
app.post("/api/updateUser", verificarToken, auth.updateUser);
app.post("/api/updatePassword", verificarToken, auth.updatePassword);

// ADMIN
app.get("/api/listar", verificarToken, soloAdmin, auth.listarUsuarios);
app.post("/api/eliminar", verificarToken, soloAdmin, auth.eliminarUsuario);

// ENVÍO EQUIPAJE
app.get("/api/envio/pedidos/:id_usuario", verificarToken, auth.obtenerPedidosPagados);
app.get("/api/envio/direcciones/:id_usuario", verificarToken, auth.obtenerDireccionesUsuario);
app.post("/api/envio/crear", verificarToken, auth.crearEnvio);
app.get("/api/envio/historial/:id_usuario", verificarToken, auth.obtenerHistorialEnvios);

// DIRECCIONES (Mi Perfil)
app.post("/api/envio/agregarDireccion", verificarToken, auth.agregarDireccion);
app.post("/api/envio/editarDireccion", verificarToken, auth.editarDireccion);
app.post("/api/envio/eliminarDireccion", verificarToken, auth.eliminarDireccion);

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

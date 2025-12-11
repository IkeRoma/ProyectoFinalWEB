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

// VUELOS (públicos para la página de Vuelos)
app.get("/api/vuelos", auth.listarVuelosPublico);
app.get("/api/vuelos/:id", auth.detalleVuelo);

// ADMIN – aeropuertos
app.get("/api/admin/aeropuertos", verificarToken, soloAdmin, auth.listarAeropuertos);
app.post("/api/admin/aeropuertos/add", verificarToken, soloAdmin, auth.crearAeropuerto);
app.post("/api/admin/aeropuertos/update", verificarToken, soloAdmin, auth.actualizarAeropuerto);
app.post("/api/admin/aeropuertos/delete", verificarToken, soloAdmin, auth.eliminarAeropuerto);

// ADMIN – vuelos
app.get("/api/admin/vuelos", verificarToken, soloAdmin, auth.listarVuelosAdmin);
app.post("/api/admin/vuelos/add", verificarToken, soloAdmin, auth.crearVuelo);
app.post("/api/admin/vuelos/update", verificarToken, soloAdmin, auth.actualizarVuelo);
app.post("/api/admin/vuelos/delete", verificarToken, soloAdmin, auth.eliminarVuelo);

// ADMIN – asientos
app.get("/api/admin/asientos", verificarToken, soloAdmin, auth.listarAsientos);
app.post("/api/admin/asientos/add", verificarToken, soloAdmin, auth.crearAsiento);
app.post("/api/admin/asientos/update", verificarToken, soloAdmin, auth.actualizarAsiento);
app.post("/api/admin/asientos/delete", verificarToken, soloAdmin, auth.eliminarAsiento);

// ADMIN – equipaje
app.get("/api/admin/equipaje", verificarToken, soloAdmin, auth.listarEquipaje);
app.post("/api/admin/equipaje/add", verificarToken, soloAdmin, auth.crearEquipaje);
app.post("/api/admin/equipaje/update", verificarToken, soloAdmin, auth.actualizarEquipaje);
app.post("/api/admin/equipaje/delete", verificarToken, soloAdmin, auth.eliminarEquipaje);

// CARRITO / PAGOS
app.post("/api/carrito/pagar", verificarToken, auth.crearPedidoDesdeCarrito);

// --- TIPOS DE MALETA (ENVÍOS) ---
app.get("/api/admin/tipos-maleta", verificarToken, soloAdmin, auth.listarTiposMaleta);
app.post("/api/admin/tipos-maleta/add", verificarToken, soloAdmin, auth.crearTipoMaleta);
app.post("/api/admin/tipos-maleta/update", verificarToken, soloAdmin, auth.actualizarTipoMaleta);
app.post("/api/admin/tipos-maleta/delete", verificarToken, soloAdmin, auth.eliminarTipoMaleta);

// --- PEDIDOS ---
app.get("/api/admin/pedidos", verificarToken, soloAdmin, auth.listarPedidos);
app.post("/api/admin/pedidos/add", verificarToken, soloAdmin, auth.crearPedidoAdmin);
app.post("/api/admin/pedidos/update", verificarToken, soloAdmin, auth.actualizarPedidoAdmin);
app.post("/api/admin/pedidos/delete", verificarToken, soloAdmin, auth.eliminarPedidoAdmin);

// --- PAGOS ---
app.get("/api/admin/pagos", verificarToken, soloAdmin, auth.listarPagos);
app.post("/api/admin/pagos/add", verificarToken, soloAdmin, auth.crearPagoAdmin);
app.post("/api/admin/pagos/update", verificarToken, soloAdmin, auth.actualizarPagoAdmin);
app.post("/api/admin/pagos/delete", verificarToken, soloAdmin, auth.eliminarPagoAdmin);

// --- BOLETOS ---
app.get("/api/admin/boletos", verificarToken, soloAdmin, auth.listarBoletos);
app.post("/api/admin/boletos/add", verificarToken, soloAdmin, auth.crearBoletoAdmin);
app.post("/api/admin/boletos/update", verificarToken, soloAdmin, auth.actualizarBoletoAdmin);
app.post("/api/admin/boletos/delete", verificarToken, soloAdmin, auth.eliminarBoletoAdmin);
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

const express = require("express");
const cors = require("cors");
const path = require("path");

const auth = require("./authController.js");
const reviews = require("./reviewsController.js");
const dashboard = require("./dashboardController.js");

const { verificarToken, soloAdmin, soloStaff } = auth;

const app = express();

app.use(cors());
app.use(express.json());

// Frontend
app.use(express.static(path.join(__dirname, "../public")));

/* ============================================================
   AUTH
===============================================================*/
app.post("/api/login", auth.login);

// Registro: el frontend usa /api/register, pero dejamos /api/registro por compatibilidad
app.post("/api/register", auth.registrar);
app.post("/api/registro", auth.registrar);

// Reset: el frontend usa /api/reset
app.post("/api/reset", auth.resetPassword);
app.post("/api/resetPassword", auth.resetPassword);

/* ============================================================
   PERFIL (MiPerfil)
===============================================================*/
app.post("/api/updateUser", verificarToken, auth.updateUser);
app.post("/api/updatePassword", verificarToken, auth.updatePassword);

// Historial (MiPerfil)
app.get("/api/perfil/historial/:id_usuario", verificarToken, auth.obtenerHistorialPedidosUsuario);

/* ============================================================
   WALLET
===============================================================*/
app.get("/api/wallet/list/:id_usuario", verificarToken, auth.listarWallet);
app.post("/api/wallet/add", verificarToken, auth.agregarTarjeta);
app.post("/api/wallet/update", verificarToken, auth.actualizarTarjeta);
app.post("/api/wallet/delete", verificarToken, auth.eliminarTarjeta);

// Wallet (ADMIN/WRK)
//app.get("/api/wallet/admin", verificarToken, soloStaff, auth.walletAdminListar);

/* ============================================================
   DIRECCIONES / ENVÍO (MiPerfil)
===============================================================*/
// Rutas que usa el frontend (perfil.js)
app.get("/api/envio/direcciones/:id_usuario", verificarToken, auth.obtenerDireccionesUsuario);
app.post("/api/envio/agregarDireccion", verificarToken, auth.agregarDireccion);
app.post("/api/envio/editarDireccion", verificarToken, auth.editarDireccion);
app.post("/api/envio/eliminarDireccion", verificarToken, auth.eliminarDireccion);

// Envíos (usuario)
app.post("/api/envio/crear", verificarToken, auth.crearEnvio);
app.get("/api/envio/historial/:id_usuario", verificarToken, auth.obtenerHistorialEnvios);

// Compatibilidad (si existía código viejo)
app.get("/api/direcciones/:id_usuario", verificarToken, auth.obtenerDireccionesUsuario);
app.post("/api/direcciones/add", verificarToken, auth.agregarDireccion);
app.post("/api/direcciones/update", verificarToken, auth.editarDireccion);
app.post("/api/direcciones/delete", verificarToken, auth.eliminarDireccion);

/* ============================================================
   VUELOS (PÚBLICO)
===============================================================*/
app.get("/api/vuelos", auth.listarVuelosPublico);
app.get("/api/vuelos/:id", auth.detalleVuelo);

/* ============================================================
   CARRITO / PAGO
===============================================================*/
app.post("/api/carrito/pagar", verificarToken, auth.crearPedidoDesdeCarrito);

/* ============================================================
   RESEÑAS (PÚBLICO)
   - reviews.js / perfil.js usan estas rutas
===============================================================*/
app.get("/api/reviews/list", reviews.obtenerReseñas);
app.post("/api/reviews/add", reviews.crearReseña);
app.get("/api/reviews/byUser/:id", reviews.reseñasPorUsuario);

/* ============================================================
   ADMIN / WRK (Staff: Rol 1 y 2)
   - PanelAdmin (Rol=1) y PanelWRK (Rol=2)
===============================================================*/
console.log("verificarToken:", typeof verificarToken);
console.log("soloStaff:", typeof soloStaff);
console.log("auth.listarUsuarios:", typeof auth.listarUsuarios);

// Usuarios
app.get("/api/listar", verificarToken, soloStaff, auth.listarUsuariosAdmin);
app.post("/api/eliminar", verificarToken, soloStaff, auth.eliminarUsuario);
app.post("/api/admin/usuarios/add", verificarToken, soloStaff, auth.crearUsuario);
app.post("/api/admin/usuarios/update", verificarToken, soloStaff, auth.actualizarUsuarioAdmin);

// Aeropuertos
app.get("/api/admin/aeropuertos", verificarToken, soloStaff, auth.listarAeropuertos);
app.post("/api/admin/aeropuertos/add", verificarToken, soloStaff, auth.crearAeropuerto);
app.post("/api/admin/aeropuertos/update", verificarToken, soloStaff, auth.actualizarAeropuerto);
app.post("/api/admin/aeropuertos/delete", verificarToken, soloStaff, auth.eliminarAeropuerto);

// Vuelos
app.get("/api/admin/vuelos", verificarToken, soloStaff, auth.listarVuelosAdmin);
app.post("/api/admin/vuelos/add", verificarToken, soloStaff, auth.crearVuelo);
app.post("/api/admin/vuelos/update", verificarToken, soloStaff, auth.actualizarVuelo);
app.post("/api/admin/vuelos/delete", verificarToken, soloStaff, auth.eliminarVuelo);

// Asientos
app.get("/api/admin/asientos", verificarToken, soloStaff, auth.listarAsientos);
app.post("/api/admin/asientos/add", verificarToken, soloStaff, auth.crearAsiento);
app.post("/api/admin/asientos/update", verificarToken, soloStaff, auth.actualizarAsiento);
app.post("/api/admin/asientos/delete", verificarToken, soloStaff, auth.eliminarAsiento);

// Equipaje
app.get("/api/admin/equipaje", verificarToken, soloStaff, auth.listarEquipaje);
app.post("/api/admin/equipaje/add", verificarToken, soloStaff, auth.crearEquipaje);
app.post("/api/admin/equipaje/update", verificarToken, soloStaff, auth.actualizarEquipaje);
app.post("/api/admin/equipaje/delete", verificarToken, soloStaff, auth.eliminarEquipaje);

// Tipos de maleta
app.get("/api/admin/tipos-maleta", verificarToken, soloStaff, auth.listarTiposMaleta);
app.post("/api/admin/tipos-maleta/add", verificarToken, soloStaff, auth.crearTipoMaleta);
app.post("/api/admin/tipos-maleta/update", verificarToken, soloStaff, auth.actualizarTipoMaleta);
app.post("/api/admin/tipos-maleta/delete", verificarToken, soloStaff, auth.eliminarTipoMaleta);

// Pedidos
app.get("/api/admin/pedidos", verificarToken, soloStaff, auth.listarPedidos);
app.post("/api/admin/pedidos/add", verificarToken, soloStaff, auth.crearPedidoAdmin);
app.post("/api/admin/pedidos/update", verificarToken, soloStaff, auth.actualizarPedidoAdmin);
app.post("/api/admin/pedidos/delete", verificarToken, soloStaff, auth.eliminarPedidoAdmin);

// Pagos
app.get("/api/admin/pagos", verificarToken, soloStaff, auth.listarPagos);
app.post("/api/admin/pagos/add", verificarToken, soloStaff, auth.crearPagoAdmin);
app.post("/api/admin/pagos/update", verificarToken, soloStaff, auth.actualizarPagoAdmin);
app.post("/api/admin/pagos/delete", verificarToken, soloStaff, auth.eliminarPagoAdmin);

// Boletos
app.get("/api/admin/boletos", verificarToken, soloStaff, auth.listarBoletos);
app.post("/api/admin/boletos/add", verificarToken, soloStaff, auth.crearBoletoAdmin);
app.post("/api/admin/boletos/update", verificarToken, soloStaff, auth.actualizarBoletoAdmin);
app.post("/api/admin/boletos/delete", verificarToken, soloStaff, auth.eliminarBoletoAdmin);

// Envíos (ADMIN/WRK)
//app.get("/api/admin/envios", verificarToken, soloStaff, auth.listarEnviosAdmin);
//app.post("/api/admin/envios/add", verificarToken, soloStaff, auth.crearEnvioAdmin);
//app.post("/api/admin/envios/update", verificarToken, soloStaff, auth.actualizarEnvioAdmin);
//app.post("/api/admin/envios/delete", verificarToken, soloStaff, auth.eliminarEnvioAdmin);

// Reseñas (ADMIN/WRK) — CRUD
app.get("/api/admin/reviews", verificarToken, soloStaff, reviews.adminListarReseñas);
app.post("/api/admin/reviews/add", verificarToken, soloStaff, reviews.crearReseña);
app.post("/api/admin/reviews/update", verificarToken, soloStaff, reviews.adminActualizarReseña);
app.post("/api/admin/reviews/delete", verificarToken, soloStaff, reviews.adminEliminarReseña);

/* ============================================================
   DASHBOARD VENTAS (ADMIN/WRK)
===============================================================*/
app.get("/api/dashboard/ventas/anios", verificarToken, soloStaff, dashboard.ventasAniosDisponibles);
app.get("/api/dashboard/ventas", verificarToken, soloStaff, dashboard.ventasPorMes);

/* ============================================================
   START
===============================================================*/
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

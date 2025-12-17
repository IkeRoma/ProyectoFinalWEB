const express = require("express");
const cors = require("cors");
const path = require("path");

const auth = require("./authController");
const { verificarToken, soloAdmin } = auth;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// LOGIN/REGISTRO
app.post("/api/login", auth.login);
app.post("/api/registro", auth.registro);

// PERFIL
app.post("/api/updateUser", verificarToken, auth.updateUser);
app.post("/api/updatePassword", verificarToken, auth.updatePassword);

// NUEVO: historial (ID_pedido) para MiPerfil
app.get("/api/perfil/historial/:id_usuario", verificarToken, auth.obtenerHistorialPedidosUsuario);

// ADMIN USUARIOS
app.post("/api/admin/usuarios/add", verificarToken, soloAdmin, auth.crearUsuario);
app.post("/api/admin/usuarios/update", verificarToken, soloAdmin, auth.actualizarUsuarioAdmin);
app.get("/api/listar", verificarToken, soloAdmin, auth.listarUsuarios);
app.post("/api/eliminar", verificarToken, soloAdmin, auth.eliminarUsuario);

// WALLET
app.get("/api/wallet/admin", verificarToken, soloAdmin, auth.walletAdminListar);
app.post("/api/wallet/delete", verificarToken, soloAdmin, auth.walletAdminEliminar);

// ADMIN: Aeropuertos
app.get("/api/admin/aeropuertos", verificarToken, soloAdmin, auth.listarAeropuertos);
app.post("/api/admin/aeropuertos/add", verificarToken, soloAdmin, auth.crearAeropuerto);
app.post("/api/admin/aeropuertos/update", verificarToken, soloAdmin, auth.actualizarAeropuerto);
app.post("/api/admin/aeropuertos/delete", verificarToken, soloAdmin, auth.eliminarAeropuerto);

// ADMIN: Vuelos
app.get("/api/admin/vuelos", verificarToken, soloAdmin, auth.listarVuelos);
app.post("/api/admin/vuelos/add", verificarToken, soloAdmin, auth.crearVuelo);
app.post("/api/admin/vuelos/update", verificarToken, soloAdmin, auth.actualizarVuelo);
app.post("/api/admin/vuelos/delete", verificarToken, soloAdmin, auth.eliminarVuelo);

// ADMIN: Asientos
app.get("/api/admin/asientos", verificarToken, soloAdmin, auth.listarAsientos);
app.post("/api/admin/asientos/add", verificarToken, soloAdmin, auth.crearAsiento);
app.post("/api/admin/asientos/update", verificarToken, soloAdmin, auth.actualizarAsiento);
app.post("/api/admin/asientos/delete", verificarToken, soloAdmin, auth.eliminarAsiento);

// ADMIN: Equipaje
app.get("/api/admin/equipaje", verificarToken, soloAdmin, auth.listarEquipaje);
app.post("/api/admin/equipaje/add", verificarToken, soloAdmin, auth.crearEquipaje);
app.post("/api/admin/equipaje/update", verificarToken, soloAdmin, auth.actualizarEquipaje);
app.post("/api/admin/equipaje/delete", verificarToken, soloAdmin, auth.eliminarEquipaje);

// ADMIN: Tipos de maleta
app.get("/api/admin/tipos-maleta", verificarToken, soloAdmin, auth.listarTiposMaleta);
app.post("/api/admin/tipos-maleta/add", verificarToken, soloAdmin, auth.crearTipoMaleta);
app.post("/api/admin/tipos-maleta/update", verificarToken, soloAdmin, auth.actualizarTipoMaleta);
app.post("/api/admin/tipos-maleta/delete", verificarToken, soloAdmin, auth.eliminarTipoMaleta);

// ADMIN: Pedidos
app.get("/api/admin/pedidos", verificarToken, soloAdmin, auth.listarPedidos);
app.post("/api/admin/pedidos/update", verificarToken, soloAdmin, auth.actualizarPedido);
app.post("/api/admin/pedidos/delete", verificarToken, soloAdmin, auth.eliminarPedido);

// ADMIN: Pagos
app.get("/api/admin/pagos", verificarToken, soloAdmin, auth.listarPagos);
app.post("/api/admin/pagos/update", verificarToken, soloAdmin, auth.actualizarPago);
app.post("/api/admin/pagos/delete", verificarToken, soloAdmin, auth.eliminarPago);

// ADMIN: Boletos
app.get("/api/admin/boletos", verificarToken, soloAdmin, auth.listarBoletos);
app.post("/api/admin/boletos/update", verificarToken, soloAdmin, auth.actualizarBoleto);
app.post("/api/admin/boletos/delete", verificarToken, soloAdmin, auth.eliminarBoleto);

// DIRECCIONES
app.get("/api/direcciones/:id_usuario", verificarToken, auth.obtenerDireccionesUsuario);
app.post("/api/direcciones/add", verificarToken, auth.agregarDireccionUsuario);
app.post("/api/direcciones/delete", verificarToken, auth.eliminarDireccionUsuario);

// RESEÑAS
app.get("/api/resenas/:id_usuario", verificarToken, auth.obtenerReseñasPorUsuario);

// START
const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

// =========================================
// server.js — Servidor Principal
// =========================================

const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");

// Controladores
const reviews = require("./reviewsController.js");
const authRoutes = require("./authController.js"); // CORRECTO: ahora es un Router

const app = express();

// ========================
//  Middlewares
// ========================
app.use(cors());
app.use(express.json());

// ========================
//  Archivos estáticos
// ========================
app.use(express.static(path.join(__dirname, "../public")));

// ========================
//  Ruta de prueba
// ========================
app.get("/", (req, res) => {
    res.send("Servidor funcionando correctamente 🚀");
});

// ========================
//  RUTAS PRINCIPALES
// ========================

// 🔥 Todas las rutas del authController ahora viven aquí:
app.use("/api", authRoutes);

// ========================
//  RUTAS DE RESEÑAS (reviews)
// ========================
app.post("/api/reviews/add", reviews.crearReseña);
app.get("/api/reviews/list", reviews.obtenerReseñas);
app.get("/api/reviews/byUser/:id", reviews.reseñasPorUsuario);

// ========================
//  Servidor HTTP
// ========================

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const server = http.createServer(app);

// Manejo de errores del servidor
server.on("error", (err) => {
    console.error("❌ Error al iniciar servidor:", err.message);
});

// Iniciar servidor
server.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
});

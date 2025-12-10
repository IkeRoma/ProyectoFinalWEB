const mysql = require("mysql2");

const conexion = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "5485Roma", // tu password
  database: "prueba3"
});

conexion.connect(err => {
  if (err) console.error("❌ Error al conectar a MySQL:", err);
  else console.log("✅ Conexión a MySQL exitosa");
});

module.exports = conexion;

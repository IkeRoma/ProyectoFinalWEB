
DROP DATABASE IF EXISTS db_proyecto;
CREATE DATABASE db_proyecto;
USE db_proyecto;


CREATE TABLE aeropuertos (
    id_aeropuerto INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    ciudad VARCHAR(50),
    estado VARCHAR(50),
    activo BOOLEAN DEFAULT 1
);


CREATE TABLE IF NOT EXISTS Usuarios (
    ID INT PRIMARY KEY AUTO_INCREMENT,
    Apellido VARCHAR(50) NOT NULL,
    Nombre VARCHAR(50) NOT NULL,
    Correo VARCHAR(50) NOT NULL UNIQUE,
    Contrasena VARCHAR(255) NOT NULL,
    Telefono VARCHAR(10) NOT NULL,
    Rol TINYINT(1) NOT NULL DEFAULT 0
);


CREATE TABLE IF NOT EXISTS wallet (
    id_wallet INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    bin VARCHAR(6) NOT NULL,
    ultimos4 VARCHAR(4) NOT NULL,
    tipo VARCHAR(15) NOT NULL,
    nombre_titular VARCHAR(100) NOT NULL,
    fecha_expiracion CHAR(7) NOT NULL,
    hash_tarjeta CHAR(64) NOT NULL,
    activo BOOLEAN DEFAULT 1,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(ID)
);


CREATE TABLE IF NOT EXISTS Reseñas (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    UsuarioID INT NOT NULL,
    Reseña TEXT NOT NULL,
    Fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(ID) ON DELETE CASCADE
);


CREATE TABLE direcciones (
    id_direccion INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    calle VARCHAR(150) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    cp VARCHAR(10) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(ID) ON DELETE CASCADE
);


CREATE TABLE vuelos (
    id_vuelo INT AUTO_INCREMENT PRIMARY KEY,
    id_origen INT NOT NULL,
    id_destino INT NOT NULL,

    fecha_salida DATETIME NOT NULL,
    fecha_llegada DATETIME NOT NULL,

    escala ENUM('DIRECTO','ESCALA') DEFAULT 'DIRECTO',
    numero_escalas INT DEFAULT 0,

    activo BOOLEAN DEFAULT 1,

    FOREIGN KEY (id_origen) REFERENCES aeropuertos(id_aeropuerto) ON DELETE CASCADE,
    FOREIGN KEY (id_destino) REFERENCES aeropuertos(id_aeropuerto) ON DELETE CASCADE
);


CREATE TABLE asientos (
    id_asiento INT AUTO_INCREMENT PRIMARY KEY,
    id_vuelo INT NOT NULL,
    tipo_asiento ENUM('BASICO','REGULAR','PREMIUM') NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL,
    activo BOOLEAN DEFAULT 1,
    FOREIGN KEY (id_vuelo) REFERENCES vuelos(id_vuelo) ON DELETE CASCADE
);


CREATE TABLE equipaje (
    id_equipaje INT AUTO_INCREMENT PRIMARY KEY,
    id_vuelo INT NOT NULL,
    tipo ENUM('C','M','G','XL','XXL') NOT NULL,
    precio_extra DECIMAL(10,2) NOT NULL,
    activo BOOLEAN DEFAULT 1,
    FOREIGN KEY (id_vuelo) REFERENCES vuelos(id_vuelo) ON DELETE CASCADE
);


CREATE TABLE pedidos (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_wallet INT NOT NULL,

    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2) NOT NULL,

    estado ENUM('PENDIENTE','PAGADO','CANCELADO') DEFAULT 'PENDIENTE',

    FOREIGN KEY (id_usuario) REFERENCES Usuarios(ID) ON DELETE RESTRICT,
    FOREIGN KEY (id_wallet) REFERENCES wallet(id_wallet) ON DELETE RESTRICT
);

CREATE TABLE boletos (
    id_boleto INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_vuelo INT NOT NULL,
    id_asiento INT NOT NULL,
    id_equipaje INT DEFAULT NULL,
    id_pedido INT NOT NULL,
    
    estado ENUM('Activo', 'Usado', 'Cancelado', 'Pendiente') DEFAULT 'Activo',

    codigo_boleto VARCHAR(50) UNIQUE DEFAULT (UUID()),
    precio_total DECIMAL(10,2) NOT NULL,

    activo BOOLEAN DEFAULT 1,

    FOREIGN KEY (id_usuario) REFERENCES Usuarios(ID) ON DELETE CASCADE,
    FOREIGN KEY (id_vuelo) REFERENCES vuelos(id_vuelo) ON DELETE CASCADE,
    FOREIGN KEY (id_asiento) REFERENCES asientos(id_asiento) ON DELETE CASCADE,
    FOREIGN KEY (id_equipaje) REFERENCES equipaje(id_equipaje) ON DELETE SET NULL,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido)
);


CREATE TABLE detalles_pedido (
    id_detalle INT AUTO_INCREMENT PRIMARY KEY,

    id_pedido INT NOT NULL,
    id_vuelo INT NOT NULL,
    id_asiento INT NOT NULL,

    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    FOREIGN KEY (id_vuelo) REFERENCES vuelos(id_vuelo),
    FOREIGN KEY (id_asiento) REFERENCES asientos(id_asiento)
);


CREATE TABLE pagos (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_pedido INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('APROBADO','RECHAZADO','PENDIENTE') DEFAULT 'APROBADO',
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(ID) ON DELETE CASCADE,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE
);

CREATE TABLE envio_equipaje (
    id_envio INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_pedido INT NOT NULL,
    id_direccion INT NOT NULL,

    cantidad INT NOT NULL DEFAULT 1,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado_envio ENUM('PENDIENTE','EN_CAMINO','ENTREGADO','CANCELADO') DEFAULT 'PENDIENTE',
    costo_envio DECIMAL(10,2) DEFAULT 0.00,

    FOREIGN KEY (id_usuario) REFERENCES Usuarios(ID) ON DELETE CASCADE,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    FOREIGN KEY (id_direccion) REFERENCES direcciones(id_direccion) ON DELETE CASCADE
);

CREATE TABLE reseñas_vuelos (
    id_reseña INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_vuelo INT NOT NULL,
    id_boleto INT NULL,
    calificacion INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario TEXT,
    fecha_reseña DATETIME DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT 1,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(ID) ON DELETE CASCADE,
    FOREIGN KEY (id_vuelo) REFERENCES vuelos(id_vuelo) ON DELETE CASCADE,
    FOREIGN KEY (id_boleto) REFERENCES boletos(id_boleto) ON DELETE SET NULL
);

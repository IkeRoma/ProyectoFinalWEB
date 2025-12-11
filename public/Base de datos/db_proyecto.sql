-- Crear base de datos
CREATE DATABASE ProyectoVuelos;

USE ProyectoVuelos;

CREATE TABLE aeropuertos (
    id_aeropuerto INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,           
    ciudad VARCHAR(50),
    estado VARCHAR(50),
    activo BOOLEAN DEFAULT 1

);

CREATE TABLE usuarios (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    contrasena VARCHAR(255) NOT NULL,  -- Hasheada
    nivel ENUM('Cliente','Administrador','Empleado') 
        DEFAULT 'Cliente' NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT 1
);

CREATE TABLE direcciones (
    id_direccion INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    calle VARCHAR(150) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    cp VARCHAR(10) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE wallet (
    id_wallet INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,

    bin VARCHAR(6) NOT NULL,              -- primeros 6 dígitos
    ultimos4 VARCHAR(4) NOT NULL,         -- últimos 4 dígitos
    tipo VARCHAR(15) NOT NULL,            -- Visa o Mastercard

    nombre_titular VARCHAR(100) NOT NULL,
    fecha_expiracion CHAR(7) NOT NULL,    -- MM/AAAA

    hash_tarjeta CHAR(64) NOT NULL,       -- SHA-256 del número completo
    
    activo BOOLEAN DEFAULT 1,

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE Resenas (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    Reseña TEXT NOT NULL,
    Fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
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

    FOREIGN KEY (id_vuelo)
        REFERENCES vuelos(id_vuelo)
        ON DELETE CASCADE
);


CREATE TABLE pedidos (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_wallet INT NOT NULL,

    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2) NOT NULL,

    estado ENUM('PENDIENTE','PAGADO','CANCELADO') DEFAULT 'PENDIENTE',

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
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

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)ON DELETE CASCADE,
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

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE
);


CREATE TABLE envio_equipaje (
    id_envio INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_pedido INT NOT NULL,
    id_direccion INT NOT NULL,

    cantidad INT NOT NULL DEFAULT 1,  -- NUEVO CAMPO: número de piezas de equipaje a enviar

    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado_envio ENUM('PENDIENTE','EN_CAMINO','ENTREGADO','CANCELADO') DEFAULT 'PENDIENTE',

    costo_envio DECIMAL(10,2) DEFAULT 0.00,

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    FOREIGN KEY (id_direccion) REFERENCES direcciones(id_direccion) ON DELETE CASCADE
);



CREATE TABLE reseñas_vuelos (
    id_reseña INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,
    id_vuelo INT NOT NULL,
    id_boleto INT NULL,   -- Para validar que realmente viajó (opcional)

    calificacion INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario TEXT,
    fecha_reseña DATETIME DEFAULT CURRENT_TIMESTAMP,

    activo BOOLEAN DEFAULT 1,

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_vuelo) REFERENCES vuelos(id_vuelo) ON DELETE CASCADE,
    FOREIGN KEY (id_boleto) REFERENCES boletos(id_boleto) ON DELETE SET NULL
);




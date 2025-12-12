/* ============================================================
   CREACIÓN DE BASE DE DATOS
============================================================ */

DROP DATABASE IF EXISTS db_proyecto;
CREATE DATABASE db_proyecto;
USE db_proyecto;


/* ============================================================
   TABLAS DEL PROYECTO (SIN CAMBIOS ESTRUCTURALES)
============================================================ */

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

CREATE TABLE tipos_maleta (
    id_tipo_maleta INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    peso_max DECIMAL(5,2) NOT NULL,
    precio_base DECIMAL(10,2) NOT NULL,
    tarifa_kg_extra DECIMAL(10,2) NOT NULL
);

INSERT INTO tipos_maleta (nombre, peso_max, precio_base, tarifa_kg_extra) VALUES
('Pequeña', 10, 200, 25),
('Mediana', 20, 300, 25),
('Grande', 30, 400, 25),
('XL', 45, 550, 25);


/* ============================================================
   AEROPUERTOS – SIN TRUNCATE, SOLO BORRAMOS E INSERTAMOS
============================================================ */

DELETE FROM aeropuertos;
ALTER TABLE aeropuertos AUTO_INCREMENT = 1;

INSERT INTO aeropuertos (nombre, ciudad, estado) VALUES
('Aeropuerto de Aguascalientes', 'Aguascalientes', 'Aguascalientes'),
('Aeropuerto Internacional de Tijuana', 'Tijuana', 'Baja California'),
('Aeropuerto Internacional de La Paz', 'La Paz', 'Baja California Sur'),
('Aeropuerto Internacional de Campeche', 'Campeche', 'Campeche'),
('Aeropuerto Internacional de Saltillo', 'Saltillo', 'Coahuila'),
('Aeropuerto de Colima', 'Colima', 'Colima'),
('Aeropuerto Internacional Ángel Albino Corzo', 'Tuxtla Gutiérrez', 'Chiapas'),
('Aeropuerto Internacional de Chihuahua', 'Chihuahua', 'Chihuahua'),
('Aeropuerto Internacional de la Ciudad de México', 'CDMX', 'Ciudad de México'),
('Aeropuerto Internacional de Durango', 'Durango', 'Durango'),
('Aeropuerto Internacional de Guanajuato', 'León', 'Guanajuato'),
('Aeropuerto Internacional de Acapulco', 'Acapulco', 'Guerrero'),
('Aeropuerto Internacional de Pachuca', 'Pachuca', 'Hidalgo'),
('Aeropuerto Internacional de Guadalajara', 'Guadalajara', 'Jalisco'),
('Aeropuerto Internacional de Toluca', 'Toluca', 'Estado de México'),
('Aeropuerto Internacional de Morelia', 'Morelia', 'Michoacán'),
('Aeropuerto de Cuernavaca', 'Cuernavaca', 'Morelos'),
('Aeropuerto Internacional de Tepic', 'Tepic', 'Nayarit'),
('Aeropuerto Internacional de Monterrey', 'Monterrey', 'Nuevo León'),
('Aeropuerto Internacional de Oaxaca', 'Oaxaca', 'Oaxaca'),
('Aeropuerto Internacional de Puebla', 'Puebla', 'Puebla'),
('Aeropuerto Intercontinental de Querétaro', 'Querétaro', 'Querétaro'),
('Aeropuerto Internacional de Cancún', 'Cancún', 'Quintana Roo'),
('Aeropuerto Internacional de San Luis Potosí', 'San Luis Potosí', 'San Luis Potosí'),
('Aeropuerto Internacional de Culiacán', 'Culiacán', 'Sinaloa'),
('Aeropuerto Internacional de Hermosillo', 'Hermosillo', 'Sonora'),
('Aeropuerto Internacional de Villahermosa', 'Villahermosa', 'Tabasco'),
('Aeropuerto Internacional de Ciudad Victoria', 'Ciudad Victoria', 'Tamaulipas'),
('Aeropuerto de Tlaxcala', 'Tlaxcala', 'Tlaxcala'),
('Aeropuerto Internacional de Veracruz', 'Veracruz', 'Veracruz'),
('Aeropuerto Internacional de Mérida', 'Mérida', 'Yucatán'),
('Aeropuerto Internacional de Zacatecas', 'Zacatecas', 'Zacatecas');


/* ============================================================
   LIMPIEZA SEGURA DE VUELOS, ASIENTOS, EQUIPAJE
============================================================ */

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM equipaje;
DELETE FROM asientos;
DELETE FROM vuelos;

ALTER TABLE vuelos AUTO_INCREMENT = 1;
ALTER TABLE asientos AUTO_INCREMENT = 1;
ALTER TABLE equipaje AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;


/* ============================================================
   INSERT – VUELOS MÁS CONCURRIDOS DE MÉXICO
============================================================ */

INSERT INTO vuelos (
    id_origen, id_destino,
    fecha_salida, fecha_llegada,
    escala, numero_escalas, activo
) VALUES
    -- CDMX -> Cancún
    (9, 23, '2025-03-10 08:00:00', '2025-03-10 10:10:00', 'DIRECTO', 0, 1),

    -- Cancún -> CDMX
    (23, 9, '2025-03-10 12:00:00', '2025-03-10 14:10:00', 'DIRECTO', 0, 1),

    -- CDMX -> Monterrey
    (9, 19, '2025-03-10 07:00:00', '2025-03-10 08:35:00', 'DIRECTO', 0, 1),

    -- Monterrey -> CDMX
    (19, 9, '2025-03-10 18:00:00', '2025-03-10 19:35:00', 'DIRECTO', 0, 1),

    -- CDMX -> Guadalajara
    (9, 14, '2025-03-11 09:00:00', '2025-03-11 10:15:00', 'DIRECTO', 0, 1),

    -- Guadalajara -> CDMX
    (14, 9, '2025-03-11 17:00:00', '2025-03-11 18:15:00', 'DIRECTO', 0, 1);


/* ============================================================
   INSERT – ASIENTOS (BÁSICO – REGULAR – PREMIUM)
============================================================ */

INSERT INTO asientos (id_vuelo, tipo_asiento, precio, stock, activo) VALUES
    (1,'BASICO',3120,40,1),(1,'REGULAR',3900,24,1),(1,'PREMIUM',4990,12,1),
    (2,'BASICO',3120,40,1),(2,'REGULAR',3900,24,1),(2,'PREMIUM',4990,12,1),
    (3,'BASICO',2280,40,1),(3,'REGULAR',2850,24,1),(3,'PREMIUM',3650,12,1),
    (4,'BASICO',2280,40,1),(4,'REGULAR',2850,24,1),(4,'PREMIUM',3650,12,1),
    (5,'BASICO',1800,40,1),(5,'REGULAR',2250,24,1),(5,'PREMIUM',2880,12,1),
    (6,'BASICO',1800,40,1),(6,'REGULAR',2250,24,1),(6,'PREMIUM',2880,12,1);


/* ============================================================
   INSERT – EQUIPAJE
============================================================ */

INSERT INTO equipaje (id_vuelo, tipo, precio_extra, activo) VALUES
    (1,'C',0,1),(1,'M',350,1),(1,'G',550,1),(1,'XL',750,1),(1,'XXL',950,1),
    (2,'C',0,1),(2,'M',350,1),(2,'G',550,1),(2,'XL',750,1),(2,'XXL',950,1),
    (3,'C',0,1),(3,'M',350,1),(3,'G',550,1),(3,'XL',750,1),(3,'XXL',950,1),
    (4,'C',0,1),(4,'M',350,1),(4,'G',550,1),(4,'XL',750,1),(4,'XXL',950,1),
    (5,'C',0,1),(5,'M',350,1),(5,'G',550,1),(5,'XL',750,1),(5,'XXL',950,1),
    (6,'C',0,1),(6,'M',350,1),(6,'G',550,1),(6,'XL',750,1),(6,'XXL',950,1);

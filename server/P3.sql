CREATE DATABASE prueba3;
USE prueba3;

CREATE TABLE Usuarios (
    ID INT PRIMARY KEY AUTO_INCREMENT,
    Apellido VARCHAR(50) NOT NULL,
    Nombre VARCHAR(50) NOT NULL,
    Correo VARCHAR(50) NOT NULL UNIQUE,
    Contrasena VARCHAR(255) NOT NULL,
    Telefono VARCHAR(10) NOT NULL,
    Rol TINYINT(1) NOT NULL DEFAULT 0, -- 0 = normal, 1 = admin
    CONSTRAINT chk_Correo_Extension CHECK (Correo LIKE '%@%')
);

CREATE TABLE Reseñas (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    UsuarioID INT NOT NULL,
    Reseña TEXT NOT NULL,
    Fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(ID) ON DELETE CASCADE
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

    FOREIGN KEY (id_usuario) REFERENCES Usuarios(ID)
);


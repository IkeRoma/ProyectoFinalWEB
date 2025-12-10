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

INSERT INTO Usuarios (Apellido, Nombre, Correo, Contrasena, Telefono) VALUES
('Hernández', 'Carlos', 'carlos.hernandez@gmail.com', 'Abc123!@#Def456', '5544332211'),
('García', 'Ana', 'ana.garcia@hotmail.com', 'Xyz789$%^Ghij01', '5533221100'),
('López', 'Miguel', 'miguel.lopez@yahoo.com', 'Mno456&*()Pqrs34', '5566778899'),
('Martínez', 'Sofía', 'sofia.martinez@outlook.com', 'Qwe123!@#Rty456', '5511223344'),
('Rodríguez', 'José', 'jose.rodriguez@gmail.com', 'Zxc987$%^Vbn654', '5599887766'),
('Pérez', 'María', 'maria.perez@hotmail.com', 'Asd234!@#Fgh567', '5588776655'),
('Gómez', 'Juan', 'juan.gomez@yahoo.com', 'Hjk345&*()Lop678', '5577665544'),
('Sánchez', 'Lucía', 'lucia.sanchez@outlook.com', 'Rty456!@#Uio789', '5566554433'),
('Ramírez', 'David', 'david.ramirez@gmail.com', 'Fgh567$%^Vbn890', '5544221133'),
('Torres', 'Valeria', 'valeria.torres@hotmail.com', 'Uio678!@#Asd901', '5533112244');
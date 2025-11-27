-- Script de inicialización de base de datos MySQL
-- Se ejecuta automáticamente al iniciar el contenedor Docker

-- Crear base de datos para Perú
CREATE DATABASE IF NOT EXISTS medical_appointments_pe;

-- Crear base de datos para Chile
CREATE DATABASE IF NOT EXISTS medical_appointments_cl;

-- Tabla de citas para Perú
USE medical_appointments_pe;

CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(36) PRIMARY KEY,
    insured_id VARCHAR(5) NOT NULL,
    schedule_id INT NOT NULL,
    country_iso VARCHAR(2) NOT NULL DEFAULT 'PE',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_insured_id (insured_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de citas para Chile
USE medical_appointments_cl;

CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(36) PRIMARY KEY,
    insured_id VARCHAR(5) NOT NULL,
    schedule_id INT NOT NULL,
    country_iso VARCHAR(2) NOT NULL DEFAULT 'CL',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_insured_id (insured_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permisos para el usuario admin
GRANT ALL PRIVILEGES ON medical_appointments_pe.* TO 'admin'@'%';
GRANT ALL PRIVILEGES ON medical_appointments_cl.* TO 'admin'@'%';
FLUSH PRIVILEGES;

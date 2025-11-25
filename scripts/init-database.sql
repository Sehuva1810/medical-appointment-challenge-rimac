-- =============================================================================
-- Medical Appointments Database Schema
-- For RDS MySQL - Separate databases per country as shown in diagram
-- =============================================================================

-- =============================================================================
-- PERU DATABASE (mysql_pe)
-- =============================================================================
CREATE DATABASE IF NOT EXISTS medical_appointments_pe
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE medical_appointments_pe;

-- Appointments Table for Peru
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id VARCHAR(36) NOT NULL UNIQUE,
    insured_id VARCHAR(5) NOT NULL,
    schedule_id INT NOT NULL,
    country_iso CHAR(2) NOT NULL DEFAULT 'PE',
    status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'completed',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_insured_id (insured_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- CHILE DATABASE (mysql_cl)
-- =============================================================================
CREATE DATABASE IF NOT EXISTS medical_appointments_cl
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE medical_appointments_cl;

-- Appointments Table for Chile
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id VARCHAR(36) NOT NULL UNIQUE,
    insured_id VARCHAR(5) NOT NULL,
    schedule_id INT NOT NULL,
    country_iso CHAR(2) NOT NULL DEFAULT 'CL',
    status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'completed',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_insured_id (insured_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Sample Data for Testing (Optional)
-- =============================================================================

-- Peru test data
USE medical_appointments_pe;
INSERT INTO appointments (appointment_id, insured_id, schedule_id, country_iso, status) VALUES
('test-pe-001', '00001', 100, 'PE', 'completed'),
('test-pe-002', '00002', 101, 'PE', 'completed');

-- Chile test data
USE medical_appointments_cl;
INSERT INTO appointments (appointment_id, insured_id, schedule_id, country_iso, status) VALUES
('test-cl-001', '00003', 200, 'CL', 'completed'),
('test-cl-002', '00004', 201, 'CL', 'completed');

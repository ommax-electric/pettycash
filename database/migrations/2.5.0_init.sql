-- Migration 2.5.0: Initial Version Schema Baseline
CREATE TABLE IF NOT EXISTS `app_info` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `app_version` VARCHAR(50) NOT NULL,
    `installer_version` VARCHAR(50) NOT NULL,
    `database_version` VARCHAR(50) NOT NULL,
    `installed_at` DATETIME NOT NULL,
    `last_updated_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `application_info` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `app_version` VARCHAR(50) NOT NULL,
    `installer_version` VARCHAR(50) NOT NULL,
    `database_version` VARCHAR(50) NOT NULL,
    `installed_at` DATETIME NOT NULL,
    `last_updated_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `schema_migrations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `migration` VARCHAR(255) NOT NULL UNIQUE,
    `batch` INT NOT NULL DEFAULT 1,
    `executed_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

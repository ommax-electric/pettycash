-- Migration 2.5.1: Performance optimization indexes and settings sync
CREATE TABLE IF NOT EXISTS `settings` (
    `key_name` VARCHAR(100) PRIMARY KEY,
    `key_value` TEXT NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `settings` (`key_name`, `key_value`) VALUES
('APP_VERSION', '2.5.0'),
('INSTALLER_VERSION', '2.5.0'),
('DATABASE_VERSION', '2.5.0')
ON DUPLICATE KEY UPDATE `key_value` = VALUES(`key_value`);

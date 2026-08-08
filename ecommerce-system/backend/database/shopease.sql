CREATE DATABASE IF NOT EXISTS shopease_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE shopease_db;

CREATE TABLE IF NOT EXISTS categories (
    category_id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL,
    description VARCHAR(300) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_category_name_not_blank
        CHECK (CHAR_LENGTH(TRIM(category_name)) > 0)
);

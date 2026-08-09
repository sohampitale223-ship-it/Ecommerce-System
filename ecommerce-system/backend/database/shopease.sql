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

CREATE TABLE IF NOT EXISTS products (
    product_id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(150) NOT NULL,
    description VARCHAR(500) NULL,
    price DECIMAL(10,2) NOT NULL,
    `SKU` VARCHAR(50) NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    inventory_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_products_sku UNIQUE (`SKU`),
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id),
    CONSTRAINT chk_product_name_not_blank
        CHECK (CHAR_LENGTH(TRIM(product_name)) > 0),
    CONSTRAINT chk_product_price_nonnegative
        CHECK (price >= 0)
);

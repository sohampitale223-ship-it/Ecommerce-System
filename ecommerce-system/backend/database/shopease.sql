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

CREATE TABLE IF NOT EXISTS orders (
    order_id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    order_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    shipping_address VARCHAR(300) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    INDEX idx_orders_user_id (user_id),
    INDEX idx_orders_status_created (order_status, created_at),
    CONSTRAINT chk_order_total_nonnegative CHECK (total_amount >= 0),
    CONSTRAINT chk_order_status CHECK (order_status IN ('Pending', 'Shipped', 'Delivered', 'Cancelled')),
    CONSTRAINT chk_shipping_address_not_blank CHECK (CHAR_LENGTH(TRIM(shipping_address)) > 0)
);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT uq_order_items_order_product UNIQUE (order_id, product_id),
    CONSTRAINT chk_order_item_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_order_item_prices_nonnegative CHECK (unit_price >= 0 AND subtotal >= 0)
);

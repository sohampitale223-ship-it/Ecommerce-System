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

CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_user_first_name_not_blank CHECK (CHAR_LENGTH(TRIM(first_name)) > 0),
    CONSTRAINT chk_user_last_name_not_blank CHECK (CHAR_LENGTH(TRIM(last_name)) > 0),
    CONSTRAINT chk_user_email_not_blank CHECK (CHAR_LENGTH(TRIM(email)) > 0),
    CONSTRAINT chk_user_phone_not_blank CHECK (CHAR_LENGTH(TRIM(phone)) > 0)
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
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
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

CREATE TABLE IF NOT EXISTS payments (
    payment_id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    order_id INT UNSIGNED NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Paid',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_payments_order_id (order_id),
    INDEX idx_payments_status (payment_status),
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_payment_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_payment_method CHECK (payment_method IN ('Card', 'PayPal', 'Bank Transfer')),
    CONSTRAINT chk_payment_status CHECK (payment_status IN ('Paid', 'Failed', 'Refunded'))
);

CREATE TABLE IF NOT EXISTS payment_status_history (
    history_id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    payment_id INT UNSIGNED NOT NULL,
    previous_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_payment_history_payment (payment_id),
    CONSTRAINT fk_payment_history_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_payment_history_previous CHECK (previous_status IS NULL OR previous_status IN ('Paid', 'Failed', 'Refunded')),
    CONSTRAINT chk_payment_history_new CHECK (new_status IN ('Paid', 'Failed', 'Refunded'))
);

import dotenv from 'dotenv'

dotenv.config()
const { default: pool } = await import('../config/db.js')

try {
  const [productKey] = await pool.execute(`
    SELECT COLUMN_TYPE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'product_id'
  `)
  if (productKey.length !== 1 || !productKey[0].COLUMN_TYPE.startsWith('int')) {
    throw new Error(`Expected products.product_id to be an INT; found ${productKey[0]?.COLUMN_TYPE || 'missing'}.`)
  }
  const productIdType = productKey[0].COLUMN_TYPE.includes('unsigned') ? 'INT UNSIGNED' : 'INT'

  await pool.execute(`
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
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      order_item_id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      order_id INT UNSIGNED NOT NULL,
      product_id ${productIdType} NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
      CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(product_id),
      CONSTRAINT uq_order_items_order_product UNIQUE (order_id, product_id),
      CONSTRAINT chk_order_item_quantity_positive CHECK (quantity > 0),
      CONSTRAINT chk_order_item_prices_nonnegative CHECK (unit_price >= 0 AND subtotal >= 0)
    )
  `)
  console.log('Order migration completed successfully.')
} finally {
  await pool.end()
}

import dotenv from 'dotenv'

dotenv.config()
const { default: pool } = await import('../config/db.js')

try {
  const [keyColumns] = await pool.execute(`
    SELECT TABLE_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND (TABLE_NAME = 'users' AND COLUMN_NAME = 'user_id'
        OR TABLE_NAME = 'products' AND COLUMN_NAME = 'product_id')
  `)
  const userKey = keyColumns.find((column) => column.TABLE_NAME === 'users')
  const productKey = keyColumns.find((column) => column.TABLE_NAME === 'products')
  if (!userKey?.COLUMN_TYPE.startsWith('int') || !productKey?.COLUMN_TYPE.startsWith('int')) {
    throw new Error('Expected users.user_id and products.product_id to be INT columns.')
  }
  const customerIdType = userKey.COLUMN_TYPE.includes('unsigned') ? 'INT UNSIGNED' : 'INT'
  const productIdType = productKey.COLUMN_TYPE.includes('unsigned') ? 'INT UNSIGNED' : 'INT'

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS carts (
      cart_id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      customer_id ${customerIdType} NOT NULL,
      product_id ${productIdType} NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_carts_customer_id (customer_id),
      INDEX idx_carts_product_id (product_id),
      CONSTRAINT uq_carts_customer_product UNIQUE (customer_id, product_id),
      CONSTRAINT fk_carts_customer FOREIGN KEY (customer_id) REFERENCES users(user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT fk_carts_product FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT chk_cart_quantity_positive CHECK (quantity > 0),
      CONSTRAINT chk_cart_total_nonnegative CHECK (total_price >= 0)
    )
  `)
  console.log('Cart migration completed successfully.')
} finally {
  await pool.end()
}

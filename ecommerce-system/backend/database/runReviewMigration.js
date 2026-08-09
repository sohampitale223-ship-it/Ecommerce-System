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
  const [existing] = await pool.execute(`
    SELECT COUNT(*) AS table_count FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews'
  `)
  if (Number(existing[0].table_count) === 0) {
    await pool.execute(`
      CREATE TABLE reviews (
        review_id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        product_id ${productIdType} NOT NULL,
        customer_id ${customerIdType} NOT NULL,
        rating INT NOT NULL,
        review_text VARCHAR(1000) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        status BOOLEAN NOT NULL DEFAULT FALSE,
        CONSTRAINT uq_reviews_customer_product UNIQUE (customer_id, product_id),
        INDEX idx_reviews_product_id (product_id),
        INDEX idx_reviews_customer_id (customer_id),
        INDEX idx_reviews_status (status),
        CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(product_id)
          ON UPDATE RESTRICT ON DELETE RESTRICT,
        CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id) REFERENCES users(user_id)
          ON UPDATE RESTRICT ON DELETE RESTRICT,
        CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
        CONSTRAINT chk_review_text_not_blank CHECK (CHAR_LENGTH(TRIM(review_text)) > 0)
      )
    `)
    console.log('Review migration completed successfully.')
  } else {
    console.log('Reviews table already exists; no schema changes were made.')
  }
} finally {
  await pool.end()
}

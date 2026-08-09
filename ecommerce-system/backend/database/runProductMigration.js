import dotenv from 'dotenv'

dotenv.config()
const { default: pool } = await import('../config/db.js')

try {
  const [categoryKey] = await pool.execute(`
    SELECT COLUMN_TYPE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'category_id'
  `)
  if (categoryKey.length !== 1 || !categoryKey[0].COLUMN_TYPE.startsWith('int')) {
    throw new Error(`Expected categories.category_id to be an INT; found ${categoryKey[0]?.COLUMN_TYPE || 'missing'}.`)
  }

  const categoryIdType = categoryKey[0].COLUMN_TYPE.includes('unsigned') ? 'INT UNSIGNED' : 'INT'

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS products (
      product_id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      product_name VARCHAR(150) NOT NULL,
      description VARCHAR(500) NULL,
      price DECIMAL(10,2) NOT NULL,
      \`SKU\` VARCHAR(50) NOT NULL,
      category_id ${categoryIdType} NOT NULL,
      inventory_count INT UNSIGNED NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      status BOOLEAN NOT NULL DEFAULT TRUE,
      CONSTRAINT uq_products_sku UNIQUE (\`SKU\`),
      CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(category_id),
      CONSTRAINT chk_product_name_not_blank CHECK (CHAR_LENGTH(TRIM(product_name)) > 0),
      CONSTRAINT chk_product_price_nonnegative CHECK (price >= 0)
    )
  `)
  console.log('Product migration completed successfully.')
} finally {
  await pool.end()
}

import dotenv from 'dotenv'
dotenv.config()
const { default: pool } = await import('../config/db.js')

const columnExists = async (table, column) => {
  const [rows] = await pool.execute('SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?', [table, column])
  return rows.length > 0
}
try {
  await pool.execute(`CREATE TABLE IF NOT EXISTS coupons (
    coupon_id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    coupon_code VARCHAR(50) NOT NULL UNIQUE,
    discount_type ENUM('Percentage','Fixed') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    valid_from DATETIME NOT NULL, valid_to DATETIME NOT NULL,
    usage_limit INT UNSIGNED NOT NULL, used_count INT UNSIGNED NOT NULL DEFAULT 0,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_coupons_status_dates (status, valid_from, valid_to),
    CONSTRAINT chk_coupon_value CHECK (discount_value > 0 AND (discount_type <> 'Percentage' OR discount_value <= 100)),
    CONSTRAINT chk_coupon_dates CHECK (valid_to > valid_from),
    CONSTRAINT chk_coupon_usage CHECK (usage_limit > 0 AND used_count <= usage_limit)
  )`)
  if (!await columnExists('orders', 'coupon_id')) await pool.execute('ALTER TABLE orders ADD COLUMN coupon_id INT UNSIGNED NULL AFTER user_id, ADD INDEX idx_orders_coupon_id (coupon_id), ADD CONSTRAINT fk_orders_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(coupon_id) ON UPDATE RESTRICT ON DELETE RESTRICT')
  if (!await columnExists('orders', 'subtotal_amount')) await pool.execute('ALTER TABLE orders ADD COLUMN subtotal_amount DECIMAL(10,2) NULL AFTER coupon_id')
  if (!await columnExists('orders', 'discount_amount')) await pool.execute('ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER subtotal_amount')
  await pool.execute('UPDATE orders SET subtotal_amount = total_amount WHERE subtotal_amount IS NULL')
  console.log('Coupon migration completed successfully.')
} finally { await pool.end() }

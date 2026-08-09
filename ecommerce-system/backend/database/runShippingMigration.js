import dotenv from 'dotenv'

dotenv.config()
const { default: pool } = await import('../config/db.js')

try {
  const [orderKey] = await pool.execute(`
    SELECT COLUMN_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'order_id'
  `)
  if (orderKey.length !== 1 || !orderKey[0].COLUMN_TYPE.startsWith('int')) {
    throw new Error(`Expected orders.order_id to be an INT; found ${orderKey[0]?.COLUMN_TYPE || 'missing'}.`)
  }
  const orderIdType = orderKey[0].COLUMN_TYPE.includes('unsigned') ? 'INT UNSIGNED' : 'INT'
  const [existing] = await pool.execute(`
    SELECT COUNT(*) AS table_count FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shipping'
  `)

  if (Number(existing[0].table_count) === 0) {
    await pool.execute(`
      CREATE TABLE shipping (
        shipping_id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        order_id ${orderIdType} NOT NULL,
        courier_service VARCHAR(100) NOT NULL,
        tracking_number VARCHAR(100) NULL,
        shipping_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
        shipping_cost DECIMAL(10,2) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT uq_shipping_order UNIQUE (order_id),
        CONSTRAINT uq_shipping_tracking UNIQUE (tracking_number),
        INDEX idx_shipping_status (shipping_status),
        CONSTRAINT fk_shipping_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
          ON UPDATE RESTRICT ON DELETE RESTRICT,
        CONSTRAINT chk_shipping_cost_nonnegative CHECK (shipping_cost >= 0),
        CONSTRAINT chk_shipping_status CHECK (shipping_status IN ('Pending', 'Shipped', 'In Transit', 'Delivered')),
        CONSTRAINT chk_courier_service_not_blank CHECK (CHAR_LENGTH(TRIM(courier_service)) > 0)
      )
    `)
    console.log('Shipping migration completed successfully.')
  } else {
    console.log('Shipping table already exists; no schema changes were made.')
  }
} finally {
  await pool.end()
}

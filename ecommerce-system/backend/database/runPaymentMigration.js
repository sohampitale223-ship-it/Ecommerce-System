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

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      order_id ${orderIdType} NOT NULL,
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
    )
  `)

  await pool.execute(`
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
    )
  `)
  console.log('Payment migration completed successfully.')
} finally {
  await pool.end()
}

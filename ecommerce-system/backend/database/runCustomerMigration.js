import dotenv from 'dotenv'

dotenv.config()
const { default: pool } = await import('../config/db.js')

try {
  await pool.execute(`
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
    )
  `)

  const [columns] = await pool.execute(`
    SELECT TABLE_NAME, COLUMN_TYPE, IS_NULLABLE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'user_id' AND TABLE_NAME IN ('users', 'orders')
  `)
  const usersColumn = columns.find((column) => column.TABLE_NAME === 'users')
  const ordersColumn = columns.find((column) => column.TABLE_NAME === 'orders')

  if (!ordersColumn) {
    console.log('Users table created. Foreign key skipped because orders.user_id does not exist.')
  } else if (ordersColumn.IS_NULLABLE !== 'YES') {
    console.log('Users table created. Foreign key skipped because orders.user_id is not nullable; guest compatibility needs review.')
  } else if (ordersColumn.COLUMN_TYPE !== usersColumn.COLUMN_TYPE) {
    console.log(`Users table created. Foreign key skipped because user ID types differ (${ordersColumn.COLUMN_TYPE} vs ${usersColumn.COLUMN_TYPE}).`)
  } else {
    const [orphans] = await pool.execute(`
      SELECT COUNT(*) AS orphan_count
      FROM orders o LEFT JOIN users u ON u.user_id = o.user_id
      WHERE o.user_id IS NOT NULL AND u.user_id IS NULL
    `)
    const [foreignKeys] = await pool.execute(`
      SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
        AND COLUMN_NAME = 'user_id' AND REFERENCED_TABLE_NAME IS NOT NULL
    `)

    if (Number(orphans[0].orphan_count) > 0) {
      console.log(`Users table created. Foreign key skipped safely: ${orphans[0].orphan_count} existing order(s) reference missing users.`)
    } else if (foreignKeys.length === 0) {
      await pool.execute(`
        ALTER TABLE orders ADD CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
      `)
      console.log('Customer migration completed; nullable orders.user_id foreign key added safely.')
    } else if (foreignKeys.some((key) => key.REFERENCED_TABLE_NAME === 'users' && key.REFERENCED_COLUMN_NAME === 'user_id')) {
      console.log('Customer migration completed; the orders-to-users foreign key already exists.')
    } else {
      console.log('Users table created. Foreign key skipped because orders.user_id already has a different foreign key.')
    }
  }
} finally {
  await pool.end()
}

import mysql from 'mysql2/promise'

const sslCa = process.env.DB_SSL_CA?.replace(/\\n/g, '\n').trim()

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ...(sslCa ? { ca: sslCa } : {}),
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
})

export const testDatabaseConnection = async () => {
  const connection = await pool.getConnection()

  try {
    await connection.ping()
    console.log('MySQL database connected successfully')
  } finally {
    connection.release()
  }
}

export default pool

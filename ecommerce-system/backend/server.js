import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const { default: categoryRoutes } = await import('./routes/categoryRoutes.js')
const { default: productRoutes } = await import('./routes/productRoutes.js')
const { testDatabaseConnection } = await import('./config/db.js')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use('/api/categories', categoryRoutes)
app.use('/api/products', productRoutes)

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ShopEase Ecommerce API is running',
  })
})

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Frontend and backend connection successful',
  })
})

app.listen(PORT, async () => {
  console.log(`ShopEase server is running on http://localhost:${PORT}`)
  try {
    await testDatabaseConnection()
  } catch (error) {
    console.error('Unable to connect to MySQL. Check the database service and environment configuration.')
  }
})

import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import CategoryDashboard from './pages/categories/CategoryDashboard'
import ProductDashboard from './pages/products/ProductDashboard'
import OrderDashboard from './pages/orders/OrderDashboard'
import CustomerDashboard from './pages/customers/CustomerDashboard'
import PaymentDashboard from './pages/payments/PaymentDashboard'
import CartDashboard from './pages/carts/CartDashboard'
import WishlistDashboard from './pages/wishlists/WishlistDashboard'
import ShippingDashboard from './pages/shipping/ShippingDashboard'
import ReviewDashboard from './pages/reviews/ReviewDashboard'
import CouponDashboard from './pages/coupons/CouponDashboard'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/categories" element={<CategoryDashboard />} />
          <Route path="/products" element={<ProductDashboard />} />
          <Route path="/orders" element={<OrderDashboard />} />
          <Route path="/customers" element={<CustomerDashboard />} />
          <Route path="/payments" element={<PaymentDashboard />} />
          <Route path="/carts" element={<CartDashboard />} />
          <Route path="/wishlists" element={<WishlistDashboard />} />
          <Route path="/shipping" element={<ShippingDashboard />} />
          <Route path="/reviews" element={<ReviewDashboard />} />
          <Route path="/coupons" element={<CouponDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App

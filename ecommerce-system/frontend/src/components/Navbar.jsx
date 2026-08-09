import { NavLink } from 'react-router-dom'

function Navbar() {
  const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`

  return (
    <nav className="navbar navbar-expand-md navbar-dark bg-primary shadow-sm">
      <div className="container">
        <NavLink className="navbar-brand fw-bold" to="/">
          ShopEase
        </NavLink>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="mainNavbar">
          <div className="navbar-nav ms-auto">
            <NavLink className={linkClass} to="/">Home</NavLink>
            <NavLink className={linkClass} to="/categories">Categories</NavLink>
            <NavLink className={linkClass} to="/products">Products</NavLink>
            <NavLink className={linkClass} to="/orders">Orders</NavLink>
            <NavLink className={linkClass} to="/login">Login</NavLink>
            <NavLink className={linkClass} to="/register">Register</NavLink>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

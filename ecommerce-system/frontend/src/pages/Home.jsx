import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBackendStatus } from '../services/api'

function Home() {
  const [backendMessage, setBackendMessage] = useState('Checking backend connection...')
  const [isConnected, setIsConnected] = useState(null)

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await getBackendStatus()
        setBackendMessage(response.data.message)
        setIsConnected(true)
      } catch (error) {
        console.error('Backend connection failed:', error.message)
        setBackendMessage('Backend server is currently unavailable.')
        setIsConnected(false)
      }
    }

    checkBackend()
  }, [])

  return (
    <section className="hero-section py-5">
      <div className="container text-center text-md-start">
        <div className="row align-items-center justify-content-between g-5">
          <div className="col-md-7 col-lg-6">
            <span className="badge rounded-pill text-bg-primary mb-3">Welcome to ShopEase</span>
            <h1 className="hero-title text-primary mb-3">ShopEase</h1>
            <p className="fs-4 fw-medium mb-3">Everything you need, made easy.</p>
            <p className="lead text-secondary mb-4">
              ShopEase is a simple e-commerce platform designed to make discovering and
              shopping for products convenient, reliable, and enjoyable.
            </p>
            <Link className="btn btn-primary btn-lg px-4" to="/">Explore Products</Link>
          </div>
          <div className="col-md-5">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4 p-lg-5">
                <h2 className="h5 mb-3">Backend Status</h2>
                <div className={`alert mb-0 ${isConnected === false ? 'alert-danger' : 'alert-info'}`} role="status">
                  {backendMessage}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Home

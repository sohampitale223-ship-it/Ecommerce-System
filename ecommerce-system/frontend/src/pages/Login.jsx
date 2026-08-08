function Login() {
  return (
    <section className="container py-5 d-flex justify-content-center">
      <div className="card form-card border-0 shadow-sm">
        <div className="card-body p-4 p-md-5">
          <h1 className="h2 text-center mb-4">Login</h1>
          <form>
            <div className="mb-3">
              <label className="form-label" htmlFor="loginEmail">Email</label>
              <input className="form-control" id="loginEmail" type="email" placeholder="name@example.com" required />
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="loginPassword">Password</label>
              <input className="form-control" id="loginPassword" type="password" required />
            </div>
            <button className="btn btn-primary w-100" type="submit">Login</button>
          </form>
        </div>
      </div>
    </section>
  )
}

export default Login

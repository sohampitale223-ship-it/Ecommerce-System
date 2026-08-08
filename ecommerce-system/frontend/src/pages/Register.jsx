function Register() {
  return (
    <section className="container py-5 d-flex justify-content-center">
      <div className="card form-card border-0 shadow-sm">
        <div className="card-body p-4 p-md-5">
          <h1 className="h2 text-center mb-4">Create an Account</h1>
          <form>
            <div className="mb-3">
              <label className="form-label" htmlFor="fullName">Full Name</label>
              <input className="form-control" id="fullName" type="text" required />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="registerEmail">Email</label>
              <input className="form-control" id="registerEmail" type="email" placeholder="name@example.com" required />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="registerPassword">Password</label>
              <input className="form-control" id="registerPassword" type="password" required />
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <input className="form-control" id="confirmPassword" type="password" required />
            </div>
            <button className="btn btn-primary w-100" type="submit">Register</button>
          </form>
        </div>
      </div>
    </section>
  )
}

export default Register

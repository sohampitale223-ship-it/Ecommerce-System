import { useState } from 'react'
import { createCustomer } from '../services/customerService'

const initialForm = { first_name: '', last_name: '', email: '', phone: '' }
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+?[0-9][0-9\s()-]{6,14}$/

function Register() {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const change = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  const submit = async (event) => {
    event.preventDefault()
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]))
    if (Object.values(payload).some((value) => !value)) return setError('All fields are required.')
    if (!emailPattern.test(payload.email) || payload.email.length > 100) return setError('Enter a valid email address.')
    if (!phonePattern.test(payload.phone) || payload.phone.length > 15) return setError('Enter a valid phone number between 7 and 15 characters.')
    setSaving(true); setError(''); setSuccess('')
    try {
      await createCustomer(payload)
      setSuccess('Customer profile created successfully. Secure login is not available yet.')
      setForm(initialForm)
    } catch (requestError) {
      setError(!requestError.response ? 'Backend server is currently unavailable.' : requestError.response.data?.message || 'Registration failed.')
    } finally { setSaving(false) }
  }

  return <section className="container py-5 d-flex justify-content-center"><div className="card form-card border-0 shadow-sm"><div className="card-body p-4 p-md-5">
    <h1 className="h2 text-center mb-2">Create a Customer Profile</h1><p className="text-secondary text-center mb-4">This creates a customer record only. Login and authentication are not implemented.</p>
    {error && <div className="alert alert-danger">{error}</div>}{success && <div className="alert alert-success">{success}</div>}
    <form onSubmit={submit}><div className="row g-3"><div className="col-sm-6"><label className="form-label" htmlFor="registerFirstName">First Name *</label><input className="form-control" id="registerFirstName" maxLength="100" value={form.first_name} onChange={change('first_name')} required /></div><div className="col-sm-6"><label className="form-label" htmlFor="registerLastName">Last Name *</label><input className="form-control" id="registerLastName" maxLength="100" value={form.last_name} onChange={change('last_name')} required /></div><div className="col-12"><label className="form-label" htmlFor="registerEmail">Email *</label><input className="form-control" id="registerEmail" type="email" maxLength="100" value={form.email} onChange={change('email')} required /></div><div className="col-12"><label className="form-label" htmlFor="registerPhone">Phone *</label><input className="form-control" id="registerPhone" type="tel" maxLength="15" value={form.phone} onChange={change('phone')} required /></div><div className="col-12"><button className="btn btn-primary w-100" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Customer Profile'}</button></div></div></form>
  </div></div></section>
}

export default Register

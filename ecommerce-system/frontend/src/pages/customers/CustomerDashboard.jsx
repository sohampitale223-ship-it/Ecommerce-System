import { useCallback, useEffect, useState } from 'react'
import { createCustomer, deactivateCustomer, getCustomerById, getCustomerOrders, getCustomers, updateCustomer } from '../../services/customerService'

const emptyForm = { first_name: '', last_name: '', email: '', phone: '', status: true }
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+?[0-9][0-9\s()-]{6,14}$/
const errorMessage = (error) => !error.response ? 'Backend server is currently unavailable.' : error.response.data?.message || 'Something went wrong. Please try again.'
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
const formatMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))

function CustomerFormModal({ customer, onClose, onSaved }) {
  const [form, setForm] = useState(customer ? { first_name: customer.first_name, last_name: customer.last_name, email: customer.email, phone: customer.phone, status: Boolean(customer.status) } : emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const change = (field) => (event) => setForm({ ...form, [field]: field === 'status' ? event.target.value === '1' : event.target.value })
  const submit = async (event) => {
    event.preventDefault()
    const payload = { ...form, first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim(), phone: form.phone.trim() }
    if (!payload.first_name || !payload.last_name || !payload.email || !payload.phone) return setError('All fields are required.')
    if (!emailPattern.test(payload.email) || payload.email.length > 100) return setError('Enter a valid email address.')
    if (!phonePattern.test(payload.phone) || payload.phone.length > 15) return setError('Enter a valid phone number between 7 and 15 characters.')
    setSaving(true); setError('')
    try {
      const response = customer ? await updateCustomer(customer.user_id, payload) : await createCustomer(payload)
      onSaved(response.data.message)
    } catch (requestError) { setError(errorMessage(requestError)); setSaving(false) }
  }
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><form onSubmit={submit}>
    <div className="modal-header"><h2 className="modal-title fs-5">{customer ? 'Edit Customer' : 'Add Customer'}</h2><button type="button" className="btn-close" onClick={onClose} aria-label="Close" /></div>
    <div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}<div className="row g-3">
      <div className="col-sm-6"><label className="form-label" htmlFor="firstName">First Name *</label><input id="firstName" className="form-control" maxLength="100" value={form.first_name} onChange={change('first_name')} required autoFocus /></div>
      <div className="col-sm-6"><label className="form-label" htmlFor="lastName">Last Name *</label><input id="lastName" className="form-control" maxLength="100" value={form.last_name} onChange={change('last_name')} required /></div>
      <div className="col-12"><label className="form-label" htmlFor="customerEmail">Email *</label><input id="customerEmail" type="email" className="form-control" maxLength="100" value={form.email} onChange={change('email')} required /></div>
      <div className="col-12"><label className="form-label" htmlFor="customerPhone">Phone *</label><input id="customerPhone" type="tel" className="form-control" maxLength="15" value={form.phone} onChange={change('phone')} required /><div className="form-text">7–15 characters; digits, spaces, +, parentheses and hyphens are accepted.</div></div>
      {customer && <div className="col-12"><label className="form-label" htmlFor="customerStatus">Status</label><select id="customerStatus" className="form-select" value={form.status ? '1' : '0'} onChange={change('status')}><option value="1">Active</option><option value="0">Inactive</option></select></div>}
    </div></div><div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Customer'}</button></div>
  </form></div></div></div><div className="modal-backdrop show" /></div>
}

function CustomerDetailsModal({ customerId, onClose }) {
  const [customer, setCustomer] = useState(null); const [orders, setOrders] = useState([]); const [error, setError] = useState('')
  useEffect(() => { Promise.all([getCustomerById(customerId), getCustomerOrders(customerId)]).then(([customerResponse, orderResponse]) => { setCustomer(customerResponse.data.data); setOrders(orderResponse.data.data) }).catch((requestError) => setError(errorMessage(requestError))) }, [customerId])
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h2 className="modal-title fs-5">Customer Details</h2><button className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">
    {error ? <div className="alert alert-danger">{error}</div> : !customer ? <p className="text-center text-secondary py-4">Loading customer...</p> : <><div className="row g-3 mb-4"><div className="col-md-4"><span className="text-secondary d-block">Name</span>{customer.full_name}</div><div className="col-md-4"><span className="text-secondary d-block">Email</span>{customer.email}</div><div className="col-md-4"><span className="text-secondary d-block">Phone</span>{customer.phone}</div></div><h3 className="h6">Orders ({customer.order_count})</h3>{orders.length === 0 ? <p className="text-secondary mb-0">No linked orders.</p> : <div className="table-responsive"><table className="table table-sm"><thead><tr><th>ID</th><th>Status</th><th>Items</th><th>Total</th><th>Created</th></tr></thead><tbody>{orders.map((order) => <tr key={order.order_id}><td>{order.order_id}</td><td>{order.order_status}</td><td>{order.item_count}</td><td>{formatMoney(order.total_amount)}</td><td>{formatDate(order.created_at)}</td></tr>)}</tbody></table></div>}</>}
  </div><div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Close</button></div></div></div></div><div className="modal-backdrop show" /></div>
}

function DeactivateModal({ customer, onClose, onConfirmed }) {
  const [working, setWorking] = useState(false); const [error, setError] = useState('')
  const confirm = async () => { setWorking(true); setError(''); try { const response = await deactivateCustomer(customer.user_id); onConfirmed(response.data.message) } catch (requestError) { setError(errorMessage(requestError)); setWorking(false) } }
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h2 className="modal-title fs-5">Deactivate Customer</h2><button className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}<div className="alert alert-warning mb-0">Deactivate <strong>{customer.full_name}</strong>? The record and all linked order history will be preserved.</div></div><div className="modal-footer"><button className="btn btn-outline-secondary" onClick={onClose} disabled={working}>Cancel</button><button className="btn btn-danger" onClick={confirm} disabled={working}>{working ? 'Deactivating...' : 'Deactivate'}</button></div></div></div></div><div className="modal-backdrop show" /></div>
}

function CustomerDashboard() {
  const [customers, setCustomers] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [formCustomer, setFormCustomer] = useState(); const [showForm, setShowForm] = useState(false); const [detailsId, setDetailsId] = useState(null); const [deactivateTarget, setDeactivateTarget] = useState(null)
  const load = useCallback(async () => { setLoading(true); setError(''); try { const response = await getCustomers(); setCustomers(response.data.data) } catch (requestError) { setError(errorMessage(requestError)) } finally { setLoading(false) } }, [])
  useEffect(() => {
    getCustomers()
      .then((response) => setCustomers(response.data.data))
      .catch((requestError) => setError(errorMessage(requestError)))
      .finally(() => setLoading(false))
  }, [])
  const completed = async (message) => { setShowForm(false); setDeactivateTarget(null); setSuccess(message); await load() }
  return <section className="container-fluid px-3 px-lg-5 py-4 py-lg-5"><div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4"><div><h1 className="h2 mb-1">Customer Management</h1><p className="text-secondary mb-0">Manage customer profiles and linked order history.</p></div><button className="btn btn-primary align-self-start" onClick={() => { setFormCustomer(undefined); setShowForm(true); setSuccess('') }}>+ Add Customer</button></div>
    <div className="alert alert-info py-2 small">This dashboard is admin-oriented, but secure admin authorization requires a future authentication and RBAC module.</div>{success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')} aria-label="Close" /></div>}{error && <div className="alert alert-danger">{error}</div>}
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="text-center text-secondary p-5 mb-0">Loading customers...</p> : customers.length === 0 && !error ? <p className="text-center text-secondary p-5 mb-0">No customers found. Add your first customer to get started.</p> : <div className="table-responsive"><table className="table table-hover align-middle mb-0 customer-table"><thead className="table-light"><tr><th>User ID</th><th>First Name</th><th>Last Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Orders</th><th>Created At</th><th>Updated At</th><th>Actions</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.user_id}><td>{customer.user_id}</td><td>{customer.first_name}</td><td>{customer.last_name}</td><td>{customer.email}</td><td className="text-nowrap">{customer.phone}</td><td><span className={`badge ${customer.status ? 'text-bg-success' : 'text-bg-secondary'}`}>{customer.status ? 'Active' : 'Inactive'}</span></td><td>{customer.order_count}</td><td className="text-nowrap">{formatDate(customer.created_at)}</td><td className="text-nowrap">{formatDate(customer.updated_at)}</td><td><div className="d-flex flex-wrap gap-2"><button className="btn btn-sm btn-outline-secondary" onClick={() => setDetailsId(customer.user_id)}>View</button><button className="btn btn-sm btn-outline-primary" onClick={() => { setFormCustomer(customer); setShowForm(true); setSuccess('') }}>Edit</button>{Boolean(customer.status) && <button className="btn btn-sm btn-outline-danger" onClick={() => { setDeactivateTarget(customer); setSuccess('') }}>Deactivate</button>}</div></td></tr>)}</tbody></table></div>}</div></div>
    {showForm && <CustomerFormModal customer={formCustomer} onClose={() => setShowForm(false)} onSaved={completed} />}{detailsId && <CustomerDetailsModal customerId={detailsId} onClose={() => setDetailsId(null)} />}{deactivateTarget && <DeactivateModal customer={deactivateTarget} onClose={() => setDeactivateTarget(null)} onConfirmed={completed} />}
  </section>
}
export default CustomerDashboard

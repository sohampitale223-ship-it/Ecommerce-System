import { useCallback, useEffect, useMemo, useState } from 'react'
import { getOrders } from '../../services/orderService'
import { createPayment, getPaymentById, getPayments, refundPayment } from '../../services/paymentService'

const statuses = ['', 'Paid', 'Failed', 'Refunded']
const methods = ['Card', 'PayPal', 'Bank Transfer']
const badgeClasses = { Paid: 'text-bg-success', Failed: 'text-bg-danger', Refunded: 'text-bg-secondary' }
const getErrorMessage = (error) => !error.response ? 'Backend server is currently unavailable.' : error.response.data?.message || 'Something went wrong. Please try again.'
const formatMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

function PaymentFormModal({ orders, onClose, onCreated }) {
  const [orderId, setOrderId] = useState('')
  const [method, setMethod] = useState('Card')
  const [outcome, setOutcome] = useState('Paid')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const selectedOrder = useMemo(() => orders.find((order) => order.order_id === Number(orderId)), [orderId, orders])
  const submit = async (event) => {
    event.preventDefault()
    if (!selectedOrder) return setError('Select a payable order.')
    setSaving(true); setError('')
    try {
      const response = await createPayment({ order_id: selectedOrder.order_id, payment_method: method, simulated_status: outcome })
      onCreated(response.data.message)
    } catch (requestError) { setError(getErrorMessage(requestError)); setSaving(false) }
  }
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><form onSubmit={submit}>
    <div className="modal-header"><h2 className="modal-title fs-5">Process Simulated Payment</h2><button className="btn-close" type="button" onClick={onClose} aria-label="Close" /></div>
    <div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}<div className="alert alert-info small">This records a simulated transaction only. No card, bank, or PayPal credentials are collected.</div>
      <div className="mb-3"><label className="form-label" htmlFor="paymentOrder">Order *</label><select id="paymentOrder" className="form-select" value={orderId} onChange={(event) => setOrderId(event.target.value)} required><option value="">Select an order</option>{orders.map((order) => <option key={order.order_id} value={order.order_id}>Order #{order.order_id} — {formatMoney(order.total_amount)} — {order.order_status}</option>)}</select></div>
      <div className="mb-3"><label className="form-label" htmlFor="paymentAmount">Amount</label><input id="paymentAmount" className="form-control" value={selectedOrder ? formatMoney(selectedOrder.total_amount) : ''} placeholder="Select an order" readOnly /><div className="form-text">The backend reads and validates this amount directly from the order.</div></div>
      <div className="mb-3"><label className="form-label" htmlFor="paymentMethod">Payment Method *</label><select id="paymentMethod" className="form-select" value={method} onChange={(event) => setMethod(event.target.value)}>{methods.map((entry) => <option key={entry}>{entry}</option>)}</select></div>
      <div><label className="form-label" htmlFor="paymentOutcome">Simulation Outcome *</label><select id="paymentOutcome" className="form-select" value={outcome} onChange={(event) => setOutcome(event.target.value)}><option value="Paid">Paid (successful simulation)</option><option value="Failed">Failed (explicit failure simulation)</option></select></div>
    </div><div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Processing...' : 'Process Payment'}</button></div>
  </form></div></div></div><div className="modal-backdrop show" /></div>
}

function PaymentDetailsModal({ paymentId, onClose }) {
  const [payment, setPayment] = useState(null); const [error, setError] = useState('')
  useEffect(() => { getPaymentById(paymentId).then((response) => setPayment(response.data.data)).catch((requestError) => setError(getErrorMessage(requestError))) }, [paymentId])
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h2 className="modal-title fs-5">Payment #{paymentId}</h2><button className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">{error ? <div className="alert alert-danger">{error}</div> : !payment ? <p className="text-center text-secondary py-4">Loading payment...</p> : <>
    <div className="row g-3 mb-4"><div className="col-md-3"><span className="text-secondary d-block">Order</span>#{payment.order_id}</div><div className="col-md-3"><span className="text-secondary d-block">Customer</span>{payment.customer_name}</div><div className="col-md-3"><span className="text-secondary d-block">Amount</span>{formatMoney(payment.amount)}</div><div className="col-md-3"><span className="text-secondary d-block">Method</span>{payment.payment_method}</div></div>
    <h3 className="h6">Status History</h3><div className="table-responsive"><table className="table table-sm"><thead><tr><th>Previous</th><th>New Status</th><th>Reason</th><th>Created</th></tr></thead><tbody>{payment.history.map((entry) => <tr key={entry.history_id}><td>{entry.previous_status || '—'}</td><td><span className={`badge ${badgeClasses[entry.new_status]}`}>{entry.new_status}</span></td><td>{entry.reason}</td><td>{formatDate(entry.created_at)}</td></tr>)}</tbody></table></div>
  </>}</div><div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Close</button></div></div></div></div><div className="modal-backdrop show" /></div>
}

function RefundModal({ payment, onClose, onRefunded }) {
  const [working, setWorking] = useState(false); const [error, setError] = useState('')
  const confirm = async () => { setWorking(true); setError(''); try { const response = await refundPayment(payment.payment_id); onRefunded(response.data.message) } catch (requestError) { setError(getErrorMessage(requestError)); setWorking(false) } }
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h2 className="modal-title fs-5">Refund Payment</h2><button className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}<div className="alert alert-warning mb-0">Refund payment #{payment.payment_id} for <strong>{formatMoney(payment.amount)}</strong>? The transaction and refund history will remain stored. Inventory is not changed here.</div></div><div className="modal-footer"><button className="btn btn-outline-secondary" onClick={onClose} disabled={working}>Cancel</button><button className="btn btn-danger" onClick={confirm} disabled={working}>{working ? 'Refunding...' : 'Confirm Refund'}</button></div></div></div></div><div className="modal-backdrop show" /></div>
}

function PaymentDashboard() {
  const [payments, setPayments] = useState([]); const [orders, setOrders] = useState([]); const [filter, setFilter] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [showForm, setShowForm] = useState(false); const [detailsId, setDetailsId] = useState(null); const [refundTarget, setRefundTarget] = useState(null)
  const payableOrders = useMemo(() => orders.filter((order) => order.order_status !== 'Cancelled' && Number(order.total_amount) > 0), [orders])
  const load = useCallback(async () => { setLoading(true); setError(''); try { const response = await getPayments(filter); setPayments(response.data.data) } catch (requestError) { setError(getErrorMessage(requestError)) } finally { setLoading(false) } }, [filter])
  useEffect(() => { getPayments(filter).then((response) => setPayments(response.data.data)).catch((requestError) => setError(getErrorMessage(requestError))).finally(() => setLoading(false)) }, [filter])
  useEffect(() => { getOrders().then((response) => setOrders(response.data.data)).catch(() => {}) }, [])
  const completed = async (message) => { setShowForm(false); setRefundTarget(null); setSuccess(message); await load() }
  return <section className="container-fluid px-3 px-lg-5 py-4 py-lg-5"><div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4"><div><h1 className="h2 mb-1">Payment Management</h1><p className="text-secondary mb-0">Record simulated payments and manage eligible refunds.</p></div><button className="btn btn-primary align-self-start" disabled={payableOrders.length === 0} onClick={() => { setShowForm(true); setSuccess('') }}>+ Process Payment</button></div>
    <div className="alert alert-info py-2 small">This admin-oriented simulation stores no payment credentials. Secure admin authorization requires a future authentication and RBAC module.</div>{success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')} aria-label="Close" /></div>}{error && <div className="alert alert-danger">{error}</div>}
    <div className="d-flex flex-wrap gap-2 mb-3" aria-label="Filter payments">{statuses.map((status) => <button key={status || 'All'} className={`btn btn-sm ${filter === status ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter(status)}>{status || 'All'}</button>)}</div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="text-center text-secondary p-5 mb-0">Loading payments...</p> : payments.length === 0 && !error ? <p className="text-center text-secondary p-5 mb-0">No {filter.toLowerCase()} payments found.</p> : <div className="table-responsive"><table className="table table-hover align-middle mb-0 payment-table"><thead className="table-light"><tr><th>Payment ID</th><th>Order ID</th><th>Customer</th><th>Amount</th><th>Method</th><th>Status</th><th>Created At</th><th>Updated At</th><th>Actions</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.payment_id}><td>{payment.payment_id}</td><td>{payment.order_id}</td><td>{payment.customer_name}</td><td>{formatMoney(payment.amount)}</td><td>{payment.payment_method}</td><td><span className={`badge ${badgeClasses[payment.payment_status]}`}>{payment.payment_status}</span></td><td className="text-nowrap">{formatDate(payment.created_at)}</td><td className="text-nowrap">{formatDate(payment.updated_at)}</td><td><div className="d-flex gap-2"><button className="btn btn-sm btn-outline-secondary" onClick={() => setDetailsId(payment.payment_id)}>View</button>{payment.payment_status === 'Paid' && payment.order_status === 'Cancelled' && <button className="btn btn-sm btn-outline-danger" onClick={() => { setRefundTarget(payment); setSuccess('') }}>Refund</button>}</div></td></tr>)}</tbody></table></div>}</div></div>
    {showForm && <PaymentFormModal orders={payableOrders} onClose={() => setShowForm(false)} onCreated={completed} />}{detailsId && <PaymentDetailsModal paymentId={detailsId} onClose={() => setDetailsId(null)} />}{refundTarget && <RefundModal payment={refundTarget} onClose={() => setRefundTarget(null)} onRefunded={completed} />}
  </section>
}

export default PaymentDashboard

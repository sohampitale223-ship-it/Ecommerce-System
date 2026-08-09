import { useCallback, useEffect, useMemo, useState } from 'react'
import { getOrders } from '../../services/orderService'
import { createShipping, getShipping, getShippingById, updateShipping, updateShippingStatus } from '../../services/shippingService'

const statuses = ['', 'Pending', 'Shipped', 'In Transit', 'Delivered']
const nextStatuses = { Pending: 'Shipped', Shipped: 'In Transit', 'In Transit': 'Delivered' }
const badgeClasses = { Pending: 'text-bg-secondary', Shipped: 'text-bg-primary', 'In Transit': 'text-bg-warning', Delivered: 'text-bg-success' }
const courierPattern = /^[A-Za-z0-9][A-Za-z0-9 .&'()-]{0,99}$/
const trackingPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/
const getErrorMessage = (error) => !error.response ? 'Backend server is currently unavailable.' : error.response.data?.message || 'Something went wrong. Please try again.'
const formatMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

const validateDetails = (courier, tracking) => {
  const cleanCourier = courier.trim(); const cleanTracking = tracking.trim()
  if (!cleanCourier || !courierPattern.test(cleanCourier)) return { error: 'Enter a valid courier service up to 100 characters.' }
  if (cleanTracking && !trackingPattern.test(cleanTracking)) return { error: 'Enter a valid tracking number up to 100 characters.' }
  return { courier_service: cleanCourier, tracking_number: cleanTracking }
}

function ShippingFormModal({ shipping, orders, onClose, onSaved }) {
  const [orderId, setOrderId] = useState(shipping?.order_id || '')
  const [courier, setCourier] = useState(shipping?.courier_service || '')
  const [tracking, setTracking] = useState(shipping?.tracking_number || '')
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const selectedOrder = orders.find((order) => order.order_id === Number(orderId))
  const previewCost = selectedOrder ? (Number(selectedOrder.total_amount) < 500 ? 50 : 0) : null
  const submit = async (event) => {
    event.preventDefault()
    if (!shipping && !selectedOrder) return setError('Select an eligible order.')
    const validation = validateDetails(courier, tracking)
    if (validation.error) return setError(validation.error)
    setSaving(true); setError('')
    try {
      const response = shipping ? await updateShipping(shipping.shipping_id, validation) : await createShipping({ order_id: selectedOrder.order_id, ...validation })
      onSaved(response.data.message)
    } catch (requestError) { setError(getErrorMessage(requestError)); setSaving(false) }
  }
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><form onSubmit={submit}><div className="modal-header"><h2 className="modal-title fs-5">{shipping ? 'Update Shipping Information' : 'Add Shipping'}</h2><button type="button" className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}
    {!shipping && <><div className="mb-3"><label className="form-label" htmlFor="shippingOrder">Order *</label><select id="shippingOrder" className="form-select" value={orderId} onChange={(event) => setOrderId(event.target.value)} required><option value="">Select an eligible order</option>{orders.map((order) => <option key={order.order_id} value={order.order_id}>Order #{order.order_id} — {formatMoney(order.total_amount)} — {order.order_status}</option>)}</select></div><div className="mb-3"><label className="form-label" htmlFor="shippingCost">Calculated Shipping Cost</label><input id="shippingCost" className="form-control" value={previewCost === null ? '' : formatMoney(previewCost)} placeholder="Select an order" readOnly /><div className="form-text">Preview only. The backend calculates and stores the authoritative cost.</div></div></>}
    <div className="mb-3"><label className="form-label" htmlFor="courierService">Courier Service *</label><input id="courierService" className="form-control" maxLength="100" value={courier} onChange={(event) => setCourier(event.target.value)} required /></div>
    <div><label className="form-label" htmlFor="trackingNumber">Tracking Number</label><input id="trackingNumber" className="form-control" maxLength="100" value={tracking} onChange={(event) => setTracking(event.target.value)} /><div className="form-text">Optional, but must be unique when supplied.</div></div>
  </div><div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Shipping'}</button></div></form></div></div></div><div className="modal-backdrop show" /></div>
}

function TrackModal({ shippingId, onClose }) {
  const [shipping, setShipping] = useState(null); const [error, setError] = useState('')
  useEffect(() => { getShippingById(shippingId).then((response) => setShipping(response.data.data)).catch((requestError) => setError(getErrorMessage(requestError))) }, [shippingId])
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h2 className="modal-title fs-5">Track Shipment #{shippingId}</h2><button className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">{error ? <div className="alert alert-danger">{error}</div> : !shipping ? <p className="text-center text-secondary py-4">Loading shipment...</p> : <><div className="alert alert-info small">Tracking displays the current status stored in ShopEase. No live courier-location API is connected.</div><div className="row g-3"><div className="col-md-4"><span className="text-secondary d-block">Order</span>#{shipping.order_id}</div><div className="col-md-4"><span className="text-secondary d-block">Customer</span>{shipping.customer_name}</div><div className="col-md-4"><span className="text-secondary d-block">Status</span><span className={`badge ${badgeClasses[shipping.shipping_status]}`}>{shipping.shipping_status}</span></div><div className="col-md-4"><span className="text-secondary d-block">Courier</span>{shipping.courier_service}</div><div className="col-md-4"><span className="text-secondary d-block">Tracking Number</span>{shipping.tracking_number || 'Not assigned'}</div><div className="col-md-4"><span className="text-secondary d-block">Shipping Cost</span>{formatMoney(shipping.shipping_cost)}</div><div className="col-md-6"><span className="text-secondary d-block">Created</span>{formatDate(shipping.created_at)}</div><div className="col-md-6"><span className="text-secondary d-block">Updated</span>{formatDate(shipping.updated_at)}</div></div></>}</div><div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Close</button></div></div></div></div><div className="modal-backdrop show" /></div>
}

function StatusModal({ shipping, onClose, onUpdated }) {
  const nextStatus = nextStatuses[shipping.shipping_status]; const [working, setWorking] = useState(false); const [error, setError] = useState('')
  const confirm = async () => { setWorking(true); setError(''); try { const response = await updateShippingStatus(shipping.shipping_id, nextStatus); onUpdated(response.data.message) } catch (requestError) { setError(getErrorMessage(requestError)); setWorking(false) } }
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h2 className="modal-title fs-5">Update Shipping Status</h2><button className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}<p className="mb-0">Move shipment #{shipping.shipping_id} from <strong>{shipping.shipping_status}</strong> to <strong>{nextStatus}</strong>?</p></div><div className="modal-footer"><button className="btn btn-outline-secondary" onClick={onClose} disabled={working}>Cancel</button><button className="btn btn-primary" onClick={confirm} disabled={working}>{working ? 'Updating...' : `Mark ${nextStatus}`}</button></div></div></div></div><div className="modal-backdrop show" /></div>
}

function ShippingDashboard() {
  const [records, setRecords] = useState([]); const [allRecords, setAllRecords] = useState([]); const [orders, setOrders] = useState([]); const [filter, setFilter] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [formShipping, setFormShipping] = useState(); const [showForm, setShowForm] = useState(false); const [trackId, setTrackId] = useState(null); const [statusTarget, setStatusTarget] = useState(null)
  const eligibleOrders = useMemo(() => { const used = new Set(allRecords.map((record) => record.order_id)); return orders.filter((order) => !used.has(order.order_id) && !['Cancelled', 'Delivered'].includes(order.order_status)) }, [allRecords, orders])
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [filtered, all] = await Promise.all([getShipping(filter), getShipping()]); setRecords(filtered.data.data); setAllRecords(all.data.data) } catch (requestError) { setError(getErrorMessage(requestError)) } finally { setLoading(false) } }, [filter])
  useEffect(() => { Promise.all([getShipping(filter), getShipping()]).then(([filtered, all]) => { setRecords(filtered.data.data); setAllRecords(all.data.data) }).catch((requestError) => setError(getErrorMessage(requestError))).finally(() => setLoading(false)) }, [filter])
  useEffect(() => { getOrders().then((response) => setOrders(response.data.data)).catch(() => {}) }, [])
  const completed = async (message) => { setShowForm(false); setStatusTarget(null); setSuccess(message); await load(); getOrders().then((response) => setOrders(response.data.data)).catch(() => {}) }
  return <section className="container-fluid px-3 px-lg-5 py-4 py-lg-5"><div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4"><div><h1 className="h2 mb-1">Shipping Management</h1><p className="text-secondary mb-0">Manage order shipments, courier information, tracking details, and delivery status.</p></div><button className="btn btn-primary align-self-start" disabled={eligibleOrders.length === 0} onClick={() => { setFormShipping(undefined); setShowForm(true); setSuccess('') }}>+ Add Shipping</button></div>
    <div className="alert alert-info py-2 small">This dashboard is admin-oriented. Secure shipping administration requires future authentication and RBAC.</div>{success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')} aria-label="Close" /></div>}{error && <div className="alert alert-danger">{error}</div>}
    <div className="d-flex flex-wrap gap-2 mb-3" aria-label="Filter shipping">{statuses.map((status) => <button key={status || 'All'} className={`btn btn-sm ${filter === status ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setFilter(status); setLoading(true); setError('') }}>{status || 'All'}</button>)}</div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="text-center text-secondary p-5 mb-0">Loading shipping records...</p> : records.length === 0 && !error ? <p className="text-center text-secondary p-5 mb-0">No {filter.toLowerCase()} shipping records found.</p> : <div className="table-responsive"><table className="table table-hover align-middle mb-0 shipping-table"><thead className="table-light"><tr><th>Shipping ID</th><th>Order ID</th><th>Customer</th><th>Courier</th><th>Tracking Number</th><th>Shipping Cost</th><th>Status</th><th>Created At</th><th>Updated At</th><th>Actions</th></tr></thead><tbody>{records.map((shipping) => <tr key={shipping.shipping_id}><td>{shipping.shipping_id}</td><td>{shipping.order_id}</td><td>{shipping.customer_name}</td><td>{shipping.courier_service}</td><td>{shipping.tracking_number || '—'}</td><td>{formatMoney(shipping.shipping_cost)}</td><td><span className={`badge ${badgeClasses[shipping.shipping_status]}`}>{shipping.shipping_status}</span></td><td className="text-nowrap">{formatDate(shipping.created_at)}</td><td className="text-nowrap">{formatDate(shipping.updated_at)}</td><td><div className="d-flex flex-wrap gap-2"><button className="btn btn-sm btn-outline-secondary" onClick={() => setTrackId(shipping.shipping_id)}>View / Track</button>{shipping.shipping_status !== 'Delivered' && <button className="btn btn-sm btn-outline-primary" onClick={() => { setFormShipping(shipping); setShowForm(true); setSuccess('') }}>Update</button>}{nextStatuses[shipping.shipping_status] && <button className="btn btn-sm btn-outline-success" onClick={() => { setStatusTarget(shipping); setSuccess('') }}>Mark {nextStatuses[shipping.shipping_status]}</button>}</div></td></tr>)}</tbody></table></div>}</div></div>
    {showForm && <ShippingFormModal shipping={formShipping} orders={eligibleOrders} onClose={() => setShowForm(false)} onSaved={completed} />}{trackId && <TrackModal shippingId={trackId} onClose={() => setTrackId(null)} />}{statusTarget && <StatusModal shipping={statusTarget} onClose={() => setStatusTarget(null)} onUpdated={completed} />}
  </section>
}

export default ShippingDashboard

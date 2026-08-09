import { useCallback, useEffect, useMemo, useState } from 'react'
import { getProducts } from '../../services/productService'
import { getCustomers } from '../../services/customerService'
import { validateCoupon } from '../../services/couponService'
import {
  cancelOrder,
  createOrder,
  getOrderById,
  getOrders,
  updateOrderStatus,
} from '../../services/orderService'

const statuses = ['', 'Pending', 'Shipped', 'Delivered', 'Cancelled']
const badgeClasses = { Pending: 'text-bg-warning', Shipped: 'text-bg-primary', Delivered: 'text-bg-success', Cancelled: 'text-bg-secondary' }
const nextStatuses = { Pending: 'Shipped', Shipped: 'Delivered' }

const getErrorMessage = (error) => !error.response
  ? 'Backend server is currently unavailable.'
  : error.response.data?.message || 'Something went wrong. Please try again.'
const formatMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))
const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—'

function OrderFormModal({ products, customers, onClose, onCreated }) {
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }])
  const [userId, setUserId] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [couponPreview, setCouponPreview] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const total = useMemo(() => items.reduce((sum, item) => {
    const product = products.find((entry) => entry.product_id === Number(item.product_id))
    return sum + (product ? Number(product.price) * Number(item.quantity || 0) : 0)
  }, 0), [items, products])
  const updateItem = (index, field, value) => { setCouponPreview(null); setItems((current) => current.map((item, itemIndex) => (
    itemIndex === index ? { ...item, [field]: value } : item
  ))) }
  const applyCoupon = async () => {
    if (!couponCode.trim()) return setError('Enter a coupon code.')
    try { const response = await validateCoupon(couponCode, total); setCouponPreview(response.data.data); setError('') } catch (requestError) { setCouponPreview(null); setError(getErrorMessage(requestError)) }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const address = shippingAddress.trim()
    if (!address) return setError('Shipping address is required.')
    if (address.length > 300) return setError('Shipping address cannot exceed 300 characters.')
    if (items.some((item) => !item.product_id || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0)) {
      return setError('Select a product and enter a positive whole-number quantity for every item.')
    }

    setSaving(true)
    setError('')
    try {
      const response = await createOrder({
        user_id: userId ? Number(userId) : null,
        coupon_code: couponPreview ? couponPreview.coupon_code : '',
        shipping_address: address,
        items: items.map((item) => ({ product_id: Number(item.product_id), quantity: Number(item.quantity) })),
      })
      onCreated(response.data.message)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      setSaving(false)
    }
  }

  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true" aria-labelledby="createOrderTitle">
    <div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content">
      <form onSubmit={handleSubmit}>
        <div className="modal-header"><h2 className="modal-title fs-5" id="createOrderTitle">Place Order</h2><button type="button" className="btn-close" onClick={onClose} aria-label="Close" /></div>
        <div className="modal-body">
          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          <p className="text-secondary small">Prices and stock are revalidated by the server when the order is submitted.</p>
          <div className="mb-3"><label className="form-label" htmlFor="orderCustomer">Customer</label><select className="form-select" id="orderCustomer" value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">Guest</option>{customers.map((customer) => <option key={customer.user_id} value={customer.user_id}>{customer.full_name} — {customer.email}</option>)}</select></div>
          {items.map((item, index) => {
            const selected = products.find((product) => product.product_id === Number(item.product_id))
            return <div className="row g-2 align-items-end mb-3" key={index}>
              <div className="col-md-7"><label className="form-label" htmlFor={`orderProduct${index}`}>Product *</label>
                <select className="form-select" id={`orderProduct${index}`} value={item.product_id} onChange={(event) => updateItem(index, 'product_id', event.target.value)} required>
                  <option value="">Select a product</option>{products.map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name} ({product.SKU}) — {formatMoney(product.price)} — {product.inventory_count} in stock</option>)}
                </select></div>
              <div className="col-8 col-md-3"><label className="form-label" htmlFor={`orderQuantity${index}`}>Quantity *</label><input className="form-control" id={`orderQuantity${index}`} type="number" min="1" max={selected?.inventory_count} step="1" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} required /></div>
              <div className="col-4 col-md-2"><button type="button" className="btn btn-outline-danger w-100" disabled={items.length === 1} onClick={() => { setCouponPreview(null); setItems((current) => current.filter((_, itemIndex) => itemIndex !== index)) }}>Remove</button></div>
            </div>
          })}
          <button type="button" className="btn btn-sm btn-outline-primary mb-4" onClick={() => { setCouponPreview(null); setItems((current) => [...current, { product_id: '', quantity: 1 }]) }}>+ Add Item</button>
          <div className="mb-3"><label className="form-label" htmlFor="couponCode">Coupon</label><div className="input-group"><input id="couponCode" className="form-control text-uppercase" maxLength="50" value={couponCode} onChange={(event) => { setCouponCode(event.target.value); setCouponPreview(null) }} placeholder="Enter coupon code" /><button type="button" className="btn btn-outline-primary" onClick={applyCoupon} disabled={!couponCode.trim() || total < 0}>Apply</button></div>{couponPreview && <div className="form-text text-success">{couponPreview.coupon_code} applied. The backend will revalidate it during order creation.</div>}</div>
          <div className="mb-3"><label className="form-label" htmlFor="shippingAddress">Shipping Address *</label><textarea className="form-control" id="shippingAddress" rows="3" maxLength="300" value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} required /><div className="form-text text-end">{shippingAddress.length}/300</div></div>
          <div className="text-end"><div><span className="text-secondary">Subtotal: </span>{formatMoney(total)}</div>{couponPreview && <><div><span className="text-secondary">Coupon: </span>{couponPreview.coupon_code}</div><div className="text-success"><span>Discount: </span>-{formatMoney(couponPreview.discount_amount)}</div></>}<div className="fs-5"><span className="text-secondary">Final total: </span><strong>{formatMoney(couponPreview?.final_total ?? total)}</strong></div></div>
        </div>
        <div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Close</button><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Place Order'}</button></div>
      </form>
    </div></div></div><div className="modal-backdrop show" />
  </div>
}

function OrderDetailsModal({ orderId, onClose }) {
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { getOrderById(orderId).then((response) => setOrder(response.data.data)).catch((requestError) => setError(getErrorMessage(requestError))) }, [orderId])
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true" aria-labelledby="orderDetailsTitle"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content">
    <div className="modal-header"><h2 className="modal-title fs-5" id="orderDetailsTitle">Order #{orderId}</h2><button type="button" className="btn-close" onClick={onClose} aria-label="Close" /></div>
    <div className="modal-body">{error ? <div className="alert alert-danger">{error}</div> : !order ? <p className="text-secondary text-center py-4">Loading order...</p> : <>
      <div className="row g-3 mb-4"><div className="col-md-3"><span className="text-secondary d-block">Status</span><span className={`badge ${badgeClasses[order.order_status]}`}>{order.order_status}</span></div><div className="col-md-3"><span className="text-secondary d-block">User ID</span>{order.user_id || '—'}</div><div className="col-md-6"><span className="text-secondary d-block">Customer</span>{order.user_id ? <>{order.customer_name}<span className="text-secondary d-block small">{order.customer_email} · {order.customer_phone}</span></> : 'Guest'}</div><div className="col-12"><span className="text-secondary d-block">Shipping Address</span>{order.shipping_address}</div></div>
      <div className="table-responsive"><table className="table align-middle"><thead><tr><th>Product</th><th>SKU</th><th>Quantity</th><th>Unit Price</th><th>Subtotal</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.order_item_id}><td>{item.product_name}</td><td>{item.SKU}</td><td>{item.quantity}</td><td>{formatMoney(item.unit_price)}</td><td>{formatMoney(item.subtotal)}</td></tr>)}</tbody><tfoot><tr><th colSpan="4" className="text-end">Subtotal</th><th>{formatMoney(order.subtotal_amount)}</th></tr>{order.coupon_id && <><tr><th colSpan="4" className="text-end">Coupon ({order.coupon_code})</th><th className="text-success">-{formatMoney(order.discount_amount)}</th></tr></>}<tr><th colSpan="4" className="text-end">Final Total</th><th>{formatMoney(order.total_amount)}</th></tr></tfoot></table></div>
    </>}</div><div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Close</button></div>
  </div></div></div><div className="modal-backdrop show" /></div>
}

function ConfirmModal({ order, action, onClose, onConfirmed }) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const isCancel = action === 'cancel'
  const handleConfirm = async () => {
    setWorking(true); setError('')
    try {
      const response = isCancel ? await cancelOrder(order.order_id) : await updateOrderStatus(order.order_id, nextStatuses[order.order_status])
      onConfirmed(response.data.message)
    } catch (requestError) { setError(getErrorMessage(requestError)); setWorking(false) }
  }
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-dialog-centered"><div className="modal-content">
    <div className="modal-header"><h2 className="modal-title fs-5">{isCancel ? 'Cancel Order' : 'Update Order Status'}</h2><button type="button" className="btn-close" onClick={onClose} aria-label="Close" /></div>
    <div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}{isCancel ? <div className="alert alert-warning mb-0">Cancel order #{order.order_id}? The order will remain stored and its inventory will be restored.</div> : <p className="mb-0">Mark order #{order.order_id} as <strong>{nextStatuses[order.order_status]}</strong>?</p>}</div>
    <div className="modal-footer"><button className="btn btn-outline-secondary" onClick={onClose} disabled={working}>Close</button><button className={`btn ${isCancel ? 'btn-danger' : 'btn-primary'}`} onClick={handleConfirm} disabled={working}>{working ? 'Updating...' : 'Confirm'}</button></div>
  </div></div></div><div className="modal-backdrop show" /></div>
}

function OrderDashboard() {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [detailsId, setDetailsId] = useState(null)
  const [confirmation, setConfirmation] = useState(null)

  const loadOrders = useCallback(async () => {
    setLoading(true); setError('')
    try { const response = await getOrders(filter); setOrders(response.data.data) } catch (requestError) { setError(getErrorMessage(requestError)) } finally { setLoading(false) }
  }, [filter])

  useEffect(() => {
    getOrders(filter)
      .then((response) => setOrders(response.data.data))
      .catch((requestError) => setError(getErrorMessage(requestError)))
      .finally(() => setLoading(false))
  }, [filter])
  useEffect(() => { getProducts().then((response) => setProducts(response.data.data.filter((product) => Boolean(product.status) && Number(product.inventory_count) > 0))).catch(() => {}) }, [])
  useEffect(() => { getCustomers().then((response) => setCustomers(response.data.data.filter((customer) => Boolean(customer.status)))).catch(() => {}) }, [])
  const completed = async (message) => { setShowForm(false); setConfirmation(null); setSuccess(message); await loadOrders(); getProducts().then((response) => setProducts(response.data.data.filter((product) => Boolean(product.status) && Number(product.inventory_count) > 0))).catch(() => {}) }

  return <section className="container-fluid px-3 px-lg-5 py-4 py-lg-5">
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4"><div><h1 className="h2 mb-1">Order Management</h1><p className="text-secondary mb-0">Create orders, track fulfillment, and manage cancellations.</p></div><button className="btn btn-primary align-self-start" disabled={products.length === 0} onClick={() => { setShowForm(true); setSuccess('') }}>+ Place Order</button></div>
    {success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')} aria-label="Close" /></div>}{error && <div className="alert alert-danger">{error}</div>}{!loading && products.length === 0 && <div className="alert alert-warning">No active products with available inventory can be ordered.</div>}
    <div className="d-flex flex-wrap gap-2 mb-3" aria-label="Filter orders">{statuses.map((status) => <button key={status || 'All'} className={`btn btn-sm ${filter === status ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter(status)}>{status || 'All'}</button>)}</div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="text-center text-secondary p-5 mb-0">Loading orders...</p> : orders.length === 0 && !error ? <p className="text-center text-secondary p-5 mb-0">No {filter.toLowerCase()} orders found.</p> : <div className="table-responsive"><table className="table table-hover align-middle mb-0 order-table"><thead className="table-light"><tr><th>ID</th><th>User ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Shipping Address</th><th>Status</th><th>Created At</th><th>Updated At</th><th>Actions</th></tr></thead><tbody>{orders.map((order) => <tr key={order.order_id}><td>{order.order_id}</td><td>{order.user_id || '—'}</td><td className="text-secondary">{order.customer_name || 'Guest'}</td><td>{order.item_count}</td><td className="text-nowrap">{formatMoney(order.total_amount)}</td><td className="order-address">{order.shipping_address}</td><td><span className={`badge ${badgeClasses[order.order_status]}`}>{order.order_status}</span></td><td className="text-nowrap">{formatDate(order.created_at)}</td><td className="text-nowrap">{formatDate(order.updated_at)}</td><td><div className="d-flex flex-wrap gap-2"><button className="btn btn-sm btn-outline-secondary" onClick={() => setDetailsId(order.order_id)}>View</button>{nextStatuses[order.order_status] && <button className="btn btn-sm btn-outline-primary" onClick={() => setConfirmation({ order, action: 'status' })}>Mark {nextStatuses[order.order_status]}</button>}{order.order_status === 'Pending' && <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirmation({ order, action: 'cancel' })}>Cancel</button>}</div></td></tr>)}</tbody></table></div>}</div></div>
    {showForm && <OrderFormModal products={products} customers={customers} onClose={() => setShowForm(false)} onCreated={completed} />}{detailsId && <OrderDetailsModal orderId={detailsId} onClose={() => setDetailsId(null)} />}{confirmation && <ConfirmModal {...confirmation} onClose={() => setConfirmation(null)} onConfirmed={completed} />}
  </section>
}

export default OrderDashboard

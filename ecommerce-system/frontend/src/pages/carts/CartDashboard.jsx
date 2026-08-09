import { useCallback, useEffect, useMemo, useState } from 'react'
import { addToCart, getCarts, removeCart, updateCart } from '../../services/cartService'
import { getCustomers } from '../../services/customerService'
import { getProducts } from '../../services/productService'

const getErrorMessage = (error) => !error.response ? 'Backend server is currently unavailable.' : error.response.data?.message || 'Something went wrong. Please try again.'
const formatMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

function AddCartModal({ customers, products, onClose, onSaved }) {
  const [customerId, setCustomerId] = useState(''); const [productId, setProductId] = useState(''); const [quantity, setQuantity] = useState(1); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const selectedProduct = products.find((product) => product.product_id === Number(productId))
  const submit = async (event) => {
    event.preventDefault(); const numericQuantity = Number(quantity)
    if (!customerId) return setError('Select an active customer.')
    if (!selectedProduct) return setError('Select an active product.')
    if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) return setError('Quantity must be a whole number greater than zero.')
    if (numericQuantity > Number(selectedProduct.inventory_count)) return setError(`Only ${selectedProduct.inventory_count} unit(s) are available.`)
    setSaving(true); setError('')
    try { const response = await addToCart({ customer_id: Number(customerId), product_id: selectedProduct.product_id, quantity: numericQuantity }); onSaved(response.data.message) } catch (requestError) { setError(getErrorMessage(requestError)); setSaving(false) }
  }
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><form onSubmit={submit}><div className="modal-header"><h2 className="modal-title fs-5">Add to Cart</h2><button type="button" className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}
    <div className="mb-3"><label className="form-label" htmlFor="cartCustomer">Customer *</label><select id="cartCustomer" className="form-select" value={customerId} onChange={(event) => setCustomerId(event.target.value)} required><option value="">Select a customer</option>{customers.map((customer) => <option key={customer.user_id} value={customer.user_id}>{customer.full_name} — {customer.email}</option>)}</select></div>
    <div className="mb-3"><label className="form-label" htmlFor="cartProduct">Product *</label><select id="cartProduct" className="form-select" value={productId} onChange={(event) => setProductId(event.target.value)} required><option value="">Select a product</option>{products.map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name} — {formatMoney(product.price)} — {product.inventory_count} in stock</option>)}</select></div>
    <div><label className="form-label" htmlFor="cartQuantity">Quantity *</label><input id="cartQuantity" type="number" min="1" max={selectedProduct?.inventory_count} step="1" className="form-control" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /><div className="form-text">Adding the same product again increases its existing cart quantity.</div></div>
  </div><div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Adding...' : 'Add to Cart'}</button></div></form></div></div></div><div className="modal-backdrop show" /></div>
}

function UpdateCartModal({ item, onClose, onSaved }) {
  const [quantity, setQuantity] = useState(item.quantity); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); const numericQuantity = Number(quantity)
    if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) return setError('Quantity must be a whole number greater than zero.')
    if (numericQuantity > Number(item.inventory_count)) return setError(`Only ${item.inventory_count} unit(s) are available.`)
    setSaving(true); setError('')
    try { const response = await updateCart(item.cart_id, numericQuantity); onSaved(response.data.message) } catch (requestError) { setError(getErrorMessage(requestError)); setSaving(false) }
  }
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><form onSubmit={submit}><div className="modal-header"><h2 className="modal-title fs-5">Update Cart Quantity</h2><button type="button" className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}<p><strong>{item.product_name}</strong> for {item.customer_name}</p><label className="form-label" htmlFor="updateCartQuantity">Quantity *</label><input id="updateCartQuantity" type="number" min="1" max={item.inventory_count} step="1" className="form-control" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /><div className="form-text">Available stock: {item.inventory_count}. Total will use the current product price.</div></div><div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Updating...' : 'Update Quantity'}</button></div></form></div></div></div><div className="modal-backdrop show" /></div>
}

function RemoveCartModal({ item, onClose, onRemoved }) {
  const [working, setWorking] = useState(false); const [error, setError] = useState('')
  const confirm = async () => { setWorking(true); setError(''); try { const response = await removeCart(item.cart_id); onRemoved(response.data.message) } catch (requestError) { setError(getErrorMessage(requestError)); setWorking(false) } }
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h2 className="modal-title fs-5">Remove Cart Item</h2><button className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}<div className="alert alert-warning mb-0">Remove <strong>{item.product_name}</strong> from {item.customer_name}&apos;s cart? Product inventory will not change.</div></div><div className="modal-footer"><button className="btn btn-outline-secondary" onClick={onClose} disabled={working}>Cancel</button><button className="btn btn-danger" onClick={confirm} disabled={working}>{working ? 'Removing...' : 'Remove Item'}</button></div></div></div></div><div className="modal-backdrop show" /></div>
}

function CartDashboard() {
  const [items, setItems] = useState([]); const [customers, setCustomers] = useState([]); const [products, setProducts] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [showAdd, setShowAdd] = useState(false); const [updateTarget, setUpdateTarget] = useState(null); const [removeTarget, setRemoveTarget] = useState(null)
  const activeCustomers = useMemo(() => customers.filter((customer) => Boolean(customer.status)), [customers])
  const activeProducts = useMemo(() => products.filter((product) => Boolean(product.status) && Number(product.inventory_count) > 0), [products])
  const totals = useMemo(() => ({ itemCount: items.reduce((sum, item) => sum + Number(item.quantity), 0), grandTotal: items.reduce((sum, item) => sum + Number(item.total_price), 0) }), [items])
  const load = useCallback(async () => { setLoading(true); setError(''); try { const response = await getCarts(); setItems(response.data.data) } catch (requestError) { setError(getErrorMessage(requestError)) } finally { setLoading(false) } }, [])
  useEffect(() => { getCarts().then((response) => setItems(response.data.data)).catch((requestError) => setError(getErrorMessage(requestError))).finally(() => setLoading(false)) }, [])
  useEffect(() => { Promise.all([getCustomers(), getProducts()]).then(([customerResponse, productResponse]) => { setCustomers(customerResponse.data.data); setProducts(productResponse.data.data) }).catch(() => {}) }, [])
  const completed = async (message) => { setShowAdd(false); setUpdateTarget(null); setRemoveTarget(null); setSuccess(message); await load() }
  return <section className="container-fluid px-3 px-lg-5 py-4 py-lg-5"><div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4"><div><h1 className="h2 mb-1">Cart Management</h1><p className="text-secondary mb-0">Manage customer cart items without reserving inventory.</p></div><button className="btn btn-primary align-self-start" disabled={activeCustomers.length === 0 || activeProducts.length === 0} onClick={() => { setShowAdd(true); setSuccess('') }}>+ Add to Cart</button></div>
    <div className="alert alert-info py-2 small">This is an admin-oriented customer selector. Secure customer-specific carts require future authentication and RBAC.</div>{success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')} aria-label="Close" /></div>}{error && <div className="alert alert-danger">{error}</div>}
    <div className="row g-3 mb-3"><div className="col-sm-6 col-lg-3"><div className="card border-0 shadow-sm"><div className="card-body"><span className="text-secondary d-block">Total Items</span><strong className="fs-4">{totals.itemCount}</strong></div></div></div><div className="col-sm-6 col-lg-3"><div className="card border-0 shadow-sm"><div className="card-body"><span className="text-secondary d-block">Grand Total</span><strong className="fs-4">{formatMoney(totals.grandTotal)}</strong></div></div></div></div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="text-center text-secondary p-5 mb-0">Loading carts...</p> : items.length === 0 && !error ? <p className="text-center text-secondary p-5 mb-0">No cart items found.</p> : <div className="table-responsive"><table className="table table-hover align-middle mb-0 cart-table"><thead className="table-light"><tr><th>Cart ID</th><th>Customer</th><th>Product</th><th>Current Price</th><th>Quantity</th><th>Total Price</th><th>Created At</th><th>Updated At</th><th>Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item.cart_id}><td>{item.cart_id}</td><td>{item.customer_name}</td><td>{item.product_name}</td><td>{formatMoney(item.product_price)}</td><td>{item.quantity}</td><td>{formatMoney(item.total_price)}</td><td className="text-nowrap">{formatDate(item.created_at)}</td><td className="text-nowrap">{formatDate(item.updated_at)}</td><td><div className="d-flex gap-2"><button className="btn btn-sm btn-outline-primary" onClick={() => { setUpdateTarget(item); setSuccess('') }}>Update Quantity</button><button className="btn btn-sm btn-outline-danger" onClick={() => { setRemoveTarget(item); setSuccess('') }}>Remove</button></div></td></tr>)}</tbody></table></div>}</div></div>
    {showAdd && <AddCartModal customers={activeCustomers} products={activeProducts} onClose={() => setShowAdd(false)} onSaved={completed} />}{updateTarget && <UpdateCartModal item={updateTarget} onClose={() => setUpdateTarget(null)} onSaved={completed} />}{removeTarget && <RemoveCartModal item={removeTarget} onClose={() => setRemoveTarget(null)} onRemoved={completed} />}
  </section>
}

export default CartDashboard

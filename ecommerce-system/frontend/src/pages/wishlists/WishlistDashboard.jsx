import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCustomers } from '../../services/customerService'
import { getProducts } from '../../services/productService'
import { addToWishlist, getCustomerWishlist, getWishlists, moveWishlistToCart, removeWishlist } from '../../services/wishlistService'

const getErrorMessage = (error) => !error.response ? 'Backend server is currently unavailable.' : error.response.data?.message || 'Something went wrong. Please try again.'
const formatMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

function AddWishlistModal({ customers, products, onClose, onSaved }) {
  const [customerId, setCustomerId] = useState(''); const [productId, setProductId] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    if (!customerId) return setError('Select an active customer.')
    if (!productId) return setError('Select an active product.')
    setSaving(true); setError('')
    try { const response = await addToWishlist({ customer_id: Number(customerId), product_id: Number(productId) }); onSaved(response.data.message) } catch (requestError) { setError(getErrorMessage(requestError)); setSaving(false) }
  }
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><form onSubmit={submit}><div className="modal-header"><h2 className="modal-title fs-5">Add to Wishlist</h2><button type="button" className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}
    <div className="mb-3"><label className="form-label" htmlFor="wishlistCustomer">Customer *</label><select id="wishlistCustomer" className="form-select" value={customerId} onChange={(event) => setCustomerId(event.target.value)} required><option value="">Select a customer</option>{customers.map((customer) => <option key={customer.user_id} value={customer.user_id}>{customer.full_name} — {customer.email}</option>)}</select></div>
    <div><label className="form-label" htmlFor="wishlistProduct">Product *</label><select id="wishlistProduct" className="form-select" value={productId} onChange={(event) => setProductId(event.target.value)} required><option value="">Select a product</option>{products.map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name} — {formatMoney(product.price)}</option>)}</select></div>
  </div><div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Adding...' : 'Add to Wishlist'}</button></div></form></div></div></div><div className="modal-backdrop show" /></div>
}

function ConfirmModal({ item, action, onClose, onCompleted }) {
  const [working, setWorking] = useState(false); const [error, setError] = useState(''); const isMove = action === 'move'
  const confirm = async () => { setWorking(true); setError(''); try { const response = isMove ? await moveWishlistToCart(item.wishlist_id) : await removeWishlist(item.wishlist_id); onCompleted(response.data.message) } catch (requestError) { setError(getErrorMessage(requestError)); setWorking(false) } }
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h2 className="modal-title fs-5">{isMove ? 'Move to Cart' : 'Remove Wishlist Item'}</h2><button className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}<div className="alert alert-warning mb-0">{isMove ? <>Move <strong>{item.product_name}</strong> to {item.customer_name}&apos;s cart with quantity 1? The wishlist item is removed only if the cart update succeeds.</> : <>Remove <strong>{item.product_name}</strong> from {item.customer_name}&apos;s wishlist? Cart and inventory will remain unchanged.</>}</div></div><div className="modal-footer"><button className="btn btn-outline-secondary" onClick={onClose} disabled={working}>Cancel</button><button className={`btn ${isMove ? 'btn-primary' : 'btn-danger'}`} onClick={confirm} disabled={working}>{working ? 'Working...' : isMove ? 'Move to Cart' : 'Remove'}</button></div></div></div></div><div className="modal-backdrop show" /></div>
}

function WishlistDashboard() {
  const [items, setItems] = useState([]); const [customers, setCustomers] = useState([]); const [products, setProducts] = useState([]); const [customerFilter, setCustomerFilter] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [showAdd, setShowAdd] = useState(false); const [confirmation, setConfirmation] = useState(null)
  const activeCustomers = useMemo(() => customers.filter((customer) => Boolean(customer.status)), [customers])
  const activeProducts = useMemo(() => products.filter((product) => Boolean(product.status)), [products])
  const load = useCallback(async () => { setLoading(true); setError(''); try { const response = customerFilter ? await getCustomerWishlist(customerFilter) : await getWishlists(); setItems(response.data.data) } catch (requestError) { setError(getErrorMessage(requestError)) } finally { setLoading(false) } }, [customerFilter])
  useEffect(() => {
    const request = customerFilter ? getCustomerWishlist(customerFilter) : getWishlists()
    request.then((response) => setItems(response.data.data)).catch((requestError) => setError(getErrorMessage(requestError))).finally(() => setLoading(false))
  }, [customerFilter])
  useEffect(() => { Promise.all([getCustomers(), getProducts()]).then(([customerResponse, productResponse]) => { setCustomers(customerResponse.data.data); setProducts(productResponse.data.data) }).catch(() => {}) }, [])
  const completed = async (message) => { setShowAdd(false); setConfirmation(null); setSuccess(message); await load() }
  return <section className="container-fluid px-3 px-lg-5 py-4 py-lg-5"><div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4"><div><h1 className="h2 mb-1">Wishlist Management</h1><p className="text-secondary mb-0">Manage saved products and move eligible items to customer carts.</p></div><button className="btn btn-primary align-self-start" disabled={activeCustomers.length === 0 || activeProducts.length === 0} onClick={() => { setShowAdd(true); setSuccess('') }}>+ Add to Wishlist</button></div>
    <div className="alert alert-info py-2 small">This uses an explicit admin-oriented customer selector. A secure My Wishlist experience requires authentication and RBAC.</div>{success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')} aria-label="Close" /></div>}{error && <div className="alert alert-danger">{error}</div>}
    <div className="row mb-3"><div className="col-sm-8 col-md-5 col-lg-4"><label className="form-label" htmlFor="wishlistFilter">Customer Wishlist</label><select id="wishlistFilter" className="form-select" value={customerFilter} onChange={(event) => { setCustomerFilter(event.target.value); setLoading(true); setError('') }}><option value="">All customers</option>{customers.map((customer) => <option key={customer.user_id} value={customer.user_id}>{customer.full_name} — {customer.email}</option>)}</select></div></div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="text-center text-secondary p-5 mb-0">Loading wishlist...</p> : items.length === 0 && !error ? <p className="text-center text-secondary p-5 mb-0">No wishlist items found.</p> : <div className="table-responsive"><table className="table table-hover align-middle mb-0 wishlist-table"><thead className="table-light"><tr><th>Wishlist ID</th><th>Customer</th><th>Product</th><th>Current Price</th><th>Availability</th><th>Created At</th><th>Updated At</th><th>Actions</th></tr></thead><tbody>{items.map((item) => { const available = Boolean(item.product_status) && Number(item.inventory_count) > 0; return <tr key={item.wishlist_id}><td>{item.wishlist_id}</td><td>{item.customer_name}</td><td>{item.product_name}</td><td>{formatMoney(item.product_price)}</td><td><span className={`badge ${available ? 'text-bg-success' : 'text-bg-secondary'}`}>{!item.product_status ? 'Inactive' : Number(item.inventory_count) === 0 ? 'Out of Stock' : `Available (${item.inventory_count})`}</span></td><td className="text-nowrap">{formatDate(item.created_at)}</td><td className="text-nowrap">{formatDate(item.updated_at)}</td><td><div className="d-flex gap-2"><button className="btn btn-sm btn-outline-primary" disabled={!available} onClick={() => { setConfirmation({ item, action: 'move' }); setSuccess('') }}>Move to Cart</button><button className="btn btn-sm btn-outline-danger" onClick={() => { setConfirmation({ item, action: 'remove' }); setSuccess('') }}>Remove</button></div></td></tr> })}</tbody></table></div>}</div></div>
    {showAdd && <AddWishlistModal customers={activeCustomers} products={activeProducts} onClose={() => setShowAdd(false)} onSaved={completed} />}{confirmation && <ConfirmModal {...confirmation} onClose={() => setConfirmation(null)} onCompleted={completed} />}
  </section>
}

export default WishlistDashboard

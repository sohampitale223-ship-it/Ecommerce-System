import { useCallback, useEffect, useState } from 'react'
import { getCategories } from '../../services/categoryService'
import { createProduct, deactivateProduct, getProducts, updateProduct } from '../../services/productService'

const emptyForm = {
  product_name: '', description: '', price: '', SKU: '', category_id: '', inventory_count: '',
}

const getErrorMessage = (error) => {
  if (!error.response) return 'Backend server is currently unavailable.'
  return error.response.data?.message || 'Something went wrong. Please try again.'
}

function ProductFormModal({ product, categories, onClose, onSaved }) {
  const [form, setForm] = useState(product ? {
    product_name: product.product_name,
    description: product.description || '',
    price: product.price,
    SKU: product.SKU,
    category_id: String(product.category_id),
    inventory_count: product.inventory_count,
  } : emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    const productName = form.product_name.trim()
    const description = form.description.trim()
    const sku = form.SKU.trim()
    const price = Number(form.price)
    const inventoryCount = Number(form.inventory_count)

    if (!productName) return setError('Product name is required.')
    if (productName.length > 150) return setError('Product name cannot exceed 150 characters.')
    if (description.length > 500) return setError('Description cannot exceed 500 characters.')
    if (form.price === '' || !Number.isFinite(price) || price < 0 || price > 99999999.99) return setError('Price must be between 0 and 99999999.99.')
    if (!sku) return setError('SKU is required.')
    if (sku.length > 50) return setError('SKU cannot exceed 50 characters.')
    if (!form.category_id) return setError('Category is required.')
    if (form.inventory_count === '' || !Number.isInteger(inventoryCount) || inventoryCount < 0) return setError('Inventory count must be a non-negative whole number.')

    setSaving(true)
    setError('')
    try {
      const payload = {
        product_name: productName,
        description,
        price,
        SKU: sku,
        category_id: Number(form.category_id),
        inventory_count: inventoryCount,
      }
      const response = product
        ? await updateProduct(product.product_id, payload)
        : await createProduct(payload)
      onSaved(response.data.message)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true" aria-labelledby="productModalTitle">
      <div className="modal d-block" tabIndex="-1">
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h2 className="modal-title fs-5" id="productModalTitle">{product ? 'Edit Product' : 'Add Product'}</h2>
                <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label" htmlFor="productName">Product Name *</label>
                    <input className="form-control" id="productName" maxLength="150" value={form.product_name} onChange={(event) => setField('product_name', event.target.value)} autoFocus required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="productSku">SKU *</label>
                    <input className="form-control" id="productSku" maxLength="50" value={form.SKU} onChange={(event) => setField('SKU', event.target.value)} required />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="productDescription">Description</label>
                    <textarea className="form-control" id="productDescription" rows="3" maxLength="500" value={form.description} onChange={(event) => setField('description', event.target.value)} />
                    <div className="form-text text-end">{form.description.length}/500</div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="productPrice">Price *</label>
                    <input className="form-control" id="productPrice" type="number" min="0" max="99999999.99" step="0.01" value={form.price} onChange={(event) => setField('price', event.target.value)} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="productCategory">Category *</label>
                    <select className="form-select" id="productCategory" value={form.category_id} onChange={(event) => setField('category_id', event.target.value)} required>
                      <option value="">Select a category</option>
                      {categories.map((category) => <option key={category.category_id} value={category.category_id}>{category.category_name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="productInventory">Inventory Count *</label>
                    <input className="form-control" id="productInventory" type="number" min="0" step="1" value={form.inventory_count} onChange={(event) => setField('inventory_count', event.target.value)} required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Product'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </div>
  )
}

function DeactivateModal({ product, onClose, onConfirmed }) {
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  const handleDeactivate = async () => {
    setWorking(true)
    setError('')
    try {
      const response = await deactivateProduct(product.product_id)
      onConfirmed(response.data.message)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      setWorking(false)
    }
  }

  return (
    <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true" aria-labelledby="deactivateProductTitle">
      <div className="modal d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5" id="deactivateProductTitle">Deactivate Product</h2>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger" role="alert">{error}</div>}
              <div className="alert alert-warning">This product will become inactive but will remain in the database.</div>
              <p className="mb-1">Are you sure you want to deactivate:</p>
              <p className="fw-semibold mb-0">{product.product_name} ({product.SKU})</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={working}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDeactivate} disabled={working}>{working ? 'Deactivating...' : 'Deactivate'}</button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </div>
  )
}

function ProductDashboard() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formProduct, setFormProduct] = useState(undefined)
  const [showForm, setShowForm] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [productsResponse, categoriesResponse] = await Promise.all([getProducts(), getCategories()])
      setProducts(productsResponse.data.data)
      setCategories(categoriesResponse.data.data.filter((category) => Boolean(category.status)))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([getProducts(), getCategories()])
      .then(([productsResponse, categoriesResponse]) => {
        setProducts(productsResponse.data.data)
        setCategories(categoriesResponse.data.data.filter((category) => Boolean(category.status)))
      })
      .catch((requestError) => setError(getErrorMessage(requestError)))
      .finally(() => setLoading(false))
  }, [])

  const handleCompleted = async (message) => {
    setShowForm(false)
    setDeactivateTarget(null)
    setSuccess(message)
    await loadData()
  }

  const formatDate = (value) => value
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—'
  const formatPrice = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))

  return (
    <section className="container-fluid px-3 px-lg-5 py-4 py-lg-5">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div><h1 className="h2 mb-1">Product Management</h1><p className="text-secondary mb-0">Manage products and inventory for ShopEase.</p></div>
        <button className="btn btn-primary align-self-start align-self-sm-center" disabled={categories.length === 0} onClick={() => { setFormProduct(undefined); setShowForm(true); setSuccess('') }}>+ Add Product</button>
      </div>

      {success && <div className="alert alert-success alert-dismissible" role="alert">{success}<button className="btn-close" onClick={() => setSuccess('')} aria-label="Close" /></div>}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {!loading && categories.length === 0 && !error && <div className="alert alert-warning">Add an active category before adding products.</div>}

      <div className="card border-0 shadow-sm"><div className="card-body p-0">
        {loading ? <p className="text-center text-secondary p-5 mb-0">Loading products...</p>
          : products.length === 0 && !error ? <p className="text-center text-secondary p-5 mb-0">No products found. Add your first product to get started.</p>
            : <div className="table-responsive"><table className="table table-hover align-middle mb-0 product-table">
              <thead className="table-light"><tr><th>ID</th><th>Product Name</th><th>Description</th><th>Category</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th>Created At</th><th>Actions</th></tr></thead>
              <tbody>{products.map((product) => <tr key={product.product_id}>
                <td>{product.product_id}</td><td className="fw-semibold">{product.product_name}</td><td className="product-description">{product.description || '—'}</td>
                <td>{product.category_name}</td><td className="text-nowrap">{product.SKU}</td><td className="text-nowrap">{formatPrice(product.price)}</td><td>{product.inventory_count}</td>
                <td><span className={`badge ${product.status ? 'text-bg-success' : 'text-bg-secondary'}`}>{product.status ? 'Active' : 'Inactive'}</span></td>
                <td className="text-nowrap">{formatDate(product.created_at)}</td><td><div className="d-flex gap-2">
                  <button className="btn btn-sm btn-outline-primary" onClick={() => { setFormProduct(product); setShowForm(true); setSuccess('') }}>Edit</button>
                  {Boolean(product.status) && <button className="btn btn-sm btn-outline-danger" onClick={() => { setDeactivateTarget(product); setSuccess('') }}>Deactivate</button>}
                </div></td>
              </tr>)}</tbody>
            </table></div>}
      </div></div>

      {showForm && <ProductFormModal product={formProduct} categories={categories} onClose={() => setShowForm(false)} onSaved={handleCompleted} />}
      {deactivateTarget && <DeactivateModal product={deactivateTarget} onClose={() => setDeactivateTarget(null)} onConfirmed={handleCompleted} />}
    </section>
  )
}

export default ProductDashboard

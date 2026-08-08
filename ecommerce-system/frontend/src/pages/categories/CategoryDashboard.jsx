import { useCallback, useEffect, useState } from 'react'
import {
  createCategory,
  deactivateCategory,
  getCategories,
  updateCategory,
} from '../../services/categoryService'

const emptyForm = { category_name: '', description: '' }

const getErrorMessage = (error) => {
  if (!error.response) return 'Backend server is currently unavailable.'
  return error.response.data?.message || 'Something went wrong. Please try again.'
}

function CategoryFormModal({ category, onClose, onSaved }) {
  const [form, setForm] = useState(category ? {
    category_name: category.category_name,
    description: category.description || '',
  } : emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const categoryName = form.category_name.trim()
    const description = form.description.trim()

    if (!categoryName) return setError('Category name is required.')
    if (categoryName.length > 100) return setError('Category name cannot exceed 100 characters.')
    if (description.length > 300) return setError('Description cannot exceed 300 characters.')

    setSaving(true)
    setError('')
    try {
      const payload = { category_name: categoryName, description }
      const response = category
        ? await updateCategory(category.category_id, payload)
        : await createCategory(payload)
      onSaved(response.data.message)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true" aria-labelledby="categoryModalTitle">
      <div className="modal d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h2 className="modal-title fs-5" id="categoryModalTitle">
                  {category ? 'Edit Category' : 'Add Category'}
                </h2>
                <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                <div className="mb-3">
                  <label className="form-label" htmlFor="categoryName">Category Name *</label>
                  <input
                    className="form-control"
                    id="categoryName"
                    maxLength="100"
                    value={form.category_name}
                    onChange={(event) => setForm({ ...form, category_name: event.target.value })}
                    autoFocus
                    required
                  />
                  <div className="form-text">Maximum 100 characters.</div>
                </div>
                <div>
                  <label className="form-label" htmlFor="categoryDescription">Description</label>
                  <textarea
                    className="form-control"
                    id="categoryDescription"
                    rows="4"
                    maxLength="300"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                  />
                  <div className="form-text text-end">{form.description.length}/300</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </div>
  )
}

function DeactivateModal({ category, onClose, onConfirmed }) {
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  const handleDeactivate = async () => {
    setWorking(true)
    setError('')
    try {
      const response = await deactivateCategory(category.category_id)
      onConfirmed(response.data.message)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      setWorking(false)
    }
  }

  return (
    <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true" aria-labelledby="deactivateModalTitle">
      <div className="modal d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5" id="deactivateModalTitle">Deactivate Category</h2>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger" role="alert">{error}</div>}
              <p>Are you sure you want to deactivate this category?</p>
              <p className="fw-semibold mb-0">{category.category_name}</p>
              {Number(category.product_count) > 0 && (
                <div className="alert alert-warning mt-3 mb-0">
                  This category contains products. Please assign those products to another category before deactivating it.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={working}>Cancel</button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeactivate}
                disabled={working || Number(category.product_count) > 0}
              >
                {working ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </div>
  )
}

function CategoryDashboard() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formCategory, setFormCategory] = useState(undefined)
  const [showForm, setShowForm] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState(null)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getCategories()
      setCategories(response.data.data)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    getCategories()
      .then((response) => setCategories(response.data.data))
      .catch((requestError) => setError(getErrorMessage(requestError)))
      .finally(() => setLoading(false))
  }, [])

  const handleCompleted = async (message) => {
    setShowForm(false)
    setDeactivateTarget(null)
    setSuccess(message)
    await loadCategories()
  }

  const formatDate = (value) => value
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—'

  return (
    <section className="container py-4 py-lg-5">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h2 mb-1">Category Management</h1>
          <p className="text-secondary mb-0">Manage product categories for ShopEase.</p>
        </div>
        <button
          className="btn btn-primary align-self-start align-self-sm-center"
          onClick={() => { setFormCategory(undefined); setShowForm(true); setSuccess('') }}
        >
          + Add Category
        </button>
      </div>

      {success && <div className="alert alert-success alert-dismissible" role="alert">{success}<button className="btn-close" onClick={() => setSuccess('')} aria-label="Close" /></div>}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <p className="text-center text-secondary p-5 mb-0">Loading categories...</p>
          ) : categories.length === 0 && !error ? (
            <p className="text-center text-secondary p-5 mb-0">No categories found. Add your first category to get started.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">ID</th><th scope="col">Category Name</th><th scope="col">Description</th>
                    <th scope="col">Products</th><th scope="col">Status</th><th scope="col">Created At</th><th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.category_id}>
                      <td>{category.category_id}</td>
                      <td className="fw-semibold">{category.category_name}</td>
                      <td className="category-description">{category.description || '—'}</td>
                      <td>{category.product_count}</td>
                      <td><span className={`badge ${category.status ? 'text-bg-success' : 'text-bg-secondary'}`}>{category.status ? 'Active' : 'Inactive'}</span></td>
                      <td className="text-nowrap">{formatDate(category.created_at)}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => { setFormCategory(category); setShowForm(true); setSuccess('') }}>Edit</button>
                          {Boolean(category.status) && <button className="btn btn-sm btn-outline-danger" onClick={() => { setDeactivateTarget(category); setSuccess('') }}>Deactivate</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && <CategoryFormModal category={formCategory} onClose={() => setShowForm(false)} onSaved={handleCompleted} />}
      {deactivateTarget && <DeactivateModal category={deactivateTarget} onClose={() => setDeactivateTarget(null)} onConfirmed={handleCompleted} />}
    </section>
  )
}

export default CategoryDashboard

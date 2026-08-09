import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCustomers } from '../../services/customerService'
import { getProducts } from '../../services/productService'
import { approveReview, createReview, deleteReview, getEligibleReviewProducts, getProductReviewSummary, getReviewById, getReviews, unapproveReview, updateReview } from '../../services/reviewService'

const filters = [
  { label: 'All', status: '', rating: '' }, { label: 'Approved', status: 'approved', rating: '' }, { label: 'Pending', status: 'pending', rating: '' },
  ...[1, 2, 3, 4, 5].map((rating) => ({ label: `${rating} Star${rating > 1 ? 's' : ''}`, status: '', rating })),
]
const getErrorMessage = (error) => !error.response ? 'Backend server is currently unavailable.' : error.response.data?.message || 'Something went wrong. Please try again.'
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
const stars = (rating) => `${'★'.repeat(Number(rating))}${'☆'.repeat(5 - Number(rating))}`

function ReviewFormModal({ review, customers, onClose, onSaved }) {
  const [customerId, setCustomerId] = useState(review?.customer_id || '')
  const [productId, setProductId] = useState(review?.product_id || '')
  const [eligibleProducts, setEligibleProducts] = useState([])
  const [rating, setRating] = useState(review?.rating || 5)
  const [reviewText, setReviewText] = useState(review?.review_text || '')
  const [loadingProducts, setLoadingProducts] = useState(false); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (review || !customerId) return
    getEligibleReviewProducts(customerId).then((response) => setEligibleProducts(response.data.data)).catch((requestError) => setError(getErrorMessage(requestError))).finally(() => setLoadingProducts(false))
  }, [customerId, review])
  const changeCustomer = (event) => {
    setCustomerId(event.target.value); setProductId(''); setEligibleProducts([]); setError('')
    setLoadingProducts(Boolean(event.target.value))
  }
  const submit = async (event) => {
    event.preventDefault(); const numericRating = Number(rating); const text = reviewText.trim()
    if (!review && !customerId) return setError('Select an active customer.')
    if (!review && !productId) return setError('Select a delivered purchased product.')
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) return setError('Rating must be between 1 and 5.')
    if (!text) return setError('Review text is required.')
    if (text.length > 1000) return setError('Review text cannot exceed 1000 characters.')
    setSaving(true); setError('')
    try {
      const payload = { rating: numericRating, review_text: text, ...(!review ? { customer_id: Number(customerId), product_id: Number(productId) } : {}) }
      const response = review ? await updateReview(review.review_id, payload) : await createReview(payload)
      onSaved(response.data.message)
    } catch (requestError) { setError(getErrorMessage(requestError)); setSaving(false) }
  }
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><form onSubmit={submit}><div className="modal-header"><h2 className="modal-title fs-5">{review ? 'Edit Review' : 'Add Review'}</h2><button type="button" className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}
    {review ? <div className="alert alert-info small">Editing {review.customer_name}&apos;s review for {review.product_name}. Saving returns it to Pending moderation.</div> : <><div className="mb-3"><label className="form-label" htmlFor="reviewCustomer">Customer *</label><select id="reviewCustomer" className="form-select" value={customerId} onChange={changeCustomer} required><option value="">Select a customer</option>{customers.map((customer) => <option key={customer.user_id} value={customer.user_id}>{customer.full_name} — {customer.email}</option>)}</select></div><div className="mb-3"><label className="form-label" htmlFor="reviewProduct">Delivered Purchased Product *</label><select id="reviewProduct" className="form-select" value={productId} onChange={(event) => setProductId(event.target.value)} disabled={!customerId || loadingProducts} required><option value="">{loadingProducts ? 'Loading eligible products...' : 'Select a product'}</option>{eligibleProducts.map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name}</option>)}</select>{customerId && !loadingProducts && eligibleProducts.length === 0 && <div className="form-text text-warning">No unreviewed products from Delivered orders are available.</div>}</div></>}
    <div className="mb-3"><label className="form-label" htmlFor="reviewRating">Rating *</label><select id="reviewRating" className="form-select" value={rating} onChange={(event) => setRating(event.target.value)}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{stars(value)} ({value}/5)</option>)}</select></div>
    <div><label className="form-label" htmlFor="reviewText">Review Text *</label><textarea id="reviewText" className="form-control" rows="5" maxLength="1000" value={reviewText} onChange={(event) => setReviewText(event.target.value)} required /><div className="form-text text-end">{reviewText.length}/1000</div></div>
  </div><div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Review'}</button></div></form></div></div></div><div className="modal-backdrop show" /></div>
}

function ReviewDetailsModal({ reviewId, onClose }) {
  const [review, setReview] = useState(null); const [summary, setSummary] = useState(null); const [error, setError] = useState('')
  useEffect(() => { getReviewById(reviewId).then(async (response) => { setReview(response.data.data); const summaryResponse = await getProductReviewSummary(response.data.data.product_id); setSummary(summaryResponse.data.data) }).catch((requestError) => setError(getErrorMessage(requestError))) }, [reviewId])
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h2 className="modal-title fs-5">Review #{reviewId}</h2><button className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">{error ? <div className="alert alert-danger">{error}</div> : !review ? <p className="text-center text-secondary py-4">Loading review...</p> : <><div className="row g-3 mb-4"><div className="col-md-4"><span className="text-secondary d-block">Customer</span>{review.customer_name}</div><div className="col-md-4"><span className="text-secondary d-block">Product</span>{review.product_name}</div><div className="col-md-4"><span className="text-secondary d-block">Rating</span><span className="text-warning fs-5">{stars(review.rating)}</span> ({review.rating}/5)</div><div className="col-12"><span className="text-secondary d-block">Review</span>{review.review_text}</div></div>{summary && <div className="alert alert-light border mb-0"><strong>Approved product statistics:</strong> {summary.average_rating.toFixed(2)}/5 average from {summary.review_count} review(s).</div>}</>}</div><div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Close</button></div></div></div></div><div className="modal-backdrop show" /></div>
}

function ConfirmModal({ review, action, onClose, onCompleted }) {
  const [working, setWorking] = useState(false); const [error, setError] = useState('')
  const labels = { approve: 'Approve Review', unapprove: 'Return to Pending', delete: 'Delete Review' }
  const confirm = async () => { setWorking(true); setError(''); try { const response = action === 'approve' ? await approveReview(review.review_id) : action === 'unapprove' ? await unapproveReview(review.review_id) : await deleteReview(review.review_id); onCompleted(response.data.message) } catch (requestError) { setError(getErrorMessage(requestError)); setWorking(false) } }
  return <div className="modal-backdrop-wrapper" role="dialog" aria-modal="true"><div className="modal d-block" tabIndex="-1"><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h2 className="modal-title fs-5">{labels[action]}</h2><button className="btn-close" onClick={onClose} aria-label="Close" /></div><div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}<div className={`alert ${action === 'delete' ? 'alert-danger' : 'alert-warning'} mb-0`}>{action === 'delete' ? <>Permanently delete review #{review.review_id} by <strong>{review.customer_name}</strong>? This cannot be undone.</> : <>{labels[action]} for <strong>{review.product_name}</strong>?</>}</div></div><div className="modal-footer"><button className="btn btn-outline-secondary" onClick={onClose} disabled={working}>Cancel</button><button className={`btn ${action === 'delete' ? 'btn-danger' : 'btn-primary'}`} onClick={confirm} disabled={working}>{working ? 'Working...' : labels[action]}</button></div></div></div></div><div className="modal-backdrop show" /></div>
}

function ReviewDashboard() {
  const [reviews, setReviews] = useState([]); const [customers, setCustomers] = useState([]); const [products, setProducts] = useState([]); const [filterIndex, setFilterIndex] = useState(0); const [productFilter, setProductFilter] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [formReview, setFormReview] = useState(); const [showForm, setShowForm] = useState(false); const [detailsId, setDetailsId] = useState(null); const [confirmation, setConfirmation] = useState(null)
  const activeCustomers = useMemo(() => customers.filter((customer) => Boolean(customer.status)), [customers])
  const selectedFilter = filters[filterIndex]
  const load = useCallback(async () => { setLoading(true); setError(''); try { const response = await getReviews({ status: selectedFilter.status, rating: selectedFilter.rating, productId: productFilter }); setReviews(response.data.data) } catch (requestError) { setError(getErrorMessage(requestError)) } finally { setLoading(false) } }, [productFilter, selectedFilter.rating, selectedFilter.status])
  useEffect(() => { getReviews({ status: selectedFilter.status, rating: selectedFilter.rating, productId: productFilter }).then((response) => setReviews(response.data.data)).catch((requestError) => setError(getErrorMessage(requestError))).finally(() => setLoading(false)) }, [productFilter, selectedFilter.rating, selectedFilter.status])
  useEffect(() => { Promise.all([getCustomers(), getProducts()]).then(([customerResponse, productResponse]) => { setCustomers(customerResponse.data.data); setProducts(productResponse.data.data) }).catch(() => {}) }, [])
  const completed = async (message) => { setShowForm(false); setConfirmation(null); setSuccess(message); await load() }
  return <section className="container-fluid px-3 px-lg-5 py-4 py-lg-5"><div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4"><div><h1 className="h2 mb-1">Review &amp; Rating Management</h1><p className="text-secondary mb-0">Manage customer product reviews, ratings, moderation, and product feedback.</p></div><button className="btn btn-primary align-self-start" disabled={activeCustomers.length === 0} onClick={() => { setFormReview(undefined); setShowForm(true); setSuccess('') }}>+ Add Review</button></div>
    <div className="alert alert-info py-2 small">This dashboard is admin-oriented. Secure customer review ownership and moderation require authentication and RBAC.</div>{success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')} aria-label="Close" /></div>}{error && <div className="alert alert-danger">{error}</div>}
    <div className="d-flex flex-wrap gap-2 mb-3" aria-label="Filter reviews">{filters.map((filter, index) => <button key={filter.label} className={`btn btn-sm ${filterIndex === index ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setFilterIndex(index); setLoading(true); setError('') }}>{filter.label}</button>)}</div>
    <div className="row mb-3"><div className="col-sm-8 col-md-5 col-lg-4"><label className="form-label" htmlFor="reviewProductFilter">Product</label><select id="reviewProductFilter" className="form-select" value={productFilter} onChange={(event) => { setProductFilter(event.target.value); setLoading(true); setError('') }}><option value="">All products</option>{products.map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name}</option>)}</select></div></div>
    <div className="card border-0 shadow-sm"><div className="card-body p-0">{loading ? <p className="text-center text-secondary p-5 mb-0">Loading reviews...</p> : reviews.length === 0 && !error ? <p className="text-center text-secondary p-5 mb-0">No reviews found.</p> : <div className="table-responsive"><table className="table table-hover align-middle mb-0 review-table"><thead className="table-light"><tr><th>Review ID</th><th>Customer</th><th>Product</th><th>Rating</th><th>Review</th><th>Status</th><th>Created At</th><th>Updated At</th><th>Actions</th></tr></thead><tbody>{reviews.map((review) => <tr key={review.review_id}><td>{review.review_id}</td><td>{review.customer_name}</td><td>{review.product_name}</td><td className="text-nowrap"><span className="text-warning">{stars(review.rating)}</span> ({review.rating})</td><td className="review-text">{review.review_text}</td><td><span className={`badge ${review.status ? 'text-bg-success' : 'text-bg-secondary'}`}>{review.status ? 'Approved' : 'Pending'}</span></td><td className="text-nowrap">{formatDate(review.created_at)}</td><td className="text-nowrap">{formatDate(review.updated_at)}</td><td><div className="d-flex flex-wrap gap-2"><button className="btn btn-sm btn-outline-secondary" onClick={() => setDetailsId(review.review_id)}>View</button><button className="btn btn-sm btn-outline-primary" onClick={() => { setFormReview(review); setShowForm(true); setSuccess('') }}>Edit</button><button className={`btn btn-sm ${review.status ? 'btn-outline-warning' : 'btn-outline-success'}`} onClick={() => { setConfirmation({ review, action: review.status ? 'unapprove' : 'approve' }); setSuccess('') }}>{review.status ? 'Unapprove' : 'Approve'}</button><button className="btn btn-sm btn-outline-danger" onClick={() => { setConfirmation({ review, action: 'delete' }); setSuccess('') }}>Delete</button></div></td></tr>)}</tbody></table></div>}</div></div>
    {showForm && <ReviewFormModal review={formReview} customers={activeCustomers} onClose={() => setShowForm(false)} onSaved={completed} />}{detailsId && <ReviewDetailsModal reviewId={detailsId} onClose={() => setDetailsId(null)} />}{confirmation && <ConfirmModal {...confirmation} onClose={() => setConfirmation(null)} onCompleted={completed} />}
  </section>
}

export default ReviewDashboard

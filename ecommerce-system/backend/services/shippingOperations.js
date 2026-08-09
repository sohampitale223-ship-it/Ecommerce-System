export const SHIPPING_STATUSES = ['Pending', 'Shipped', 'In Transit', 'Delivered']
export const SHIPPING_TRANSITIONS = {
  Pending: 'Shipped',
  Shipped: 'In Transit',
  'In Transit': 'Delivered',
}

export const calculateShippingCost = (orderTotal) => {
  const total = Number(orderTotal)
  if (!Number.isFinite(total) || total < 0) return null
  return total < 500 ? '50.00' : '0.00'
}

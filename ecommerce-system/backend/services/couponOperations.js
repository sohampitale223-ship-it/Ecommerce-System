export const normalizeCouponCode = (value) => typeof value === 'string' ? value.trim().toUpperCase() : ''

export const couponAvailabilityError = (coupon, now = new Date()) => {
  if (!coupon.status) return { status: 422, message: 'Coupon is inactive.' }
  if (now < new Date(coupon.valid_from)) return { status: 422, message: 'Coupon is not active yet.' }
  if (now > new Date(coupon.valid_to)) return { status: 422, message: 'Coupon has expired.' }
  if (Number(coupon.used_count) >= Number(coupon.usage_limit)) return { status: 409, message: 'Coupon usage limit has been reached.' }
  const value = Number(coupon.discount_value)
  if (!(value > 0) || (coupon.discount_type === 'Percentage' && value > 100) || !['Percentage', 'Fixed'].includes(coupon.discount_type)) {
    return { status: 422, message: 'Coupon discount configuration is invalid.' }
  }
  return null
}

export const calculateDiscount = (orderTotal, coupon) => {
  const subtotalCents = Math.round(Number(orderTotal) * 100)
  const valueCents = Math.round(Number(coupon.discount_value) * 100)
  const calculated = coupon.discount_type === 'Percentage'
    ? Math.round(subtotalCents * Number(coupon.discount_value) / 100)
    : valueCents
  const discountCents = Math.min(calculated, subtotalCents)
  return {
    subtotal_amount: (subtotalCents / 100).toFixed(2),
    discount_amount: (discountCents / 100).toFixed(2),
    final_total: ((subtotalCents - discountCents) / 100).toFixed(2),
  }
}

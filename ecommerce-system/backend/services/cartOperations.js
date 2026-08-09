export class CartOperationError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const calculateTotal = (price, quantity) => {
  const priceCents = Math.round(Number(price) * 100)
  const totalCents = priceCents * quantity
  if (!Number.isSafeInteger(priceCents) || priceCents < 0 || !Number.isSafeInteger(totalCents) || totalCents > 9999999999) return null
  return (totalCents / 100).toFixed(2)
}

export const addProductToCart = async (connection, { customerId, productId, quantity }) => {
  const [customers] = await connection.execute('SELECT user_id, status FROM users WHERE user_id = ? FOR UPDATE', [customerId])
  if (customers.length === 0) throw new CartOperationError(404, 'Customer not found.')
  if (!customers[0].status) throw new CartOperationError(409, 'Inactive customers cannot add cart items.')

  const [products] = await connection.execute(
    'SELECT product_id, product_name, price, inventory_count, status FROM products WHERE product_id = ? FOR UPDATE',
    [productId],
  )
  if (products.length === 0) throw new CartOperationError(404, 'Product not found.')
  const product = products[0]
  if (!product.status) throw new CartOperationError(409, 'Inactive products cannot be added to a cart.')

  const [existing] = await connection.execute(
    'SELECT cart_id, quantity FROM carts WHERE customer_id = ? AND product_id = ? FOR UPDATE',
    [customerId, productId],
  )
  const nextQuantity = quantity + (existing.length ? Number(existing[0].quantity) : 0)
  if (nextQuantity > Number(product.inventory_count)) {
    throw new CartOperationError(409, `Only ${product.inventory_count} unit(s) of ${product.product_name} are available.`)
  }
  const totalPrice = calculateTotal(product.price, nextQuantity)
  if (totalPrice === null) throw new CartOperationError(400, 'The calculated cart total is invalid or too large.')

  let cartId
  if (existing.length) {
    cartId = existing[0].cart_id
    await connection.execute('UPDATE carts SET quantity = ?, total_price = ? WHERE cart_id = ?', [nextQuantity, totalPrice, cartId])
  } else {
    const [result] = await connection.execute(
      'INSERT INTO carts (customer_id, product_id, quantity, total_price) VALUES (?, ?, ?, ?)',
      [customerId, productId, nextQuantity, totalPrice],
    )
    cartId = result.insertId
  }
  return { cartId, quantity: nextQuantity, totalPrice, updatedExisting: existing.length > 0 }
}

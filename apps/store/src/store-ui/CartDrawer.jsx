import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus, ShoppingBag, X } from 'lucide-react'

const MotionDiv = motion.div

const formatPrice = ({ priceCents, currency }) => {
  const code = (currency ?? 'USD').toUpperCase()
  const amount = (Number(priceCents) || 0) / 100

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${Math.round(amount).toLocaleString()} ${code}`
  }
}

const CartDrawer = ({
  isOpen,
  onClose,
  items,
  subtotalCents,
  currency,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onContinueShopping,
}) => {
  const subtotalText = formatPrice({ priceCents: subtotalCents, currency })

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
          />

          <MotionDiv
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-display text-xl font-semibold">Your Cart</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
                <ShoppingBag className="w-16 h-16 text-muted-foreground/30" />
                <p className="text-muted-foreground text-center">Your cart is empty</p>
                <button
                  type="button"
                  onClick={onContinueShopping}
                  className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {items.map((item) => (
                    <MotionDiv
                      key={item.productId}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex gap-4 p-3 rounded-xl bg-card"
                    >
                      <img
                        src={item.snapshot?.imageUrl || ''}
                        alt={item.snapshot?.name ?? 'Cart item'}
                        className="w-20 h-20 rounded-lg object-cover"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="font-display font-semibold text-sm truncate">
                          {item.snapshot?.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">Qty controls</p>
                        <p className="text-sm font-bold text-primary mt-1">
                          {formatPrice({
                            priceCents: item.snapshot?.priceCents ?? 0,
                            currency: item.snapshot?.currency ?? currency,
                          })}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity?.(item.productId, item.qty - 1)}
                            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span className="text-sm font-medium w-6 text-center">{item.qty}</span>

                          <button
                            type="button"
                            onClick={() => onUpdateQuantity?.(item.productId, item.qty + 1)}
                            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemoveItem?.(item.productId)}
                            className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </MotionDiv>
                  ))}
                </div>

                <div className="border-t border-border p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-xl font-display font-bold">{subtotalText}</span>
                  </div>

                  <button
                    type="button"
                    onClick={onProceedToCheckout}
                    className="block w-full py-3.5 rounded-full bg-primary text-primary-foreground text-center font-semibold text-sm hover:bg-teal-light transition-colors"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </>
            )}
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  )
}

export default CartDrawer


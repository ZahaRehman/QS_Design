import { motion } from 'framer-motion'
import { Eye, ShoppingBag } from 'lucide-react'

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

const getSortedImages = (product) => {
  const imgs = Array.isArray(product?.product_images) ? product.product_images : []
  return [...imgs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

const getPrimaryImageUrl = (product) => {
  const imgs = getSortedImages(product)
  return imgs[0]?.image_url || ''
}

const getPrimaryCategoryName = (product) => {
  const names = Array.isArray(product?.product_categories)
    ? product.product_categories
        .map((pc) => pc?.categories?.name)
        .filter(Boolean)
    : []
  return names[0] || ''
}

const getCanvasSizes = (product) => {
  const raw = product?.canvas_sizes
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (s) =>
      s &&
      typeof s === 'object' &&
      typeof s.id === 'string' &&
      s.id &&
      typeof s.label === 'string' &&
      s.label &&
      Number.isFinite(Number(s.price_cents)),
  )
}

/** First canvas size price (same order as admin / API). */
const getFirstCanvasPriceCents = (product) => {
  const sizes = getCanvasSizes(product)
  if (sizes.length === 0) return null
  const cents = Math.round(Number(sizes[0].price_cents))
  return Number.isFinite(cents) ? cents : null
}

const ProductCard = ({ product, index = 0, isNew = false, isTrending = false, onViewProduct, onAddToCart }) => {
  const imageUrl = getPrimaryImageUrl(product)
  const categoryName = getPrimaryCategoryName(product)
  const sizes = getCanvasSizes(product)
  const listingCents = getFirstCanvasPriceCents(product)

  const priceText =
    listingCents != null
      ? `${sizes.length > 1 ? 'From ' : ''}${formatPrice({
          priceCents: listingCents,
          currency: product.currency,
        })}`
      : ''

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group relative rounded-xl overflow-hidden bg-card hover-lift"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product?.name ?? 'Product image'}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}

        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-all duration-300" />

        <div className="absolute top-3 left-3 flex gap-2">
          {isNew && (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground">
              New
            </span>
          )}
          {isTrending && (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary text-secondary-foreground">
              Trending
            </span>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onViewProduct?.(product?.id)
            }}
            className="p-3 rounded-full glass hover:bg-background/80 transition-colors"
            aria-label="View product"
          >
            <Eye className="w-5 h-5 text-foreground" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onAddToCart?.(product)
            }}
            className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-teal-light transition-colors"
            aria-label="Add to cart"
          >
            <ShoppingBag className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {categoryName}
        </span>
        <h3 className="font-display text-lg font-semibold text-foreground mt-1 leading-tight">
          {product?.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">by QS Artists</p>
        {priceText ? <p className="text-base font-bold text-primary mt-2">{priceText}</p> : null}
      </div>
    </MotionDiv>
  )
}

export default ProductCard


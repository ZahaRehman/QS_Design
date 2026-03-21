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
      className="group relative rounded-none overflow-visible bg-transparent"
    >
      {/* Square image, sharp corners (featured-wall-art style) */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product?.name ?? 'Product image'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}

        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-all duration-300 pointer-events-none" />

        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          {isNew && (
            <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-accent text-accent-foreground rounded-none">
              New
            </span>
          )}
          {isTrending && (
            <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-secondary text-secondary-foreground rounded-none">
              Trending
            </span>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onViewProduct?.(product?.id)
            }}
            className="p-2.5 rounded-xl bg-background/90 border border-border hover:bg-background transition-colors shadow-sm"
            aria-label="View product"
          >
            <Eye className="w-4 h-4 text-foreground" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onAddToCart?.(product)
            }}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-teal-light transition-colors shadow-sm"
            aria-label="Add to cart"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="pt-3 px-0 text-left">
        <h3 className="font-display text-base font-bold text-foreground leading-snug line-clamp-2">
          {product?.name}
        </h3>
        {categoryName ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground mt-1">
            {categoryName}
          </p>
        ) : null}
        {priceText ? (
          <p className="text-sm font-normal text-foreground mt-1.5">{priceText}</p>
        ) : null}
      </div>
    </MotionDiv>
  )
}

export default ProductCard


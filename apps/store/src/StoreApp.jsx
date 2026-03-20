import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  X,
  Heart,
  RotateCcw,
  Shield,
  ShoppingBag,
  Sparkles,
  Truck,
} from 'lucide-react'

import { getProduct, listCategories, listProducts, listProductsByCategory } from './lib/storeCatalogApi'
import { createOrder } from './lib/storeCheckoutApi'

import Hero from './store-ui/Hero.jsx'
import ScrollScrubVideo from './store-ui/ScrollScrubVideo.jsx'
import CategoryPills from './store-ui/CategoryPills.jsx'
import ProductCard from './store-ui/ProductCard.jsx'
import CartDrawer from './store-ui/CartDrawer.jsx'
import Footer from './store-ui/Footer.jsx'

const qsLogoUrl =
  'https://res.cloudinary.com/dt0becq6s/image/upload/v1773929899/Artistic_QS_logo_with_vibrant_splashes-removebg-preview_jelzag.png'

const CART_KEY = 'qs_store_cart_v1'
const FREE_SHIPPING_THRESHOLD_CENTS = 5000 * 100
const SHIPPING_CHARGE_CENTS = 250 * 100

const parseHashRoute = () => {
  const raw = window.location.hash || '#/'
  const path = raw.startsWith('#') ? raw.slice(1) : raw
  const parts = path.split('/').filter(Boolean)

  if (parts[0] === 'product' && parts[1]) {
    return { page: 'product', productId: parts[1] }
  }

  if (parts[0] === 'checkout') {
    return { page: 'checkout' }
  }

  if (parts[0] === 'order' && parts[1]) {
    return { page: 'order-success', orderId: parts[1] }
  }

  return { page: 'home' }
}

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function StoreApp() {
  const [route, setRoute] = useState(() => parseHashRoute())

  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')

  const [allProducts, setAllProducts] = useState([])
  const [loadingAllProducts, setLoadingAllProducts] = useState(true)
  const [allProductsError, setAllProductsError] = useState('')

  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')

  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const touchStartXRef = useRef(null)
  const touchStartYRef = useRef(null)
  const didSwipeRef = useRef(false)

  const [cartOpen, setCartOpen] = useState(false)
  const [cartItems, setCartItems] = useState(() => {
    if (typeof window === 'undefined') return []
    const raw = window.localStorage.getItem(CART_KEY)
    const parsed = safeJsonParse(raw, [])
    return Array.isArray(parsed) ? parsed : []
  })

  const [checkoutError, setCheckoutError] = useState('')
  const [checkoutPlacing, setCheckoutPlacing] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    notes: '',
  })

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.qty ?? 0), 0),
    [cartItems],
  )

  const cartTotalCents = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + (item.qty ?? 0) * (item.snapshot?.priceCents ?? 0),
      0,
    )
  }, [cartItems])

  const cartCurrency = cartItems[0]?.snapshot?.currency ?? 'USD'
  const cartTotalFormatted = formatPrice({ priceCents: cartTotalCents, currency: cartCurrency })
  const shippingCents = cartTotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_CHARGE_CENTS
  const shippingFormatted = formatPrice({ priceCents: shippingCents, currency: cartCurrency })
  const orderTotalCents = cartTotalCents + shippingCents
  const orderTotalFormatted = formatPrice({ priceCents: orderTotalCents, currency: cartCurrency })

  useEffect(() => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cartItems))
  }, [cartItems])

  useEffect(() => {
    const onHashChange = () => setRoute(parseHashRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoadingCategories(true)
      setCategoriesError('')
      setLoadingAllProducts(true)
      setAllProductsError('')

      try {
        const [cats, prods] = await Promise.all([listCategories(), listProducts()])
        if (cancelled) return

        setCategories(Array.isArray(cats?.categories) ? cats.categories : [])
        setAllProducts(Array.isArray(prods?.products) ? prods.products : [])
      } catch (e) {
        if (cancelled) return
        const msg = e?.message ?? 'Failed to load store data.'
        setCategoriesError(msg)
        setAllProductsError(msg)
      } finally {
        if (!cancelled) {
          setLoadingCategories(false)
          setLoadingAllProducts(false)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoadingProducts(true)
      setProductsError('')

      try {
        if (selectedCategoryId === 'all') {
          // If "All", show everything we loaded for "New Arrivals"/"Trending".
          setProducts(Array.isArray(allProducts) ? allProducts : [])
          return
        }

        const data = await listProductsByCategory({ categoryId: selectedCategoryId })
        if (cancelled) return

        setProducts(Array.isArray(data.products) ? data.products : [])
      } catch (e) {
        if (cancelled) return
        setProductsError(e?.message ?? 'Failed to load products.')
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [selectedCategoryId, allProducts])

  useEffect(() => {
    if (route.page !== 'product' || !route.productId) {
      setSelectedProduct(null)
      setSelectedImageIndex(0)
      setLightboxOpen(false)
      return
    }

    let cancelled = false

    const run = async () => {
      setDetailsLoading(true)
      setDetailsError('')
      setSelectedProduct(null)
      setSelectedImageIndex(0)
      setLightboxOpen(false)

      try {
        const data = await getProduct({ productId: route.productId })
        if (cancelled) return
        setSelectedProduct(data.product ?? null)
      } catch (e) {
        if (cancelled) return
        setDetailsError(e?.message ?? 'Failed to load product details.')
      } finally {
        if (!cancelled) setDetailsLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [route.page, route.productId])

  useEffect(() => {
    if (!lightboxOpen) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxOpen])

  const goHome = () => {
    window.location.hash = '#/'
  }

  const openProduct = (productId) => {
    if (!productId) return
    window.location.hash = `#/product/${productId}`
  }

  const handleExploreGallery = () => {
    const el = document.getElementById('gallery')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const addToCart = (product) => {
    if (!product?.id) return

    const snapshot = {
      name: product.name ?? 'Product',
      imageUrl: getPrimaryImageUrl(product),
      priceCents: product.price_cents ?? 0,
      currency: product.currency ?? 'USD',
    }

    setCartItems((prev) => {
      const idx = prev.findIndex((item) => item.productId === product.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: (next[idx].qty ?? 0) + 1 }
        return next
      }

      return [...prev, { productId: product.id, qty: 1, snapshot }]
    })

    setCartOpen(true)
  }

  const setQty = (productId, nextQty) => {
    setCartItems((prev) => {
      const qty = Math.max(0, nextQty)
      if (qty === 0) return prev.filter((item) => item.productId !== productId)
      return prev.map((item) => (item.productId === productId ? { ...item, qty } : item))
    })
  }

  const removeItem = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId))
  }

  const sortedAllProducts = useMemo(() => {
    return [...allProducts].sort((a, b) => {
      const at = a?.created_at ? new Date(a.created_at).getTime() : 0
      const bt = b?.created_at ? new Date(b.created_at).getTime() : 0
      return bt - at
    })
  }, [allProducts])

  const newArrivals = useMemo(() => sortedAllProducts.slice(0, 4), [sortedAllProducts])
  const trending = useMemo(() => sortedAllProducts.slice(4, 8), [sortedAllProducts])

  const newIds = useMemo(() => new Set(newArrivals.map((p) => p.id)), [newArrivals])
  const trendingIds = useMemo(() => new Set(trending.map((p) => p.id)), [trending])

  const pillCategories = useMemo(() => {
    const base = [{ id: 'all', name: 'All' }]
    const mapped = Array.isArray(categories)
      ? categories.map((c) => ({ id: c.id, name: c.name }))
      : []
    return [...base, ...mapped]
  }, [categories])

  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return []
    const selectedCategoryName = getPrimaryCategoryName(selectedProduct)
    if (!selectedCategoryName) return []

    return allProducts
      .filter((p) => p?.id && p.id !== selectedProduct.id && getPrimaryCategoryName(p) === selectedCategoryName)
      .slice(0, 4)
  }, [selectedProduct, allProducts])

  const routeMain =
    route.page === 'product' ? (
      <div className="min-h-screen">
        <div className="container py-6 max-w-6xl">
          <button
            type="button"
            onClick={goHome}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Gallery
          </button>

          {detailsLoading ? <p className="text-muted-foreground">Loading...</p> : null}
          {detailsError ? <p className="text-destructive">{detailsError}</p> : null}

          {!detailsLoading && !detailsError && selectedProduct ? (
            <>
              <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
                <div>
                  {(() => {
                    const imgs = getSortedImages(selectedProduct)
                    const clampedIndex = clamp(selectedImageIndex, 0, Math.max(0, imgs.length - 1))
                    const active = imgs[clampedIndex]
                    const canNavigate = imgs.length > 1

                    const goPrevImage = () => {
                      if (!canNavigate) return
                      setSelectedImageIndex((idx) => (idx - 1 + imgs.length) % imgs.length)
                    }

                    const goNextImage = () => {
                      if (!canNavigate) return
                      setSelectedImageIndex((idx) => (idx + 1) % imgs.length)
                    }

                    const handleTouchStart = (event) => {
                      const touch = event.touches?.[0]
                      if (!touch) return
                      touchStartXRef.current = touch.clientX
                      touchStartYRef.current = touch.clientY
                      didSwipeRef.current = false
                    }

                    const handleTouchEnd = (event) => {
                      const startX = touchStartXRef.current
                      const startY = touchStartYRef.current
                      touchStartXRef.current = null
                      touchStartYRef.current = null
                      if (!canNavigate || startX == null || startY == null) return

                      const touch = event.changedTouches?.[0]
                      if (!touch) return

                      const deltaX = touch.clientX - startX
                      const deltaY = touch.clientY - startY
                      const swipeThreshold = 40

                      if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
                        didSwipeRef.current = true
                        if (deltaX < 0) goNextImage()
                        else goPrevImage()
                      }
                    }

                    return (
                      <>
                        <div className="relative group rounded-2xl overflow-hidden bg-card aspect-[3/4] w-full">
                          <button
                            type="button"
                            className="w-full h-full text-left touch-pan-y"
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                            onClick={() => {
                              // Ignore click that was part of a swipe gesture.
                              if (didSwipeRef.current) {
                                didSwipeRef.current = false
                                return
                              }
                              if (active?.image_url) setLightboxOpen(true)
                            }}
                            aria-label="Open image fullscreen"
                          >
                            <AnimatePresence mode="wait">
                              {active?.image_url ? (
                                <motion.img
                                  key={active.id ?? `${selectedProduct.id}-${clampedIndex}`}
                                  src={active.image_url}
                                  alt={selectedProduct.name ?? 'Product'}
                                  className="w-full h-full object-cover"
                                  initial={{ opacity: 0, x: 14, scale: 0.98 }}
                                  animate={{ opacity: 1, x: 0, scale: 1 }}
                                  exit={{ opacity: 0, x: -14, scale: 0.98 }}
                                  transition={{ duration: 0.3, ease: 'easeOut' }}
                                />
                              ) : (
                                <motion.div
                                  key="empty-image"
                                  className="w-full h-full bg-muted"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                />
                              )}
                            </AnimatePresence>
                          </button>

                          {canNavigate ? (
                            <>
                              <button
                                type="button"
                                className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 rounded-full bg-background/80 border border-border text-foreground hover:bg-background transition-colors"
                                onClick={goPrevImage}
                                aria-label="View previous image"
                              >
                                <ArrowLeft className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 rounded-full bg-background/80 border border-border text-foreground hover:bg-background transition-colors"
                                onClick={goNextImage}
                                aria-label="View next image"
                              >
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </>
                          ) : null}
                        </div>

                        {imgs.length > 1 ? (
                          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                            {imgs.map((img, idx) => {
                              const activeThumb = idx === clampedIndex
                              return (
                                <button
                                  key={img.id ?? idx}
                                  type="button"
                                  onClick={() => setSelectedImageIndex(idx)}
                                  className={`rounded-xl overflow-hidden border transition-colors ${
                                    activeThumb ? 'border-ring' : 'border-border'
                                  }`}
                                  aria-label={`View image ${idx + 1}`}
                                >
                                  <img
                                    src={img.image_url ?? ''}
                                    alt={img.alt_text ?? selectedProduct.name ?? 'Thumbnail'}
                                    className="w-16 h-16 object-cover"
                                  />
                                </button>
                              )
                            })}
                          </div>
                        ) : null}

                        <AnimatePresence>
                          {lightboxOpen && active?.image_url ? (
                            <motion.div
                              className="fixed inset-0 z-[100] bg-black/90 p-4 md:p-8"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={() => setLightboxOpen(false)}
                            >
                              <button
                                type="button"
                                className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setLightboxOpen(false)
                                }}
                                aria-label="Close fullscreen image"
                              >
                                <X className="w-5 h-5" />
                              </button>

                              <div className="h-full w-full flex items-center justify-center">
                                <motion.img
                                  key={`lightbox-${active.id ?? clampedIndex}`}
                                  src={active.image_url}
                                  alt={selectedProduct.name ?? 'Product'}
                                  className="max-h-[90vh] max-w-[92vw] object-contain rounded-xl"
                                  initial={{ opacity: 0, scale: 0.96 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.96 }}
                                  transition={{ duration: 0.25, ease: 'easeOut' }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>

                              {imgs.length > 1 ? (
                                <>
                                  <button
                                    type="button"
                                    className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedImageIndex((idx) => (idx - 1 + imgs.length) % imgs.length)
                                    }}
                                    aria-label="View previous image"
                                  >
                                    <ArrowLeft className="w-5 h-5" />
                                  </button>
                                  <button
                                    type="button"
                                    className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedImageIndex((idx) => (idx + 1) % imgs.length)
                                    }}
                                    aria-label="View next image"
                                  >
                                    <ArrowRight className="w-5 h-5" />
                                  </button>
                                </>
                              ) : null}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </>
                    )
                  })()}
                </div>

                <div className="flex flex-col">
                  <div className="flex gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                      {getPrimaryCategoryName(selectedProduct)}
                    </span>
                    {newIds.has(selectedProduct.id) ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground">
                        New
                      </span>
                    ) : null}
                    {trendingIds.has(selectedProduct.id) ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary text-secondary-foreground">
                        Trending
                      </span>
                    ) : null}
                  </div>

                  <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight">
                    {selectedProduct.name}
                  </h1>
                  <p className="text-muted-foreground mt-1">by QS Artists</p>

                  {selectedProduct.price_cents != null ? (
                    <p className="text-3xl font-display font-bold text-primary mt-6">
                      {formatPrice({
                        priceCents: selectedProduct.price_cents,
                        currency: selectedProduct.currency,
                      })}
                    </p>
                  ) : null}

                  <p className="text-xs text-muted-foreground mt-1">Inclusive of all taxes</p>

                  {selectedProduct.description ? (
                    <p className="text-muted-foreground leading-relaxed mt-8">{selectedProduct.description}</p>
                  ) : null}

                  <div className="flex gap-3 mt-8 sticky bottom-6 md:static">
                    <button
                      type="button"
                      onClick={() => addToCart(selectedProduct)}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-teal-light transition-colors"
                      disabled={detailsLoading}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      className="p-4 rounded-full border border-border hover:bg-muted transition-colors"
                      aria-label="Add to wishlist"
                    >
                      <Heart className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                    {[
                      { label: 'Free Shipping', sub: 'On orders above PKR 5,000' },
                      { label: 'Cash on Delivery', sub: 'COD available nationwide' },
                      { label: 'No Return Policy', sub: 'Please order carefully' },
                    ].map((item) => (
                      <div key={item.label} className="p-3 rounded-xl bg-card">
                        <p className="text-xs font-semibold text-foreground">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {relatedProducts.length > 0 ? (
                <section className="mt-20">
                  <h2 className="font-display text-2xl font-bold mb-8">You May Also Like</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {relatedProducts.map((p, i) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        index={i}
                        isNew={newIds.has(p.id)}
                        isTrending={trendingIds.has(p.id)}
                        onViewProduct={(id) => openProduct(id)}
                        onAddToCart={addToCart}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </div>

        <Footer />
      </div>
    ) : route.page === 'checkout' ? (
      <div className="min-h-screen">
        <div className="container py-6 max-w-4xl">
          <button
            type="button"
            onClick={goHome}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </button>

          <h1 className="font-display text-3xl font-bold mb-8">Checkout</h1>

          {cartItems.length === 0 ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
              <p className="text-xl text-muted-foreground">Your cart is empty</p>
              <button
                type="button"
                onClick={goHome}
                className="text-primary hover:underline"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-5 gap-8">
              <form
                className="md:col-span-3 space-y-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  setCheckoutError('')
                  setCheckoutPlacing(true)

                  const customer = {
                    name: checkoutForm.name,
                    email: checkoutForm.email,
                    phone: checkoutForm.phone,
                    address1: checkoutForm.address1,
                    address2: checkoutForm.address2,
                    city: checkoutForm.city,
                    state: checkoutForm.state,
                    postalCode: checkoutForm.postalCode,
                    country: 'Pakistan',
                    notes: checkoutForm.notes,
                  }

                  createOrder({ customer, cartItems })
                    .then((res) => {
                      const orderId = res?.order?.id
                      if (!orderId) throw new Error('Order created, but no order id returned.')

                      setCartItems([])
                      setCartOpen(false)
                      window.location.hash = `#/order/${orderId}`
                    })
                    .catch((err) => {
                      setCheckoutError(err?.message ?? 'Checkout failed. Please try again.')
                    })
                    .finally(() => {
                      setCheckoutPlacing(false)
                    })
                }}
              >
                <h2 className="font-display text-lg font-semibold">Delivery Details</h2>
                <p className="text-xs text-muted-foreground -mt-3">Cash on Delivery only</p>

                {checkoutError ? <p className="text-destructive text-sm font-medium">{checkoutError}</p> : null}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium capitalize text-foreground">Full name</label>
                    <input
                      value={checkoutForm.name}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, name: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium capitalize text-foreground">Phone</label>
                    <input
                      type="tel"
                      value={checkoutForm.phone}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, phone: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium capitalize text-foreground">Email</label>
                    <input
                      type="email"
                      value={checkoutForm.email}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, email: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium capitalize text-foreground">Address line 1</label>
                    <textarea
                      value={checkoutForm.address1}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, address1: e.target.value }))}
                      rows={3}
                      className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      required
                      placeholder="Full delivery address"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium capitalize text-foreground">Address line 2 (optional)</label>
                    <textarea
                      value={checkoutForm.address2}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, address2: e.target.value }))}
                      rows={2}
                      className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      placeholder="Apartment, suite, etc."
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium capitalize text-foreground">City</label>
                    <input
                      value={checkoutForm.city}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, city: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium capitalize text-foreground">State / Province</label>
                    <input
                      value={checkoutForm.state}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, state: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium capitalize text-foreground">Postal code</label>
                    <input
                      value={checkoutForm.postalCode}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, postalCode: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium capitalize text-foreground">Notes (optional)</label>
                    <textarea
                      value={checkoutForm.notes}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={3}
                      className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      placeholder="Any delivery instructions?"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Cash on Delivery
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    Free shipping above PKR 5,000
                  </span>
                  <span className="flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" />
                    No return policy
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-teal-light transition-colors"
                  disabled={checkoutPlacing}
                >
                  {checkoutPlacing ? 'Placing order...' : `Place order (COD) — ${orderTotalFormatted}`}
                </button>
              </form>

              <aside className="md:col-span-2">
                <div className="rounded-2xl bg-card p-6 sticky top-24">
                  <h2 className="font-display text-lg font-semibold mb-4">Order Summary</h2>

                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {cartItems.map((item) => (
                      <div key={item.productId} className="flex gap-3">
                        <img
                          src={item.snapshot?.imageUrl || ''}
                          alt={item.snapshot?.name ?? 'Cart item'}
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.snapshot?.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                        </div>
                        <p className="text-sm font-semibold">
                          {formatPrice({
                            priceCents: (item.snapshot?.priceCents ?? 0) * (item.qty ?? 0),
                            currency: item.snapshot?.currency ?? cartCurrency,
                          })}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border mt-4 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{cartTotalFormatted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-primary font-medium">{shippingCents === 0 ? 'Free' : shippingFormatted}</span>
                    </div>
                    <div className="flex justify-between font-display font-bold text-lg pt-2 border-t border-border">
                      <span>Total</span>
                      <span>{orderTotalFormatted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment</span>
                      <span>Cash on Delivery</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    ) : route.page === 'order-success' ? (
      <div className="min-h-screen flex items-center justify-center">
        <div className="container max-w-md text-center py-20">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>

          <h1 className="font-display text-3xl font-bold mb-3">Order Placed!</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for your order. Our team will get in touch with you shortly to confirm the details.
          </p>

          <div className="rounded-xl bg-card p-5 mb-8">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Order ID</p>
            <p className="font-display text-xl font-bold text-primary mt-1">{route.orderId ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-2">Payment: Cash on Delivery</p>
          </div>

          <button
            type="button"
            onClick={goHome}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-teal-light transition-colors"
          >
            Continue Shopping
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    ) : (
      <div className="min-h-screen">
        {allProductsError ? (
          <div className="container pt-8">
            <p className="text-destructive">{allProductsError}</p>
          </div>
        ) : null}

        <div id="home">
          <Hero onExplore={handleExploreGallery} />
        </div>

        <ScrollScrubVideo
          videoSrc="https://res.cloudinary.com/dt0becq6s/video/upload/v1773997170/WhatsApp_Video_2026-03-20_at_1.56.22_PM_bcx5xi.mp4"
        />

        <section className="container py-16 md:py-20">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="font-display text-2xl md:text-3xl font-bold">New Arrivals</h2>
          </div>

          {loadingAllProducts ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {newArrivals.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  isNew
                  isTrending={trendingIds.has(product.id)}
                  onViewProduct={openProduct}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          )}
        </section>

        <section className="container pb-16 md:pb-20" id="gallery">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <h2 className="font-display text-2xl md:text-3xl font-bold">Explore Gallery</h2>
          </div>

          {categoriesError ? <p className="text-destructive mb-4">{categoriesError}</p> : null}

          <CategoryPills
            categories={pillCategories}
            activeCategoryId={selectedCategoryId}
            onChange={(id) => setSelectedCategoryId(id)}
            disabled={loadingCategories}
          />

          <div className="mt-8">
            {loadingProducts ? (
              <p className="text-muted-foreground">Loading products...</p>
            ) : productsError ? (
              <p className="text-destructive">{productsError}</p>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">No artworks found in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    isNew={newIds.has(product.id)}
                    isTrending={trendingIds.has(product.id)}
                    onViewProduct={openProduct}
                    onAddToCart={addToCart}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="container py-16 md:py-20" id="about">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-secondary">Our Story</span>
              <h2 className="font-display text-3xl md:text-4xl font-bold mt-3 mb-6 leading-tight">
                Where Art Meets
                <br />
                <span className="italic text-primary">Passion</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                QS was born from a simple belief: everyone deserves access to beautiful, original artwork. We connect emerging
                artists with art lovers, creating a community that celebrates creativity in all its forms.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Every piece in our collection is hand-selected for its uniqueness, quality, and the story it tells. From bold
                abstract canvases to delicate handmade ceramics, we bring the gallery experience to your home.
              </p>
            </div>

            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=700&fit=crop"
                alt="Artist at work"
                className="rounded-2xl w-full object-cover aspect-[4/5]"
              />
              <div className="absolute -bottom-4 -left-4 px-6 py-4 rounded-xl glass">
                <p className="font-display text-2xl font-bold text-primary">200+</p>
                <p className="text-xs text-muted-foreground">Artists Worldwide</p>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-16 md:py-20" id="contact">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-secondary">
                Contact
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold mt-3 mb-6 leading-tight">
                Let us help you find your next piece
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Send us a message and our team will get back to you as soon as possible.
              </p>
              <div className="space-y-3">
                <p className="text-sm">
                  <span className="font-semibold text-foreground">Email:</span>{' '}
                  <span className="text-muted-foreground">support@qsdesign.com</span>
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-foreground">Phone:</span>{' '}
                  <span className="text-muted-foreground">+92 324 4435463</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  window.alert('Thanks! We will contact you shortly.')
                }}
              >
                <label className="block text-sm font-semibold text-foreground">
                  Name
                  <input
                    className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                    required
                    placeholder="Your name"
                  />
                </label>

                <label className="block text-sm font-semibold text-foreground">
                  Email
                  <input
                    className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                    type="email"
                    required
                    placeholder="you@example.com"
                  />
                </label>

                <label className="block text-sm font-semibold text-foreground">
                  Message
                  <textarea
                    className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                    rows={5}
                    required
                    placeholder="Type your message..."
                  />
                </label>

                <button
                  type="submit"
                  className="w-full rounded-full bg-primary text-primary-foreground font-semibold text-sm tracking-wide hover:bg-teal-light transition-colors px-8 py-4"
                >
                  Send message
                </button>
              </form>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    )

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="container flex items-center justify-between h-16 md:h-20">
          <a
            href="#/"
            className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-foreground"
          >
            <img src={qsLogoUrl} alt="QS logo" className="w-10 h-10 object-contain" />
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                if (route.page !== 'home') window.location.hash = '#/'
                setTimeout(() => document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' }), 60)
              }}
            >
              Home
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                if (route.page !== 'home') window.location.hash = '#/'
                setTimeout(
                  () => document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' }),
                  60,
                )
              }}
            >
              Gallery
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                if (route.page !== 'home') window.location.hash = '#/'
                setTimeout(
                  () => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }),
                  60,
                )
              }}
            >
              Contact
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                if (route.page !== 'home') window.location.hash = '#/'
                setTimeout(
                  () => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }),
                  60,
                )
              }}
            >
              About
            </button>
          </nav>

          <button
            type="button"
            className="relative p-2 rounded-full hover:bg-muted transition-colors"
            onClick={() => setCartOpen(true)}
            aria-label="Open cart"
          >
            <ShoppingBag className="w-5 h-5 text-foreground" />
            {cartCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center font-semibold">
                {cartCount}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <main>{routeMain}</main>

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        subtotalCents={cartTotalCents}
        currency={cartCurrency}
        onUpdateQuantity={setQty}
        onRemoveItem={removeItem}
        onProceedToCheckout={() => {
          setCartOpen(false)
          window.location.hash = '#/checkout'
        }}
        onContinueShopping={() => {
          setCartOpen(false)
          window.location.hash = '#/'
        }}
      />
    </>
  )
}

export default StoreApp


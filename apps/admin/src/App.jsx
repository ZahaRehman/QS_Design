import { useEffect, useState } from 'react'
import { AdminLayout } from './components/admin/AdminLayout'
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  listCategories,
  listProducts,
  reactivateCategory,
  reactivateProduct,
  updateProduct,
  uploadImageToCloudinary,
} from './lib/adminCatalogApi'
import { listOrders, updateOrderStatus } from './lib/adminOrdersApi'
import {
  adminLogin,
  adminLogout,
  adminMe,
  clearSession,
  getStoredSession,
  persistSession,
} from './lib/adminAuthApi'
import './App.css'

function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [activeSection, setActiveSection] = useState('dashboard')
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const restore = async () => {
      const stored = getStoredSession()
      if (!stored?.accessToken) {
        setLoading(false)
        return
      }

      try {
        const data = await adminMe({ accessToken: stored.accessToken })
        setSession(stored)
        setUser(data.user)
      } catch {
        clearSession()
        setSession(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    restore()
  }, [])

  useEffect(() => {
    const loadCatalog = async () => {
      if (!session?.accessToken) return
      try {
        setOrdersLoading(true)
        const [categoriesData, productsData, ordersData] = await Promise.all([
          listCategories({ accessToken: session.accessToken }),
          listProducts({ accessToken: session.accessToken }),
          listOrders({ accessToken: session.accessToken, status: 'all' }),
        ])
        setCategories(categoriesData.categories ?? [])
        setProducts(productsData.products ?? [])
        setOrders(ordersData.orders ?? [])
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setOrdersLoading(false)
      }
    }

    loadCatalog()
  }, [session?.accessToken])

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')

    try {
      const data = await adminLogin({ email, password })
      persistSession(data.session)
      setSession(data.session)
      setUser(data.user)
      setPassword('')
    } catch (signInError) {
      setError(signInError.message)
    }
  }

  const handleLogout = async () => {
    setError('')
    try {
      if (session?.accessToken) {
        await adminLogout({ accessToken: session.accessToken })
      }
    } catch (signOutError) {
      setError(signOutError.message)
    } finally {
      clearSession()
      setSession(null)
      setUser(null)
      setActiveSection('dashboard')
    }
  }

  const handleCreateCategory = async ({ name, description }) => {
    if (!session?.accessToken) throw new Error('Missing session token')
    setCatalogLoading(true)
    try {
      const data = await createCategory({
        accessToken: session.accessToken,
        name,
        description,
      })
      setCategories((current) => [...current, data.category].sort((a, b) => a.name.localeCompare(b.name)))
    } finally {
      setCatalogLoading(false)
    }
  }

  const handleDeleteCategory = async ({ id }) => {
    if (!session?.accessToken) throw new Error('Missing session token')
    setCatalogLoading(true)
    try {
      await deleteCategory({ accessToken: session.accessToken, categoryId: id })
      setCategories((current) => current.filter((item) => item.id !== id))
    } finally {
      setCatalogLoading(false)
    }
  }

  const handleReactivateCategory = async ({ id }) => {
    if (!session?.accessToken) throw new Error('Missing session token')
    setCatalogLoading(true)
    try {
      await reactivateCategory({ accessToken: session.accessToken, categoryId: id })
      setCategories((current) =>
        current.map((item) => (item.id === id ? { ...item, is_active: true } : item)),
      )
    } finally {
      setCatalogLoading(false)
    }
  }

  const handleCreateProduct = async ({
    name,
    description,
    priceCents,
    currency,
    categoryIds,
    files,
  }) => {
    if (!session?.accessToken) throw new Error('Missing session token')
    if (files.length > 10) {
      throw new Error('You can upload up to 10 images for a product.')
    }
    setCatalogLoading(true)
    try {
      const uploadedImages = []
      for (const file of files) {
        const uploaded = await uploadImageToCloudinary({
          file,
          accessToken: session.accessToken,
        })
        uploadedImages.push(uploaded)
      }

      const data = await createProduct({
        accessToken: session.accessToken,
        name,
        description,
        priceCents,
        currency,
        categoryIds,
        images: uploadedImages,
      })

      setProducts((current) => [data.product, ...current])
    } finally {
      setCatalogLoading(false)
    }
  }

  const handleDeleteProduct = async ({ id }) => {
    if (!session?.accessToken) throw new Error('Missing session token')
    setCatalogLoading(true)
    try {
      await deleteProduct({ accessToken: session.accessToken, productId: id })
      setProducts((current) =>
        current.map((item) => (item.id === id ? { ...item, is_active: false } : item)),
      )
    } finally {
      setCatalogLoading(false)
    }
  }

  const handleReactivateProduct = async ({ id }) => {
    if (!session?.accessToken) throw new Error('Missing session token')
    setCatalogLoading(true)
    try {
      await reactivateProduct({ accessToken: session.accessToken, productId: id })
      setProducts((current) =>
        current.map((item) => (item.id === id ? { ...item, is_active: true } : item)),
      )
    } finally {
      setCatalogLoading(false)
    }
  }

  const handleUpdateProduct = async ({
    id,
    name,
    description,
    priceCents,
    currency,
    categoryIds,
    files,
    imageIdsToRemove,
  }) => {
    if (!session?.accessToken) throw new Error('Missing session token')

    const existingProduct = products.find((p) => p.id === id)
    const existingImagesCount = existingProduct?.product_images?.length ?? 0
    const uniqueImageIdsToRemove = Array.isArray(imageIdsToRemove)
      ? [...new Set(imageIdsToRemove.filter((imgId) => typeof imgId === 'string' && imgId.trim()))]
      : []

    // If user tries to remove images that are not present, treat it as not removed.
    const existingImageIds = new Set(
      (existingProduct?.product_images ?? []).map((img) => img.id),
    )
    const removeIntersectionCount = uniqueImageIdsToRemove.filter((imgId) =>
      existingImageIds.has(imgId)
    ).length

    const keptCount = existingImagesCount - removeIntersectionCount
    const totalAfterEdit = keptCount + (files?.length ?? 0)
    if (totalAfterEdit > 10) {
      throw new Error('A product can have at most 10 images.')
    }

    setCatalogLoading(true)
    try {
      const uploadedImages = []
      for (const file of files ?? []) {
        const uploaded = await uploadImageToCloudinary({
          file,
          accessToken: session.accessToken,
        })
        uploadedImages.push(uploaded)
      }

      const data = await updateProduct({
        accessToken: session.accessToken,
        productId: id,
        name,
        description,
        priceCents,
        currency,
        categoryIds,
        imagesToAdd: uploadedImages,
        imageIdsToRemove: uniqueImageIdsToRemove,
      })

      setProducts((current) => current.map((p) => (p.id === id ? data.product : p)))
    } finally {
      setCatalogLoading(false)
    }
  }

  const handleUpdateOrderStatus = async ({ orderId, status }) => {
    if (!session?.accessToken) throw new Error('Missing session token')

    const data = await updateOrderStatus({ accessToken: session.accessToken, orderId, status })
    const updatedOrder = data?.order

    if (updatedOrder?.id) {
      setOrders((current) => current.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)))
    }

    return updatedOrder
  }

  if (loading) {
    return (
      <main className="app-shell">
        <p>Checking authentication...</p>
      </main>
    )
  }

  if (!session || !user) {
    return (
      <main className="app-shell">
        <form className="auth-card" onSubmit={handleLogin}>
          <h1>Admin Login</h1>
          <p className="muted">
            Sign in to access your ecommerce administration dashboard.
          </p>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
          {error ? <p className="error">{error}</p> : null}
          <button type="submit">Login</button>
        </form>
      </main>
    )
  }

  return (
    <>
      {error ? <p className="global-error">{error}</p> : null}
      {catalogLoading ? (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="spinner" />
          <p>Saving changes...</p>
        </div>
      ) : null}
      <AdminLayout
        email={user.email}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLogout}
        categories={categories}
        products={products}
        orders={orders}
        onCreateCategory={handleCreateCategory}
        onDeleteCategory={handleDeleteCategory}
        onReactivateCategory={handleReactivateCategory}
        onCreateProduct={handleCreateProduct}
        onDeleteProduct={handleDeleteProduct}
        onReactivateProduct={handleReactivateProduct}
        onUpdateProduct={handleUpdateProduct}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        loading={catalogLoading}
        ordersLoading={ordersLoading}
      />
    </>
  )
}

export default App

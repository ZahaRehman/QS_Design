import { useState } from 'react'
import { SidebarNav } from './SidebarNav'
import { Topbar } from './Topbar'
import { OrdersManager } from './OrdersManager'

const sectionTitle = {
  dashboard: 'Dashboard',
  categories: 'Categories',
  orders: 'Orders',
  products: 'Create Product',
  'all-products': 'All Products',
  customers: 'Customers',
}

const CategoriesManager = ({
  categories,
  onCreateCategory,
  onDeleteCategory,
  onReactivateCategory,
  loading,
}) => {
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [localError, setLocalError] = useState('')

  const submitCategory = async (event) => {
    event.preventDefault()
    setLocalError('')
    try {
      await onCreateCategory({
        name: categoryName,
        description: categoryDescription,
      })
      setCategoryName('')
      setCategoryDescription('')
    } catch (error) {
      setLocalError(error.message)
    }
  }

  const deleteCategory = async (category) => {
    const confirmed = window.confirm(`Delete category "${category.name}"?`)
    if (!confirmed) return
    setLocalError('')
    try {
      await onDeleteCategory({ id: category.id })
    } catch (error) {
      setLocalError(error.message)
    }
  }

  const reactivateCategory = async (category) => {
    setLocalError('')
    try {
      await onReactivateCategory({ id: category.id })
    } catch (error) {
      setLocalError(error.message)
    }
  }

  const activeCategories = categories.filter((item) => item.is_active)
  const inactiveCategories = categories.filter((item) => !item.is_active)

  return (
    <div className="catalog-grid">
      <section className="placeholder-card">
        <h3>Create Category</h3>
        <form onSubmit={submitCategory} className="stack-form">
          <input
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Category name"
            required
          />
          <textarea
            value={categoryDescription}
            onChange={(event) => setCategoryDescription(event.target.value)}
            placeholder="Category description"
            rows={3}
          />
          <button type="submit" disabled={loading}>
            Add Category
          </button>
        </form>
      </section>
      <section className="placeholder-card">
        <h3>Existing Categories</h3>
        <div className="product-list">
          {activeCategories.length === 0 ? <p>No active categories yet.</p> : null}
          {activeCategories.map((category) => (
            <article key={category.id} className="product-row">
              <div>
                <strong>{category.name}</strong>
                <p>{category.description || 'No description'}</p>
              </div>
              <button
                type="button"
                className="danger-btn"
                disabled={loading}
                onClick={() => deleteCategory(category)}
              >
                Delete
              </button>
            </article>
          ))}
        </div>
        <h3 className="subheading">Inactive Categories</h3>
        <div className="product-list">
          {inactiveCategories.length === 0 ? <p>No inactive categories.</p> : null}
          {inactiveCategories.map((category) => (
            <article key={category.id} className="product-row inactive-row">
              <div>
                <strong>{category.name}</strong>
                <p>{category.description || 'No description'}</p>
              </div>
              <button
                type="button"
                className="secondary-btn"
                disabled={loading}
                onClick={() => reactivateCategory(category)}
              >
                Reactivate
              </button>
            </article>
          ))}
        </div>
        {localError ? <p className="error">{localError}</p> : null}
      </section>
    </div>
  )
}

const ProductsCreateManager = ({
  categories,
  onCreateProduct,
  loading,
}) => {
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([])
  const [files, setFiles] = useState([])
  const [localError, setLocalError] = useState('')

  const handleCategorySelect = (event) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value)
    setSelectedCategoryIds(values)
  }

  const submitProduct = async (event) => {
    event.preventDefault()
    setLocalError('')

    const parsedPrice = Number(price)
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setLocalError('Price must be a valid positive number.')
      return
    }

    try {
      await onCreateProduct({
        name: productName,
        description: productDescription,
        priceCents: Math.round(parsedPrice * 100),
        currency,
        categoryIds: selectedCategoryIds,
        files,
      })
      setProductName('')
      setProductDescription('')
      setPrice('')
      setCurrency('USD')
      setSelectedCategoryIds([])
      setFiles([])
    } catch (error) {
      setLocalError(error.message)
    }
  }

  return (
    <div className="catalog-grid single-column">
      <section className="placeholder-card">
        <h3>Create Product</h3>
        <form onSubmit={submitProduct} className="stack-form">
          <input
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            placeholder="Product name"
            required
          />
          <textarea
            value={productDescription}
            onChange={(event) => setProductDescription(event.target.value)}
            placeholder="Product description"
            rows={4}
          />
          <div className="inline-fields">
            <input
              type="number"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Price (e.g. 49.99)"
              min="0"
              step="0.01"
              required
            />
            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              placeholder="Currency"
              maxLength={3}
              required
            />
          </div>

          <label htmlFor="product-categories">Categories</label>
          <select
            id="product-categories"
            className="app-select"
            multiple
            value={selectedCategoryIds}
            onChange={handleCategorySelect}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <p className="muted">Hold Command/Ctrl to select multiple categories.</p>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          <p className="muted">Upload up to 10 images per product.</p>
          {files.length > 0 ? (
            <p className="muted">
              {files.length} image{files.length > 1 ? 's' : ''} selected
            </p>
          ) : null}

          <button type="submit" disabled={loading}>
            Create Product
          </button>
        </form>
        {localError ? <p className="error">{localError}</p> : null}
      </section>
    </div>
  )
}

const AllProductsPage = ({
  categories,
  products,
  onDeleteProduct,
  onReactivateProduct,
  onUpdateProduct,
  loading,
}) => {
  const activeProducts = products.filter((item) => item.is_active)
  const inactiveProducts = products.filter((item) => !item.is_active)

  const [filterCategoryId, setFilterCategoryId] = useState('all')

  const productMatchesCategory = (product) => {
    if (filterCategoryId === 'all') return true
    const categoryIds =
      product.product_categories?.map((pc) => pc?.category_id).filter(Boolean) ?? []
    return categoryIds.includes(filterCategoryId)
  }

  const filteredActiveProducts = activeProducts.filter(productMatchesCategory)
  const filteredInactiveProducts = inactiveProducts.filter(productMatchesCategory)

  const [editOpen, setEditOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editCurrency, setEditCurrency] = useState('USD')
  const [editCategoryIds, setEditCategoryIds] = useState([])
  const [editImageIdsToRemove, setEditImageIdsToRemove] = useState([])
  const [editFilesToAdd, setEditFilesToAdd] = useState([])
  const [localError, setLocalError] = useState('')

  const openEditModal = (product) => {
    const selectedCategoryIds = (product.product_categories ?? [])
      .map((pc) => pc.category_id)
      .filter(Boolean)
    setEditProduct(product)
    setEditName(product.name ?? '')
    setEditDescription(product.description ?? '')
    setEditPrice(product.price_cents != null ? (product.price_cents / 100).toFixed(2) : '0')
    setEditCurrency((product.currency ?? 'USD').toUpperCase())
    setEditCategoryIds(selectedCategoryIds)
    setEditImageIdsToRemove([])
    setEditFilesToAdd([])
    setLocalError('')
    setEditOpen(true)
  }

  const closeEditModal = () => {
    setEditOpen(false)
    setEditProduct(null)
    setLocalError('')
  }

  const handleToggleRemoveImage = (imageId) => {
    setEditImageIdsToRemove((current) => {
      const exists = current.includes(imageId)
      if (exists) return current.filter((id) => id !== imageId)
      return [...current, imageId]
    })
  }

  const handleEditCategorySelect = (event) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value)
    setEditCategoryIds(values)
  }

  const submitEditProduct = async (event) => {
    event.preventDefault()
    if (!editProduct) return
    setLocalError('')

    const parsedPrice = Number(editPrice)
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setLocalError('Price must be a valid positive number.')
      return
    }

    try {
      await onUpdateProduct({
        id: editProduct.id,
        name: editName,
        description: editDescription,
        priceCents: Math.round(parsedPrice * 100),
        currency: editCurrency,
        categoryIds: editCategoryIds,
        files: editFilesToAdd,
        imageIdsToRemove: editImageIdsToRemove,
      })
      closeEditModal()
    } catch (error) {
      setLocalError(error.message)
    }
  }

  return (
    <>
      <section className="placeholder-card">
        <h3>All Products</h3>

        <div className="filter-row">
          <label htmlFor="all-products-filter-category">Category</label>
          <select
            id="all-products-filter-category"
            className="filter-select"
            value={filterCategoryId}
            onChange={(event) => setFilterCategoryId(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="product-list">
          {filteredActiveProducts.length === 0 ? (
            <p>No active products yet.</p>
          ) : null}
          {filteredActiveProducts.map((product) => (
            <article key={product.id} className="product-card-full">
              <div className="product-main">
                <strong>{product.name}</strong>
                <p>{product.description || 'No description'}</p>
                <p>
                  {(product.price_cents / 100).toFixed(2)} {product.currency}
                </p>
                <p className="muted">
                  Categories:{' '}
                  {(product.product_categories ?? [])
                    .map((item) => item.categories?.name)
                    .filter(Boolean)
                    .join(', ') || 'None'}
                </p>

                <div className="product-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={loading}
                    onClick={() => openEditModal(product)}
                  >
                    Edit Product
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    disabled={loading}
                    onClick={() => onDeleteProduct({ id: product.id })}
                  >
                    Soft Delete Product
                  </button>
                </div>
              </div>
              <div className="image-grid">
                {(product.product_images ?? []).length === 0 ? (
                  <p className="muted">No images</p>
                ) : (
                  (product.product_images ?? []).map((image) => (
                    <img
                      key={image.id}
                      src={image.image_url}
                      alt={image.alt_text || product.name}
                    />
                  ))
                )}
              </div>
            </article>
          ))}
        </div>

        <h3 className="subheading">Inactive Products</h3>
        <div className="product-list">
          {filteredInactiveProducts.length === 0 ? (
            <p>No inactive products.</p>
          ) : null}
          {filteredInactiveProducts.map((product) => (
            <article key={product.id} className="product-row inactive-row">
              <div>
                <strong>{product.name}</strong>
                <p>
                  {(product.price_cents / 100).toFixed(2)} {product.currency}
                </p>
              </div>
              <div className="product-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={loading}
                  onClick={() => openEditModal(product)}
                >
                  Edit Product
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={loading}
                  onClick={() => onReactivateProduct({ id: product.id })}
                >
                  Reactivate
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editOpen && editProduct ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Edit product"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEditModal()
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Product</h3>
              <button type="button" className="modal-close" onClick={closeEditModal}>
                Close
              </button>
            </div>

            <form onSubmit={submitEditProduct} className="stack-form">
              <div className="catalog-grid single-column">
                <section className="placeholder-card modal-section">
                  <h3>Product Details</h3>
                  <label htmlFor="edit-product-name">Name</label>
                  <input
                    id="edit-product-name"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    placeholder="Product name"
                    required
                    disabled={loading}
                  />

                  <label htmlFor="edit-product-description">Description</label>
                  <textarea
                    id="edit-product-description"
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    placeholder="Product description"
                    rows={4}
                    disabled={loading}
                  />

                  <div className="inline-fields">
                    <div>
                      <label htmlFor="edit-product-price">Price</label>
                      <input
                        id="edit-product-price"
                        type="number"
                        value={editPrice}
                        onChange={(event) => setEditPrice(event.target.value)}
                        placeholder="Price (e.g. 49.99)"
                        min="0"
                        step="0.01"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-product-currency">Currency</label>
                      <input
                        id="edit-product-currency"
                        value={editCurrency}
                        onChange={(event) => setEditCurrency(event.target.value.toUpperCase())}
                        placeholder="Currency"
                        maxLength={3}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <label htmlFor="edit-product-categories">Categories</label>
                  <select
                    id="edit-product-categories"
                    className="app-select"
                    multiple
                    value={editCategoryIds}
                    onChange={handleEditCategorySelect}
                    disabled={loading}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <p className="muted">Hold Command/Ctrl to select multiple categories.</p>
                </section>

                <section className="placeholder-card modal-section">
                  <h3>Images</h3>
                  <p className="muted">Remove existing images and/or upload new ones.</p>

                  {Array.isArray(editProduct.product_images) &&
                  editProduct.product_images.length > 0 ? (
                    <div className="edit-image-list">
                      {editProduct.product_images.map((image) => (
                        <div key={image.id} className="edit-image-row">
                          <label className="edit-image-remove">
                            <input
                              type="checkbox"
                              checked={editImageIdsToRemove.includes(image.id)}
                              onChange={() => handleToggleRemoveImage(image.id)}
                              disabled={loading}
                            />
                            <img
                              src={image.image_url}
                              alt={image.alt_text || editProduct.name}
                            />
                          </label>
                          <span className="muted" style={{ margin: 0 }}>
                            {editImageIdsToRemove.includes(image.id) ? 'Marked to remove' : 'Keep'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">No existing images.</p>
                  )}

                  <label htmlFor="edit-product-image-upload">Add new images</label>
                  <input
                    id="edit-product-image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) =>
                      setEditFilesToAdd(Array.from(event.target.files ?? []))
                    }
                    disabled={loading}
                  />
                  {editFilesToAdd.length > 0 ? (
                    <p className="muted">
                      {editFilesToAdd.length} new image{editFilesToAdd.length > 1 ? 's' : ''}{' '}
                      selected
                    </p>
                  ) : null}
                  <p className="muted">Max total images per product: 10.</p>
                </section>
              </div>

              {localError ? <p className="error">{localError}</p> : null}

              <div className="modal-actions">
                <button type="submit" disabled={loading}>
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function AdminLayout({
  email,
  activeSection,
  onSectionChange,
  onLogout,
  categories,
  products,
  orders,
  onCreateCategory,
  onDeleteCategory,
  onReactivateCategory,
  onCreateProduct,
  onDeleteProduct,
  onReactivateProduct,
  onUpdateProduct,
  onUpdateOrderStatus,
  loading,
  ordersLoading,
}) {
  return (
    <div className="admin-layout">
      <SidebarNav activeSection={activeSection} onSelect={onSectionChange} />

      <div className="admin-main">
        <Topbar email={email} onLogout={onLogout} />

        <main className="admin-content">
          <section className="content-header">
            <h2>{sectionTitle[activeSection]}</h2>
            <p>
              This section is ready for data module integration when you add orders,
              products, and customer APIs.
            </p>
          </section>

          {activeSection === 'categories' ? (
            <CategoriesManager
              categories={categories}
              onCreateCategory={onCreateCategory}
              onDeleteCategory={onDeleteCategory}
              onReactivateCategory={onReactivateCategory}
              loading={loading}
            />
          ) : null}

          {activeSection === 'products' ? (
            <ProductsCreateManager
              categories={categories}
              onCreateProduct={onCreateProduct}
              loading={loading}
            />
          ) : null}

          {activeSection === 'all-products' ? (
            <AllProductsPage
              categories={categories}
              products={products}
              onDeleteProduct={onDeleteProduct}
              onReactivateProduct={onReactivateProduct}
              onUpdateProduct={onUpdateProduct}
              loading={loading}
            />
          ) : null}

          {activeSection === 'orders' ? (
            <OrdersManager
              orders={orders}
              loading={ordersLoading}
              onUpdateOrderStatus={onUpdateOrderStatus}
            />
          ) : null}

          {!['categories', 'products', 'all-products', 'orders'].includes(activeSection) ? (
            <section className="placeholder-grid">
              <article className="placeholder-card">
                <h3>Overview</h3>
                <p>Track business metrics and KPIs here.</p>
              </article>
              <article className="placeholder-card">
                <h3>Recent Activity</h3>
                <p>Show latest orders, updates, and alerts.</p>
              </article>
              <article className="placeholder-card">
                <h3>System Status</h3>
                <p>Display deployment, auth, and integration health.</p>
              </article>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  )
}

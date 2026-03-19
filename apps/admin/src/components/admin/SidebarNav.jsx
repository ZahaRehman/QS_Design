const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'categories', label: 'Categories' },
  { id: 'products', label: 'Products' },
  { id: 'all-products', label: 'All Products' },
  { id: 'orders', label: 'Orders' },
  { id: 'customers', label: 'Customers' },
]

const qsLogoUrl =
  'https://res.cloudinary.com/dt0becq6s/image/upload/v1773929899/Artistic_QS_logo_with_vibrant_splashes-removebg-preview_jelzag.png'

export function SidebarNav({ activeSection, onSelect }) {
  return (
    <aside className="admin-sidebar">
      <div className="brand">
        <img src={qsLogoUrl} className="brand-logo" alt="QS logo" />
        <h1>QS</h1>
      </div>

      <nav aria-label="Admin navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

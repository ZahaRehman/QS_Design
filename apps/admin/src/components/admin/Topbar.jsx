export function Topbar({ email, onLogout }) {
  return (
    <header className="admin-topbar">
      <div>
        <p className="eyebrow">Authenticated Admin</p>
        <p className="user-email">{email}</p>
      </div>
      <button type="button" className="logout-btn" onClick={onLogout}>
        Logout
      </button>
    </header>
  )
}

import { useMemo, useState } from 'react'

const STATUS_OPTIONS = [
  { id: 'pending', label: 'Pending' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
]

const statusLabel = (status) => {
  if (status === 'pending') return 'Pending'
  if (status === 'shipped') return 'Shipped'
  if (status === 'completed') return 'Completed'
  return status ?? 'Unknown'
}

const money = ({ cents, currency }) => {
  const code = (currency ?? 'USD').toUpperCase()
  const amount = (Number(cents) || 0) / 100
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${code}`
  }
}

export function OrdersManager({ orders, loading, onUpdateOrderStatus }) {
  const [statusFilter, setStatusFilter] = useState('pending')

  const visibleOrders = useMemo(() => {
    if (!Array.isArray(orders)) return []
    if (statusFilter === 'all') return orders
    return orders.filter((o) => o.status === statusFilter)
  }, [orders, statusFilter])

  const [modalOpen, setModalOpen] = useState(false)
  const [modalOrder, setModalOrder] = useState(null)
  const [actionBusyOrderId, setActionBusyOrderId] = useState(null)
  const [localError, setLocalError] = useState('')

  const openModal = (order) => {
    setLocalError('')
    setModalOrder(order)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalOrder(null)
    setLocalError('')
    setActionBusyOrderId(null)
  }

  const mark = async (order, nextStatus) => {
    if (!order?.id) return
    const confirmed = window.confirm(
      `Mark order ${order.id} as ${statusLabel(nextStatus)}?`,
    )
    if (!confirmed) return

    setLocalError('')
    setActionBusyOrderId(order.id)
    try {
      const updated = await onUpdateOrderStatus({ orderId: order.id, status: nextStatus })
      // Keep modal in sync without forcing a full reload.
      setModalOrder(updated ?? order)
    } catch (e) {
      setLocalError(e?.message ?? 'Failed to update order status.')
    } finally {
      setActionBusyOrderId(null)
    }
  }

  return (
    <div className="orders-container">
      <section className="placeholder-card">
        <div className="orders-header">
          <h3>Orders</h3>
          <div className="orders-filter">
            <label htmlFor="orders-status-filter">Status</label>
            <select
              id="orders-status-filter"
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={loading}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? <p>Loading orders...</p> : null}
        {localError && !modalOpen ? <p className="error">{localError}</p> : null}

        <div className="orders-list">
          {visibleOrders.length === 0 && !loading ? (
            <p className="muted">No orders for this status.</p>
          ) : null}

          {visibleOrders.map((order) => {
            const currency = order.currency ?? 'USD'
            const canShip = order.status === 'pending'
            const canComplete = order.status === 'pending' || order.status === 'shipped'

            return (
              <article key={order.id} className="order-row">
                <div className="order-main">
                  <div className="order-top">
                    <strong className="order-id">
                      Order {String(order.id).slice(0, 8)}
                    </strong>
                    <span
                      className={`status-pill status-pill--${order.status}`}
                      aria-label={`Order status ${order.status}`}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <div className="order-meta">
                    <span className="muted">
                      {order.customer_name || 'Customer'} • {order.shipping_city || '—'}
                    </span>
                    <span className="order-total">
                      {money({ cents: order.total_cents, currency })}
                    </span>
                  </div>

                  <p className="muted order-sub">
                    Created:{' '}
                    {order.created_at
                      ? new Date(order.created_at).toLocaleString()
                      : '—'}
                  </p>
                </div>

                <div className="order-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => openModal(order)}
                  >
                    View
                  </button>
                  {canShip ? (
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={actionBusyOrderId === order.id}
                      onClick={() => mark(order, 'shipped')}
                    >
                      Mark shipped
                    </button>
                  ) : null}
                  {canComplete ? (
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={actionBusyOrderId === order.id}
                      onClick={() => mark(order, 'completed')}
                    >
                      Mark completed
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {modalOpen && modalOrder ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Order details"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3>Order details</h3>
              <button type="button" className="modal-close" onClick={closeModal}>
                Close
              </button>
            </div>

            {localError ? <p className="error">{localError}</p> : null}

            <div className="order-modal-body">
              <div className="order-modal-summary">
                <p>
                  <strong>Order:</strong> {modalOrder.id}
                </p>
                <p>
                  <strong>Status:</strong> {statusLabel(modalOrder.status)}
                </p>
                <p>
                  <strong>Payment:</strong> {modalOrder.payment_method || 'COD'}
                </p>
                <p>
                  <strong>Customer:</strong> {modalOrder.customer_name || '—'}
                </p>
                <p>
                  <strong>Contact:</strong> {modalOrder.customer_phone || modalOrder.customer_email || '—'}
                </p>
                <p>
                  <strong>Address:</strong>{' '}
                  {[modalOrder.shipping_address1, modalOrder.shipping_address2].filter(Boolean).join(', ') || '—'}
                </p>
                <p className="muted">
                  {modalOrder.shipping_city || '—'} {modalOrder.shipping_state || ''}{' '}
                  {modalOrder.shipping_postal_code || ''}
                </p>
                {modalOrder.notes ? (
                  <p>
                    <strong>Notes:</strong> {modalOrder.notes}
                  </p>
                ) : null}
              </div>

              <div className="order-modal-items">
                <h4>Items</h4>
                {Array.isArray(modalOrder.order_items) && modalOrder.order_items.length ? (
                  <div className="order-items-list">
                    {modalOrder.order_items.map((it) => (
                      <div key={it.id} className="order-item-row">
                        <img
                          className="order-item-image"
                          src={it.image_url_snapshot || ''}
                          alt={it.name_snapshot || 'Item'}
                        />
                        <div className="order-item-main">
                          <div className="order-item-name">{it.name_snapshot || 'Item'}</div>
                          <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                            Qty: {it.qty} • Unit: {money({ cents: it.unit_price_cents, currency: modalOrder.currency })}
                            {it.canvas_size_label ? (
                              <>
                                {' '}
                                • Size: {it.canvas_size_label}
                              </>
                            ) : null}
                          </div>
                          <div className="order-item-total">
                            Line total:{' '}
                            {money({
                              cents: it.line_total_cents,
                              currency: modalOrder.currency,
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No items found for this order.</p>
                )}

                <div className="order-modal-actions">
                  {modalOrder.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={actionBusyOrderId === modalOrder.id}
                        onClick={() => mark(modalOrder, 'shipped')}
                      >
                        Mark shipped
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={actionBusyOrderId === modalOrder.id}
                        onClick={() => mark(modalOrder, 'completed')}
                      >
                        Mark completed
                      </button>
                    </>
                  ) : null}
                  {modalOrder.status === 'shipped' ? (
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={actionBusyOrderId === modalOrder.id}
                      onClick={() => mark(modalOrder, 'completed')}
                    >
                      Mark completed
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}


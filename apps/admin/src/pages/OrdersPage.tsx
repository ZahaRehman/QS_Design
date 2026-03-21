import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Eye, Truck, CheckCircle2 } from "lucide-react";
import { useAdminWorkspace } from "@/contexts/AdminWorkspaceContext";
import type { QSOrder } from "@/contexts/AdminWorkspaceContext";

type FilterStatus = "all" | "pending" | "shipped" | "completed";

const statusLabel = (status: string) => {
  if (status === "pending") return "Pending";
  if (status === "shipped") return "Shipped";
  if (status === "completed") return "Completed";
  return status ?? "Unknown";
};

const money = ({ cents, currency }: { cents: number; currency?: string }) => {
  const code = (currency ?? "USD").toUpperCase();
  const amount = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
};

const statusBadgeClass = (status: string) => {
  if (status === "pending") return "bg-warning/15 text-warning-foreground border-warning/30";
  if (status === "shipped") return "bg-primary/10 text-primary border-primary/20";
  if (status === "completed") return "bg-success/15 text-success border-success/30";
  return "";
};

export default function OrdersPage() {
  const {
    orders,
    handleUpdateOrderStatus,
    ordersLoading,
    catalogLoading,
    error,
    dismissError,
  } = useAdminWorkspace();

  const [filter, setFilter] = useState<FilterStatus>("all");
  const [localError, setLocalError] = useState<string | null>(null);
  const [viewOrder, setViewOrder] = useState<QSOrder | null>(null);
  const [statusAction, setStatusAction] = useState<{
    order: QSOrder;
    newStatus: string;
  } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const filtered =
    filter === "all" ? orders : orders.filter((o: QSOrder) => o.status === filter);

  const handleStatusChange = async () => {
    if (!statusAction) return;
    const next = statusAction;
    setActionBusy(true);
    setLocalError(null);
    try {
      const updated = await handleUpdateOrderStatus({
        orderId: next.order.id,
        status: next.newStatus,
      });
      setStatusAction(null);
      if (updated?.id && viewOrder?.id === updated.id) {
        setViewOrder(updated);
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to update order");
    } finally {
      setActionBusy(false);
    }
  };

  const pageError = localError || error || null;

  return (
    <AdminLayout
      error={pageError}
      onDismissError={() => {
        setLocalError(null);
        dismissError();
      }}
      saving={catalogLoading || actionBusy}
    >
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">Orders</h1>
            <p className="text-sm text-muted-foreground">Track and manage customer orders.</p>
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {ordersLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading orders…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No orders found.</p>
        ) : (
          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order: QSOrder) => (
                  <tr
                    key={order.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground font-mono text-xs">
                      {String(order.id).slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {order.customer_name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={statusBadgeClass(String(order.status))}
                      >
                        {statusLabel(String(order.status))}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {money({ cents: order.total_cents, currency: order.currency })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewOrder(order)}
                          className="gap-1"
                          disabled={actionBusy}
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        {order.status === "pending" ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setStatusAction({ order, newStatus: "shipped" })
                              }
                              className="gap-1 text-primary"
                              disabled={actionBusy}
                            >
                              <Truck className="h-3.5 w-3.5" /> Ship
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setStatusAction({ order, newStatus: "completed" })
                              }
                              className="gap-1 text-success"
                              disabled={actionBusy}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                            </Button>
                          </>
                        ) : null}
                        {order.status === "shipped" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setStatusAction({ order, newStatus: "completed" })
                            }
                            className="gap-1 text-success"
                            disabled={actionBusy}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!viewOrder} onOpenChange={(o) => !o && setViewOrder(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order {viewOrder?.id}</DialogTitle>
          </DialogHeader>
          {viewOrder ? (
            <div className="space-y-4 mt-2 text-sm">
              <div>
                <p className="font-medium text-foreground mb-1">Contact</p>
                <p>{viewOrder.customer_name || "—"}</p>
                <p className="text-muted-foreground">{viewOrder.customer_email || ""}</p>
                <p className="text-muted-foreground">
                  {viewOrder.customer_phone || ""}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Shipping address</p>
                <p className="text-muted-foreground">
                  {[viewOrder.shipping_address1, viewOrder.shipping_address2]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
                <p className="text-muted-foreground">
                  {viewOrder.shipping_city || "—"} {viewOrder.shipping_state || ""}{" "}
                  {viewOrder.shipping_postal_code || ""}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-2">Line items</p>
                <div className="space-y-2">
                  {Array.isArray(viewOrder.order_items) && viewOrder.order_items.length ? (
                    viewOrder.order_items.map(
                      (item: {
                        id: string;
                        name_snapshot?: string;
                        image_url_snapshot?: string;
                        qty?: number;
                        unit_price_cents?: number;
                        line_total_cents?: number;
                        canvas_size_label?: string;
                      }) => (
                        <div key={item.id} className="flex justify-between gap-2">
                          <div>
                            <span>{item.name_snapshot || "Item"}</span>
                            {item.canvas_size_label ? (
                              <span className="text-muted-foreground ml-1">
                                ({item.canvas_size_label})
                              </span>
                            ) : null}
                            <span className="text-muted-foreground"> × {item.qty ?? 0}</span>
                          </div>
                          <span className="tabular-nums shrink-0">
                            {money({
                              cents: item.line_total_cents ?? 0,
                              currency: viewOrder.currency,
                            })}
                          </span>
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-muted-foreground">No line items.</p>
                  )}
                </div>
                <div className="flex justify-between font-medium pt-2 border-t mt-2">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {money({ cents: viewOrder.total_cents, currency: viewOrder.currency })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge
                  variant="outline"
                  className={statusBadgeClass(String(viewOrder.status))}
                >
                  {statusLabel(String(viewOrder.status))}
                </Badge>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!statusAction}
        title={
          statusAction
            ? `Mark as ${statusLabel(statusAction.newStatus)}?`
            : "Update order?"
        }
        description={
          statusAction
            ? `Order ${String(statusAction.order.id).slice(0, 8)}… will be updated.`
            : ""
        }
        confirmLabel={
          statusAction ? `Mark ${statusLabel(statusAction.newStatus)}` : "Confirm"
        }
        onConfirm={() => void handleStatusChange()}
        onCancel={() => setStatusAction(null)}
      />
    </AdminLayout>
  );
}

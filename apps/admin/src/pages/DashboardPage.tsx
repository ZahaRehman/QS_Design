import { AdminLayout } from "@/components/AdminLayout";
import { LayoutDashboard, ShoppingCart, Users } from "lucide-react";
import { useAdminWorkspace } from "@/contexts/AdminWorkspaceContext";

export default function DashboardPage() {
  const {
    products,
    orders,
    categories,
    error,
    dismissError,
    catalogLoading,
  } = useAdminWorkspace();

  const activeProducts = products.filter((p: { is_active?: boolean }) => p.is_active);
  const pendingOrders = orders.filter((o: { status?: string }) => o.status === "pending");

  const placeholders = [
    {
      icon: LayoutDashboard,
      title: "Categories",
      value: String(categories.length),
      sub: "Total categories",
    },
    {
      icon: ShoppingCart,
      title: "Active products",
      value: String(activeProducts.length),
      sub: "Listed in catalog",
    },
    {
      icon: Users,
      title: "Pending orders",
      value: String(pendingOrders.length),
      sub: "Awaiting fulfillment",
    },
  ];

  return (
    <AdminLayout error={error} onDismissError={dismissError} saving={catalogLoading}>
      <h1 className="text-2xl font-semibold text-foreground mb-1">Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-6">Overview of your store.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {placeholders.map((item) => (
          <div key={item.title} className="bg-card border rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                <item.icon className="h-[1.125rem] w-[1.125rem] text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{item.title}</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

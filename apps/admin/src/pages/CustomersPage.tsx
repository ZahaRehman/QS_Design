import { AdminLayout } from "@/components/AdminLayout";
import { Users, UserPlus, Activity } from "lucide-react";
import { useAdminWorkspace } from "@/contexts/AdminWorkspaceContext";

export default function CustomersPage() {
  const { orders, error, dismissError, catalogLoading } = useAdminWorkspace();
  const uniqueEmails = new Set(
    orders
      .map((o: { customer_email?: string }) => o.customer_email)
      .filter(Boolean),
  );

  const placeholders = [
    {
      icon: Users,
      title: "Orders in system",
      value: String(orders.length),
      sub: "All statuses",
    },
    {
      icon: UserPlus,
      title: "Unique customer emails",
      value: String(uniqueEmails.size),
      sub: "From order records",
    },
    {
      icon: Activity,
      title: "Completed orders",
      value: String(orders.filter((o: { status?: string }) => o.status === "completed").length),
      sub: "Lifetime",
    },
  ];

  return (
    <AdminLayout error={error} onDismissError={dismissError} saving={catalogLoading}>
      <h1 className="text-2xl font-semibold text-foreground mb-1">Customers</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Snapshot from order data (full CRM can be added later).
      </p>
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

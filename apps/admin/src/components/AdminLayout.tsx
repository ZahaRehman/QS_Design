import type { ReactNode } from "react";
import { useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminTopbar } from "@/components/AdminTopbar";
import { ErrorBanner } from "@/components/ErrorBanner";
import { SavingOverlay } from "@/components/SavingOverlay";

interface AdminLayoutProps {
  children: ReactNode;
  error?: string | null;
  onDismissError?: () => void;
  saving?: boolean;
}

export function AdminLayout({
  children,
  error = null,
  onDismissError,
  saving = false,
}: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <AdminTopbar onOpenSidebar={() => setSidebarOpen(true)} />
        <ErrorBanner message={error} onDismiss={onDismissError ?? (() => {})} />
        <main className="flex-1 min-h-0 overflow-auto p-6 animate-fade-in">{children}</main>
      </div>
      <SavingOverlay visible={saving} />
    </div>
  );
}

import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, FolderOpen, Package, ShoppingCart, Users, Layers } from "lucide-react";
import qsLogo from "@/assets/qs-logo.png";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/categories", label: "Categories", icon: FolderOpen },
  { to: "/products/new", label: "Products", icon: Package, subLabel: "Create" },
  { to: "/products", label: "All Products", icon: Layers },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/customers", label: "Customers", icon: Users },
];

export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    if (to === "/products") return location.pathname === "/products";
    return location.pathname.startsWith(to);
  };

  const sidebarBody = (
    <>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[hsl(var(--sidebar-border))]">
        <img src={qsLogo} alt="QS" className="h-8 w-8 rounded" />
        <span className="text-base font-semibold tracking-tight" style={{ color: "hsl(var(--sidebar-fg-active))" }}>
          QS Admin
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-auto">
        {navItems.map((item) => (
          <RouterNavLink
            key={item.to}
            to={item.to}
            end={item.to === "/" || item.to === "/products"}
            className={() => `admin-sidebar-link ${isActive(item.to) ? "active" : ""}`}
            onClick={() => onClose()}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </RouterNavLink>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="admin-sidebar w-60 min-h-screen flex flex-col shrink-0 hidden md:flex">
        {sidebarBody}
      </aside>

      {/* Mobile sidebar overlay */}
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onClose();
        }}
      >
        <SheetContent side="left" className="p-0 w-60 bg-transparent">
          <aside className="admin-sidebar w-60 min-h-full flex flex-col">{sidebarBody}</aside>
        </SheetContent>
      </Sheet>
    </>
  );
}

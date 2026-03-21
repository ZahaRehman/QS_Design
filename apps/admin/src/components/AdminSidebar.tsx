import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, FolderOpen, Package, ShoppingCart, Users, Layers } from "lucide-react";
import qsLogo from "@/assets/qs-logo.png";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/categories", label: "Categories", icon: FolderOpen },
  { to: "/products/new", label: "Products", icon: Package, subLabel: "Create" },
  { to: "/products", label: "All Products", icon: Layers },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/customers", label: "Customers", icon: Users },
];

export function AdminSidebar() {
  const location = useLocation();

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    if (to === "/products") return location.pathname === "/products";
    return location.pathname.startsWith(to);
  };

  return (
    <aside className="admin-sidebar w-60 min-h-screen flex flex-col shrink-0">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[hsl(var(--sidebar-border))]">
        <img src={qsLogo} alt="QS" className="h-8 w-8 rounded" />
        <span
          className="text-base font-semibold tracking-tight"
          style={{ color: "hsl(var(--sidebar-fg-active))" }}
        >
          QS Admin
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <RouterNavLink
            key={item.to}
            to={item.to}
            end={item.to === "/" || item.to === "/products"}
            className={() => `admin-sidebar-link ${isActive(item.to) ? "active" : ""}`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </RouterNavLink>
        ))}
      </nav>
    </aside>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { LogOut, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminTopbar({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const { email, logout } = useAuth();

  return (
    <header className="admin-topbar h-14 flex items-center justify-between px-6 gap-4 shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => onOpenSidebar?.()}
        aria-label="Open sidebar"
      >
        <PanelLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{email}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void logout()}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}

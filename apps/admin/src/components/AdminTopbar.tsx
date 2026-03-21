import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminTopbar() {
  const { email, logout } = useAuth();

  return (
    <header className="admin-topbar h-14 flex items-center justify-end px-6 gap-4 shrink-0">
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
    </header>
  );
}

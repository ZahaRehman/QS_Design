import { Loader2 } from "lucide-react";

interface SavingOverlayProps {
  visible: boolean;
  message?: string;
}

export function SavingOverlay({ visible, message = "Saving changes…" }: SavingOverlayProps) {
  if (!visible) return null;
  return (
    <div className="saving-overlay">
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <Loader2 className="h-8 w-8 animate-spin-slow text-primary-foreground" />
        <span className="text-primary-foreground text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

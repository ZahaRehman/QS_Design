import { X } from "lucide-react";

interface ErrorBannerProps {
  message: string | null;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div className="error-banner flex items-center justify-between">
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="ml-4 opacity-80 hover:opacity-100 transition-opacity">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

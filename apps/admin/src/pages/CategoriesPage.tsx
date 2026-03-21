import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { useAdminWorkspace } from "@/contexts/AdminWorkspaceContext";
import type { QSCategory } from "@/contexts/AdminWorkspaceContext";

export default function CategoriesPage() {
  const {
    categories,
    handleCreateCategory,
    handleDeleteCategory,
    handleReactivateCategory,
    catalogLoading,
    error,
    dismissError,
  } = useAdminWorkspace();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QSCategory | null>(null);

  const active = categories.filter((c: QSCategory) => c.is_active);
  const inactive = categories.filter((c: QSCategory) => !c.is_active);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setLocalError("Category name is required.");
      return;
    }
    setLocalError(null);
    try {
      await handleCreateCategory({
        name: name.trim(),
        description: description.trim(),
      });
      setName("");
      setDescription("");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to create category");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await handleDeleteCategory({ id: deleteTarget.id });
      setDeleteTarget(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleReactivate = async (id: string) => {
    setLocalError(null);
    try {
      await handleReactivateCategory({ id });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to reactivate");
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
      saving={catalogLoading}
    >
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold text-foreground mb-1">Categories</h1>
        <p className="text-sm text-muted-foreground mb-6">Manage product categories for your catalog.</p>

        <form onSubmit={handleCreate} className="bg-card border rounded-lg p-5 mb-8 space-y-4">
          <h2 className="text-base font-medium text-foreground">Create category</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Landscapes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={1}
                className="min-h-[40px] resize-none"
              />
            </div>
          </div>
          <Button type="submit" size="sm" className="gap-2" disabled={catalogLoading}>
            <Plus className="h-4 w-4" /> Create
          </Button>
        </form>

        <h2 className="text-base font-medium text-foreground mb-3">Active categories</h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-6">No active categories.</p>
        ) : (
          <div className="space-y-2 mb-8">
            {active.map((cat: QSCategory) => (
              <div
                key={cat.id}
                className="bg-card border rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-foreground">{cat.name}</span>
                  {cat.description ? (
                    <span className="text-sm text-muted-foreground ml-3">{cat.description}</span>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(cat)}
                  className="text-muted-foreground hover:text-destructive"
                  disabled={catalogLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {inactive.length > 0 ? (
          <>
            <h2 className="text-base font-medium text-foreground mb-3">Inactive categories</h2>
            <div className="space-y-2">
              {inactive.map((cat: QSCategory) => (
                <div
                  key={cat.id}
                  className="bg-card border rounded-lg px-4 py-3 flex items-center justify-between opacity-60"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{cat.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      Inactive
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleReactivate(cat.id)}
                    className="gap-1 text-primary"
                    disabled={catalogLoading}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reactivate
                  </Button>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete category?"
        description={`This will deactivate "${deleteTarget?.name ?? ""}". Products in this category won't be affected.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}

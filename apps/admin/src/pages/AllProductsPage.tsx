import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditProductModal } from "@/components/EditProductModal";
import { Pencil, Trash2, RotateCcw } from "lucide-react";
import { useAdminWorkspace } from "@/contexts/AdminWorkspaceContext";
import type { QSProduct } from "@/contexts/AdminWorkspaceContext";

const firstCanvasPriceLabel = (product: QSProduct) => {
  const sizes = Array.isArray(product?.canvas_sizes) ? product.canvas_sizes : [];
  const cents = Number(sizes[0]?.price_cents);
  if (!Number.isFinite(cents)) return "—";
  return `${(cents / 100).toFixed(2)} ${product.currency ?? ""}`.trim();
};

export default function AllProductsPage() {
  const {
    categories,
    products,
    handleDeleteProduct,
    handleReactivateProduct,
    handleUpdateProduct,
    catalogLoading,
    error,
    dismissError,
  } = useAdminWorkspace();

  const [filterCat, setFilterCat] = useState("all");
  const [localError, setLocalError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QSProduct | null>(null);
  const [editTarget, setEditTarget] = useState<QSProduct | null>(null);

  const active = products.filter((p: QSProduct) => p.is_active);
  const inactive = products.filter((p: QSProduct) => !p.is_active);

  const productMatchesCategory = (product: QSProduct) => {
    if (filterCat === "all") return true;
    const categoryIds =
      product.product_categories?.map((pc: { category_id?: string }) => pc?.category_id).filter(Boolean) ??
      [];
    return categoryIds.includes(filterCat);
  };

  const filtered = active.filter(productMatchesCategory);
  const filteredInactive = inactive.filter(productMatchesCategory);

  const getCatNames = (product: QSProduct) => {
    return (product.product_categories ?? [])
      .map((item: { categories?: { name?: string } }) => item.categories?.name)
      .filter(Boolean)
      .join(", ");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await handleDeleteProduct({ id: deleteTarget.id });
      setDeleteTarget(null);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleReactivate = async (id: string) => {
    setLocalError(null);
    try {
      await handleReactivateProduct({ id });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to reactivate");
    }
  };

  const handleSaveEdit = async (args: Parameters<typeof handleUpdateProduct>[0]) => {
    await handleUpdateProduct(args);
    setEditTarget(null);
  };

  const pageError = localError || error || null;
  const activeCategories = categories.filter((c: { is_active?: boolean }) => c.is_active);

  const thumbUrl = (product: QSProduct) => {
    const imgs = product.product_images ?? [];
    return imgs[0]?.image_url ?? "";
  };

  return (
    <AdminLayout
      error={pageError}
      onDismissError={() => {
        setLocalError(null);
        dismissError();
      }}
      saving={catalogLoading}
    >
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">All Products</h1>
            <p className="text-sm text-muted-foreground">Browse and manage your product catalog.</p>
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {activeCategories.map((cat: { id: string; name: string }) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No products found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {filtered.map((product: QSProduct) => (
              <div
                key={product.id}
                className="bg-card border rounded-lg overflow-hidden transition-shadow hover:shadow-md"
              >
                <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                  {thumbUrl(product) ? (
                    <img
                      src={thumbUrl(product)}
                      alt={String(product.name)}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">No image</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-foreground text-sm mb-1">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {getCatNames(product) || "Uncategorized"}
                  </p>
                  <p className="text-sm font-medium text-primary">From {firstCanvasPriceLabel(product)}</p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditTarget(product)}
                      className="gap-1 flex-1"
                      disabled={catalogLoading}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(product)}
                      className="text-muted-foreground hover:text-destructive"
                      disabled={catalogLoading}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredInactive.length > 0 ? (
          <>
            <h2 className="text-base font-medium text-foreground mb-3">Inactive products</h2>
            <div className="space-y-2">
              {filteredInactive.map((product: QSProduct) => (
                <div
                  key={product.id}
                  className="bg-card border rounded-lg px-4 py-3 flex items-center justify-between opacity-60"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">{product.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      Inactive
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditTarget(product)}
                      className="gap-1"
                      disabled={catalogLoading}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleReactivate(product.id)}
                      className="gap-1 text-primary"
                      disabled={catalogLoading}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reactivate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete product?"
        description={`This will deactivate "${deleteTarget?.name ?? ""}". It can be reactivated later.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      {editTarget ? (
        <EditProductModal
          product={editTarget}
          categories={categories}
          loading={catalogLoading}
          onSave={handleSaveEdit}
          onClose={() => setEditTarget(null)}
        />
      ) : null}
    </AdminLayout>
  );
}

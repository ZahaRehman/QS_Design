import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import type { QSCategory, QSProduct } from "@/contexts/AdminWorkspaceContext";

const newCanvasSizeRow = () => ({
  id:
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `size-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  label: "",
  price: "",
});

interface EditProductModalProps {
  product: QSProduct;
  categories: QSCategory[];
  loading: boolean;
  onSave: (args: {
    id: string;
    name: string;
    description: string;
    currency: string;
    categoryIds: string[];
    files: File[];
    imageIdsToRemove: string[];
    canvasSizes: Array<{ id: string; label: string; priceCents: number }>;
  }) => Promise<void>;
  onClose: () => void;
}

export function EditProductModal({ product, categories, loading, onSave, onClose }: EditProductModalProps) {
  const selectedCategoryIdsFromProduct = (product.product_categories ?? [])
    .map((pc: { category_id?: string }) => pc.category_id)
    .filter(Boolean) as string[];

  const [name, setName] = useState(String(product.name ?? ""));
  const [description, setDescription] = useState(String(product.description ?? ""));
  const [currency, setCurrency] = useState(String((product.currency ?? "USD").toUpperCase()));
  const sizes = Array.isArray(product.canvas_sizes) ? product.canvas_sizes : [];
  const [canvasSizeRows, setCanvasSizeRows] = useState(() =>
    sizes.length
      ? sizes.map((s: { id?: string; label?: string; price_cents?: number }) => ({
          id: typeof s.id === "string" && s.id ? s.id : newCanvasSizeRow().id,
          label: typeof s.label === "string" ? s.label : "",
          price:
            s.price_cents != null && Number.isFinite(Number(s.price_cents))
              ? (Number(s.price_cents) / 100).toFixed(2)
              : "",
        }))
      : [newCanvasSizeRow()],
  );
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>(selectedCategoryIdsFromProduct);
  const [editImageIdsToRemove, setEditImageIdsToRemove] = useState<string[]>([]);
  const [editFilesToAdd, setEditFilesToAdd] = useState<File[]>([]);
  const [error, setError] = useState("");

  const activeCats = categories.filter((c: QSCategory) => c.is_active);

  const addSize = () => {
    if (canvasSizeRows.length >= 20) return;
    setCanvasSizeRows((prev) => [...prev, newCanvasSizeRow()]);
  };

  const removeSize = (id: string) => {
    if (canvasSizeRows.length <= 1) return;
    setCanvasSizeRows((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSize = (id: string, field: "label" | "price", value: string) => {
    setCanvasSizeRows((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const toggleCat = (catId: string) => {
    setEditCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId],
    );
  };

  const handleToggleRemoveImage = (imageId: string) => {
    setEditImageIdsToRemove((current) => {
      const exists = current.includes(imageId);
      if (exists) return current.filter((id) => id !== imageId);
      return [...current, imageId];
    });
  };

  const handleSave = async () => {
    setError("");
    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (currency.length !== 3) {
      setError("Currency must be a 3-letter code.");
      return;
    }

    const canvasSizes: Array<{ id: string; label: string; priceCents: number }> = [];
    for (const row of canvasSizeRows) {
      const label = row.label.trim();
      if (!label) continue;
      const rowPrice = Number(row.price);
      if (!Number.isFinite(rowPrice) || rowPrice < 0) {
        setError("Each canvas size with a label needs a valid price.");
        return;
      }
      canvasSizes.push({
        id: row.id,
        label,
        priceCents: Math.round(rowPrice * 100),
      });
    }
    if (canvasSizes.length === 0) {
      setError("Add at least one canvas size with label and price.");
      return;
    }

    try {
      await onSave({
        id: product.id,
        name: name.trim(),
        description: description.trim(),
        currency,
        categoryIds: editCategoryIds,
        files: editFilesToAdd,
        imageIdsToRemove: editImageIdsToRemove,
        canvasSizes,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const productImages = Array.isArray(product.product_images) ? product.product_images : [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {error ? (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Product name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={loading}
            />
          </div>
          <div className="space-y-2 max-w-[120px]">
            <Label>Currency</Label>
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
              maxLength={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Canvas sizes</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSize}
                disabled={canvasSizeRows.length >= 20 || loading}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {canvasSizeRows.map((size, i) => (
              <div key={size.id} className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder={i === 0 ? 'Listing "from" size' : "Label"}
                  value={size.label}
                  onChange={(e) => updateSize(size.id, "label", e.target.value)}
                  disabled={loading}
                />
                <Input
                  className="w-24"
                  type="number"
                  step="0.01"
                  min="0"
                  value={size.price}
                  onChange={(e) => updateSize(size.id, "price", e.target.value)}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSize(size.id)}
                  disabled={canvasSizeRows.length <= 1 || loading}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-3">
              {activeCats.map((cat: QSCategory) => (
                <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={editCategoryIds.includes(cat.id)}
                    onCheckedChange={() => toggleCat(cat.id)}
                    disabled={loading}
                  />
                  {cat.name}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Existing images (check to remove)</Label>
            {productImages.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {productImages.map((image: { id: string; image_url: string; alt_text?: string }) => (
                  <div
                    key={image.id}
                    className={`relative w-16 h-16 rounded border overflow-hidden ${
                      editImageIdsToRemove.includes(image.id) ? "opacity-30" : ""
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={image.alt_text || String(product.name)}
                      className="object-cover w-full h-full"
                    />
                    <label className="absolute bottom-0.5 right-0.5 cursor-pointer">
                      <Checkbox
                        checked={editImageIdsToRemove.includes(image.id)}
                        onCheckedChange={() => handleToggleRemoveImage(image.id)}
                        className="h-3.5 w-3.5"
                        disabled={loading}
                      />
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No existing images.</p>
            )}
            <Label className="pt-2">Add new images</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              disabled={loading}
              onChange={(e) => setEditFilesToAdd(Array.from(e.target.files ?? []))}
            />
            <p className="text-xs text-muted-foreground">Max total images per product: 10.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={() => void handleSave()} disabled={loading}>
              Save changes
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

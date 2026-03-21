import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { useAdminWorkspace } from "@/contexts/AdminWorkspaceContext";
import type { QSCategory } from "@/contexts/AdminWorkspaceContext";

const newCanvasSizeRow = () => ({
  id:
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `size-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  label: "",
  price: "",
});

export default function CreateProductPage() {
  const navigate = useNavigate();
  const { categories, handleCreateProduct, catalogLoading, error, dismissError } = useAdminWorkspace();

  const [localError, setLocalError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [canvasSizeRows, setCanvasSizeRows] = useState(() => [newCanvasSizeRow()]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const activeCategories = categories.filter((c: QSCategory) => c.is_active);

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
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!name.trim()) {
      setLocalError("Product name is required.");
      return;
    }
    if (currency.length !== 3) {
      setLocalError("Currency must be a 3-letter code.");
      return;
    }

    const canvasSizes: Array<{ id: string; label: string; priceCents: number }> = [];
    for (const row of canvasSizeRows) {
      const label = row.label.trim();
      if (!label) continue;
      const rowPrice = Number(row.price);
      if (!Number.isFinite(rowPrice) || rowPrice < 0) {
        setLocalError("Each canvas size with a label needs a valid price.");
        return;
      }
      canvasSizes.push({
        id: row.id,
        label,
        priceCents: Math.round(rowPrice * 100),
      });
    }
    if (canvasSizes.length === 0) {
      setLocalError("Add at least one canvas size with label and price.");
      return;
    }

    try {
      await handleCreateProduct({
        name: name.trim(),
        description: description.trim(),
        currency,
        categoryIds: selectedCategoryIds,
        files,
        canvasSizes,
      });
      setName("");
      setDescription("");
      setCurrency("USD");
      setCanvasSizeRows([newCanvasSizeRow()]);
      setSelectedCategoryIds([]);
      setFiles([]);
      navigate("/products");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to create product");
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
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-foreground mb-1">Create product</h1>
        <p className="text-sm text-muted-foreground mb-6">Add a new product to your catalog.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border rounded-lg p-5 space-y-4">
            <div className="space-y-2">
              <Label>Product name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mountain Sunset"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product description"
                rows={3}
              />
            </div>
            <div className="space-y-2 max-w-[120px]">
              <Label>Currency</Label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="USD"
                maxLength={3}
                required
              />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Canvas sizes</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  First row = storefront listing &quot;from&quot; price
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSize}
                disabled={canvasSizeRows.length >= 20 || catalogLoading}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add size
              </Button>
            </div>
            <div className="space-y-2">
              {canvasSizeRows.map((size, i) => (
                <div key={size.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder={
                        i === 0
                          ? 'e.g. 12×16 inches (listing "from" price)'
                          : "e.g. 18×24 inches"
                      }
                      value={size.label}
                      onChange={(e) => updateSize(size.id, "label", e.target.value)}
                      disabled={catalogLoading}
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Price"
                      value={size.price}
                      onChange={(e) => updateSize(size.id, "price", e.target.value)}
                      disabled={catalogLoading}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSize(size.id)}
                    disabled={canvasSizeRows.length <= 1 || catalogLoading}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border rounded-lg p-5 space-y-3">
            <Label className="text-base">Categories</Label>
            <div className="flex flex-wrap gap-3">
              {activeCategories.map((cat: QSCategory) => (
                <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={selectedCategoryIds.includes(cat.id)}
                    onCheckedChange={() => toggleCat(cat.id)}
                    disabled={catalogLoading}
                  />
                  {cat.name}
                </label>
              ))}
              {activeCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories available.</p>
              ) : null}
            </div>
          </div>

          <div className="bg-card border rounded-lg p-5 space-y-3">
            <Label className="text-base">Images ({files.length}/10)</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              disabled={catalogLoading}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            <p className="text-xs text-muted-foreground">Upload up to 10 images per product.</p>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={catalogLoading}>
              Create product
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/products")}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

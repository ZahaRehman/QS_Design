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
  width: "",
  height: "",
  price: "",
});

export default function CreateProductPage() {
  const navigate = useNavigate();
  const { categories, handleCreateProduct, catalogLoading, error, dismissError } = useAdminWorkspace();

  const [localError, setLocalError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const currency = "PKR";
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

  const updateSize = (id: string, field: "width" | "height" | "price", value: string) => {
    setCanvasSizeRows((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const makeCanvasLabel = (width: string, height: string) => {
    // Store label is what the store UI displays for canvas sizes.
    // Admin should NOT type the x / ×; we always format it here.
    return `Canvas ${width}×${height}"`;
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

    const canvasSizes: Array<{ id: string; label: string; priceCents: number }> = [];
    for (const row of canvasSizeRows) {
      const width = row.width.trim();
      const height = row.height.trim();
      if (!width && !height) continue;
      if (!width || !height) {
        setLocalError("Each canvas size must include both width and height.");
        return;
      }

      const widthNum = Number(width);
      const heightNum = Number(height);
      if (!Number.isFinite(widthNum) || widthNum <= 0 || !Number.isFinite(heightNum) || heightNum <= 0) {
        setLocalError("Canvas width and height must be valid numbers greater than 0.");
        return;
      }

      const priceTrim = row.price.trim();
      if (!priceTrim) {
        setLocalError("Each canvas size must include a valid price.");
        return;
      }
      const rowPrice = Number(priceTrim);
      if (!Number.isFinite(rowPrice) || rowPrice < 0) {
        setLocalError("Canvas price must be a valid number (>= 0).");
        return;
      }
      canvasSizes.push({
        id: row.id,
        label: makeCanvasLabel(width, height),
        priceCents: Math.round(rowPrice * 100),
      });
    }
    if (canvasSizes.length === 0) {
      setLocalError("Add at least one canvas size with width, height, and price.");
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
                <div key={size.id} className="rounded-md border border-border p-3">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_150px_auto] gap-3 items-end">
                    <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center min-w-0">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        className="min-w-0"
                        placeholder={i === 0 ? "Width (e.g. 12)" : "Width"}
                        value={size.width}
                        onChange={(e) => updateSize(size.id, "width", e.target.value)}
                        disabled={catalogLoading}
                      />
                      <span className="text-sm font-semibold text-muted-foreground">×</span>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        className="min-w-0"
                        placeholder={i === 0 ? "Height (e.g. 16)" : "Height"}
                        value={size.height}
                        onChange={(e) => updateSize(size.id, "height", e.target.value)}
                        disabled={catalogLoading}
                      />
                      <span className="text-sm font-semibold text-muted-foreground">"</span>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Price (PKR)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={i === 0 ? "e.g. 2495" : "Price"}
                        value={size.price}
                        onChange={(e) => updateSize(size.id, "price", e.target.value)}
                        disabled={catalogLoading}
                        inputMode="decimal"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSize(size.id)}
                      disabled={canvasSizeRows.length <= 1 || catalogLoading}
                      className="text-muted-foreground hover:text-destructive shrink-0 justify-self-start md:justify-self-end"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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

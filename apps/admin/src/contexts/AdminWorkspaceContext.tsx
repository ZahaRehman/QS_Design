import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  listCategories,
  listProducts,
  reactivateCategory,
  reactivateProduct,
  updateProduct,
  uploadImageToCloudinary,
} from "@/lib/adminCatalogApi";
import { listOrders, updateOrderStatus } from "@/lib/adminOrdersApi";

export type QSCategory = Record<string, unknown> & { id: string; name?: string; is_active?: boolean };
export type QSProduct = Record<string, unknown> & { id: string; name?: string; is_active?: boolean };
export type QSOrder = Record<string, unknown> & { id: string; status?: string };

interface AdminWorkspaceContextValue {
  categories: QSCategory[];
  products: QSProduct[];
  orders: QSOrder[];
  catalogLoading: boolean;
  ordersLoading: boolean;
  error: string;
  dismissError: () => void;
  handleCreateCategory: (args: { name: string; description?: string }) => Promise<void>;
  handleDeleteCategory: (args: { id: string }) => Promise<void>;
  handleReactivateCategory: (args: { id: string }) => Promise<void>;
  handleCreateProduct: (args: {
    name: string;
    description?: string;
    currency: string;
    categoryIds: string[];
    files: File[];
    canvasSizes: Array<{ id: string; label: string; priceCents: number }>;
  }) => Promise<void>;
  handleDeleteProduct: (args: { id: string }) => Promise<void>;
  handleReactivateProduct: (args: { id: string }) => Promise<void>;
  handleUpdateProduct: (args: {
    id: string;
    name: string;
    description?: string;
    currency: string;
    categoryIds: string[];
    files?: File[];
    imageIdsToRemove?: string[];
    canvasSizes: Array<{ id: string; label: string; priceCents: number }>;
  }) => Promise<void>;
  handleUpdateOrderStatus: (args: {
    orderId: string;
    status: string;
  }) => Promise<QSOrder | undefined>;
}

const AdminWorkspaceContext = createContext<AdminWorkspaceContextValue | null>(null);

export function AdminWorkspaceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const accessToken = session?.accessToken as string | undefined;

  const [categories, setCategories] = useState<QSCategory[]>([]);
  const [products, setProducts] = useState<QSProduct[]>([]);
  const [orders, setOrders] = useState<QSOrder[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState("");

  const dismissError = useCallback(() => setError(""), []);

  useEffect(() => {
    const loadCatalog = async () => {
      if (!accessToken) return;
      try {
        setOrdersLoading(true);
        const [categoriesData, productsData, ordersData] = await Promise.all([
          listCategories({ accessToken }),
          listProducts({ accessToken }),
          listOrders({ accessToken, status: "all" }),
        ]);
        setCategories(categoriesData.categories ?? []);
        setProducts(productsData.products ?? []);
        setOrders(ordersData.orders ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load data");
      } finally {
        setOrdersLoading(false);
      }
    };

    void loadCatalog();
  }, [accessToken]);

  const handleCreateCategory = useCallback(
    async ({ name, description }: { name: string; description?: string }) => {
      if (!accessToken) throw new Error("Missing session token");
      setCatalogLoading(true);
      try {
        const data = await createCategory({
          accessToken,
          name,
          description,
        });
        setCategories((current: QSCategory[]) =>
          [...current, data.category].sort((a: QSCategory, b: QSCategory) =>
            String(a.name).localeCompare(String(b.name)),
          ),
        );
      } finally {
        setCatalogLoading(false);
      }
    },
    [accessToken],
  );

  const handleDeleteCategory = useCallback(
    async ({ id }: { id: string }) => {
      if (!accessToken) throw new Error("Missing session token");
      setCatalogLoading(true);
      try {
        await deleteCategory({ accessToken, categoryId: id });
        setCategories((current: QSCategory[]) => current.filter((item: QSCategory) => item.id !== id));
      } finally {
        setCatalogLoading(false);
      }
    },
    [accessToken],
  );

  const handleReactivateCategory = useCallback(
    async ({ id }: { id: string }) => {
      if (!accessToken) throw new Error("Missing session token");
      setCatalogLoading(true);
      try {
        await reactivateCategory({ accessToken, categoryId: id });
        setCategories((current: QSCategory[]) =>
          current.map((item: QSCategory) =>
            item.id === id ? { ...item, is_active: true } : item,
          ),
        );
      } finally {
        setCatalogLoading(false);
      }
    },
    [accessToken],
  );

  const handleCreateProduct = useCallback(
    async ({
      name,
      description,
      currency,
      categoryIds,
      files,
      canvasSizes,
    }: {
      name: string;
      description?: string;
      currency: string;
      categoryIds: string[];
      files: File[];
      canvasSizes: Array<{ id: string; label: string; priceCents: number }>;
    }) => {
      if (!accessToken) throw new Error("Missing session token");
      if (files.length > 10) {
        throw new Error("You can upload up to 10 images for a product.");
      }
      setCatalogLoading(true);
      try {
        const uploadedImages = [];
        for (const file of files) {
          const uploaded = await uploadImageToCloudinary({
            file,
            accessToken,
          });
          uploadedImages.push(uploaded);
        }

        const data = await createProduct({
          accessToken,
          name,
          description,
          currency,
          categoryIds,
          images: uploadedImages,
          canvasSizes,
        });

        setProducts((current: QSProduct[]) => [data.product, ...current]);
      } finally {
        setCatalogLoading(false);
      }
    },
    [accessToken],
  );

  const handleDeleteProduct = useCallback(
    async ({ id }: { id: string }) => {
      if (!accessToken) throw new Error("Missing session token");
      setCatalogLoading(true);
      try {
        await deleteProduct({ accessToken, productId: id });
        setProducts((current: QSProduct[]) =>
          current.map((item: QSProduct) =>
            item.id === id ? { ...item, is_active: false } : item,
          ),
        );
      } finally {
        setCatalogLoading(false);
      }
    },
    [accessToken],
  );

  const handleReactivateProduct = useCallback(
    async ({ id }: { id: string }) => {
      if (!accessToken) throw new Error("Missing session token");
      setCatalogLoading(true);
      try {
        await reactivateProduct({ accessToken, productId: id });
        setProducts((current: QSProduct[]) =>
          current.map((item: QSProduct) =>
            item.id === id ? { ...item, is_active: true } : item,
          ),
        );
      } finally {
        setCatalogLoading(false);
      }
    },
    [accessToken],
  );

  const handleUpdateProduct = useCallback(
    async ({
      id,
      name,
      description,
      currency,
      categoryIds,
      files,
      imageIdsToRemove,
      canvasSizes,
    }: {
      id: string;
      name: string;
      description?: string;
      currency: string;
      categoryIds: string[];
      files?: File[];
      imageIdsToRemove?: string[];
      canvasSizes: Array<{ id: string; label: string; priceCents: number }>;
    }) => {
      if (!accessToken) throw new Error("Missing session token");

      const existingProduct = products.find((p: QSProduct) => p.id === id);
      const existingImagesCount = existingProduct?.product_images?.length ?? 0;
      const uniqueImageIdsToRemove = Array.isArray(imageIdsToRemove)
        ? [
            ...new Set(
              imageIdsToRemove.filter((imgId) => typeof imgId === "string" && imgId.trim()),
            ),
          ]
        : [];

      const existingImageIds = new Set(
        (existingProduct?.product_images ?? []).map((img: { id: string }) => img.id),
      );
      const removeIntersectionCount = uniqueImageIdsToRemove.filter((imgId) =>
        existingImageIds.has(imgId),
      ).length;

      const keptCount = existingImagesCount - removeIntersectionCount;
      const totalAfterEdit = keptCount + (files?.length ?? 0);
      if (totalAfterEdit > 10) {
        throw new Error("A product can have at most 10 images.");
      }

      setCatalogLoading(true);
      try {
        const uploadedImages = [];
        for (const file of files ?? []) {
          const uploaded = await uploadImageToCloudinary({
            file,
            accessToken,
          });
          uploadedImages.push(uploaded);
        }

        const data = await updateProduct({
          accessToken,
          productId: id,
          name,
          description,
          currency,
          categoryIds,
          imagesToAdd: uploadedImages,
          imageIdsToRemove: uniqueImageIdsToRemove,
          canvasSizes,
        });

        setProducts((current: QSProduct[]) =>
          current.map((p: QSProduct) => (p.id === id ? data.product : p)),
        );
      } finally {
        setCatalogLoading(false);
      }
    },
    [accessToken, products],
  );

  const handleUpdateOrderStatus = useCallback(
    async ({ orderId, status }: { orderId: string; status: string }) => {
      if (!accessToken) throw new Error("Missing session token");

      const data = await updateOrderStatus({ accessToken, orderId, status });
      const updatedOrder = data?.order;

      if (updatedOrder?.id) {
        setOrders((current: QSOrder[]) =>
          current.map((o: QSOrder) => (o.id === updatedOrder.id ? updatedOrder : o)),
        );
      }

      return updatedOrder;
    },
    [accessToken],
  );

  const value = useMemo(
    () => ({
      categories,
      products,
      orders,
      catalogLoading,
      ordersLoading,
      error,
      dismissError,
      handleCreateCategory,
      handleDeleteCategory,
      handleReactivateCategory,
      handleCreateProduct,
      handleDeleteProduct,
      handleReactivateProduct,
      handleUpdateProduct,
      handleUpdateOrderStatus,
    }),
    [
      categories,
      products,
      orders,
      catalogLoading,
      ordersLoading,
      error,
      dismissError,
      handleCreateCategory,
      handleDeleteCategory,
      handleReactivateCategory,
      handleCreateProduct,
      handleDeleteProduct,
      handleReactivateProduct,
      handleUpdateProduct,
      handleUpdateOrderStatus,
    ],
  );

  return (
    <AdminWorkspaceContext.Provider value={value}>{children}</AdminWorkspaceContext.Provider>
  );
}

export function useAdminWorkspace() {
  const ctx = useContext(AdminWorkspaceContext);
  if (!ctx) throw new Error("useAdminWorkspace must be used within AdminWorkspaceProvider");
  return ctx;
}

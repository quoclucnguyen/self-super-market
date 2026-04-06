'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Plus, X, Loader2, Trash2 } from 'lucide-react';
import { ProductForm } from './ProductForm';
import { DeleteDialog } from './DeleteDialog';
import { useToast } from './Toast';
import { SearchBar } from './SearchBar';
import type { ProductInput } from '@/lib/validations/product';

type ProductListItem = {
  id: number;
  name: string;
  barcode: string;
  sku: string | null;
  price: string;
  description: string | null;
  category: string | null;
  categoryName?: string | null;
  brandName?: string | null;
  unit: string;
  weightVolume: string | null;
  origin: string | null;
  ingredients: string | null;
  nutritionalInfo: string | null;
  usageInstructions: string | null;
  storageInstructions: string | null;
  shelfLifeDays: number | null;
  stockQuantity: number;
  imageUrl: string | null;
  imagePublicId: string | null;
  isActive: boolean;
  images?: Array<{
    id?: number;
    productId?: number;
    imageUrl: string;
    imagePublicId: string;
    isPrimary: boolean;
    order: number;
    createdAt?: Date | string;
  }>;
};

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductsResponse {
  products: ProductListItem[];
  pagination: PaginationInfo;
}

interface AdminPageClientProps {
  initialProducts: ProductListItem[];
  initialPagination: PaginationInfo;
  categories: string[];
}

export function AdminPageClient({
  initialProducts,
  initialPagination,
  categories,
}: AdminPageClientProps) {
  // State
  const [products, setProducts] = useState<ProductListItem[]>(initialProducts);
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({ search: '', category: '' });

  // Form state
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const toast = useToast();

  // Fetch products
  const fetchProducts = useCallback(async (params: { search?: string; category?: string; page?: number } = {}) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.set('search', params.search);
      if (params.category) queryParams.set('category', params.category);
      if (params.page) queryParams.set('page', params.page.toString());
      queryParams.set('limit', '50');

      const response = await fetch(`/api/products?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch products');

      const data: ProductsResponse = await response.json();
      setProducts(data.products);
      setPagination(data.pagination);
      setSearchParams({ search: params.search || '', category: params.category || '' });
    } catch {
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Start creating new product
  const startCreate = useCallback(() => {
    setFormMode('create');
    setSelectedProduct(null);
  }, []);

  // Start editing product
  const startEdit = useCallback((product: ProductListItem) => {
    setFormMode('edit');
    setSelectedProduct(product);
  }, []);

  // Clear form (reset to create mode)
  const clearForm = useCallback(() => {
    setFormMode('create');
    setSelectedProduct(null);
  }, []);

  // Handle form submit
  const handleSubmit = useCallback(async (data: ProductInput) => {
    setIsSubmitting(true);
    try {
      const url = formMode === 'create'
        ? '/api/products'
        : `/api/products/${selectedProduct!.id}`;

      const response = await fetch(url, {
        method: formMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Operation failed');
      }

      const result = await response.json();

      // Optimistic update
      if (formMode === 'create') {
        setProducts(prev => [result, ...prev]);
        toast.success('Product created successfully');
        clearForm();
      } else {
        setProducts(prev => prev.map(p => p.id === result.id ? result : p));
        toast.success('Product updated successfully');
        setSelectedProduct(result);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [formMode, selectedProduct, toast, clearForm]);

  // Open delete dialog
  const openDeleteDialog = useCallback((product: ProductListItem) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  }, []);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete product');
      }

      // Optimistic update
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      toast.success('Product deleted successfully');
      setDeleteDialogOpen(false);
      setProductToDelete(null);

      // Clear form if deleted product was being edited
      if (selectedProduct?.id === productToDelete.id) {
        clearForm();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  }, [productToDelete, selectedProduct, toast, clearForm]);

  // Handle search
  const handleSearch = useCallback((search: string, category?: string) => {
    fetchProducts({ search, category, page: 1 });
  }, [fetchProducts]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    fetchProducts({ ...searchParams, page });
  }, [fetchProducts, searchParams]);

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 py-4 bg-card border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
              Products
            </h1>
            <p className="text-sm text-muted-foreground">
              {pagination.total} total
            </p>
          </div>
        </div>

        {/* Search Bar - Integrated in header */}
        <div className="mt-3">
          <SearchBar categories={categories} onSearch={handleSearch} />
        </div>
      </div>

      {/* Split View Layout - Full Height */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
        {/* Left: Product List (2/5 width) */}
        <div className="lg:col-span-2 flex flex-col min-w-0 min-h-0 bg-card border-r border-border overflow-hidden">
          {/* List Header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">
              Products
            </h2>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors min-h-[44px]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New
            </button>
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto">
            <ProductListPanel
              products={products}
              selectedProduct={selectedProduct}
              onSelect={startEdit}
              onDelete={openDeleteDialog}
              isLoading={isLoading}
            />
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-border bg-muted/50">
              <span className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-2.5 py-1 text-xs font-medium text-foreground bg-card border border-border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-11"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-2.5 py-1 text-xs font-medium text-foreground bg-card border border-border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-11"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Form Panel (3/5 width) */}
        <div className="lg:col-span-3 flex flex-col min-w-0 min-h-0 bg-muted overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="max-w-2xl mx-auto">
              {/* Form Card */}
              <div className="bg-card rounded-lg border border-border shadow-sm">
                {/* Form Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card rounded-t-lg">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground">
                      {formMode === 'create' ? 'Add New Product' : 'Edit Product'}
                    </h2>
                    {isSubmitting && (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    )}
                  </div>
                  {selectedProduct && (
                    <button
                      type="button"
                      onClick={clearForm}
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground min-h-9 min-w-9 focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Clear form"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Form Content */}
                <div className="p-6">
                  <ProductForm
                    key={selectedProduct?.id || 'new'}
                    initialData={selectedProduct ? {
                      name: selectedProduct.name,
                      barcode: selectedProduct.barcode,
                      sku: selectedProduct.sku || undefined,
                      price: parseFloat(selectedProduct.price),
                      unit: selectedProduct.unit,
                      weightVolume: selectedProduct.weightVolume || undefined,
                      categoryName: selectedProduct.categoryName || selectedProduct.category || undefined,
                      brandName: selectedProduct.brandName || undefined,
                      origin: selectedProduct.origin || undefined,
                      ingredients: selectedProduct.ingredients || undefined,
                      nutritionalInfo: selectedProduct.nutritionalInfo || undefined,
                      usageInstructions: selectedProduct.usageInstructions || undefined,
                      storageInstructions: selectedProduct.storageInstructions || undefined,
                      shelfLifeDays: selectedProduct.shelfLifeDays || undefined,
                      description: selectedProduct.description || undefined,
                      category: selectedProduct.category || undefined,
                      stockQuantity: selectedProduct.stockQuantity,
                      imageUrl: selectedProduct.imageUrl || undefined,
                      imagePublicId: selectedProduct.imagePublicId || undefined,
                      images: selectedProduct.images?.map((image, index) => ({
                        imageUrl: image.imageUrl,
                        imagePublicId: image.imagePublicId,
                        isPrimary: image.isPrimary,
                        order: image.order ?? index,
                      })) || [],
                      isActive: selectedProduct.isActive,
                    } : undefined}
                    onSubmit={handleSubmit}
                    submitLabel={formMode === 'create' ? 'Create Product' : 'Update Product'}
                    isSubmitting={isSubmitting}
                    imagePriority={false}
                    hideCancelButton
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <DeleteDialog
        isOpen={deleteDialogOpen}
        productName={productToDelete?.name || ''}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setProductToDelete(null);
        }}
      />
    </div>
  );
}

// Product List Panel Component
interface ProductListPanelProps {
  products: ProductListItem[];
  selectedProduct: ProductListItem | null;
  onSelect: (product: ProductListItem) => void;
  onDelete: (product: ProductListItem) => void;
  isLoading: boolean;
}

function ProductListPanel({
  products,
  selectedProduct,
  onSelect,
  onDelete,
  isLoading,
}: ProductListPanelProps) {
  const getStockBadgeClass = (quantity: number) => {
    if (quantity > 10) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800';
    }
    if (quantity > 0) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800';
    }
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800';
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
          <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">No products</h3>
        <p className="text-xs text-muted-foreground">
          Add a new product to get started
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {products.map((product) => (
        <div
          key={product.id}
          className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
            selectedProduct?.id === product.id
              ? 'bg-primary/10 dark:bg-primary/20'
              : 'hover:bg-accent'
          }`}
          onClick={() => onSelect(product)}
        >
          {product.imageUrl ? (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate text-sm">
              {product.name}
            </h3>
            <p className="text-xs font-mono text-muted-foreground truncate">
              {product.barcode}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-semibold text-foreground text-xs">
                ${parseFloat(product.price).toFixed(2)}
              </span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStockBadgeClass(product.stockQuantity)}`}>
                {product.stockQuantity}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(product);
            }}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 min-h-9 min-w-9 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Delete ${product.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

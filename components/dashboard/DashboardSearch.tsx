'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DashboardFilters {
  search: string;
  category: string;
  stockStatus: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
  sortBy: 'recent' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';
}

interface DashboardSearchProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  categories: string[];
  resultCount?: number;
}

const stockStatusOptions = [
  { value: 'all', label: 'All Stock' },
  { value: 'in-stock', label: 'In Stock (>10)' },
  { value: 'low-stock', label: 'Low Stock (1-10)' },
  { value: 'out-of-stock', label: 'Out of Stock (0)' },
];

const sortOptions = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'price-asc', label: 'Price (Low to High)' },
  { value: 'price-desc', label: 'Price (High to Low)' },
];

function hasActiveFilters(filters: DashboardFilters): boolean {
  return !!(
    filters.search ||
    filters.category ||
    filters.stockStatus !== 'all' ||
    filters.sortBy !== 'recent'
  );
}

export function DashboardSearch({
  filters,
  onFiltersChange,
  categories,
  resultCount,
}: DashboardSearchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      category: '',
      stockStatus: 'all',
      sortBy: 'recent',
    });
  };

  const activeFilterCount = [
    filters.search,
    filters.category,
    filters.stockStatus !== 'all' ? 'stock' : '',
    filters.sortBy !== 'recent' ? 'sort' : '',
  ].filter(Boolean).length;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      {/* Basic Search */}
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, barcode, or SKU..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="relative"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <Select
                value={filters.category}
                onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stock Status
              </label>
              <Select
                value={filters.stockStatus}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, stockStatus: value as DashboardFilters['stockStatus'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stockStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, sortBy: value as DashboardFilters['sortBy'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Active Filters & Clear */}
        {hasActiveFilters(filters) && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex flex-wrap gap-2 text-sm">
              {filters.search && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300">
                  Search: "{filters.search}"
                  <button
                    onClick={() => onFiltersChange({ ...filters, search: '' })}
                    className="hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.category && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300">
                  Category: {filters.category}
                  <button
                    onClick={() => onFiltersChange({ ...filters, category: '' })}
                    className="hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.stockStatus !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300">
                  {stockStatusOptions.find((o) => o.value === filters.stockStatus)?.label}
                  <button
                    onClick={() => onFiltersChange({ ...filters, stockStatus: 'all' })}
                    className="hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {(resultCount !== undefined || hasActiveFilters(filters)) && (
        <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {resultCount !== undefined && (
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {resultCount}
              </span>
            )}
            {resultCount !== undefined && ' products found'}
            {hasActiveFilters(filters) && resultCount === undefined && 'Showing filtered results'}
          </p>
        </div>
      )}
    </div>
  );
}

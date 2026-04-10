'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

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
    <div className="wf-panel">
      {/* Basic Search */}
      <div className="p-3 border-b border-gray-300">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 wf-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, barcode, or SKU..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="wf-input w-full pl-8"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="wf-button wf-focus-visible relative"
          >
            <SlidersHorizontal className="w-3 h-3 mr-1" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-700 text-white rounded-full flex items-center justify-center text-[10px]">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block wf-label mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
                className="wf-select w-full"
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block wf-label mb-1">
                Stock Status
              </label>
              <select
                value={filters.stockStatus}
                onChange={(e) =>
                  onFiltersChange({ ...filters, stockStatus: e.target.value as DashboardFilters['stockStatus'] })
                }
                className="wf-select w-full"
              >
                {stockStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block wf-label mb-1">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  onFiltersChange({ ...filters, sortBy: e.target.value as DashboardFilters['sortBy'] })
                }
                className="wf-select w-full"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Active Filters & Clear */}
        {hasActiveFilters(filters) && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <span className="wf-badge flex items-center gap-1">
                  Search: "{filters.search}"
                  <button
                    onClick={() => onFiltersChange({ ...filters, search: '' })}
                    className="hover:text-gray-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.category && (
                <span className="wf-badge flex items-center gap-1">
                  Category: {filters.category}
                  <button
                    onClick={() => onFiltersChange({ ...filters, category: '' })}
                    className="hover:text-gray-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.stockStatus !== 'all' && (
                <span className="wf-badge flex items-center gap-1">
                  {stockStatusOptions.find((o) => o.value === filters.stockStatus)?.label}
                  <button
                    onClick={() => onFiltersChange({ ...filters, stockStatus: 'all' })}
                    className="hover:text-gray-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleClearFilters}
              className="wf-button wf-focus-visible"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {(resultCount !== undefined || hasActiveFilters(filters)) && (
        <div className="wf-statusbar px-3 py-2">
          <p className="text-xs wf-text-muted">
            {resultCount !== undefined && (
              <span className="font-medium wf-text">
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

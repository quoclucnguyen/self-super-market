'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  categories?: string[];
  onSearch?: (search: string, category?: string) => void;
  initialSearch?: string;
  initialCategory?: string;
}

export function SearchBar({
  categories = [],
  onSearch,
  initialSearch = '',
  initialCategory = '',
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch || searchParams.get('search') || '');
  const [category, setCategory] = useState(initialCategory || searchParams.get('category') || '');

  // Refs to track previous values to prevent unnecessary searches
  const prevSearchRef = useRef(search);
  const prevCategoryRef = useRef(category);
  const isInitialMountRef = useRef(true);

  const handleSearchChange = useCallback((newSearch: string, newCategory: string) => {
    if (onSearch) {
      onSearch(newSearch, newCategory);
    } else {
      const params = new URLSearchParams();
      if (newSearch) params.set('search', newSearch);
      if (newCategory) params.set('category', newCategory);
      params.set('page', '1');
      router.push(`/admin?${params.toString()}`);
    }
  }, [onSearch, router]);

  useEffect(() => {
    // Skip on initial mount to prevent searching with initial values
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevSearchRef.current = search;
      prevCategoryRef.current = category;
      return;
    }

    // Only trigger search if values actually changed
    if (prevSearchRef.current !== search || prevCategoryRef.current !== category) {
      const debounce = setTimeout(() => {
        handleSearchChange(search, category);
        prevSearchRef.current = search;
        prevCategoryRef.current = category;
      }, 300);

      return () => clearTimeout(debounce);
    }
  }, [search, category, handleSearchChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, barcode, or description..."
          className="pl-10 h-10"
        />
      </div>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="px-4 py-2 h-10 rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import type { SearchFilters, SearchMode } from "@/lib/search-filters";

const DEFAULT_FILTERS: SearchFilters = {
  mode: "all",
  query: "",
};

function getStorageKey(page: string): string {
  return `nexbaron-search-filters-${page}`;
}

export function useSearchFilters(page: string) {
  const [filters, setFilters] = useState<SearchFilters>(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(page));
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_FILTERS, ...parsed };
      }
    } catch {
      // ignore parse errors
    }
    return DEFAULT_FILTERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey(page), JSON.stringify(filters));
    } catch {
      // ignore write errors
    }
  }, [filters, page]);

  const setMode = useCallback((mode: SearchMode) => {
    setFilters(prev => ({ ...prev, mode }));
  }, []);

  const setQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, query }));
  }, []);

  const setDateRange = useCallback((from?: string, to?: string, field?: "createdAt" | "dueDate" | "acceptedAt" | "launchDate") => {
    setFilters(prev => ({ ...prev, dateFrom: from, dateTo: to, dateField: field }));
  }, []);

  const setAmountRange = useCallback((min?: number, max?: number) => {
    setFilters(prev => ({ ...prev, amountMin: min, amountMax: max }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const setDatePreset = useCallback((from: string, to: string) => {
    setFilters(prev => ({ ...prev, mode: "date", dateFrom: from, dateTo: to }));
  }, []);

  return {
    filters,
    setFilters,
    setMode,
    setQuery,
    setDateRange,
    setAmountRange,
    clearFilters,
    setDatePreset,
  };
}
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Filter, ChevronDown, Calendar, DollarSign, X as XIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SearchFilters, SearchMode } from "@/lib/search-filters";
import { SEARCH_MODES } from "@/lib/search-filters";

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  placeholder?: string;
  showAmountRange?: boolean;
  showDateFieldSelect?: boolean;
}

function DateRangePicker({ 
  filters, 
  onFiltersChange, 
  showDateFieldSelect 
}: { 
  filters: SearchFilters; 
  onFiltersChange: (filters: SearchFilters) => void;
  showDateFieldSelect: boolean;
}) {
  const handleDateFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, dateFrom: e.target.value });
  }, [filters, onFiltersChange]);

  const handleDateToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, dateTo: e.target.value });
  }, [filters, onFiltersChange]);

  const handleDateFieldChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, dateField: e.target.value as "createdAt" | "dueDate" | "acceptedAt" | "launchDate" });
  }, [filters, onFiltersChange]);

  const handlePresetClick = useCallback((days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);
    const format = (d: Date) => d.toISOString().split("T")[0];
    onFiltersChange({
      ...filters,
      mode: "date",
      dateFrom: format(from),
      dateTo: format(to),
    });
  }, [filters, onFiltersChange]);

  return (
    <div className="space-y-3 mb-4 p-3 bg-neutral-bg rounded-lg border border-border">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Date Range</p>
      
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-muted mb-1">From</label>
          <input
            type="date"
            value={filters.dateFrom || ""}
            onChange={handleDateFromChange}
            className="w-full px-3 py-2 bg-neutral-surface border border-border rounded-lg text-sm text-heading placeholder:text-muted focus:outline-none focus:border-accent/50"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">To</label>
          <input
            type="date"
            value={filters.dateTo || ""}
            onChange={handleDateToChange}
            className="w-full px-3 py-2 bg-neutral-surface border border-border rounded-lg text-sm text-heading placeholder:text-muted focus:outline-none focus:border-accent/50"
          />
        </div>
      </div>

      {showDateFieldSelect && (
        <div>
          <label className="block text-xs text-muted mb-1">Date Field</label>
          <select
            value={filters.dateField || "createdAt"}
            onChange={handleDateFieldChange}
            className="w-full px-3 py-2 bg-neutral-surface border border-border rounded-lg text-sm text-heading focus:outline-none focus:border-accent/50"
          >
            <option value="createdAt">Created Date</option>
            <option value="dueDate">Due Date</option>
            <option value="acceptedAt">Accepted Date</option>
            <option value="launchDate">Launch Date</option>
          </select>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Last 7 days", days: 7 },
          { label: "Last 30 days", days: 30 },
          { label: "Last 90 days", days: 90 },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePresetClick(preset.days)}
            className="px-3 py-1.5 text-xs font-medium text-muted hover:text-heading hover:bg-neutral-surface rounded-lg transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AmountRangePicker({ 
  filters, 
  onFiltersChange 
}: { 
  filters: SearchFilters; 
  onFiltersChange: (filters: SearchFilters) => void;
}) {
  const handleAmountMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, amountMin: e.target.value ? Number(e.target.value) : undefined });
  }, [filters, onFiltersChange]);

  const handleAmountMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, amountMax: e.target.value ? Number(e.target.value) : undefined });
  }, [filters, onFiltersChange]);

  return (
    <div className="space-y-3 mb-4 p-3 bg-neutral-bg rounded-lg border border-border">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Amount Range (INR)</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-muted mb-1">Min</label>
          <input
            type="number"
            min="0"
            step="100"
            value={filters.amountMin !== undefined ? filters.amountMin : ""}
            onChange={handleAmountMinChange}
            className="w-full px-3 py-2 bg-neutral-surface border border-border rounded-lg text-sm text-heading placeholder:text-muted focus:outline-none focus:border-accent/50"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Max</label>
          <input
            type="number"
            min="0"
            step="100"
            value={filters.amountMax !== undefined ? filters.amountMax : ""}
            onChange={handleAmountMaxChange}
            className="w-full px-3 py-2 bg-neutral-surface border border-border rounded-lg text-sm text-heading placeholder:text-muted focus:outline-none focus:border-accent/50"
          />
        </div>
      </div>
    </div>
  );
}

export function SearchBar({
  filters,
  onFiltersChange,
  placeholder = "Search...",
  showAmountRange = false,
  showDateFieldSelect = false,
}: SearchBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLButtonElement>(null);

  const handleQueryChange = useCallback((value: string) => {
    onFiltersChange({ ...filters, query: value });
  }, [filters, onFiltersChange]);

  const handleClearQuery = useCallback(() => {
    onFiltersChange({ ...filters, query: "" });
  }, [filters, onFiltersChange]);

  const handleModeChange = useCallback((newMode: SearchMode) => {
    onFiltersChange({ ...filters, mode: newMode });
    setIsDropdownOpen(false);
  }, [filters, onFiltersChange]);

  const handleClearAll = useCallback(() => {
    onFiltersChange({
      mode: "all",
      query: "",
      dateFrom: undefined,
      dateTo: undefined,
      dateField: undefined,
      amountMin: undefined,
      amountMax: undefined,
    });
  }, [onFiltersChange]);

  const hasActiveFilters = 
    filters.query || 
    filters.dateFrom || 
    filters.dateTo || 
    filters.amountMin !== undefined || 
    filters.amountMax !== undefined ||
    filters.mode !== "all";

  const modeLabel = SEARCH_MODES.find(m => m.value === filters.mode)?.label || "All Filters";

  return (
    <div className="space-y-3">
      {/* Main search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          value={filters.query}
          onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 bg-neutral-bg border border-border rounded-xl text-sm text-heading placeholder:text-muted focus:outline-none focus:border-accent/50"
        />
        {filters.query && (
          <button
            onClick={handleClearQuery}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Advanced filters dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-neutral-bg border border-border rounded-xl text-sm font-medium transition-colors",
            (filters.query || filters.dateFrom || filters.dateTo || filters.amountMin !== undefined || filters.amountMax !== undefined || filters.mode !== "all") 
              ? "border-accent/50 bg-accent/5 text-accent" 
              : "text-muted hover:text-heading hover:border-accent/50"
          )}
          ref={dropdownRef}
        >
          <Filter className="h-4 w-4" />
          <span className="flex-1 text-left">Filters</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isDropdownOpen && "rotate-180")} />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl bg-neutral-surface border border-border shadow-lg p-4 animate-in fade-in-0 zoom-in-95">
            {/* Search mode options */}
            <div className="space-y-1 mb-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide px-2 py-1">Search by</p>
              {SEARCH_MODES.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onFiltersChange({ ...filters, mode: option.value })}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    filters.mode === option.value
                      ? "bg-accent/10 text-accent font-medium"
                      : "text-muted hover:text-heading hover:bg-neutral-bg"
                  )}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted flex-1 text-right">{option.description}</span>
                </button>
              ))}
            </div>

            {filters.mode === "date" && (
              <div className="space-y-3 mb-4 p-3 bg-neutral-bg rounded-lg border border-border">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Date Range</p>
                
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-muted mb-1">From</label>
                    <input
                      type="date"
                      value={filters.dateFrom || ""}
                      onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-surface border border-border rounded-lg text-sm text-heading placeholder:text-muted focus:outline-none focus:border-accent/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">To</label>
                    <input
                      type="date"
                      value={filters.dateTo || ""}
                      onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-surface border border-border rounded-lg text-sm text-heading placeholder:text-muted focus:outline-none focus:border-accent/50"
                    />
                  </div>
                </div>

                {showDateFieldSelect && (
                  <div>
                    <label className="block text-xs text-muted mb-1">Date Field</label>
                    <select
                      value={filters.dateField || "createdAt"}
                      onChange={(e) => onFiltersChange({ ...filters, dateField: e.target.value as "createdAt" | "dueDate" | "acceptedAt" | "launchDate" })}
                      className="w-full px-3 py-2 bg-neutral-surface border border-border rounded-lg text-sm text-heading focus:outline-none focus:border-accent/50"
                    >
                      <option value="createdAt">Created Date</option>
                      <option value="dueDate">Due Date</option>
                      <option value="acceptedAt">Accepted Date</option>
                      <option value="launchDate">Launch Date</option>
                    </select>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Last 7 days", days: 7 },
                    { label: "Last 30 days", days: 30 },
                    { label: "Last 90 days", days: 90 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const to = new Date();
                        const from = new Date();
                        from.setDate(to.getDate() - preset.days);
                        const format = (d: Date) => d.toISOString().split("T")[0];
                        onFiltersChange({
                          ...filters,
                          mode: "date",
                          dateFrom: format(from),
                          dateTo: format(to),
                        });
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-muted hover:text-heading hover:bg-neutral-surface rounded-lg transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filters.mode === "amount" && (
              <div className="space-y-3 mb-4 p-3 bg-neutral-bg rounded-lg border border-border">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Amount Range (INR)</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-muted mb-1">Min</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={filters.amountMin !== undefined ? filters.amountMin : ""}
                      onChange={(e) => onFiltersChange({ ...filters, amountMin: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 bg-neutral-surface border border-border rounded-lg text-sm text-heading placeholder:text-muted focus:outline-none focus:border-accent/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">Max</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={filters.amountMax !== undefined ? filters.amountMax : ""}
                      onChange={(e) => onFiltersChange({ ...filters, amountMax: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 bg-neutral-surface border border-border rounded-lg text-sm text-heading placeholder:text-muted focus:outline-none focus:border-accent/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, mode: "date" })}
                  className="px-3 py-1.5 text-xs font-medium text-muted hover:text-heading hover:bg-neutral-surface rounded-lg transition-colors"
                >
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  Date
                </button>
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, mode: "amount" })}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium text-muted hover:text-heading hover:bg-neutral-surface rounded-lg transition-colors",
                    !showAmountRange && "hidden"
                  )}
                >
                  <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                  Amount
                </button>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => onFiltersChange({
                    mode: "all",
                    query: "",
                    dateFrom: undefined,
                    dateTo: undefined,
                    dateField: undefined,
                    amountMin: undefined,
                    amountMax: undefined,
                  })}
                  className="px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
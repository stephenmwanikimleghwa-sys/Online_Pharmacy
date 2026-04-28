import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';

export interface SearchSuggestion {
  id: string;
  label: string;
  type: 'product' | 'category' | 'brand';
  imageUrl?: string;
  price?: number;
}

export interface FilterOption {
  id: string;
  label: string;
  value: string;
  count?: number;
}

export interface SearchFilters {
  category?: string;
  priceRange?: [number, number];
  inStock?: boolean;
  rating?: number;
}

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string, filters?: SearchFilters) => void;
  suggestions?: SearchSuggestion[];
  filterOptions?: {
    categories?: FilterOption[];
    priceRanges?: FilterOption[];
    ratings?: FilterOption[];
  };
  className?: string;
  showFilters?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search for medicines, active compounds, or therapeutic categories...',
  onSearch,
  suggestions = [],
  filterOptions,
  className = '',
  showFilters = true
}) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on query
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.label.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
        handleSuggestionClick(filteredSuggestions[selectedSuggestionIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setShowFilterPanel(false);
    }
  }, [filteredSuggestions, selectedSuggestionIndex]);

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.label);
    setShowSuggestions(false);
    onSearch?.(suggestion.label, filters);
  };

  const handleSearch = () => {
    if (query.trim()) {
      onSearch?.(query, filters);
      setShowSuggestions(false);
    }
  };

  const handleFilterToggle = (filterId: string) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(filterId)) {
        newFilters.delete(filterId);
      } else {
        newFilters.add(filterId);
      }
      return newFilters;
    });
  };

  const clearFilters = () => {
    setActiveFilters(new Set());
    setFilters({});
  };

  const clearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = activeFilters.size > 0;

  return (
    <div className={`relative ${className}`}>
      <div className="relative group">
        {/* Search input */}
        <div className="relative flex items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all duration-200">
          <MagnifyingGlassIcon
            className="h-5 w-5 text-gray-400 ml-4"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
              setSelectedSuggestionIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(query.length > 0)}
            placeholder={placeholder}
            className="flex-1 min-w-0 px-2 sm:px-4 py-3 bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm sm:text-base"
            aria-label="Search"
            aria-expanded={showSuggestions}
            aria-controls="search-suggestions"
            aria-autocomplete="list"
            role="combobox"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="p-2 mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Clear search"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
          {showFilters && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`p-2 mr-2 rounded-lg transition-colors ${
                hasActiveFilters
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              aria-label="Toggle filters"
              aria-pressed={showFilterPanel}
            >
              <FunnelIcon className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={handleSearch}
            className="flex items-center justify-center gap-2 px-3 sm:px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-r-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shrink-0"
            aria-label="Search"
          >
            <MagnifyingGlassIcon className="h-5 w-5 sm:hidden" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            id="search-suggestions"
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
            role="listbox"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  index === selectedSuggestionIndex
                    ? 'bg-indigo-50 dark:bg-indigo-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                role="option"
                aria-selected={index === selectedSuggestionIndex}
              >
                {suggestion.imageUrl && (
                  <img
                    src={suggestion.imageUrl}
                    alt={suggestion.label}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {suggestion.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {suggestion.type}
                  </p>
                </div>
                {suggestion.price && (
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    KSh {suggestion.price.toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter panel */}
      {showFilterPanel && showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category filters */}
            {filterOptions?.categories && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</h4>
                <div className="space-y-2">
                  {filterOptions.categories.map(category => (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={activeFilters.has(category.id)}
                        onChange={() => handleFilterToggle(category.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {category.label}
                      </span>
                      {category.count !== undefined && (
                        <span className="text-xs text-gray-400">({category.count})</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Price range filters */}
            {filterOptions?.priceRanges && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price Range</h4>
                <div className="space-y-2">
                  {filterOptions.priceRanges.map(range => (
                    <label
                      key={range.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={activeFilters.has(range.id)}
                        onChange={() => handleFilterToggle(range.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {range.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Rating filters */}
            {filterOptions?.ratings && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rating</h4>
                <div className="space-y-2">
                  {filterOptions.ratings.map(rating => (
                    <label
                      key={rating.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={activeFilters.has(rating.id)}
                        onChange={() => handleFilterToggle(rating.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {rating.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
            <button
              onClick={() => setShowFilterPanel(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleSearch();
                setShowFilterPanel(false);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;

import { useState, useEffect } from 'react';
import {
  Search,
  Star,
  Clock,
  Save,
  Trash2,
  X,
  Filter,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAdvancedSearch, SearchType } from '@/hooks/use-advanced-search';

interface AdvancedSearchProps {
  searchType: SearchType;
  onSearch: (query: string, filters: Record<string, any>) => void;
  placeholder?: string;
  filters?: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'number';
    options?: Array<{ label: string; value: string }>;
  }>;
  className?: string;
}

export function AdvancedSearch({
  searchType,
  onSearch,
  placeholder = 'Search...',
  filters = [],
  className,
}: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const {
    savedSearches,
    recentSearches,
    loading,
    saveSearch,
    deleteSavedSearch,
    toggleFavorite,
    updateLastUsed,
    addRecentSearch,
    clearRecentSearches,
  } = useAdvancedSearch(searchType);

  const handleSearch = () => {
    if (query.trim() || Object.keys(activeFilters).length > 0) {
      onSearch(query, activeFilters);
      addRecentSearch(query, activeFilters);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const applyFilter = (key: string, value: any) => {
    if (value) {
      setActiveFilters(prev => ({ ...prev, [key]: value }));
    } else {
      const { [key]: _, ...rest } = activeFilters;
      setActiveFilters(rest);
    }
  };

  const clearFilters = () => {
    setActiveFilters({});
  };

  const applySavedSearch = (search: any) => {
    setQuery(search.name);
    setActiveFilters(search.filters);
    onSearch(search.name, search.filters);
    updateLastUsed(search.id);
  };

  const applyRecentSearch = (search: any) => {
    setQuery(search.search_query);
    setActiveFilters(search.filters);
    onSearch(search.search_query, search.filters);
  };

  const handleSaveSearch = async () => {
    if (saveName.trim()) {
      await saveSearch(saveName, activeFilters);
      setSaveName('');
      setShowSaveDialog(false);
    }
  };

  const activeFilterCount = Object.keys(activeFilters).length;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-10 pr-24"
          />
          {(query || activeFilterCount > 0) && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-6">
                  {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setQuery('');
                  clearFilters();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Filter Button */}
        {filters.length > 0 && (
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Filters</h4>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-7 text-xs"
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-3">
                    {filters.map(filter => (
                      <div key={filter.key} className="space-y-2">
                        <Label className="text-xs">{filter.label}</Label>
                        {filter.type === 'select' ? (
                          <select
                            value={activeFilters[filter.key] || ''}
                            onChange={(e) => applyFilter(filter.key, e.target.value)}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                          >
                            <option value="">All</option>
                            {filter.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            type={filter.type}
                            value={activeFilters[filter.key] || ''}
                            onChange={(e) => applyFilter(filter.key, e.target.value)}
                            placeholder={`Filter by ${filter.label.toLowerCase()}`}
                            className="h-9"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Save Search Button */}
        {(query || activeFilterCount > 0) && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSaveDialog(true)}
            title="Save search"
          >
            <Save className="h-4 w-4" />
          </Button>
        )}

        {/* Search Button */}
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Saved & Recent Searches */}
      {(savedSearches.length > 0 || recentSearches.length > 0) && (
        <div className="flex items-start gap-4">
          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Saved Searches</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {savedSearches.slice(0, 5).map(search => (
                  <Button
                    key={search.id}
                    variant="outline"
                    size="sm"
                    className="h-7 gap-2"
                    onClick={() => applySavedSearch(search)}
                  >
                    {search.is_favorite && <Star className="h-3 w-3 fill-current text-yellow-500" />}
                    <span className="text-xs">{search.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(search.id, search.is_favorite);
                      }}
                    >
                      <Star className={cn(
                        'h-3 w-3',
                        search.is_favorite ? 'fill-current text-yellow-500' : 'text-muted-foreground'
                      )} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSavedSearch(search.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Recent</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentSearches}
                  className="h-5 px-2 text-xs"
                >
                  Clear
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.slice(0, 5).map(search => (
                  <Button
                    key={search.id}
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={() => applyRecentSearch(search)}
                  >
                    <span className="text-xs">{search.search_query || 'Advanced search'}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Give this search a name to quickly access it later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g., Available assets in Hyderabad"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveSearch();
                  }
                }}
              />
            </div>
            {activeFilterCount > 0 && (
              <div className="space-y-2">
                <Label>Active Filters</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(activeFilters).map(([key, value]) => (
                    <Badge key={key} variant="secondary">
                      {filters.find(f => f.key === key)?.label}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSearch} disabled={!saveName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

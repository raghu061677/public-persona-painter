// Utility functions for media assets

/**
 * Parse dimensions string into width and height
 * Supports formats: "40x20", "40 X 20", "40*20"
 */
export function parseDimensions(dimensions: string): { w: number; h: number } {
  const cleaned = dimensions.toLowerCase().trim();
  const separators = /[x*×]/;
  const parts = cleaned.split(separators).map(p => parseFloat(p.trim()));
  
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { w: parts[0], h: parts[1] };
  }
  
  return { w: 0, h: 0 };
}

/**
 * Compute total square feet from dimensions string
 */
export function computeTotalSqft(dimensions: string): number {
  const { w, h } = parseDimensions(dimensions);
  return Math.round(w * h);
}

/**
 * Generate search tokens for text search
 * Creates n-grams and variations for fuzzy search
 */
export function buildSearchTokens(inputs: string[]): string[] {
  const tokens = new Set<string>();
  
  inputs.forEach(input => {
    if (!input) return;
    
    const cleaned = input.toLowerCase().trim();
    
    // Add full string
    tokens.add(cleaned);
    
    // Add words
    cleaned.split(/\s+/).forEach(word => {
      if (word.length > 0) {
        tokens.add(word);
        
        // Add n-grams for words longer than 3 chars
        if (word.length > 3) {
          for (let i = 0; i <= word.length - 3; i++) {
            tokens.add(word.substring(i, i + 3));
          }
        }
      }
    });
  });
  
  return Array.from(tokens);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Get status color for badges
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'Available':
      return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'Booked':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    case 'Blocked':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    case 'Maintenance':
      return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

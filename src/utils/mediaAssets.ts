// Utility functions for media assets

/**
 * Parse dimensions string supporting single and multi-face formats
 * Single face: "40x20", "40 X 20"
 * Multi-face: "25x5 - 12x3", "40x20-30x10"
 */
export function parseDimensions(dimensions: string): {
  faces: Array<{ width: number; height: number; label: string }>;
  totalSqft: number;
  isMultiFace: boolean;
} {
  if (!dimensions || typeof dimensions !== 'string') {
    return { faces: [], totalSqft: 0, isMultiFace: false };
  }

  const cleaned = dimensions.trim();
  
  // Split by dash or hyphen to detect multi-face
  const faceStrings = cleaned.split(/\s*[-–—]\s*/).filter(f => f.trim());
  
  if (faceStrings.length === 0) {
    return { faces: [], totalSqft: 0, isMultiFace: false };
  }

  const faces = faceStrings.map((faceStr, index) => {
    const separators = /[xX*×\s]+/;
    const parts = faceStr.split(separators).filter(p => p).map(p => parseFloat(p.trim()));
    
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
      return {
        width: parts[0],
        height: parts[1],
        label: faceStrings.length > 1 ? `Face ${index + 1}` : 'Main Face'
      };
    }
    return null;
  }).filter((f): f is { width: number; height: number; label: string } => f !== null);

  const totalSqft = faces.reduce((sum, face) => sum + (face.width * face.height), 0);

  return {
    faces,
    totalSqft: Math.round(totalSqft),
    isMultiFace: faces.length > 1
  };
}

/**
 * Compute total square feet from dimensions string
 */
export function computeTotalSqft(dimensions: string): number {
  return parseDimensions(dimensions).totalSqft;
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

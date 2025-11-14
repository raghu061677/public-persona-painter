import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utils', () => {
  describe('cn (className merger)', () => {
    it('should merge class names correctly', () => {
      const result = cn('text-primary', 'bg-secondary');
      expect(result).toContain('text-primary');
      expect(result).toContain('bg-secondary');
    });

    it('should handle conditional classes', () => {
      const result = cn('base-class', true && 'conditional-class', false && 'excluded-class');
      expect(result).toContain('base-class');
      expect(result).toContain('conditional-class');
      expect(result).not.toContain('excluded-class');
    });

    it('should override conflicting Tailwind classes', () => {
      const result = cn('p-4', 'p-6');
      // Tailwind merge should keep the last conflicting class
      expect(result).toContain('p-6');
      expect(result).not.toContain('p-4');
    });
  });
});

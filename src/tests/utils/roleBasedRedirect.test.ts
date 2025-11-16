import { describe, it, expect } from 'vitest';
import { getRoleDashboard, canAccessRoute, getRoleLabel } from '@/utils/roleBasedRedirect';

describe('roleBasedRedirect', () => {
  describe('getRoleDashboard', () => {
    it('should return admin dashboard for admin role', () => {
      expect(getRoleDashboard(['admin'])).toBe('/dashboard');
    });

    it('should prioritize admin over other roles', () => {
      expect(getRoleDashboard(['user', 'admin', 'sales'])).toBe('/dashboard');
    });

    it('should return sales dashboard for sales role', () => {
      expect(getRoleDashboard(['sales'])).toBe('/dashboard');
    });

    it('should return operations dashboard for operations role', () => {
      expect(getRoleDashboard(['operations'])).toBe('/operations');
    });

    it('should return finance dashboard for finance role', () => {
      expect(getRoleDashboard(['finance'])).toBe('/finance/quotations');
    });

    it('should return user dashboard as fallback', () => {
      expect(getRoleDashboard([])).toBe('/dashboard');
    });
  });

  describe('canAccessRoute', () => {
    it('should allow admin to access any route', () => {
      expect(canAccessRoute(['admin'], 'finance')).toBe(true);
      expect(canAccessRoute(['admin'], 'operations')).toBe(true);
    });

    it('should allow user with specific role to access route', () => {
      expect(canAccessRoute(['sales', 'user'], 'sales')).toBe(true);
    });

    it('should deny access when user lacks role', () => {
      expect(canAccessRoute(['user'], 'admin')).toBe(false);
    });
  });

  describe('getRoleLabel', () => {
    it('should return correct labels for roles', () => {
      expect(getRoleLabel('admin')).toBe('Administrator');
      expect(getRoleLabel('sales')).toBe('Sales Manager');
      expect(getRoleLabel('operations')).toBe('Operations Manager');
      expect(getRoleLabel('finance')).toBe('Finance Manager');
      expect(getRoleLabel('user')).toBe('User');
    });
  });
});

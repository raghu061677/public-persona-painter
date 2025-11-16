import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PermissionGate, RoleGate } from '@/components/auth/PermissionGate';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

// Mock the hooks
vi.mock('@/contexts/AuthContext');
vi.mock('@/hooks/usePermissions');

describe('PermissionGate', () => {
  it('should render children when user has permission', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAdmin: false,
    } as any);
    
    vi.mocked(usePermissions).mockReturnValue({
      canAccess: () => true,
      loading: false,
    } as any);

    const { getByText } = render(
      <PermissionGate module="clients" action="view">
        <div>Protected Content</div>
      </PermissionGate>
    );

    expect(getByText('Protected Content')).toBeInTheDocument();
  });

  it('should render fallback when user lacks permission', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAdmin: false,
    } as any);
    
    vi.mocked(usePermissions).mockReturnValue({
      canAccess: () => false,
      loading: false,
    } as any);

    const { queryByText, getByText } = render(
      <PermissionGate 
        module="clients" 
        action="view"
        fallback={<div>Access Denied</div>}
      >
        <div>Protected Content</div>
      </PermissionGate>
    );

    expect(queryByText('Protected Content')).not.toBeInTheDocument();
    expect(getByText('Access Denied')).toBeInTheDocument();
  });

  it('should always render for admin users', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAdmin: true,
    } as any);
    
    vi.mocked(usePermissions).mockReturnValue({
      canAccess: () => false,
      loading: false,
    } as any);

    const { getByText } = render(
      <PermissionGate module="clients" action="view">
        <div>Protected Content</div>
      </PermissionGate>
    );

    expect(getByText('Protected Content')).toBeInTheDocument();
  });

  it('should not render while loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAdmin: false,
    } as any);
    
    vi.mocked(usePermissions).mockReturnValue({
      canAccess: () => true,
      loading: true,
    } as any);

    const { container } = render(
      <PermissionGate module="clients" action="view">
        <div>Protected Content</div>
      </PermissionGate>
    );

    expect(container.firstChild).toBeNull();
  });
});

describe('RoleGate', () => {
  it('should render children when user has allowed role', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAdmin: false,
      roles: ['sales', 'user'],
      loading: false,
    } as any);

    const { getByText } = render(
      <RoleGate allowedRoles={['sales', 'operations']}>
        <div>Role Content</div>
      </RoleGate>
    );

    expect(getByText('Role Content')).toBeInTheDocument();
  });

  it('should render fallback when user lacks role', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAdmin: false,
      roles: ['user'],
      loading: false,
    } as any);

    const { queryByText, getByText } = render(
      <RoleGate 
        allowedRoles={['admin', 'finance']}
        fallback={<div>Insufficient Privileges</div>}
      >
        <div>Role Content</div>
      </RoleGate>
    );

    expect(queryByText('Role Content')).not.toBeInTheDocument();
    expect(getByText('Insufficient Privileges')).toBeInTheDocument();
  });

  it('should always render for admin users', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAdmin: true,
      roles: ['admin'],
      loading: false,
    } as any);

    const { getByText } = render(
      <RoleGate allowedRoles={['finance']}>
        <div>Role Content</div>
      </RoleGate>
    );

    expect(getByText('Role Content')).toBeInTheDocument();
  });
});

# Permission System Documentation

## Overview
The Go-Ads 360° permission system provides granular role-based access control (RBAC) with module-level permissions for View, Create, Update, and Delete actions.

## Components

### 1. `usePermissions` Hook
Fetches and manages user permissions based on their roles.

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { canView, canCreate, canUpdate, canDelete, loading } = usePermissions();
  
  // Check specific permissions
  if (canCreate('media_assets')) {
    // Show create button
  }
  
  return (
    <div>
      {canView('clients') && <ClientList />}
      {canUpdate('plans') && <EditButton />}
    </div>
  );
}
```

### 2. `ProtectedRoute` Component
Protects routes based on authentication, roles, and permissions.

```typescript
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Require authentication only
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute requireAuth>
      <Dashboard />
    </ProtectedRoute>
  } 
/>

// Require specific role
<Route 
  path="/admin/users" 
  element={
    <ProtectedRoute requiredRole="admin">
      <UserManagement />
    </ProtectedRoute>
  } 
/>

// Require module permission
<Route 
  path="/admin/clients/new" 
  element={
    <ProtectedRoute requiredModule="clients" requiredAction="create">
      <ClientNew />
    </ProtectedRoute>
  } 
/>

// Multiple roles allowed
<Route 
  path="/reports" 
  element={
    <ProtectedRoute requiredRole={['admin', 'sales', 'finance']}>
      <Reports />
    </ProtectedRoute>
  } 
/>
```

### 3. `PermissionGate` Component
Conditionally renders UI elements based on permissions.

```typescript
import { PermissionGate } from '@/components/auth/PermissionGate';

function ClientsList() {
  return (
    <div>
      <h1>Clients</h1>
      
      {/* Only show button if user can create clients */}
      <PermissionGate module="clients" action="create">
        <Button onClick={handleCreate}>Add Client</Button>
      </PermissionGate>
      
      {/* Show fallback if no permission */}
      <PermissionGate 
        module="clients" 
        action="delete"
        fallback={<span className="text-muted-foreground">No delete access</span>}
      >
        <Button variant="destructive">Delete</Button>
      </PermissionGate>
    </div>
  );
}
```

### 4. `RoleGate` Component
Conditionally renders based on user roles.

```typescript
import { RoleGate } from '@/components/auth/PermissionGate';

function AdminPanel() {
  return (
    <div>
      <RoleGate allowedRoles={['admin']}>
        <AdminSettings />
      </RoleGate>
      
      <RoleGate allowedRoles={['admin', 'sales']}>
        <SalesReports />
      </RoleGate>
      
      <RoleGate 
        allowedRoles={['operations']}
        fallback={<div>Access restricted to operations team</div>}
      >
        <FieldOperations />
      </RoleGate>
    </div>
  );
}
```

## Available Modules

The following modules have granular permissions:

- `dashboard` - Main dashboard
- `media_assets` - Media asset inventory
- `clients` - Client management
- `plans` - Media plans/quotations
- `campaigns` - Campaign management
- `operations` - Field operations
- `invoices` - Invoice management
- `expenses` - Expense tracking
- `reports` - Reports and analytics
- `settings` - System settings
- `users` - User management

## Permission Actions

Each module supports four actions:
- `view` - Read access
- `create` - Create new records
- `update` - Edit existing records
- `delete` - Delete records

## Default Role Permissions

### Admin
- Full access to all modules (all actions)

### Sales
- **View:** dashboard, media_assets, clients, plans, campaigns, operations, invoices, reports
- **Create:** clients, plans, campaigns
- **Update:** clients, plans, campaigns
- **Delete:** plans

### Operations
- **View:** dashboard, media_assets, clients, plans, campaigns, operations, reports
- **Create:** operations (photo uploads, assignments)
- **Update:** operations, campaigns (status updates)

### Finance
- **View:** dashboard, media_assets, clients, plans, campaigns, reports
- **Create:** invoices, expenses
- **Update:** invoices, expenses
- **Delete:** invoices, expenses

### User
- **View:** dashboard, media_assets, clients, plans, campaigns

## Advanced Usage

### Combining Multiple Checks

```typescript
function ComplexComponent() {
  const { canView, canUpdate } = usePermissions();
  const { isAdmin, isSales } = useAuth();
  
  const showAdvancedFeatures = isAdmin || (isSales && canUpdate('plans'));
  
  return (
    <div>
      {showAdvancedFeatures && <AdvancedPlanBuilder />}
    </div>
  );
}
```

### Dynamic Permission Checks

```typescript
function DataTable({ module }: { module: string }) {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  
  return (
    <div>
      <Table data={data} />
      
      <div className="actions">
        {canCreate(module) && <CreateButton />}
        {canUpdate(module) && <EditButton />}
        {canDelete(module) && <DeleteButton />}
      </div>
    </div>
  );
}
```

### Loading States

```typescript
function PermissionAwareComponent() {
  const { canView, loading } = usePermissions();
  
  if (loading) {
    return <Skeleton />;
  }
  
  if (!canView('reports')) {
    return <AccessDenied />;
  }
  
  return <ReportsView />;
}
```

## Managing Permissions

Permissions are managed through the **User Management** interface:

1. Navigate to **Settings → User Management → Permissions** tab
2. Select a role from the tabs
3. Toggle permissions for each module
4. Click **Save Changes**

Changes take effect immediately for all users with that role.

## Security Notes

1. **Admin Override:** Admins always have full access, regardless of permission settings
2. **RLS Enforcement:** Database-level Row-Level Security policies enforce permissions server-side
3. **Client-Side:** UI components use permissions for UX; security is enforced at the database level
4. **Multi-Role Users:** If a user has multiple roles, they get the most permissive setting for each permission

## Troubleshooting

### User can't see a page
1. Check if user is authenticated
2. Verify user has the correct role assigned
3. Check role permissions in User Management → Permissions
4. Ensure RLS policies are correctly configured in database

### Permission changes not reflecting
1. User may need to refresh the page
2. Check if permissions were saved successfully
3. Verify database `role_permissions` table was updated

### "Access Denied" errors
1. Check console for permission errors
2. Verify route has correct `requiredModule` and `requiredAction`
3. Ensure user's role has the required permissions

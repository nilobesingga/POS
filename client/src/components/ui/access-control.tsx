import React from 'react';
import { useAuth } from '@/context/auth-context';
import { RolePermissions } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

interface PermissionGuardProps {
  requiredPermission: keyof RolePermissions;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * A component that renders its children only if the user has the required permission
 * Otherwise, it renders the fallback component or nothing
 */
export function PermissionGuard({
  requiredPermission,
  children,
  fallback = <div className="flex justify-center p-8"><p>You don't have permission to access this feature.</p></div>
}: PermissionGuardProps) {
  const { user, accessToken } = useAuth();

  // Fetch the user's role permissions
  const { data: roleData, isLoading } = useQuery({
    queryKey: ['/api/roles', user?.role],
    queryFn: async () => {
      // Handle system roles directly
      if (user?.role === 'admin') {
        return {
          permissions: {
            canManageProducts: true,
            canManageCategories: true,
            canManageOrders: true,
            canManageCustomers: true,
            canViewReports: true,
            canManageSettings: true,
            canManageUsers: true
          }
        };
      }

      if (user?.role === 'manager') {
        return {
          permissions: {
            canManageProducts: true,
            canManageCategories: true,
            canManageOrders: true,
            canManageCustomers: true,
            canViewReports: true,
            canManageSettings: false,
            canManageUsers: false
          }
        };
      }

      if (user?.role === 'cashier') {
        return {
          permissions: {
            canManageProducts: false,
            canManageCategories: false,
            canManageOrders: true,
            canManageCustomers: false,
            canViewReports: false,
            canManageSettings: false,
            canManageUsers: false
          }
        };
      }

      // For custom roles, fetch from API
      try {
        const response = await apiRequest('GET', `/api/roles/by-name/${user?.role}`);
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Failed to fetch role permissions:', error);
        return null;
      }
    },
    enabled: !!user && !!accessToken,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // No user or role data - don't render anything
  if (!user || !roleData) {
    return <>{fallback}</>;
  }

  // Check if the user has the required permission
  const hasPermission = roleData.permissions?.[requiredPermission] === true;

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * A higher-order component that wraps a component with permission check
 */
export function withPermission<T extends object>(
  Component: React.ComponentType<T>,
  requiredPermission: keyof RolePermissions,
  fallback?: React.ReactNode
) {
  return function PermissionCheckedComponent(props: T) {
    return (
      <PermissionGuard requiredPermission={requiredPermission} fallback={fallback}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}

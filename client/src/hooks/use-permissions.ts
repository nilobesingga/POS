import { useAuth } from '@/context/auth-context';
import { RolePermissions } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

/**
 * Type guard to check if a string is a valid permission key
 */
function isValidPermission(key: string): key is keyof RolePermissions {
    return [
        'canManageProducts',
        'canManageCategories',
        'canManageOrders',
        'canManageCustomers',
        'canViewCustomers',
        'canViewReports',
        'canManageSettings',
        'canManageUsers'
    ].includes(key);
}

/**
 * Hook to check if the current user has specific permissions
 */
export function usePermissions() {
    const { user, accessToken } = useAuth();

    // Fetch the user's role permissions
    const { data: roleData, isLoading, error } = useQuery({
        queryKey: ['/api/roles', user?.role],
        queryFn: async () => {
            // Handle system roles directly for efficiency
            if (user?.role === 'admin') {
                return {
                    permissions: {
                        canManageProducts: true,
                        canManageCategories: true,
                        canManageOrders: true,
                        canManageCustomers: true,
                        canViewCustomers: true,
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
                        canViewCustomers: true,
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
                        canViewCustomers: true,
                        canViewReports: false,
                        canManageSettings: false,
                        canManageUsers: false
                    }
                };
            }

            // For custom roles, fetch from API
            try {
                const response = await apiRequest('GET', `/api/roles/by-name/${user?.role}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch role data');
                }
                return await response.json();
            } catch (error) {
                console.error('Failed to fetch role permissions:', error);
                throw error;
            }
        },
        enabled: !!user && !!accessToken,
    });

    /**
     * Check if the current user has a specific permission
     */
    const hasPermission = (permission: string | keyof RolePermissions): boolean => {
        if (!user || !roleData) return false;

        // Use type guard to verify the permission is valid
        if (isValidPermission(permission)) {
            return !!roleData.permissions?.[permission];
        }

        console.warn(`Invalid permission key requested: ${permission}`);
        return false;
    };

    /**
     * Check if the current user has any of the specified permissions
     */
    const hasAnyPermission = (permissions: Array<string | keyof RolePermissions>): boolean => {
        return permissions.some(permission => hasPermission(permission));
    };

    /**
     * Check if the current user has all of the specified permissions
     */
    const hasAllPermissions = (permissions: Array<string | keyof RolePermissions>): boolean => {
        return permissions.every(permission => hasPermission(permission));
    };

    return {
        isLoading,
        error,
        permissions: roleData?.permissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions
    };
}

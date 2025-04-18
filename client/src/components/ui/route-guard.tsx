import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { RolePermissions } from '@shared/schema';
import { usePermissions } from '@/hooks/use-permissions';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: ReactNode;
  requiredPermission: keyof RolePermissions | Array<keyof RolePermissions>;
  fallbackPath?: string;
}

/**
 * A component that protects routes based on user permissions
 * If the user doesn't have the required permission(s), they are redirected to the fallback path
 * When an array of permissions is provided, the user must have at least one of them to access the route
 */
export function RouteGuard({ children, requiredPermission, fallbackPath = '/pos' }: RouteGuardProps) {
  const { hasPermission, isLoading } = usePermissions();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Wait until permissions are loaded
    if (isLoading) return;

    // Check if user has permission to access this route
    const canAccess = Array.isArray(requiredPermission)
      ? requiredPermission.some(permission => hasPermission(permission))
      : hasPermission(requiredPermission);

    // Redirect if user doesn't have permission
    if (!canAccess && location !== fallbackPath) {
      setLocation(fallbackPath);
    }
  }, [hasPermission, isLoading, requiredPermission, location, setLocation, fallbackPath]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-gray-500">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

import { authenticateToken, checkPermission } from './routes/auth';
import { Request, Response, NextFunction } from 'express';
import { RolePermissions } from '@shared/schema';

// A middleware generator for routes that require specific permissions
export function requirePermission(permission: keyof RolePermissions) {
    return [
        authenticateToken,
        async (req: Request, res: Response, next: NextFunction) => {
            const check = await checkPermission(permission);
            return check(req, res, next);
        }
    ];
}

// A middleware generator for routes that require any of the specified permissions
export function requireAnyPermission(permissions: Array<keyof RolePermissions>) {
    return [
        authenticateToken,
        async (req: Request, res: Response, next: NextFunction) => {
            // Try each permission, if any succeeds, continue
            for (const permission of permissions) {
                try {
                    const check = await checkPermission(permission);

                    // Create a mock response object to capture rejection
                    const mockRes = {
                        status: () => ({
                            json: () => { }
                        })
                    };

                    // Save the original next function
                    const originalNext = next;
                    let passed = false;

                    // Override next function to detect if middleware passed
                    const mockNext = () => {
                        passed = true;
                    };

                    // Try this permission
                    await check(req, mockRes as any, mockNext);

                    // If this permission passed, continue with the real next
                    if (passed) {
                        return originalNext();
                    }
                } catch (err) {
                    console.error('Permission check error:', err);
                    // Continue trying other permissions
                }
            }

            // If we get here, none of the permissions passed
            return res.status(403).json({
                error: 'Permission denied',
                message: 'You do not have the required permissions for this action'
            });
        }
    ];
}

// Helper middleware to log all requests
export function requestLogger(req: Request, res: Response, next: NextFunction) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
}

import { Router } from "express";
import { db } from "../storage";
import { users, roles } from "../../shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// Since we can't install jsonwebtoken, we'll create a simple token generation function
function generateToken(user: any, expiresIn = '24h'): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

    const now = Math.floor(Date.now() / 1000);
    const exp = now + (expiresIn === '24h' ? 86400 : parseInt(expiresIn));

    const payload = Buffer.from(JSON.stringify({
        sub: user.id,
        username: user.username,
        role: user.role,
        iat: now,
        exp
    })).toString('base64url');

    // In production, use a proper environment variable for the secret
    const secret = process.env.JWT_SECRET || 'loyverse_secret_key_change_in_production';

    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');

    return `${header}.${payload}.${signature}`;
}

function generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
}

// Login validation schema
const loginSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required")
});

// Login endpoint
router.post("/login", async (req, res) => {
    console.log("Login request received:", { ...req.body, password: "[REDACTED]" });

    try {
        // Validate input
        const { username, password } = loginSchema.parse(req.body);
        console.log("Login validation passed for user:", username);

        // Find user by username
        const userResults = await db
            .select()
            .from(users)
            .where(eq(users.username, username))
            .limit(1);

        console.log("User lookup results count:", userResults.length);

        const user = userResults[0];

        // Check if user exists
        if (!user) {
            console.log("User not found:", username);
            return res.status(401).json({
                error: "Invalid username or password"
            });
        }

        // Check password
        const passwordMatch = await bcrypt.compare(password, user.password);
        console.log("Password match result:", passwordMatch);

        if (!passwordMatch) {
            console.log("Password mismatch for user:", username);
            return res.status(401).json({
                error: "Invalid username or password"
            });
        }

        // Generate tokens
        const accessToken = generateToken(user);
        const refreshToken = generateRefreshToken();
        console.log("Tokens generated successfully for user:", username);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        // Return user data with tokens
        console.log("Sending successful login response for user:", username);
        return res.status(200).json({
            ...userWithoutPassword,
            accessToken,
            refreshToken
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Validation error in login:", error.errors);
            return res.status(400).json({
                error: "Invalid login data",
                details: error.errors
            });
        }

        console.error("Login error:", error);
        return res.status(500).json({
            error: "Authentication failed",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
});

// Token validation middleware function for use in protected routes
export function authenticateToken(req: any, res: any, next: any) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        // Split the token
        const [header, payload, signature] = token.split('.');

        // Verify signature
        const secret = process.env.JWT_SECRET || 'loyverse_secret_key_change_in_production';
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(`${header}.${payload}`)
            .digest('base64url');

        if (signature !== expectedSignature) {
            throw new Error('Invalid signature');
        }

        // Decode payload
        const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());

        // Check if token is expired
        const now = Math.floor(Date.now() / 1000);
        if (decodedPayload.exp < now) {
            throw new Error('Token expired');
        }

        // Add user info to request
        req.user = decodedPayload;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// Permission check middleware
export async function checkPermission(requiredPermission: string) {
    return async (req: any, res: any, next: any) => {
        try {
            // User should be added by the authenticateToken middleware
            if (!req.user || !req.user.role) {
                return res.status(403).json({ error: 'Unauthorized access' });
            }

            const userRole = req.user.role;

            // Admin role has all permissions
            if (userRole === 'admin') {
                return next();
            }

            // For system roles, check hardcoded permissions
            if (userRole === 'manager') {
                const managerPermissions = {
                    canManageProducts: true,
                    canManageCategories: true,
                    canManageOrders: true,
                    canManageCustomers: true,
                    canViewCustomers: true,
                    canViewReports: true,
                    canManageSettings: false,
                    canManageUsers: false
                };

                if (managerPermissions[requiredPermission as keyof typeof managerPermissions]) {
                    return next();
                }

                return res.status(403).json({
                    error: 'Permission denied',
                    message: 'Your role does not have the required permissions for this action'
                });
            }

            if (userRole === 'cashier') {
                const cashierPermissions = {
                    canManageProducts: false,
                    canManageCategories: false,
                    canManageOrders: true,
                    canManageCustomers: false,
                    canViewCustomers: true,
                    canViewReports: false,
                    canManageSettings: false,
                    canManageUsers: false
                };

                if (cashierPermissions[requiredPermission as keyof typeof cashierPermissions]) {
                    return next();
                }

                return res.status(403).json({
                    error: 'Permission denied',
                    message: 'Your role does not have the required permissions for this action'
                });
            }

            // For custom roles, fetch from database
            const [roleData] = await db
                .select()
                .from(roles)
                .where(eq(roles.name, userRole));

            if (!roleData) {
                return res.status(403).json({
                    error: 'Invalid role',
                    message: 'Your user role could not be found'
                });
            }

            // Check if the role has the required permission
            if (roleData.permissions && roleData.permissions[requiredPermission as keyof typeof roleData.permissions]) {
                return next();
            }

            // Permission denied
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Your role does not have the required permissions for this action'
            });
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
}

// Get current authenticated user
router.get("/current", authenticateToken, async (req: any, res: any) => {
    try {
        // Authenticated user info is already available in req.user from the middleware
        const userId = req.user.sub;

        // Fetch the full user details from the database
        const [currentUser] = await db.select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove sensitive information
        const { password, ...userWithoutPassword } = currentUser;

        // Return user data
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({
            error: 'Failed to fetch current user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Refresh token endpoint
router.post("/refresh-token", async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }

    // In a production app, you would validate the refresh token against the database
    // For this demo, we'll just generate a new token if a refresh token is provided

    try {
        // Get the user info from the request (you would typically get this from the database)
        // For the demo, we'll extract user ID from the refresh token
        const userId = parseInt(refreshToken.substring(0, 8), 16) % 1000;

        // Get the user from the database
        const [user] = await db.select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) {
            return res.status(403).json({ error: 'Invalid refresh token' });
        }

        // Generate a new access token
        const accessToken = generateToken(user);

        // Return the new access token
        res.json({ accessToken });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

// Logout endpoint (client should delete the tokens)
router.post("/logout", (req, res) => {
    // In a production app, you would invalidate the refresh token in the database
    res.status(200).json({ message: 'Logged out successfully' });
});

export default router;

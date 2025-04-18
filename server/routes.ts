import { Router } from 'express';
import { db } from './storage';
import { products, users, categories } from '../shared/schema';
import { authenticateToken } from './routes/auth';
import { requirePermission, requireAnyPermission, requestLogger } from './middleware';

const router = Router();

// Apply request logging to all routes
router.use(requestLogger);

// Protected route requiring user management permission
router.get('/users',
    ...requirePermission('canManageUsers'),
    async (req, res) => {
        const result = await db.select().from(users);
        // Don't send passwords in response
        const sanitizedUsers = result.map(({ password, ...user }) => user);
        res.json(sanitizedUsers);
    }
);

// Protected route requiring product or category management permission
router.post("/categories",
    ...requireAnyPermission(['canManageProducts', 'canManageCategories']),
    async (req, res) => {
        try {
            const { name } = req.body;

            if (!name || typeof name !== "string") {
                return res.status(400).json({ error: "Invalid category name" });
            }

            const inserted = await db.insert(categories).values({ name }).returning();
            res.status(201).json(inserted[0]);
        } catch (error) {
            console.error("Failed to insert category:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

// Category listing - read-only access requires fewer permissions
router.get("/categories",
    authenticateToken, // Basic authentication without specific permission check
    async (req, res) => {
        try {
            const result = await db.select().from(categories);
            res.json(result);
        } catch (error) {
            console.error("Failed to fetch categories:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

// Get all products - requires product management or order management permission
router.get('/products',
    ...requireAnyPermission(['canManageProducts', 'canManageOrders']),
    async (req, res) => {
        try {
            const product = await db.select().from(products);
            res.json(product);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch products' });
        }
    }
);

export default router;

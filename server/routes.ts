import { Router } from 'express';
import { db } from './storage';
import { products, users, categories } from '../shared/schema';

const router = Router();

router.get('/users', async (req, res) => {
    const result = await db.select().from(users);
    res.json(result);
});

// POST /api/categories
router.post("/categories", async (req, res) => {
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
});

// GET /api/categories
router.get("/categories", async (req, res) => {
    try {
        const result = await db.select().from(categories);
        res.json(result);
    } catch (error) {
        console.error("Failed to fetch categories:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Get all products
router.get('/products', async (req, res) => {
    try {
        const product = await db.select().from(products);
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch products' });
    }
});

export default router;

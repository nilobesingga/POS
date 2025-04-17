import { Router } from "express";
import { db } from "../storage";
import { categories } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Get all categories
router.get("/", async (_req, res) => {
    try {
        const result = await db.select().from(categories);
        res.json(result);
    } catch (error) {
        console.error('Failed to fetch categories:', error);
        res.status(500).json({
            error: 'Failed to fetch categories',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Create new category
router.post("/", async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Name is required" });

        const inserted = await db.insert(categories).values({ name }).returning();
        res.status(201).json(inserted[0]);
    } catch (err) {
        next(err);
    }
});

// Update a category
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid category ID' });
        }

        if (!name || typeof name !== "string") {
            return res.status(400).json({ error: "Invalid category name" });
        }

        const [updated] = await db.update(categories)
            .set({ name })
            .where(eq(categories.id, id))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error('Failed to update category:', error);
        res.status(500).json({
            error: 'Failed to update category',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Delete a category
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid category ID' });
        }

        const [deleted] = await db.delete(categories)
            .where(eq(categories.id, id))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json(deleted);
    } catch (error) {
        console.error('Failed to delete category:', error);
        res.status(500).json({
            error: 'Failed to delete category',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;

import { Router, Request, Response } from 'express';
import { db } from "../storage";
import { diningOptions } from "../../shared/schema";
import { eq, and, ne } from "drizzle-orm";

const router = Router();

// Get all dining options
router.get("/", async (_req: Request, res: Response) => {
    try {
        const result = await db.select().from(diningOptions);
        res.json(result);
    } catch (error) {
        console.error("Error fetching dining options:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get dining options by store
router.get("/store/:storeId", async (req: Request, res: Response) => {
    try {
        const { storeId } = req.params;
        const result = await db
            .select()
            .from(diningOptions)
            .where(eq(diningOptions.storeId, parseInt(storeId)));
        res.json(result);
    } catch (error) {
        console.error("Error fetching dining options for store:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Create dining option
router.post("/", async (req: Request, res: Response) => {
    try {
        const data = req.body;

        // If setting as default, unset any existing default for this store
        if (data.isDefault) {
            await db
                .update(diningOptions)
                .set({ isDefault: false })
                .where(eq(diningOptions.storeId, data.storeId));
        }

        const result = await db.insert(diningOptions)
            .values({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            })
            .returning();

        res.status(201).json(result[0]);
    } catch (error) {
        console.error("Error creating dining option:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Update dining option
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const optionId = parseInt(id);

        // Remove timestamp fields from the data if they exist to prevent errors
        const { createdAt, updatedAt, ...cleanedData } = data;

        // First, get the current option to check storeId
        const currentOption = await db
            .select()
            .from(diningOptions)
            .where(eq(diningOptions.id, optionId));

        if (!currentOption.length) {
            return res.status(404).json({ error: "Dining option not found" });
        }

        // If setting as default, unset any existing defaults for this store
        if (cleanedData.isDefault) {
            await db
                .update(diningOptions)
                .set({ isDefault: false })
                .where(
                    and(
                        eq(diningOptions.storeId, cleanedData.storeId || currentOption[0].storeId),
                        ne(diningOptions.id, optionId) // Don't update the current option yet
                    )
                );
        }

        // Now update the current option
        const result = await db
            .update(diningOptions)
            .set({
                ...cleanedData,
                updatedAt: new Date() // Always use a fresh Date object
            })
            .where(eq(diningOptions.id, optionId))
            .returning();

        res.json(result[0]);
    } catch (error) {
        console.error("Error updating dining option:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Delete dining option
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await db
            .delete(diningOptions)
            .where(eq(diningOptions.id, parseInt(id)))
            .returning();

        if (!result.length) {
            return res.status(404).json({ error: "Dining option not found" });
        }

        res.json(result[0]);
    } catch (error) {
        console.error("Error deleting dining option:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;

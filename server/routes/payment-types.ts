import { Router, Request, Response } from 'express';
import { db } from "../storage";
import { paymentTypes } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Get all payment types
router.get("/", async (_req: Request, res: Response) => {
    try {
        const result = await db.select().from(paymentTypes);
        res.json(result);
    } catch (error) {
        console.error("Error fetching payment types:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get single payment type
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await db
            .select()
            .from(paymentTypes)
            .where(eq(paymentTypes.id, parseInt(id)));

        if (!result.length) {
            return res.status(404).json({ error: "Payment type not found" });
        }

        res.json(result[0]);
    } catch (error) {
        console.error("Error fetching payment type:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Create payment type
router.post("/", async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const result = await db.insert(paymentTypes)
            .values({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            })
            .returning();

        res.status(201).json(result[0]);
    } catch (error) {
        console.error("Error creating payment type:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Update payment type
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const result = await db
            .update(paymentTypes)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(eq(paymentTypes.id, parseInt(id)))
            .returning();

        if (!result.length) {
            return res.status(404).json({ error: "Payment type not found" });
        }

        res.json(result[0]);
    } catch (error) {
        console.error("Error updating payment type:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Delete payment type
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await db
            .delete(paymentTypes)
            .where(eq(paymentTypes.id, parseInt(id)))
            .returning();

        if (!result.length) {
            return res.status(404).json({ error: "Payment type not found" });
        }

        res.json(result[0]);
    } catch (error) {
        console.error("Error deleting payment type:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;

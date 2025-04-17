import { Router, Request, Response } from 'express';
import { db } from "../storage";
import { posDevices, insertPOSDeviceSchema } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Get all POS devices
router.get("/", async (_req: Request, res: Response) => {
    try {
        const devices = await db.select().from(posDevices)
            .orderBy(posDevices.name);
        return res.json(devices);
    } catch (error) {
        console.error("Error fetching POS devices:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get a single POS device by ID
router.get("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const device = await db.select().from(posDevices)
            .where(eq(posDevices.id, parseInt(id)))
            .limit(1);

        if (!device.length) {
            return res.status(404).json({ error: "POS device not found" });
        }

        return res.json(device[0]);
    } catch (error) {
        console.error("Error fetching POS device:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Create a new POS device
router.post("/", async (req: Request, res: Response) => {
    try {
        const deviceData = insertPOSDeviceSchema.parse(req.body);

        const newDevice = await db.insert(posDevices)
            .values(deviceData)
            .returning();

        return res.status(201).json(newDevice[0]);
    } catch (error) {
        console.error("Error creating POS device:", error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Validation error",
                details: error.errors
            });
        }
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Update a POS device
router.put("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const deviceData = insertPOSDeviceSchema.partial().parse(req.body);

        const updatedDevice = await db.update(posDevices)
            .set({
                ...deviceData,
                updatedAt: sql`NOW()`
            })
            .where(eq(posDevices.id, parseInt(id)))
            .returning();

        if (!updatedDevice.length) {
            return res.status(404).json({ error: "POS device not found" });
        }

        return res.json(updatedDevice[0]);
    } catch (error) {
        console.error("Error updating POS device:", error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Validation error",
                details: error.errors
            });
        }
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Delete a POS device
router.delete("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const deletedDevice = await db.delete(posDevices)
            .where(eq(posDevices.id, parseInt(id)))
            .returning();

        if (!deletedDevice.length) {
            return res.status(404).json({ error: "POS device not found" });
        }

        return res.json(deletedDevice[0]);
    } catch (error) {
        console.error("Error deleting POS device:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;

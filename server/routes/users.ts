import { Router } from "express";
import { db } from "../storage";
import { users } from "../../shared/schema";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const router = Router();

// Get all users
router.get("/", async (_req, res) => {
    try {
        const result = await db.select().from(users);
        // Don't send passwords in response
        const sanitizedUsers = result.map(({ password, ...user }) => user);
        res.json(sanitizedUsers);
    } catch (error) {
        console.error("Failed to fetch users:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Create a new user
router.post("/", async (req, res) => {
    try {
        // Log the incoming request body for debugging
        console.log("Incoming user data:", { ...req.body, password: '[REDACTED]' });

        const userData = insertUserSchema.parse(req.body);

        // Check if username already exists
        const existingUser = await db.select()
            .from(users)
            .where(eq(users.username, userData.username))
            .limit(1);

        if (existingUser.length > 0) {
            return res.status(400).json({
                error: "Username already exists",
                field: "username"
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Insert user with hashed password
        const [newUser] = await db.insert(users)
            .values({
                ...userData,
                password: hashedPassword,
                email: userData.email || null,
                phone: userData.phone || null,
                storeId: userData.storeId || null
            })
            .returning();

        // Don't send password in response
        const { password, ...userWithoutPassword } = newUser;

        console.log("Successfully created user:", {
            ...userWithoutPassword,
            id: newUser.id
        });

        res.status(201).json(userWithoutPassword);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Validation error:", error.errors);
            return res.status(400).json({
                error: "Invalid user data",
                details: error.errors
            });
        }
        console.error("Failed to create user:", error);
        res.status(500).json({
            error: "Failed to create user",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
});

// Update a user
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updateData = req.body;

        // If password is provided, hash it
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        // Convert empty strings to null for optional fields
        if (updateData.email === "") updateData.email = null;
        if (updateData.phone === "") updateData.phone = null;
        if (updateData.storeId === "") updateData.storeId = null;

        const [updated] = await db.update(users)
            .set(updateData)
            .where(eq(users.id, id))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: "User not found" });
        }

        // Don't send password in response
        const { password, ...userWithoutPassword } = updated;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error("Failed to update user:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
});

// Delete a user
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [deleted] = await db.delete(users)
            .where(eq(users.id, id))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: "User not found" });
        }

        // Don't send password in response
        const { password, ...userWithoutPassword } = deleted;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error("Failed to delete user:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

export default router;

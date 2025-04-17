import { Router, Request, Response } from 'express';
import { db } from "../storage";
import { customers, type Customer, insertCustomerSchema } from "../../shared/schema";
import { eq } from "drizzle-orm";
import Papa from "papaparse";
import { z } from "zod";

const router = Router();

// Get all customers
router.get("/", async (_req: Request, res: Response) => {
    try {
        const result = await db.select().from(customers);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch customers',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get customer by ID
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid customer ID format' });
        }
        const result = await db.select().from(customers).where(eq(customers.id, id));
        if (!result.length) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch customer',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Create customer
router.post("/", async (req: Request, res: Response) => {
    try {
        const customerData = insertCustomerSchema.parse(req.body);
        const result = await db.insert(customers).values({
            ...customerData,
            pointsBalance: customerData.pointsBalance?.toString() || "0",
        }).returning();
        res.status(201).json(result[0]);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid customer data',
                details: error.errors
            });
        }
        res.status(500).json({
            error: 'Failed to create customer',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Update customer
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid customer ID format' });
        }

        const customerData = insertCustomerSchema.partial().parse(req.body);
        const result = await db.update(customers)
            .set({
                ...customerData,
                pointsBalance: customerData.pointsBalance?.toString(),
            })
            .where(eq(customers.id, id))
            .returning();

        if (!result.length) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(result[0]);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid customer data',
                details: error.errors
            });
        }
        res.status(500).json({
            error: 'Failed to update customer',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Delete customer
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid customer ID format' });
        }
        const result = await db.delete(customers)
            .where(eq(customers.id, id))
            .returning();
        if (!result.length) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to delete customer',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Import customers from CSV
router.post("/import", async (req: Request, res: Response) => {
    try {
        if (!req.body.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const { data, errors } = Papa.parse(req.body.file, { header: true });
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'CSV parsing errors',
                details: errors.map(e => e.message)
            });
        }

        const customersToInsert = data.map((row: any) => ({
            customerName: row["Customer name"] || '',
            email: row["Email"] || null,
            phone: row["Phone"] || null,
            address: row["Address"] || null,
            city: row["City"] || null,
            province: row["Province"] || null,
            postalCode: row["Postal code"] || null,
            country: row["Country"] || null,
            customerCode: row["Customer code"] || null,
            pointsBalance: row["Points balance"]?.toString() || "0",
            note: row["Note"] || null,
        }));

        if (!customersToInsert.length) {
            return res.status(400).json({ error: 'No valid customers found in CSV' });
        }

        const result = await db.insert(customers).values(customersToInsert).returning();
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to import customers',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Export customers to CSV
router.get("/export", async (_req: Request, res: Response) => {
    try {
        const allCustomers = await db.select().from(customers);
        const fields = [
            "Customer ID",
            "Customer name",
            "Email",
            "Phone",
            "Address",
            "City",
            "Province",
            "Postal code",
            "Country",
            "Customer code",
            "Points balance",
            "Note",
            "First visit",
            "Last visit",
            "Total visits",
            "Total spent",
        ];

        const csvData = allCustomers.map((customer) => ({
            "Customer ID": customer.id,
            "Customer name": customer.customerName,
            Email: customer.email,
            Phone: customer.phone,
            Address: customer.address,
            City: customer.city,
            Province: customer.province,
            "Postal code": customer.postalCode,
            Country: customer.country,
            "Customer code": customer.customerCode,
            "Points balance": customer.pointsBalance,
            Note: customer.note,
            "First visit": customer.firstVisit,
            "Last visit": customer.lastVisit,
            "Total visits": customer.totalVisits,
            "Total spent": customer.totalSpent,
        }));

        const csv = Papa.unparse({
            fields,
            data: csvData
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
        res.send(csv);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to export customers',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;

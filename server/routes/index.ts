import { Express } from "express";
import categoriesRouter from "./categories.js";
import productsRouter from "./products.js";
import usersRouter from "./users.js";
import storeSettingsRouter from "./store-settings.js";
import taxCategoriesRouter from "./tax-categories.js";
import ordersRouter from "./orders.js";
import customerRouter from './customers.js';
import rolesRouter from './roles.js';
import posDevicesRouter from './pos-devices.js';
import paymentTypesRoutes from "./payment-types.js";
import diningOptionsRoutes from "./dining-options.js";
import reportsRouter from "./reports.js";
import authRouter from "./auth.js";
import modifiersRouter from "./modifiers.js";
import discountsRouter from "./discounts.js";
import allergensRouter from "./allergens.js";
import shiftsRouter from "./shifts.js";
import kitchenRouter from "./kitchen.js";

// Import kitchen routes - special handling to ensure they load
import path from 'path';
import { Router } from 'express';
import { fileURLToPath } from 'url';

// Resolve direct path to current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerRoutes(app: Express) {
    // Register all routes
    app.use("/api/categories", categoriesRouter);
    app.use("/api/products", productsRouter);
    app.use("/api/users", usersRouter);
    app.use("/api/store-settings", storeSettingsRouter);
    app.use("/api/tax-categories", taxCategoriesRouter);
    app.use("/api/orders", ordersRouter);
    app.use("/api/customers", customerRouter);
    app.use("/api/roles", rolesRouter);
    app.use("/api/pos-devices", posDevicesRouter);
    app.use("/api/payment-types", paymentTypesRoutes);
    app.use("/api/dining-options", diningOptionsRoutes);
    app.use("/api/reports", reportsRouter);
    app.use("/api/auth", authRouter);
    app.use("/api/modifiers", modifiersRouter);
    app.use("/api/discounts", discountsRouter);
    app.use("/api/allergens", allergensRouter);
    app.use("/api/shifts", shiftsRouter);

    // Register unified kitchen routes
    app.use("/api/kitchen", kitchenRouter);

    // Log registered routes
    console.log("All routes including kitchen routes registered successfully");
}

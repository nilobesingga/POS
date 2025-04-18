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
import modifiersRouter from "./modifiers.js"; // Added import for modifiers
import discountsRouter from "./discounts.js"; // Added import for discounts
import allergensRouter from "./allergens.js"; // Added import for allergens
import shiftsRouter from "./shifts.js"; // Added import for shifts

export async function registerRoutes(app: Express) {
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
    app.use("/api/modifiers", modifiersRouter); // Registered modifiers routes
    app.use("/api/discounts", discountsRouter); // Registered discounts routes
    app.use("/api/allergens", allergensRouter); // Registered allergens routes
    app.use("/api/shifts", shiftsRouter); // Registered shifts routes
}

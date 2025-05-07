import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes/index.js";
import { setupVite, serveStatic, log } from "./vite.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ErrorWithStatus extends Error {
    status?: number;
}

dotenv.config();

const app = express();

// Configure CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://your-production-domain.com', 'capacitor://localhost']
        : ['http://localhost:5000', 'http://10.0.1.170:5000', 'capacitor://localhost', 'http://localhost'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Ensure uploads directory exists
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

// Serve uploaded files with absolute path
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

(async () => {
    try {
        // Register routes without starting the server
        await registerRoutes(app);

        // Error handler
        app.use((err: ErrorWithStatus, _req: Request, res: Response, _next: NextFunction) => {
            const status = err.status || 500;
            res.status(status).json({ message: err.message || "Internal Server Error" });
            console.error("❌ Unhandled error:", err);
        });

        const port = Number(process.env.PORT) || 5000;
        const host = process.env.HOST || "10.0.1.170";//"127.0.0.1"//"192.168.1.53";

        const server = app.listen(port, host, () => {
            log(`🚀 Server running at http://${host}:${port}`);
        });

        if (process.env.NODE_ENV === "development") {
            await setupVite(app, server);
        } else {
            serveStatic(app);
        }

    } catch (err) {
        console.error("❌ Server failed to start:", err);
        process.exit(1);
    }
})();

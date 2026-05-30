import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load repo-level .env so this script sees DATABASE_URL when executed
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

const runMigration = async () => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is missing!");

    console.log("Connecting to Neon...");

    // Migrations require a single, strict connection (no pooling)
    const sql = postgres(url, { max: 1 });
    const db = drizzle(sql);

    try {
        console.log("Applying migrations...");
        await migrate(db, { migrationsFolder: "./drizzle" });
        console.log("Migrations applied successfully!");
    } catch (error) {
        console.error("MIGRATION FAILED. Here is the hidden error:");
        console.error(error);
    } finally {
        await sql.end();
        process.exit(0);
    }
};

runMigration();
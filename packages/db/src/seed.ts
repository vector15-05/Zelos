import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, quizzes, questions } from "./schema";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Ensure repo .env is loaded when running this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

const seed = async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL missing!");

    const sql = postgres(connectionString, { max: 1 });
    const db = drizzle(sql);

    console.log("🌱 Seeding database...");

    try {
        // 1. Create a dummy host user
        const [host] = await db.insert(users).values({
            email: "host@zelos.local",
            name: "Vinayak",
            password: "changeme",
        }).returning();

        // 2. Create the first Quiz
        const [f1Quiz] = await db.insert(quizzes).values({
            creatorId: host!.id,
            title: "Silver Arrows History",
            description: "Trivia covering the modern era of the Mercedes-AMG F1 team.",
        }).returning();

        // Insert questions with JSONB options
        await db.insert(questions).values([
            {
            quizId: f1Quiz!.id,
            questionText: "In what year did the team return to Formula 1 as a modern constructor?",
                timeLimit: 20,
                sortOrder: 0,
                options: [
                    { text: "2008", isCorrect: false },
                    { text: "2010", isCorrect: true },
                    { text: "2012", isCorrect: false },
                    { text: "2014", isCorrect: false },
                ],
            },
            {
                quizId: f1Quiz!.id,
                questionText: "Which driver secured the team's first pole position of the modern era at the 2012 Chinese Grand Prix?",
                timeLimit: 20,
                sortOrder: 1,
                options: [
                    { text: "Michael Schumacher", isCorrect: false },
                    { text: "Valtteri Bottas", isCorrect: false },
                    { text: "Nico Rosberg", isCorrect: true },
                    { text: "Lewis Hamilton", isCorrect: false },
                ],
            }
        ]);

        // 3. Create a second Quiz
        const [techQuiz] = await db.insert(quizzes).values({
            creatorId: host!.id,
            title: "Backend Engineering",
            description: "Testing knowledge of runtimes and architecture.",
        }).returning();

        await db.insert(questions).values([
            {
            quizId: techQuiz!.id,
            questionText: "Which language is the Bun runtime primarily written in?",
                timeLimit: 15,
                sortOrder: 0,
                options: [
                    { text: "C++", isCorrect: false },
                    { text: "Rust", isCorrect: false },
                    { text: "Zig", isCorrect: true },
                    { text: "Go", isCorrect: false },
                ],
            }
        ]);

        console.log("✅ Seeding complete!");
    } catch (err) {
        console.error("❌ Seeding failed:", err);
    } finally {
        await sql.end();
        process.exit(0);
    }
};

seed();
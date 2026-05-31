import {pgTable, text, integer, timestamp, uuid, jsonb, varchar} from "drizzle-orm/pg-core";
import {relations} from "drizzle-orm";

export const users = pgTable("users",{
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    bio: varchar("bio", { length: 512 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const quizzes = pgTable("quizzes", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 256 }).notNull(),
    description: varchar("description", { length: 512 }),
    creatorId: uuid("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),

    // for locking
    version: integer("version").default(1).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const questions = pgTable("questions", {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
    questionText: varchar("question_text", { length: 512 }).notNull(),
    timeLimit: integer("time_limit").default(30).notNull(),
    sortOrder: integer("sort_order").notNull(),

    // Jsonb for the options
    options: jsonb("options").$type<{ text: string; isCorrect: boolean }[]>().notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const userRelations = relations(users, ({ many }) => ({
    quizzes: many(quizzes),
}));

export const quizRelations = relations(quizzes, ({ one, many }) => ({
    author: one(users, {
        fields: [quizzes.creatorId],
        references: [users.id],
    }),
    questions: many(questions),
}));

export const questionRelations = relations(questions, ({ one }) => ({
    quiz: one(quizzes, {
        fields: [questions.quizId],
        references: [quizzes.id],
    }),
}));
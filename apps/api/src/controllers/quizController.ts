import type { Request, Response, NextFunction } from "express";
import { db, quizzes, questions } from "@zelos/db";
import { type QuizInput } from "@zelos/shared-types";
import { AppError } from "../utils/AppError";

export const createQuiz = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const quizData = req.body as QuizInput;

        const targetUser = await db.query.users.findFirst();
        if (!targetUser) {
            return next(new AppError("No users exist in the database yet. Run the seeder!", 500));
        }
        const newQuiz = await db.transaction(async (tx) => {

            const [insertedQuiz] = await tx
                .insert(quizzes)
                .values({
                    title: quizData.title,
                    description: quizData.description,
                    creatorId: targetUser.id,
                })
                .returning();

            const questionsToInsert = quizData.questions.map((q, index) => ({
                quizId: insertedQuiz!.id,
                questionText: q.questionText,
                timeLimit: q.timeLimit,
                sortOrder: index,
                options: q.options,
            }));

            await tx.insert(questions).values(questionsToInsert);

            return insertedQuiz;
        });

        res.status(201).json({
            status: "success",
            data: {
                quiz: newQuiz,
            },
        });
    } catch (error) {
        next(error);
    }
};
import {z} from 'zod';

// Because its jsonb , it works
export const OptionSchema = z.object({
    text: z.string().min(1,"Option no empty gang").max(512,"Option too long gang"),
    isCorrect: z.boolean().default(false),
})

export const QuestionSchema = z.object({
    questionText: z.string().min(3,"Question text no empty gang").max(512,"Question text too long gang"),
    timeLimit: z.number().int().positive().min(5,"Time limit too short gang").max(512,"Time limit too long gang").default(30),
    sortOrder: z.number().int().nonnegative().optional(),
    options: z.array(OptionSchema).min(2,"At least 2 options gang"),
})

export const QuizSchema = z.object({
    title: z.string().min(3,"Title no empty gang").max(256,"Title too long gang"),
    description: z.string().max(512,"Description too long gang").optional(),
    questions: z.array(QuestionSchema).min(1,"At least 1 question blud"),
})

export type QuizInput = z.infer<typeof QuizSchema>;
export type QuestionInput = z.infer<typeof QuestionSchema>;
export type OptionInput = z.infer<typeof OptionSchema>;
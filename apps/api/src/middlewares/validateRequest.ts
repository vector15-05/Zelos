import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from "../utils/AppError";

export const validateRequest = (schema: ZodTypeAny) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse(
            req.body
            );
            next();
        } catch (err: any) {
            if (err instanceof ZodError) {
                const errorMessages = err.issues.map((e) => e.message).join(', ');
                return next(new AppError(`Validation error: ${errorMessages}`, 400));
            }
            next(err);
        }
    };
}
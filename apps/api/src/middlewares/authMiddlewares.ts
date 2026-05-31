import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, users, eq } from "@zelos/db";
import { AppError } from "../utils/AppError";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-development-key";

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
            };
        }
    }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let token: string | undefined;

        if (req.cookies && req.cookies.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            return next(new AppError("You are not logged in. Please log in to gain access.", 401));
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

        const userResult = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
        const currentUser = userResult[0];

        if (!currentUser) {
            return next(new AppError("The user belonging to this token no longer exists.", 401));
        }

        req.user = {
            id: currentUser.id,
            email: currentUser.email,
            name: currentUser.name,
        };

        next();
    } catch (error) {
        return next(new AppError("Invalid or expired session token. Please log in again.", 401));
    }
};
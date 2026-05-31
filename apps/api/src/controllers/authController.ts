import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"; 
import { db, users, eq } from "@zelos/db";
import { AppError } from "../utils/AppError";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-development-key";

const signToken = (id: string) => {
    return jwt.sign({ id }, JWT_SECRET, {
        expiresIn: "7d", // Token lasts for 7 days
    });
};

const createSendToken = (user: any, statusCode: number, res: Response) => {
    const token = signToken(user.id);

    //prevents xss
    res.cookie("jwt", token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // HTTPS only in production
        sameSite: "lax", // Allows the cookie to be sent between ports on localhost
    });

    user.password = undefined;

    res.status(statusCode).json({
        status: "success",
        data: {
            user,
        },
    });
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, name, password, bio } = req.body;

        if (!email || !name || !password) {
            return next(new AppError("Please provide email, name, and password", 400));
        }

        // 1. Hash the password (Cost factor 12 is the current industry standard)
        const hashedPassword = await bcrypt.hash(password, 12);

        // 2. Save user to Neon
        const [newUser] = await db
            .insert(users)
            .values({
                email,
                name,
                password: hashedPassword,
                bio: bio || null,
            })
            .returning();

        createSendToken(newUser, 201, res);
    } catch (error: any) {
        // Catch Postgres unique constraint errors (e.g., email already exists)
        if (error.code === "23505") {
            return next(new AppError("Email already in use", 400));
        }
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new AppError("Please provide email and password", 400));
        }

        const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const user = userResult[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return next(new AppError("Incorrect email or password", 401));
        }

        createSendToken(user, 200, res);
    } catch (error) {
        next(error);
    }
};

export const logout = (req: Request, res: Response) => {
    res.cookie("jwt", "loggedout", {
        expires: new Date(Date.now() + 10 * 1000), // Since we can't delete cookies directly, we instead change the time to make the browser delete it automatically 
        httpOnly: true,
    });
    res.status(200).json({ status: "success" });
};
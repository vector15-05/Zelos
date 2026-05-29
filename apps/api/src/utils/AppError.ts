class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Object.setPrototypeOf(this, new.target.prototype);

        if (typeof (Error as any).captureStackTrace === 'function') {
            (Error as any).captureStackTrace(this, this.constructor);
        } else {
            this.stack = (new Error(message)).stack;
        }
    }
}

class BadRequestError extends AppError {
    constructor(message: string) {
        super(message, 400);
    }
}

class NotFoundError extends AppError {
    constructor(message: string) {
        super(message, 404);
    }
}

class InternalServerError extends AppError {
    constructor(message: string) {
        super(message, 500);
    }
}

export { AppError, BadRequestError, NotFoundError, InternalServerError };
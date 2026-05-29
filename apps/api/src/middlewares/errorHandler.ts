import type {Request, Response, NextFunction} from 'express';
import {AppError} from '../utils/AppError';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    let statusCode = 500;
    let message = 'Internal Server Error';

    if (err instanceof AppError){
        statusCode = err.statusCode;
        message = err.message;
    }else{
        console.error('Unexpected error:', err);
    }

    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,

        ...(process.env.NODE_ENV === 'development' && {stack: err.stack})
    });
}
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middlewares/errorHandler';
import { AppError } from './utils/AppError';

import quizRouter from './routes/quizRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

// Setting up logging
try {
    app.use(pinoHttp({
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV === 'production' ? undefined : {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'yyyy-mm-dd HH:MM:ss.l o',
                ignore: 'pid,hostname'
            }
        }
    }));
} catch (err) {
    console.warn('pino transport failed, falling back to default logger:', err);
    app.use(pinoHttp({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' }));
}


// setting up cors
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// rate limiting ftw
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "error", message: 'Too many requests from this IP, please try again later.' }
});

app.use("/api", limiter);

app.get("/health", (req, res) => {
    res.status(200).json({ status: "success", message: "Zelos API is alive and kicking. Lets GO!!!!" });
});

app.use("/api/quizzes", quizRouter);

// Fallback for unmatched routes. Use `app.use` to avoid potential path-to-regexp
// issues in some environments when using a wildcard path string.
app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(errorHandler);

app.use(quizRouter);

app.listen(PORT, () => {
    console.log(`Zelos API is running on port ${PORT}`);
}); 

export default app;
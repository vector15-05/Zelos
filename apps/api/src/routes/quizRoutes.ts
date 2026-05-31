import { Router } from "express";
import { createQuiz } from "../controllers/quizController";
import { QuizSchema } from "@zelos/shared-types";
import { validateRequest } from "../middlewares/validateRequest";
import { protect } from "../middlewares/authMiddlewares";

const router = Router();

router.post("/", protect, validateRequest(QuizSchema), createQuiz);

export default router;
import { Router } from "express";
import { createQuiz } from "../controllers/quizController";
import { QuizSchema } from "@zelos/shared-types";
import { validateRequest } from "../middlewares/validateRequest";

const router = Router();

router.post("/", validateRequest(QuizSchema), createQuiz);

export default router;
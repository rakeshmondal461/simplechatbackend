import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import userController from "../controllers/userController.js";

const router = Router();

router.get("/me", requireAuth, userController.userProfile);

export default router;

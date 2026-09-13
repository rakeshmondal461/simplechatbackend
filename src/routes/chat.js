import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import ChatController from "../controllers/chatController.js";

const router = Router();

router.get("/cusers", requireAuth, ChatController.chatUsers);
router.get("/fetchroom/:id", requireAuth, ChatController.fetchChatRoom);
router.get(
  "/getmessage/:roomid",
  requireAuth,
  ChatController.getOneToOneMessages,
);
router.post("/initchatroom", requireAuth, ChatController.initNewRoom);
router.post("/send", requireAuth, ChatController.sendOneToOneMessage);

export default router;

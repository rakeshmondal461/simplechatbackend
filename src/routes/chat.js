const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const ChatController = require("../controllers/chatController");

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

module.exports = router;

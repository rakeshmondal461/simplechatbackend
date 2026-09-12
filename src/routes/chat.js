const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const ChatController = require("../controllers/chatController");

const router = Router();

router.get("/fetchroom/:id", requireAuth, ChatController.fetchChatRoom);
router.get("/chats", requireAuth, ChatController.getOneToOneMessages);
router.post("/initchatroom", requireAuth, ChatController.initNewRoom);

module.exports = router;

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import GroupController from "../controllers/groupController.js";

const router = Router();

// All routes require authentication
router.get("/", requireAuth, GroupController.listMyGroups);
router.post("/create", requireAuth, GroupController.createGroup);
router.post("/:id/members", requireAuth, GroupController.addMember);
router.delete("/:id/leave", requireAuth, GroupController.leaveGroup);
router.get("/:id/messages", requireAuth, GroupController.getGroupMessages);
router.get("/:id/members", requireAuth, GroupController.getGroupMembers);

export default router;

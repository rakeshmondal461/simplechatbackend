const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const userController = require("../controllers/userController");

const router = Router();

router.get("/me", requireAuth, userController.userProfile);

module.exports = router;

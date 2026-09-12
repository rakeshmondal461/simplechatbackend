const { Router } = require("express");
const AuthController = require('../controllers/authController');

const router = Router();


router.post("/register", AuthController.register);

router.post("/login", AuthController.login);

module.exports = router;

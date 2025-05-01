const express = require("express");
const { register, login } = require("../controllers/authController");
const { protect, logout } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);

router.get("/me", protect, (req, res) => {
  res.json(req.user);
});

module.exports = router;

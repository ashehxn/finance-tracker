const express = require("express");
const {
  getAllUsers,
  getUserById,
  getUsersByRole,
  updateUser,
  deleteUser,
} = require("../controllers/userController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, restrictTo("admin"), getAllUsers);
router.get("/role", protect, restrictTo("admin"), getUsersByRole);
router.get("/:id", protect, restrictTo("admin"), getUserById);
router.put("/:id", protect, updateUser);
router.delete("/:id", protect, restrictTo("admin"), deleteUser);

module.exports = router;

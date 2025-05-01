const express = require("express");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
} = require("../controllers/goalController");

const router = express.Router();

router.post("/", protect, restrictTo("user"), createGoal);
router.get("/", protect, restrictTo("user"), getGoals);
router.get("/:id", protect, restrictTo("user"), getGoalById);
router.put("/:id", protect, restrictTo("user"), updateGoal);
router.delete("/:id", protect, restrictTo("user"), deleteGoal);

module.exports = router;

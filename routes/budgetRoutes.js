const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/authMiddleware");
const {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudgetDetails,
  addTransactionsToBudget,
  deleteBudget,
  analyzeBudgetAdjustments,
  analyzeSingleBudget,
} = require("../controllers/budgetController");

router.post("/", protect, restrictTo("user"), createBudget);
router.get("/", protect, restrictTo("user"), getBudgets);
router.get("/analyze", protect, restrictTo("user"), analyzeBudgetAdjustments);
router.get("/analyze/:id", protect, restrictTo("user"), analyzeSingleBudget);
router.get("/:id", protect, restrictTo("user"), getBudgetById);
router.put("/:id", protect, restrictTo("user"), updateBudgetDetails);
router.put("/add/:id", protect, restrictTo("user"), addTransactionsToBudget);
router.delete("/:id", protect, restrictTo("user"), deleteBudget);

module.exports = router;

const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/authMiddleware");
const {getSpendingTrends, getIncomeVsExpense, getSpendingByCategory,getSpendingByTag } = require("../controllers/userReportController");

router.get("/trends", protect, restrictTo("user"), getSpendingTrends);
router.get("/summary", protect, restrictTo("user"), getIncomeVsExpense);
router.get("/category", protect, restrictTo("user"), getSpendingByCategory);
router.get("/tags", protect, restrictTo("user"), getSpendingByTag);

module.exports = router;

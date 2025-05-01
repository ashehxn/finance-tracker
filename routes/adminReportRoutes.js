const express = require("express");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const {
  getOverallSpendingTrends,
  getOverallIncomeVsExpense
} = require("../controllers/adminReportController");

const router = express.Router();

router.get("/trends", protect, restrictTo('admin'), getOverallSpendingTrends);
router.get("/summary", protect,  restrictTo('admin'), getOverallIncomeVsExpense);

module.exports = router;

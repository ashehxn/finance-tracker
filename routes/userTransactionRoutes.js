const express = require("express");
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getTransactionsByTag,
  filterTransactions,
  createRecurringTransaction,
  getRecurringTransactionById,
} = require("../controllers/userTransactionController");

const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

// Standard Transactions
router.post("/", protect, restrictTo("user"), createTransaction);
router.get("/", protect, restrictTo("user"), getTransactions);
router.get("/:id", protect, restrictTo("user"), getTransactionById);
router.put("/:id", protect, restrictTo("user"), updateTransaction);
router.delete("/:id", protect, restrictTo("user"), deleteTransaction);

// Search & Filter Transactions
router.get("/filter/tag", protect, restrictTo("user"), getTransactionsByTag);
router.post("/filter", protect, restrictTo("user"), filterTransactions);

// Recurring Transactions
router.post(
  "/recurring",
  protect,
  restrictTo("user"),
  createRecurringTransaction
);
router.get(
  "/recurring/:id",
  protect,
  restrictTo("user"),
  getRecurringTransactionById
);

module.exports = router;

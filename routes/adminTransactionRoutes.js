const express = require("express");
const {
  getAllTransactions,
  getTransactionsByUserId,
  getTransactionById,
  filterTransactions,
} = require("../controllers/adminTransactionController");

const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, restrictTo("admin"), getAllTransactions);
router.get(
  "/user/:userId",
  protect,
  restrictTo("admin"),
  getTransactionsByUserId
);
router.get("/:transactionId", protect, restrictTo("admin"), getTransactionById);
router.post("/filter", protect, restrictTo("admin"), filterTransactions);

module.exports = router;

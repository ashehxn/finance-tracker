const Transaction = require("../models/Transaction");

// Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 }).lean();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get transactions in the system by user ID
exports.getTransactionsByUserId = async (req, res) => {
  try {
    if (!req.params.userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const transactions = await Transaction.find({ user: req.params.userId })
      .sort({ date: -1 })
      .lean();

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a specific transaction in the system by transaction ID
exports.getTransactionById = async (req, res) => {
  try {
    if (!req.params.transactionId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const transaction = await Transaction.findById(
      req.params.transactionId
    ).lean();

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Filter transactions
exports.filterTransactions = async (req, res) => {
  try {
    const {
      tag,
      type,
      startDate,
      endDate,
      category,
      minAmount,
      maxAmount,
      isRecurring,
      userId,
    } = req.body;

    let filter = {};

    if (userId) {
      if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      filter.user = userId;
    }

    // Type Filtering (Expense or Income)
    if (type) {
      const validTypes = ["income", "expense"];
      if (!validTypes.includes(type.toLowerCase())) {
        return res.status(400).json({
          message: "Invalid type. Allowed values are 'income' or 'expense'.",
        });
      }
      filter.type = type.toLowerCase();
    }

    if (startDate || endDate) {
      const start = new Date(startDate || "1900-01-01");
      const end = new Date(endDate || "2100-12-31");

      filter.$or = [
        { date: { $gte: start, $lte: end } },
        { occurrences: { $gte: start, $lte: end } },
      ];
    }

    if (isRecurring !== undefined) {
      filter["recurring.isRecurring"] = isRecurring;
    }

    if (category) {
      filter.category = category;
    }

    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = minAmount;
      if (maxAmount) filter.amount.$lte = maxAmount;
    }

    if (tag) {
      filter.tags = tag;
    }

    const transactions = await Transaction.find(filter).sort({
      occurrences: 1,
      date: -1,
    });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

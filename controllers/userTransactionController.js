const Transaction = require("../models/Transaction");
const Goal = require("../models/Goal");
const SystemSetting = require("../models/SystemSetting");
const logger = require("../utils/logger");

// Generate occurrences required for recurring transaction creation
const generateOccurrences = (startDate, endDate, frequency) => {
  let occurrences = [];
  let currentDate = new Date(startDate);

  while (currentDate <= new Date(endDate)) {
    occurrences.push(new Date(currentDate));
    if (frequency === "daily") {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (frequency === "weekly") {
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (frequency === "monthly") {
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else if (frequency === "annually") {
      currentDate.setFullYear(currentDate.getFullYear() + 1);
    }
  }

  return occurrences;
};

// Create a transaction
exports.createTransaction = async (req, res) => {
  try {
    const { type, amount, currency, category, tags, date, recurring } =
      req.body;

    if (!type || !amount || !category) {
      logger.warn("Transaction creation failed: Missing required fields", {
        user: req.user.id,
      });
      return res
        .status(400)
        .json({ message: "Type, amount, and category are required" });
    }

    const settings = await SystemSetting.findOne();
    if (!settings) {
      logger.error("System settings not found during transaction creation");
      return res.status(500).json({ message: "System settings not found" });
    }

    const transactionCurrency = currency || settings.defaultCurrency;

    if (!settings.categories.includes(category)) {
      logger.warn(`Invalid category used: ${category}`, { user: req.user.id });
      return res.status(400).json({
        message: `Invalid category. Allowed categories: ${settings.categories.join(
          ", "
        )}`,
      });
    }

    let transactionData = {
      user: req.user.id,
      type,
      amount,
      currency: transactionCurrency,
      category,
      tags,
      recurring: { isRecurring: false },
    };

    if (recurring && recurring.isRecurring) {
      if (!recurring.startDate || !recurring.endDate || !recurring.frequency) {
        return res.status(400).json({
          message:
            "Recurring transactions must include startDate, endDate, and frequency.",
        });
      }

      transactionData.recurring = recurring;
      transactionData.occurrences = generateOccurrences(
        recurring.startDate,
        recurring.endDate,
        recurring.frequency
      );
    } else {
      if (!date) {
        return res
          .status(400)
          .json({ message: "Date is required for one-time transactions." });
      }
      transactionData.date = new Date(date);
    }

    const transaction = new Transaction(transactionData);
    await transaction.save();

    // Allocate savings if transaction is income
    if (type === "income") {
      const goals = await Goal.find({ user: req.user.id, status: "active" });

      let totalPercentage = goals.reduce(
        (sum, goal) => sum + goal.percentage,
        0
      );
      if (totalPercentage > 100) {
        return res.status(400).json({
          message: "Total savings allocation across goals cannot exceed 100%.",
        });
      }

      for (let goal of goals) {
        let allocatedAmount = (goal.percentage / 100) * amount;
        goal.savedAmount += allocatedAmount;

        if (goal.savedAmount >= goal.targetAmount) {
          goal.savedAmount = goal.targetAmount;
          goal.status = "completed";
        }

        await goal.save();
      }
    }

    logger.info("Transaction created successfully", {
      user: req.user.id,
      transactionId: transaction._id,
    });

    const savedTransaction = await transaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    logger.error("Error creating transaction", { error: error.message });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all transactions for the logged-in user
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ date: -1 })
      .lean();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a transaction
exports.updateTransaction = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      logger.warn("Transaction update failed: Invalid transaction ID", {
        user: req.user.id,
      });
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    let transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!transaction) {
      logger.warn(`Transaction update failed: Transaction not found (${req.params.id})`, {
        user: req.user.id,
      });
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (
      transaction.recurring.isRecurring &&
      req.body.recurring &&
      req.body.recurring.isRecurring === false
    ) {
      req.body.occurrences = [];
      if (!req.body.date) {
        return res.status(400).json({
          message:
            "A date is required when converting to a one-time transaction.",
        });
      }
    }

    if (req.body.recurring && req.body.recurring.isRecurring) {
      const { startDate, endDate, frequency } = req.body.recurring;

      if (!startDate || !endDate || !frequency) {
        return res.status(400).json({
          message:
            "Recurring transactions must include startDate, endDate, and frequency.",
        });
      }

      req.body.occurrences = generateOccurrences(startDate, endDate, frequency);
    }

    if (!transaction.recurring.isRecurring && req.body.date) {
      req.body.date = new Date(req.body.date);
    }

    transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    logger.info("Transaction updated successfully", {
      user: req.user.id,
      transactionId: transaction._id,
      updatedFields,
    });

    res.json(transaction);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    logger.error("Error updating transaction", { error: error.message });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a transaction
exports.deleteTransaction = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      logger.warn("Transaction deletion failed: Invalid transaction ID", {
        user: req.user.id,
      });
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!transaction) {
      logger.warn(`Transaction deletion failed: Transaction not found (${req.params.id})`, {
        user: req.user.id,
      });
      return res.status(404).json({ message: "Transaction not found" });
    }

    logger.info("Transaction deleted successfully", {
      user: req.user.id,
      transactionId: req.params.id,
    });

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    logger.error("Error deleting transaction", { error: error.message });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get transactions by tag
exports.getTransactionsByTag = async (req, res) => {
  try {
    const { tag } = req.query;

    if (!tag) {
      return res.status(400).json({ message: "Tag parameter is required" });
    }

    const transactions = await Transaction.find({
      user: req.user.id,
      tags: tag,
    }).sort({ date: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Filter transactions by date, recurring, category, or amount
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
    } = req.body;

    let filter = { user: req.user.id };

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

// Recurring Transactions CRUD
exports.createRecurringTransaction = async (req, res) => {
  try {
    const { recurring } = req.body;

    if (
      !recurring ||
      !recurring.startDate ||
      !recurring.endDate ||
      !recurring.frequency
    ) {
      return res.status(400).json({
        message:
          "Recurring transactions must include startDate, endDate, and frequency.",
      });
    }

    req.body.recurring.isRecurring = true;
    await exports.createTransaction(req, res);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getRecurringTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
      "recurring.isRecurring": true,
    });

    if (!transaction) {
      return res
        .status(404)
        .json({ message: "Recurring transaction not found" });
    }

    res.json(transaction);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

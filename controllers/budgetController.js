const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const SystemSetting = require("../models/SystemSetting");
const { convertCurrency } = require("../utils/exchangeRates");

// Generate months for 'Monthly' type budgets
const generateMonthlyBudgets = (
  userId,
  name,
  amount,
  currency,
  category,
  startDate,
  endDate
) => {
  let budgets = [];
  let currentStart = new Date(startDate);

  while (currentStart <= new Date(endDate)) {
    let currentEnd = new Date(currentStart);
    currentEnd.setMonth(currentEnd.getMonth() + 1);
    currentEnd.setDate(0);

    if (currentEnd > new Date(endDate)) {
      currentEnd = new Date(endDate);
    }

    budgets.push({
      user: userId,
      name: `${name} - ${currentStart.toISOString().slice(0, 7)}`,
      amount,
      currency,
      category: category || null,
      transactions: [],
      remainingAmount: amount,
      type: "monthly",
      startDate: new Date(currentStart),
      endDate: new Date(currentEnd),
    });

    currentStart.setMonth(currentStart.getMonth() + 1);
    currentStart.setDate(1);
  }

  return budgets;
};

// Create a budget
const logger = require("../utils/logger");

exports.createBudget = async (req, res) => {
  try {
    const { name, amount, currency, category, type, startDate, endDate } =
      req.body;

    if (!name || !amount || !type || !startDate || !endDate) {
      logger.warn("Budget creation failed - Missing required fields", {
        user: req.user.id,
        requestBody: req.body,
      });

      return res
        .status(400)
        .json({ message: "All required fields must be provided." });
    }

    // Fetch system settings
    const settings = await SystemSetting.findOne();
    if (!settings) {
      logger.error("System settings not found during budget creation", {
        user: req.user.id,
      });

      return res.status(500).json({ message: "System settings not found." });
    }

    const budgetCurrency = currency || settings.defaultCurrency;

    // Validate category
    if (category && !settings.categories.includes(category)) {
      logger.warn("Budget creation failed - Invalid category", {
        user: req.user.id,
        category,
        allowedCategories: settings.categories,
      });

      return res.status(400).json({
        message: `Invalid category. Allowed categories: ${settings.categories.join(
          ", "
        )}`,
      });
    }

    // Validate budget limit
    if (amount > settings.maxBudgetLimit) {
      logger.warn("Budget creation failed - Amount exceeds limit", {
        user: req.user.id,
        amount,
        maxLimit: settings.maxBudgetLimit,
      });

      return res.status(400).json({
        message: `Budget amount exceeds the maximum limit of ${settings.maxBudgetLimit}`,
      });
    }

    let budgetsToCreate = [];

    if (type === "monthly") {
      budgetsToCreate = generateMonthlyBudgets(
        req.user.id,
        name,
        amount,
        budgetCurrency,
        category,
        startDate,
        endDate
      );
    } else {
      budgetsToCreate.push({
        user: req.user.id,
        name,
        amount,
        currency: budgetCurrency,
        category: category || null,
        transactions: [],
        remainingAmount: amount,
        type,
        startDate,
        endDate,
      });
    }

    const budgets = await Budget.insertMany(budgetsToCreate);

    logger.info("Budget created successfully", {
      user: req.user.id,
      budget: budgets.map((b) => ({
        id: b._id,
        name: b.name,
        amount: b.amount,
        currency: b.currency,
      })),
    });

    res.status(201).json(budgets);
  } catch (error) {
    logger.error("Server error during budget creation", {
      user: req.user.id,
      error: error.message,
    });

    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all budgets
exports.getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a specific budget by ID
exports.getBudgetById = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid budget ID" });
    }

    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("transactions");

    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    res.json(budget);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a budget
exports.updateBudgetDetails = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      logger.warn("Invalid budget ID format", { budgetId: req.params.id });
      return res.status(400).json({ message: "Invalid budget ID" });
    }

    let budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!budget) {
      logger.warn("Budget update failed - Budget not found", { user: req.user.id, budgetId: req.params.id });
      return res.status(404).json({ message: "Budget not found" });
    }

    if (req.body.name) budget.name = req.body.name;
    if (req.body.amount) budget.amount = req.body.amount;
    if (req.body.category) budget.category = req.body.category;
    if (req.body.startDate) budget.startDate = req.body.startDate;
    if (req.body.endDate) budget.endDate = req.body.endDate;

    await budget.save();
    logger.info("Budget updated successfully", { user: req.user.id, budgetId: budget._id });

    res.json(budget);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    logger.error("Error updating budget", { user: req.user.id, error: error.message });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add transactions to budget
exports.addTransactionsToBudget = async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (
      !req.params.id.match(/^[0-9a-fA-F]{24}$/) ||
      !transactionId.match(/^[0-9a-fA-F]{24}$/)
    ) {
      logger.warn("Invalid budget or transaction ID format", { budgetId: req.params.id, transactionId });
      return res
        .status(400)
        .json({ message: "Invalid budget or transaction ID" });
    }

    let budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!budget) {
      logger.warn("Add transaction failed - Budget not found", { user: req.user.id, budgetId: req.params.id });
      return res.status(404).json({ message: "Budget not found" });
    }

    let transaction = await Transaction.findOne({
      _id: transactionId,
      user: req.user.id,
    });

    if (!transaction) {
      logger.warn("Add transaction failed - Transaction not found", { user: req.user.id, transactionId });
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.recurring.isRecurring && budget.type !== "category") {
      logger.warn("Attempted to add recurring transaction to non-category budget", { user: req.user.id, budgetId: budget._id });
      return res.status(400).json({
        message:
          "Recurring transactions can only be added to category-type budgets.",
      });
    }

    if (
      !budget.transactions.includes(transactionId) &&
      transaction.isAssignedToBudget
    ) {
      logger.warn("Transaction is already assigned to another budget", { user: req.user.id, transactionId });
      return res.status(400).json({
        message: "Transaction is already assigned to another budget.",
      });
    }

    let totalAmount = transaction.amount;

    if (transaction.recurring.isRecurring) {
      const occurrenceCount = transaction.occurrences.length;
      totalAmount *= occurrenceCount;
    }

    if (transaction.currency !== budget.currency) {
      totalAmount = await convertCurrency(
        totalAmount,
        transaction.currency,
        budget.currency
      );

      transaction.currency = budget.currency;
    }

    if (budget.transactions.includes(transactionId)) {
      budget.transactions = budget.transactions.filter(
        (id) => id.toString() !== transactionId
      );
      budget.remainingAmount +=
        transaction.type === "expense" ? totalAmount : -totalAmount;
      transaction.isAssignedToBudget = false;
    } else {
      budget.transactions.push(transactionId);
      budget.remainingAmount -=
        transaction.type === "expense" ? totalAmount : -totalAmount;
      transaction.isAssignedToBudget = true;
    }

    await budget.save();
    await transaction.save();

    logger.info("Transaction added to budget", { user: req.user.id, budgetId: budget._id, transactionId });

    res.json(budget);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    logger.error("Error adding transaction to budget", { user: req.user.id, error: error.message });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a budget
exports.deleteBudget = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      logger.warn("Invalid budget ID format", { budgetId: req.params.id });
      return res.status(400).json({ message: "Invalid budget ID" });
    }

    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!budget) {
      logger.warn("Budget deletion failed - Budget not found", { user: req.user.id, budgetId: req.params.id });
      return res.status(404).json({ message: "Budget not found" });
    }

    await Transaction.updateMany(
      { _id: { $in: budget.transactions } },
      { $set: { isAssignedToBudget: false } }
    );

    logger.info("Budget deleted successfully", { user: req.user.id, budgetId: budget._id });

    res.json({ message: "Budget deleted successfully" });
  } catch (error) {
    logger.error("Error deleting budget", { user: req.user.id, error: error.message });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Single budget adjustment recommendation
exports.analyzeSingleBudget = async (req, res) => {
  try {
    let budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    let totalBudget = budget.amount;
    let remaining = budget.remainingAmount;
    let spentAmount = totalBudget - remaining;
    let spentPercentage = (spentAmount / totalBudget) * 100;

    budget.recommendedAdjustment = {
      action: null,
      suggestedAmount: 0,
      reason: null,
    };

    if (spentPercentage > 90 && spentPercentage < 100) {
      budget.recommendedAdjustment = {
        action: "increase",
        suggestedAmount: Math.ceil(totalBudget * 1.1), // Increase by 10%
        reason:
          "You have used over 90% of your budget. Consider increasing it.",
      };
    } else if (spentPercentage < 50) {
      budget.recommendedAdjustment = {
        action: "reduce",
        suggestedAmount: Math.ceil(totalBudget * 0.8), // Reduce by 20%
        reason:
          "You have spent less than 50% of your budget. Consider reducing it.",
      };
    } else {
      let overBudget = await Budget.findOne({
        user: req.user.id,
        remainingAmount: { $lt: 0 },
      });

      if (overBudget) {
        budget.recommendedAdjustment = {
          action: "reallocate",
          suggestedAmount: Math.abs(overBudget.remainingAmount),
          reason: `Your '${overBudget.name}' budget is exceeded. Consider reallocating funds.`,
        };
      }
    }

    await budget.save();
    res.json({ message: "Budget analysis completed", budget });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Budget adjustment recommendation - All budgets
exports.analyzeBudgetAdjustments = async (req, res) => {
  try {
    let budgets = await Budget.find({ user: req.user.id });

    for (let budget of budgets) {
      let totalBudget = budget.amount;
      let remaining = budget.remainingAmount;
      let spentAmount = totalBudget - remaining;
      let spentPercentage = (spentAmount / totalBudget) * 100;

      budget.recommendedAdjustment = {
        action: null,
        suggestedAmount: 0,
        reason: null,
      };

      if (spentPercentage > 90 && spentPercentage < 100) {
        budget.recommendedAdjustment = {
          action: "increase",
          suggestedAmount: Math.ceil(totalBudget * 1.1), // Increase by 10%
          reason:
            "You have used over 90% of your budget. Consider increasing it.",
        };
      } else if (spentPercentage < 50) {
        budget.recommendedAdjustment = {
          action: "reduce",
          suggestedAmount: Math.ceil(totalBudget * 0.8), // Reduce by 20%
          reason:
            "You have spent less than 50% of your budget. Consider reducing it.",
        };
      } else {
        let overBudget = await Budget.findOne({
          user: req.user.id,
          remainingAmount: { $lt: 0 },
        });

        if (overBudget) {
          budget.recommendedAdjustment = {
            action: "reallocate",
            suggestedAmount: Math.abs(overBudget.remainingAmount),
            reason: `Your '${overBudget.name}' budget is exceeded. Consider reallocating funds.`,
          };
        }
      }

      await budget.save();
    }

    res.json({ message: "Budget analysis completed", budgets });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

// Get Spending Trends Over Time (Monthly or Yearly)
exports.getSpendingTrends = async (req, res) => {
  try {
    const userId = req.user.id;
    const userIdObject = new mongoose.Types.ObjectId(userId);
    
    const { type, year } = req.query;
    let matchStage = { user: userIdObject, type: "expense" };

    if (type === "monthly" && year) {
      matchStage.date = {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      };
    }

    const groupStage = {
      _id: type === "yearly" ? { year: { $year: "$date" } } : { year: { $year: "$date" }, month: { $month: "$date" } },
      totalSpent: { $sum: "$amount" },
    };

    const trends = await Transaction.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json(trends);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Income vs. Expense Summary
exports.getIncomeVsExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const userIdObject = new mongoose.Types.ObjectId(userId);

    const { startDate, endDate } = req.query;
    let matchStage = { user: userIdObject };

    if (startDate && endDate) {
      matchStage.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const summary = await Transaction.aggregate([
      { $match: matchStage },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);

    let income = 0, expenses = 0;
    summary.forEach((entry) => {
      if (entry._id === "income") income = entry.total;
      else if (entry._id === "expense") expenses = entry.total;
    });

    res.json({ income, expenses });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Spending by Category
exports.getSpendingByCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const userIdObject = new mongoose.Types.ObjectId(userId);

    const { startDate, endDate } = req.query;
    let matchStage = { user: userIdObject, type: "expense" };

    if (startDate && endDate) {
      matchStage.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const spendingByCategory = await Transaction.aggregate([
      { $match: matchStage },
      { $group: { _id: "$category", totalSpent: { $sum: "$amount" } } },
      { $sort: { totalSpent: -1 } },
    ]);

    res.json(spendingByCategory);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Spending by Tag
exports.getSpendingByTag = async (req, res) => {
  try {
    const userId = req.user.id;
    const userIdObject = new mongoose.Types.ObjectId(userId);

    const { startDate, endDate } = req.query;
    let matchStage = { user: userIdObject, type: "expense" };

    if (startDate && endDate) {
      matchStage.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const spendingByTag = await Transaction.aggregate([
      { $match: matchStage },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", totalSpent: { $sum: "$amount" } } },
      { $sort: { totalSpent: -1 } },
    ]);

    res.json(spendingByTag);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

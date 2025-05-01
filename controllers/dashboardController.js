const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const Goal = require("../models/Goal");
const mongoose = require("mongoose");

// Admin Dashboard
exports.getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalIncome = await Transaction.aggregate([
      { $match: { type: "income" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalExpenses = await Transaction.aggregate([
      { $match: { type: "expense" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalBudgets = await Budget.countDocuments();
    const totalBudgetAmount = await Budget.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const activeGoals = await Goal.countDocuments({ status: "active" });

    res.json({
      totalUsers,
      totalIncome: totalIncome[0]?.total || 0,
      totalExpenses: totalExpenses[0]?.total || 0,
      totalBudgets,
      totalBudgetAmount: totalBudgetAmount[0]?.total || 0,
      activeGoals,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// User Dashboard
exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const userIdObject = new mongoose.Types.ObjectId(userId);

    const totalIncome = await Transaction.aggregate([
      { $match: { user: userIdObject, type: "income" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalExpenses = await Transaction.aggregate([
      { $match: { user: userIdObject, type: "expense" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const incomeAmount = totalIncome.length > 0 ? totalIncome[0].total : 0;
    const expenseAmount = totalExpenses.length > 0 ? totalExpenses[0].total : 0;

    const budgets = await Budget.find({ user: userId }).select(
      "name remainingAmount"
    );

    const goals = await Goal.find({ user: userId, status: "active" }).select(
      "name targetAmount savedAmount"
    );

    const formattedGoals = goals.map((goal) => ({
      name: goal.name,
      progress: ((goal.savedAmount / goal.targetAmount) * 100).toFixed(2),
    }));

    res.json({
      totalIncome: incomeAmount,
      totalExpenses: expenseAmount,
      remainingBudget: budgets.reduce((sum, b) => sum + b.remainingAmount, 0),
      goals: formattedGoals,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

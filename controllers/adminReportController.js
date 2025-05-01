const Transaction = require("../models/Transaction");

// Get Overall Spending Trends (All Users)
exports.getOverallSpendingTrends = async (req, res) => {
  try {
    const { type, year } = req.query;
    let matchStage = { type: "expense" };

    if (type === "monthly" && year) {
      let start = new Date(`${year}-01-01T00:00:00.000Z`);
      let end = new Date(`${year}-12-31T23:59:59.999Z`);

      matchStage.$or = [
        { date: { $ne: null, $gte: start, $lte: end } },
        { occurrences: { $elemMatch: { $gte: start, $lte: end } } }
      ];
    }

    const trends = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: { $ifNull: ["$date", { $arrayElemAt: ["$occurrences", 0] }] } },
            month: { $month: { $ifNull: ["$date", { $arrayElemAt: ["$occurrences", 0] }] } }
          },
          totalSpent: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json(trends);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Overall Income vs. Expense Summary (All Users)
exports.getOverallIncomeVsExpense = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let matchStage = {};

    if (startDate && endDate) {
      let start = new Date(`${startDate}T00:00:00.000Z`);
      let end = new Date(`${endDate}T23:59:59.999Z`);

      matchStage.$or = [
        { date: { $ne: null, $gte: start, $lte: end } },
        { occurrences: { $elemMatch: { $gte: start, $lte: end } } }
      ];
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

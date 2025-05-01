const Goal = require("../models/Goal");
const SystemSetting = require("../models/SystemSetting");
const logger = require("../utils/logger");

// Create a financial goal
exports.createGoal = async (req, res) => {
  try {
    const { name, targetAmount, currency, percentage, deadline } = req.body;

    // Validations
    if (!name || !targetAmount || !percentage || !deadline) {
      logger.warn("Goal creation failed - Missing required fields", { user: req.user.id });
      return res.status(400).json({ message: "All fields are required." });
    }

    if (targetAmount <= 0) {
      logger.warn("Goal creation failed - Invalid target amount", { user: req.user.id, targetAmount });
      return res
        .status(400)
        .json({ message: "Target amount must be greater than zero." });
    }

    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      logger.warn("Goal creation failed - Invalid deadline", { user: req.user.id, deadline });
      return res
        .status(400)
        .json({ message: "Deadline must be a future date." });
    }

    // Fetch system settings
    const settings = await SystemSetting.findOne();
    if (!settings) {
      logger.error("System settings not found during goal creation", { user: req.user.id });
      return res.status(500).json({ message: "System settings not found." });
    }

    const goalCurrency = currency || settings.defaultCurrency;

    let totalPercentage = await Goal.aggregate([
      { $match: { user: req.user.id, status: "active" } },
      { $group: { _id: null, total: { $sum: "$percentage" } } },
    ]);

    totalPercentage = (totalPercentage[0]?.total || 0) + percentage;
    if (totalPercentage > 100) {
      logger.warn("Goal creation failed - Percentage allocation exceeded 100%", { user: req.user.id, totalPercentage });
      return res.status(400).json({
        message: "Total savings allocation across goals cannot exceed 100%.",
      });
    }

    const goal = new Goal({
      user: req.user.id,
      name,
      targetAmount,
      savedAmount: 0,
      currency: goalCurrency,
      percentage,
      deadline,
      status: "active",
    });

    await goal.save();

    logger.info("Goal created successfully", { user: req.user.id, goalId: goal._id });

    res.status(201).json(goal);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    logger.error("Error creating goal", { user: req.user.id, error: error.message });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all goals of the logged-in user
exports.getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a specific goal
exports.getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found." });
    }

    res.json(goal);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update goal details
exports.updateGoal = async (req, res) => {
  try {
    const { targetAmount, percentage, deadline } = req.body;

    let goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });

    // Validation
    if (!goal) {
      logger.warn("Goal update failed - Goal not found", { user: req.user.id, goalId: req.params.id });
      return res.status(404).json({ message: "Goal not found." });
    }

    if (targetAmount !== undefined) {
      if (targetAmount <= 0) {
        logger.warn("Goal update failed - Invalid target amount", { user: req.user.id, targetAmount });
        return res
          .status(400)
          .json({ message: "Target amount must be greater than zero." });
      }
      goal.targetAmount = targetAmount;
    }

    if (deadline !== undefined) {
      const deadlineDate = new Date(deadline);
      if (deadlineDate <= new Date()) {
        logger.warn("Goal update failed - Invalid deadline", { user: req.user.id, deadline });
        return res
          .status(400)
          .json({ message: "Deadline must be a future date." });
      }
      goal.deadline = deadlineDate;
    }

    if (percentage) {
      let totalPercentage = await Goal.aggregate([
        {
          $match: {
            user: req.user.id,
            _id: { $ne: goal._id },
            status: "active",
          },
        },
        { $group: { _id: null, total: { $sum: "$percentage" } } },
      ]);

      totalPercentage = (totalPercentage[0]?.total || 0) + percentage;
      if (totalPercentage > 100) {
        logger.warn("Goal update failed - Percentage allocation exceeded 100%", { user: req.user.id, totalPercentage });
        return res.status(400).json({
          message: "Total savings allocation across goals cannot exceed 100%.",
        });
      }
      goal.percentage = percentage;
    }

    await goal.save();

    logger.info("Goal updated successfully", { user: req.user.id, goalId: goal._id });

    res.json(goal);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    logger.error("Error updating goal", { user: req.user.id, error: error.message });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a goal
exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!goal) {
      logger.warn("Goal deletion failed - Goal not found", { user: req.user.id, goalId: req.params.id });
      return res.status(404).json({ message: "Goal not found." });
    }

    logger.info("Goal deleted successfully", { user: req.user.id, goalId: goal._id });

    res.json({ message: "Goal deleted successfully." });
  } catch (error) {
    logger.error("Error deleting goal", { user: req.user.id, error: error.message });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

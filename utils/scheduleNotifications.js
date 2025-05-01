const Notification = require("../models/Notification");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const Goal = require("../models/Goal");

const generateNotifications = async () => {
  try {
    console.log("Running scheduled notification job...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(today.getDate() + 2);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const fiveDaysBefore = new Date();
    fiveDaysBefore.setDate(today.getDate() + 5);

    // Format for MongoDB query
    const todayISO = today.toISOString();
    const twoDaysLaterISO = twoDaysLater.toISOString();
    const yesterdayISO = yesterday.toISOString();

    // Check for upcoming recurring transactions
    const upcomingTransactions = await Transaction.find({
      "recurring.isRecurring": true,
      occurrences: {
        $elemMatch: {
          $gte: new Date(twoDaysLater.setHours(0, 0, 0, 0)),
          $lt: new Date(twoDaysLater.setHours(23, 59, 59, 999)),
        },
      },
    });

    for (const transaction of upcomingTransactions) {
      const matchingDate = transaction.occurrences.find(
        (date) =>
          date.toISOString().split("T")[0] === twoDaysLaterISO.split("T")[0]
      );

      await Notification.create({
        user: transaction.user,
        message: `Upcoming ${transaction.category} payment of ${
          transaction.amount
        } ${transaction.currency} on ${
          matchingDate ? matchingDate.toISOString().split("T")[0] : "2025-04-01"
        }`,
        type: "transaction",
      });
    }

    // Check for missed transactions
    const missedTransactions = await Transaction.find({
      "recurring.isRecurring": true,
      occurrences: {
        $elemMatch: {
          $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
          $lt: new Date(yesterday.setHours(23, 59, 59, 999)),
        },
      },
    });

    for (const transaction of missedTransactions) {
      const matchingDate = transaction.occurrences.find(
        (date) =>
          date.toISOString().split("T")[0] === yesterdayISO.split("T")[0]
      );

      const existingNotification = await Notification.findOne({
        user: transaction.user,
        message: `Missed ${transaction.category} payment of ${
          transaction.amount
        } ${transaction.currency} on ${
          matchingDate
            ? matchingDate.toISOString().split("T")[0]
            : "Unknown Date"
        }`,
        readStatus: "unread",
      });

      if (!existingNotification) {
        await Notification.create({
          user: transaction.user,
          message: `Missed ${transaction.category} payment of ${
            transaction.amount
          } ${transaction.currency} on ${
            matchingDate
              ? matchingDate.toISOString().split("T")[0]
              : "Unknown Date"
          }`,
          type: "transaction",
        });
      }
    }

    // Check for budgets nearing limits
    const budgets = await Budget.find();
    for (const budget of budgets) {
      if (budget.remainingAmount < budget.amount * 0.1) {
        await Notification.create({
          user: budget.user,
          message: `Your ${budget.name} budget is almost exceeded!`,
          type: "budget",
        });
      }
    }

    // Check for goals nearing completion
    const goals = await Goal.find({ status: "active" });
    for (const goal of goals) {
      if (goal.savedAmount >= goal.targetAmount * 0.9) {
        await Notification.create({
          user: goal.user,
          message: `You're close to reaching your goal: "${goal.name}"!`,
          type: "goal",
        });
      }

      // Send reminder for goals approaching deadline
      if (
        new Date(goal.deadline).toDateString() === fiveDaysBefore.toDateString()
      ) {
        await Notification.create({
          user: goal.user,
          message: `Reminder: Your goal "${goal.name}" is due in 5 days!`,
          type: "goal",
        });
      }
    }

    console.log("Notification job completed.");
  } catch (error) {
    console.error("Error generating notifications:", error.message);
  }
};

module.exports = generateNotifications;

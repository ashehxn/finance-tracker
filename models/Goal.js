const mongoose = require("mongoose");

const validCurrencies = [
  "USD",
  "EUR",
  "LKR",
  "GBP",
  "AUD",
  "CAD",
  "INR",
  "SGD",
  "JPY",
  "CHF",
];

const GoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    name: {
      type: String,
      required: [true, "Goal name is required"],
      minlength: [3, "Goal name must be at least 3 characters long"],
    },
    targetAmount: {
      type: Number,
      required: [true, "Target amount is required"],
      min: [0, "Target amount must be a positive number"],
    },
    savedAmount: {
      type: Number,
      required: [true, "Saved amount is required"],
      default: 0,
      min: [0, "Saved amount must be a positive number"],
    },
    currency: {
      type: String,
      enum: {
        values: validCurrencies,
        message: "Currency must be one of the following: USD, EUR, LKR, GBP, AUD, CAD, INR, SGD, JPY, CHF",
      },
      required: [true, "Currency is required"],
    },
    percentage: {
      type: Number,
      required: [true, "Percentage is required"],
      min: [0, "Percentage must be between 0 and 100"],
      max: [100, "Percentage must be between 0 and 100"],
    },
    deadline: {
      type: Date,
      required: [true, "Deadline is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["active", "completed"],
        message: "Status must be either 'active' or 'completed'",
      },
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Goal", GoalSchema);

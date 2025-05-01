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

const BudgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    name: {
      type: String,
      required: [true, "Budget name is required"],
      minlength: [3, "Budget name must be at least 3 characters long"],
    },
    amount: {
      type: Number,
      required: [true, "Budget amount is required"],
      min: [0, "Amount must be a positive number"],
    },
    currency: {
      type: String,
      enum: {
        values: validCurrencies,
        message: "Currency must be one of the following: USD, EUR, LKR, GBP, AUD, CAD, INR, SGD, JPY, CHF",
      },
      required: [true, "Currency is required"],
    },
    category: {
      type: String,
      default: null,
    },
    transactions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    ],
    remainingAmount: {
      type: Number,
      required: [true, "Remaining amount is required"],
    },
    type: {
      type: String,
      enum: {
        values: ["monthly", "category"],
        message: "Type must be either 'monthly' or 'category'",
      },
      required: [true, "Budget type is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    recommendedAdjustment: {
      action: {
        type: String,
        enum: {
          values: ["increase", "reduce", "reallocate"],
          message: "Action must be one of 'increase', 'reduce', or 'reallocate'",
        },
        default: null,
      },
      suggestedAmount: {
        type: Number,
        default: 0,
        min: [0, "Suggested amount must be a positive number"],
      },
      reason: {
        type: String,
        default: null,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Budget", BudgetSchema);

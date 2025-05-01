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

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: [true, "Transaction type is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount must be a positive number"],
    },
    currency: {
      type: String,
      enum: validCurrencies,
      required: [true, "Currency is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
    },
    tags: [
      { type: String },
    ],
    date: {
      type: Date,
      default: null,
    },
    occurrences: [
      { type: Date },
    ],
    recurring: {
      isRecurring: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "annually"],
        default: null,
      },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
    isAssignedToBudget: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", TransactionSchema);

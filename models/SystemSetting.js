const mongoose = require("mongoose");

const SystemSettingSchema = new mongoose.Schema(
  {
    defaultCurrency: {
      type: String,
      enum: [
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
      ],
      required: true,
      default: "USD",
    },
    categories: [
      { type: String, required: true, default: ["Food", "Rent", "Utilities"] },
    ],
    maxBudgetLimit: { type: Number, required: true, default: 10000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemSetting", SystemSettingSchema);

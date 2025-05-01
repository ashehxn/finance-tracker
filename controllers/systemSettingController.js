const SystemSetting = require("../models/SystemSetting");
const logger = require("../utils/logger");

// Get System Settings
exports.getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.findOne();
    if (!settings) {
      return res.status(404).json({ message: "System settings not found" });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update System Settings
exports.updateSystemSettings = async (req, res) => {
  try {
    const { defaultCurrency, categories, maxBudgetLimit } = req.body;

    let settings = await SystemSetting.findOne();
    if (!settings) {
      logger.warn("System settings not found. Creating new settings.");
      settings = new SystemSetting();
    }

    if (defaultCurrency) settings.defaultCurrency = defaultCurrency;
    if (categories) settings.categories = categories;
    if (maxBudgetLimit) settings.maxBudgetLimit = maxBudgetLimit;

    await settings.save();
    res.json({ message: "System settings updated successfully", settings });
  } catch (error) {
    logger.error("Error updating system settings", { error: error.message });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

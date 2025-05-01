const User = require("../models/User");
const logger = require("../utils/logger");

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Get a specific user (Admin only)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Get users by role (Admin only)
exports.getUsersByRole = async (req, res) => {
    try {
      const { role } = req.query;
  
      if (!role || !["admin", "user"].includes(role.toLowerCase())) {
        return res.status(400).json({ message: "Invalid role. Use 'admin' or 'user'." });
      }
  
      const users = await User.find({ role: role.toLowerCase() }).select("-password");
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
};
  
// Update profile
exports.updateUser = async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== "admin") {
      logger.warn(`Unauthorized user update attempt by ${req.user.id}`);
      return res.status(403).json({ message: "Access denied" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      logger.warn(`User update failed: User ID ${req.params.id} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(`User updated successfully: ${updatedUser._id}`, {
      updatedFields: req.body,
    });

    res.json(updatedUser);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    logger.error("Error updating user", { error: error.message });
    res.status(500).json({ message: "Server error", error });
  }
};

// Delete user (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      logger.warn(`User deletion failed: User ID ${req.params.id} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    await user.deleteOne();
    logger.info(`User deleted successfully: ${req.params.id}`);
    
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    logger.error("Error deleting user", { error: error.message });
    res.status(500).json({ message: "Server error", error });
  }
};

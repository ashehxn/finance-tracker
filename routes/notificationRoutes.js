const express = require("express");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/", protect, restrictTo("user"), getNotifications);
router.put("/:id/read", protect, restrictTo("user"), markNotificationAsRead);
router.delete("/:id", protect, restrictTo("user"), deleteNotification);

module.exports = router;

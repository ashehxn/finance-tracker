const express = require("express");
const {
  getAdminDashboard,
  getUserDashboard,
} = require("../controllers/dashboardController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/user", protect, restrictTo("user"), getUserDashboard);
router.get("/admin", protect, restrictTo("admin"), getAdminDashboard);

module.exports = router;

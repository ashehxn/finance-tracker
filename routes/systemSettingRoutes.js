const express = require("express");
const {
  getSystemSettings,
  updateSystemSettings,
} = require("../controllers/systemSettingController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, restrictTo("admin"), getSystemSettings);
router.put("/", protect, restrictTo("admin"), updateSystemSettings);

module.exports = router;

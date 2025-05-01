require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const cron = require("node-cron");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const userTransactionRoutes = require("./routes/userTransactionRoutes");
const adminTransactionRoutes = require("./routes/adminTransactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const userReportRoutes = require("./routes/userReportRoutes");
const adminReportRoutes = require("./routes/adminReportRoutes");
const goalRoutes = require("./routes/goalRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const generateNotifications = require("./utils/scheduleNotifications");
const systemSettingsRoutes = require("./routes/systemSettingRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

connectDB();

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
app.use(helmet());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/userTransactions", userTransactionRoutes);
app.use("/api/adminTransactions", adminTransactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/userReports", userReportRoutes);
app.use("/api/adminReports", adminReportRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/systemSettings", systemSettingsRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Run every day at midnight
cron.schedule("0 0 * * *", () => {
  generateNotifications();
});

app.get("/", (req, res) => {
  res.send("Personal Finance Tracker API is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

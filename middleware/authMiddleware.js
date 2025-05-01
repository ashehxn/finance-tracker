const jwt = require("jsonwebtoken");
const User = require("../models/User");

let tokenBlacklist = new Set();

// Middleware to verify the JWT and pass the logged user's data to next stage
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ message: "Token has been revoked. Please log in again." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, invalid token" });
  }
};

// Middleware to restrict access based on role
exports.restrictTo = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ message: "Access denied. Insufficient permissions." });
  }
  next();
};

// Middleware to logout
exports.logout = (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      tokenBlacklist.add(token);
    }
    res.json({ message: "Logged out successfully" });
};
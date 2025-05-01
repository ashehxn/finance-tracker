const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger");

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

// Register User
exports.register = async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      let user = await User.findOne({ email });
  
      if (user){
        logger.warn(`Registration failed: Email (${email}) already exists`);
        return res.status(400).json({ message: "User already exists" });
      }

      const userRole = role === "admin" ? "admin" : "user";
      user = await User.create({ name, email, password, role: userRole });

      logger.info(`New user registered: ${email} (Role: ${userRole})`);
  
      res.status(201).json({ token: generateToken(user), role: user.role });
    } catch (error) {
      logger.error(`Registration error: ${error.message}`);
      res.status(500).json({ message: "Server error", error });
    }
};  

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user){ 
      logger.warn(`Failed login attempt: Email (${email}) not found`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`Failed login attempt: Incorrect password for ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    logger.info(`User logged in: ${email} (Role: ${user.role})`);

    res.json({ token: generateToken(user) });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ message: "Server error", error });
  }
};
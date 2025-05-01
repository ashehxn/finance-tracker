const { createLogger, transports, format } = require("winston");
require("winston-mongodb");

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "logs/error.log", level: "error" }),
    new transports.File({ filename: "logs/activity.log", level: "info" }),
    new transports.File({ filename: "logs/warn.log", level: "warn" }),
    new transports.MongoDB({
      db: process.env.MONGO_URI,
      collection: "logs",
      level: "info",
      options: { useUnifiedTopology: true }
    })
  ]
});

module.exports = logger;

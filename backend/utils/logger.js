const winston = require("winston");
const path = require("path");

// Define log format with more detailed metadata
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata, null, 2)}`;
    }
    return msg;
  })
);

// Create logger instance with more detailed configuration
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  defaultMeta: {
    service: "colorsense-api",
    environment: process.env.NODE_ENV || "development",
  },
  transports: [
    // Write all logs to console with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
      zippedArchive: true,
    }),
    // Write all errors to error.log
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
      zippedArchive: true,
    }),
    // Write performance metrics to performance.log
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/performance.log"),
      level: "info",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
      zippedArchive: true,
    }),
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/exceptions.log"),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/rejections.log"),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// Create a stream object for Morgan with more detailed request logging
logger.stream = {
  write: (message) => {
    const logData = {
      timestamp: new Date().toISOString(),
      message: message.trim(),
      type: "http",
    };
    logger.info("HTTP Request", logData);
  },
};

// Add performance logging helper
logger.performance = (operation, duration, metadata = {}) => {
  logger.info("Performance Metric", {
    operation,
    duration,
    ...metadata,
    type: "performance",
  });
};

// Add security logging helper
logger.security = (event, metadata = {}) => {
  logger.warn("Security Event", {
    event,
    ...metadata,
    type: "security",
  });
};

module.exports = logger;

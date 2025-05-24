// Frontend logger utility with enhanced features
const LOG_LEVELS = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
};

const LOG_COLORS = {
  [LOG_LEVELS.DEBUG]: "#6c757d",
  [LOG_LEVELS.INFO]: "#0d6efd",
  [LOG_LEVELS.WARN]: "#ffc107",
  [LOG_LEVELS.ERROR]: "#dc3545",
};

const formatMessage = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  const color = LOG_COLORS[level];
  const style = `color: ${color}; font-weight: bold;`;

  let formattedMessage = `%c[${level.toUpperCase()}] ${timestamp} - ${message}`;
  if (Object.keys(data).length > 0) {
    formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
  }

  return [formattedMessage, style];
};

const logger = {
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV === "development") {
      const [formattedMessage, style] = formatMessage(
        LOG_LEVELS.DEBUG,
        message,
        data
      );
      console.debug(formattedMessage, style);
    }
  },

  info: (message, data = {}) => {
    const [formattedMessage, style] = formatMessage(
      LOG_LEVELS.INFO,
      message,
      data
    );
    console.log(formattedMessage, style);
  },

  warn: (message, data = {}) => {
    const [formattedMessage, style] = formatMessage(
      LOG_LEVELS.WARN,
      message,
      data
    );
    console.warn(formattedMessage, style);
  },

  error: (message, error = {}) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      ...error,
    };
    const [formattedMessage, style] = formatMessage(
      LOG_LEVELS.ERROR,
      message,
      errorData
    );
    console.error(formattedMessage, style);
  },

  // Performance logging
  performance: (operation, duration, metadata = {}) => {
    const data = {
      operation,
      duration: `${duration}ms`,
      ...metadata,
    };
    const [formattedMessage, style] = formatMessage(
      LOG_LEVELS.INFO,
      `Performance: ${operation}`,
      data
    );
    console.log(formattedMessage, style);
  },

  // API call logging
  api: (method, endpoint, status, duration, data = {}) => {
    const apiData = {
      method,
      endpoint,
      status,
      duration: `${duration}ms`,
      ...data,
    };
    const [formattedMessage, style] = formatMessage(
      status >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO,
      `API Call: ${method} ${endpoint}`,
      apiData
    );
    console.log(formattedMessage, style);
  },
};

export default logger;

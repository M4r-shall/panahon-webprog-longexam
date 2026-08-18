const Log = require("../Models/logModel.js");

const logger = {
  info: async (message, metadata = {}) => {
    try {
      await Log.create({ level: "info", message, metadata });
    } catch (error) {
      console.error("Failed to write info log:", error);
    }
  },
  
  warn: async (message, metadata = {}) => {
    try {
      await Log.create({ level: "warn", message, metadata });
    } catch (error) {
      console.error("Failed to write warn log:", error);
    }
  },
  
  error: async (message, metadata = {}) => {
    try {
      await Log.create({ level: "error", message, metadata });
    } catch (error) {
      console.error("Failed to write error log:", error);
    }
  }
};

// Middleware to log all requests
const auditLoggerMiddleware = async (request, response, next) => {
  const startTime = Date.now();
  
  // Intercept response to log status code
  const originalSend = response.send;
  response.send = function (data) {
    response.send = originalSend;
    
    const duration = Date.now() - startTime;
    
    // Log the request (after authentication has run)
    const logData = {
      method: request.method,
      path: request.path,
      ip: request.ip || request.connection.remoteAddress,
      userId: request.user?.id || null, // changed to generic id depending on JWT payload
      statusCode: response.statusCode,
      metadata: { duration: `${duration}ms` }
    };
    
    // Log based on status code
    const message = `${logData.method} ${logData.path} - ${logData.statusCode}`;
    if (response.statusCode >= 500) {
      logger.error(message, logData);
    } else if (response.statusCode >= 400) {
      logger.warn(message, logData);
    } else {
      logger.info(message, logData);
    }
    
    return response.send(data);
  };
  
  next();
};

module.exports = { logger, auditLoggerMiddleware };

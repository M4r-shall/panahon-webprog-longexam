const { logger } = require("./auditLoggerMiddleware.js");
const { HttpStatus } = require("../config/constants.js");

// Any request that did not match a mounted route
const notFoundHandler = (request, response) => {
  response.status(HttpStatus.NOT_FOUND).json({
    success: false,
    message: `Route not found: ${request.method} ${request.originalUrl}`,
  });
};

/**
 * Logs the real reason server-side and returns a safe message to the caller.
 * Mongoose/Mongo errors carry schema and collection details, so they must never
 * be echoed back verbatim. Use this from every controller's catch block.
 */
const failServer = (response, error, context, fallback = 'Something went wrong on our end. Please try again.') => {
  logger.error(`${context}: ${error.message}`, { stack: error.stack });
  return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: fallback,
  });
};

/**
 * Turns a Mongoose write failure into a client-safe 400/409.
 * Anything unrecognised is escalated to failServer.
 */
const failValidation = (response, error, context, fallback = 'The request could not be completed.') => {
  if (error.name === 'ValidationError') {
    return response.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed. Please review the highlighted fields.',
      errors: Object.values(error.errors || {}).map((item) => ({
        field: item.path,
        message: item.message,
      })),
    });
  }

  if (error.name === 'CastError') {
    return response.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: `Invalid value supplied for "${error.path}".`,
    });
  }

  if (error.code === 11000) {
    return response.status(HttpStatus.CONFLICT).json({
      success: false,
      message: 'That record already exists.',
    });
  }

  return failServer(response, error, context, fallback);
};

// Catch-all for anything thrown outside a controller's own try/catch
const errorHandler = (error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  // Malformed JSON body from express.json()
  if (error.type === "entity.parse.failed" || error instanceof SyntaxError) {
    return response.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: "Request body is not valid JSON.",
    });
  }

  // Body larger than the express.json() limit
  if (error.type === "entity.too.large") {
    return response.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: "Request body is too large.",
    });
  }

  // File upload rejections from multer. Reported against the "image" field so the
  // admin form can show them under the picker like any other validation error.
  if (error.name === "MulterError") {
    const messages = {
      LIMIT_FILE_SIZE: "Image must be 2MB or smaller.",
      LIMIT_FILE_COUNT: "Only one image can be uploaded at a time.",
      LIMIT_UNEXPECTED_FILE: error.message || "Only one image can be uploaded at a time.",
    };
    const message = messages[error.code] || "That file could not be uploaded.";

    return response.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message,
      errors: [{ field: "image", message }],
    });
  }

  logger.error(`Unhandled error on ${request.method} ${request.path}`, {
    message: error.message,
    stack: error.stack,
  });

  response.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
};

module.exports = { notFoundHandler, errorHandler, failServer, failValidation };

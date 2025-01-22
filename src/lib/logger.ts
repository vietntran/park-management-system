// src/lib/logger.ts
import winston from "winston";

// Define the metadata structure matching Winston's TransformableInfo
interface LogMetadata extends winston.Logform.TransformableInfo {
  timestamp?: string;
  error?: Error;
  [key: string]: unknown;
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "park-management" },
  transports: [
    // Write all logs with importance level of 'error' or less to 'error.log'
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with importance level of 'info' or less to 'combined.log'
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production then log to the console with custom format
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf((info: LogMetadata) => {
          let msg = `${info.timestamp || new Date().toISOString()} [${info.level}] : ${info.message}`;

          // Create a new object with only additional metadata
          const metadata: Record<string, unknown> = Object.entries(info)
            .filter(([key]) => !["level", "message", "timestamp"].includes(key))
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

          if (metadata.error instanceof Error) {
            const errorObj = metadata.error;
            const contextMetadata = { ...metadata };
            delete contextMetadata.error;

            msg += `\nError: ${errorObj.message}`;
            if (errorObj.stack) {
              msg += `\nStack: ${errorObj.stack}`;
            }
            if (Object.keys(contextMetadata).length > 0) {
              msg += `\nContext: ${JSON.stringify(contextMetadata, null, 2)}`;
            }
          } else if (Object.keys(metadata).length > 0) {
            msg += `\nContext: ${JSON.stringify(metadata, null, 2)}`;
          }
          return msg;
        }),
      ),
    }),
  );
}

// Add type safety for logging context
export interface LogContext {
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  error?: Error;
  [key: string]: unknown;
}

// Type-safe logging methods
const typedLogger = {
  error: (message: string, context?: LogContext) =>
    logger.error(message, context),
  warn: (message: string, context?: LogContext) =>
    logger.warn(message, context),
  info: (message: string, context?: LogContext) =>
    logger.info(message, context),
  debug: (message: string, context?: LogContext) =>
    logger.debug(message, context),
};

export default typedLogger;

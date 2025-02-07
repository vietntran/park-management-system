// src/lib/edge-logger.ts
import type { LogContext } from "./logger";

const edgeLogger = {
  error: (message: string, context?: LogContext) => {
    console.error(JSON.stringify({ level: "error", message, context }));
  },
  warn: (message: string, context?: LogContext) => {
    console.warn(JSON.stringify({ level: "warn", message, context }));
  },
  info: (message: string, context?: LogContext) => {
    console.info(JSON.stringify({ level: "info", message, context }));
  },
  debug: (message: string, context?: LogContext) => {
    console.debug(JSON.stringify({ level: "debug", message, context }));
  },
};

export default edgeLogger;

import winston, { format } from "winston";
import expressWinston from "express-winston";
import { Handler } from "express";

let logger: winston.Logger;
let expressLogger: Handler;

const defaultMeta = {
  service_name: process.env.SERVICE_NAME || "unknown",
  service_version: process.env.SERVICE_VERSION || "unknown",
};

export function getFileLogger(filename: string): winston.Logger {
  if (!logger) {
    if (process.env.NODE_ENV === "production") {
      logger = winston.createLogger({
        level: process.env.WINSTON_LOG_PROD_LEVEL || process.env.WINSTON_LOG_LEVEL || "info",
        format: format.combine(
          format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
          }),
          format.errors({ stack: true }),
          format.splat(),
          format.json(),
        ),
        defaultMeta: defaultMeta
      });
    } else {
      logger = winston.createLogger({
        level: process.env.WINSTON_LOG_LEVEL || "debug",
        format: format.combine(
          format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
          }),
          format.errors({ stack: true }),
          format.splat(),
          format.json(),
          format.printf(({ timestamp, message, level, stack, ...rest }) => {
            // Extract relevant information
            let logOutput = JSON.stringify(
              { timestamp, message, level, ...rest },
              null,
              2 // Pretty print JSON with indentation
            );
          
            // If there is a stack trace, format it nicely
            if (typeof stack === 'string') {
              logOutput += `\nStack Trace:\n${stack.replace(/\n/g, '\n    ')}`; // Indent the stack trace for readability
            }
          
            // Add custom separator for better readability between logs
            logOutput += "\n====================================\n";
            
            return logOutput;
          }),
          format.colorize({ all: true }), 
        ),
        defaultMeta: defaultMeta,
        transports: [
          new winston.transports.Console()
        ]
      });
    }
  }

  return logger.child({ scope: getRelativeFilePath(filename) })!;
}

export function getExpressLogger(): Handler {
  if (!expressLogger) {
    const expressLogTransporter = process.env.NODE_ENV === "production"? []: [new winston.transports.Console()];
    expressLogger = expressWinston.logger({
      transports: expressLogTransporter,
      format: winston.format.combine(
        format.label({ label: "service" }),
        format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
      ),
      baseMeta: defaultMeta,
      meta: true,
      msg: "HTTP {{req.method}} {{req.url}}",
      expressFormat: true,
      colorize: false,
      ignoreRoute: function (req, res) {
        return false;
      },
    });
    
  }
  return expressLogger;
}


function getRelativeFilePath(filePath: string): string {
  const keywords = ["node_modules", "dist", "src"];

  // Find the last occurrence of prioritized keywords
  for (const keyword of keywords) {
    const index = filePath.lastIndexOf(`/${keyword}/`);
    if (index != -1) {
      return filePath.substring(index+1);
    }
  }

  return filePath;
}
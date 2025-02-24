import winston, { format } from "winston";
import expressWinston from "express-winston";
import { config } from "dotenv";
import { Handler } from "express";

config();


let logger: winston.Logger;
let expressLogger: Handler;


export function getFileLogger(filename: string): winston.Logger {
  if(!logger) {
    logger = winston.createLogger({
      level:
        process.env.NODE_ENV === "production"
          ? process.env.WINSTON_LOG_PROD_LEVEL ||
            process.env.WINSTON_LOG_LEVEL ||
            "info"
          : process.env.WINSTON_LOG_LEVEL || "silly",
      format: format.combine(
        format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      ),
      transports: [
        //
        // - Write all logs with importance level of `info` or higher to `application.log`
        //   (i.e., fatal, error, warn, and info, but not trace)
        //
        new winston.transports.Console(),
      ],
    });
  }

  return logger.child({scope: filename})!;
}

export function getExpressLogger(): Handler {
  if (!expressLogger) {
    expressLogger = expressWinston.logger({
      transports: [
        new winston.transports.Console(),
      ],
      format: winston.format.combine(
        format.label({ label: 'service' }),
        format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      ),
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
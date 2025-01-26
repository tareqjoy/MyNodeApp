import winston, { format } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import fs from "fs";
import path from "path";
import expressWinston from "express-winston";
import { Handler } from "express";

let logger: winston.Logger;
let expressLogger: Handler;

export function initWinstonLogger(
  appName: string,
  prodLogLevel: string = "info",
  nonProdLogLevel: string = "debug"
): void {
  const prodLogDir: string = process.env.LOG_DIR || "/app/log";
  const logDir =
    process.env.NODE_ENV === "production"
      ? prodLogDir
      : `/var/log/mynodeapp/${appName}`;

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  logger = winston.createLogger({
    level:
      process.env.NODE_ENV === "production?" ? prodLogLevel : nonProdLogLevel,
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
      new DailyRotateFile({
        filename: path.join(logDir, "application-%DATE%.log"),
        datePattern: "YYYY-MM-DD-HH",
        zippedArchive: true,
        maxSize: "512m",
        maxFiles: "1d",
        utc: true,
      }),
    ],
  });

  expressLogger = expressWinston.logger({
    transports: [
      new DailyRotateFile({
        filename: path.join(logDir, "access-log-%DATE%.log"),
        datePattern: "YYYY-MM-DD-HH",
        zippedArchive: true,
        maxSize: "512m",
        maxFiles: "1d",
        utc: true,
      }),
    ],
    format: winston.format.combine(
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

  //
  // If we're not in production then **ALSO** log to the `console`
  // with the colorized simple format.
  //
  if (process.env.NODE_ENV !== "production") {
    logger.add(
      new winston.transports.Console({
        handleExceptions: true,
        format: format.combine(format.colorize(), format.simple()),
        level: "trace",
      })
    );
  }
}

export function getLogger(filename: string): winston.Logger {
  if (logger === undefined) {
    throw new Error(
      "Logger is not initialized, call initWinstonLogger() first"
    );
  }

  return logger.child({ scope: path.basename(filename) });
}

export function getExpressLogger(): Handler {
  if (expressLogger === undefined) {
    throw new Error(
      "expressLogger is not initialized, call initWinstonLogger() first"
    );
  }

  return expressLogger;
}

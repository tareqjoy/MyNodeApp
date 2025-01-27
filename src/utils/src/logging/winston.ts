import winston, { format } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import fs from "fs";
import path from "path";
import expressWinston from "express-winston";
import { config } from "dotenv";
import { Handler } from "express";

config();

interface LoggerOptions {
  createExpressLogger?: boolean;
  prodLogLevel?: string;
  nonProdLogLevel?: string;
}

const prodLogDir: string = process.env.LOG_DIR || "/app/log";
const logDir =
  process.env.NODE_ENV === "production"
    ? prodLogDir
    : path.join(process.cwd(), ".logs");

let logger: winston.Logger;
let expressLogger: Handler;

function ensureLogDirectory() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

export function getFileLogger(filename: string): winston.Logger {
  if(!logger) {
    ensureLogDirectory();
    logger = winston.createLogger({
      level:
        process.env.NODE_ENV === "production?"
          ? process.env.WINSTON_LOG_PROD_LEVEL ||
            process.env.WINSTON_LOG_LEVEL ||
            "info"
          : process.env.WINSTON_LOG_LEVEL || "debug",
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
    if (process.env.NODE_ENV !== "production") {
      logger.add(
        new winston.transports.Console({
          handleExceptions: true,
          format: format.combine(format.colorize(), format.simple()),
          level: "silly",
        })
      );
    }
  }

  return logger.child({scope: filename})!;
}

export function getExpressLogger(): Handler {
  if (!expressLogger) {
    ensureLogDirectory();
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
  }
  return expressLogger;
}
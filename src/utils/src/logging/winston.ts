import winston, { format } from "winston";
import expressWinston from "express-winston";
import { config } from "dotenv";
import { Handler } from "express";
import { OpenTelemetryTransportV3 } from "@opentelemetry/winston-transport";

config();


let logger: winston.Logger;
let expressLogger: Handler;

const defaultMeta = {
  service_name: process.env.SERVICE_NAME || 'unknown',
  service_version: process.env.SERVICE_VERSION || 'unknown'
}

export function getFileLogger(filename: string): winston.Logger {
  if(!logger) {
    const envBasedTransporter = new OpenTelemetryTransportV3();
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
      defaultMeta: defaultMeta,
      transports: [
        //
        // - Write all logs with importance level of `info` or higher to `application.log`
        //   (i.e., fatal, error, warn, and info, but not trace)
        //
  
      ],
    });
  }

  return logger.child({scope: filename})!;
}

export function getExpressLogger(): Handler {
  if (!expressLogger) {
    const envBasedTransporter = process.env.NODE_ENV === "production" ? new OpenTelemetryTransportV3() : new winston.transports.Console();
    expressLogger = expressWinston.logger({
      transports: [
        envBasedTransporter,
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
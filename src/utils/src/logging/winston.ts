// logging.ts
import winston from "winston";
import expressWinston from "express-winston";
import type { Handler, Request, Response } from "express";

let base: winston.Logger | undefined;
let appLogger: winston.Logger | undefined;
let accessLogger: Handler | undefined;

const defaultMeta = {
  service_name: process.env.SERVICE_NAME ?? "unknown",
  service_version: process.env.SERVICE_VERSION ?? "unknown",
  env: process.env.NODE_ENV ?? "development",
};

function getRelativeFilePath(filePath: string): string {
  const keywords = ["node_modules", "dist", "src"];
  for (const keyword of keywords) {
    const index = filePath.lastIndexOf(`/${keyword}/`);
    if (index !== -1) return filePath.substring(index + 1);
  }
  return filePath;
}

function getBase(): winston.Logger {
  if (base) return base;

  base = winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    ),
    defaultMeta,
    transports: [new winston.transports.Console()],
  });

  return base;
}

function getRequestId(req: Request): string | undefined {
  const v = req.headers["x-request-id"];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export function getFileLogger(scope?: string): winston.Logger {
  if (!appLogger) appLogger = getBase().child({ "log.type": "app" });
  return scope ? appLogger.child({ scope: getRelativeFilePath(scope) }) : appLogger;
}

export function getAccessLogger(): Handler {
  if (accessLogger) return accessLogger;

  const logger = getBase().child({ "log.type": "access" });

  accessLogger = expressWinston.logger({
    winstonInstance: logger,
    // Keep JSON; no printf/colorize
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),

    // Make one event per request
    msg: "HTTP {{req.method}} {{req.url}}",

    // Avoid logging req/res payloads and sensitive headers by default.
    requestWhitelist: [],
    responseWhitelist: [],
    headerBlacklist: [
      "authorization",
      "cookie",
      "set-cookie",
      "x-api-key",
      "proxy-authorization",
    ],

    // Include useful request/response fields
    dynamicMeta: (req: Request, res: Response) => ({
      request_id: getRequestId(req),
      http: {
        method: req.method,
        route: (req as any).route?.path,
        target: req.originalUrl ?? req.url,
        status_code: res.statusCode,
      },
      net: {
        peer_ip: req.ip,
      },
      user_agent: req.headers["user-agent"],
    }),

    // Optional: reduce noise
    ignoreRoute: (req: Request) => {
      const url = req.originalUrl || req.url;
      return (
        typeof url === "string" &&
        (/\/health$/.test(url) || /\/metrics$/.test(url) || /\/ready$/.test(url))
      );
    },
  });

  return accessLogger;
}

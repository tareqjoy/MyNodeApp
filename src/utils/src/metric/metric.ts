import { getApiPath } from "../api/api";
import { Router, Request, Response, NextFunction } from "express";
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from "prom-client";

export const promRegistry = new Registry();

collectDefaultMetrics({ register: promRegistry });

const httpStatCount = new Counter({
  name: "http_requests_total",
  labelNames: ["method", "route", "status"],
  help: "Total number of HTTP requests received",
});

const latencyHistogram = new Histogram({
  name: "http_requests_latency_s",
  labelNames: ["method", "route"],
  help: "Total duration of http process",
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 2.5, 5, 10],
});

let isRegistryInitialized = false;

export function commonServiceMetricsMiddleware(
  api_path_auth_root: string,
): Router {
  const router = Router();

  if (!isRegistryInitialized) {
    promRegistry.registerMetric(httpStatCount);
    promRegistry.registerMetric(latencyHistogram);
    isRegistryInitialized = true;
  }

  router.use((req: Request, res: Response, next: NextFunction) => {
    const timeEndFn = latencyHistogram.labels(req.method, "unknown").startTimer();

    res.on("finish", () => {
      const routePath = req.route?.path
        ? `${req.baseUrl}${req.route.path}`
        : req.path;

      httpStatCount
        .labels(req.method, routePath, res.statusCode.toString())
        .inc();
      timeEndFn({ route: routePath });
    });
    next();
  });

  router.get(
    getApiPath(api_path_auth_root, "metrics"),
    async (req: Request, res: Response) => {
      res.setHeader("Content-Type", promRegistry.contentType);
      res.end(await promRegistry.metrics());
    },
  );

  return router;
}

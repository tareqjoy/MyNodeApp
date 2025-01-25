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

export function commonServiceMetricsMiddleware(
  api_path_auth_root: string,
): Router {
  const router = Router();

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

  promRegistry.registerMetric(httpStatCount);
  promRegistry.registerMetric(latencyHistogram);

  router.use((req: Request, res: Response, next: NextFunction) => {
    const routePath = req.route?.path || req.path;
    const timeEndFn = latencyHistogram
      .labels(req.method, routePath)
      .startTimer();

    res.on("finish", () => {
      httpStatCount
        .labels(req.method, routePath, res.statusCode.toString())
        .inc();
      timeEndFn();
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

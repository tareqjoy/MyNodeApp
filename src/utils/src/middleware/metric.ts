import { getApiPath } from '../api/api';
import { Router, Request, Response, NextFunction } from 'express';
import { Counter, Registry, collectDefaultMetrics } from 'prom-client';

// Create a Prometheus registry
const register = new Registry();

// Collect default metrics (e.g., memory usage, CPU)
collectDefaultMetrics({ register });

// Define a Counter to track HTTP requests
const requestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status'],
});

// Register the counter with the registry
register.registerMetric(requestCounter);

// Function to create the metrics middleware and route
export function commonServiceMetricsMiddleware(api_path_auth_root: string): Router {
  const router = Router();

  // Middleware to update metrics for each request
  router.use((req: Request, res: Response, next: NextFunction) => {
    const routePath = req.route?.path || req.path;
    res.on('finish', () => {
      requestCounter.labels(req.method, routePath, res.statusCode.toString()).inc();
    });
    next();
  });

  // Metrics endpoint
  router.get(getApiPath(api_path_auth_root, 'metrics'), async (req: Request, res: Response) => {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  return router;
}

import { getApiPath } from '../api/api';
import { Router, Request, Response, NextFunction } from 'express';
import { collectDefaultMetrics, Counter, Registry} from 'prom-client';


export const promRegistry = new Registry();

collectDefaultMetrics({register: promRegistry});

export function commonServiceMetricsMiddleware(api_path_auth_root: string): Router {
  const router = Router();



  const httpStatCount = new Counter({
    name: 'http_requests_total',
    labelNames: ['method','route','status'],
    help: 'Total number of HTTP requests received'
      
  });

  promRegistry.registerMetric(httpStatCount);


  router.use((req: Request, res: Response, next: NextFunction) => {
    const routePath = req.route?.path || req.path;
    res.on('finish', () => {
      httpStatCount.labels(req.method, routePath, res.statusCode.toString()).inc();
    });
    next();
  });

  router.get(getApiPath(api_path_auth_root, 'metrics'), async (req: Request, res: Response) => {
    res.setHeader('Content-Type', promRegistry.contentType);
    res.end(await promRegistry.metrics());
  });

  return router;
}

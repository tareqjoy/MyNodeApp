import { promRegistry } from "@tareqjoy/utils";
import { Counter, Histogram, Summary } from "prom-client";


export const workerStatCount = new Counter({
    name: 'worker_requests_total',
    labelNames: ['worker_topic','status'],
    help: 'Total number of worker requests'
});

export const workerDurationHistogram = new Histogram({
    name: 'worker_requests_duration_s',
    labelNames: ['worker_topic'],
    help: 'Total duration of worker process',
    buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

export const workerOperationCount = new Counter({
    name: 'worker_operations_total',
    labelNames: ['worker_name','operation'],
    help: 'Total number of worker operations'
});

promRegistry.registerMetric(workerStatCount);
promRegistry.registerMetric(workerDurationHistogram);
promRegistry.registerMetric(workerOperationCount);
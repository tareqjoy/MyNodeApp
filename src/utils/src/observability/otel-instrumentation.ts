/*instrumentation.ts*/
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from '@opentelemetry/sdk-metrics';
import {
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
  BatchLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { trace, Span } from '@opentelemetry/api';
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { IncomingMessage } from 'http';
import {  } from '@opentelemetry/api'; 


console.log('found: ', process.env.SERVICE_NAME, process.env.SERVICE_VERSION);


const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'unknown',
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || 'unknown',
  }),
  traceExporter: new ConsoleSpanExporter(),
 // metricReader: new PeriodicExportingMetricReader({
 //   exporter: new ConsoleMetricExporter(),
 // }),
  logRecordProcessors: [new BatchLogRecordProcessor(new ConsoleLogRecordExporter())],
  spanProcessors: [new BatchSpanProcessor(new ConsoleSpanExporter())],
  instrumentations: [
    // Express instrumentation expects HTTP layer to be instrumented
    new HttpInstrumentation({
      ignoreIncomingRequestHook(req: IncomingMessage) {
        const ignorePatterns = [
          /\/metrics$/, // starts with /_next/
        ];
        if (typeof req.url === 'string' && ignorePatterns.some((pattern) => pattern.test(req.url!))) {
          return true;
        }
        return false;
      }
    }),
    new ExpressInstrumentation(),
    new WinstonInstrumentation()
  ]
});

sdk.start();


export function getTracer(scopeName: string) {
  return trace.getTracer(scopeName);
}

export function getSpan(scopeName: string, spanName: string) {
  trace.getTracer(scopeName).startActiveSpan(spanName, (span: Span) => {
 
    span.end();
  });
}



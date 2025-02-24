/*instrumentation.ts*/
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor, BasicTracerProvider } from '@opentelemetry/sdk-trace-node';
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
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { IncomingMessage } from 'http';

const otlp_host_port = process.env.OTLP_HOST_PORT || "http://localhost:4317";
console.log('found: ', process.env.SERVICE_NAME, process.env.SERVICE_VERSION);

const collectorOptions = {
  // url is optional and can be omitted - default is http://localhost:4317
  // Unix domain sockets are also supported: 'unix:///path/to/socket.sock'
  url: otlp_host_port,
};

const otlpExporter = new OTLPTraceExporter(collectorOptions);
const consoleExporter = new ConsoleSpanExporter();

const envBasedExporter = process.env.NODE_ENV === "production" ? otlpExporter : consoleExporter;

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'unknown',
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || 'unknown',
  }),
  traceExporter: envBasedExporter,
 // metricReader: new PeriodicExportingMetricReader({
 //   exporter: new ConsoleMetricExporter(),
 // }),
  logRecordProcessors: [new BatchLogRecordProcessor(new ConsoleLogRecordExporter())],
  spanProcessors: [new BatchSpanProcessor(envBasedExporter)],
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



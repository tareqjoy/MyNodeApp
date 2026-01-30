/*instrumentation.ts*/
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { trace, Span } from "@opentelemetry/api";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { IncomingMessage } from "http";

const otlp_http_host_port =
  process.env.OTLP_HTTP_HOST_PORT || "http://192.168.49.2:4318";
const otlp_grpc_host_port =
  process.env.OTLP_GRPC_HOST_PORT || "http://192.168.49.2:4317";
console.log("found: ", process.env.SERVICE_NAME, process.env.SERVICE_VERSION);

const traceCollectorOptions = {
  url: `${otlp_grpc_host_port}/v1/traces`,
};
const logCollectorOptions = {
  url: `${otlp_http_host_port}/v1/logs`,
};

const envBasedTraceExporter = new OTLPTraceExporter(traceCollectorOptions);
const envBasedLogExporter = new OTLPLogExporter(logCollectorOptions);

let sdk: NodeSDK | undefined;

console.log(`OTEL Telemetry initializing for service: ${process.env.SERVICE_NAME}:${process.env.SERVICE_VERSION}. 
Trace Exporter URL: ${traceCollectorOptions.url}, Log Exporter URL: ${logCollectorOptions.url}`);
sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || "unknown",
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || "unknown",
  }),
  spanProcessors: [new BatchSpanProcessor(envBasedTraceExporter)],
  metricReaders: [],
  // metricReader: new PeriodicExportingMetricReader({
  //   exporter: new ConsoleMetricExporter(),
  // }),
  logRecordProcessors: [new BatchLogRecordProcessor(envBasedLogExporter)],
  instrumentations: [
    // Express instrumentation expects HTTP layer to be instrumented
    new HttpInstrumentation({
      ignoreIncomingRequestHook(req: IncomingMessage) {
        const ignorePatterns = [
          /\/metrics$/, // starts with /_next/
        ];
        if (
          typeof req.url === "string" &&
          ignorePatterns.some((pattern) => pattern.test(req.url!))
        ) {
          return true;
        }
        return false;
      },
    }),
    new ExpressInstrumentation(),
    new WinstonInstrumentation(),
  ],
});

sdk.start();
console.log(`OTEL Telemetry initialized...`);

export async function shutdownTelemetry() {
  if (!sdk) return;
  await sdk.shutdown();
  sdk = undefined;
}

export function getTracer(scopeName: string) {
  return trace.getTracer(scopeName);
}

export function getSpan(scopeName: string, spanName: string) {
  trace.getTracer(scopeName).startActiveSpan(spanName, (span: Span) => {
    span.end();
  });
}

import { promRegistry } from "@tareqjoy/utils";
import { Counter, Histogram, Summary } from "prom-client";

export const postLoadCount = new Counter({
  name: "post_load_total",
  help: "Total number of post loaded by source",
  labelNames: ["source"],
});

promRegistry.registerMetric(postLoadCount);

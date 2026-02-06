import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel("frontend-service");
}

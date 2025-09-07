export function fillString(template: string, values: Record<string, string | number>) {
    return template.replace(/\{(\w+)\}/g, (_, key) => values[key]?.toString() || '');
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 300
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, delayMs * attempt));
      }
    }
  }
  throw lastError;
}
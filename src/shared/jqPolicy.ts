export const JQ_AUTO_RUN_MAX_BYTES = 2_000_000;
export const JQ_AUTOCOMPLETE_MAX_BYTES = 4_000_000;
/**
 * Measured on Chromium with jq-shaped output (see README "Syntax highlighting"):
 * Prism tokenizing is cheap, DOM insertion is not. At 400 KB highlighting costs
 * ~120 ms more than plain text on an M4 Max and ~460 ms on a 4x-throttled CPU,
 * which is the last size where a re-render still feels like a step rather than a stall.
 */
export const JQ_HIGHLIGHT_MAX_BYTES = 400_000;
export const JQ_STDOUT_MAX_BYTES = 512 * 1024;
export const JQ_STDERR_MAX_BYTES = 64 * 1024;
export const JQ_INPUT_MAX_BYTES = 50_000_000;
export const JQ_FILTER_NULLS_MAX_BYTES = 1_000_000;
export const JQ_MIN_TIMEOUT_MS = 5_000;
export const JQ_MAX_TIMEOUT_MS = 30_000;
export const JQ_NATIVE_AVAILABILITY_CACHE_TTL_MS = 30_000;
export const JQ_BROWSER_HOST = "browser";
export const JQ_NATIVE_HOST = "caido-backend-host";

export const JQ_ALLOWED_FLAGS = ["-c", "-r"] as const;

export type JqFlag = (typeof JQ_ALLOWED_FLAGS)[number];

export function isAllowedJqFlag(flag: string): flag is JqFlag {
  return JQ_ALLOWED_FLAGS.includes(flag as JqFlag);
}

export function clampJqTimeout(ms: number): number {
  return Math.min(JQ_MAX_TIMEOUT_MS, Math.max(JQ_MIN_TIMEOUT_MS, ms));
}

export function computeJqTimeout(byteLength: number, query: string): number {
  const megabytes = byteLength / (1024 * 1024);
  let timeoutMs = 15_000 + Math.ceil(megabytes) * 8_000;
  if (query.includes("walk(")) {
    timeoutMs += 20_000 + Math.ceil(megabytes) * 25_000;
  }
  return clampJqTimeout(timeoutMs);
}

export function shouldAutoRun(byteLength: number): boolean {
  return byteLength < JQ_AUTO_RUN_MAX_BYTES;
}

export function shouldEnableAutocomplete(byteLength: number): boolean {
  return byteLength < JQ_AUTOCOMPLETE_MAX_BYTES;
}

export function shouldHighlightOutput(byteLength: number): boolean {
  return byteLength < JQ_HIGHLIGHT_MAX_BYTES;
}

/**
 * Readout severity for the numbers shown under the output.
 * Thresholds mirror the points where jq behaviour actually degrades:
 * auto-run stops, highlighting stops, stdout gets truncated, latency becomes noticeable.
 */
export type JqMetricLevel = "normal" | "high" | "critical";

export const JQ_INPUT_HIGH_BYTES = JQ_AUTO_RUN_MAX_BYTES;
export const JQ_INPUT_CRITICAL_BYTES = 10_000_000;
export const JQ_OUTPUT_HIGH_BYTES = 150_000;
export const JQ_OUTPUT_CRITICAL_BYTES = JQ_STDOUT_MAX_BYTES;
export const JQ_DURATION_HIGH_MS = 250;
export const JQ_DURATION_CRITICAL_MS = 1_000;

function metricLevel(value: number, high: number, critical: number): JqMetricLevel {
  if (value >= critical) return "critical";
  if (value >= high) return "high";
  return "normal";
}

export function inputByteLevel(byteLength: number): JqMetricLevel {
  return metricLevel(byteLength, JQ_INPUT_HIGH_BYTES, JQ_INPUT_CRITICAL_BYTES);
}

export function outputByteLevel(byteLength: number): JqMetricLevel {
  return metricLevel(byteLength, JQ_OUTPUT_HIGH_BYTES, JQ_OUTPUT_CRITICAL_BYTES);
}

export function durationLevel(durationMs: number): JqMetricLevel {
  return metricLevel(durationMs, JQ_DURATION_HIGH_MS, JQ_DURATION_CRITICAL_MS);
}

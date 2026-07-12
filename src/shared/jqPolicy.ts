export const JQ_AUTO_RUN_MAX_BYTES = 2_000_000;
export const JQ_AUTOCOMPLETE_MAX_BYTES = 4_000_000;
export const JQ_NATIVE_MIN_BYTES = 10_000_000;
export const JQ_HIGHLIGHT_MAX_BYTES = 150_000;
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

export function shouldPreferNative(byteLength: number): boolean {
  return byteLength >= JQ_NATIVE_MIN_BYTES;
}

export function shouldHighlightOutput(byteLength: number): boolean {
  return byteLength < JQ_HIGHLIGHT_MAX_BYTES;
}

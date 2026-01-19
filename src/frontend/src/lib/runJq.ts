import * as jq from "jq-wasm";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

export type JqResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut?: boolean;
};

export async function runJq(json: any, query: string, flags: string[] = []): Promise<JqResult> {
  try {
    const result = await withTimeout(jq.raw(json, query, flags), 4000, "jq-wasm init/run");
    const exitCode = typeof result.exitCode === "number" ? result.exitCode : 0;
    const stdout = typeof result.stdout === "string" ? result.stdout : String(result.stdout ?? "");
    const stderr = typeof result.stderr === "string" ? result.stderr : String(result.stderr ?? "");

    return {
      stdout,
      stderr,
      exitCode,
    };
  } catch (err: any) {
    const message = err?.message ? String(err.message) : "Unknown error";
    return {
      stdout: "",
      stderr: message,
      exitCode: 1,
      timedOut: message.includes("timed out"),
    };
  }
}

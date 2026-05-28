import { getCaido } from "../caido";

export type JqResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut?: boolean;
};

const WORKER_ASSET = "jq.worker.js";

let worker: Worker | null = null;
let workerInit: Promise<Worker> | null = null;
let currentTask: {
  resolve: (res: JqResult) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  id: number;
} | null = null;
let taskIdCounter = 0;

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/** Exported for tests. */
export function computeJqTimeout(byteLength: number, query: string): number {
  const BASE_MS = 15_000;
  const PER_MB_MS = 8_000;
  const MAX_MS = 300_000;
  const mb = byteLength / (1024 * 1024);
  let ms = BASE_MS + Math.ceil(mb) * PER_MB_MS;
  if (query.includes("walk(")) {
    ms += 20_000 + Math.ceil(mb) * 25_000;
  }
  return Math.min(MAX_MS, ms);
}

function attachWorkerHandlers(w: Worker): void {
  w.onmessage = (e: MessageEvent) => {
    if (!currentTask) return;
    if (e.data.id !== currentTask.id) return;

    clearTimeout(currentTask.timer);
    if (e.data.success) {
      const stdout = decoder.decode(new Uint8Array(e.data.stdoutBuffer));
      const stderr = decoder.decode(new Uint8Array(e.data.stderrBuffer));
      currentTask.resolve({ stdout, stderr, exitCode: e.data.exitCode });
    } else {
      currentTask.reject(new Error(e.data.error));
    }
    currentTask = null;
  };
  w.onerror = (e: ErrorEvent) => {
    if (!currentTask) return;
    clearTimeout(currentTask.timer);
    currentTask.reject(new Error("Worker error: " + e.message));
    currentTask = null;
    worker?.terminate();
    worker = null;
  };
}

async function createWorker(): Promise<Worker> {
  const caido = getCaido();
  if (caido) {
    const asset = await caido.assets.get(WORKER_ASSET);
    const code = await asset.asString();
    const blob = new Blob([code], { type: "application/javascript" });
    const w = new Worker(URL.createObjectURL(blob));
    attachWorkerHandlers(w);
    return w;
  }

  // Local Vite dev (caido-dev watch): module worker from source.
  const w = new Worker(new URL("./jq.worker.ts", import.meta.url), { type: "module" });
  attachWorkerHandlers(w);
  return w;
}

async function ensureWorker(): Promise<Worker> {
  if (worker) return worker;
  if (!workerInit) {
    workerInit = createWorker()
      .then((w) => {
        worker = w;
        return w;
      })
      .catch((err) => {
        workerInit = null;
        throw err;
      });
  }
  return workerInit;
}

/** Pre-warm WASM after Caido init (id 0 is ignored when no currentTask). */
export function warmupJqWorker(): void {
  if (typeof Worker === "undefined") return;
  void ensureWorker()
    .then((w) => {
      const warmupBytes = encoder.encode("null");
      w.postMessage(
        { id: 0, jsonBuffer: warmupBytes.buffer, query: ".", flags: [] },
        [warmupBytes.buffer],
      );
    })
    .catch(() => { });
}

export async function runJq(json: string, query: string, flags: string[] = []): Promise<JqResult> {
  let w: Worker;
  try {
    w = await ensureWorker();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to start jq worker (rebuild and reinstall the plugin)";
    return { stdout: "", stderr: message, exitCode: 1 };
  }

  return new Promise((resolve) => {
    if (currentTask) {
      clearTimeout(currentTask.timer);
      currentTask.resolve({ stdout: "", stderr: "Cancelled", exitCode: 1 });
      currentTask = null;
    }

    taskIdCounter++;
    const id = taskIdCounter;

    const jsonBytes = encoder.encode(json);
    const ms = computeJqTimeout(jsonBytes.byteLength, query);

    currentTask = {
      id,
      resolve: (res: JqResult) => resolve(res),
      reject: (err: Error) => {
        const message = err.message ?? "Unknown error";
        resolve({ stdout: "", stderr: message, exitCode: 1, timedOut: message.includes("timed out") });
      },
      timer: setTimeout(() => {
        if (currentTask?.id === id) {
          currentTask.reject(
            new Error(
              `jq-wasm timed out after ${Math.round(ms / 1000)}s (${Math.round(jsonBytes.byteLength / 1024)} KB input). Try a simpler query or disable No Nulls.`,
            ),
          );
          currentTask = null;
        }
      }, ms),
    };

    w.postMessage({ id, jsonBuffer: jsonBytes.buffer, query, flags }, [jsonBytes.buffer]);
  });
}

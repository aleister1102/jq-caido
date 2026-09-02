import type {
  JqEngine,
  JqEnginePreference,
  JqExecutionResult,
  NativeJqAvailability,
  WorkerJqResponse,
} from "../../../shared/jqContract";
import {
  JQ_BROWSER_HOST,
  JQ_NATIVE_AVAILABILITY_CACHE_TTL_MS,
  JQ_NATIVE_HOST,
  computeJqTimeout,
  type JqFlag,
} from "../../../shared/jqPolicy";
import { byteLengthOfText } from "../../../shared/jqTransfer";
import { getCaido } from "../caido";

const WORKER_ASSET = "jq.worker.js";
const NATIVE_CANCEL_WAIT_MS = 250;
const NATIVE_RPC_WATCHDOG_GRACE_MS = 500;

let worker: Worker | null = null;
let workerInit: Promise<Worker> | null = null;
let currentTask:
  | {
    id: number;
    engine: JqEngine;
    inputBytes: number;
    backendTaskId?: string;
    timer?: ReturnType<typeof setTimeout>;
    resolve: (result: JqExecutionResult) => void;
  }
  | null = null;
let taskIdCounter = 0;
let nativeAvailabilityCache: NativeJqAvailability | null = null;
let nativeAvailabilityCacheAt = 0;
let nativeAvailabilityPromise: Promise<NativeJqAvailability> | null = null;
let pendingNativeCancellation: Promise<void> | null = null;

const decoder = new TextDecoder();
const encoder = new TextEncoder();

export { computeJqTimeout };

export type RunJqParams = {
  bodyText: string;
  bodyBytes: Uint8Array | null;
  inputBytes: number;
  query: string;
  flags: JqFlag[];
  enginePreference: JqEnginePreference;
};

function createResult(
  engine: JqEngine,
  inputBytes: number,
  message: string,
  options?: {
    cancelled?: boolean;
    timedOut?: boolean;
    durationMs?: number;
    exitCode?: number;
  },
): JqExecutionResult {
  return {
    engine,
    host: engine === "native" ? JQ_NATIVE_HOST : JQ_BROWSER_HOST,
    inputBytes,
    stdout: "",
    stderr: message,
    stdoutBytes: 0,
    stderrBytes: byteLengthOfText(message),
    durationMs: options?.durationMs ?? 0,
    exitCode: options?.exitCode ?? 1,
    stdoutTruncated: false,
    stderrTruncated: false,
    cancelled: options?.cancelled,
    timedOut: options?.timedOut,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resetWorker(): void {
  worker?.terminate();
  worker = null;
  workerInit = null;
}

function requestNativeCancellation(taskId: string, caido: NonNullable<ReturnType<typeof getCaido>>): Promise<void> {
  const cancellation = Promise.race([
    caido.backend.cancelNativeJq(taskId).then(() => undefined).catch(() => undefined),
    wait(NATIVE_CANCEL_WAIT_MS),
  ]);
  const pending = cancellation.finally(() => {
    if (pendingNativeCancellation === pending) {
      pendingNativeCancellation = null;
    }
  });
  pendingNativeCancellation = pending;
  return pendingNativeCancellation;
}

function finalizeTask(id: number, result: JqExecutionResult): void {
  if (!currentTask || currentTask.id !== id) {
    return;
  }
  if (currentTask.timer) {
    clearTimeout(currentTask.timer);
  }
  currentTask.resolve(result);
  currentTask = null;
}

export async function cancelActiveJqRun(): Promise<void> {
  if (!currentTask) {
    return pendingNativeCancellation ?? Promise.resolve();
  }
  const task = currentTask;
  currentTask = null;
  if (task.timer) {
    clearTimeout(task.timer);
  }
  task.resolve(
    createResult(task.engine, task.inputBytes, "Cancelled", {
      cancelled: true,
    }),
  );
  if (task.engine === "jq-wasm") {
    resetWorker();
    return;
  }

  const caido = getCaido();
  if (task.backendTaskId && caido) {
    return requestNativeCancellation(task.backendTaskId, caido);
  }
}

function attachWorkerHandlers(w: Worker): void {
  w.onmessage = (event: MessageEvent<WorkerJqResponse>) => {
    if (event.data.id === 0) {
      if (!event.data.success) resetWorker();
      return;
    }

    if (!currentTask) return;
    if (event.data.id !== currentTask.id) return;

    if (event.data.success) {
      const stdout = decoder.decode(new Uint8Array(event.data.stdoutBuffer));
      const stderr = decoder.decode(new Uint8Array(event.data.stderrBuffer));
      finalizeTask(event.data.id, {
        ...event.data.result,
        stdout,
        stderr,
      });
      return;
    }

    finalizeTask(
      event.data.id,
      createResult("jq-wasm", currentTask.inputBytes, event.data.error),
    );
    resetWorker();
  };
  w.onerror = (e: ErrorEvent) => {
    if (!currentTask) {
      resetWorker();
      return;
    }
    finalizeTask(
      currentTask.id,
      createResult("jq-wasm", currentTask.inputBytes, `Worker error: ${e.message}`),
    );
    resetWorker();
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

/** Pre-warm WASM after Caido init (id 0 is handled separately from foreground tasks). */
export function warmupJqWorker(): void {
  if (typeof Worker === "undefined") return;
  void ensureWorker()
    .then((w) => {
      const warmupBytes = encoder.encode("null");
      const transferable = warmupBytes.slice();
      w.postMessage(
        { id: 0, inputBuffer: transferable.buffer, inputBytes: transferable.byteLength, query: ".", flags: [] },
        [transferable.buffer],
      );
    })
    .catch(() => { });
}

function nativeUnavailable(reason: string): NativeJqAvailability {
  return {
    available: false,
    version: null,
    reason,
  };
}

export async function getNativeJqAvailability(forceRefresh = false): Promise<NativeJqAvailability> {
  if (!forceRefresh && nativeAvailabilityCache) {
    if ((Date.now() - nativeAvailabilityCacheAt) < JQ_NATIVE_AVAILABILITY_CACHE_TTL_MS) {
      return nativeAvailabilityCache;
    }
  }
  if (!forceRefresh && nativeAvailabilityPromise) {
    return nativeAvailabilityPromise;
  }

  const shouldForceBackendRefresh =
    forceRefresh
    || (nativeAvailabilityCache !== null
      && (Date.now() - nativeAvailabilityCacheAt) >= JQ_NATIVE_AVAILABILITY_CACHE_TTL_MS);

  const caido = getCaido();
  if (!caido || typeof caido.backend.nativeJqAvailability !== "function") {
    nativeAvailabilityCache = nativeUnavailable("The backend jq service is unavailable.");
    nativeAvailabilityCacheAt = Date.now();
    return nativeAvailabilityCache;
  }

  nativeAvailabilityPromise = caido.backend.nativeJqAvailability(shouldForceBackendRefresh)
    .then((availability) => {
      nativeAvailabilityCache = availability;
      nativeAvailabilityCacheAt = Date.now();
      nativeAvailabilityPromise = null;
      return availability;
    })
    .catch((error) => {
      nativeAvailabilityCache = nativeUnavailable(
        error instanceof Error ? error.message : "Failed to probe native jq.",
      );
      nativeAvailabilityCacheAt = Date.now();
      nativeAvailabilityPromise = null;
      return nativeAvailabilityCache;
    });

  return nativeAvailabilityPromise;
}

export function resolveJqEngine(
  preference: JqEnginePreference,
  availability: NativeJqAvailability | null,
): { engine: JqEngine; unavailableReason: string | null } {
  if (preference === "native" && !availability?.available) {
    return {
      engine: "native",
      unavailableReason: availability?.reason ?? "Native jq is unavailable on the Caido backend host.",
    };
  }

  return { engine: preference, unavailableReason: null };
}

async function runWasmJq(
  bodyBytes: Uint8Array,
  query: string,
  flags: JqFlag[],
): Promise<JqExecutionResult> {
  let w: Worker;
  try {
    w = await ensureWorker();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start jq worker (rebuild and reinstall the plugin)";
    return createResult("jq-wasm", bodyBytes.byteLength, message);
  }

  return new Promise((resolve) => {
    taskIdCounter++;
    const id = taskIdCounter;
    const timeoutMs = computeJqTimeout(bodyBytes.byteLength, query);
    const transferable = bodyBytes.slice();

    currentTask = {
      id,
      engine: "jq-wasm",
      inputBytes: bodyBytes.byteLength,
      resolve,
      timer: setTimeout(() => {
        if (currentTask?.id === id) {
          finalizeTask(
            id,
            createResult(
              "jq-wasm",
              bodyBytes.byteLength,
              `jq-wasm timed out after ${Math.round(timeoutMs / 1000)}s (${Math.round(bodyBytes.byteLength / 1024)} KB input). Try a simpler query or disable No Nulls.`,
              { timedOut: true },
            ),
          );
          resetWorker();
        }
      }, timeoutMs),
    };

    w.postMessage(
      {
        id,
        inputBuffer: transferable.buffer,
        inputBytes: bodyBytes.byteLength,
        query,
        flags,
      },
      [transferable.buffer],
    );
  });
}

async function runNativeJq(
  bodyText: string,
  inputBytes: number,
  query: string,
  flags: JqFlag[],
): Promise<JqExecutionResult> {
  const caido = getCaido();
  if (!caido || typeof caido.backend.runNativeJq !== "function") {
    return createResult("native", inputBytes, "Native jq backend is unavailable.");
  }

  return new Promise((resolve) => {
    taskIdCounter++;
    const id = taskIdCounter;
    const backendTaskId = `jq-native-${id}`;
    const timeoutMs = computeJqTimeout(inputBytes, query);
    currentTask = {
      id,
      engine: "native",
      inputBytes,
      backendTaskId,
      resolve,
      timer: setTimeout(() => {
        if (currentTask?.id !== id) {
          return;
        }
        finalizeTask(
          id,
          createResult(
            "native",
            inputBytes,
            `Native jq timed out after ${Math.round((timeoutMs + NATIVE_RPC_WATCHDOG_GRACE_MS) / 1000)}s (${Math.round(inputBytes / 1024)} KB input).`,
            { timedOut: true },
          ),
        );
        void requestNativeCancellation(backendTaskId, caido);
      }, timeoutMs + NATIVE_RPC_WATCHDOG_GRACE_MS),
    };

    void caido.backend.runNativeJq({
      taskId: backendTaskId,
      input: bodyText,
      inputBytes,
      query,
      flags,
      timeoutMs,
    }).then((result) => {
      finalizeTask(id, result);
    }).catch((error) => {
      finalizeTask(
        id,
        createResult(
          "native",
          inputBytes,
          error instanceof Error ? error.message : "Native jq execution failed.",
        ),
      );
    });
  });
}

export async function runJq({
  bodyText,
  bodyBytes,
  inputBytes,
  query,
  flags,
  enginePreference,
}: RunJqParams): Promise<JqExecutionResult> {
  await cancelActiveJqRun();

  const availability = enginePreference === "native" ? await getNativeJqAvailability(true) : null;
  const resolvedEngine = resolveJqEngine(enginePreference, availability);

  if (resolvedEngine.unavailableReason) {
    return createResult(
      "native",
      inputBytes,
      `Native jq is unavailable on the Caido backend host. ${resolvedEngine.unavailableReason}`,
    );
  }

  if (resolvedEngine.engine === "native") {
    return runNativeJq(bodyText, inputBytes, query, flags);
  }

  return runWasmJq(bodyBytes ?? encoder.encode(bodyText), query, flags);
}

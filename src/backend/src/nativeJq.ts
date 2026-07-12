import { spawn, type ChildProcess } from "child_process";
import type {
  JqExecutionResult,
  JqExecutionSummary,
  NativeJqAvailability,
  NativeJqRequest,
} from "../../shared/jqContract";
import {
  JQ_ALLOWED_FLAGS,
  JQ_INPUT_MAX_BYTES,
  JQ_NATIVE_AVAILABILITY_CACHE_TTL_MS,
  JQ_NATIVE_HOST,
  JQ_STDERR_MAX_BYTES,
  JQ_STDOUT_MAX_BYTES,
  clampJqTimeout,
  isAllowedJqFlag,
} from "../../shared/jqPolicy";
import { concatByteChunks } from "../../shared/jqTransfer";

type SpawnFn = typeof spawn;
const PROBE_OUTPUT_MAX_BYTES = 4_096;
const PROBE_TIMEOUT_MS = 1_500;

export type NativeTaskState = {
  child: ChildProcess;
  cancelled: boolean;
  capped: boolean;
  timedOut: boolean;
  cleanup: () => void;
};

let availabilityCache: NativeJqAvailability | null = null;
let availabilityCacheAt = 0;
let availabilityProbePromise: Promise<NativeJqAvailability> | null = null;
const fatalDecoder = new TextDecoder("utf-8", { fatal: true });

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function appendChunk(
  store: Uint8Array[],
  currentBytes: number,
  chunk: Uint8Array,
  maxBytes: number,
): { bytes: number; truncated: boolean } {
  const remainingBytes = maxBytes - currentBytes;
  if (remainingBytes <= 0) {
    return { bytes: currentBytes, truncated: true };
  }

  if (chunk.byteLength <= remainingBytes) {
    store.push(chunk.slice());
    return { bytes: currentBytes + chunk.byteLength, truncated: false };
  }

  store.push(chunk.slice(0, remainingBytes));
  return { bytes: currentBytes + remainingBytes, truncated: true };
}

function decodeChunkText(chunks: Uint8Array[], totalBytes: number): { text: string; bytes: number } {
  if (totalBytes === 0) {
    return { text: "", bytes: 0 };
  }

  const merged = concatByteChunks(chunks, totalBytes);
  for (let trimBytes = 0; trimBytes <= 3 && trimBytes <= merged.byteLength; trimBytes += 1) {
    const candidateBytes = merged.byteLength - trimBytes;
    try {
      return {
        text: fatalDecoder.decode(merged.subarray(0, candidateBytes)),
        bytes: candidateBytes,
      };
    } catch {
      continue;
    }
  }

  return { text: "", bytes: 0 };
}

export function validateNativeJqRequest(request: NativeJqRequest): NativeJqRequest {
  if (typeof request !== "object" || request === null) {
    throw new Error("Invalid native jq request.");
  }
  if (typeof request.taskId !== "string" || request.taskId.length === 0) {
    throw new Error("Native jq task id is required.");
  }
  if (typeof request.input !== "string") {
    throw new Error("Native jq input must be a string.");
  }
  if (!Number.isFinite(request.inputBytes) || request.inputBytes < 0) {
    throw new Error("Native jq input size is invalid.");
  }
  const authoritativeInputBytes = Buffer.byteLength(request.input, "utf8");
  if (authoritativeInputBytes > JQ_INPUT_MAX_BYTES) {
    throw new Error(`Payload too large (> ${Math.round(JQ_INPUT_MAX_BYTES / 1_000_000)} MB).`);
  }
  if (typeof request.query !== "string") {
    throw new Error("Native jq query must be a string.");
  }
  if (!isStringArray(request.flags)) {
    throw new Error("Native jq flags must be a string array.");
  }
  if (!request.flags.every((flag) => isAllowedJqFlag(flag))) {
    throw new Error(`Unsupported jq flags. Allowed flags: ${JQ_ALLOWED_FLAGS.join(", ")}.`);
  }

  return {
    ...request,
    inputBytes: authoritativeInputBytes,
    timeoutMs: clampJqTimeout(request.timeoutMs),
  };
}

export function resetNativeJqAvailabilityCache(): void {
  availabilityCache = null;
  availabilityCacheAt = 0;
  availabilityProbePromise = null;
}

export async function probeNativeJqAvailability(
  forceRefresh = false,
  spawnFn: SpawnFn = spawn,
): Promise<NativeJqAvailability> {
  if (!forceRefresh && availabilityCache !== null && (Date.now() - availabilityCacheAt) < JQ_NATIVE_AVAILABILITY_CACHE_TTL_MS) {
    return availabilityCache;
  }
  if (!forceRefresh && availabilityProbePromise) {
    return availabilityProbePromise;
  }

  availabilityProbePromise = new Promise<NativeJqAvailability>((resolve) => {
    const child = spawnFn("jq", ["--version"], { stdio: ["ignore", "pipe", "pipe"] });
    const stdoutChunks: Uint8Array[] = [];
    const stderrChunks: Uint8Array[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const settle = (value: NativeJqAvailability) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      resolve(value);
    };

    child.stdout?.on("data", (chunk: Uint8Array) => {
      const append = appendChunk(stdoutChunks, stdoutBytes, new Uint8Array(chunk), PROBE_OUTPUT_MAX_BYTES);
      stdoutBytes = append.bytes;
    });

    child.stderr?.on("data", (chunk: Uint8Array) => {
      const append = appendChunk(stderrChunks, stderrBytes, new Uint8Array(chunk), PROBE_OUTPUT_MAX_BYTES);
      stderrBytes = append.bytes;
    });

    child.on("error", (error) => {
      settle({
        available: false,
        version: null,
        reason: error.message || "Failed to start jq.",
      });
    });

    child.on("close", (code) => {
      if (timedOut) {
        return;
      }
      const stdout = decodeChunkText(stdoutChunks, stdoutBytes).text.trim();
      const stderr = decodeChunkText(stderrChunks, stderrBytes).text.trim();

      if (code === 0 && stdout.length > 0) {
        settle({
          available: true,
          version: stdout,
          reason: null,
        });
        return;
      }

      settle({
        available: false,
        version: null,
        reason: stderr || stdout || "jq was not found on PATH.",
      });
    });

    timer = setTimeout(() => {
      timedOut = true;
      settle({
        available: false,
        version: null,
        reason: `jq --version timed out after ${PROBE_TIMEOUT_MS}ms.`,
      });
      child.kill("SIGTERM");
    }, PROBE_TIMEOUT_MS);
  });

  availabilityCache = await availabilityProbePromise;
  availabilityCacheAt = Date.now();
  availabilityProbePromise = null;
  return availabilityCache;
}

export function cancelNativeJqTask(
  taskId: string,
  activeTasks: Map<string, NativeTaskState>,
): boolean {
  const task = activeTasks.get(taskId);
  if (!task) {
    return false;
  }

  task.cancelled = true;
  task.child.kill("SIGTERM");
  return true;
}

export async function runNativeJqTask(
  request: NativeJqRequest,
  activeTasks: Map<string, NativeTaskState>,
  spawnFn: SpawnFn = spawn,
): Promise<JqExecutionResult> {
  const validated = validateNativeJqRequest(request);
  if (activeTasks.has(validated.taskId)) {
    throw new Error(`Native jq task ${validated.taskId} is already active.`);
  }

  return new Promise<JqExecutionResult>((resolve, reject) => {
    const start = performance.now();
    const child = spawnFn("jq", [...validated.flags, validated.query], {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdoutChunks: Uint8Array[] = [];
    const stderrChunks: Uint8Array[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let settled = false;
    let state: NativeTaskState;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
      }
      if (activeTasks.get(validated.taskId) === state) {
        activeTasks.delete(validated.taskId);
      }
    };

    state = {
      child,
      cancelled: false,
      capped: false,
      timedOut: false,
      cleanup,
    };

    activeTasks.set(validated.taskId, state);

    const finish = (summary: Omit<JqExecutionSummary, "stdoutBytes" | "stderrBytes">) => {
      if (settled) {
        return;
      }
      settled = true;
      const stdout = decodeChunkText(stdoutChunks, stdoutBytes);
      const stderr = decodeChunkText(stderrChunks, stderrBytes);
      resolve({
        ...summary,
        stdout: stdout.text,
        stderr: stderr.text,
        stdoutBytes: stdout.bytes,
        stderrBytes: stderr.bytes,
      });
    };

    timer = setTimeout(() => {
      state.timedOut = true;
      child.kill("SIGTERM");
    }, validated.timeoutMs);

    child.stdout?.on("data", (chunk: Uint8Array) => {
      const append = appendChunk(stdoutChunks, stdoutBytes, new Uint8Array(chunk), JQ_STDOUT_MAX_BYTES);
      stdoutBytes = append.bytes;
      if (append.truncated && !stdoutTruncated) {
        stdoutTruncated = true;
        state.capped = true;
        child.kill("SIGTERM");
      }
    });

    child.stderr?.on("data", (chunk: Uint8Array) => {
      const append = appendChunk(stderrChunks, stderrBytes, new Uint8Array(chunk), JQ_STDERR_MAX_BYTES);
      stderrBytes = append.bytes;
      if (append.truncated && !stderrTruncated) {
        stderrTruncated = true;
        state.capped = true;
        child.kill("SIGTERM");
      }
    });

    child.on("error", (error) => {
      cleanup();
      reject(error);
    });

    child.on("close", (code) => {
      cleanup();

      const durationMs = performance.now() - start;
      if (state.cancelled) {
        finish({
          engine: "native",
          host: JQ_NATIVE_HOST,
          inputBytes: validated.inputBytes,
          durationMs,
          exitCode: 1,
          stdoutTruncated,
          stderrTruncated,
          cancelled: true,
        });
        return;
      }

      if (state.timedOut) {
        finish({
          engine: "native",
          host: JQ_NATIVE_HOST,
          inputBytes: validated.inputBytes,
          durationMs,
          exitCode: 1,
          stdoutTruncated,
          stderrTruncated,
          timedOut: true,
        });
        return;
      }

      if (state.capped) {
        finish({
          engine: "native",
          host: JQ_NATIVE_HOST,
          inputBytes: validated.inputBytes,
          durationMs,
          exitCode: 0,
          stdoutTruncated,
          stderrTruncated,
        });
        return;
      }

      finish({
        engine: "native",
        host: JQ_NATIVE_HOST,
        inputBytes: validated.inputBytes,
        durationMs,
        exitCode: code ?? 1,
        stdoutTruncated,
        stderrTruncated,
      });
    });

    child.stdin?.end(validated.input);
  });
}

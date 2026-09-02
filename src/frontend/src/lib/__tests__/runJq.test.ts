import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NativeJqAvailability } from "../../../../shared/jqContract";
import { JQ_NATIVE_AVAILABILITY_CACHE_TTL_MS } from "../../../../shared/jqPolicy";
import { createDeferred } from "../../test/createDeferred";

type WorkerPlan =
  | { kind: "hang" }
  | { kind: "error"; message: string }
  | { kind: "failure"; message: string }
  | { kind: "success"; stdout: string; stderr?: string; exitCode?: number };

class MockWorker {
  static instances: MockWorker[] = [];
  static plans: WorkerPlan[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;

  constructor(_url: string | URL, _options?: WorkerOptions) {
    MockWorker.instances.push(this);
  }

  postMessage(message: { id: number; inputBytes: number }): void {
    const plan = MockWorker.plans.shift() ?? { kind: "success", stdout: "" };
    if (plan.kind === "hang") {
      return;
    }

    if (plan.kind === "error") {
      this.onerror?.({ message: plan.message } as ErrorEvent);
      return;
    }

    queueMicrotask(() => {
      if (this.terminated) {
        return;
      }
      if (plan.kind === "failure") {
        this.onmessage?.({
          data: {
            id: message.id,
            success: false,
            error: plan.message,
          },
        } as MessageEvent);
        return;
      }

      const encoder = new TextEncoder();
      const stdoutBuffer = encoder.encode(plan.stdout).buffer;
      const stderrBuffer = encoder.encode(plan.stderr ?? "").buffer;
      this.onmessage?.({
        data: {
          id: message.id,
          success: true,
          result: {
            engine: "jq-wasm",
            host: "browser",
            inputBytes: message.inputBytes,
            stdoutBytes: plan.stdout.length,
            stderrBytes: (plan.stderr ?? "").length,
            durationMs: 4,
            exitCode: plan.exitCode ?? 0,
            stdoutTruncated: false,
            stderrTruncated: false,
          },
          stdoutBuffer,
          stderrBuffer,
        },
      } as MessageEvent);
    });
  }

  terminate(): void {
    this.terminated = true;
  }
}

class MockURL extends URL {
  static createObjectURL() {
    return "blob:mock";
  }
}

function createCaido(availability: NativeJqAvailability, nativeResult?: unknown) {
  return {
    assets: {
      get: vi.fn().mockResolvedValue({
        asString: vi.fn().mockResolvedValue(""),
      }),
    },
    backend: {
      nativeJqAvailability: vi.fn().mockResolvedValue(availability),
      runNativeJq: vi.fn().mockResolvedValue(nativeResult),
      cancelNativeJq: vi.fn().mockResolvedValue(true),
    },
  };
}

async function loadRunJqModule() {
  vi.resetModules();
  const caido = await import("../../caido");
  const runJq = await import("../runJq");
  return { ...runJq, setCaido: caido.setCaido };
}

async function flushMicrotasks(iterations = 4) {
  for (let i = 0; i < iterations; i++) {
    await Promise.resolve();
  }
}

describe("runJq", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWorker.instances = [];
    MockWorker.plans = [];
    vi.stubGlobal("Worker", MockWorker as unknown as typeof Worker);
    vi.stubGlobal("URL", MockURL as unknown as typeof URL);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("times out jq-wasm runs and recreates the worker", async () => {
    MockWorker.plans = [
      { kind: "hang" },
      { kind: "success", stdout: "42" },
    ];

    const { computeJqTimeout, runJq } = await loadRunJqModule();
    const bodyBytes = new TextEncoder().encode("null");

    const firstRun = runJq({
      bodyText: "null",
      bodyBytes,
      inputBytes: bodyBytes.byteLength,
      query: ".",
      flags: [],
      enginePreference: "jq-wasm",
    });
    await vi.advanceTimersByTimeAsync(computeJqTimeout(bodyBytes.byteLength, ".") + 1);

    await expect(firstRun).resolves.toMatchObject({
      engine: "jq-wasm",
      timedOut: true,
      exitCode: 1,
    });
    expect(MockWorker.instances[0]?.terminated).toBe(true);

    await expect(runJq({
      bodyText: "null",
      bodyBytes,
      inputBytes: bodyBytes.byteLength,
      query: ".",
      flags: [],
      enginePreference: "jq-wasm",
    })).resolves.toMatchObject({
      stdout: "42",
      exitCode: 0,
    });
    expect(MockWorker.instances).toHaveLength(2);
  });

  it("runs jq-wasm when bytes are materialized lazily", async () => {
    MockWorker.plans = [{ kind: "success", stdout: "lazy" }];
    const { runJq } = await loadRunJqModule();

    const result = await runJq({
      bodyText: "null",
      bodyBytes: null,
      inputBytes: 4,
      query: ".",
      flags: [],
      enginePreference: "jq-wasm",
    });

    expect(result.stdout).toBe("lazy");
    expect(result.inputBytes).toBe(4);
  });

  it("returns a useful error when native jq is explicitly unavailable", async () => {
    const { runJq, setCaido } = await loadRunJqModule();
    setCaido(createCaido({
      available: false,
      version: null,
      reason: "jq missing",
    }) as never);

    const result = await runJq({
      bodyText: "null",
      bodyBytes: new TextEncoder().encode("null"),
      inputBytes: 4,
      query: ".",
      flags: [],
      enginePreference: "native",
    });

    expect(result.engine).toBe("native");
    expect(result.stderr).toContain("Native jq is unavailable");
    expect(MockWorker.instances).toHaveLength(0);
  });

  it("uses native jq when explicitly selected and available", async () => {
    const nativeResult = {
      engine: "native",
      host: "caido-backend-host",
      inputBytes: 10_000_000,
      stdout: "native",
      stderr: "",
      stdoutBytes: 6,
      stderrBytes: 0,
      durationMs: 2,
      exitCode: 0,
      stdoutTruncated: false,
      stderrTruncated: false,
    };
    const { runJq, setCaido } = await loadRunJqModule();
    const caido = createCaido({
      available: true,
      version: "jq-1.8.2",
      reason: null,
    }, nativeResult);
    setCaido(caido as never);

    const result = await runJq({
      bodyText: "null",
      bodyBytes: new Uint8Array(10_000_000),
      inputBytes: 10_000_000,
      query: ".",
      flags: [],
      enginePreference: "native",
    });

    expect(result).toMatchObject(nativeResult);
    expect(caido.backend.runNativeJq).toHaveBeenCalledOnce();
    expect(MockWorker.instances).toHaveLength(0);
  });

  it("retries cached available native availability after the TTL", async () => {
    const { getNativeJqAvailability, setCaido } = await loadRunJqModule();
    const caido = createCaido({
      available: true,
      version: "jq-1.8.2",
      reason: null,
    });
    setCaido(caido as never);

    await expect(getNativeJqAvailability()).resolves.toMatchObject({
      available: true,
      version: "jq-1.8.2",
    });
    await expect(getNativeJqAvailability()).resolves.toMatchObject({
      available: true,
      version: "jq-1.8.2",
    });

    expect(caido.backend.nativeJqAvailability).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(JQ_NATIVE_AVAILABILITY_CACHE_TTL_MS);
    await expect(getNativeJqAvailability()).resolves.toMatchObject({
      available: true,
      version: "jq-1.8.2",
    });

    expect(caido.backend.nativeJqAvailability).toHaveBeenCalledTimes(2);
    expect(caido.backend.nativeJqAvailability).toHaveBeenLastCalledWith(true);
  });

  it("waits for native cancellation before starting the replacement run", async () => {
    const firstNative = createDeferred<unknown>();
    const cancelNative = createDeferred<boolean>();
    const nativeResult = {
      engine: "native",
      host: "caido-backend-host",
      inputBytes: 4,
      stdout: "second",
      stderr: "",
      stdoutBytes: 6,
      stderrBytes: 0,
      durationMs: 2,
      exitCode: 0,
      stdoutTruncated: false,
      stderrTruncated: false,
    };
    const { cancelActiveJqRun, runJq, setCaido } = await loadRunJqModule();
    const caido = createCaido({
      available: true,
      version: "jq-1.8.2",
      reason: null,
    });
    caido.backend.runNativeJq
      .mockReturnValueOnce(firstNative.promise)
      .mockResolvedValueOnce(nativeResult);
    caido.backend.cancelNativeJq.mockReturnValue(cancelNative.promise);
    setCaido(caido as never);

    const firstRun = runJq({
      bodyText: "null",
      bodyBytes: new TextEncoder().encode("null"),
      inputBytes: 4,
      query: ".",
      flags: [],
      enginePreference: "native",
    });
    await flushMicrotasks(20);
    expect(caido.backend.runNativeJq).toHaveBeenCalledTimes(1);

    const cancellation = cancelActiveJqRun();
    await flushMicrotasks();

    const secondRun = runJq({
      bodyText: "null",
      bodyBytes: new TextEncoder().encode("null"),
      inputBytes: 4,
      query: ".",
      flags: [],
      enginePreference: "native",
    });
    await flushMicrotasks(20);

    expect(caido.backend.runNativeJq).toHaveBeenCalledTimes(1);
    cancelNative.resolve(true);
    await flushMicrotasks();
    await cancellation;

    await expect(firstRun).resolves.toMatchObject({ cancelled: true });
    expect(caido.backend.runNativeJq).toHaveBeenCalledTimes(2);
    await expect(secondRun).resolves.toMatchObject(nativeResult);
  });

  it("caps the native cancellation wait before starting a replacement run", async () => {
    const firstNative = createDeferred<unknown>();
    const nativeResult = {
      engine: "native",
      host: "caido-backend-host",
      inputBytes: 4,
      stdout: "second",
      stderr: "",
      stdoutBytes: 6,
      stderrBytes: 0,
      durationMs: 2,
      exitCode: 0,
      stdoutTruncated: false,
      stderrTruncated: false,
    };
    const { cancelActiveJqRun, runJq, setCaido } = await loadRunJqModule();
    const caido = createCaido({
      available: true,
      version: "jq-1.8.2",
      reason: null,
    });
    caido.backend.runNativeJq
      .mockReturnValueOnce(firstNative.promise)
      .mockResolvedValueOnce(nativeResult);
    caido.backend.cancelNativeJq.mockReturnValue(new Promise<boolean>(() => undefined));
    setCaido(caido as never);

    const firstRun = runJq({
      bodyText: "null",
      bodyBytes: new TextEncoder().encode("null"),
      inputBytes: 4,
      query: ".",
      flags: [],
      enginePreference: "native",
    });
    await flushMicrotasks(20);
    expect(caido.backend.runNativeJq).toHaveBeenCalledTimes(1);

    const cancellation = cancelActiveJqRun();
    await flushMicrotasks();

    const secondRun = runJq({
      bodyText: "null",
      bodyBytes: new TextEncoder().encode("null"),
      inputBytes: 4,
      query: ".",
      flags: [],
      enginePreference: "native",
    });
    await flushMicrotasks(20);

    expect(caido.backend.runNativeJq).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(249);
    expect(caido.backend.runNativeJq).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await flushMicrotasks();

    await expect(firstRun).resolves.toMatchObject({ cancelled: true });
    await cancellation;
    expect(caido.backend.runNativeJq).toHaveBeenCalledTimes(2);
    await expect(secondRun).resolves.toMatchObject(nativeResult);
  });

  it("retries unavailable native availability after the retry TTL", async () => {
    const { getNativeJqAvailability, setCaido } = await loadRunJqModule();
    const caido = createCaido({
      available: false,
      version: null,
      reason: "jq missing",
    });
    setCaido(caido as never);

    await expect(getNativeJqAvailability()).resolves.toMatchObject({
      available: false,
      reason: "jq missing",
    });
    await expect(getNativeJqAvailability()).resolves.toMatchObject({
      available: false,
      reason: "jq missing",
    });

    expect(caido.backend.nativeJqAvailability).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(JQ_NATIVE_AVAILABILITY_CACHE_TTL_MS);
    await expect(getNativeJqAvailability()).resolves.toMatchObject({
      available: false,
      reason: "jq missing",
    });

    expect(caido.backend.nativeJqAvailability).toHaveBeenCalledTimes(2);
    expect(caido.backend.nativeJqAvailability).toHaveBeenLastCalledWith(true);
  });

  it("times out hung native RPC runs and requests backend cancellation", async () => {
    const { computeJqTimeout, runJq, setCaido } = await loadRunJqModule();
    const bodyBytes = new TextEncoder().encode("null");
    const caido = createCaido({
      available: true,
      version: "jq-1.8.2",
      reason: null,
    });
    caido.backend.runNativeJq.mockReturnValue(new Promise<unknown>(() => undefined));
    setCaido(caido as never);

    const runPromise = runJq({
      bodyText: "null",
      bodyBytes,
      inputBytes: bodyBytes.byteLength,
      query: ".",
      flags: [],
      enginePreference: "native",
    });
    await flushMicrotasks(20);
    await vi.advanceTimersByTimeAsync(computeJqTimeout(bodyBytes.byteLength, ".") + 500);

    await expect(runPromise).resolves.toMatchObject({
      engine: "native",
      timedOut: true,
      exitCode: 1,
    });
    expect(caido.backend.cancelNativeJq).toHaveBeenCalledTimes(1);
    expect(caido.backend.cancelNativeJq.mock.calls[0]?.[0]).toBe("jq-native-1");
  });

  it("waits for bounded cancellation after the native watchdog fires", async () => {
    const { computeJqTimeout, runJq, setCaido } = await loadRunJqModule();
    const firstNative = new Promise<unknown>(() => undefined);
    const secondResult = {
      engine: "native",
      host: "caido-backend-host",
      inputBytes: 4,
      stdout: "second",
      stderr: "",
      stdoutBytes: 6,
      stderrBytes: 0,
      durationMs: 2,
      exitCode: 0,
      stdoutTruncated: false,
      stderrTruncated: false,
    };
    const bodyBytes = new TextEncoder().encode("null");
    const caido = createCaido({
      available: true,
      version: "jq-1.8.2",
      reason: null,
    });
    caido.backend.runNativeJq
      .mockReturnValueOnce(firstNative)
      .mockResolvedValueOnce(secondResult);
    caido.backend.cancelNativeJq.mockReturnValue(new Promise<boolean>(() => undefined));
    setCaido(caido as never);

    const firstRun = runJq({
      bodyText: "null",
      bodyBytes,
      inputBytes: bodyBytes.byteLength,
      query: ".",
      flags: [],
      enginePreference: "native",
    });
    await flushMicrotasks(20);
    await vi.advanceTimersByTimeAsync(computeJqTimeout(bodyBytes.byteLength, ".") + 500);
    await expect(firstRun).resolves.toMatchObject({ timedOut: true });

    const secondRun = runJq({
      bodyText: "null",
      bodyBytes,
      inputBytes: bodyBytes.byteLength,
      query: ".",
      flags: [],
      enginePreference: "native",
    });
    await flushMicrotasks(20);

    expect(caido.backend.runNativeJq).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(249);
    expect(caido.backend.runNativeJq).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await flushMicrotasks(20);

    expect(caido.backend.runNativeJq).toHaveBeenCalledTimes(2);
    await expect(secondRun).resolves.toMatchObject(secondResult);
  });

  it("ignores late native RPC completion after the frontend watchdog times out", async () => {
    const { computeJqTimeout, runJq, setCaido } = await loadRunJqModule();
    const firstNative = createDeferred<unknown>();
    const secondNative = createDeferred<unknown>();
    const bodyBytes = new TextEncoder().encode("null");
    const secondResult = {
      engine: "native",
      host: "caido-backend-host",
      inputBytes: 4,
      stdout: "second",
      stderr: "",
      stdoutBytes: 6,
      stderrBytes: 0,
      durationMs: 2,
      exitCode: 0,
      stdoutTruncated: false,
      stderrTruncated: false,
    };
    const caido = createCaido({
      available: true,
      version: "jq-1.8.2",
      reason: null,
    });
    caido.backend.runNativeJq
      .mockReturnValueOnce(firstNative.promise)
      .mockReturnValueOnce(secondNative.promise);
    setCaido(caido as never);

    const firstRun = runJq({
      bodyText: "null",
      bodyBytes,
      inputBytes: bodyBytes.byteLength,
      query: ".",
      flags: [],
      enginePreference: "native",
    });
    await flushMicrotasks(20);
    await vi.advanceTimersByTimeAsync(computeJqTimeout(bodyBytes.byteLength, ".") + 500);
    await expect(firstRun).resolves.toMatchObject({ timedOut: true });

    const secondRun = runJq({
      bodyText: "null",
      bodyBytes,
      inputBytes: bodyBytes.byteLength,
      query: ".",
      flags: [],
      enginePreference: "native",
    });
    await flushMicrotasks(20);
    expect(caido.backend.runNativeJq).toHaveBeenCalledTimes(2);

    let secondSettled = false;
    void secondRun.then(() => {
      secondSettled = true;
    });

    firstNative.resolve({
      engine: "native",
      host: "caido-backend-host",
      inputBytes: 4,
      stdout: "late-first",
      stderr: "",
      stdoutBytes: 10,
      stderrBytes: 0,
      durationMs: 99,
      exitCode: 0,
      stdoutTruncated: false,
      stderrTruncated: false,
    });
    await flushMicrotasks(20);

    expect(secondSettled).toBe(false);

    secondNative.resolve(secondResult);
    await expect(secondRun).resolves.toMatchObject(secondResult);
  });
});

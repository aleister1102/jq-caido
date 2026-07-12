import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NativeJqAvailability } from "../../../../shared/jqContract";

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
      query: ".",
      flags: [],
      enginePreference: "jq-wasm",
    })).resolves.toMatchObject({
      stdout: "42",
      exitCode: 0,
    });
    expect(MockWorker.instances).toHaveLength(2);
  });

  it("falls back to jq-wasm in automatic mode when native jq is unavailable", async () => {
    MockWorker.plans = [{ kind: "success", stdout: "fallback" }];
    const { runJq, setCaido } = await loadRunJqModule();
    const caido = createCaido({
      available: false,
      version: null,
      reason: "jq missing",
    });
    setCaido(caido as never);

    const result = await runJq({
      bodyText: "null",
      bodyBytes: new Uint8Array(10_000_000),
      query: ".",
      flags: [],
      enginePreference: "automatic",
    });

    expect(result.engine).toBe("jq-wasm");
    expect(result.stdout).toBe("fallback");
    expect(caido.backend.nativeJqAvailability).toHaveBeenCalled();
    expect(caido.backend.runNativeJq).not.toHaveBeenCalled();
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
      query: ".",
      flags: [],
      enginePreference: "native",
    });

    expect(result.engine).toBe("native");
    expect(result.stderr).toContain("Native jq is unavailable");
    expect(MockWorker.instances).toHaveLength(0);
  });

  it("uses native jq in automatic mode when available for large inputs", async () => {
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
      query: ".",
      flags: [],
      enginePreference: "automatic",
    });

    expect(result).toMatchObject(nativeResult);
    expect(caido.backend.runNativeJq).toHaveBeenCalledOnce();
    expect(MockWorker.instances).toHaveLength(0);
  });
});

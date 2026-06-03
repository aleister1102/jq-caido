import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  postMessage(message: { id: number }): void {
    const plan = MockWorker.plans.shift() ?? { kind: "success", stdout: "" };
    if (plan.kind === "hang") return;

    if (plan.kind === "error") {
      this.onerror?.({ message: plan.message } as ErrorEvent);
      return;
    }

    queueMicrotask(() => {
      if (this.terminated) return;
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
      this.onmessage?.({
        data: {
          id: message.id,
          success: true,
          stdoutBuffer: encoder.encode(plan.stdout).buffer,
          stderrBuffer: encoder.encode(plan.stderr ?? "").buffer,
          exitCode: plan.exitCode ?? 0,
        },
      } as MessageEvent);
    });
  }

  terminate(): void {
    this.terminated = true;
  }
}

async function loadRunJqModule() {
  vi.resetModules();
  return import("../runJq");
}

async function flushMicrotasks(iterations = 4) {
  for (let i = 0; i < iterations; i++) {
    await Promise.resolve();
  }
}

describe("runJq worker recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWorker.instances = [];
    MockWorker.plans = [];
    vi.stubGlobal("Worker", MockWorker as unknown as typeof Worker);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("recreates the worker after a timeout", async () => {
    MockWorker.plans = [
      { kind: "hang" },
      { kind: "success", stdout: "42" },
    ];

    const { computeJqTimeout, runJq } = await loadRunJqModule();

    const firstRun = runJq("null", ".");
    await vi.advanceTimersByTimeAsync(computeJqTimeout(new TextEncoder().encode("null").byteLength, ".") + 1);

    await expect(firstRun).resolves.toMatchObject({
      stdout: "",
      exitCode: 1,
      timedOut: true,
    });
    expect(MockWorker.instances).toHaveLength(1);
    expect(MockWorker.instances[0]?.terminated).toBe(true);

    await expect(runJq("null", ".")).resolves.toMatchObject({
      stdout: "42",
      stderr: "",
      exitCode: 0,
    });
    expect(MockWorker.instances).toHaveLength(2);
  });

  it("replaces the worker when a new run supersedes an in-flight run", async () => {
    MockWorker.plans = [
      { kind: "hang" },
      { kind: "success", stdout: "new result" },
    ];

    const { runJq } = await loadRunJqModule();

    const firstRun = runJq("null", ".");
    await flushMicrotasks();

    expect(MockWorker.instances).toHaveLength(1);

    const secondRun = runJq("null", ".");
    await flushMicrotasks();

    await expect(firstRun).resolves.toMatchObject({
      stdout: "",
      stderr: "Cancelled",
      exitCode: 1,
    });
    expect(MockWorker.instances[0]?.terminated).toBe(true);

    await expect(secondRun).resolves.toMatchObject({
      stdout: "new result",
      stderr: "",
      exitCode: 0,
    });
    expect(MockWorker.instances).toHaveLength(2);
  });

  it("recreates the worker after a warmup error", async () => {
    MockWorker.plans = [
      { kind: "error", message: "warmup failed" },
      { kind: "success", stdout: "ready" },
    ];

    const { runJq, warmupJqWorker } = await loadRunJqModule();

    warmupJqWorker();
    await flushMicrotasks();

    expect(MockWorker.instances).toHaveLength(1);
    expect(MockWorker.plans).toHaveLength(1);

    await expect(runJq("null", ".")).resolves.toMatchObject({
      stdout: "ready",
      stderr: "",
      exitCode: 0,
    });
    expect(MockWorker.instances).toHaveLength(2);
  });

  it("recreates the worker after a warmup failure message", async () => {
    MockWorker.plans = [
      { kind: "failure", message: "warmup failed" },
      { kind: "success", stdout: "ready" },
    ];

    const { runJq, warmupJqWorker } = await loadRunJqModule();

    warmupJqWorker();
    await flushMicrotasks();

    expect(MockWorker.instances).toHaveLength(1);
    expect(MockWorker.instances[0]?.terminated).toBe(true);
    expect(MockWorker.plans).toHaveLength(1);

    await expect(runJq("null", ".")).resolves.toMatchObject({
      stdout: "ready",
      stderr: "",
      exitCode: 0,
    });
    expect(MockWorker.instances).toHaveLength(2);
  });
});

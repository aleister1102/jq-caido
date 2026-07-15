import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  JQ_INPUT_MAX_BYTES,
  JQ_NATIVE_AVAILABILITY_CACHE_TTL_MS,
  JQ_STDERR_MAX_BYTES,
  JQ_STDOUT_MAX_BYTES,
} from "../../../shared/jqPolicy";
import {
  cancelNativeJqTask,
  probeNativeJqAvailability,
  resetNativeJqAvailabilityCache,
  runNativeJqTask,
  validateNativeJqRequest,
  type NativeTaskState,
} from "../nativeJq";

class FakeReadable extends EventEmitter {
  emitData(chunk: string | Uint8Array) {
    this.emit("data", typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
  }
}

class FakeChild extends EventEmitter {
  stdin = { write: vi.fn(), end: vi.fn() };
  stdout = new FakeReadable();
  stderr = new FakeReadable();
  closeCode: number | null = null;
  kill = vi.fn(() => {
    this.emit("close", this.closeCode);
    return true;
  });
}

function createProbeSpawn(stdout: string, closeCode = 0) {
  return vi.fn(() => {
    const child = new FakeChild();
    queueMicrotask(() => {
      if (stdout) {
        child.stdout.emitData(stdout);
      }
      child.emit("close", closeCode);
    });
    return child as never;
  });
}

describe("nativeJq", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetNativeJqAvailabilityCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("rejects unsupported flags", () => {
    expect(() => validateNativeJqRequest({
      taskId: "task-1",
      input: "{}",
      inputBytes: 2,
      query: ".",
      flags: ["--slurp"],
      timeoutMs: 1_000,
    })).toThrow("Unsupported jq flags");
  });

  it("computes authoritative input bytes from request.input", () => {
    const request = validateNativeJqRequest({
      taskId: "task-bytes",
      input: "€€",
      inputBytes: 1,
      query: ".",
      flags: [],
      timeoutMs: 1_000,
    });

    expect(request.inputBytes).toBe(Buffer.byteLength("€€"));
  });

  it("rejects actual oversized UTF-8 input even when inputBytes lies", () => {
    expect(() => validateNativeJqRequest({
      taskId: "task-oversized",
      input: "€".repeat(Math.ceil(JQ_INPUT_MAX_BYTES / Buffer.byteLength("€"))),
      inputBytes: 1,
      query: ".",
      flags: [],
      timeoutMs: 1_000,
    })).toThrow("Payload too large");
  });

  it("rejects duplicate active task ids before spawning", async () => {
    const activeTasks = new Map<string, NativeTaskState>();
    activeTasks.set("task-dup", {
      child: new FakeChild() as never,
      cancelled: false,
      capped: false,
      timedOut: false,
      cleanup: () => undefined,
    });
    const spawnSpy = vi.fn();

    await expect(runNativeJqTask({
      taskId: "task-dup",
      input: "{}",
      inputBytes: 2,
      query: ".",
      flags: [],
      timeoutMs: 10_000,
    }, activeTasks, spawnSpy as never)).rejects.toThrow("already active");
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it("captures output when the child responds during stdin.end", async () => {
    const child = new FakeChild();
    child.stdin.end = vi.fn(() => {
      child.stdout.emitData("ok");
      child.emit("close", 0);
    });
    const activeTasks = new Map<string, NativeTaskState>();
    const spawnFn = vi.fn(() => child as never);

    const result = await runNativeJqTask({
      taskId: "task-order",
      input: "{}",
      inputBytes: 2,
      query: ".",
      flags: [],
      timeoutMs: 10_000,
    }, activeTasks, spawnFn as never);

    expect(result.stdout).toBe("ok");
    expect(result.inputBytes).toBe(Buffer.byteLength("{}"));
    expect(child.stdin.write).toHaveBeenCalledWith("{}");
    expect(child.stdin.end).toHaveBeenCalledWith();
    expect(spawnFn).toHaveBeenCalledWith("jq", ["."], {
      stdio: ["pipe", "pipe", "pipe"],
    });
  });

  it("times out jq --version probes and returns an unavailable reason", async () => {
    const child = new FakeChild();
    const probePromise = probeNativeJqAvailability(true, () => child as never);

    await vi.advanceTimersByTimeAsync(1_500);
    const availability = await probePromise;

    expect(availability.available).toBe(false);
    expect(availability.reason).toContain("timed out");
    expect(child.kill).toHaveBeenCalled();
  });

  it("retries cached available probe results after the TTL", async () => {
    const spawnSpy = createProbeSpawn("jq-1.8.2");

    await expect(probeNativeJqAvailability(false, spawnSpy as never)).resolves.toMatchObject({
      available: true,
      version: "jq-1.8.2",
    });
    await expect(probeNativeJqAvailability(false, spawnSpy as never)).resolves.toMatchObject({
      available: true,
      version: "jq-1.8.2",
    });

    expect(spawnSpy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(JQ_NATIVE_AVAILABILITY_CACHE_TTL_MS);
    await expect(probeNativeJqAvailability(false, spawnSpy as never)).resolves.toMatchObject({
      available: true,
      version: "jq-1.8.2",
    });

    expect(spawnSpy).toHaveBeenCalledTimes(2);
  });

  it("retries cached unavailable probe results after the TTL", async () => {
    const spawnSpy = createProbeSpawn("", 1);

    await expect(probeNativeJqAvailability(false, spawnSpy as never)).resolves.toMatchObject({
      available: false,
      version: null,
    });
    await expect(probeNativeJqAvailability(false, spawnSpy as never)).resolves.toMatchObject({
      available: false,
      version: null,
    });

    expect(spawnSpy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(JQ_NATIVE_AVAILABILITY_CACHE_TTL_MS);
    await expect(probeNativeJqAvailability(false, spawnSpy as never)).resolves.toMatchObject({
      available: false,
      version: null,
    });

    expect(spawnSpy).toHaveBeenCalledTimes(2);
  });

  it("caps stdout on multibyte UTF-8 boundaries", async () => {
    const child = new FakeChild();
    const activeTasks = new Map<string, NativeTaskState>();
    const promise = runNativeJqTask({
      taskId: "task-stdout",
      input: "{}",
      inputBytes: 2,
      query: ".",
      flags: [],
      timeoutMs: 10_000,
    }, activeTasks, () => child as never);

    child.stdout.emitData("€".repeat(Math.ceil((JQ_STDOUT_MAX_BYTES + 12) / Buffer.byteLength("€"))));

    const result = await promise;
    expect(result.stdoutTruncated).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(Buffer.byteLength(result.stdout)).toBe(result.stdoutBytes);
    expect(result.stdoutBytes).toBeLessThanOrEqual(JQ_STDOUT_MAX_BYTES);
    expect(child.kill).toHaveBeenCalled();
    expect(activeTasks.size).toBe(0);
  });

  it("caps stderr on multibyte UTF-8 boundaries", async () => {
    const child = new FakeChild();
    const activeTasks = new Map<string, NativeTaskState>();
    const promise = runNativeJqTask({
      taskId: "task-stderr",
      input: "{}",
      inputBytes: 2,
      query: ".",
      flags: [],
      timeoutMs: 10_000,
    }, activeTasks, () => child as never);

    child.stderr.emitData("€".repeat(Math.ceil((JQ_STDERR_MAX_BYTES + 12) / Buffer.byteLength("€"))));

    const result = await promise;
    expect(result.stderrTruncated).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(Buffer.byteLength(result.stderr)).toBe(result.stderrBytes);
    expect(result.stderrBytes).toBeLessThanOrEqual(JQ_STDERR_MAX_BYTES);
    expect(child.kill).toHaveBeenCalled();
    expect(activeTasks.size).toBe(0);
  });

  it("marks timed out tasks and cleans them up", async () => {
    const child = new FakeChild();
    const activeTasks = new Map<string, NativeTaskState>();
    const promise = runNativeJqTask({
      taskId: "task-timeout",
      input: "{}",
      inputBytes: 2,
      query: ".",
      flags: [],
      timeoutMs: 5,
    }, activeTasks, () => child as never);

    await vi.advanceTimersByTimeAsync(5_000);
    const result = await promise;

    expect(result.timedOut).toBe(true);
    expect(activeTasks.size).toBe(0);
  });

  it("cancels active tasks and cleans them up", async () => {
    const child = new FakeChild();
    const activeTasks = new Map<string, NativeTaskState>();
    const promise = runNativeJqTask({
      taskId: "task-cancel",
      input: "{}",
      inputBytes: 2,
      query: ".",
      flags: [],
      timeoutMs: 10_000,
    }, activeTasks, () => child as never);

    expect(cancelNativeJqTask("task-cancel", activeTasks)).toBe(true);
    const result = await promise;

    expect(result.cancelled).toBe(true);
    expect(activeTasks.size).toBe(0);
  });
});

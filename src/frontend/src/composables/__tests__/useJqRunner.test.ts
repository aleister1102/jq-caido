import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, effectScope, nextTick, ref, shallowRef } from "vue";
import { JQ_AUTO_RUN_MAX_BYTES } from "../../../../shared/jqPolicy";
import { createDeferred } from "../../test/createDeferred";

const runJqMock = vi.fn();
const cancelActiveJqRunMock = vi.fn().mockResolvedValue(undefined);
const getNativeJqAvailabilityMock = vi.fn().mockResolvedValue({
  available: false,
  version: null,
  reason: "jq missing",
});

vi.mock("../../lib/runJq", () => ({
  runJq: runJqMock,
  cancelActiveJqRun: cancelActiveJqRunMock,
  getNativeJqAvailability: getNativeJqAvailabilityMock,
}));

async function flushMicrotasks(iterations = 4) {
  for (let i = 0; i < iterations; i++) {
    await Promise.resolve();
  }
}

describe("useJqRunner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    runJqMock.mockReset();
    cancelActiveJqRunMock.mockClear();
    getNativeJqAvailabilityMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not auto-run payloads at or above 2 MB", async () => {
    const { useJqRunner } = await import("../useJqRunner");
    const scope = effectScope();
    const state = scope.run(() =>
      useJqRunner({
        bodyText: computed(() => '{"big":true}'),
        bodyBytes: shallowRef<Uint8Array | null>(null),
        bodyByteLength: ref(JQ_AUTO_RUN_MAX_BYTES),
        query: ref("."),
        isCompact: ref(false),
        isRaw: ref(false),
        keysOnly: ref(false),
        filterNulls: ref(false),
        isOversized: computed(() => false),
        isContentBlocked: computed(() => false),
      }),
    )!;

    await nextTick();

    expect(runJqMock).not.toHaveBeenCalled();
    expect(state.canRun.value).toBe(true);
    expect(state.requiresManualRun.value).toBe(true);
    expect(state.stderr.value).toContain("Press Run");
    scope.stop();
  });

  it("ignores stale results after a newer query run starts", async () => {
    const deferred = createDeferred<{
      engine: "jq-wasm";
      host: "browser";
      inputBytes: number;
      stdout: string;
      stderr: string;
      stdoutBytes: number;
      stderrBytes: number;
      durationMs: number;
      exitCode: number;
      stdoutTruncated: boolean;
      stderrTruncated: boolean;
    }>();
    runJqMock
      .mockReturnValueOnce(deferred.promise)
      .mockResolvedValueOnce({
        engine: "jq-wasm",
        host: "browser",
        inputBytes: 2,
        stdout: "second",
        stderr: "",
        stdoutBytes: 6,
        stderrBytes: 0,
        durationMs: 1,
        exitCode: 0,
        stdoutTruncated: false,
        stderrTruncated: false,
      });

    const { useJqRunner } = await import("../useJqRunner");
    const query = ref(".");
    const scope = effectScope();
    const state = scope.run(() =>
      useJqRunner({
        bodyText: computed(() => "[]"),
        bodyBytes: shallowRef(new TextEncoder().encode("[]")),
        bodyByteLength: ref(2),
        query,
        isCompact: ref(false),
        isRaw: ref(false),
        keysOnly: ref(false),
        filterNulls: ref(false),
        isOversized: computed(() => false),
        isContentBlocked: computed(() => false),
      }),
    )!;

    await nextTick();
    expect(runJqMock).toHaveBeenCalledTimes(1);

    query.value = ".next";
    await nextTick();
    await vi.advanceTimersByTimeAsync(300);
    await flushMicrotasks();

    expect(runJqMock).toHaveBeenCalledTimes(2);
    deferred.resolve({
      engine: "jq-wasm",
      host: "browser",
      inputBytes: 2,
      stdout: "first",
      stderr: "",
      stdoutBytes: 5,
      stderrBytes: 0,
      durationMs: 5,
      exitCode: 0,
      stdoutTruncated: false,
      stderrTruncated: false,
    });
    await flushMicrotasks();

    expect(state.stdout.value).toBe("second");
    scope.stop();
  });

  it("keeps loading owned by the newest generation while an older run settles", async () => {
    const first = createDeferred<{
      engine: "jq-wasm";
      host: "browser";
      inputBytes: number;
      stdout: string;
      stderr: string;
      stdoutBytes: number;
      stderrBytes: number;
      durationMs: number;
      exitCode: number;
      stdoutTruncated: boolean;
      stderrTruncated: boolean;
    }>();
    const second = createDeferred<{
      engine: "jq-wasm";
      host: "browser";
      inputBytes: number;
      stdout: string;
      stderr: string;
      stdoutBytes: number;
      stderrBytes: number;
      durationMs: number;
      exitCode: number;
      stdoutTruncated: boolean;
      stderrTruncated: boolean;
    }>();
    runJqMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { useJqRunner } = await import("../useJqRunner");
    const query = ref(".");
    const scope = effectScope();
    const state = scope.run(() =>
      useJqRunner({
        bodyText: computed(() => "[]"),
        bodyBytes: shallowRef(new TextEncoder().encode("[]")),
        bodyByteLength: ref(2),
        query,
        isCompact: ref(false),
        isRaw: ref(false),
        keysOnly: ref(false),
        filterNulls: ref(false),
        isOversized: computed(() => false),
        isContentBlocked: computed(() => false),
      }),
    )!;

    await nextTick();
    expect(state.isLoading.value).toBe(true);

    query.value = ".next";
    await nextTick();
    await vi.advanceTimersByTimeAsync(300);
    await flushMicrotasks();
    expect(runJqMock).toHaveBeenCalledTimes(2);
    expect(state.isLoading.value).toBe(true);

    first.resolve({
      engine: "jq-wasm",
      host: "browser",
      inputBytes: 2,
      stdout: "first",
      stderr: "",
      stdoutBytes: 5,
      stderrBytes: 0,
      durationMs: 5,
      exitCode: 0,
      stdoutTruncated: false,
      stderrTruncated: false,
    });
    await flushMicrotasks();

    expect(state.isLoading.value).toBe(true);

    second.resolve({
      engine: "jq-wasm",
      host: "browser",
      inputBytes: 2,
      stdout: "second",
      stderr: "",
      stdoutBytes: 6,
      stderrBytes: 0,
      durationMs: 1,
      exitCode: 0,
      stdoutTruncated: false,
      stderrTruncated: false,
    });
    await flushMicrotasks();

    expect(state.isLoading.value).toBe(false);
    expect(state.stdout.value).toBe("second");
    scope.stop();
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope, ref, nextTick } from "vue";
import { useOutputDisplay } from "../useOutputDisplay";

describe("useOutputDisplay", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should truncate output above 500KB by default", async () => {
    const scope = effectScope();
    const largeOutput = "a".repeat(600 * 1024);
    const stdout = ref(largeOutput);
    const { displayOutput, isOutputTruncated } = scope.run(() => useOutputDisplay(stdout))!;

    await vi.waitFor(() => {
      expect(displayOutput.value).toContain("[Output truncated");
    });

    expect(isOutputTruncated.value).toBe(true);
    expect(displayOutput.value.length).toBeLessThan(largeOutput.length);
    scope.stop();
  });

  it("should enable highlight for small output", async () => {
    const scope = effectScope();
    const stdout = ref('{"foo": "bar"}');
    const { shouldHighlight, isHighlighting, displayOutput } = scope.run(() =>
      useOutputDisplay(stdout),
    )!;

    await nextTick();

    expect(shouldHighlight.value).toBe(true);
    expect(isHighlighting.value).toBe(false);
    expect(displayOutput.value).toContain("token");
    scope.stop();
  });

  it("should lazy-highlight output above 100KB", async () => {
    const scope = effectScope();
    const midOutput = `{"items":[${'"x",'.repeat(30_000)}"y"]}`;
    expect(midOutput.length).toBeGreaterThan(100 * 1024);

    const stdout = ref(midOutput);
    const { shouldHighlight, displayOutput } = scope.run(() => useOutputDisplay(stdout))!;

    await nextTick();
    expect(shouldHighlight.value).toBe(true);

    await vi.waitFor(
      () => {
        expect(displayOutput.value).toContain("token");
      },
      { timeout: 10_000 },
    );
    scope.stop();
  });
});

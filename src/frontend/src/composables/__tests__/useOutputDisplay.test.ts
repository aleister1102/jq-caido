import { describe, it, expect } from "vitest";
import { ref, nextTick } from "vue";
import { useOutputDisplay } from "../useOutputDisplay";

describe("useOutputDisplay", () => {
  it("should truncate output above 500KB by default", () => {
    const largeOutput = "a".repeat(600 * 1024);
    const stdout = ref(largeOutput);
    const { displayOutput, isOutputTruncated } = useOutputDisplay(stdout);

    expect(isOutputTruncated.value).toBe(true);
    expect(displayOutput.value).toContain("[Output truncated");
    expect(displayOutput.value.length).toBeLessThan(largeOutput.length);
  });

  it("should show full output when toggled", async () => {
    const largeOutput = "a".repeat(600 * 1024);
    const stdout = ref(largeOutput);
    const { displayOutput, isOutputTruncated, showFullOutput } = useOutputDisplay(stdout);

    showFullOutput.value = true;
    await nextTick();

    expect(isOutputTruncated.value).toBe(false);
    expect(displayOutput.value).not.toContain("[Output truncated");
    // Should be at least original length (plus potential escaping)
    expect(displayOutput.value.length).toBeGreaterThanOrEqual(largeOutput.length);
  });

  it("should bypass highlight for output above 100KB", () => {
    const midOutput = "a".repeat(150 * 1024);
    const stdout = ref(midOutput);
    const { shouldHighlight } = useOutputDisplay(stdout);

    expect(shouldHighlight.value).toBe(false);
  });

  it("should enable highlight for output below 100KB", () => {
    const smallOutput = '{"foo": "bar"}';
    const stdout = ref(smallOutput);
    const { shouldHighlight } = useOutputDisplay(stdout);

    expect(shouldHighlight.value).toBe(true);
  });
});

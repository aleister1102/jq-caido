import { describe, it, expect } from "vitest";
import { effectScope, ref, nextTick } from "vue";
import { JQ_HIGHLIGHT_MAX_BYTES } from "../../../../shared/jqPolicy";
import { useOutputDisplay } from "../useOutputDisplay";

describe("useOutputDisplay", () => {
  it("renders plain text without highlighting for large outputs", async () => {
    const scope = effectScope();
    const largeOutput = "a".repeat(JQ_HIGHLIGHT_MAX_BYTES);
    const stdout = ref(largeOutput);
    const stdoutBytes = ref(JQ_HIGHLIGHT_MAX_BYTES);
    const { displayOutput, shouldHighlight, statusMessage } = scope.run(() => useOutputDisplay(stdout, stdoutBytes))!;

    await nextTick();

    expect(shouldHighlight.value).toBe(false);
    expect(displayOutput.value).toBe(largeOutput);
    expect(statusMessage.value).toBe("Highlighting off above 400 KB");
    scope.stop();
  });

  it("highlights small output once", async () => {
    const scope = effectScope();
    const stdout = ref('{"foo": "bar"}');
    const stdoutBytes = ref(stdout.value.length);
    const { shouldHighlight, displayOutput, statusMessage } = scope.run(() =>
      useOutputDisplay(stdout, stdoutBytes),
    )!;

    await nextTick();

    expect(shouldHighlight.value).toBe(true);
    expect(displayOutput.value).toContain("token");
    expect(statusMessage.value).toBe("");
    scope.stop();
  });

  it("highlights outputs below the threshold", async () => {
    const scope = effectScope();
    const output = `{"items":[${'"x",'.repeat(10_000)}"y"]}`;
    const stdout = ref(output);
    const stdoutBytes = ref(output.length);
    const { shouldHighlight, displayOutput } = scope.run(() =>
      useOutputDisplay(stdout, stdoutBytes),
    )!;

    expect(shouldHighlight.value).toBe(true);
    expect(displayOutput.value).toContain("token");
    scope.stop();
  });
});

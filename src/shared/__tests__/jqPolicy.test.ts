import { describe, expect, it } from "vitest";
import {
  JQ_AUTOCOMPLETE_MAX_BYTES,
  JQ_AUTO_RUN_MAX_BYTES,
  JQ_HIGHLIGHT_MAX_BYTES,
  shouldAutoRun,
  shouldEnableAutocomplete,
  shouldHighlightOutput,
} from "../jqPolicy";

describe("jqPolicy thresholds", () => {
  it("stops auto-run at 2 MB and above", () => {
    expect(shouldAutoRun(JQ_AUTO_RUN_MAX_BYTES - 1)).toBe(true);
    expect(shouldAutoRun(JQ_AUTO_RUN_MAX_BYTES)).toBe(false);
  });

  it("stops autocomplete at 4 MB and above", () => {
    expect(shouldEnableAutocomplete(JQ_AUTOCOMPLETE_MAX_BYTES - 1)).toBe(true);
    expect(shouldEnableAutocomplete(JQ_AUTOCOMPLETE_MAX_BYTES)).toBe(false);
  });

  it("stops highlighting at the highlight cap and above", () => {
    expect(shouldHighlightOutput(JQ_HIGHLIGHT_MAX_BYTES - 1)).toBe(true);
    expect(shouldHighlightOutput(JQ_HIGHLIGHT_MAX_BYTES)).toBe(false);
  });
});

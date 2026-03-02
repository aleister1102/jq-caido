import { describe, it, expect } from "vitest";
import { computed } from "vue";
import { useRawPayload, type PropsShape } from "../useRawPayload";

describe("useRawPayload", () => {
  it("should parse payload on ensureParsedJson for 1MB payload", () => {
    const oneMbJson = JSON.stringify({ data: "a".repeat(1024 * 1024) });
    const oneMbLimit = 1024 * 1024;
    expect(oneMbJson.length).toBeGreaterThanOrEqual(oneMbLimit);
    expect(oneMbJson.length).toBeLessThan(10_000_000);

    const oneMbPayloadProps = computed<PropsShape>(() => ({
      raw: oneMbJson,
    }));
    const state = useRawPayload(oneMbPayloadProps);
    state.ensureParsedJson();

    expect(state.parsedJson.value).not.toBeNull();
    expect(state.parsedJson.value.data.length).toBe(1024 * 1024);
  });

  it("should skip parsedJson for payload > 10MB", () => {
    const elevenMbJson = JSON.stringify({ data: "a".repeat(11 * 1024 * 1024) });
    const oversizedProps = computed<PropsShape>(() => ({
      raw: elevenMbJson,
    }));
    const state = useRawPayload(oversizedProps);
    state.ensureParsedJson();

    expect(state.parsedJson.value).toBeNull();
  });

  it("should expose autocomplete warning for payload > 10MB", () => {
    const props = computed<PropsShape>(() => ({
      raw: `{\"data\":\"${"a".repeat(11 * 1024 * 1024)}\"}`
    }));
    const { autocompleteWarning } = useRawPayload(props);

    expect(autocompleteWarning.value).toContain("Autocomplete disabled for large payloads");
  });

  it("should not expose autocomplete warning for small payload", () => {
    const props = computed<PropsShape>(() => ({
      raw: "{\"foo\":\"bar\"}"
    }));
    const { autocompleteWarning } = useRawPayload(props);

    expect(autocompleteWarning.value).toBe("");
  });
});

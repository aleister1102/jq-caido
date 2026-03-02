import { describe, it, expect } from "vitest";
import { computed } from "vue";
import { useRawPayload, type PropsShape } from "../useRawPayload";

describe("useRawPayload", () => {
  it("should parse payload on ensureParsedJson for small payload (< 300KB)", () => {
    const smallJson = JSON.stringify({ data: "a".repeat(100) });

    const props = computed<PropsShape>(() => ({
      raw: smallJson,
    }));
    const state = useRawPayload(props);
    state.ensureParsedJson();

    expect(state.parsedJson.value).not.toBeNull();
    expect(state.parsedJson.value.data.length).toBe(100);
  });

  it("should flag isOversized for payload > 300KB", () => {
    const oversizedJson = JSON.stringify({ data: "a".repeat(310 * 1024) });
    const props = computed<PropsShape>(() => ({
      raw: oversizedJson,
    }));
    const { isOversized } = useRawPayload(props);

    expect(isOversized.value).toBe(true);
  });

  it("should not flag isOversized for payload <= 300KB", () => {
    const smallJson = JSON.stringify({ data: "a".repeat(100) });
    const props = computed<PropsShape>(() => ({
      raw: smallJson,
    }));
    const { isOversized } = useRawPayload(props);

    expect(isOversized.value).toBe(false);
  });

  it("should skip parsedJson for oversized payload (> 300KB)", () => {
    const oversizedJson = JSON.stringify({ data: "a".repeat(310 * 1024) });
    const props = computed<PropsShape>(() => ({
      raw: oversizedJson,
    }));
    const state = useRawPayload(props);
    state.ensureParsedJson();

    expect(state.parsedJson.value).toBeNull();
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

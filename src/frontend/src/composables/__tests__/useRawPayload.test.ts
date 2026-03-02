import { describe, it, expect } from "vitest";
import { computed } from "vue";
import { useRawPayload, type PropsShape } from "../useRawPayload";

describe("useRawPayload", () => {
  it("should update parsedJson for 1MB payload", () => {
    const props = computed<PropsShape>(() => ({
      raw: '{"foo": "bar"}'
    }));
    const { updateParsedJson, parsedJson } = useRawPayload(props);

    const oneMbJson = JSON.stringify({ data: "a".repeat(1024 * 1024) });
    const oneMbLimit = 1024 * 1024;
    expect(oneMbJson.length).toBeGreaterThanOrEqual(oneMbLimit);
    expect(oneMbJson.length).toBeLessThan(10_000_000);
    updateParsedJson(oneMbJson);

    expect(parsedJson.value).not.toBeNull();
    expect(parsedJson.value.data.length).toBe(1024 * 1024);
  });

  it("should update parsedJson for 5MB payload", () => {
    const props = computed<PropsShape>(() => ({}));
    const { updateParsedJson, parsedJson } = useRawPayload(props);

    const fiveMbJson = JSON.stringify({ data: "a".repeat(5 * 1024 * 1024) });
    expect(fiveMbJson.length).toBeLessThan(10_000_000);
    updateParsedJson(fiveMbJson);

    expect(parsedJson.value).not.toBeNull();
    expect(parsedJson.value.data.length).toBe(5 * 1024 * 1024);
  });

  it("should skip parsedJson for payload > 10MB", () => {
    const props = computed<PropsShape>(() => ({}));
    const { updateParsedJson, parsedJson } = useRawPayload(props);

    const elevenMbJson = "a".repeat(11 * 1024 * 1024);
    updateParsedJson(elevenMbJson);

    expect(parsedJson.value).toBeNull();
  });
});

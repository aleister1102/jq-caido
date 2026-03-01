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
    expect(oneMbJson.length).toBeLessThan(5_000_000);
    updateParsedJson(oneMbJson);

    expect(parsedJson.value).not.toBeNull();
    expect(parsedJson.value.data.length).toBe(1024 * 1024);
  });

  it("should skip parsedJson for payload > 5MB", () => {
    const props = computed<PropsShape>(() => ({}));
    const { updateParsedJson, parsedJson } = useRawPayload(props);

    const sixMbJson = "a".repeat(6 * 1024 * 1024);
    updateParsedJson(sixMbJson);

    expect(parsedJson.value).toBeNull();
  });
});

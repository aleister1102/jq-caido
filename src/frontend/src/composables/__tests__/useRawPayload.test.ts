import { describe, it, expect } from "vitest";
import { computed, nextTick } from "vue";
import { JQ_AUTO_RUN_MAX_BYTES, JQ_AUTOCOMPLETE_MAX_BYTES, JQ_INPUT_MAX_BYTES } from "../../../../shared/jqPolicy";
import { useRawPayload, type PropsShape } from "../useRawPayload";

describe("useRawPayload", () => {
  it("parses payload on demand below the autocomplete threshold", async () => {
    const smallJson = JSON.stringify({ data: "a".repeat(100) });

    const props = computed<PropsShape>(() => ({
      raw: smallJson,
    }));
    const state = useRawPayload(props);
    await nextTick();
    state.ensureParsedJson();

    expect(state.parsedJson.value).not.toBeNull();
    expect((state.parsedJson.value as { data: string }).data.length).toBe(100);
  });

  it("flags payloads above 50 MB as oversized", async () => {
    const oversizedJson = JSON.stringify({ data: "a".repeat(JQ_INPUT_MAX_BYTES + 100) });
    const props = computed<PropsShape>(() => ({
      raw: oversizedJson,
    }));
    const { bodyByteLength, isOversized } = useRawPayload(props);
    await nextTick();

    expect(bodyByteLength.value).toBeGreaterThan(JQ_INPUT_MAX_BYTES);
    expect(isOversized.value).toBe(true);
  });

  it("does not flag small payloads as oversized", async () => {
    const smallJson = JSON.stringify({ data: "a".repeat(100) });
    const props = computed<PropsShape>(() => ({
      raw: smallJson,
    }));
    const { isOversized } = useRawPayload(props);
    await nextTick();

    expect(isOversized.value).toBe(false);
  });

  it("skips parsedJson for oversized payloads", async () => {
    const oversizedJson = JSON.stringify({ data: "a".repeat(JQ_INPUT_MAX_BYTES + 100) });
    const props = computed<PropsShape>(() => ({
      raw: oversizedJson,
    }));
    const state = useRawPayload(props);
    await nextTick();
    state.ensureParsedJson();

    expect(state.parsedJson.value).toBeNull();
  });

  it("skips parsedJson for payloads above 4 MB", async () => {
    const largeJson = JSON.stringify({ data: "a".repeat(JQ_AUTOCOMPLETE_MAX_BYTES + 100) });
    const props = computed<PropsShape>(() => ({
      raw: largeJson,
    }));
    const state = useRawPayload(props);
    await nextTick();
    state.ensureParsedJson();

    expect(state.parsedJson.value).toBeNull();
  });

  it("exposes an autocomplete warning above 4 MB", async () => {
    const props = computed<PropsShape>(() => ({
      raw: `{"data":"${"a".repeat(JQ_AUTOCOMPLETE_MAX_BYTES + 100)}"}`
    }));
    const { autocompleteWarning } = useRawPayload(props);
    await nextTick();

    expect(autocompleteWarning.value).toContain("Autocomplete disabled for payloads");
  });

  it("marks payloads at or above 2 MB as manual run", async () => {
    const props = computed<PropsShape>(() => ({
      raw: `{"data":"${"a".repeat(JQ_AUTO_RUN_MAX_BYTES + 100)}"}`
    }));
    const { requiresManualRun } = useRawPayload(props);
    await nextTick();

    expect(requiresManualRun.value).toBe(true);
  });

  it("does not expose an autocomplete warning for small payloads", async () => {
    const props = computed<PropsShape>(() => ({
      raw: "{\"foo\":\"bar\"}"
    }));
    const { autocompleteWarning } = useRawPayload(props);
    await nextTick();

    expect(autocompleteWarning.value).toBe("");
  });
});

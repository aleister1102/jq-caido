import { computed, ref, type ComputedRef } from "vue";
import { extractJsonBodyString } from "../lib/extractJsonBody";

export const OVERSIZED_PAYLOAD_BYTES = 50_000_000;
export const LARGE_PAYLOAD_THRESHOLD_BYTES = 25_000_000;

export type RawCarrier = { raw?: string; id?: string } | undefined;

export type PropsShape = {
  data?: RawCarrier;
  request?: RawCarrier;
  response?: RawCarrier;
  value?: RawCarrier;
  item?: RawCarrier;
  raw?: string;
};

function safePreview(text: string, max = 500): string {
  if (!text) return "";
  return text.length <= max ? text : text.slice(0, max) + `\n...[truncated ${text.length - max} chars]`;
}

function nonEmptyId(...candidates: (string | undefined)[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim();
  }
  return null;
}

export function useRawPayload(props: ComputedRef<PropsShape>) {
  const parsedJson = ref<any>(null);
  const parsedJsonSource = ref("");

  const rawCandidates = computed<Record<string, string | undefined>>(() => ({
    raw: props.value.raw,
    data: props.value.data?.raw,
    request: props.value.request?.raw,
    response: props.value.response?.raw,
    value: props.value.value?.raw,
    item: props.value.item?.raw,
  }));

  const rawInfo = computed(() => {
    for (const [key, val] of Object.entries(rawCandidates.value)) {
      if (typeof val === "string" && val.length > 0) return { raw: val, source: key };
    }
    return { raw: "", source: "" };
  });

  const selectedIds = computed(() => {
    const p = props.value;
    return {
      requestId: nonEmptyId(p.request?.id, p.data?.id, p.value?.id, p.item?.id),
      responseId: nonEmptyId(p.response?.id),
    };
  });

  const bodyText = computed(() => extractJsonBodyString(rawInfo.value.raw) ?? "");
  const isOversized = computed(() => bodyText.value.length > OVERSIZED_PAYLOAD_BYTES);
  const isLargePayload = computed(() => bodyText.value.length > LARGE_PAYLOAD_THRESHOLD_BYTES);

  const autocompleteWarning = computed(() => {
    if (!isLargePayload.value) return "";
    return `Autocomplete disabled for large payloads over ${(LARGE_PAYLOAD_THRESHOLD_BYTES / 1_000_000).toFixed(0)} MB.`;
  });

  const bodyParse = computed(() => {
    const text = bodyText.value;
    if (!text) return { ok: false, type: "(empty)", valuePreview: "" };
    return { ok: true, type: "json (unvalidated)", valuePreview: safePreview(text) };
  });

  const ensureParsedJson = () => {
    const json = bodyText.value;
    if (!json || isOversized.value || isLargePayload.value) {
      parsedJson.value = null;
      parsedJsonSource.value = "";
      return;
    }
    if (parsedJsonSource.value === json && parsedJson.value !== null) {
      return;
    }
    try {
      parsedJson.value = JSON.parse(json);
      parsedJsonSource.value = json;
    }
    catch {
      parsedJson.value = null;
      parsedJsonSource.value = "";
    }
  };

  const clearParsedJson = () => {
    parsedJson.value = null;
    parsedJsonSource.value = "";
  };

  return {
    rawCandidates,
    rawInfo,
    selectedIds,
    bodyText,
    bodyParse,
    parsedJson,
    isOversized,
    isLargePayload,
    autocompleteWarning,
    ensureParsedJson,
    clearParsedJson,
  };
}
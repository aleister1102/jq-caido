import { computed, ref, shallowRef, watch, type ComputedRef } from "vue";
import { extractJsonBodyString } from "../lib/extractJsonBody";
import {
  JQ_AUTOCOMPLETE_MAX_BYTES,
  JQ_INPUT_MAX_BYTES,
  shouldAutoRun,
  shouldEnableAutocomplete,
} from "../../../shared/jqPolicy";

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
  const encoder = new TextEncoder();
  const parsedJson = shallowRef<unknown | null>(null);
  const parsedJsonSource = ref("");
  const bodyBytes = shallowRef<Uint8Array | null>(null);
  const bodyByteLength = ref(0);

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
  const isOversized = computed(() => bodyByteLength.value > JQ_INPUT_MAX_BYTES);
  const requiresManualRun = computed(
    () => bodyByteLength.value > 0 && !isOversized.value && !shouldAutoRun(bodyByteLength.value),
  );

  const autocompleteWarning = computed(() => {
    if (shouldEnableAutocomplete(bodyByteLength.value)) return "";
    return `Autocomplete disabled for payloads over ${(JQ_AUTOCOMPLETE_MAX_BYTES / 1_000_000).toFixed(0)} MB.`;
  });

  const bodyParse = computed(() => {
    const text = bodyText.value;
    if (!text) return { ok: false, type: "(empty)", valuePreview: "" };
    return { ok: true, type: "json (unvalidated)", valuePreview: safePreview(text) };
  });

  const ensureParsedJson = () => {
    const json = bodyText.value;
    if (!json || isOversized.value || !shouldEnableAutocomplete(bodyByteLength.value)) {
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

  watch(
    bodyText,
    (json) => {
      clearParsedJson();
      if (!json) {
        bodyBytes.value = null;
        bodyByteLength.value = 0;
        return;
      }
      const encoded = encoder.encode(json);
      bodyBytes.value = encoded;
      bodyByteLength.value = encoded.byteLength;
    },
    { immediate: true },
  );

  return {
    rawCandidates,
    rawInfo,
    selectedIds,
    bodyText,
    bodyBytes,
    bodyByteLength,
    bodyParse,
    parsedJson,
    isOversized,
    requiresManualRun,
    autocompleteWarning,
    ensureParsedJson,
    clearParsedJson,
  };
}

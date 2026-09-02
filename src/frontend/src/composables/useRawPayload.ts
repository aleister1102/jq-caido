import { computed, ref, shallowRef, watch, type ComputedRef } from "vue";
import { extractContentType, isJsonContentType } from "../lib/contentType";
import { extractJsonBodyString } from "../lib/extractJsonBody";
import {
  JQ_AUTOCOMPLETE_MAX_BYTES,
  JQ_INPUT_MAX_BYTES,
  shouldAutoRun,
  shouldEnableAutocomplete,
} from "../../../shared/jqPolicy";

export type RawCarrier = { raw?: string } | undefined;

export type PropsShape = {
  data?: RawCarrier;
  request?: RawCarrier;
  response?: RawCarrier;
  value?: RawCarrier;
  item?: RawCarrier;
  raw?: string;
};

function extractFirstRaw(props: PropsShape): string {
  for (const candidate of [
    props.raw,
    props.data?.raw,
    props.request?.raw,
    props.response?.raw,
    props.value?.raw,
    props.item?.raw,
  ]) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }
  return "";
}

export function useRawPayload(props: ComputedRef<PropsShape>) {
  const encoder = new TextEncoder();
  const parsedJson = shallowRef<unknown | null>(null);
  const parsedJsonSource = ref("");
  const bodyBytes = shallowRef<Uint8Array | null>(null);
  const bodyByteLength = ref(0);
  const forcedParseSource = ref<string | null>(null);

  const rawMessage = computed(() => extractFirstRaw(props.value));
  const bodyText = computed(() => extractJsonBodyString(rawMessage.value) ?? "");
  const isOversized = computed(() => bodyByteLength.value > JQ_INPUT_MAX_BYTES);

  const contentType = computed(() => extractContentType(rawMessage.value));
  const isJsonContent = computed(() => {
    const mime = contentType.value;
    return mime === null ? null : isJsonContentType(mime);
  });
  const isForcedParse = computed(() => forcedParseSource.value === rawMessage.value);
  const isContentBlocked = computed(() => isJsonContent.value === false && !isForcedParse.value);

  const forceParse = () => {
    forcedParseSource.value = rawMessage.value;
  };

  const autocompleteWarning = computed(() => {
    if (shouldEnableAutocomplete(bodyByteLength.value)) return "";
    return `Autocomplete disabled for payloads over ${(JQ_AUTOCOMPLETE_MAX_BYTES / 1_000_000).toFixed(0)} MB.`;
  });

  const ensureParsedJson = () => {
    const json = bodyText.value;
    if (!json || isContentBlocked.value || isOversized.value || !shouldEnableAutocomplete(bodyByteLength.value)) {
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
    [bodyText, isContentBlocked],
    ([json, blocked]) => {
      clearParsedJson();
      if (!json || blocked) {
        bodyBytes.value = null;
        bodyByteLength.value = 0;
        return;
      }
      const encoded = encoder.encode(json);
      bodyByteLength.value = encoded.byteLength;
      bodyBytes.value = shouldAutoRun(encoded.byteLength) ? encoded : null;
    },
    { immediate: true },
  );

  return {
    bodyText,
    bodyBytes,
    bodyByteLength,
    parsedJson,
    isOversized,
    autocompleteWarning,
    ensureParsedJson,
    contentType,
    isContentBlocked,
    forceParse,
  };
}

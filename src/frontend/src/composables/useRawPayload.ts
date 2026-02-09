import { computed, ref, type ComputedRef } from "vue";
import { extractJsonBodyString } from "../lib/extractJsonBody";

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
  if (text.length <= max) return text;
  return text.slice(0, max) + `\n...[truncated ${text.length - max} chars]`;
}

export function useRawPayload(props: ComputedRef<PropsShape>) {
  const parsedJson = ref<any>(null);

  const rawCandidates = computed<Record<string, string | undefined>>(() => ({
    raw: props.value.raw,
    data: props.value.data?.raw,
    request: props.value.request?.raw,
    response: props.value.response?.raw,
    value: props.value.value?.raw,
    item: props.value.item?.raw,
  }));

  const rawInfo = computed(() => {
    for (const [source, raw] of Object.entries(rawCandidates.value)) {
      if (typeof raw === "string" && raw.length > 0) {
        return { raw, source };
      }
    }
    return { raw: "", source: "" };
  });

  const idCandidates = computed<Record<string, string | undefined>>(() => ({
    request: props.value.request?.id,
    response: props.value.response?.id,
    data: props.value.data?.id,
    value: props.value.value?.id,
    item: props.value.item?.id,
  }));

  const selectedIds = computed(() => {
    const requestId = Object.values({
      request: idCandidates.value.request,
      data: idCandidates.value.data,
      value: idCandidates.value.value,
      item: idCandidates.value.item,
    }).find((v) => typeof v === "string" && v.length > 0);

    const responseId = Object.values({ response: idCandidates.value.response }).find(
      (v) => typeof v === "string" && v.length > 0,
    );

    return {
      requestId: (requestId as string | undefined) ?? null,
      responseId: (responseId as string | undefined) ?? null,
    };
  });

  const bodyText = computed(() => extractJsonBodyString(rawInfo.value.raw) ?? "");

  const bodyParse = computed(() => {
    const text = bodyText.value;
    if (!text) {
      return { ok: false, type: "(empty)", valuePreview: "" };
    }
    // To avoid blocking the main thread for 10-20MB strings, we skip validation here
    // and let runJq / jq-wasm handle it.
    return { ok: true, type: "json (unvalidated)", valuePreview: safePreview(text, 500) };
  });

  const updateParsedJson = (json: string) => {
    if (!json || json.length > 5_000_000) {
      parsedJson.value = null;
      return;
    }
    try {
      parsedJson.value = JSON.parse(json);
    } catch {
      parsedJson.value = null;
    }
  };

  return {
    rawCandidates,
    rawInfo,
    idCandidates,
    selectedIds,
    bodyText,
    bodyParse,
    parsedJson,
    updateParsedJson,
  };
}

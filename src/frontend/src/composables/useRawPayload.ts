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
  return text.length <= max ? text : text.slice(0, max) + `\n...[truncated ${text.length - max} chars]`;
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
      if (typeof raw === "string" && raw.length > 0) return { raw, source };
    }
    return { raw: "", source: "" };
  });

  const selectedIds = computed(() => {
    const p = props.value;
    return {
      requestId: p.request?.id || p.data?.id || p.value?.id || p.item?.id || null,
      responseId: p.response?.id || null,
    };
  });

  const bodyText = computed(() => extractJsonBodyString(rawInfo.value.raw) ?? "");

  const bodyParse = computed(() => {
    const text = bodyText.value;
    if (!text) return { ok: false, type: "(empty)", valuePreview: "" };
    return { ok: true, type: "json (unvalidated)", valuePreview: safePreview(text) };
  });

  const updateParsedJson = (json: string) => {
    if (!json || json.length > 5_000_000) { parsedJson.value = null; return; }
    try { parsedJson.value = JSON.parse(json); }
    catch { parsedJson.value = null; }
  };

  return { rawCandidates, rawInfo, selectedIds, bodyText, bodyParse, parsedJson, updateParsedJson };
}

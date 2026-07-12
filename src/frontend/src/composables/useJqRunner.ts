import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref, type ShallowRef } from "vue";
import type { JqEnginePreference, JqExecutionResult, NativeJqAvailability } from "../../../shared/jqContract";
import {
  JQ_FILTER_NULLS_MAX_BYTES,
  JQ_INPUT_MAX_BYTES,
  shouldAutoRun,
  shouldPreferNative,
} from "../../../shared/jqPolicy";
import { formatBytes } from "../lib/formatBytes";
import { cancelActiveJqRun, getNativeJqAvailability, runJq } from "../lib/runJq";

export function buildEffectiveQuery(
  query: string,
  keysOnly: boolean,
  filterNulls: boolean,
  inputBytes: number,
): string {
  let effectiveQuery = query || ".";
  if (keysOnly) {
    effectiveQuery = `(${effectiveQuery}) | keys`;
  }
  if (filterNulls && inputBytes <= JQ_FILTER_NULLS_MAX_BYTES) {
    effectiveQuery = `(${effectiveQuery}) | walk(if type == "object" then with_entries(select(.value != null)) else . end)`;
  }
  return effectiveQuery;
}

export function useJqRunner(
  bodyText: ComputedRef<string>,
  bodyBytes: ShallowRef<Uint8Array | null>,
  bodyByteLength: Ref<number>,
  query: Ref<string>,
  isCompact: Ref<boolean>,
  isRaw: Ref<boolean>,
  keysOnly: Ref<boolean>,
  filterNulls: Ref<boolean>,
  isOversized: ComputedRef<boolean>,
) {
  const result = ref<JqExecutionResult | null>(null);
  const statusText = ref("");
  const isLoading = ref(false);
  const enginePreference = ref<JqEnginePreference>("automatic");
  const nativeAvailability = ref<NativeJqAvailability>({
    available: false,
    version: null,
    reason: null,
  });

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;

  const stdout = computed(() => result.value?.stdout ?? "");
  const stderr = computed(() => {
    const parts: string[] = [];
    if (statusText.value) {
      parts.push(statusText.value);
    }
    if (result.value?.stderrTruncated) {
      parts.push("Stderr truncated to 64 KiB.");
    }
    if (filterNulls.value && bodyByteLength.value > JQ_FILTER_NULLS_MAX_BYTES) {
      parts.push(
        `Warning: No Nulls is disabled for payloads over ${Math.round(JQ_FILTER_NULLS_MAX_BYTES / 1_000_000)} MB because walk() is too slow.`,
      );
    }
    return parts.join("\n");
  });
  const canRun = computed(() => bodyByteLength.value > 0 && !isOversized.value && bodyBytes.value !== null);
  const requiresManualRun = computed(() => canRun.value && !shouldAutoRun(bodyByteLength.value));

  const setIdleState = () => {
    result.value = null;
    isLoading.value = false;

    if (isOversized.value) {
      statusText.value = `Payload too large (> ${Math.round(JQ_INPUT_MAX_BYTES / 1_000_000)} MB) - jq is disabled.`;
      return;
    }

    if (!bodyText.value || bodyBytes.value === null) {
      statusText.value = "Error: No content provided to this view mode.";
      return;
    }

    if (requiresManualRun.value) {
      statusText.value = `Payload is ${formatBytes(bodyByteLength.value)}. Press Run to execute jq.`;
      return;
    }

    statusText.value = "";
  };

  const refreshNativeAvailability = async (forceRefresh = false) => {
    nativeAvailability.value = await getNativeJqAvailability(forceRefresh);
  };

  const executeJqInternal = async (runGeneration: number) => {
    if (!bodyText.value || bodyBytes.value === null) {
      setIdleState();
      return;
    }

    isLoading.value = true;
    statusText.value = "";

    const flags: ("-c" | "-r")[] = [];
    if (isCompact.value) flags.push("-c");
    if (isRaw.value) flags.push("-r");

    const nextResult = await runJq({
      bodyText: bodyText.value,
      bodyBytes: bodyBytes.value,
      query: buildEffectiveQuery(query.value, keysOnly.value, filterNulls.value, bodyByteLength.value),
      flags,
      enginePreference: enginePreference.value,
    });

    if (runGeneration !== generation) {
      return;
    }

    result.value = nextResult;
    if (nextResult.stderr) {
      statusText.value = nextResult.stderr;
    } else if (nextResult.exitCode !== 0 && !nextResult.cancelled) {
      statusText.value = `Error: jq exited with code ${nextResult.exitCode}`;
    } else {
      statusText.value = "";
    }
    isLoading.value = false;
  };

  const executeJq = async () => {
    generation += 1;
    const runGeneration = generation;
    await executeJqInternal(runGeneration);
  };

  const resetForInputChange = () => {
    generation += 1;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    void cancelActiveJqRun();
    setIdleState();
  };

  const executeJqDebounced = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      generation += 1;
      const runGeneration = generation;
      void executeJqInternal(runGeneration);
    }, 300);
  };

  void refreshNativeAvailability();

  onScopeDispose(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    generation += 1;
    void cancelActiveJqRun();
  });

  watch(
    [enginePreference, bodyByteLength],
    ([nextEngine, nextBytes]) => {
      if (nextEngine === "native" || shouldPreferNative(nextBytes)) {
        void refreshNativeAvailability(nextEngine === "native");
      }
    },
    { immediate: true },
  );

  watch(
    [bodyText, bodyByteLength, isCompact, isRaw, keysOnly, filterNulls, enginePreference],
    () => {
      resetForInputChange();
      if (!requiresManualRun.value && canRun.value) {
        generation += 1;
        const runGeneration = generation;
        void executeJqInternal(runGeneration);
      }
    },
    { immediate: true },
  );

  watch(
    () => query.value,
    () => {
      resetForInputChange();
      if (!requiresManualRun.value && canRun.value) {
        executeJqDebounced();
      }
    },
  );

  return {
    result,
    stdout,
    stderr,
    isLoading,
    canRun,
    requiresManualRun,
    enginePreference,
    nativeAvailability,
    executeJq,
  };
}

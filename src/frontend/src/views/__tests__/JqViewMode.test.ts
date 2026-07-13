import { mount } from "@vue/test-utils";
import { computed, ref, shallowRef } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const result = ref<{
  exitCode: number;
} | null>(null);
const stderr = ref("");

vi.mock("../../composables/useSettings", () => ({
  useSettings: () => ({
    isCompact: ref(false),
    isRaw: ref(false),
    keysOnly: ref(false),
    filterNulls: ref(false),
    loadSettings: vi.fn(),
    saveSettings: vi.fn(),
  }),
}));

vi.mock("../../composables/useRawPayload", () => ({
  useRawPayload: () => ({
    bodyText: computed(() => "{}"),
    bodyBytes: shallowRef(new TextEncoder().encode("{}")),
    bodyByteLength: ref(2),
    parsedJson: shallowRef({}),
    isOversized: computed(() => false),
    autocompleteWarning: computed(() => ""),
    ensureParsedJson: vi.fn(),
  }),
}));

vi.mock("../../composables/useJqRunner", () => ({
  useJqRunner: () => ({
    result,
    stdout: computed(() => ""),
    stderr,
    isLoading: ref(false),
    canRun: computed(() => true),
    requiresManualRun: computed(() => false),
    enginePreference: ref("automatic"),
    nativeAvailability: ref({
      available: true,
      version: "jq-1.8.2",
      reason: null,
    }),
    executeJq: vi.fn(),
  }),
}));

vi.mock("../../composables/useOutputDisplay", () => ({
  useOutputDisplay: () => ({
    displayOutput: ref(""),
    shouldHighlight: ref(false),
    statusMessage: ref(""),
  }),
}));

vi.mock("../../lib/clipboard", () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../components/JqQueryInput.vue", () => ({
  default: {
    template: "<div />",
  },
}));

vi.mock("../../components/JqOutputPanel.vue", () => ({
  default: {
    template: "<div />",
  },
}));

describe("JqViewMode", () => {
  beforeEach(() => {
    result.value = null;
    stderr.value = "";
  });

  it("renders successful stderr as a warning instead of an error", async () => {
    result.value = { exitCode: 0 };
    stderr.value = "Warning: Native jq is unavailable on the Caido backend host.";
    const { default: JqViewMode } = await import("../JqViewMode.vue");
    const wrapper = mount(JqViewMode, {
      props: {
        raw: "{}",
      },
    });

    const panel = wrapper.get('[data-testid="jq-status-panel"]');
    expect(panel.classes()).toContain("bg-amber-900/20");
    expect(panel.classes()).not.toContain("bg-red-900/20");
  });

  it("keeps failing stderr in the error styling", async () => {
    result.value = { exitCode: 1 };
    stderr.value = "jq parse error";
    const { default: JqViewMode } = await import("../JqViewMode.vue");
    const wrapper = mount(JqViewMode, {
      props: {
        raw: "{}",
      },
    });

    const panel = wrapper.get('[data-testid="jq-status-panel"]');
    expect(panel.classes()).toContain("bg-red-900/20");
  });
});

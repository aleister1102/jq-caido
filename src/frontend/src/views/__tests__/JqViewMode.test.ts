import { mount } from "@vue/test-utils";
import { computed, ref, shallowRef } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const result = ref<{
  exitCode: number;
} | null>(null);
const stderr = ref("");
const isLoading = ref(false);

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
    contentType: computed(() => "application/json"),
    isContentBlocked: computed(() => false),
    forceParse: vi.fn(),
  }),
}));

vi.mock("../../composables/useJqRunner", () => ({
  useJqRunner: () => ({
    result,
    stdout: computed(() => ""),
    stderr,
    isLoading,
    canRun: computed(() => true),
    requiresManualRun: computed(() => false),
    enginePreference: ref("jq-wasm"),
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
    template: "<div data-testid=\"jq-query-input\" />",
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
    isLoading.value = false;
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
    expect(panel.classes()).toContain("is-warning");
    expect(panel.classes()).not.toContain("is-error");
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
    expect(panel.classes()).toContain("is-error");
  });

  it("renders query row and controls row as distinct siblings in order", async () => {
    const { default: JqViewMode } = await import("../JqViewMode.vue");
    const wrapper = mount(JqViewMode, {
      props: {
        raw: "{}",
      },
    });

    const queryRow = wrapper.find(".jq-query-row");
    const controlsRow = wrapper.find(".jq-controls-row");
    expect(queryRow.exists()).toBe(true);
    expect(controlsRow.exists()).toBe(true);

    const queryInput = queryRow.find('[data-testid="jq-query-input"]');
    expect(queryInput.exists()).toBe(true);
    expect(queryRow.element.children).toHaveLength(1);
    expect(queryRow.element.firstElementChild).toBe(queryInput.element);

    const parent = queryRow.element.parentElement;
    expect(parent).not.toBeNull();
    if (parent) {
      const rows = Array.from(parent.children);
      const queryIndex = rows.indexOf(queryRow.element);
      const controlsIndex = rows.indexOf(controlsRow.element);
      expect(queryIndex).toBeGreaterThan(-1);
      expect(controlsIndex).toBeGreaterThan(-1);
      expect(queryIndex).toBeLessThan(controlsIndex);
    }

    expect(controlsRow.classes()).toContain("flex-wrap");
    expect(controlsRow.classes()).toContain("justify-between");
    expect(controlsRow.find('[data-testid="jq-query-actions"]').exists()).toBe(true);
    expect(controlsRow.find('[data-testid="jq-engine-controls"]').exists()).toBe(true);
    expect(controlsRow.find('[data-testid="jq-output-options"]').exists()).toBe(true);
    const controlButtons = controlsRow.findAll("button");
    const controlButtonLabels = controlButtons.map((button) => button.text().trim());
    expect(controlButtonLabels).toContain("Run");
    expect(controlButtonLabels).toContain("Copy query");
  });
});

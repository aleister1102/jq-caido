import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import JqOutputPanel from "../JqOutputPanel.vue";

describe("JqOutputPanel", () => {
    const baseProps = {
        stdout: "output text",
        displayOutput: "output text",
        shouldHighlight: false,
        enginePreference: "automatic" as const,
        resultEngine: "native" as const,
        resultHost: "caido-backend-host" as const,
        inputBytes: 1024,
        stdoutBytes: 11,
        durationMs: 12,
        isOutputTruncated: false,
        isStderrTruncated: false,
        isLoading: false,
        outputCopied: false,
        hasRun: true,
        requiresManualRun: false,
        outputStatus: "",
    };

    it("renders the actual result engine and host after a run", () => {
        const wrapper = mount(JqOutputPanel, {
            props: {
                ...baseProps,
            },
        });

        expect(wrapper.text()).toContain("Engine:");
        expect(wrapper.text()).toContain("Native jq");
        expect(wrapper.text()).toContain("Host:");
        expect(wrapper.text()).toContain("caido-backend-host");
        expect(wrapper.text()).toContain("Time:");
    });

    it("shows the selected preference before any result exists", () => {
        const wrapper = mount(JqOutputPanel, {
            props: {
                ...baseProps,
                hasRun: false,
                resultEngine: null,
                resultHost: null,
            },
        });

        expect(wrapper.text()).toContain("Mode:");
        expect(wrapper.text()).toContain("Automatic");
        expect(wrapper.text()).not.toContain("Host:");
    });

    it("renders truncated copy text when output is capped", () => {
        const wrapper = mount(JqOutputPanel, {
            props: {
                ...baseProps,
                isOutputTruncated: true,
            },
        });

        expect(wrapper.text()).toContain("Copy Truncated Output");
    });

    it("shows copied state when outputCopied is true", () => {
        const wrapper = mount(JqOutputPanel, {
            props: {
                ...baseProps,
                outputCopied: true,
            },
        });

        expect(wrapper.text()).toContain("Copied");
        expect(wrapper.text()).toContain("✓");
    });

    it("shows stderr truncation and output status badges", () => {
        const wrapper = mount(JqOutputPanel, {
            props: {
                ...baseProps,
                isStderrTruncated: true,
                outputStatus: "Highlighting disabled for large output.",
            },
        });

        expect(wrapper.text()).toContain("Stderr truncated");
        expect(wrapper.text()).toContain("Highlighting disabled for large output.");
    });

    it("emits copy event when copy button clicked", async () => {
        const wrapper = mount(JqOutputPanel, {
            props: {
                ...baseProps,
            },
        });

        const copyButton = wrapper.find("button");
        await copyButton.trigger("click");
        expect(wrapper.emitted("copy")).toHaveLength(1);
    });
});

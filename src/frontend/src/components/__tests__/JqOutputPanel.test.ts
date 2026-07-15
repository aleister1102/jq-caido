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

        expect(wrapper.text()).toContain("Engine");
        expect(wrapper.text()).toContain("Native jq");
        expect(wrapper.text()).toContain("Mode");
        expect(wrapper.text()).toContain("Auto-select");
        expect(wrapper.text()).toContain("Host");
        expect(wrapper.text()).toContain("Caido backend");
        expect(wrapper.text()).toContain("Time");
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

        expect(wrapper.text()).toContain("Mode");
        expect(wrapper.text()).toContain("Auto-select");
        expect(wrapper.text()).toContain("Engine");
        expect(wrapper.text()).toContain("Not run");
        expect(wrapper.findAll(".jq-stat")).toHaveLength(6);
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

    it("does not add template indentation to output", () => {
        const displayOutput = '{\n  "enabled": true\n}';
        const wrapper = mount(JqOutputPanel, {
            props: {
                ...baseProps,
                displayOutput,
            },
        });

        expect(wrapper.get("pre").element.textContent).toBe(displayOutput);
    });

    it("places readable stats and copy action in a footer below the output", () => {
        const wrapper = mount(JqOutputPanel, {
            props: {
                ...baseProps,
            },
        });

        const footer = wrapper.get('[data-testid="jq-output-footer"]');
        expect(footer.classes()).toContain("items-center");
        expect(wrapper.get("pre").element.nextElementSibling).toBe(footer.element);
        const stats = footer.get('[data-testid="jq-output-stats"]');
        expect(stats.classes()).toContain("jq-output-stats");
        expect(stats.classes()).not.toContain("grid");
        expect(stats.classes()).not.toContain("uppercase");
        const copyButton = footer.get("button");
        expect(copyButton.classes()).toContain("shrink-0");
        expect(copyButton.classes()).toContain("jq-copy-output");
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

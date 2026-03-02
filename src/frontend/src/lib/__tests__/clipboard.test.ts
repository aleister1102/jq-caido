import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copyToClipboard } from "../clipboard";

describe("clipboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true on successful clipboard write", async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard("test text");

    expect(result).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith("test text");
  });

  it("returns false when clipboard write fails and fallback also fails", async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error("Clipboard error"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    const originalExecCommand = document.execCommand;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      document.execCommand = vi.fn().mockReturnValue(false);

      const result = await copyToClipboard("test text");

      expect(result).toBe(false);
    } finally {
      document.execCommand = originalExecCommand;
    }
  });

  it("returns true on successful fallback execCommand", async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error("Clipboard error"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    const originalExecCommand = document.execCommand;
    try {
      document.execCommand = vi.fn().mockReturnValue(true);

      const result = await copyToClipboard("test text");

      expect(result).toBe(true);
    } finally {
      document.execCommand = originalExecCommand;
    }
  });
});


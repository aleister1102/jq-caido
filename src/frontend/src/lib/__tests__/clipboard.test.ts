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

  it("returns false when clipboard write fails", async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error("Clipboard error"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard("test text");

    expect(result).toBe(false);
  });

  it("returns false when Clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard("test text");

    expect(result).toBe(false);
  });
});


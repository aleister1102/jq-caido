import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copyToClipboard } from "../clipboard";

describe("clipboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
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

    // Mock document.execCommand to return false
    const originalExecCommand = document.execCommand;
    document.execCommand = vi.fn().mockReturnValue(false);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await copyToClipboard("test text");

    expect(result).toBe(false);
    
    // Restore original
    (document.execCommand as any) = originalExecCommand;
  });

  it("returns true on successful fallback execCommand", async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error("Clipboard error"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    // Mock document.execCommand to return true
    const originalExecCommand = document.execCommand;
    document.execCommand = vi.fn().mockReturnValue(true);

    const result = await copyToClipboard("test text");

    expect(result).toBe(true);
    
    // Restore original
    (document.execCommand as any) = originalExecCommand;
  });
});


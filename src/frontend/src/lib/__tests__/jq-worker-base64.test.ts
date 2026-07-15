import { describe, expect, it, vi } from "vitest";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Uint8ArrayWithFromBase64 = typeof Uint8Array & {
  fromBase64?: (base64: string, options?: { alphabet?: string }) => Uint8Array;
};

const restoreDescriptor = function (
  target: object,
  key: PropertyKey,
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(target, key, descriptor);
    return;
  }

  Reflect.deleteProperty(target as Record<PropertyKey, unknown>, key);
};

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

describe("jq-worker-base64", function () {
  it("decodes base64 without Buffer or a pre-existing Uint8Array.fromBase64", async function () {
    const childPath = path.join(moduleDir, "jq-worker-base64.no-buffer.child.ts");
    const { stdout, stderr, exitCode } = await new Promise<{
      stdout: string;
      stderr: string;
      exitCode: number | null;
    }>((resolve, reject) => {
      const proc = spawn("bun", ["run", childPath], { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (chunk) => (stdout += chunk));
      proc.stderr.on("data", (chunk) => (stderr += chunk));
      proc.on("error", reject);
      proc.on("close", (exitCode) => resolve({ stdout, stderr, exitCode }));
    });

    expect(exitCode, stderr).toBe(0);
    expect(JSON.parse(stdout)).toEqual([0, 97, 115, 109]);
  });

  it("does not overwrite an existing Uint8Array.fromBase64", async function () {
    const fromBase64Descriptor = Object.getOwnPropertyDescriptor(Uint8Array, "fromBase64");
    const sentinel = function (base64: string) {
      return new Uint8Array([base64.length]);
    };

    try {
      Object.defineProperty(Uint8Array, "fromBase64", {
        configurable: true,
        writable: true,
        value: sentinel,
      });

      vi.resetModules();
      await import("../jq.worker.base64");

      expect((Uint8Array as Uint8ArrayWithFromBase64).fromBase64).toBe(sentinel);
    } finally {
      restoreDescriptor(Uint8Array, "fromBase64", fromBase64Descriptor);
    }
  });
});

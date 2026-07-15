import { describe, expect, it } from "vitest";
import { installBase64Polyfill } from "../jq.worker.base64";

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

describe("jq-worker-base64", function () {
  it("decodes base64 without Buffer or a pre-existing Uint8Array.fromBase64", function () {
    const bufferDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Buffer");
    const fromBase64Descriptor = Object.getOwnPropertyDescriptor(Uint8Array, "fromBase64");

    let decoded: number[];
    try {
      Reflect.deleteProperty(globalThis as Record<PropertyKey, unknown>, "Buffer");
      Reflect.deleteProperty(Uint8Array, "fromBase64");

      installBase64Polyfill();

      decoded = Array.from((Uint8Array as Uint8ArrayWithFromBase64).fromBase64!("AGFzbQ=="));
    } finally {
      restoreDescriptor(globalThis, "Buffer", bufferDescriptor);
      restoreDescriptor(Uint8Array, "fromBase64", fromBase64Descriptor);
    }

    expect(decoded).toEqual([0, 97, 115, 109]);
  });

  it("does not overwrite an existing Uint8Array.fromBase64", function () {
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

      installBase64Polyfill();

      expect((Uint8Array as Uint8ArrayWithFromBase64).fromBase64).toBe(sentinel);
    } finally {
      restoreDescriptor(Uint8Array, "fromBase64", fromBase64Descriptor);
    }
  });
});

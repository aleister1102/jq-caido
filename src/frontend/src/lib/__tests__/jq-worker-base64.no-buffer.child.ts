const globalRecord = globalThis as Record<PropertyKey, unknown>;
const bufferDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Buffer");
const fromBase64Descriptor = Object.getOwnPropertyDescriptor(Uint8Array, "fromBase64");

Reflect.deleteProperty(globalRecord, "Buffer");
Reflect.deleteProperty(Uint8Array, "fromBase64");

await import("../jq.worker.base64");

const fromBase64 = (Uint8Array as typeof Uint8Array & {
  fromBase64?: (base64: string) => Uint8Array;
}).fromBase64!;
const decoded = Array.from(fromBase64("AGFzbQ=="));

if (bufferDescriptor) Object.defineProperty(globalThis, "Buffer", bufferDescriptor);
if (fromBase64Descriptor) Object.defineProperty(Uint8Array, "fromBase64", fromBase64Descriptor);

process.stdout.write(JSON.stringify(decoded));

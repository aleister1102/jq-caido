const encoder = new TextEncoder();

export function byteLengthOfText(text: string): number {
  return encoder.encode(text).byteLength;
}

export function encodeTextForTransfer(text: string, maxBytes: number): {
  buffer: ArrayBuffer;
  bytes: number;
  truncated: boolean;
} {
  const output = new Uint8Array(maxBytes);
  const { read, written } = encoder.encodeInto(text, output);
  return {
    buffer: output.buffer.slice(0, written),
    bytes: written,
    truncated: read < text.length,
  };
}

export function concatByteChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

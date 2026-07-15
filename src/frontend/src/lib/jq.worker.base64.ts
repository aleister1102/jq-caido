type Uint8ArrayWithFromBase64 = typeof Uint8Array & {
  fromBase64?: (base64: string, options?: { alphabet?: string }) => Uint8Array;
};

const decodeBase64 = (base64: string): Uint8Array => {
  const decoded = atob(base64);
  const output = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i += 1) {
    output[i] = decoded.charCodeAt(i);
  }
  return output;
};

if (!(Uint8Array as Uint8ArrayWithFromBase64).fromBase64) {
  (Uint8Array as Uint8ArrayWithFromBase64).fromBase64 = (base64: string) => decodeBase64(base64);
}

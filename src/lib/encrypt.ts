// WebCrypto AES-GCM with PBKDF2 password derivation. Browser-only.

const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(password: string, salt: BufferSource) {
  const pwdBytes = enc.encode(password);
  const baseKey = await crypto.subtle.importKey("raw", pwdBytes as unknown as BufferSource, "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 200_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function toB64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromB64(s: string) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptJson(data: unknown, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt as unknown as BufferSource);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      key,
      enc.encode(JSON.stringify(data)) as unknown as BufferSource,
    ),
  );
  return JSON.stringify({ v: 1, salt: toB64(salt), iv: toB64(iv), ct: toB64(ct) });
}

export async function decryptJson<T = unknown>(payload: string, password: string): Promise<T> {
  const { salt, iv, ct } = JSON.parse(payload);
  const key = await deriveKey(password, fromB64(salt) as unknown as BufferSource);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(iv) as unknown as BufferSource },
    key,
    fromB64(ct) as unknown as BufferSource,
  );
  return JSON.parse(dec.decode(pt));
}

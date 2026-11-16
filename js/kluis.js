// Versleuteling met een wachtwoord (AES-GCM, sleutel via PBKDF2-SHA256).
// Werkt in de browser én in Node 20+ (GitHub Actions), want beide hebben Web Crypto.

const ITERATIES = 310000;
const enc = new TextEncoder();
const dec = new TextDecoder();

function naarBase64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function vanBase64(tekst) {
  const s = atob(tekst);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function sleutel(wachtwoord, zout, iteraties) {
  const basis = await crypto.subtle.importKey("raw", enc.encode(wachtwoord), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: zout, iterations: iteraties, hash: "SHA-256" },
    basis,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function versleutel(data, wachtwoord) {
  const zout = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await sleutel(wachtwoord, zout, ITERATIES);
  const geheim = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, enc.encode(JSON.stringify(data)));
  return {
    v: 1,
    alg: "AES-GCM/PBKDF2-SHA256",
    iter: ITERATIES,
    zout: naarBase64(zout),
    iv: naarBase64(iv),
    data: naarBase64(new Uint8Array(geheim)),
  };
}

export async function ontsleutel(pakket, wachtwoord) {
  const k = await sleutel(wachtwoord, vanBase64(pakket.zout), pakket.iter || ITERATIES);
  const open = await crypto.subtle.decrypt({ name: "AES-GCM", iv: vanBase64(pakket.iv) }, k, vanBase64(pakket.data));
  return JSON.parse(dec.decode(open));
}

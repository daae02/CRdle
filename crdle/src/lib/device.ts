const KEY = "crdle_device_id";
let cachedId: string | null = null;

function uuidv4() {
  // crypto.randomUUID() existe en browsers modernos
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();

  // fallback simple
  const s: string[] = [];
  const hex = "0123456789abcdef";
  for (let i = 0; i < 36; i++) s.push(hex[Math.floor(Math.random() * 16)]);
  s[14] = "4";
  // @ts-ignore
  s[19] = hex[(parseInt(s[19], 16) & 0x3) | 0x8];
  s[8] = s[13] = s[18] = s[23] = "-";
  return s.join("");
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  // 400 dias ~ 1.1 años
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 400).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getDeviceId() {
  if (cachedId) return cachedId;

  // 1) localStorage
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      cachedId = stored;
      return cachedId;
    }
  } catch {
    // ignore
  }

  // 2) cookie fallback (por si localStorage falla o está bloqueado)
  const fromCookie = readCookie(KEY);
  if (fromCookie) {
    cachedId = fromCookie;
    try {
      localStorage.setItem(KEY, cachedId);
    } catch {
      // ignore
    }
    return cachedId;
  }

  // 3) generar uno y persistir en ambos si es posible
  const id = uuidv4();
  cachedId = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // ignore
  }
  writeCookie(KEY, id);
  return cachedId;
}

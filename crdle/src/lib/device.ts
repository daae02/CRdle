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
  const value = m ? decodeURIComponent(m[1]) : null;
  console.debug("[device] readCookie", { name, value });
  return value;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  // 400 dias ~ 1.1 a?os
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 400).toUTCString();
  console.debug("[device] writeCookie", { name, value, expires });
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getDeviceId() {
  if (cachedId) return cachedId;

  // 1) localStorage
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      console.debug("[device] found in localStorage", stored);
      cachedId = stored;
      return cachedId;
    }
    console.debug("[device] not found in localStorage");
  } catch {
    // ignore
  }

  // 2) cookie fallback (por si localStorage falla o est? bloqueado)
  const fromCookie = readCookie(KEY);
  if (fromCookie) {
    console.debug("[device] found in cookie", fromCookie);
    cachedId = fromCookie;
    try {
      localStorage.setItem(KEY, cachedId);
      console.debug("[device] persisted cookie value into localStorage");
    } catch {
      // ignore
    }
    return cachedId;
  }

  // 3) generar uno y persistir en ambos si es posible
  const id = uuidv4();
  console.debug("[device] generated new id", id);
  cachedId = id;
  try {
    localStorage.setItem(KEY, id);
    console.debug("[device] saved id to localStorage");
  } catch {
    // ignore
  }
  writeCookie(KEY, id);
  console.debug("[device] saved id to cookie");
  return cachedId;
}
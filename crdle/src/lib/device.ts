const KEY = "crdle_device_id";

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

export function getDeviceId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(KEY, id);
  }
  return id;
}

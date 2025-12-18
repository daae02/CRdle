export type Status2 = "GREEN" | "RED";
export type Status3 = "GREEN" | "YELLOW" | "RED";
export type Arrow = "UP" | "DOWN" | null;

export type CantonLite = {
  id: string;          // UUID
  provincia: string;
  canton: string;
};

export type TodayLite = { puzzle_id: string; puzzle_date: string };

export type CheckGuessResp = {
  correct: boolean;
  attempt: number;

  guess: {
    canton_id: string;  // UUID
    canton: string;
    provincia: string;
  };

  qual: {
    provincia: { status: Status2 };
  };

  quant: {
    cantidad_distritos: { status: Status2; arrow: Arrow; guess_value: number | null };
    area_km2: { status: Status2; arrow: Arrow; guess_value: number | null };
    altitud_msnm: { status: Status2; arrow: Arrow; guess_value: number | null };
    poblacion_2022: { status: Status2; arrow: Arrow; guess_value: number | null };
    idh_2020: { status: Status2; arrow: Arrow; guess_value: number | null };
  };

  colors: {
    status: Status3;
    common: string[];
    guess_total?: number;
    solution_total?: number;
  };
};

type CanPlayResp = { can_play: boolean; already_won?: boolean };
type EnsureSessionResp = { session_id: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function assertEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env");
  }
}

async function callFn<T>(fn: string, body: any): Promise<T> {
  assertEnv();

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: SUPABASE_ANON!,
      authorization: `Bearer ${SUPABASE_ANON!}`,
    },
    body: JSON.stringify(body ?? {}),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // si vino html / texto
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return (json ?? ({} as any)) as T;
}

export async function getToday() {
  return callFn<TodayLite>("get-today", {});
}

export async function listCantons() {
  return callFn<CantonLite[]>("list-cantons", {});
}

export async function canPlay(puzzle_id: string, device_id: string) {
  return callFn<CanPlayResp>("can-play", { puzzle_id, device_id });
}

export async function ensureSession(puzzle_id: string, device_id: string) {
  // IMPORTANTE: start-game no debe marcar el device como “jugó”.
  // Solo crea game_sessions (y lo que ocupés para guesses).
  return callFn<EnsureSessionResp>("start-game", { puzzle_id, device_id });
}

export async function checkGuess(session_id: string, guess_canton_id: string) {
  // guess_canton_id = UUID string
  return callFn<CheckGuessResp>("check-guess", { session_id, guess_canton_id });
}

export async function markWin(args: {
  puzzle_id: string;
  device_id: string;
  session_id?: string;
  attempts?: number;
}) {
  // Edge function: mark-win
  return callFn<{ ok: true }>("mark-win", args);
}


export type LBRow = {
  puzzle_id?: string;
  canton_id?: string;
  nick: string | null;
  attempts: number | null;
  duration_ms: number | null;
  created_at: string;
  rn: number;
};

export type Leaderboards = {
  puzzle_top3_time: LBRow[];
  puzzle_top3_attempts: LBRow[];
  canton_top3_time: LBRow[];
  canton_top3_attempts: LBRow[];
};

export type ClaimNickResp = {
  ok: boolean;
  nick_applied: boolean;
  nick_error: string | null;
  puzzle_id: string;
  canton_id: string;
  leaderboards: Leaderboards;
};

export async function claimNick(args: { result_id: string; nick: string }) {
  return callFn<ClaimNickResp>("claim-nick", args);
}

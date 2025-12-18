import { useEffect, useMemo, useState, type CSSProperties } from "react";
import bgImg from "./assets/bg.jpg";
import { getDeviceId } from "./lib/device";
import {
  canPlay,
  checkGuess,
  ensureSession,
  getToday,
  listCantons,
  markWin,
  claimNick,
} from "./lib/api";
import type {
  CheckGuessResp,
  CantonLite,
  ClaimNickResp,
  LBRow,
} from "./lib/api";

type TodayLite = { puzzle_id: string; puzzle_date: string };
type Status2 = "GREEN" | "RED";
type Status3 = "GREEN" | "YELLOW" | "RED";
type Arrow = "UP" | "DOWN" | null;

export default function App() {
  const [today, setToday] = useState<TodayLite | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [won, setWon] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [cantons, setCantons] = useState<CantonLite[]>([]);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<CheckGuessResp[]>([]);

  // win modal + nick + leaderboards
  const [showWinModal, setShowWinModal] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);

  const [nick, setNick] = useState("");
  const [savingNick, setSavingNick] = useState(false);
  const [claimResp, setClaimResp] = useState<ClaimNickResp | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);

        const t = await getToday();
        setToday(t);

        const device_id = getDeviceId();
        const cp = await canPlay(t.puzzle_id, device_id);
        setBlocked(!cp.can_play);
        setWon(Boolean(cp.already_won));

        const c = await listCantons();
        setCantons(c);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, []);

  const usedIds = useMemo(() => new Set(history.map((h) => h.guess.canton_id)), [history]);

  const suggestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    const base = cantons.filter((c) => !usedIds.has(c.id));
    if (!term) return [];
    return base
      .filter((c) => `${c.provincia} ${c.canton}`.toLowerCase().includes(term))
      .slice(0, 12);
  }, [query, cantons, usedIds]);

  async function onGuess(pick?: CantonLite) {
    try {
      setErr(null);
      setSubmitting(true);
      if (blocked) return;
      if (!today) return;

      const choice = pick ?? suggestions[0];
      if (!choice) {
        setErr("Elegí un cantón de la lista.");
        return;
      }

      if (usedIds.has(choice.id)) {
        setErr("Ese cantón ya lo usaste en esta partida.");
        return;
      }

      setQuery("");

      let sid = sessionId;
      if (!sid) {
        const es = await ensureSession(today.puzzle_id, getDeviceId());
        sid = es.session_id;
        setSessionId(sid);
      }

      const resp = await checkGuess(sid, choice.id);
      setHistory((prev) => [resp, ...prev]);

      if (resp.correct) {
        setWon(true);
        setBlocked(true);

        // marcar win y obtener result_id para claim-nick
        // 👇 IMPORTANTE: markWin debe devolver { ok:true, result_id:"..." }
        const win = await markWin({
          puzzle_id: today.puzzle_id,
          device_id: getDeviceId(),
          session_id: sid,
          attempts: resp.attempt,
        });

        // si tu markWin no devuelve result_id, te va a quedar null
        const rid = (win as any)?.result_id ?? null;
        setResultId(rid);

        setShowWinModal(true);
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onClaimNick() {
    try {
      setErr(null);
      setSavingNick(true);
      if (!resultId) {
        setErr("No tengo result_id para guardar el nick. Hacé que mark-win devuelva result_id.");
        return;
      }

      const resp = await claimNick({ result_id: resultId, nick });
      setClaimResp(resp);

      if (!resp.nick_applied && resp.nick_error) {
        setErr(resp.nick_error);
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSavingNick(false);
    }
  }

  if (err && !today) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>
        <h1>CRdle</h1>
        <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#fff", padding: 12, borderRadius: 8 }}>
          {err}
        </pre>
      </div>
    );
  }

  const firstSuggestion = suggestions[0];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${bgImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        padding: 16,
        fontFamily: "system-ui",
      }}
    >
      <style>
        {`@keyframes tileIn {
            from { opacity: 0; transform: translateY(6px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }`}
      </style>

      {/* WIN MODAL */}
      {showWinModal ? (
        <div style={overlay} onClick={() => setShowWinModal(false)}>
          <div style={overlayCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 950 }}>¡Ganaste! 🎉</div>
                <div style={{ opacity: 0.92, marginTop: 4 }}>
                  Intentos: <b>{history[0]?.attempt ?? "-"}</b>
                </div>
              </div>
              <button type="button" style={xBtn} onClick={() => setShowWinModal(false)}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Nick (opcional)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  placeholder="Nick (3-16, A-Z 0-9 _ - espacio)"
                  style={{ ...input, flex: 1 }}
                  disabled={savingNick}
                />
                <button type="button" style={button} onClick={onClaimNick} disabled={savingNick || !nick.trim()}>
                  {savingNick ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>

            {/* TOPS */}
            {claimResp?.leaderboards ? (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ margin: "8px 0", fontSize: 16 }}>Top 3 — Ronda (hoy)</h3>
                <div style={lbGrid}>
                  <LBCard title="Tiempo" rows={claimResp.leaderboards.puzzle_top3_time} kind="TIME" />
                  <LBCard title="Intentos" rows={claimResp.leaderboards.puzzle_top3_attempts} kind="ATTEMPTS" />
                </div>

                <h3 style={{ margin: "14px 0 8px", fontSize: 16 }}>Top 3 — Cantón (histórico)</h3>
                <div style={lbGrid}>
                  <LBCard title="Tiempo" rows={claimResp.leaderboards.canton_top3_time} kind="TIME" />
                  <LBCard title="Intentos" rows={claimResp.leaderboards.canton_top3_attempts} kind="ATTEMPTS" />
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 14, opacity: 0.85, fontSize: 12 }}>
                Guardá un nick para ver los tops (o llamá claim-nick aunque no pongás nick si querés).
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ ...card, display: "inline-block", padding: "12px 16px", marginBottom: 12 }}>
          <h1 style={{ margin: 0, color: "#f8f8f8" }}>CRdle</h1>
          <div style={{ opacity: 0.92, color: "#eaeaea" }}>Fecha: {today?.puzzle_date ?? "..."}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <section style={card}>
            <h2 style={{ marginTop: 0, marginBottom: 12, color: "#f8f8f8" }}>Jugar</h2>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!submitting) onGuess(firstSuggestion);
                  }
                }}
                placeholder="Escribí un cantón... ej: Atenas"
                style={{ ...input, flex: 1 }}
                disabled={blocked || submitting}
              />
              <button type="button" onClick={() => onGuess(firstSuggestion)} style={button} disabled={blocked || submitting}>
                {submitting ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span style={spinner} aria-label="Cargando" />
                    Cargando...
                  </span>
                ) : (
                  "Probar"
                )}
              </button>
            </div>

            {query.trim() && suggestions.length > 0 ? (
              <div style={suggestBox}>
                {suggestions.map((c) => (
                  <button key={c.id} onClick={() => onGuess(c)} style={suggestItem} type="button">
                    {c.provincia.toUpperCase()}, {c.canton.toUpperCase()}
                  </button>
                ))}
              </div>
            ) : null}

            {blocked ? (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.08)", color: "#f0f0f0" }}>
                {won ? "¡Ya ganaste hoy! 🎉" : "Ya jugaste hoy."}
              </div>
            ) : null}

            {err ? (
              <pre style={{ marginTop: 10, padding: 12, borderRadius: 8, background: "#111", color: "#fff" }}>
                {err}
              </pre>
            ) : null}
          </section>

          <section style={card}>
            <h2 style={{ marginTop: 0, color: "#f8f8f8" }}>Historial</h2>
            {history.length === 0 ? (
              <div style={{ opacity: 0.9, color: "#e8e8e8" }}>Sin intentos aún.</div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {history.map((g) => (
                  <GuessRow key={`${g.guess.canton_id}-${g.attempt}`} g={g} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function LBCard({ title, rows, kind }: { title: string; rows: LBRow[]; kind: "TIME" | "ATTEMPTS" }) {
  return (
    <div style={lbCard}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ opacity: 0.85 }}>Sin datos.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r) => (
            <div key={`${r.rn}-${r.created_at}`} style={lbRow}>
              <div style={{ fontWeight: 900 }}>#{r.rn}</div>
              <div style={{ opacity: 0.95 }}>
                <b>{(r.nick ?? "ANÓNIMO").toUpperCase()}</b>
              </div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {kind === "TIME" ? formatMs(r.duration_ms) : `${r.attempts ?? "-"} intents`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatMs(ms: number | null) {
  if (ms == null) return "-";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return m > 0 ? `${m}:${ss}` : `${s}s`;
}

function GuessRow({ g }: { g: CheckGuessResp }) {
  const tiles = [
    <Tile key="provincia" label="Provincia" value={g.guess.provincia} status={g.qual.provincia.status} />,
    <TileQuant key="distritos" label="Distritos" status={g.quant.cantidad_distritos.status} arrow={g.quant.cantidad_distritos.arrow} value={g.quant.cantidad_distritos.guess_value} />,
    <TileQuant key="area" label="Area" status={g.quant.area_km2.status} arrow={g.quant.area_km2.arrow} value={g.quant.area_km2.guess_value} />,
    <TileQuant key="altitud" label="Altitud" status={g.quant.altitud_msnm.status} arrow={g.quant.altitud_msnm.arrow} value={g.quant.altitud_msnm.guess_value} />,
    <TileQuant key="poblacion" label="Poblacion" status={g.quant.poblacion_2022.status} arrow={g.quant.poblacion_2022.arrow} value={g.quant.poblacion_2022.guess_value} />,
    <TileQuant key="idh" label="IDH" status={g.quant.idh_2020.status} arrow={g.quant.idh_2020.arrow} value={g.quant.idh_2020.guess_value} />,
    <TileColors key="colores" label="Colores" status={g.colors.status} text={g.colors.common.join(", ")} />,
  ];

  return (
    <div style={{ borderTop: "1px solid #e6e6e6", paddingTop: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: "#ffffff" }}>
        #{g.attempt} — {g.guess.provincia.toUpperCase()}, {g.guess.canton.toUpperCase()}
      </div>
      <div style={grid7}>
        {tiles.map((tile, idx) => (
          <div key={idx} style={{ animation: "tileIn 260ms ease both", animationDelay: `${idx * 70}ms` }}>
            {tile}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tile({ label, value, status }: { label: string; value: string; status: Status2 }) {
  return (
    <div style={{ ...tileBase, background: bg(status), color: fg(status) }}>
      <div style={tileLabel}>{label}</div>
      <div style={tileValue}>{value}</div>
    </div>
  );
}

function TileQuant({ label, status, arrow, value }: { label: string; status: Status2; arrow: Arrow; value: number | null }) {
  const formatted = value == null ? "-" : new Intl.NumberFormat("es-CR").format(value);
  return (
    <div style={{ ...tileBase, background: bg(status), color: fg(status), position: "relative" }}>
      <div style={tileLabel}>{label}</div>
      <div style={tileValue}>{formatted}</div>
      {status === "RED" && arrow ? <div style={arrowBadge}>{arrow === "UP" ? "↑" : "↓"}</div> : null}
    </div>
  );
}

function TileColors({ label, status, text }: { label: string; status: Status3; text: string }) {
  const copy = status === "GREEN" ? "Exacto" : status === "RED" ? "Ninguno" : text || "-";
  return (
    <div style={{ ...tileBase, background: bg3(status), color: fg3(status) }}>
      <div style={tileLabel}>{label}</div>
      <div style={tileValue}>{copy}</div>
    </div>
  );
}

/* styles */
const card: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 16,
  background: "rgba(24,24,24,0.82)",
  boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
};

const input: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)",
  outline: "none",
  fontSize: 14,
  background: "rgba(0,0,0,0.25)",
  color: "#f5f5f5",
};

const button: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #f0f0f0",
  background: "#f0f0f0",
  color: "#111",
  cursor: "pointer",
  fontWeight: 700,
  minWidth: 96,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const suggestBox: CSSProperties = {
  marginTop: 8,
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 10,
  overflow: "hidden",
  background: "rgba(24,24,24,0.85)",
};

const suggestItem: CSSProperties = {
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  border: "none",
  background: "transparent",
  color: "#f8f8f8",
  cursor: "pointer",
  borderTop: "1px solid rgba(255,255,255,0.1)",
  fontWeight: 600,
};

const grid7: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 10,
};

const tileBase: CSSProperties = {
  borderRadius: 10,
  padding: 10,
  minHeight: 82,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  border: "1px solid rgba(0,0,0,0.08)",
};

const tileLabel: CSSProperties = {
  fontSize: 11,
  opacity: 0.9,
  marginBottom: 6,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
};

const tileValue: CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1.2,
};

const arrowBadge: CSSProperties = {
  position: "absolute",
  right: 8,
  top: 8,
  width: 24,
  height: 24,
  borderRadius: 6,
  background: "rgba(0,0,0,0.25)",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
};

const spinner: CSSProperties = {
  width: 14,
  height: 14,
  border: "2px solid rgba(255,255,255,0.5)",
  borderTopColor: "#fff",
  borderRadius: "50%",
  animation: "spin 900ms linear infinite",
};

function bg(s: Status2) {
  return s === "GREEN" ? "#18a34a" : "#dc2626";
}
function fg(_: Status2) {
  return "#ffffff";
}
function bg3(s: Status3) {
  if (s === "GREEN") return "#18a34a";
  if (s === "YELLOW") return "#f59e0b";
  return "#dc2626";
}
function fg3(_: Status3) {
  return "#ffffff";
}

/* modal styles */
const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 9999,
};

const overlayCard: CSSProperties = {
  width: "min(860px, 100%)",
  background: "rgba(24,24,24,0.95)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 16,
  color: "#fff",
  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
};

const xBtn: CSSProperties = {
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "transparent",
  color: "#fff",
  padding: "6px 10px",
  cursor: "pointer",
  height: 36,
};

const lbGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const lbCard: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: 12,
  background: "rgba(0,0,0,0.22)",
};

const lbRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "48px 1fr 120px",
  gap: 10,
  alignItems: "center",
  padding: "8px 10px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.06)",
};

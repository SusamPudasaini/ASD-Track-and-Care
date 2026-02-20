import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ActivityShell from "./ActivityShell";
import { getMyActivityResults, saveActivityResult } from "../../api/activityApi";

// HumanBenchmark-ish defaults (but calmer)
const DEFAULT_GRID = 3; // starts 3x3
const MAX_GRID = 7;     // cap to keep UI usable on phones
const DEFAULT_SPEED = "NORMAL"; // SLOW | NORMAL | FAST

const FLASH_MS = {
  SLOW: 1200,
  NORMAL: 850,
  FAST: 600,
};

const COLORS = {
  tile: "#1f2937", // gray-800
  border: "rgba(255,255,255,0.10)",
  on: "#4a6cf7",
  correct: "#22c55e",
  wrong: "#ef4444",
};

function getErrorMessage(err) {
  const data = err?.response?.data;
  if (!data) return "Something went wrong.";
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.title) return data.title;
    if (data.status && data.path) return `${data.error || "Request failed"} (${data.status})`;
    try {
      return JSON.stringify(data);
    } catch {
      return "Something went wrong.";
    }
  }
  return String(data);
}

function randInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

function sampleUnique(count, maxExclusive) {
  const set = new Set();
  while (set.size < count) set.add(randInt(maxExclusive));
  return Array.from(set);
}

export default function VisualMemory() {
  // phases: idle -> flash -> input -> fail
  const [phase, setPhase] = useState("idle");

  const [lowSensory, setLowSensory] = useState(true);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);

  // Level controls how many tiles to remember
  const [level, setLevel] = useState(1);

  // Grid grows slowly (3x3 → 4x4 → ...)
  const [gridSize, setGridSize] = useState(DEFAULT_GRID);

  // Target tiles indices you must click
  const [targets, setTargets] = useState([]); // indices
  const [picked, setPicked] = useState([]);   // indices clicked this round

  const [activeFlash, setActiveFlash] = useState([]); // tiles that are lit while flashing
  const [wrongFlash, setWrongFlash] = useState(false);

  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const timerRef = useRef(null);

  const flashMs = useMemo(() => FLASH_MS[speed] || FLASH_MS.NORMAL, [speed]);

  const totalTiles = useMemo(() => gridSize * gridSize, [gridSize]);

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function resetAll() {
    clearTimer();
    setPhase("idle");
    setLevel(1);
    setGridSize(DEFAULT_GRID);
    setTargets([]);
    setPicked([]);
    setActiveFlash([]);
    setWrongFlash(false);
    setSaving(false);
  }

  // ✅ start clean on mount (prevents hot reload state carryover)
  useEffect(() => {
    resetAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, []);

  // Load history
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setHistoryLoading(true);
        const data = await getMyActivityResults("VISUAL_MEMORY", 12);
        if (alive) setHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("LOAD HISTORY ERROR:", err?.response?.status, err?.response?.data || err);
      } finally {
        if (alive) setHistoryLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  function computeGridForLevel(nextLevel) {
    // Grow grid slowly:
    // level 1-3 -> 3x3
    // level 4-7 -> 4x4
    // level 8-12 -> 5x5
    // etc...
    const suggested = Math.min(
      MAX_GRID,
      DEFAULT_GRID + Math.floor((nextLevel - 1) / 4)
    );
    return suggested;
  }

  function startRound(nextLevel) {
    clearTimer();

    const gs = computeGridForLevel(nextLevel);
    const tilesCount = gs * gs;

    // Number of target tiles = level
    const targetCount = Math.min(nextLevel, tilesCount);

    const newTargets = sampleUnique(targetCount, tilesCount);

    setGridSize(gs);
    setTargets(newTargets);
    setPicked([]);
    setWrongFlash(false);

    // Flash targets
    setPhase("flash");
    setActiveFlash(newTargets);

    timerRef.current = setTimeout(() => {
      setActiveFlash([]);
      setPhase("input");
    }, flashMs + (lowSensory ? 180 : 80));
  }

  function startGame() {
    setLevel(1);
    startRound(1);
  }

  async function saveResult(finalLevel) {
    const payload = {
      type: "VISUAL_MEMORY",
      score: finalLevel, // level reached
      details: {
        levelReached: finalLevel,
        lowSensory,
        speed,
        flashMs,
      },
    };

    try {
      setSaving(true);
      await saveActivityResult(payload);
      toast.success("Result saved!");

      const data = await getMyActivityResults("VISUAL_MEMORY", 12);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("SAVE RESULT ERROR:", err?.response?.status, err?.response?.data || err);
      toast.error(getErrorMessage(err) || `Could not save (${err?.response?.status || "network"})`);
    } finally {
      setSaving(false);
    }
  }

  async function fail() {
    const reached = Math.max(0, level - 1);
    setPhase("fail");
    setWrongFlash(true);

    clearTimer();
    timerRef.current = setTimeout(() => setWrongFlash(false), lowSensory ? 350 : 500);

    await saveResult(reached);
  }

  function nextLevel() {
    const nl = level + 1;
    setLevel(nl);
    clearTimer();
    timerRef.current = setTimeout(() => startRound(nl), lowSensory ? 280 : 200);
  }

  function onTileClick(idx) {
    if (phase === "idle") {
      startGame();
      return;
    }

    if (phase !== "input") return;

    // ignore duplicates
    if (picked.includes(idx)) return;

    const isTarget = targets.includes(idx);
    if (!isTarget) {
      fail();
      return;
    }

    const nextPicked = [...picked, idx];
    setPicked(nextPicked);

    // Completed this round?
    if (nextPicked.length >= targets.length) {
      nextLevel();
    }
  }

  const headerText = useMemo(() => {
    if (phase === "idle") return "Press Start to begin.";
    if (phase === "flash") return "Watch carefully…";
    if (phase === "input") return "Tap the tiles you saw.";
    if (phase === "fail") return `Wrong tile. You reached level ${Math.max(0, level - 1)}.`;
    return "";
  }, [phase, level]);

  return (
    <ActivityShell
      title="Visual Memory"
      subtitle="Remember the highlighted tiles, then tap them back. Each level adds one tile."
      footer={
        <div>
          <strong>Therapy note:</strong> Supports visual attention and short-term memory. Low Sensory mode reduces surprise.
        </div>
      }
    >
      {/* Controls */}
      <div className="p-4 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={lowSensory}
            onChange={(e) => setLowSensory(e.target.checked)}
          />
          <span>Low Sensory mode (recommended)</span>
        </label>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Speed:</span>
          <select
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="SLOW">Slow</option>
            <option value="NORMAL">Normal</option>
            <option value="FAST">Fast</option>
          </select>

          <button
            type="button"
            onClick={resetAll}
            className="ml-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Game */}
      <div className="p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-gray-900">{headerText}</div>
          <div className="text-sm text-gray-600">
            Level: {phase === "fail" ? Math.max(0, level - 1) : level} • Grid: {gridSize}×{gridSize}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          {phase === "idle" ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={startGame}
                className="rounded-xl bg-[#4a6cf7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
              >
                Start
              </button>
            </div>
          ) : phase === "fail" ? (
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm text-gray-700">
                {saving ? "Saving result..." : "Tap Start to try again."}
              </div>
              <button
                type="button"
                onClick={startGame}
                className="rounded-xl bg-[#4a6cf7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
              >
                Start Again
              </button>
            </div>
          ) : null}

          {/* Grid always visible once game started */}
          {phase !== "idle" ? (
            <div
              className="mx-auto mt-4 grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                maxWidth: Math.min(560, gridSize * 92),
              }}
            >
              {Array.from({ length: totalTiles }).map((_, idx) => {
                const flashing = activeFlash.includes(idx);
                const pickedCorrect = picked.includes(idx);

                const bg = wrongFlash
                  ? COLORS.wrong
                  : flashing
                  ? COLORS.on
                  : pickedCorrect
                  ? COLORS.correct
                  : COLORS.tile;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onTileClick(idx)}
                    disabled={phase !== "input"}
                    style={{
                      height: 72,
                      borderRadius: 16,
                      border: `1px solid ${COLORS.border}`,
                      background: bg,
                      transition: lowSensory ? "background 260ms ease" : "background 120ms ease",
                      cursor: phase === "input" ? "pointer" : "not-allowed",
                    }}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* History */}
      <div className="p-4 border-t border-gray-100">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Recent results</h3>

        {historyLoading ? (
          <div className="text-sm text-gray-600">Loading...</div>
        ) : history?.length ? (
          <div className="grid gap-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3"
              >
                <div>
                  <div className="font-semibold text-gray-900">Level {h.score}</div>
                  <div className="text-xs text-gray-500">
                    {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
                  </div>
                </div>
                <div className="text-xs text-gray-500">{h.type}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600">No saved results yet.</div>
        )}
      </div>
    </ActivityShell>
  );
}
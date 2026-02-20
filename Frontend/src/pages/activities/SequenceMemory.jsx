import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ActivityShell from "./ActivityShell";
import { getMyActivityResults, saveActivityResult } from "../../api/activityApi";

const GRID = 9; // 3x3
const DEFAULT_SPEED = "NORMAL"; // SLOW | NORMAL | FAST

const SPEED_MS = {
  SLOW: 650,
  NORMAL: 450,
  FAST: 300,
};

// calm colors
const COLORS = {
  tile: "#1f2937", // gray-800
  tileBorder: "rgba(255,255,255,0.10)",
  active: "#4a6cf7", // your app primary
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

export default function SequenceMemory() {
  // phases:
  // idle -> showing -> input -> fail
  const [phase, setPhase] = useState("idle");

  const [lowSensory, setLowSensory] = useState(true);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);

  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState([]); // indices [0..8]
  const [inputIndex, setInputIndex] = useState(0);

  const [activeTile, setActiveTile] = useState(null);
  const [flashWrong, setFlashWrong] = useState(false);

  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const timersRef = useRef([]);

  const stepMs = useMemo(() => SPEED_MS[speed] || SPEED_MS.NORMAL, [speed]);

  function clearTimers() {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }

  function resetAll() {
    clearTimers();
    setPhase("idle");
    setLevel(1);
    setSequence([]);
    setInputIndex(0);
    setActiveTile(null);
    setFlashWrong(false);
    setSaving(false);
  }

  // ✅ start clean whenever you open the page (prevents state carryover on hot reload)
  useEffect(() => {
    resetAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  // Load history on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setHistoryLoading(true);
        const data = await getMyActivityResults("SEQUENCE_MEMORY", 12);
        if (alive) setHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("LOAD HISTORY ERROR:", err?.response?.status, err?.response?.data || err);
      } finally {
        if (alive) setHistoryLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function appendRandomToSequence(prev) {
    // Allow repeats like HumanBenchmark
    return [...prev, randInt(GRID)];
  }

  function startGame() {
    // Level 1
    const seq = appendRandomToSequence([]);
    setSequence(seq);
    setLevel(1);
    setInputIndex(0);
    showSequence(seq);
  }

  function showSequence(seq) {
    clearTimers();
    setPhase("showing");
    setActiveTile(null);
    setFlashWrong(false);

    // Low sensory: add a small calm gap
    const gap = lowSensory ? 220 : 120;

    let t = 0;

    seq.forEach((tileIdx, i) => {
      // Turn on
      timersRef.current.push(
        setTimeout(() => setActiveTile(tileIdx), t)
      );
      // Turn off
      timersRef.current.push(
        setTimeout(() => setActiveTile(null), t + stepMs)
      );

      t += stepMs + gap;
    });

    // After finished, allow input
    timersRef.current.push(
      setTimeout(() => {
        setPhase("input");
        setInputIndex(0);
        setActiveTile(null);
      }, t + 50)
    );
  }

  async function saveResult(finalLevel) {
    const payload = {
      type: "SEQUENCE_MEMORY",
      score: finalLevel, // level reached (highest completed)
      details: {
        levelReached: finalLevel,
        lowSensory,
        speed,
        stepMs,
        finalSequenceLength: sequence.length,
      },
    };

    try {
      setSaving(true);
      await saveActivityResult(payload);
      toast.success("Result saved!");

      const data = await getMyActivityResults("SEQUENCE_MEMORY", 12);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("SAVE RESULT ERROR:", err?.response?.status, err?.response?.data || err);
      toast.error(getErrorMessage(err) || `Could not save (${err?.response?.status || "network"})`);
    } finally {
      setSaving(false);
    }
  }

  async function fail() {
    // If you fail on level N, the last fully completed level is N-1.
    const reached = Math.max(0, level - 1);

    setPhase("fail");
    setFlashWrong(true);

    // quick flash wrong
    timersRef.current.push(
      setTimeout(() => setFlashWrong(false), lowSensory ? 350 : 500)
    );

    // Save (non-blocking for UI)
    await saveResult(reached);
  }

  function nextLevel() {
    const nextSeq = appendRandomToSequence(sequence);
    const nextLevelNum = level + 1;

    setSequence(nextSeq);
    setLevel(nextLevelNum);
    setInputIndex(0);

    showSequence(nextSeq);
  }

  function onTileClick(idx) {
    if (phase === "idle") {
      startGame();
      return;
    }

    if (phase !== "input") return;

    const expected = sequence[inputIndex];
    if (idx !== expected) {
      fail();
      return;
    }

    const nextInputIndex = inputIndex + 1;
    setInputIndex(nextInputIndex);

    // quick feedback highlight on correct tap (calm)
    setActiveTile(idx);
    timersRef.current.push(setTimeout(() => setActiveTile(null), lowSensory ? 120 : 170));

    if (nextInputIndex >= sequence.length) {
      // completed this level
      timersRef.current.push(setTimeout(() => nextLevel(), lowSensory ? 250 : 200));
    }
  }

  const headerText = useMemo(() => {
    if (phase === "idle") return "Tap any tile to start.";
    if (phase === "showing") return "Watch the sequence…";
    if (phase === "input") return "Repeat the sequence.";
    if (phase === "fail") return "Wrong tile. Tap any tile to restart.";
    return "";
  }, [phase]);

  const levelLabel = useMemo(() => {
    if (phase === "fail") return `Level reached: ${Math.max(0, level - 1)}`;
    return `Level: ${level}`;
  }, [phase, level]);

  return (
    <ActivityShell
      title="Sequence Memory"
      subtitle="Watch a sequence of tiles, then repeat it. Each level adds one tile."
      footer={
        <div>
          <strong>Therapy note:</strong> Supports working memory, attention, and sequencing. Low Sensory mode slows transitions.
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

      {/* Game area */}
      <div className="p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-gray-900">{headerText}</div>
          <div className="text-sm text-gray-600">{levelLabel}</div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {Array.from({ length: GRID }).map((_, idx) => {
            const isActive = activeTile === idx;
            const isWrongFlash = flashWrong && phase === "fail";

            const bg = isWrongFlash
              ? COLORS.wrong
              : isActive
              ? COLORS.active
              : COLORS.tile;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onTileClick(idx)}
                disabled={phase === "showing"}
                style={{
                  height: 92,
                  borderRadius: 16,
                  border: `1px solid ${COLORS.tileBorder}`,
                  background: bg,
                  transition: lowSensory ? "background 260ms ease" : "background 120ms ease",
                  cursor: phase === "showing" ? "not-allowed" : "pointer",
                }}
              />
            );
          })}
        </div>

        {phase === "fail" ? (
          <div className="mt-4 text-sm text-gray-600">
            {saving ? "Saving result..." : "Tap any tile to restart."}
          </div>
        ) : null}
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
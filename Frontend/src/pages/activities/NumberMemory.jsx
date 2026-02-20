import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ActivityShell from "./ActivityShell";
import { getMyActivityResults, saveActivityResult } from "../../api/activityApi";

const DEFAULT_SPEED = "NORMAL"; // SLOW | NORMAL | FAST

const SHOW_MS = {
  SLOW: 2200,
  NORMAL: 1600,
  FAST: 1100,
};

function randDigit() {
  return Math.floor(Math.random() * 10);
}

function makeNumberString(len) {
  let s = "";
  for (let i = 0; i < len; i++) s += String(randDigit());
  // avoid leading zeros feeling “short”
  if (s.length > 1 && s[0] === "0") {
    s = String(1 + Math.floor(Math.random() * 9)) + s.slice(1);
  }
  return s;
}

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

export default function NumberMemory() {
  // phases: idle -> show -> input -> fail
  const [phase, setPhase] = useState("idle");

  const [lowSensory, setLowSensory] = useState(true);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);

  const [digits, setDigits] = useState(1); // length shown now
  const [currentNumber, setCurrentNumber] = useState("");
  const [answer, setAnswer] = useState("");

  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const showMs = useMemo(() => SHOW_MS[speed] || SHOW_MS.NORMAL, [speed]);

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function resetAll() {
    clearTimer();
    setPhase("idle");
    setDigits(1);
    setCurrentNumber("");
    setAnswer("");
    setSaving(false);
  }

  // ✅ always start clean when page opens (prevents hot reload state carryover)
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
        const data = await getMyActivityResults("NUMBER_MEMORY", 12);
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

  function startRound(len) {
    clearTimer();
    const num = makeNumberString(len);
    setCurrentNumber(num);
    setAnswer("");
    setPhase("show");

    // After showMs, switch to input
    timerRef.current = setTimeout(() => {
      setPhase("input");
      // focus input
      setTimeout(() => inputRef.current?.focus?.(), 0);
    }, showMs + (lowSensory ? 150 : 0));
  }

  function startGame() {
    setDigits(1);
    startRound(1);
  }

  async function saveResult(maxDigitsRemembered) {
    const payload = {
      type: "NUMBER_MEMORY",
      score: maxDigitsRemembered, // highest digits correctly recalled
      details: {
        maxDigits: maxDigitsRemembered,
        lowSensory,
        speed,
        showMs,
      },
    };

    try {
      setSaving(true);
      await saveActivityResult(payload);
      toast.success("Result saved!");

      const data = await getMyActivityResults("NUMBER_MEMORY", 12);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("SAVE RESULT ERROR:", err?.response?.status, err?.response?.data || err);
      toast.error(getErrorMessage(err) || `Could not save (${err?.response?.status || "network"})`);
    } finally {
      setSaving(false);
    }
  }

  async function fail() {
    // if you failed at digits = N, max remembered is N-1
    const maxDigits = Math.max(0, digits - 1);
    setPhase("fail");
    await saveResult(maxDigits);
  }

  function submit() {
    if (phase !== "input") return;

    const guess = String(answer || "").trim();
    const target = String(currentNumber || "").trim();

    if (!guess) {
      toast.error("Enter the number first.");
      return;
    }

    if (guess === target) {
      // next level
      const nextDigits = digits + 1;
      setDigits(nextDigits);

      // calm small delay before showing next number
      clearTimer();
      timerRef.current = setTimeout(() => startRound(nextDigits), lowSensory ? 300 : 200);
    } else {
      fail();
    }
  }

  const headerText = useMemo(() => {
    if (phase === "idle") return "Press Start to begin.";
    if (phase === "show") return `Memorize this number (${digits} digit${digits === 1 ? "" : "s"}).`;
    if (phase === "input") return "Type the number you saw.";
    if (phase === "fail") return `Wrong. You reached ${Math.max(0, digits - 1)} digit${Math.max(0, digits - 1) === 1 ? "" : "s"}.`;
    return "";
  }, [phase, digits]);

  return (
    <ActivityShell
      title="Number Memory"
      subtitle="Memorize the number, then type it back. Each level adds one digit."
      footer={
        <div>
          <strong>Therapy note:</strong> Supports working memory and sustained attention. Speed control helps match the child’s comfort.
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
          <div className="text-sm text-gray-600">Digits: {digits}</div>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
          {phase === "idle" ? (
            <button
              type="button"
              onClick={startGame}
              className="rounded-xl bg-[#4a6cf7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
            >
              Start
            </button>
          ) : phase === "show" ? (
            <div className="text-4xl font-bold tracking-wider text-gray-900 select-none">
              {currentNumber}
            </div>
          ) : phase === "input" ? (
            <div className="flex flex-col items-center gap-3">
              <input
                ref={inputRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value.replace(/\D/g, ""))} // digits only
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="Type number..."
                className="w-full max-w-sm rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />

              <button
                type="button"
                onClick={submit}
                className="rounded-xl bg-[#4a6cf7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
              >
                Submit
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="text-lg font-semibold text-gray-900">
                Correct answer was: <span className="font-bold">{currentNumber}</span>
              </div>
              <div className="text-sm text-gray-600">
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
          )}
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
                  <div className="font-semibold text-gray-900">{h.score} digits</div>
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
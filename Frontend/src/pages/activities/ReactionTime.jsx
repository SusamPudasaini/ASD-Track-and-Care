import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ActivityShell from "./ActivityShell";
import { getMyActivityResults, saveActivityResult } from "../../api/activityApi";

const TRIALS = 5;

const COLORS = {
  idle: "#20242b",
  waiting: "#273043",
  ready: "#1f6f4a",
  tooSoon: "#7a2c2c",
  done: "#20242b",
};

function median(nums) {
  const arr = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  if (arr.length % 2 === 0) return Math.round((arr[mid - 1] + arr[mid]) / 2);
  return arr[mid];
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

export default function ReactionTime() {
  const [phase, setPhase] = useState("idle");
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialTimes, setTrialTimes] = useState([]);
  const [lastMs, setLastMs] = useState(null);

  const [lowSensory, setLowSensory] = useState(true);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const timerRef = useRef(null);
  const startTsRef = useRef(null);

  const bg = useMemo(() => COLORS[phase] || COLORS.idle, [phase]);

  const averageMs = useMemo(() => {
    if (!trialTimes.length) return null;
    const sum = trialTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / trialTimes.length);
  }, [trialTimes]);

  const medianMs = useMemo(() => {
    if (!trialTimes.length) return null;
    return median(trialTimes);
  }, [trialTimes]);

  function resetAll() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    startTsRef.current = null;

    setPhase("idle");
    setTrialIndex(0);
    setTrialTimes([]);
    setLastMs(null);
    setSaving(false);
  }

  // ✅ IMPORTANT: Always start clean when page opens (prevents Trial 2 on first open due to hot reload)
  useEffect(() => {
    resetAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Load history
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setHistoryLoading(true);
        const data = await getMyActivityResults("REACTION_TIME", 12);
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

  function scheduleGreen() {
    if (timerRef.current) clearTimeout(timerRef.current);

    const min = lowSensory ? 1700 : 1500;
    const max = lowSensory ? 4500 : 4000;

    const delay = Math.floor(min + Math.random() * (max - min + 1));
    timerRef.current = setTimeout(() => {
      startTsRef.current = performance.now();
      setPhase("ready");
    }, delay);
  }

  function startTrial() {
    setLastMs(null);
    setPhase("waiting");
    scheduleGreen();
  }

  async function finalizeAndSave(finalTimes) {
    if (!finalTimes?.length) return;

    const avg = Math.round(finalTimes.reduce((a, b) => a + b, 0) / finalTimes.length);
    const med = median(finalTimes);

    const payload = {
      type: "REACTION_TIME",
      score: avg,
      details: {
        trials: finalTimes,
        averageMs: avg,
        medianMs: med,
        lowSensory,
      },
    };

    try {
      setSaving(true);
      await saveActivityResult(payload);
      toast.success("Result saved!");

      const data = await getMyActivityResults("REACTION_TIME", 12);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("SAVE RESULT ERROR:", err?.response?.status, err?.response?.data || err);
      toast.error(getErrorMessage(err) || `Could not save (${err?.response?.status || "network"})`);
    } finally {
      setSaving(false);
    }
  }

  async function handleClick() {
    if (phase === "idle") {
      // If starting fresh
      if (trialTimes.length === 0) {
        setTrialIndex(0);
        setTrialTimes([]);
      }
      startTrial();
      return;
    }

    if (phase === "waiting") {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      startTsRef.current = null;
      setPhase("tooSoon");
      return;
    }

    if (phase === "tooSoon") {
      startTrial();
      return;
    }

    if (phase === "ready") {
      const end = performance.now();
      const start = startTsRef.current ?? end;
      const ms = Math.max(0, Math.round(end - start));

      setLastMs(ms);

      // ✅ build next list locally so save uses correct final list immediately
      const nextTimes = [...trialTimes, ms];
      setTrialTimes(nextTimes);

      const nextTrial = trialIndex + 1;
      setTrialIndex(nextTrial);

      startTsRef.current = null;

      if (nextTrial >= TRIALS) {
        setPhase("done");
        await finalizeAndSave(nextTimes);
      } else {
        setPhase("idle");
      }
      return;
    }

    if (phase === "done") {
      resetAll();
    }
  }

  const instruction = useMemo(() => {
    if (phase === "idle") {
      if (trialTimes.length > 0 && trialTimes.length < TRIALS) {
        return `Trial ${trialTimes.length + 1} of ${TRIALS}. Tap to start.`;
      }
      return "Tap to start. Wait for GREEN, then tap as fast as you can.";
    }
    if (phase === "waiting") return "Wait...";
    if (phase === "ready") return "TAP!";
    if (phase === "tooSoon") return "Too soon. Tap to try again.";
    if (phase === "done") return "Done. Tap to restart.";
    return "";
  }, [phase, trialTimes.length]);

  return (
    <ActivityShell
      title="Reaction Time"
      subtitle="A calm, predictable reaction-time exercise (5 trials)."
      footer={
        <div>
          <strong>Therapy note:</strong> This supports attention + response timing. Low Sensory mode keeps transitions calmer.
        </div>
      }
    >
      <div className="p-4 border-b border-gray-100">
        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={lowSensory}
            onChange={(e) => setLowSensory(e.target.checked)}
          />
          <span>Low Sensory mode (recommended)</span>
        </label>
      </div>

      <button
        onClick={handleClick}
        style={{
          width: "100%",
          height: 360,
          border: "none",
          cursor: "pointer",
          background: bg,
          color: "white",
          transition: lowSensory ? "background 450ms ease" : "background 150ms ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 20, opacity: 0.95 }}>{instruction}</div>

        {phase === "done" ? (
          <div style={{ marginTop: 10, textAlign: "center" }}>
            <div style={{ fontSize: 44, fontWeight: 700 }}>{averageMs ?? "-"} ms</div>
            <div style={{ opacity: 0.85 }}>
              Median: {medianMs ?? "-"} ms • Trials: {trialTimes.join(", ")}
            </div>
            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
              {saving ? "Saving result..." : "Finished."}
            </div>
          </div>
        ) : lastMs != null ? (
          <div style={{ fontSize: 34, fontWeight: 700 }}>{lastMs} ms</div>
        ) : null}
      </button>

      <div className="p-4">
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
                  <div className="font-semibold text-gray-900">{h.score} ms</div>
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
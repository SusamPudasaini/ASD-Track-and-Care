import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ActivityShell from "./ActivityShell";
import { getMyActivityResults, saveActivityResult } from "../../api/activityApi";

/**
 * Sound Therapy (Parent-guided)
 * Flow:
 * - Play a sound (e.g., cow)
 * - Child answers verbally
 * - Parent marks Correct / Wrong
 * - Correct => level++
 * - Wrong => end session, save level reached
 *
 * IMPORTANT:
 * - Place audio files in: /public/sounds/
 *   Example files:
 *     /public/sounds/cow.mp3
 *     /public/sounds/dog.mp3
 *     /public/sounds/cat.mp3
 *     /public/sounds/sheep.mp3
 *     /public/sounds/horse.mp3
 */

const SOUND_BANK = [
  { id: "COW", label: "Cow", file: "/sounds/cow.mp3" },
  { id: "DOG", label: "Dog", file: "/sounds/dog.mp3" },
  { id: "CAT", label: "Cat", file: "/sounds/cat.mp3" },
  // Add more:
  // { id: "LION", label: "Lion", file: "/sounds/lion.mp3" },
];

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

function pickRandomIndex(max, avoidIndex = null) {
  if (max <= 1) return 0;
  let idx = Math.floor(Math.random() * max);
  if (avoidIndex === null) return idx;
  while (idx === avoidIndex) idx = Math.floor(Math.random() * max);
  return idx;
}

export default function SoundTherapy() {
  // phases: idle -> playing/ready -> ended
  const [phase, setPhase] = useState("idle");

  const [lowSensory, setLowSensory] = useState(true);
  const [autoNextDelayMs, setAutoNextDelayMs] = useState(450); // after ✅

  const [level, setLevel] = useState(1);
  const [soundIndex, setSoundIndex] = useState(0);

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.75);

  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const audioRef = useRef(null);
  const timerRef = useRef(null);

  const current = useMemo(() => SOUND_BANK[soundIndex], [soundIndex]);

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function stopAudio() {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
    } catch {
      // ignore
    }
    setPlaying(false);
  }

  function resetAll() {
    clearTimer();
    stopAudio();
    setPhase("idle");
    setLevel(1);
    setSoundIndex(0);
    setSaving(false);
  }

  // start clean on mount (prevents hot reload state carryover)
  useEffect(() => {
    resetAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load history
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setHistoryLoading(true);
        const data = await getMyActivityResults("SOUND_THERAPY", 12);
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

  // Keep audio volume in sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function startSession() {
    const idx = pickRandomIndex(SOUND_BANK.length);
    setSoundIndex(idx);
    setLevel(1);
    setPhase("ready");
    stopAudio();
  }

  async function playSound() {
    if (!current?.file) return toast.error("No sound configured.");

    try {
      const a = audioRef.current;
      if (!a) return;

      a.volume = volume;
      setPlaying(true);
      await a.play();
    } catch (err) {
      console.error("AUDIO PLAY ERROR:", err);
      setPlaying(false);
      toast.error("Could not play sound. Make sure the audio file exists in /public/sounds.");
    }
  }

  async function saveResult(levelReached) {
    const payload = {
      type: "SOUND_THERAPY",
      score: levelReached,
      details: {
        levelReached,
        lowSensory,
        volume,
        lastSound: current?.id || null,
      },
    };

    try {
      setSaving(true);
      await saveActivityResult(payload);
      toast.success("Session saved!");

      const data = await getMyActivityResults("SOUND_THERAPY", 12);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("SAVE RESULT ERROR:", err?.response?.status, err?.response?.data || err);
      toast.error(getErrorMessage(err) || `Could not save (${err?.response?.status || "network"})`);
    } finally {
      setSaving(false);
    }
  }

  async function markCorrect() {
    if (phase !== "ready") return;
    stopAudio();

    const nextLevel = level + 1;
    setLevel(nextLevel);

    // pick next sound (avoid repeating same)
    const nextIdx = pickRandomIndex(SOUND_BANK.length, soundIndex);

    clearTimer();
    timerRef.current = setTimeout(() => {
      setSoundIndex(nextIdx);
      // optionally auto-play for smooth flow
      if (!lowSensory) playSound();
    }, lowSensory ? autoNextDelayMs : 200);
  }

  async function markWrong() {
    if (phase !== "ready") return;
    stopAudio();

    // If wrong at level N, "reached" is N-1 fully correct
    const reached = Math.max(0, level - 1);
    setPhase("ended");
    await saveResult(reached);
  }

  function restart() {
    resetAll();
    startSession();
  }

  return (
    <ActivityShell
      title="Sound Therapy"
      subtitle="Parent-guided listening exercise: play a sound, child answers, parent confirms."
      footer={
        <div>
          <strong>Therapy note:</strong> Supports auditory discrimination, vocabulary building, and attention. Parent confirmation keeps it low-pressure.
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

        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600">Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
          <button
            type="button"
            onClick={resetAll}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="p-6">
        {phase === "idle" ? (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
            <div className="text-sm text-gray-600">
              Press Start. Then play a sound and let the child answer verbally.
            </div>

            <button
              type="button"
              onClick={startSession}
              className="mt-4 rounded-xl bg-[#4a6cf7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
            >
              Start
            </button>

            <div className="mt-4 text-xs text-gray-500">
              Add audio files in <code>/public/sounds/</code> and match names like <code>cow.mp3</code>.
            </div>
          </div>
        ) : phase === "ended" ? (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
            <div className="text-lg font-semibold text-gray-900">
              Session ended
            </div>
            <div className="mt-2 text-sm text-gray-700">
              Level reached: <span className="font-semibold">{Math.max(0, level - 1)}</span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {saving ? "Saving..." : "You can start again anytime."}
            </div>

            <button
              type="button"
              onClick={restart}
              className="mt-4 rounded-xl bg-[#4a6cf7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
            >
              Start Again
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-semibold text-gray-900">
                Level: {level}
              </div>
              <div className="text-sm text-gray-600">
                Parent controls: play → child answers → mark correct/wrong
              </div>
            </div>

            <div className="mt-5 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={playSound}
                disabled={playing}
                className={`rounded-xl px-6 py-3 text-sm font-semibold text-white ${
                  playing ? "bg-blue-300 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                }`}
              >
                {playing ? "Playing..." : "▶ Play Sound"}
              </button>

              {/* Hidden answer (parent shouldn’t show it to child) */}
              <div className="text-xs text-gray-500">
                (Parent hint: current sound is configured as <strong>{current?.label || "Unknown"}</strong>)
              </div>

              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={markCorrect}
                  className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
                >
                  ✅ Correct
                </button>

                <button
                  type="button"
                  onClick={markWrong}
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
                >
                  ❌ Wrong
                </button>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                Tip: Use ✅ even if the child is close (positive reinforcement), and increase difficulty slowly.
              </div>
            </div>

            {/* Audio element */}
            <audio
              ref={audioRef}
              src={current?.file || ""}
              onEnded={() => setPlaying(false)}
              onPause={() => setPlaying(false)}
            />
          </div>
        )}
      </div>

      {/* History */}
      <div className="p-4 border-t border-gray-100">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Recent sessions</h3>

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
          <div className="text-sm text-gray-600">No saved sessions yet.</div>
        )}
      </div>
    </ActivityShell>
  );
}
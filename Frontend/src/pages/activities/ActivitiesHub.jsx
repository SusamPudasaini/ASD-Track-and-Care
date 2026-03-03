import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/navbar/Navbar";
import api from "../../api/axios";

import {
  FaBolt,
  FaPuzzlePiece,
  FaHashtag,
  FaEye,
  FaVolumeHigh,
  FaStar,
  FaRotateLeft,
  FaArrowRight,
} from "react-icons/fa6";

export default function ActivitiesHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const [reminder, setReminder] = useState({ streak: 0, inactiveDays: 0, loading: true });

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const recP = useMemo(() => Number(query.get("p") || 0), [query]);
  const recRisk = useMemo(() => (query.get("risk") || "").trim(), [query]);
  const isRecommendedMode = useMemo(() => query.has("p") || !!recRisk, [query, recRisk]);

  const derivedRisk = useMemo(() => {
    if (recRisk) return recRisk;
    if (query.has("p")) {
      if (recP >= 0.66) return "High";
      if (recP >= 0.33) return "Moderate";
      return "Low";
    }
    return "";
  }, [recRisk, recP, query]);

  const activities = [
    {
      key: "REACTION_TIME",
      title: "Reaction Time",
      desc: "Wait for the signal, then tap as fast as you can. 5 trials.",
      to: "/activities/reaction-time",
      icon: <FaBolt />,
    },
    {
      key: "SEQUENCE_MEMORY",
      title: "Sequence Memory",
      desc: "Watch a sequence of tiles and repeat it. Gets longer each level.",
      to: "/activities/sequence-memory",
      icon: <FaPuzzlePiece />,
    },
    {
      key: "NUMBER_MEMORY",
      title: "Number Memory",
      desc: "Memorize the number and type it back. Adds one digit per level.",
      to: "/activities/number-memory",
      icon: <FaHashtag />,
    },
    {
      key: "VISUAL_MEMORY",
      title: "Visual Memory",
      desc: "Remember highlighted tiles and tap them back. Adds one tile per level.",
      to: "/activities/visual-memory",
      icon: <FaEye />,
    },
    {
      key: "SOUND_THERAPY",
      title: "Sound Therapy",
      desc: "Parent-guided: play a sound, child answers, parent confirms to level up.",
      to: "/activities/sound-therapy",
      icon: <FaVolumeHigh />,
    },
  ];

  const recommendedKeys = useMemo(() => {
    const r = String(derivedRisk || "").toLowerCase();
    if (!isRecommendedMode) return new Set();

    if (r === "high") return new Set(["SOUND_THERAPY", "VISUAL_MEMORY", "SEQUENCE_MEMORY"]);
    if (r === "moderate") return new Set(["SOUND_THERAPY", "REACTION_TIME", "VISUAL_MEMORY"]);
    return new Set(["REACTION_TIME", "SEQUENCE_MEMORY"]);
  }, [isRecommendedMode, derivedRisk]);

  const displayActivities = useMemo(() => {
    if (!isRecommendedMode) return activities;

    const rec = [];
    const rest = [];
    for (const a of activities) {
      if (recommendedKeys.has(a.key)) rec.push(a);
      else rest.push(a);
    }
    return [...rec, ...rest];
  }, [activities, isRecommendedMode, recommendedKeys]);

  useEffect(() => {
    let mounted = true;

    async function loadReminder() {
      try {
        const res = await api.get("/api/analytics/activities", { params: { limit: 120 } });
        if (!mounted) return;

        const rows = Array.isArray(res.data) ? res.data : [];
        const uniqueDays = Array.from(
          new Set(
            rows
              .map((r) => String(r?.createdAt || "").slice(0, 10))
              .filter(Boolean)
          )
        ).sort((a, b) => (a > b ? -1 : 1));

        const today = new Date();
        const toDateOnly = (x) => new Date(x + "T00:00:00");

        let streak = 0;
        let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        for (let i = 0; i < 365; i += 1) {
          const key = cursor.toISOString().slice(0, 10);
          if (uniqueDays.includes(key)) {
            streak += 1;
            cursor.setDate(cursor.getDate() - 1);
            continue;
          }

          if (i === 0) {
            cursor.setDate(cursor.getDate() - 1);
            continue;
          }
          break;
        }

        const last = uniqueDays[0] ? toDateOnly(uniqueDays[0]) : null;
        const inactiveDays = last
          ? Math.max(
              0,
              Math.floor(
                (new Date(today.getFullYear(), today.getMonth(), today.getDate()) - last) /
                  (1000 * 60 * 60 * 24)
              )
            )
          : 999;

        setReminder({ streak, inactiveDays, loading: false });
      } catch {
        if (!mounted) return;
        setReminder({ streak: 0, inactiveDays: 0, loading: false });
      }
    }

    loadReminder();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold text-gray-900">
          Therapy & Activity Modules
        </h1>

        {!reminder.loading && (
          <div
            className={`mt-6 rounded-xl border p-4 text-sm ${
              reminder.inactiveDays >= 3
                ? "border-orange-200 bg-orange-50 text-orange-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            <div className="font-semibold">Activity reminder</div>
            <p className="mt-1">
              Current streak: {reminder.streak} day{reminder.streak === 1 ? "" : "s"}.{" "}
              {reminder.inactiveDays >= 3
                ? `No activity logged for ${reminder.inactiveDays} days. Restart with a short 10-minute session today.`
                : "Great consistency. Keep a daily routine to strengthen progress."}
            </p>
          </div>
        )}

        {/* Recommended Mode Banner */}
        {isRecommendedMode && (
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <FaStar className="text-yellow-500" />
                Recommended Mode is ON
              </div>

              <button
                type="button"
                onClick={() => navigate("/activities", { replace: true })}
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                <FaRotateLeft />
                Reset
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {displayActivities.map((a) => {
            const isRec = recommendedKeys.has(a.key);

            return (
              <Link
                key={a.key}
                to={a.to}
                className="group rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition"
                style={{ textDecoration: "none" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-xl text-[#4a6cf7]">
                      {a.icon}
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {a.title}
                    </div>
                  </div>

                  {isRec && (
                    <FaStar className="text-yellow-500" />
                  )}
                </div>

                <div className="mt-3 text-sm text-gray-600">{a.desc}</div>

                <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#4a6cf7] group-hover:translate-x-1 transition">
                  Open
                  <FaArrowRight className="text-xs" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
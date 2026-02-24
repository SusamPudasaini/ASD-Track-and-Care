import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import Navbar from "../../components/navbar/Navbar";

export default function ActivitiesHub() {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ recommended mode from query params
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
      tags: ["attention", "focus", "low-stress"],
    },
    {
      key: "SEQUENCE_MEMORY",
      title: "Sequence Memory",
      desc: "Watch a sequence of tiles and repeat it. Gets longer each level.",
      to: "/activities/sequence-memory",
      tags: ["memory", "pattern", "structure"],
    },
    {
      key: "NUMBER_MEMORY",
      title: "Number Memory",
      desc: "Memorize the number and type it back. Adds one digit per level.",
      to: "/activities/number-memory",
      tags: ["memory", "cognition"],
    },
    {
      key: "VISUAL_MEMORY",
      title: "Visual Memory",
      desc: "Remember highlighted tiles and tap them back. Adds one tile per level.",
      to: "/activities/visual-memory",
      tags: ["visual", "memory", "attention"],
    },
    {
      key: "SOUND_THERAPY",
      title: "Sound Therapy",
      desc: "Parent-guided: play a sound, child answers, parent confirms to level up.",
      to: "/activities/sound-therapy",
      tags: ["communication", "parent-guided", "speech"],
    },
  ];

  // ✅ Decide which activities to prioritize by risk
  const recommendedKeys = useMemo(() => {
    const r = String(derivedRisk || "").toLowerCase();
    if (!isRecommendedMode) return new Set();

    if (r === "high") return new Set(["SOUND_THERAPY", "VISUAL_MEMORY", "SEQUENCE_MEMORY"]);
    if (r === "moderate") return new Set(["SOUND_THERAPY", "REACTION_TIME", "VISUAL_MEMORY"]);
    return new Set(["REACTION_TIME", "SEQUENCE_MEMORY"]);
  }, [isRecommendedMode, derivedRisk]);

  // ✅ reorder list: recommended first (but still show all)
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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Therapy & Activity Modules</h1>
            <p className="mt-1 text-sm text-gray-600">
              HumanBenchmark-style exercises adapted to be calmer, predictable, and child-friendly.
            </p>
          </div>
        </div>

        {/* ✅ Recommended mode banner */}
        {isRecommendedMode && (
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">Recommended Mode is ON</div>
                <div className="text-blue-800">
                  Highlighting activities for <span className="font-semibold">{derivedRisk || "your result"}</span>
                  {query.has("p") ? (
                    <>
                      {" "}
                      (ASD probability: <span className="font-semibold">{(recP * 100).toFixed(1)}%</span>)
                    </>
                  ) : null}
                  .
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/activities", { replace: true })}
                className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Reset (View all)
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
                className={`rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition`}
                style={{ textDecoration: "none" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-lg font-semibold text-gray-900">{a.title}</div>
                  {isRec && (
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      Recommended
                    </span>
                  )}
                </div>

                <div className="mt-2 text-sm text-gray-600">{a.desc}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(a.tags || []).map((t) => (
                    <span
                      key={t}
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        isRec ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-600"
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-4 text-sm font-semibold text-[#4a6cf7]">Open →</div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
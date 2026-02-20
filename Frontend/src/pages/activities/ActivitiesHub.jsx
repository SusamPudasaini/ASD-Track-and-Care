import { Link } from "react-router-dom";
import Navbar from "../../components/navbar/Navbar";

export default function ActivitiesHub() {
  const activities = [
    {
      key: "REACTION_TIME",
      title: "Reaction Time",
      desc: "Wait for the signal, then tap as fast as you can. 5 trials.",
      to: "/activities/reaction-time",
    },
    {
      key: "SEQUENCE_MEMORY",
      title: "Sequence Memory",
      desc: "Watch a sequence of tiles and repeat it. Gets longer each level.",
      to: "/activities/sequence-memory",
    },
    {
      key: "NUMBER_MEMORY",
      title: "Number Memory",
      desc: "Memorize the number and type it back. Adds one digit per level.",
      to: "/activities/number-memory",
    },
    {
      key: "VISUAL_MEMORY",
      title: "Visual Memory",
      desc: "Remember highlighted tiles and tap them back. Adds one tile per level.",
      to: "/activities/visual-memory",
    },
    {
      key: "SOUND_THERAPY",
      title: "Sound Therapy",
      desc: "Parent-guided: play a sound, child answers, parent confirms to level up.",
      to: "/activities/sound-therapy",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              Therapy & Activity Modules
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              HumanBenchmark-style exercises adapted to be calmer, predictable, and child-friendly.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {activities.map((a) => (
            <Link
              key={a.key}
              to={a.to}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition"
              style={{ textDecoration: "none" }}
            >
              <div className="text-lg font-semibold text-gray-900">{a.title}</div>
              <div className="mt-2 text-sm text-gray-600">{a.desc}</div>
              <div className="mt-4 text-sm font-semibold text-[#4a6cf7]">
                Open →
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
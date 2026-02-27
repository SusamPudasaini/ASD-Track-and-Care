import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";

// ✅ Font Awesome (react-icons wrapper)
import {
  FaGamepad,
  FaUserDoctor,   
  FaChartLine,
  FaBrain,
  FaEarListen,
  FaComments,
  FaCheck,
  FaArrowRight,
} from "react-icons/fa6";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white">
        {/* soft blobs */}
        <div className="pointer-events-none absolute -top-24 right-[-120px] h-[520px] w-[520px] rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-[-120px] h-[420px] w-[420px] rounded-full bg-indigo-200/40 blur-3xl" />

        <div className="mx-auto max-w-6xl px-6 pb-16 pt-20 md:pb-20 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
              Supporting Children with Autism through{" "}
              <span className="text-[#4a6cf7]">Therapy & Interactive Activities</span>
            </h1>

            <p className="mt-6 text-base leading-relaxed text-gray-600 md:text-lg">
              A structured platform for parents and therapists to guide activities,
              book therapy sessions, and track progress with clarity and consistency.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                to="/activities"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4a6cf7] px-6 py-3 text-white font-semibold shadow-sm transition hover:bg-[#3f5ee0] hover:-translate-y-0.5"
              >
                <FaGamepad className="text-lg" />
                Explore Activities
                <FaArrowRight className="text-sm" />
              </Link>

              <Link
                to="/therapists"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-800 transition hover:bg-gray-50 hover:-translate-y-0.5"
              >
                <FaUserDoctor className="text-lg text-[#4a6cf7]" />
                Find Therapists
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold tracking-widest text-[#4a6cf7]">
              CORE FEATURES
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-900 md:text-4xl">
              Everything in one supportive place
            </h2>
            <p className="mt-4 text-gray-600 md:text-lg">
              Designed to make therapy, home practice, and progress tracking simple
              for families and professionals.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:mt-14 md:grid-cols-3">
            <FeatureCard
              icon={<FaGamepad />}
              title="Interactive Therapy Modules"
              desc="Reaction time, memory exercises, sound recognition, and more — built to improve attention, response control, and sensory processing."
              onClick={() => navigate("/activities")}
            />

            <FeatureCard
              icon={<FaUserDoctor />}
              badge="Most Popular"
              highlight
              title="Professional Therapist Booking"
              desc="Search and book certified therapists, manage sessions, and keep everything organized in one place."
              onClick={() => navigate("/therapists")}
            />

            <FeatureCard
              icon={<FaChartLine />}
              title="Progress Tracking"
              desc="Monitor activity performance and therapy sessions to see measurable improvement over time."
              onClick={() => navigate("/progress")}
            />
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold tracking-widest text-[#4a6cf7]">
              MODULE AREAS
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-900 md:text-4xl">
              Guided focus areas for daily improvement
            </h2>
            <p className="mt-4 text-gray-600 md:text-lg">
              Balanced modules that support skill-building across key developmental areas.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:mt-14 md:grid-cols-3">
            <ModuleCard
              icon={<FaBrain />}
              title="Cognitive Skills"
              desc="Build attention, memory, and response control using structured activities."
              items={[
                "Memory & pattern exercises",
                "Reaction time practice",
                "Focus and task completion",
              ]}
            />

            <ModuleCard
              icon={<FaEarListen />}
              title="Sensory Support"
              desc="Activities designed to help sensory recognition and regulation."
              items={[
                "Sound recognition games",
                "Visual matching tasks",
                "Calm, guided repetition",
              ]}
            />

            <ModuleCard
              icon={<FaComments />}
              title="Communication"
              desc="Support early communication behaviors and interaction routines."
              items={[
                "Prompt-based interactions",
                "Turn-taking activities",
                "Simple expression practice",
              ]}
            />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14 md:py-16">
          <div className="grid grid-cols-2 gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:grid-cols-4 md:p-10">
            <StatItem value="20" label="Activities" />
            <StatItem value="10" label="Therapists" />
            <StatItem value="100" label="Sessions Tracked" />
            <StatItem value="24/7" label="Tracking System" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#3f5ee0] to-[#4a6cf7]">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute left-6 top-6 h-10 w-10 rounded-xl border border-white" />
          <div className="absolute right-10 top-16 h-12 w-12 rounded-xl border border-white" />
          <div className="absolute bottom-10 left-1/2 h-14 w-14 -translate-x-1/2 rounded-xl border border-white" />
        </div>

        <div className="mx-auto max-w-6xl px-6 py-16 text-center text-white md:py-20">
          <h2 className="text-2xl font-extrabold md:text-4xl">
            Ready to start a structured routine?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/90 md:text-lg">
            Explore activities, connect with therapists, and track progress in one place.
          </p>

          <button
            onClick={() => navigate("/activities")}
            className="mt-10 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3 font-semibold text-[#4a6cf7] shadow-sm transition hover:-translate-y-0.5 hover:bg-white/95"
          >
            Get Started <FaArrowRight className="text-sm" />
          </button>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc, onClick, badge, highlight }) {
  return (
    <div
      onClick={onClick}
      className={[
        "group relative cursor-pointer rounded-2xl border bg-white p-7 shadow-sm transition",
        "hover:-translate-y-2 hover:shadow-lg",
        highlight
          ? "border-[#4a6cf7] bg-gradient-to-br from-blue-50 to-white"
          : "border-gray-100 hover:border-[#4a6cf7]/60",
      ].join(" ")}
    >
      {badge ? (
        <div className="absolute right-4 top-4 rounded-full bg-[#4a6cf7] px-3 py-1 text-xs font-semibold text-white">
          {badge}
        </div>
      ) : null}

      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-2xl text-[#4a6cf7] transition group-hover:rotate-3 group-hover:scale-110">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-bold text-gray-900">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">{desc}</p>

      <div className="mt-5 text-xl font-bold text-[#4a6cf7] opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100">
        <FaArrowRight />
      </div>
    </div>
  );
}

function ModuleCard({ icon, title, desc, items }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition hover:-translate-y-2 hover:border-[#4a6cf7]/50 hover:shadow-lg">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-100 text-2xl text-[#4a6cf7]">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-bold text-gray-900">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">{desc}</p>

      <ul className="mt-5 space-y-2 text-sm text-gray-700">
        {items.map((x) => (
          <li key={x} className="flex items-start gap-2">
            <FaCheck className="mt-0.5 text-[#4a6cf7]" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatItem({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-extrabold text-[#4a6cf7] md:text-4xl">{value}</div>
      <div className="mt-2 text-xs font-semibold tracking-widest text-gray-500">
        {label.toUpperCase()}
      </div>
    </div>
  );
}
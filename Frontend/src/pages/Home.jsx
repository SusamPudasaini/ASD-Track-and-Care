import { Link } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Hero Section */}
        <section className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Supporting Children with Autism Through
            <span className="text-[#4a6cf7]"> Therapy & Interactive Activities</span>
          </h1>

          <p className="mt-6 text-gray-600 max-w-2xl mx-auto text-lg">
            A structured platform designed to help parents and therapists
            support children with autism through guided activities,
            professional therapy sessions, and personalized tracking.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/activities"
              className="rounded bg-[#4a6cf7] px-6 py-3 text-white font-semibold hover:bg-[#3f5ee0] transition"
            >
              Explore Activities
            </Link>

            <Link
              to="/therapists"
              className="rounded border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Find Therapists
            </Link>
          </div>
        </section>

        {/* Feature Section */}
        <section className="mt-20 grid gap-8 md:grid-cols-3">
          <FeatureCard
            title="Interactive Therapy Modules"
            desc="Reaction time, memory exercises, sound recognition, and more — built to improve attention, response control, and sensory processing."
          />

          <FeatureCard
            title="Professional Therapist Booking"
            desc="Search, view, and book certified therapists with secure payments and session tracking."
          />

          <FeatureCard
            title="Progress Tracking"
            desc="Monitor performance across activities and therapy sessions to observe measurable improvement over time."
          />
        </section>
      </main>
    </div>
  );
}

function FeatureCard({ title, desc }) {
  return (
    <div className="rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition bg-white">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-4 text-gray-600 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
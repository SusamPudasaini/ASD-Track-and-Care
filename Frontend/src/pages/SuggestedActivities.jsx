import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function SuggestedActivities() {
  const navigate = useNavigate();
  const query = useQuery();

  const probability = Number(query.get("p") || 0);
  const risk = query.get("risk") || "Low";

  const getActivities = () => {
    if (risk === "High") {
      return [
        "Applied Behavior Analysis (ABA) sessions",
        "Speech Therapy exercises",
        "Occupational Therapy sensory activities",
        "Structured social skill training",
      ];
    }

    if (risk === "Moderate") {
      return [
        "Interactive communication games",
        "Story-based emotion recognition",
        "Motor coordination activities",
        "Group play sessions",
      ];
    }

    return [
      "Daily reading interaction",
      "Eye contact reinforcement games",
      "Outdoor social play",
      "Music and rhythm engagement",
    ];
  };

  const activities = getActivities();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">
          Suggested Activities
        </h1>

        <div className="mt-6 rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm">
            <span className="font-semibold">Risk Level:</span> {risk}
          </p>
          <p className="text-sm">
            <span className="font-semibold">ASD Probability:</span>{" "}
            {(probability * 100).toFixed(1)}%
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {activities.map((a, index) => (
            <div
              key={index}
              className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition"
            >
              <h3 className="font-semibold text-gray-900">{a}</h3>
              <button
                onClick={() => navigate("/questionnaire")}
                className="mt-4 text-sm text-blue-600 hover:underline"
              >
                Retake Assessment
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
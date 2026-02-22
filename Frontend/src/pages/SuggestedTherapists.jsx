import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function SuggestedTherapists() {
  const navigate = useNavigate();
  const query = useQuery();

  const probability = Number(query.get("p") || 0);
  const risk = query.get("risk") || "Low";

  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔥 Recommendation logic
  const recommendedType = useMemo(() => {
    if (risk === "High") return "Specialized ASD Therapist";
    if (risk === "Moderate") return "Developmental Therapist";
    return "Child Psychologist";
  }, [risk]);

  useEffect(() => {
    const fetchTherapists = async () => {
      try {
        // In future, you can pass risk to backend
        // const res = await api.get(`/api/therapists?risk=${risk}`);

        const res = await api.get("/api/therapists");
        setTherapists(res.data || []);
      } catch (err) {
        console.error("Failed to fetch therapists");
      } finally {
        setLoading(false);
      }
    };

    fetchTherapists();
  }, [risk]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Recommended Therapists
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Based on your screening result:
          </p>

          <div className="mt-4 rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm">
              <span className="font-semibold">Risk Level:</span> {risk}
            </p>
            <p className="text-sm">
              <span className="font-semibold">ASD Probability:</span>{" "}
              {(probability * 100).toFixed(1)}%
            </p>
            <p className="mt-2 text-sm text-blue-600 font-medium">
              Recommended Focus: {recommendedType}
            </p>
          </div>
        </div>

        {loading ? (
          <p>Loading therapists...</p>
        ) : therapists.length === 0 ? (
          <p>No therapists found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {therapists.map((t) => (
              <div
                key={t.id}
                className="rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold">{t.name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Specialization: {t.specialization}
                </p>
                <p className="text-sm text-gray-600">
                  Experience: {t.experienceYears} years
                </p>

                <button
                  onClick={() => navigate(`/therapist/${t.id}`)}
                  className="mt-4 w-full rounded-md bg-[#4a6cf7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
                >
                  View Profile
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
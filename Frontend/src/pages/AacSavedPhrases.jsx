import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import { FaArrowLeft, FaHeart, FaMagnifyingGlass, FaPlay } from "react-icons/fa6";

function getErrorMessage(err) {
  const data = err?.response?.data;

  if (!data) return "Something went wrong.";
  if (typeof data === "string") return data;

  if (typeof data === "object") {
    if (data.message) return data.message;
    if (data.error) return data.error;
    try {
      return JSON.stringify(data);
    } catch {
      return "Something went wrong.";
    }
  }

  return String(data);
}

function FavoritePhraseCard({ phrase, onUse }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-pink-500">Saved Phrase</div>
      <div className="mt-2 text-sm font-medium text-gray-900">{phrase.phraseText}</div>
      <button
        type="button"
        onClick={() => onUse(phrase)}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#4a6cf7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
      >
        <FaPlay />
        Use in AAC Board
      </button>
    </div>
  );
}

export default function AacSavedPhrases() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [favoritePhrases, setFavoritePhrases] = useState([]);

  useEffect(() => {
    loadSavedPhrases();
  }, []);

  async function loadSavedPhrases() {
    try {
      setLoading(true);
      const res = await api.get("/api/aac/favorite-phrases");
      setFavoritePhrases(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleUsePhrase(phrase) {
    const phraseText = String(phrase?.phraseText || "").trim();
    if (!phraseText) {
      toast.error("Phrase is empty.");
      return;
    }

    navigate(`/aac-board?phrase=${encodeURIComponent(phraseText)}`, {
      state: { prefillPhrase: phraseText },
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return favoritePhrases;
    return favoritePhrases.filter((item) => String(item?.phraseText || "").toLowerCase().includes(q));
  }, [favoritePhrases, query]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="rounded-3xl border border-blue-100 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FaHeart className="text-pink-500" />
                <h1 className="text-2xl font-semibold text-gray-900">Saved AAC Phrases</h1>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Browse all saved AAC phrases and load them directly into the AAC board.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/aac-board")}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <FaArrowLeft />
              Back to AAC Board
            </button>
          </div>

          <div className="mt-5 relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <FaMagnifyingGlass />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saved phrases..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </section>

        <section className="mt-8">
          {loading ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
              Loading saved phrases...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
              No saved AAC phrases found.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((phrase) => (
                <FavoritePhraseCard key={phrase.id} phrase={phrase} onUse={handleUsePhrase} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

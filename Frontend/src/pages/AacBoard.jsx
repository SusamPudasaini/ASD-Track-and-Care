import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import {
  FaComments,
  FaVolumeHigh,
  FaTrash,
  FaDeleteLeft,
  FaHeart,
  FaRotateLeft,
  FaMagnifyingGlass,
  FaShapes,
  FaImage,
} from "react-icons/fa6";

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

const CATEGORY_OPTIONS = [
  "ALL",
  "PEOPLE",
  "ACTIONS",
  "FOOD",
  "DRINKS",
  "EMOTIONS",
  "NEEDS",
  "ACTIVITIES",
  "PLACES",
];

function prettyLabel(v) {
  return String(v || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SentenceChip({ word, onRemove }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
      <span>{word}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-1 text-blue-600 transition hover:bg-blue-200"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

function FavoritePhraseCard({ phrase, onUse }) {
  return (
    <button
      type="button"
      onClick={() => onUse(phrase.phraseText)}
      className="w-full rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-pink-500">
        Favorite Phrase
      </div>
      <div className="mt-2 text-sm font-medium text-gray-900">{phrase.phraseText}</div>
      <div className="mt-3 text-xs font-semibold text-blue-600">Use Phrase →</div>
    </button>
  );
}

function CategoryButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
        active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function AacCardItem({ item, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
    >
      <div className="aspect-square w-full bg-gray-100">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.label}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
            <FaImage />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
          {prettyLabel(item.category)}
        </div>
        <div className="text-base font-semibold text-gray-900 group-hover:text-blue-600">
          {item.label}
        </div>
        {item.spokenTextNepali ? (
          <div className="mt-1 text-xs text-gray-500">{item.spokenTextNepali}</div>
        ) : null}
      </div>
    </button>
  );
}

export default function AacBoard() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [favoritePhrases, setFavoritePhrases] = useState([]);
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [sentence, setSentence] = useState([]);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    loadCards("ALL");
    loadFavoritePhrases();
  }, []);

  async function loadCards(selectedCategory = "ALL") {
    try {
      setLoading(true);

      const res = await api.get("/api/aac/cards", {
        params: {
          category: selectedCategory === "ALL" ? undefined : selectedCategory,
        },
      });

      setCards(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadFavoritePhrases() {
    try {
      const res = await api.get("/api/aac/favorite-phrases");
      setFavoritePhrases(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleCategory(nextCategory) {
    setCategory(nextCategory);
    await loadCards(nextCategory);
  }

  function handleSelectCard(item) {
    setSentence((prev) => [
      ...prev,
      {
        label: item.label,
        spoken: item.spokenTextNepali || item.label,
      },
    ]);
  }

  function handleRemoveWord(index) {
    setSentence((prev) => prev.filter((_, i) => i !== index));
  }

  function handleBackspace() {
    setSentence((prev) => prev.slice(0, -1));
  }

  function handleClear() {
    setSentence([]);
  }

  function handleReset() {
    setSentence([]);
    setQuery("");
    setCategory("ALL");
    loadCards("ALL");
  }

  async function handleSpeak() {
    const text = sentence.map((w) => w.spoken).join(" ").trim();

    if (!text) {
      toast.error("Please build a sentence first.");
      return;
    }

    try {
      setSpeaking(true);

      const res = await api.post(
        "/api/aac/speak",
        { text },
        { responseType: "blob" }
      );

      const audioBlob = new Blob([res.data], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setSpeaking(false);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setSpeaking(false);
        toast.error("Could not play Nepali audio.");
      };

      await audio.play();
    } catch (err) {
      console.error(err);
      setSpeaking(false);
      toast.error(getErrorMessage(err) || "Could not generate Nepali voice.");
    }
  }

  async function handleSaveFavorite() {
    const phraseText = sentence.map((w) => w.label).join(" ").trim();

    if (!phraseText) {
      toast.error("Please build a sentence first.");
      return;
    }

    try {
      setSavingFavorite(true);
      await api.post("/api/aac/favorite-phrases", { phraseText });
      toast.success("Phrase saved to favorites.");
      await loadFavoritePhrases();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingFavorite(false);
    }
  }

  function handleUseFavorite(phraseText) {
    const words = String(phraseText || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    setSentence(words.map((word) => ({ label: word, spoken: word })));
    toast.success("Favorite phrase loaded.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;

    return cards.filter((item) => {
      const hay = [item.label, item.category, item.spokenTextNepali]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [cards, query]);

  const sentenceText = sentence.map((w) => w.label).join(" ").trim();
  const spokenPreview = sentence.map((w) => w.spoken).join(" ").trim();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
              <FaComments />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">AAC Communication Board</h1>
              <p className="mt-1 max-w-3xl text-sm text-gray-600">
                Help children build simple phrases using visual communication cards for needs,
                emotions, activities, food, and more.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-800">Sentence Builder</div>
                <div className="mt-1 text-xs text-gray-500">
                  Tap cards below to build a phrase like “I want water”.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSpeak}
                  disabled={speaking}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                    speaking
                      ? "cursor-not-allowed bg-blue-300"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  <FaVolumeHigh />
                  {speaking ? "Speaking..." : "Speak Nepali"}
                </button>

                <button
                  type="button"
                  onClick={handleBackspace}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <FaDeleteLeft />
                  Remove Last
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <FaTrash />
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleSaveFavorite}
                  disabled={savingFavorite}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                    savingFavorite
                      ? "cursor-not-allowed bg-pink-300"
                      : "bg-pink-500 hover:bg-pink-600"
                  }`}
                >
                  <FaHeart />
                  {savingFavorite ? "Saving..." : "Save Phrase"}
                </button>
              </div>
            </div>

            <div className="mt-5 min-h-[96px] rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4">
              {sentence.length === 0 ? (
                <div className="flex h-full min-h-[64px] items-center text-sm text-gray-500">
                  No words selected yet. Start tapping communication cards below.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sentence.map((word, index) => (
                    <SentenceChip
                      key={`${word.label}-${index}`}
                      word={word.label}
                      onRemove={() => handleRemoveWord(index)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Current phrase:</span>{" "}
              {sentenceText || "—"}
            </div>

            <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <span className="font-semibold">Nepali speech text:</span>{" "}
              {spokenPreview || "—"}
            </div>
          </div>

          <div className="mt-5 relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <FaMagnifyingGlass />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search AAC cards..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <CategoryButton
                key={opt}
                active={category === opt}
                onClick={() => handleCategory(opt)}
              >
                {prettyLabel(opt)}
              </CategoryButton>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <FaRotateLeft />
              Reset Board
            </button>

            <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
              <FaShapes />
              {filteredCards.length} Card{filteredCards.length !== 1 ? "s" : ""} Found
            </div>
          </div>
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Communication Cards</h2>
              <p className="mt-1 text-sm text-gray-500">
                Select cards to help form simple meaningful phrases.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
              Loading AAC cards...
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
              No AAC cards found for the current search or category.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCards.map((item) => (
                <AacCardItem key={item.id} item={item} onSelect={handleSelectCard} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Favorite Phrases</h2>
            <p className="mt-1 text-sm text-gray-500">
              Quickly reuse saved phrases that are commonly used by the child and parent.
            </p>
          </div>

          {favoritePhrases.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
              No favorite phrases saved yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {favoritePhrases.map((phrase) => (
                <FavoritePhraseCard
                  key={phrase.id}
                  phrase={phrase}
                  onUse={handleUseFavorite}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
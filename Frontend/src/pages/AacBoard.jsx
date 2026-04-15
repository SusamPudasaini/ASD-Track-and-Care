import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCircleCheck,
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

function pickBrowserFallbackVoice(voices) {
  const safeVoices = Array.isArray(voices) ? voices : [];

  const matchVoice = (matcher) => safeVoices.find((voice) => matcher(voice || {}));

  return (
    matchVoice((voice) => String(voice.lang || "").toLowerCase() === "ne-np") ||
    matchVoice((voice) => String(voice.lang || "").toLowerCase().startsWith("ne")) ||
    matchVoice((voice) => String(voice.lang || "").toLowerCase().startsWith("hi")) ||
    matchVoice((voice) => String(voice.lang || "").toLowerCase().startsWith("en")) ||
    safeVoices[0] ||
    null
  );
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

function StepBubble({ number, active, done }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
        active
          ? "bg-[#4a6cf7] text-white"
          : done
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {number}
    </div>
  );
}

export default function AacBoard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [favoritePhrases, setFavoritePhrases] = useState([]);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [sentence, setSentence] = useState([]);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recitingWords, setRecitingWords] = useState([]);
  const [recitingIndex, setRecitingIndex] = useState(-1);

  const recitationTimerRef = useRef(null);
  const processedPrefillRef = useRef("");

  const totalSteps = 4;

  const cardByLabel = useMemo(() => {
    const map = new Map();
    for (const card of cards) {
      const key = String(card?.label || "").trim().toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, card);
      }
    }
    return map;
  }, [cards]);

  function stopRecitationPreview() {
    if (recitationTimerRef.current) {
      window.clearInterval(recitationTimerRef.current);
      recitationTimerRef.current = null;
    }
    setRecitingIndex(-1);
    setRecitingWords([]);
  }

  function startRecitationPreview(words) {
    stopRecitationPreview();
    if (!Array.isArray(words) || words.length === 0) return;

    setRecitingWords(words);
    setRecitingIndex(0);

    if (words.length === 1) return;

    let index = 0;
    recitationTimerRef.current = window.setInterval(() => {
      index = (index + 1) % words.length;
      setRecitingIndex(index);
    }, 900);
  }

  function buildSentenceFromPhrase(phraseText) {
    return String(phraseText || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => {
        const matched = cardByLabel.get(word.toLowerCase());
        return {
          label: word,
          spoken: matched?.spokenTextNepali || word,
          imageUrl: matched?.imageUrl || "",
        };
      });
  }

  async function tryBrowserFallbackSpeech(text) {
    if (
      typeof window === "undefined" ||
      !window.speechSynthesis ||
      typeof window.SpeechSynthesisUtterance === "undefined"
    ) {
      return false;
    }

    const phrase = String(text || "").trim();
    if (!phrase) return false;

    const synth = window.speechSynthesis;

    const voices = await new Promise((resolve) => {
      const existing = synth.getVoices();
      if (existing.length) {
        resolve(existing);
        return;
      }

      const onVoicesChanged = () => {
        cleanup();
        resolve(synth.getVoices());
      };

      const cleanup = () => {
        synth.removeEventListener?.("voiceschanged", onVoicesChanged);
        window.clearTimeout(timeoutId);
      };

      const timeoutId = window.setTimeout(() => {
        cleanup();
        resolve(synth.getVoices());
      }, 1000);

      synth.addEventListener?.("voiceschanged", onVoicesChanged);
    });

    const voice = pickBrowserFallbackVoice(voices);

    return new Promise((resolve) => {
      try {
        const utterance = new window.SpeechSynthesisUtterance(phrase);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang || "ne-NP";
        } else {
          utterance.lang = "ne-NP";
        }

        utterance.rate = 0.9;
        utterance.pitch = 1;

        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);

        synth.cancel();
        synth.speak(utterance);
      } catch {
        resolve(false);
      }
    });
  }

  useEffect(() => {
    loadCards("ALL");
    loadFavoritePhrases();
  }, []);

  useEffect(() => {
    const fromState = location.state?.prefillPhrase;
    const fromQuery = searchParams.get("phrase");
    const prefillPhrase = String(fromState || fromQuery || "").trim();

    if (!prefillPhrase) return;
    if (processedPrefillRef.current === prefillPhrase) return;
    if (loading && cards.length === 0) return;

    const mapped = buildSentenceFromPhrase(prefillPhrase);
    setSentence(mapped);
    goToStep(2);
    toast.success("Loaded saved phrase.");
    processedPrefillRef.current = prefillPhrase;

    navigate("/aac-board", { replace: true, state: null });
  }, [location.state, searchParams, cardByLabel, navigate, loading, cards.length]);

  useEffect(() => {
    return () => {
      stopRecitationPreview();
    };
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
        imageUrl: item.imageUrl || "",
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
    const wordsToSpeak = sentence.map((w) => ({ ...w }));
    const text = wordsToSpeak.map((w) => w.spoken).join(" ").trim();

    if (!text) {
      toast.error("Please build a sentence first.");
      return;
    }

    try {
      setSpeaking(true);
      startRecitationPreview(wordsToSpeak);

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
        stopRecitationPreview();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setSpeaking(false);
        stopRecitationPreview();
        toast.error("Could not play Nepali audio.");
      };

      await audio.play();
    } catch (err) {
      console.error(err);

      let message = getErrorMessage(err);
      const blobData = err?.response?.data;

      if (blobData instanceof Blob) {
        try {
          const textPayload = await blobData.text();
          if (textPayload) {
            try {
              const parsed = JSON.parse(textPayload);
              message = parsed?.message || parsed?.error || textPayload;
            } catch {
              message = textPayload;
            }
          }
        } catch {
          // Keep fallback message if blob cannot be decoded.
        }
      }

      const usedBrowserFallback = await tryBrowserFallbackSpeech(text);
      setSpeaking(false);
      stopRecitationPreview();

      if (usedBrowserFallback) {
        toast("ElevenLabs failed, so fallback device voice was used.");
        return;
      }

      toast.error(message || "Could not generate Nepali voice.");
    }
  }

  async function handleSaveFavorite({ moveToSaved = false } = {}) {
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
      if (moveToSaved) {
        goToStep(4);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingFavorite(false);
    }
  }

  function handleUseFavorite(phraseText) {
    const mapped = buildSentenceFromPhrase(phraseText);
    setSentence(mapped);
    toast.success("Favorite phrase loaded.");
    goToStep(2);
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
  const progressPercent = useMemo(() => Math.round((step / totalSteps) * 100), [step]);

  function goToStep(nextStep) {
    const clamped = Math.min(totalSteps, Math.max(1, nextStep));
    setDirection(clamped >= step ? 1 : -1);
    setStep(clamped);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="rounded-3xl border border-blue-100 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FaComments className="text-[#4a6cf7]" />
                <h1 className="text-2xl font-semibold text-gray-900">AAC Communication Flow</h1>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                View cards, build and use a phrase, then save and reuse favorite phrases.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              Selected words: <span className="font-semibold">{sentence.length}</span>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
              <span>{step === 4 ? "Saved phrases" : `Step ${step} of ${totalSteps}`}</span>
              <span>{progressPercent}%</span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#4a6cf7] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <StepBubble key={i} number={i + 1} active={step === i + 1} done={step > i + 1} />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`aac-step-${step}`}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {step === 1 ? (
                <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Step 1: View and Pick Cards</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Search and choose communication cards to build a phrase.
                    </p>
                  </div>

                  <div className="relative">
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

                  <div className="flex flex-wrap gap-2">
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

                  <div className="flex flex-wrap gap-2">
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

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!sentence.length) {
                          toast.error("Select at least one card first.");
                          return;
                        }
                        goToStep(2);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#4a6cf7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
                    >
                      Next
                      <FaArrowRight />
                    </button>
                  </div>

                  <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Live sentence preview
                    </div>

                    {sentence.length === 0 ? (
                      <div className="text-sm text-gray-500">Select cards to start building a phrase.</div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {sentence.map((word, index) => (
                            <SentenceChip
                              key={`${word.label}-${index}`}
                              word={word.label}
                              onRemove={() => handleRemoveWord(index)}
                            />
                          ))}
                        </div>
                        <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">Current phrase:</span> {sentenceText || "—"}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Step 2: Use the Phrase</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Adjust selected words and play Nepali speech output.
                    </p>
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
                      {speaking ? "Speaking..." : "Speak"}
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
                  </div>

                  <div className="min-h-[96px] rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4">
                    {sentence.length === 0 ? (
                      <div className="flex h-full min-h-[64px] items-center text-sm text-gray-500">
                        No words selected yet. Go back and tap communication cards.
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

                  <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">Current phrase:</span> {sentenceText || "—"}
                  </div>

                  {speaking && recitingWords.length > 0 ? (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
                        Reciting now
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {recitingWords.map((word, index) => {
                          const active = index === recitingIndex;
                          return (
                            <div
                              key={`${word.label}-${index}-reciting`}
                              className={`overflow-hidden rounded-2xl border bg-white ${
                                active ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200"
                              }`}
                            >
                              <div className="aspect-square w-full bg-slate-100">
                                {word.imageUrl ? (
                                  <img src={word.imageUrl} alt={word.label} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                                    <FaImage className="text-3xl" />
                                  </div>
                                )}
                              </div>
                              <div className="px-3 py-2 text-xs font-semibold text-slate-700">
                                {word.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <FaArrowLeft />
                      Previous
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!sentence.length) {
                          toast.error("Build a phrase before continuing.");
                          return;
                        }
                        goToStep(3);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#4a6cf7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
                    >
                      Next
                      <FaArrowRight />
                    </button>
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Step 3: Save Phrase</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Confirm the phrase and save it so it can be reused quickly later.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Phrase Preview
                    </div>
                    <div className="mt-3 text-lg font-semibold text-gray-900">{sentenceText || "—"}</div>
                  </div>

                  <div className="flex flex-wrap justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => goToStep(2)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <FaArrowLeft />
                      Previous
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveFavorite({ moveToSaved: true })}
                      disabled={savingFavorite}
                      className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white ${
                        savingFavorite
                          ? "cursor-not-allowed bg-pink-300"
                          : "bg-pink-500 hover:bg-pink-600"
                      }`}
                    >
                      <FaHeart />
                      {savingFavorite ? "Saving..." : "Save and Continue"}
                    </button>
                  </div>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Step 4: View and Reuse Saved Phrases</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Tap any saved phrase to load it back into the AAC sentence builder.
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

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleClear();
                        goToStep(1);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <FaRotateLeft />
                      Build New Phrase
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/aac-board/saved")}
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <FaHeart />
                      Open Saved AAC Phrases Page
                    </button>

                    <button
                      type="button"
                      onClick={() => goToStep(2)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#4a6cf7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
                    >
                      <FaCircleCheck />
                      Use Selected Phrase
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
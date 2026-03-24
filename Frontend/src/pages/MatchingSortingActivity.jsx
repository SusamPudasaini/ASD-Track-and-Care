import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import {
  FaGamepad,
  FaPuzzlePiece,
  FaImage,
  FaRotateLeft,
  FaArrowRight,
  FaArrowLeft,
  FaCheck,
  FaXmark,
  FaBullseye,
  FaFilter,
  FaPlay,
  FaLayerGroup,
} from "react-icons/fa6";

const TYPE_OPTIONS = ["ALL", "MATCHING", "SORTING"];

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

function prettyLabel(v) {
  return String(v || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function groupBy(list, keyGetter) {
  return list.reduce((acc, item) => {
    const key = keyGetter(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function StatBadge({ children, color = "gray" }) {
  const styles = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    yellow: "bg-yellow-100 text-yellow-700",
    gray: "bg-gray-100 text-gray-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[color]}`}>
      {children}
    </span>
  );
}

function TypeButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
          : "border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50"
      }`}
    >
      {children}
    </button>
  );
}

function ImageCard({
  item,
  onClick,
  selected = false,
  disabled = false,
  correct = false,
  wrong = false,
  draggable = false,
  onDragStart,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      draggable={draggable}
      onDragStart={onDragStart}
      className={`group overflow-hidden rounded-3xl border bg-white shadow-sm transition ${
        disabled ? "cursor-not-allowed opacity-80" : "hover:-translate-y-1 hover:shadow-md"
      } ${
        correct
          ? "border-green-400 ring-2 ring-green-200"
          : wrong
          ? "border-red-400 ring-2 ring-red-200"
          : selected
          ? "border-blue-500 ring-2 ring-blue-200"
          : "border-gray-100 hover:border-blue-200"
      }`}
    >
      <div className="aspect-[4/3] w-full bg-gray-100">
        {item?.imageUrl ? (
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

      <div className="p-4 text-center">
        <div className="text-base font-semibold text-gray-900 group-hover:text-blue-600">
          {item?.label || "Untitled"}
        </div>
      </div>
    </button>
  );
}

function ActivityCard({ activity, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
        selected
          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
          : "border-gray-100 bg-white hover:border-blue-200"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatBadge color="purple">{prettyLabel(activity.type)}</StatBadge>
        <StatBadge color="blue">
          {(activity.items || []).length} Item{(activity.items || []).length !== 1 ? "s" : ""}
        </StatBadge>
      </div>

      <div className="text-lg font-semibold text-gray-900">{activity.title}</div>

      {activity.description ? (
        <div className="mt-2 line-clamp-3 text-sm text-gray-600">{activity.description}</div>
      ) : null}
    </button>
  );
}

function StepProgress({ currentStep }) {
  const steps = [
    { id: 1, label: "Choose Type" },
    { id: 2, label: "Choose Activity" },
    { id: 3, label: "Play Activity" },
  ];

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3">
        {steps.map((step) => {
          const active = currentStep === step.id;
          const completed = currentStep > step.id;

          return (
            <div
              key={step.id}
              className={`rounded-2xl border px-4 py-3 ${
                active
                  ? "border-blue-300 bg-blue-50"
                  : completed
                  ? "border-green-200 bg-green-50"
                  : "border-gray-100 bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    completed
                      ? "bg-green-100 text-green-700"
                      : active
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {completed ? <FaCheck /> : step.id}
                </div>
                <div className="text-sm font-semibold text-gray-800">{step.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScreenCard({ title, description, children }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        {description ? <p className="mt-2 text-sm text-gray-500">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function BucketDropZone({ bucket, onDropItem, isActive }) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData("text/plain");
        if (itemId) onDropItem(itemId, bucket);
      }}
      className={`rounded-[2rem] border-2 border-dashed p-6 text-center transition ${
        isActive
          ? "border-blue-500 bg-blue-100"
          : "border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100"
      }`}
    >
      <div className="mb-3 flex justify-center text-3xl text-blue-600">
        <FaLayerGroup />
      </div>
      <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Bucket</div>
      <div className="mt-2 text-lg font-bold text-blue-900">{prettyLabel(bucket)}</div>
      <div className="mt-2 text-sm text-blue-700">Drag item here</div>
    </div>
  );
}

function ShuffleAnimationCard() {
  return (
    <div className="rounded-3xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 p-8">
      <div className="mb-4 text-center">
        <div className="text-lg font-semibold text-yellow-800">Shuffling cards...</div>
        <p className="mt-1 text-sm text-yellow-700">
          Watch carefully and remember the image.
        </p>
      </div>

      <div className="relative mx-auto h-56 w-72">
        <div className="absolute left-8 top-8 h-40 w-28 animate-pulse rounded-2xl border border-white/70 bg-white shadow-md rotate-[-12deg]" />
        <div className="absolute left-20 top-4 h-40 w-28 animate-bounce rounded-2xl border border-white/70 bg-white shadow-md rotate-[8deg]" />
        <div className="absolute left-32 top-10 h-40 w-28 animate-pulse rounded-2xl border border-white/70 bg-white shadow-md rotate-[18deg]" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-800 shadow-sm">
            Mixing choices...
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MatchingSortingActivity() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  const [score, setScore] = useState(0);

  // matching
  const [matchingRounds, setMatchingRounds] = useState([]);
  const [matchingIndex, setMatchingIndex] = useState(0);
  const [matchingPhase, setMatchingPhase] = useState("PROMPT"); // PROMPT | SHUFFLING | ANSWER
  const [matchingAnswered, setMatchingAnswered] = useState(false);
  const [matchingSelectedOptionId, setMatchingSelectedOptionId] = useState(null);
  const [matchingWasCorrect, setMatchingWasCorrect] = useState(null);

  // sorting
  const [sortingItems, setSortingItems] = useState([]);
  const [sortingFeedback, setSortingFeedback] = useState(null);
  const [draggingItemId, setDraggingItemId] = useState(null);

  useEffect(() => {
    loadActivities("ALL");
  }, []);

  async function loadActivities(nextType = "ALL") {
    try {
      setLoading(true);

      const res = await api.get("/api/matching-sorting", {
        params: {
          type: nextType === "ALL" ? undefined : nextType,
        },
      });

      const rows = Array.isArray(res.data) ? res.data : [];
      setActivities(rows);

      if (rows.length > 0) {
        setSelectedActivityId(String(rows[0].id));
      } else {
        setSelectedActivityId("");
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const filteredActivities = useMemo(() => {
    if (typeFilter === "ALL") return activities;
    return activities.filter((x) => x.type === typeFilter);
  }, [activities, typeFilter]);

  const selectedActivity = useMemo(() => {
    return filteredActivities.find((x) => String(x.id) === String(selectedActivityId)) || null;
  }, [filteredActivities, selectedActivityId]);

  useEffect(() => {
    if (!selectedActivity) return;

    setScore(0);
    setSortingFeedback(null);
    setDraggingItemId(null);

    if (selectedActivity.type === "MATCHING") {
      initializeMatching(selectedActivity);
    } else if (selectedActivity.type === "SORTING") {
      initializeSorting(selectedActivity);
    }
  }, [selectedActivity]);

  function initializeMatching(activity) {
    const items = Array.isArray(activity.items) ? activity.items : [];
    const grouped = groupBy(items, (item) => item.matchKey || "");

    const matchGroups = Object.entries(grouped).filter(
      ([key, value]) => key && Array.isArray(value) && value.length >= 1
    );

    const allUniqueItems = matchGroups.map(([, value]) => value[0]);

    const rounds = matchGroups.map(([matchKey, value]) => {
      const prompt = value[0];

      const distractors = shuffleArray(
        allUniqueItems.filter((x) => (x.matchKey || "") !== matchKey)
      ).slice(0, 3);

      const options = shuffleArray([prompt, ...distractors]).slice(0, 4);

      return {
        prompt,
        correctMatchKey: matchKey,
        options,
      };
    });

    setMatchingRounds(shuffleArray(rounds));
    setMatchingIndex(0);
    setMatchingPhase("PROMPT");
    setMatchingAnswered(false);
    setMatchingSelectedOptionId(null);
    setMatchingWasCorrect(null);
  }

  function initializeSorting(activity) {
    const items = Array.isArray(activity.items) ? activity.items : [];
    const normalized = shuffleArray(
      items.map((item) => ({
        ...item,
        placed: false,
      }))
    );

    setSortingItems(normalized);
    setSortingFeedback(null);
    setDraggingItemId(null);
  }

  async function handleTypeChange(nextType) {
    setTypeFilter(nextType);
    await loadActivities(nextType);
  }

  function handleNextStep() {
    if (currentStep === 1) {
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!selectedActivity) {
        toast.error("Please select an activity first.");
        return;
      }
      setCurrentStep(3);
    }
  }

  function handlePrevStep() {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  function restartCurrentActivity() {
    if (!selectedActivity) return;
    setScore(0);

    if (selectedActivity.type === "MATCHING") {
      initializeMatching(selectedActivity);
    } else {
      initializeSorting(selectedActivity);
    }
  }

  // matching logic
  const currentMatchingRound =
    selectedActivity?.type === "MATCHING" ? matchingRounds[matchingIndex] || null : null;

  function revealMatchingAnswers() {
    if (!currentMatchingRound) return;

    setMatchingPhase("SHUFFLING");

    setTimeout(() => {
      setMatchingPhase("ANSWER");
    }, 1400);
  }

  function handleMatchingSelect(option) {
    if (!currentMatchingRound || matchingAnswered || matchingPhase !== "ANSWER") return;

    const isCorrect = (option.matchKey || "") === currentMatchingRound.correctMatchKey;

    setMatchingSelectedOptionId(option.id);
    setMatchingWasCorrect(isCorrect);
    setMatchingAnswered(true);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      toast.success("Correct match!");
    } else {
      toast.error("Not quite right.");
    }
  }

  function goToNextMatchingRound() {
    if (matchingIndex < matchingRounds.length - 1) {
      setMatchingIndex((prev) => prev + 1);
      setMatchingPhase("PROMPT");
      setMatchingAnswered(false);
      setMatchingSelectedOptionId(null);
      setMatchingWasCorrect(null);
    } else {
      toast.success("Matching activity completed!");
    }
  }

  const matchingCompleted =
    selectedActivity?.type === "MATCHING" &&
    matchingRounds.length > 0 &&
    matchingIndex === matchingRounds.length - 1 &&
    matchingAnswered;

  // sorting logic
  const sortingCategories = useMemo(() => {
    if (selectedActivity?.type !== "SORTING") return [];

    return Array.from(
      new Set((selectedActivity.items || []).map((item) => item.categoryKey).filter(Boolean))
    );
  }, [selectedActivity]);

  const sortingRemaining = sortingItems.filter((x) => !x.placed);
  const sortingCompletedCount = sortingItems.filter((x) => x.placed).length;
  const sortingAllDone =
    selectedActivity?.type === "SORTING" &&
    sortingItems.length > 0 &&
    sortingItems.every((x) => x.placed);

  function handleDropToBucket(itemId, bucket) {
    const chosenItem = sortingItems.find((item) => String(item.id) === String(itemId));
    if (!chosenItem) return;

    const isCorrect = (chosenItem.categoryKey || "") === bucket;

    if (isCorrect) {
      setSortingItems((prev) =>
        prev.map((item) =>
          String(item.id) === String(itemId) ? { ...item, placed: true } : item
        )
      );
      setSortingFeedback({
        type: "success",
        text: `"${chosenItem.label}" was placed in the correct bucket.`,
      });
      setScore((prev) => prev + 1);
      toast.success("Correct category!");
    } else {
      setSortingFeedback({
        type: "error",
        text: `"${chosenItem.label}" does not belong in ${prettyLabel(bucket)}.`,
      });
      toast.error("Wrong bucket.");
    }

    setDraggingItemId(null);
  }

  const titleCount = filteredActivities.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-blue-100 p-4 text-2xl text-blue-600">
                <FaGamepad />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  Matching & Sorting Activities
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-gray-600">
                  Guided activities with visual memory matching and drag-and-drop sorting.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <StatBadge color="blue">
                    {titleCount} Activit{titleCount === 1 ? "y" : "ies"}
                  </StatBadge>
                  {selectedActivity ? (
                    <>
                      <StatBadge color="purple">{prettyLabel(selectedActivity.type)}</StatBadge>
                      <StatBadge color="green">Score: {score}</StatBadge>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {currentStep === 3 && selectedActivity ? (
              <button
                type="button"
                onClick={restartCurrentActivity}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <FaRotateLeft />
                Restart Activity
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-8">
          <StepProgress currentStep={currentStep} />
        </div>

        <div className="mt-8">
          {currentStep === 1 && (
            <ScreenCard
              title="Step 1: Choose Activity Type"
              description="Select which type of activity you want to browse."
            >
              <div className="flex flex-wrap gap-3">
                {TYPE_OPTIONS.map((opt) => (
                  <TypeButton
                    key={opt}
                    active={typeFilter === opt}
                    onClick={() => handleTypeChange(opt)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <FaFilter />
                      {prettyLabel(opt)}
                    </span>
                  </TypeButton>
                ))}
              </div>
            </ScreenCard>
          )}

          {currentStep === 2 && (
            <ScreenCard
              title="Step 2: Choose Activity"
              description="Pick one activity from the list below."
            >
              {loading ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-600">
                  Loading activities...
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-600">
                  No activities available for this type.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredActivities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      selected={String(selectedActivityId) === String(activity.id)}
                      onClick={() => setSelectedActivityId(String(activity.id))}
                    />
                  ))}
                </div>
              )}
            </ScreenCard>
          )}

          {currentStep === 3 && (
            <ScreenCard
              title="Step 3: Play Activity"
              description="Complete the selected activity one action at a time."
            >
              {!selectedActivity ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-600">
                  No activity selected.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-3xl border border-gray-100 bg-slate-50 p-5">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <StatBadge color="purple">{prettyLabel(selectedActivity.type)}</StatBadge>
                      <StatBadge color="blue">
                        {(selectedActivity.items || []).length} Item
                        {(selectedActivity.items || []).length !== 1 ? "s" : ""}
                      </StatBadge>
                    </div>

                    <h2 className="text-2xl font-semibold text-gray-900">
                      {selectedActivity.title}
                    </h2>

                    {selectedActivity.description ? (
                      <p className="mt-2 text-sm text-gray-600">{selectedActivity.description}</p>
                    ) : null}
                  </div>

                  {selectedActivity.type === "MATCHING" && (
                    <section className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Visual Matching</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            First remember the image, then choose it again after the shuffle.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <StatBadge color="blue">
                            {Math.min(matchingIndex + 1, matchingRounds.length)} /{" "}
                            {matchingRounds.length}
                          </StatBadge>
                          <StatBadge color="green">Score: {score}</StatBadge>
                        </div>
                      </div>

                      {!currentMatchingRound ? (
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-600">
                          No valid matching rounds found for this activity.
                        </div>
                      ) : (
                        <>
                          {matchingPhase === "PROMPT" && (
                            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
                              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-700">
                                <FaBullseye />
                                Remember This Image
                              </div>

                              <div className="mx-auto max-w-sm">
                                <ImageCard item={currentMatchingRound.prompt} disabled />
                              </div>

                              <div className="mt-6 flex justify-center">
                                <button
                                  type="button"
                                  onClick={revealMatchingAnswers}
                                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                                >
                                  <FaArrowRight />
                                  Shuffle Cards
                                </button>
                              </div>
                            </div>
                          )}

                          {matchingPhase === "SHUFFLING" && <ShuffleAnimationCard />}

                          {matchingPhase === "ANSWER" && (
                            <>
                              <div className="rounded-3xl border border-gray-100 bg-white p-5">
                                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                                  <FaPuzzlePiece />
                                  Which image did you see before?
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                  {currentMatchingRound.options.map((option, index) => {
                                    const isSelected =
                                      String(matchingSelectedOptionId) === String(option.id);

                                    return (
                                      <ImageCard
                                        key={`${option.id}-${index}`}
                                        item={option}
                                        disabled={matchingAnswered}
                                        selected={isSelected}
                                        correct={false}
                                        wrong={matchingAnswered && isSelected && !matchingWasCorrect}
                                        onClick={() => handleMatchingSelect(option)}
                                      />
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="rounded-2xl bg-gray-50 p-4">
                                {!matchingAnswered ? (
                                  <div className="text-sm font-medium text-gray-600">
                                    Tap the image that was shown earlier.
                                  </div>
                                ) : matchingWasCorrect ? (
                                  <div className="inline-flex items-center gap-2 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
                                    <FaCheck />
                                    Great job. You remembered correctly.
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-2 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
                                    <FaXmark />
                                    That was not the correct image.
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-3">
                                {matchingAnswered ? (
                                  <button
                                    type="button"
                                    onClick={goToNextMatchingRound}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                                  >
                                    <FaArrowRight />
                                    {matchingCompleted ? "Finish Activity" : "Next Question"}
                                  </button>
                                ) : (
                                  <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
                                    Choose one answer to continue.
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </section>
                  )}

                  {selectedActivity.type === "SORTING" && (
                    <section className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Sorting Activity</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Drag an item card and drop it into the correct bucket.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <StatBadge color="blue">
                            {sortingCompletedCount} / {sortingItems.length} Sorted
                          </StatBadge>
                          <StatBadge color="green">Score: {score}</StatBadge>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-gray-100 bg-white p-5">
                        <div className="mb-4 text-sm font-semibold text-gray-700">
                          Draggable Items
                        </div>

                        {sortingRemaining.length === 0 ? (
                          <div className="rounded-2xl border border-green-100 bg-green-50 p-6 text-sm text-green-700">
                            All items have been sorted successfully.
                          </div>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {sortingRemaining.map((item) => (
                              <ImageCard
                                key={item.id}
                                item={item}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", String(item.id));
                                  setDraggingItemId(String(item.id));
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                        <div className="mb-4 text-sm font-semibold text-blue-700">
                          Drag Into a Bucket
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          {sortingCategories.map((bucket) => (
                            <BucketDropZone
                              key={bucket}
                              bucket={bucket}
                              isActive={Boolean(draggingItemId)}
                              onDropItem={handleDropToBucket}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4">
                        {sortingAllDone ? (
                          <div className="inline-flex items-center gap-2 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
                            <FaCheck />
                            Sorting activity completed!
                          </div>
                        ) : sortingFeedback?.type === "success" ? (
                          <div className="inline-flex items-center gap-2 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
                            <FaCheck />
                            {sortingFeedback.text}
                          </div>
                        ) : sortingFeedback?.type === "error" ? (
                          <div className="inline-flex items-center gap-2 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
                            <FaXmark />
                            {sortingFeedback.text}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-600">
                            Drag a card into one of the buckets.
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </ScreenCard>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold ${
              currentStep === 1
                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                : "bg-white text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            <FaArrowLeft />
            Back
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              {currentStep === 2 ? <FaPlay /> : <FaArrowRight />}
              {currentStep === 2 ? "Start Activity" : "Next"}
            </button>
          ) : (
            <div className="rounded-2xl bg-green-100 px-5 py-3 text-sm font-semibold text-green-700">
              You are now in the activity screen
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
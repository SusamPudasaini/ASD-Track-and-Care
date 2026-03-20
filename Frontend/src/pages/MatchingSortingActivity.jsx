import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import {
  FaGamepad,
  FaPuzzlePiece,
  FaLayerGroup,
  FaImage,
  FaRotateLeft,
  FaArrowRight,
  FaCheck,
  FaXmark,
  FaBullseye,
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

function ImageCard({ item, onClick, selected = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group overflow-hidden rounded-3xl border bg-white shadow-sm transition ${
        disabled ? "cursor-not-allowed opacity-70" : "hover:-translate-y-1 hover:shadow-md"
      } ${
        selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-100 hover:border-blue-200"
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

      <div className="p-4">
        <div className="text-base font-semibold text-gray-900 group-hover:text-blue-600">
          {item?.label || "Untitled"}
        </div>
      </div>
    </button>
  );
}

function ActivityPicker({ activities, selectedId, onSelect }) {
  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
        No activities available for this filter.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {activities.map((activity) => (
        <button
          key={activity.id}
          type="button"
          onClick={() => onSelect(activity.id)}
          className={`rounded-3xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
            String(selectedId) === String(activity.id)
              ? "border-blue-500 ring-2 ring-blue-200"
              : "border-gray-100 hover:border-blue-200"
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

          <div className="mt-4 text-sm font-semibold text-blue-600">Play Activity →</div>
        </button>
      ))}
    </div>
  );
}

export default function MatchingSortingActivity() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedActivityId, setSelectedActivityId] = useState("");

  const [score, setScore] = useState(0);

  // matching state
  const [matchingRounds, setMatchingRounds] = useState([]);
  const [matchingIndex, setMatchingIndex] = useState(0);
  const [matchingAnswered, setMatchingAnswered] = useState(false);

  // sorting state
  const [sortingItems, setSortingItems] = useState([]);
  const [selectedSortingItemId, setSelectedSortingItemId] = useState(null);

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
        const nextSelected = rows[0].id;
        setSelectedActivityId(String(nextSelected));
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
    setSelectedSortingItemId(null);

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
    setMatchingAnswered(false);
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
    setSelectedSortingItemId(null);
  }

  async function handleTypeFilter(nextType) {
    setTypeFilter(nextType);
    await loadActivities(nextType);
  }

  function handleSelectActivity(id) {
    setSelectedActivityId(String(id));
  }

  function restartCurrentActivity() {
    if (!selectedActivity) return;

    setScore(0);
    if (selectedActivity.type === "MATCHING") {
      initializeMatching(selectedActivity);
    } else if (selectedActivity.type === "SORTING") {
      initializeSorting(selectedActivity);
    }
  }

  // MATCHING LOGIC
  const currentMatchingRound =
    selectedActivity?.type === "MATCHING" ? matchingRounds[matchingIndex] || null : null;

  function handleMatchingSelect(option) {
    if (!currentMatchingRound || matchingAnswered) return;

    const isCorrect = (option.matchKey || "") === currentMatchingRound.correctMatchKey;

    setMatchingAnswered(true);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      toast.success("Correct match!");
    } else {
      toast.error("Try the next one.");
    }
  }

  function goToNextMatchingRound() {
    if (matchingIndex < matchingRounds.length - 1) {
      setMatchingIndex((prev) => prev + 1);
      setMatchingAnswered(false);
    } else {
      toast.success("Matching activity completed!");
    }
  }

  const matchingCompleted =
    selectedActivity?.type === "MATCHING" &&
    matchingRounds.length > 0 &&
    matchingIndex === matchingRounds.length - 1 &&
    matchingAnswered;

  // SORTING LOGIC
  const sortingCategories = useMemo(() => {
    if (selectedActivity?.type !== "SORTING") return [];

    const keys = Array.from(
      new Set(
        (selectedActivity.items || [])
          .map((item) => item.categoryKey)
          .filter(Boolean)
      )
    );

    return keys;
  }, [selectedActivity]);

  const sortingRemaining = sortingItems.filter((x) => !x.placed);
  const sortingCompletedCount = sortingItems.filter((x) => x.placed).length;
  const sortingAllDone =
    selectedActivity?.type === "SORTING" &&
    sortingItems.length > 0 &&
    sortingItems.every((x) => x.placed);

  function handleSelectSortingItem(itemId) {
    setSelectedSortingItemId(itemId);
  }

  function handleChooseBucket(categoryKey) {
    const chosenItem = sortingItems.find(
      (item) => String(item.id) === String(selectedSortingItemId)
    );

    if (!chosenItem) {
      toast.error("Select an item first.");
      return;
    }

    const isCorrect = (chosenItem.categoryKey || "") === categoryKey;

    if (isCorrect) {
      setSortingItems((prev) =>
        prev.map((item) =>
          String(item.id) === String(chosenItem.id)
            ? { ...item, placed: true }
            : item
        )
      );
      setSelectedSortingItemId(null);
      setScore((prev) => prev + 1);
      toast.success("Correct category!");
    } else {
      toast.error("That bucket is not correct.");
    }
  }

  const titleCount = filteredActivities.length;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
              <FaGamepad />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">
                Matching & Sorting Activities
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Interactive visual activities to help children practice matching, categorization,
                and sorting skills in a structured way.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <TypeButton
                key={opt}
                active={typeFilter === opt}
                onClick={() => handleTypeFilter(opt)}
              >
                {prettyLabel(opt)}
              </TypeButton>
            ))}
          </div>

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

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Choose Activity</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select an active matching or sorting set created by the admin.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
              Loading activities...
            </div>
          ) : (
            <ActivityPicker
              activities={filteredActivities}
              selectedId={selectedActivityId}
              onSelect={handleSelectActivity}
            />
          )}
        </section>

        {selectedActivity ? (
          <section className="mt-10 space-y-8">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
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
                    <p className="mt-2 max-w-3xl text-sm text-gray-600">
                      {selectedActivity.description}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={restartCurrentActivity}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <FaRotateLeft />
                  Restart Activity
                </button>
              </div>
            </div>

            {selectedActivity.type === "MATCHING" ? (
              <section className="space-y-6">
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Visual Matching</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Find the image that matches the prompt card.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <StatBadge color="blue">
                        {Math.min(matchingIndex + 1, matchingRounds.length)} / {matchingRounds.length}
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
                      <div className="mb-6">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-700">
                          <FaBullseye />
                          Prompt Card
                        </div>

                        <div className="max-w-sm">
                          <ImageCard item={currentMatchingRound.prompt} disabled />
                        </div>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <FaPuzzlePiece />
                          Choose the matching image
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          {currentMatchingRound.options.map((option, index) => (
                            <ImageCard
                              key={`${option.id}-${index}`}
                              item={option}
                              disabled={matchingAnswered}
                              onClick={() => handleMatchingSelect(option)}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        {matchingAnswered ? (
                          <button
                            type="button"
                            onClick={goToNextMatchingRound}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                          >
                            <FaArrowRight />
                            {matchingCompleted ? "Finish Activity" : "Next"}
                          </button>
                        ) : (
                          <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
                            Select one answer to continue.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </section>
            ) : null}

            {selectedActivity.type === "SORTING" ? (
              <section className="space-y-6">
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Sorting Activity</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Select an item, then click the correct category bucket.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <StatBadge color="blue">
                        {sortingCompletedCount} / {sortingItems.length} Sorted
                      </StatBadge>
                      <StatBadge color="green">Score: {score}</StatBadge>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <FaLayerGroup />
                      Items to Sort
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
                            selected={String(selectedSortingItemId) === String(item.id)}
                            onClick={() => handleSelectSortingItem(item.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <FaBullseye />
                      Category Buckets
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {sortingCategories.map((bucket) => (
                        <button
                          key={bucket}
                          type="button"
                          onClick={() => handleChooseBucket(bucket)}
                          className="rounded-3xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center transition hover:border-blue-400 hover:bg-blue-100"
                        >
                          <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                            Bucket
                          </div>
                          <div className="mt-2 text-lg font-bold text-blue-900">
                            {prettyLabel(bucket)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    {sortingAllDone ? (
                      <div className="inline-flex items-center gap-2 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
                        <FaCheck />
                        Sorting activity completed!
                      </div>
                    ) : selectedSortingItemId ? (
                      <div className="inline-flex items-center gap-2 rounded-xl bg-blue-100 px-4 py-3 text-sm font-semibold text-blue-700">
                        <FaCheck />
                        Item selected. Now choose the correct bucket.
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-600">
                        <FaXmark />
                        Select an item first.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
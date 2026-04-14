import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  readOnboardingStatusCache,
  writeOnboardingStatusCache,
} from "../utils/onboardingStatusCache";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCircleCheck,
  FaClipboardQuestion,
  FaRegNoteSticky,
} from "react-icons/fa6";

function markMchatCompletedInCache() {
  try {
    const current = readOnboardingStatusCache();
    writeOnboardingStatusCache({
      aiCompleted: !!current.aiCompleted,
      mchatCompleted: true,
    });
  } catch {
    // ignore cache write errors
  }
}

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

const YES_NO_OPTIONS = ["YES", "NO"];
const SCALE_5_OPTIONS = ["NEVER", "RARELY", "SOMETIMES", "OFTEN", "ALWAYS"];

function prettyLabel(v) {
  return String(v || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MChatQuestionnaire() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const res = await api.get("/api/mchat-questionnaire/questions");
        const list = Array.isArray(res.data) ? res.data : [];

        if (!mounted) return;

        setQuestions(list);

        const initial = {};
        for (const q of list) {
          initial[q.id] = "";
        }
        setAnswers(initial);
        setStep(0);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const totalQuestions = questions.length;
  const totalSteps = totalQuestions + 1; // +1 final notes step
  const currentQuestion = questions[step] || null;
  const isNotesStep = totalQuestions > 0 && step === totalQuestions;

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((v) => String(v || "").trim() !== "").length;
  }, [answers]);

  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  const progressPercent = useMemo(() => {
    if (totalSteps === 0) return 0;
    return Math.round(((step + 1) / totalSteps) * 100);
  }, [step, totalSteps]);

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] || "" : "";

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    // auto-next after a short delay
    setTimeout(() => {
      setDirection(1);
      setStep((prev) => {
        if (prev < totalQuestions) return prev + 1;
        return prev;
      });
    }, 220);
  };

  const goNext = () => {
    if (!isNotesStep && currentQuestion && !currentAnswer) {
      toast.error("Please select an answer first.");
      return;
    }

    if (step < totalQuestions) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const submit = async () => {
    if (!questions.length) {
      toast.error("No M-CHAT questions available.");
      return;
    }

    const payloadAnswers = questions.map((q) => ({
      questionId: q.id,
      answerValue: answers[q.id] || "",
    }));

    const missing = payloadAnswers.filter((a) => !String(a.answerValue || "").trim());
    if (missing.length > 0) {
      toast.error("Please answer all questions.");
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/api/mchat-questionnaire/submit", {
        answers: payloadAnswers,
        notes: notes.trim() || null,
      });

      markMchatCompletedInCache();

      toast.success("M-CHAT questionnaire submitted successfully.");
      navigate("/analytics");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-3xl border border-blue-100 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FaClipboardQuestion className="text-[#4a6cf7]" />
                <h1 className="text-2xl font-semibold text-gray-900">M-CHAT Questionnaire</h1>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Answer each question based on your child’s recent behaviors and interactions.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                This tool supports progress tracking and concern monitoring. It does not replace professional diagnosis.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              Answered: <span className="font-semibold">{answeredCount}</span> / {totalQuestions}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
              <span>
                {isNotesStep
                  ? "Final notes"
                  : totalQuestions > 0
                  ? `Question ${step + 1} of ${totalQuestions}`
                  : "Preparing"}
              </span>
              <span>{progressPercent}%</span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#4a6cf7] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* top step circles */}
          {totalSteps > 1 ? (
            <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
              {Array.from({ length: totalSteps }).map((_, i) => {
                const active = i === step;
                const done = i < step;

                return (
                  <div
                    key={i}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      active
                        ? "bg-[#4a6cf7] text-white"
                        : done
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {i === totalQuestions ? "N" : i + 1}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-8 text-sm text-gray-600 shadow-sm">
            Loading questionnaire...
          </div>
        ) : totalQuestions === 0 ? (
          <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-8 text-sm text-gray-600 shadow-sm">
            No active M-CHAT questions found. Please ask admin to add questions.
          </div>
        ) : (
          <div className="mt-8">
            <AnimatePresence mode="wait" custom={direction}>
              {!isNotesStep && currentQuestion ? (
                <AnimatedStep key={`q-${currentQuestion.id}`} direction={direction}>
                  <QuestionStepCard
                    question={currentQuestion}
                    step={step}
                    totalQuestions={totalQuestions}
                    value={currentAnswer}
                    onChange={(value) => setAnswer(currentQuestion.id, value)}
                  />
                </AnimatedStep>
              ) : (
                <AnimatedStep key="notes-step" direction={direction}>
                  <NotesStepCard
                    notes={notes}
                    setNotes={setNotes}
                    allAnswered={allAnswered}
                  />
                </AnimatedStep>
              )}
            </AnimatePresence>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={goPrev}
                disabled={step === 0 || submitting}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold ${
                  step === 0 || submitting
                    ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FaArrowLeft />
                Previous
              </button>

              {!isNotesStep ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!currentAnswer || submitting}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white ${
                    !currentAnswer || submitting
                      ? "cursor-not-allowed bg-blue-300"
                      : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                  }`}
                >
                  Next
                  <FaArrowRight />
                </button>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => navigate("/analytics")}
                    className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    View Analytics
                  </button>

                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting || !allAnswered}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white ${
                      submitting || !allAnswered
                        ? "cursor-not-allowed bg-blue-300"
                        : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                    }`}
                  >
                    <FaCircleCheck />
                    {submitting ? "Submitting..." : "Submit Questionnaire"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function AnimatedStep({ children, direction }) {
  return (
    <motion.div
      custom={direction}
      initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function QuestionStepCard({ question, step, totalQuestions, value, onChange }) {
  const options =
    question.answerType === "YES_NO" ? YES_NO_OPTIONS : SCALE_5_OPTIONS;

  return (
    <section className="rounded-[28px] border border-gray-100 bg-white p-8 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {prettyLabel(question.category)}
        </span>
        <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
          {prettyLabel(question.answerType)}
        </span>
        <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
          Weight {question.weight}
        </span>
      </div>

      <div className="min-h-[120px]">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Question {step + 1} / {totalQuestions}
        </p>

        <h2 className="mt-3 text-2xl font-semibold leading-relaxed text-gray-900 sm:text-3xl">
          {question.questionText}
        </h2>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const active = value === opt;

          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`group rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${
                active
                  ? "border-blue-600 bg-blue-600 text-white shadow-md"
                  : "border-gray-200 bg-white text-gray-700 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold sm:text-base">
                  {prettyLabel(opt)}
                </span>

                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                    active
                      ? "border-white/40 bg-white/20 text-white"
                      : "border-gray-300 text-gray-400 group-hover:border-blue-300 group-hover:text-blue-500"
                  }`}
                >
                  {active ? "✓" : ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-gray-500">
        Select one answer to continue automatically.
      </p>
    </section>
  );
}

function NotesStepCard({ notes, setNotes, allAnswered }) {
  return (
    <section className="rounded-[28px] border border-gray-100 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-2">
        <FaRegNoteSticky className="text-[#4a6cf7]" />
        <h2 className="text-xl font-semibold text-gray-900">Final Notes</h2>
      </div>

      <p className="text-sm text-gray-600">
        You’ve completed all questions. You can add any extra parent observations here before submitting.
      </p>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
        className="mt-5 w-full rounded-2xl border border-gray-200 px-4 py-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        placeholder="Add any parent observations or notes here..."
      />

      <div className="mt-4 text-xs text-gray-500">
        {allAnswered
          ? "All questions have been answered. You can submit now."
          : "Some questions are still unanswered."}
      </div>
    </section>
  );
}
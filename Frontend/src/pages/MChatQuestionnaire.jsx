import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

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

  const grouped = useMemo(() => {
    const map = new Map();
    for (const q of questions) {
      const key = q.category || "OTHER";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(q);
    }
    return Array.from(map.entries());
  }, [questions]);

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((v) => String(v || "").trim() !== "").length;
  }, [answers]);

  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
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

      toast.success("M-CHAT questionnaire submitted successfully.");
      navigate("/mchat-questionnaire/analytics");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">M-CHAT Questionnaire</h1>
              <p className="mt-2 text-sm text-gray-600">
                Answer the questions based on your child’s recent behaviors and interactions.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                This questionnaire is for progress tracking and concern monitoring. It does not replace professional diagnosis.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              Answered: <span className="font-semibold">{answeredCount}</span> / {questions.length}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
            Loading questionnaire...
          </div>
        ) : questions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
            No active M-CHAT questions found. Please ask admin to add questions.
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-6">
              {grouped.map(([category, items]) => (
                <section key={category} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{prettyLabel(category)}</h2>
                    <p className="mt-1 text-xs text-gray-500">{items.length} question(s)</p>
                  </div>

                  <div className="space-y-5">
                    {items.map((q, idx) => {
                      const options =
                        q.answerType === "YES_NO" ? YES_NO_OPTIONS : SCALE_5_OPTIONS;

                      return (
                        <div key={q.id} className="rounded-xl border border-gray-100 p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="pr-4">
                              <div className="text-sm font-semibold text-gray-900">
                                {idx + 1}. {q.questionText}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                Type: {prettyLabel(q.answerType)} • Weight: {q.weight}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {options.map((opt) => {
                              const active = answers[q.id] === opt;

                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setAnswer(q.id, opt)}
                                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                                    active
                                      ? "border-blue-600 bg-blue-600 text-white"
                                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  {prettyLabel(opt)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-700">Optional Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Add any parent observations or notes here..."
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !allAnswered}
                className={`rounded-xl px-5 py-3 text-sm font-semibold text-white ${
                  submitting || !allAnswered
                    ? "cursor-not-allowed bg-blue-300"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submitting ? "Submitting..." : "Submit Questionnaire"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/mchat-questionnaire/analytics")}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                View Analytics
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
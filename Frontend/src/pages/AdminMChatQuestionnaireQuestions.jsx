import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FaClipboardQuestion,
  FaLayerGroup,
  FaScaleBalanced,
  FaRotate,
  FaToggleOn,
  FaPlus,
  FaPenToSquare,
  FaArrowsRotate,
  FaCircleCheck,
  FaCircleXmark,
  FaQuestion,
  FaCheck,
} from "react-icons/fa6";
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

const CATEGORY_OPTIONS = [
  "SOCIAL_INTERACTION",
  "COMMUNICATION",
  "PLAY",
  "ATTENTION",
  "BEHAVIOR",
  "SENSORY",
];

const ANSWER_TYPE_OPTIONS = ["YES_NO", "SCALE_5"];

function emptyForm() {
  return {
    questionText: "",
    category: "SOCIAL_INTERACTION",
    answerType: "YES_NO",
    weight: 1,
    reverseScored: false,
    active: true,
  };
}

function prettyLabel(v) {
  return String(v || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function TooltipLabel({ label, tip }) {
  return (
    <div className="flex items-center gap-2">
      <span>{label}</span>
      <div className="group relative inline-flex">
        <button
          type="button"
          className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[11px] font-bold text-gray-500 hover:bg-gray-50"
        >
          <FaQuestion className="text-[10px]" />
        </button>

        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 text-xs font-normal leading-5 text-gray-600 shadow-lg group-hover:block">
          {tip}
        </div>
      </div>
    </div>
  );
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

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">{icon}</div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export default function AdminMChatQuestionnaireQuestions() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);

  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const role = (localStorage.getItem("role") || "").toUpperCase();
    if (role !== "ADMIN") {
      toast.error("Access denied. Admins only.");
      navigate("/", { replace: true });
      return;
    }

    load();
  }, [navigate]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/mchat-questions");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.questionText.trim()) {
      toast.error("Question text is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        questionText: form.questionText.trim(),
        category: form.category,
        answerType: form.answerType,
        weight: Number(form.weight) || 1,
        reverseScored: !!form.reverseScored,
        active: !!form.active,
      };

      if (editingId) {
        await api.put(`/api/admin/mchat-questions/${editingId}`, payload);
        toast.success("Question updated.");
      } else {
        await api.post("/api/admin/mchat-questions", payload);
        toast.success("Question created.");
      }

      resetForm();
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const editRow = (row) => {
    setEditingId(row.id);
    setForm({
      questionText: row.questionText || "",
      category: row.category || "SOCIAL_INTERACTION",
      answerType: row.answerType || "YES_NO",
      weight: row.weight || 1,
      reverseScored: !!row.reverseScored,
      active: !!row.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleActive = async (row) => {
    try {
      await api.put(`/api/admin/mchat-questions/${row.id}/active`, null, {
        params: { active: !row.active },
      });
      toast.success(`Question ${row.active ? "disabled" : "enabled"}.`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const activeCount = useMemo(() => items.filter((x) => x.active).length, [items]);
  const inactiveCount = items.length - activeCount;
  const reverseCount = useMemo(() => items.filter((x) => x.reverseScored).length, [items]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="ml-72 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Admin M-CHAT Question Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create, edit, enable, and manage M-CHAT questionnaire questions.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatBadge color="blue">{items.length} Total Questions</StatBadge>
              <StatBadge color="green">{activeCount} Active</StatBadge>
              <StatBadge color="red">{inactiveCount} Inactive</StatBadge>
              <StatBadge color="purple">{reverseCount} Reverse Scored</StatBadge>
            </div>
          </div>

          <form
            onSubmit={submit}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
          >
            <SectionTitle
              icon={<FaClipboardQuestion />}
              title={editingId ? "Edit Question" : "Create Question"}
              subtitle="Configure how each M-CHAT question contributes to screening and analytics."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Question Text
                </label>
                <div className="rounded-xl border bg-white px-4 py-3">
                  <textarea
                    value={form.questionText}
                    onChange={(e) => setForm((p) => ({ ...p, questionText: e.target.value }))}
                    rows={4}
                    className="w-full resize-none bg-transparent text-sm outline-none"
                    placeholder="Enter question..."
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Category</label>
                <div className="flex items-center rounded-xl border bg-white px-3">
                  <FaLayerGroup className="mr-3 text-gray-400" />
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full bg-transparent py-3 text-sm outline-none"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {prettyLabel(opt)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  <TooltipLabel
                    label="Answer Type"
                    tip="YES_NO gives the user only two choices: Yes or No. SCALE_5 gives a frequency scale: Never, Rarely, Sometimes, Often, Always."
                  />
                </label>
                <div className="flex items-center rounded-xl border bg-white px-3">
                  <FaClipboardQuestion className="mr-3 text-gray-400" />
                  <select
                    value={form.answerType}
                    onChange={(e) => setForm((p) => ({ ...p, answerType: e.target.value }))}
                    className="w-full bg-transparent py-3 text-sm outline-none"
                  >
                    {ANSWER_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {prettyLabel(opt)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  <TooltipLabel
                    label="Weight"
                    tip="Weight controls how strongly this question affects the final scores. A higher weight means this question has more influence on development and concern calculations."
                  />
                </label>
                <div className="flex items-center rounded-xl border bg-white px-3">
                  <FaScaleBalanced className="mr-3 text-gray-400" />
                  <input
                    type="number"
                    min="1"
                    value={form.weight}
                    onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
                    className="w-full bg-transparent py-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 rounded-xl border bg-gray-50 px-4 py-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.reverseScored}
                    onChange={(e) => setForm((p) => ({ ...p, reverseScored: e.target.checked }))}
                  />
                  <span className="inline-flex items-center gap-2">
                    <FaRotate className="text-gray-500" />
                    <TooltipLabel
                      label="Reverse Scored"
                      tip="Use this when higher answers mean better development rather than more concern. The system flips the score direction automatically so analytics stay consistent."
                    />
                  </span>
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                  />
                  <span className="inline-flex items-center gap-2">
                    <FaToggleOn className="text-gray-500" />
                    Active
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white ${
                  saving ? "cursor-not-allowed bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {editingId ? <FaPenToSquare /> : <FaPlus />}
                {saving ? "Saving..." : editingId ? "Update Question" : "Create Question"}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <FaCircleXmark />
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <SectionTitle
              icon={<FaClipboardQuestion />}
              title="All Questions"
              subtitle="Review all configured M-CHAT questions and quickly enable or disable them."
            />

            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <FaArrowsRotate />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-600">
                Loading questions...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-600">
                No questions found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-3 font-semibold text-gray-700">ID</th>
                      <th className="py-3 font-semibold text-gray-700">Question</th>
                      <th className="py-3 font-semibold text-gray-700">Category</th>
                      <th className="py-3 font-semibold text-gray-700">Answer Type</th>
                      <th className="py-3 font-semibold text-gray-700">Weight</th>
                      <th className="py-3 font-semibold text-gray-700">Reverse</th>
                      <th className="py-3 font-semibold text-gray-700">Status</th>
                      <th className="py-3 text-right font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id} className="border-b align-top last:border-b-0">
                        <td className="py-4 font-medium text-gray-900">{row.id}</td>
                        <td className="py-4 text-gray-900">{row.questionText}</td>
                        <td className="py-4">
                          <StatBadge color="purple">{prettyLabel(row.category)}</StatBadge>
                        </td>
                        <td className="py-4 text-gray-700">{prettyLabel(row.answerType)}</td>
                        <td className="py-4 text-gray-700">{row.weight}</td>
                        <td className="py-4">
                          {row.reverseScored ? (
                            <StatBadge color="yellow">Yes</StatBadge>
                          ) : (
                            <StatBadge color="gray">No</StatBadge>
                          )}
                        </td>
                        <td className="py-4">
                          {row.active ? (
                            <StatBadge color="green">Active</StatBadge>
                          ) : (
                            <StatBadge color="gray">Inactive</StatBadge>
                          )}
                        </td>
                        <td className="py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => editRow(row)}
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <FaPenToSquare />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleActive(row)}
                              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white ${
                                row.active
                                  ? "bg-gray-700 hover:bg-gray-800"
                                  : "bg-green-600 hover:bg-green-700"
                              }`}
                            >
                              {row.active ? (
                                <>
                                  <FaCircleXmark />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <FaCircleCheck />
                                  Enable
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
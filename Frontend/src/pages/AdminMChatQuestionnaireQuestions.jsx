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
          ?
        </button>

        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-xs font-normal leading-5 text-gray-600 shadow-lg group-hover:block">
          {tip}
        </div>
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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Admin — M-CHAT Questions</h1>
              <p className="mt-2 text-sm text-gray-600">
                Create, edit, enable, and disable M-CHAT questionnaire questions.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              Active Questions: <span className="font-semibold">{activeCount}</span> / {items.length}
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit Question" : "Create Question"}
            </h2>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Question Text</label>
              <textarea
                value={form.questionText}
                onChange={(e) => setForm((p) => ({ ...p, questionText: e.target.value }))}
                rows={3}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter question..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {prettyLabel(opt)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                <TooltipLabel
                  label="Answer Type"
                  tip="YES_NO gives the user only two choices: Yes or No. SCALE_5 gives a frequency scale: Never, Rarely, Sometimes, Often, Always."
                />
              </label>
              <select
                value={form.answerType}
                onChange={(e) => setForm((p) => ({ ...p, answerType: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {ANSWER_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {prettyLabel(opt)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                <TooltipLabel
                  label="Weight"
                  tip="Weight controls how strongly this question affects the final scores. A higher weight means this question has more influence on development and concern calculations."
                />
              </label>
              <input
                type="number"
                min="1"
                value={form.weight}
                onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-8">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.reverseScored}
                  onChange={(e) => setForm((p) => ({ ...p, reverseScored: e.target.checked }))}
                />
                <TooltipLabel
                  label="Reverse Scored"
                  tip="Use this when higher answers mean better development rather than more concern. The system flips the score direction automatically so analytics stay consistent."
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                />
                <span>Active</span>
              </label>
            </div>
          </div>

          <div className="mt-5">
            <button
              type="submit"
              disabled={saving}
              className={`rounded-xl px-5 py-3 text-sm font-semibold text-white ${
                saving ? "cursor-not-allowed bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving..." : editingId ? "Update Question" : "Create Question"}
            </button>
          </div>
        </form>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">All Questions</h2>
            <button
              type="button"
              onClick={load}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-gray-600">Loading questions...</div>
          ) : items.length === 0 ? (
            <div className="mt-4 text-sm text-gray-600">No questions found.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">ID</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Question</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Category</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Answer Type</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Weight</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Reverse</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                    <th className="py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="py-3 text-gray-900">{row.id}</td>
                      <td className="py-3 text-gray-900">{row.questionText}</td>
                      <td className="py-3 text-gray-700">{prettyLabel(row.category)}</td>
                      <td className="py-3 text-gray-700">{prettyLabel(row.answerType)}</td>
                      <td className="py-3 text-gray-700">{row.weight}</td>
                      <td className="py-3 text-gray-700">{row.reverseScored ? "Yes" : "No"}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                            row.active
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          {row.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => editRow(row)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleActive(row)}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold text-white ${
                              row.active ? "bg-gray-700 hover:bg-gray-800" : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {row.active ? "Disable" : "Enable"}
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
      </main>
    </div>
  );
}
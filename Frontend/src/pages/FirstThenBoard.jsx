import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import {
  FaArrowRight,
  FaCheck,
  FaEye,
  FaEyeSlash,
  FaTrash,
  FaPenToSquare,
  FaPlus,
  FaImage,
  FaRepeat,
  FaStar,
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

function emptyForm() {
  return {
    firstTitle: "",
    firstImageUrl: "",
    thenTitle: "",
    thenImageUrl: "",
    active: true,
  };
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

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${className}`}
    />
  );
}

function FirstThenVisualCard({ title, imageUrl, type }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="aspect-[4/3] w-full bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
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

      <div className="p-5">
        <div
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            type === "FIRST" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
          }`}
        >
          {type}
        </div>

        <div className="mt-3 text-xl font-bold text-gray-900">{title || "—"}</div>
      </div>
    </div>
  );
}

export default function FirstThenBoard() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await api.get("/api/first-then");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function submit(e) {
    e.preventDefault();

    if (!form.firstTitle.trim()) {
      toast.error("First task is required.");
      return;
    }

    if (!form.thenTitle.trim()) {
      toast.error("Then task is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        firstTitle: form.firstTitle.trim(),
        firstImageUrl: form.firstImageUrl.trim() || null,
        thenTitle: form.thenTitle.trim(),
        thenImageUrl: form.thenImageUrl.trim() || null,
        active: !!form.active,
        completed: false,
      };

      if (editingId) {
        await api.put(`/api/first-then/${editingId}`, payload);
        toast.success("First-Then board updated");
      } else {
        await api.post("/api/first-then", payload);
        toast.success("First-Then board created");
      }

      setForm(emptyForm());
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function edit(row) {
    setEditingId(row.id);
    setForm({
      firstTitle: row.firstTitle || "",
      firstImageUrl: row.firstImageUrl || "",
      thenTitle: row.thenTitle || "",
      thenImageUrl: row.thenImageUrl || "",
      active: !!row.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleCompleted(row) {
    try {
      await api.put(`/api/first-then/${row.id}/completed`, null, {
        params: { completed: !row.completed },
      });
      toast.success(row.completed ? "Marked as incomplete" : "Marked as completed");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function toggleActive(row) {
    try {
      await api.put(`/api/first-then/${row.id}/active`, null, {
        params: { active: !row.active },
      });
      toast.success(row.active ? "Board hidden" : "Board activated");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function removeBoard(row) {
    try {
      await api.delete(`/api/first-then/${row.id}`);
      toast.success("Board deleted");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
  }

  const activeBoards = useMemo(() => items.filter((x) => x.active), [items]);
  const latestActiveBoard = activeBoards.length > 0 ? activeBoards[0] : null;
  const completedCount = items.filter((x) => x.completed).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">First-Then Board</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Create a simple visual support board to guide the child through one required task
            followed by a preferred reward or activity.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <StatBadge color="blue">{items.length} Total Boards</StatBadge>
            <StatBadge color="green">{activeBoards.length} Active</StatBadge>
            <StatBadge color="yellow">{completedCount} Completed</StatBadge>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[420px_1fr]">
          <form
            onSubmit={submit}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
          >
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit First-Then Board" : "Create First-Then Board"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Example: First brush teeth, then play.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                placeholder="First task title"
                value={form.firstTitle}
                onChange={(e) => setForm({ ...form, firstTitle: e.target.value })}
              />

              <Input
                placeholder="First image URL (optional)"
                value={form.firstImageUrl}
                onChange={(e) => setForm({ ...form, firstImageUrl: e.target.value })}
              />

              <Input
                placeholder="Then reward/activity title"
                value={form.thenTitle}
                onChange={(e) => setForm({ ...form, thenTitle: e.target.value })}
              />

              <Input
                placeholder="Then image URL (optional)"
                value={form.thenImageUrl}
                onChange={(e) => setForm({ ...form, thenImageUrl: e.target.value })}
              />

              <label className="inline-flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                disabled={saving}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition ${
                  saving ? "cursor-not-allowed bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <FaPlus />
                {saving ? "Saving..." : editingId ? "Update Board" : "Create Board"}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <FaRepeat />
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>

          <div className="space-y-8">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-gray-900">Live Visual Preview</h2>
                <p className="mt-1 text-sm text-gray-500">
                  This is how the board looks for the child.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <FirstThenVisualCard
                  title={form.firstTitle || "First Task"}
                  imageUrl={form.firstImageUrl}
                  type="FIRST"
                />

                <div className="flex justify-center">
                  <div className="rounded-full bg-blue-100 p-4 text-blue-600">
                    <FaArrowRight className="text-xl" />
                  </div>
                </div>

                <FirstThenVisualCard
                  title={form.thenTitle || "Then Reward"}
                  imageUrl={form.thenImageUrl}
                  type="THEN"
                />
              </div>
            </div>

            {latestActiveBoard ? (
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Current Active Board</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Use this as the main visible board for the child.
                    </p>
                  </div>

                  {latestActiveBoard.completed ? (
                    <StatBadge color="green">Completed</StatBadge>
                  ) : (
                    <StatBadge color="blue">In Progress</StatBadge>
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
                  <FirstThenVisualCard
                    title={latestActiveBoard.firstTitle}
                    imageUrl={latestActiveBoard.firstImageUrl}
                    type="FIRST"
                  />

                  <div className="flex justify-center">
                    <div className="rounded-full bg-pink-100 p-4 text-pink-600">
                      <FaStar className="text-xl" />
                    </div>
                  </div>

                  <FirstThenVisualCard
                    title={latestActiveBoard.thenTitle}
                    imageUrl={latestActiveBoard.thenImageUrl}
                    type="THEN"
                  />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => toggleCompleted(latestActiveBoard)}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition ${
                      latestActiveBoard.completed
                        ? "bg-yellow-500 hover:bg-yellow-600"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    <FaCheck />
                    {latestActiveBoard.completed ? "Mark Incomplete" : "Mark Completed"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-gray-900">My Boards</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage all created First-Then boards.
                </p>
              </div>

              {items.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-600">
                  No First-Then boards created yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatBadge color="blue">First</StatBadge>
                            <span className="font-semibold text-gray-900">{row.firstTitle}</span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatBadge color="purple">Then</StatBadge>
                            <span className="font-semibold text-gray-900">{row.thenTitle}</span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {row.active ? (
                              <StatBadge color="green">Active</StatBadge>
                            ) : (
                              <StatBadge color="red">Hidden</StatBadge>
                            )}

                            {row.completed ? (
                              <StatBadge color="yellow">Completed</StatBadge>
                            ) : (
                              <StatBadge color="gray">Not Completed</StatBadge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => edit(row)}
                            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <FaPenToSquare />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleCompleted(row)}
                            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <FaCheck />
                            {row.completed ? "Undo" : "Complete"}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleActive(row)}
                            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                          >
                            {row.active ? (
                              <>
                                <FaEyeSlash />
                                Hide
                              </>
                            ) : (
                              <>
                                <FaEye />
                                Show
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => removeBoard(row)}
                            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-medium text-red-600 hover:bg-red-50"
                          >
                            <FaTrash />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
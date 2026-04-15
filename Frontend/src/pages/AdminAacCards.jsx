import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import {
  FaComments,
  FaImage,
  FaShapes,
  FaPenToSquare,
  FaCheck,
  FaEye,
  FaEyeSlash,
  FaTrash,
  FaArrowUpWideShort,
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

function emptyForm() {
  return {
    label: "",
    imageUrl: "",
    spokenTextNepali: "",
    category: "PEOPLE",
    sortOrder: 0,
    active: true,
  };
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

function StatBadge({ children, color = "gray" }) {
  const styles = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-100 text-gray-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[color]}`}>
      {children}
    </span>
  );
}

function InputWithIcon({ icon, className = "", ...props }) {
  return (
    <div className={`flex items-center rounded-xl border bg-white px-3 ${className}`}>
      <span className="mr-3 text-gray-400">{icon}</span>
      <input {...props} className="w-full bg-transparent py-3 outline-none" />
    </div>
  );
}

export default function AdminAacCards() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await api.get("/api/admin/aac-cards");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function submit(e) {
    e.preventDefault();

    if (!form.label.trim()) {
      toast.error("Label is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        label: form.label.trim(),
        imageUrl: form.imageUrl.trim() || null,
          spokenTextNepali: form.spokenTextNepali.trim() || null,
        category: form.category,
        sortOrder: Number(form.sortOrder) || 0,
        active: !!form.active,
      };

        if (editingId !== null) {
        await api.put(`/api/admin/aac-cards/${editingId}`, payload);
        toast.success("AAC card updated");
      } else {
        await api.post("/api/admin/aac-cards", payload);
        toast.success("AAC card created");
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
      label: row.label || "",
      imageUrl: row.imageUrl || "",
      spokenTextNepali: row.spokenTextNepali || "",
      category: row.category || "PEOPLE",
      sortOrder: row.sortOrder ?? 0,
      active: !!row.active,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggle(row) {
    try {
      await api.put(`/api/admin/aac-cards/${row.id}/active`, null, {
        params: { active: !row.active },
      });

      toast.success(`AAC card ${row.active ? "deactivated" : "activated"}`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
  }

  const totalActive = useMemo(() => items.filter((x) => x.active).length, [items]);
  const totalInactive = items.length - totalActive;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="ml-72 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Admin AAC Card Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create, update, activate, and organize communication cards for the AAC therapy board.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatBadge color="blue">{items.length} Total Cards</StatBadge>
              <StatBadge color="green">{totalActive} Active</StatBadge>
              <StatBadge color="red">{totalInactive} Inactive</StatBadge>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[420px_1fr]">
            <form
              onSubmit={submit}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
            >
              <SectionTitle
                icon={<FaComments />}
                title={editingId ? "Edit AAC Card" : "Create AAC Card"}
                subtitle="Add communication cards that users can use inside the AAC board."
              />

              <div className="space-y-4">
                <InputWithIcon
                  icon={<FaPenToSquare />}
                  placeholder="Card Label (e.g. Water, Help, Play)"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />

                <InputWithIcon
                  icon={<FaImage />}
                  placeholder="Image URL (optional)"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />

                <InputWithIcon
                  icon={<FaComments />}
                  placeholder="Spoken text (optional, e.g. Nepali pronunciation)"
                  value={form.spokenTextNepali}
                  onChange={(e) => setForm({ ...form, spokenTextNepali: e.target.value })}
                />

                <div className="rounded-xl border bg-white px-3">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-transparent py-3 outline-none"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {prettyLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>

                <InputWithIcon
                  icon={<FaArrowUpWideShort />}
                  type="number"
                  placeholder="Sort Order"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
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

              {form.imageUrl ? (
                <div className="mt-5 overflow-hidden rounded-2xl border bg-gray-50">
                  <div className="aspect-square w-full bg-gray-100">
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                  <div className="px-4 py-3 text-sm text-gray-600">Image preview</div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  disabled={saving}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition ${
                    saving ? "cursor-not-allowed bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  <FaCheck />
                  {saving ? "Saving..." : editingId !== null ? "Update Card" : "Create Card"}
                </button>

                {editingId !== null ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <FaTrash />
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <SectionTitle
                icon={<FaShapes />}
                title="All AAC Cards"
                subtitle="Manage card visibility and keep the communication board organized."
              />

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-3 font-semibold text-gray-700">Image</th>
                      <th className="py-3 font-semibold text-gray-700">Label</th>
                      <th className="py-3 font-semibold text-gray-700">Category</th>
                      <th className="py-3 font-semibold text-gray-700">Sort Order</th>
                      <th className="py-3 font-semibold text-gray-700">Status</th>
                      <th className="py-3 text-right font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id} className="border-b align-top">
                        <td className="py-4">
                          <div className="h-16 w-16 overflow-hidden rounded-2xl border bg-gray-100">
                            {row.imageUrl ? (
                              <img
                                src={row.imageUrl}
                                alt={row.label}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-300">
                                <FaImage />
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-4 font-medium text-gray-900">{row.label}</td>

                        <td className="py-4">
                          <StatBadge color="purple">{prettyLabel(row.category)}</StatBadge>
                        </td>

                        <td className="py-4 text-gray-700">{row.sortOrder ?? 0}</td>

                        <td className="py-4">
                          {row.active ? (
                            <StatBadge color="green">Active</StatBadge>
                          ) : (
                            <StatBadge color="red">Inactive</StatBadge>
                          )}
                        </td>

                        <td className="py-4">
                          <div className="flex justify-end gap-2">
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
                              onClick={() => toggle(row)}
                              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                            >
                              {row.active ? (
                                <>
                                  <FaEyeSlash />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <FaEye />
                                  Activate
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {items.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-10 text-center text-gray-500">
                          No AAC cards found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
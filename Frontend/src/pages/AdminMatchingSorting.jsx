import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import {
  FaGamepad,
  FaPlus,
  FaTrash,
  FaPenToSquare,
  FaCheck,
  FaEye,
  FaEyeSlash,
  FaImage,
  FaLayerGroup,
  FaArrowUpWideShort,
} from "react-icons/fa6";

const TYPE_OPTIONS = ["MATCHING", "SORTING"];

function emptyItem(sortOrder = 0) {
  return {
    label: "",
    imageUrl: "",
    categoryKey: "",
    matchKey: "",
    sortOrder,
  };
}

function emptyForm() {
  return {
    title: "",
    description: "",
    type: "MATCHING",
    active: true,
    items: [emptyItem(0)],
  };
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

function prettyLabel(v) {
  return String(v || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${className}`}
    />
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${className}`}
    />
  );
}

export default function AdminMatchingSorting() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await api.get("/api/admin/matching-sorting");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, emptyItem(prev.items.length)],
    }));
  }

  function removeItem(index) {
    setForm((prev) => {
      const nextItems = prev.items.filter((_, i) => i !== index);
      return {
        ...prev,
        items: nextItems.length > 0 ? nextItems : [emptyItem(0)],
      };
    });
  }

  function updateItem(index, key, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      ),
    }));
  }

  async function submit(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }

    const validItems = form.items
      .map((item, index) => ({
        label: item.label.trim(),
        imageUrl: item.imageUrl.trim() || null,
        categoryKey: item.categoryKey.trim() || null,
        matchKey: item.matchKey.trim() || null,
        sortOrder: index,
      }))
      .filter((item) => item.label);

    if (validItems.length === 0) {
      toast.error("Please add at least one valid item.");
      return;
    }

    if (form.type === "MATCHING") {
      const invalid = validItems.some((item) => !item.matchKey);
      if (invalid) {
        toast.error("All matching items must have a match key.");
        return;
      }
    }

    if (form.type === "SORTING") {
      const invalid = validItems.some((item) => !item.categoryKey);
      if (invalid) {
        toast.error("All sorting items must have a category key.");
        return;
      }
    }

    try {
      setSaving(true);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        active: !!form.active,
        items: validItems,
      };

      if (editingId) {
        await api.put(`/api/admin/matching-sorting/${editingId}`, payload);
        toast.success("Activity updated");
      } else {
        await api.post("/api/admin/matching-sorting", payload);
        toast.success("Activity created");
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
      title: row.title || "",
      description: row.description || "",
      type: row.type || "MATCHING",
      active: !!row.active,
      items:
        Array.isArray(row.items) && row.items.length > 0
          ? row.items.map((item, index) => ({
              label: item.label || "",
              imageUrl: item.imageUrl || "",
              categoryKey: item.categoryKey || "",
              matchKey: item.matchKey || "",
              sortOrder: item.sortOrder ?? index,
            }))
          : [emptyItem(0)],
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleActive(row) {
    try {
      await api.put(`/api/admin/matching-sorting/${row.id}/active`, null, {
        params: { active: !row.active },
      });
      toast.success(row.active ? "Activity hidden" : "Activity activated");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function removeActivity(row) {
    try {
      await api.delete(`/api/admin/matching-sorting/${row.id}`);
      toast.success("Activity deleted");
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
                Admin Matching & Sorting Activities
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create and manage visual matching and sorting activities for children with ASD.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatBadge color="blue">{items.length} Total Activities</StatBadge>
              <StatBadge color="green">{totalActive} Active</StatBadge>
              <StatBadge color="red">{totalInactive} Inactive</StatBadge>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[460px_1fr]">
            <form
              onSubmit={submit}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
            >
              <SectionTitle
                icon={<FaGamepad />}
                title={editingId ? "Edit Matching / Sorting Activity" : "Create Matching / Sorting Activity"}
                subtitle="Create reusable activity sets for matching identical images or sorting by category."
              />

              <div className="space-y-4">
                <Input
                  placeholder="Activity title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />

                <Textarea
                  rows={3}
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />

                <div className="rounded-xl border bg-white px-3">
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value,
                        items: form.items.map((item) => ({
                          ...item,
                          categoryKey: e.target.value === "SORTING" ? item.categoryKey : "",
                          matchKey: e.target.value === "MATCHING" ? item.matchKey : "",
                        })),
                      })
                    }
                    className="w-full bg-transparent py-3 outline-none"
                  >
                    {TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {prettyLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="inline-flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  Active
                </label>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">Activity Items</div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <FaPlus />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {form.items.map((item, index) => (
                    <div key={index} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-700">Item {index + 1}</div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          <FaTrash />
                          Remove
                        </button>
                      </div>

                      <div className="space-y-3">
                        <Input
                          placeholder="Item label"
                          value={item.label}
                          onChange={(e) => updateItem(index, "label", e.target.value)}
                        />

                        <Input
                          placeholder="Image URL (optional)"
                          value={item.imageUrl}
                          onChange={(e) => updateItem(index, "imageUrl", e.target.value)}
                        />

                        {form.type === "MATCHING" ? (
                          <Input
                            placeholder="Match Key (e.g. DOG, APPLE, RED)"
                            value={item.matchKey}
                            onChange={(e) => updateItem(index, "matchKey", e.target.value)}
                          />
                        ) : (
                          <Input
                            placeholder="Category Key (e.g. ANIMAL, FOOD, RED)"
                            value={item.categoryKey}
                            onChange={(e) => updateItem(index, "categoryKey", e.target.value)}
                          />
                        )}

                        <div className="rounded-xl border bg-white px-4 py-3 text-xs text-gray-500">
                          {form.type === "MATCHING"
                            ? "Items with the same match key belong together."
                            : "Category key is the correct bucket for sorting."}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  disabled={saving}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition ${
                    saving ? "cursor-not-allowed bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  <FaCheck />
                  {saving ? "Saving..." : editingId ? "Update Activity" : "Create Activity"}
                </button>

                {editingId ? (
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

            <div className="space-y-8">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                <SectionTitle
                  icon={<FaLayerGroup />}
                  title="Live Activity Preview"
                  subtitle="Preview the structure of the activity before saving."
                />

                <div className="mb-4 flex flex-wrap gap-2">
                  <StatBadge color="purple">{prettyLabel(form.type)}</StatBadge>
                  <StatBadge color="blue">
                    {form.items.filter((x) => x.label.trim()).length} Item
                    {form.items.filter((x) => x.label.trim()).length !== 1 ? "s" : ""}
                  </StatBadge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {form.items.filter((x) => x.label.trim()).length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-600">
                      Add items to preview this activity.
                    </div>
                  ) : (
                    form.items
                      .filter((x) => x.label.trim())
                      .map((item, index) => (
                        <div
                          key={index}
                          className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
                        >
                          <div className="aspect-[4/3] w-full bg-gray-100">
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
                            <div className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              Item {index + 1}
                            </div>

                            <div className="text-base font-semibold text-gray-900">{item.label}</div>

                            <div className="mt-3 text-xs text-gray-500">
                              {form.type === "MATCHING" ? (
                                <>
                                  Match Key:{" "}
                                  <span className="font-semibold text-gray-700">
                                    {item.matchKey || "—"}
                                  </span>
                                </>
                              ) : (
                                <>
                                  Category Key:{" "}
                                  <span className="font-semibold text-gray-700">
                                    {item.categoryKey || "—"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                <SectionTitle
                  icon={<FaGamepad />}
                  title="All Matching & Sorting Activities"
                  subtitle="Manage all created activity sets."
                />

                <div className="space-y-4">
                  {items.length === 0 ? (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-600">
                      No activities found.
                    </div>
                  ) : (
                    items.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-semibold text-gray-900">{row.title}</div>
                              <StatBadge color="purple">{prettyLabel(row.type)}</StatBadge>
                            </div>

                            {row.description ? (
                              <div className="mt-2 text-sm text-gray-600">{row.description}</div>
                            ) : null}

                            <div className="mt-3 flex flex-wrap gap-2">
                              {row.active ? (
                                <StatBadge color="green">Active</StatBadge>
                              ) : (
                                <StatBadge color="red">Inactive</StatBadge>
                              )}

                              <StatBadge color="blue">
                                {(row.items || []).length} Item
                                {(row.items || []).length !== 1 ? "s" : ""}
                              </StatBadge>
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
                              onClick={() => removeActivity(row)}
                              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-medium text-red-600 hover:bg-red-50"
                            >
                              <FaTrash />
                              Delete
                            </button>
                          </div>
                        </div>

                        {(row.items || []).length > 0 ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {row.items.map((item) => (
                              <div
                                key={item.id}
                                className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                              >
                                <div className="font-semibold text-gray-900">{item.label}</div>

                                <div className="mt-2 text-xs text-gray-500">
                                  {row.type === "MATCHING" ? (
                                    <>
                                      Match Key:{" "}
                                      <span className="font-semibold text-gray-700">
                                        {item.matchKey || "—"}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      Category Key:{" "}
                                      <span className="font-semibold text-gray-700">
                                        {item.categoryKey || "—"}
                                      </span>
                                    </>
                                  )}
                                </div>

                                <div className="mt-2 text-xs text-gray-400">
                                  <FaArrowUpWideShort className="mr-1 inline" />
                                  Sort Order: {item.sortOrder ?? 0}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
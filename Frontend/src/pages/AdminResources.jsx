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
  "COMMUNICATION",
  "BEHAVIOR_SUPPORT",
  "DAILY_ROUTINE",
  "SENSORY_SUPPORT",
  "SOCIAL_SKILLS",
  "HOME_ACTIVITIES",
  "PARENT_GUIDANCE",
];

const CONTENT_TYPE_OPTIONS = ["VIDEO", "ARTICLE", "PDF", "LINK"];

function emptyForm() {
  return {
    title: "",
    description: "",
    contentType: "VIDEO",
    category: "COMMUNICATION",
    thumbnailUrl: "",
    videoUrl: "",
    fileUrl: "",
    externalUrl: "",
    contentBody: "",
    published: true,
  };
}

function prettyLabel(v) {
  return String(v || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fieldHelp(contentType) {
  switch (contentType) {
    case "VIDEO":
      return "Use Video URL for YouTube or hosted video links.";
    case "ARTICLE":
      return "Use Content Body for full article text.";
    case "PDF":
      return "Use File URL for the PDF link.";
    case "LINK":
      return "Use External URL for the outside website link.";
    default:
      return "";
  }
}

export default function AdminResources() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    const rawMe = localStorage.getItem("me");
    const localRole = (localStorage.getItem("role") || "").toUpperCase();

    let role = localRole;
    try {
      const me = rawMe ? JSON.parse(rawMe) : null;
      role = (me?.role || localRole || "").toUpperCase();
    } catch {
      // ignore
    }

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
      const res = await api.get("/api/admin/resources");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }

    if (!form.description.trim()) {
      toast.error("Description is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        contentType: form.contentType,
        category: form.category,
        thumbnailUrl: form.thumbnailUrl.trim() || null,
        videoUrl: form.videoUrl.trim() || null,
        fileUrl: form.fileUrl.trim() || null,
        externalUrl: form.externalUrl.trim() || null,
        contentBody: form.contentBody.trim() || null,
        published: !!form.published,
      };

      if (editingId) {
        await api.put(`/api/admin/resources/${editingId}`, payload);
        toast.success("Resource updated.");
      } else {
        await api.post("/api/admin/resources", payload);
        toast.success("Resource created.");
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
      title: row.title || "",
      description: row.description || "",
      contentType: row.contentType || "VIDEO",
      category: row.category || "COMMUNICATION",
      thumbnailUrl: row.thumbnailUrl || "",
      videoUrl: row.videoUrl || "",
      fileUrl: row.fileUrl || "",
      externalUrl: row.externalUrl || "",
      contentBody: row.contentBody || "",
      published: !!row.published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const togglePublished = async (row) => {
    try {
      await api.put(`/api/admin/resources/${row.id}/publish`, null, {
        params: { published: !row.published },
      });
      toast.success(`Resource ${row.published ? "unpublished" : "published"}.`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const publishedCount = useMemo(
    () => items.filter((x) => x.published).length,
    [items]
  );

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Admin — Resource Hub</h1>
              <p className="mt-2 text-sm text-gray-600">
                Create, edit, publish, and manage supportive learning resources for parents.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              Published: <span className="font-semibold">{publishedCount}</span> / {items.length}
            </div>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit Resource" : "Create Resource"}
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
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter resource title..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Short summary for parents..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Content Type</label>
              <select
                value={form.contentType}
                onChange={(e) => setForm((p) => ({ ...p, contentType: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {CONTENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {prettyLabel(opt)}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">{fieldHelp(form.contentType)}</p>
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
              <label className="block text-sm font-medium text-gray-700">Thumbnail URL</label>
              <input
                type="text"
                value={form.thumbnailUrl}
                onChange={(e) => setForm((p) => ({ ...p, thumbnailUrl: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Video URL</label>
              <input
                type="text"
                value={form.videoUrl}
                onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="YouTube or video link..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">File URL</label>
              <input
                type="text"
                value={form.fileUrl}
                onChange={(e) => setForm((p) => ({ ...p, fileUrl: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="PDF link..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">External URL</label>
              <input
                type="text"
                value={form.externalUrl}
                onChange={(e) => setForm((p) => ({ ...p, externalUrl: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="External website link..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Content Body</label>
              <textarea
                value={form.contentBody}
                onChange={(e) => setForm((p) => ({ ...p, contentBody: e.target.value }))}
                rows={6}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Full article or guidance text..."
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-6 pt-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))}
                />
                Published
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
              {saving ? "Saving..." : editingId ? "Update Resource" : "Create Resource"}
            </button>
          </div>
        </form>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">All Resources</h2>
            <button
              type="button"
              onClick={load}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-gray-600">Loading resources...</div>
          ) : items.length === 0 ? (
            <div className="mt-4 text-sm text-gray-600">No resources found.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">ID</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Title</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Category</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Type</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                    <th className="py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="py-3 text-gray-900">{row.id}</td>
                      <td className="py-3 text-gray-900">{row.title}</td>
                      <td className="py-3 text-gray-700">{prettyLabel(row.category)}</td>
                      <td className="py-3 text-gray-700">{prettyLabel(row.contentType)}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                            row.published
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          {row.published ? "Published" : "Hidden"}
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
                            onClick={() => togglePublished(row)}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold text-white ${
                              row.published
                                ? "bg-gray-700 hover:bg-gray-800"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {row.published ? "Hide" : "Publish"}
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
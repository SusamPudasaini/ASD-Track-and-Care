import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FaBookOpen,
  FaVideo,
  FaFilePdf,
  FaLink,
  FaImage,
  FaFolderOpen,
  FaLayerGroup,
  FaPlus,
  FaPenToSquare,
  FaArrowsRotate,
  FaEye,
  FaEyeSlash,
  FaCheck,
  FaGlobe,
  FaAlignLeft,
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

function getContentTypeIcon(contentType) {
  switch (contentType) {
    case "VIDEO":
      return <FaVideo />;
    case "PDF":
      return <FaFilePdf />;
    case "LINK":
      return <FaLink />;
    case "ARTICLE":
    default:
      return <FaBookOpen />;
  }
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

function InputWithIcon({ icon, className = "", ...props }) {
  return (
    <div className={`flex items-center rounded-xl border bg-white px-3 ${className}`}>
      <span className="mr-3 text-gray-400">{icon}</span>
      <input {...props} className="w-full bg-transparent py-3 text-sm outline-none" />
    </div>
  );
}

function TextareaWithIcon({ icon, rows = 4, className = "", ...props }) {
  return (
    <div className={`flex rounded-xl border bg-white px-3 ${className}`}>
      <span className="mr-3 pt-3 text-gray-400">{icon}</span>
      <textarea
        {...props}
        rows={rows}
        className="w-full resize-none bg-transparent py-3 text-sm outline-none"
      />
    </div>
  );
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
      toast.success(`Resource ${row.published ? "hidden" : "published"}.`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const publishedCount = useMemo(() => items.filter((x) => x.published).length, [items]);
  const hiddenCount = items.length - publishedCount;
  const videoCount = useMemo(
    () => items.filter((x) => String(x.contentType) === "VIDEO").length,
    [items]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="ml-72 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Admin Resource Hub Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create, edit, publish, and organize supportive learning resources for parents.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatBadge color="blue">{items.length} Total Resources</StatBadge>
              <StatBadge color="green">{publishedCount} Published</StatBadge>
              <StatBadge color="red">{hiddenCount} Hidden</StatBadge>
              <StatBadge color="purple">{videoCount} Videos</StatBadge>
            </div>
          </div>

          <form
            onSubmit={submit}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
          >
            <SectionTitle
              icon={<FaFolderOpen />}
              title={editingId ? "Edit Resource" : "Create Resource"}
              subtitle="Add educational content, videos, PDFs, articles, and external links."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <InputWithIcon
                icon={<FaBookOpen />}
                placeholder="Enter resource title..."
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="md:col-span-2"
              />

              <TextareaWithIcon
                icon={<FaAlignLeft />}
                placeholder="Short summary for parents..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="md:col-span-2"
                rows={3}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Content Type</label>
                <div className="flex items-center rounded-xl border bg-white px-3">
                  <span className="mr-3 text-gray-400">{getContentTypeIcon(form.contentType)}</span>
                  <select
                    value={form.contentType}
                    onChange={(e) => setForm((p) => ({ ...p, contentType: e.target.value }))}
                    className="w-full bg-transparent py-3 text-sm outline-none"
                  >
                    {CONTENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {prettyLabel(opt)}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-xs text-gray-500">{fieldHelp(form.contentType)}</p>
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

              <InputWithIcon
                icon={<FaImage />}
                placeholder="Thumbnail URL"
                value={form.thumbnailUrl}
                onChange={(e) => setForm((p) => ({ ...p, thumbnailUrl: e.target.value }))}
              />

              <InputWithIcon
                icon={<FaVideo />}
                placeholder="Video URL"
                value={form.videoUrl}
                onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))}
              />

              <InputWithIcon
                icon={<FaFilePdf />}
                placeholder="File URL"
                value={form.fileUrl}
                onChange={(e) => setForm((p) => ({ ...p, fileUrl: e.target.value }))}
              />

              <InputWithIcon
                icon={<FaGlobe />}
                placeholder="External URL"
                value={form.externalUrl}
                onChange={(e) => setForm((p) => ({ ...p, externalUrl: e.target.value }))}
              />

              <TextareaWithIcon
                icon={<FaBookOpen />}
                placeholder="Full article or guidance text..."
                value={form.contentBody}
                onChange={(e) => setForm((p) => ({ ...p, contentBody: e.target.value }))}
                className="md:col-span-2"
                rows={6}
              />

              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-3 rounded-xl border bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))}
                  />
                  Published
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
                {saving ? "Saving..." : editingId ? "Update Resource" : "Create Resource"}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <SectionTitle
              icon={<FaFolderOpen />}
              title="All Resources"
              subtitle="Review all available learning resources and control their published status."
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
                Loading resources...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-600">
                No resources found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-3 font-semibold text-gray-700">ID</th>
                      <th className="py-3 font-semibold text-gray-700">Title</th>
                      <th className="py-3 font-semibold text-gray-700">Category</th>
                      <th className="py-3 font-semibold text-gray-700">Type</th>
                      <th className="py-3 font-semibold text-gray-700">Status</th>
                      <th className="py-3 text-right font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id} className="border-b align-top last:border-b-0">
                        <td className="py-4 font-medium text-gray-900">{row.id}</td>
                        <td className="py-4 text-gray-900">{row.title}</td>
                        <td className="py-4">
                          <StatBadge color="purple">{prettyLabel(row.category)}</StatBadge>
                        </td>
                        <td className="py-4">
                          <span className="inline-flex items-center gap-2 text-gray-700">
                            {getContentTypeIcon(row.contentType)}
                            {prettyLabel(row.contentType)}
                          </span>
                        </td>
                        <td className="py-4">
                          {row.published ? (
                            <StatBadge color="green">Published</StatBadge>
                          ) : (
                            <StatBadge color="gray">Hidden</StatBadge>
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
                              onClick={() => togglePublished(row)}
                              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white ${
                                row.published
                                  ? "bg-gray-700 hover:bg-gray-800"
                                  : "bg-green-600 hover:bg-green-700"
                              }`}
                            >
                              {row.published ? (
                                <>
                                  <FaEyeSlash />
                                  Hide
                                </>
                              ) : (
                                <>
                                  <FaEye />
                                  Publish
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
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FaBuilding,
  FaLocationDot,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaImage,
  FaMapLocationDot,
  FaStar,
  FaPenToSquare,
  FaEye,
  FaEyeSlash,
  FaUpload,
  FaFileCsv,
  FaTrash,
  FaPlus,
  FaCheck,
} from "react-icons/fa6";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

const CATEGORY_OPTIONS = [
  "GENERAL",
  "ASD_FRIENDLY",
  "SPECIAL_NEEDS",
  "EARLY_INTERVENTION",
  "THERAPY_CENTER",
];

function emptyForm() {
  return {
    name: "",
    description: "",
    category: "GENERAL",
    address: "",
    latitude: "",
    longitude: "",
    phone: "",
    email: "",
    websiteUrl: "",
    imageUrl: "",
    googleMapsUrl: "",
    googlePlaceId: "",
    published: true,
  };
}

function emptyGoogleReviewForm() {
  return {
    authorName: "",
    rating: 5,
    comment: "",
    relativeTimeText: "",
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

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSVText(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCSVLine(lines[i]);
    const row = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });

    rows.push(row);
  }

  return rows;
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
      <input {...props} className="w-full bg-transparent py-3 outline-none" />
    </div>
  );
}

function TextareaWithIcon({ icon, rows = 4, className = "", ...props }) {
  return (
    <div className={`flex rounded-xl border bg-white px-3 ${className}`}>
      <span className="mr-3 pt-3 text-gray-400">{icon}</span>
      <textarea {...props} rows={rows} className="w-full resize-none bg-transparent py-3 outline-none" />
    </div>
  );
}

export default function AdminDayCares() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [selectedDayCareId, setSelectedDayCareId] = useState("");
  const [googleReviewForm, setGoogleReviewForm] = useState(emptyGoogleReviewForm());
  const [savingGoogleReview, setSavingGoogleReview] = useState(false);

  const [csvRows, setCsvRows] = useState([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [uploadingCsv, setUploadingCsv] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await api.get("/api/admin/daycares");
      const rows = Array.isArray(res.data) ? res.data : [];
      setItems(rows);

      if (!selectedDayCareId && rows.length > 0) {
        setSelectedDayCareId(String(rows[0].id));
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function submit(e) {
    e.preventDefault();

    try {
      setSaving(true);

      const payload = {
        ...form,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
      };

      if (editingId) {
        await api.put(`/api/admin/daycares/${editingId}`, payload);
        toast.success("Day care updated");
      } else {
        await api.post("/api/admin/daycares", payload);
        toast.success("Day care created");
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
      name: row.name || "",
      description: row.description || "",
      category: row.category || "GENERAL",
      address: row.address || "",
      latitude: row.latitude ?? "",
      longitude: row.longitude ?? "",
      phone: row.phone || "",
      email: row.email || "",
      websiteUrl: row.websiteUrl || "",
      imageUrl: row.imageUrl || "",
      googleMapsUrl: row.googleMapsUrl || "",
      googlePlaceId: row.googlePlaceId || "",
      published: !!row.published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggle(row) {
    try {
      await api.put(`/api/admin/daycares/${row.id}/publish`, null, {
        params: { published: !row.published },
      });
      toast.success(`Day care ${row.published ? "hidden" : "published"}`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function submitGoogleReview(e) {
    e.preventDefault();

    if (!selectedDayCareId) {
      toast.error("Please select a day care first.");
      return;
    }

    if (!googleReviewForm.authorName.trim()) {
      toast.error("Author name is required.");
      return;
    }

    if (!googleReviewForm.comment.trim()) {
      toast.error("Comment is required.");
      return;
    }

    try {
      setSavingGoogleReview(true);

      await api.post(`/api/admin/daycares/${selectedDayCareId}/google-reviews`, {
        authorName: googleReviewForm.authorName.trim(),
        rating: Number(googleReviewForm.rating) || 5,
        comment: googleReviewForm.comment.trim(),
        relativeTimeText: googleReviewForm.relativeTimeText.trim() || null,
      });

      toast.success("Google review snapshot added.");
      setGoogleReviewForm(emptyGoogleReviewForm());
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingGoogleReview(false);
    }
  }

  async function handleCsvFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a .csv file.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCSVText(text);

      const normalized = parsed.map((row, index) => ({
        rowNumber: index + 2,
        authorName: (row.authorName || row["author name"] || row.author || "").trim(),
        rating: Number(row.rating || 5),
        comment: (row.comment || row.review || "").trim(),
        relativeTimeText: (row.relativeTimeText || row["relative time text"] || row.time || "").trim(),
      }));

      const validRows = normalized.filter(
        (row) => row.authorName && row.comment && row.rating >= 1 && row.rating <= 5
      );

      if (validRows.length === 0) {
        toast.error("No valid rows found in CSV.");
        setCsvRows([]);
        setCsvFileName("");
        return;
      }

      setCsvRows(validRows);
      setCsvFileName(file.name);
      toast.success(`${validRows.length} review rows loaded from CSV.`);
    } catch {
      toast.error("Failed to read CSV file.");
    }
  }

  async function uploadCsvReviews() {
    if (!selectedDayCareId) {
      toast.error("Please select a day care first.");
      return;
    }

    if (csvRows.length === 0) {
      toast.error("No CSV rows loaded.");
      return;
    }

    try {
      setUploadingCsv(true);

      let successCount = 0;
      let failCount = 0;

      for (const row of csvRows) {
        try {
          await api.post(`/api/admin/daycares/${selectedDayCareId}/google-reviews`, {
            authorName: row.authorName,
            rating: Number(row.rating) || 5,
            comment: row.comment,
            relativeTimeText: row.relativeTimeText || null,
          });
          successCount += 1;
        } catch {
          failCount += 1;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} review(s) uploaded successfully.`);
      }

      if (failCount > 0) {
        toast.error(`${failCount} review(s) failed to upload.`);
      }

      setCsvRows([]);
      setCsvFileName("");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingCsv(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
  }

  const selectedDayCare = useMemo(
    () => items.find((x) => String(x.id) === String(selectedDayCareId)) || null,
    [items, selectedDayCareId]
  );

  const totalPublished = items.filter((x) => x.published).length;
  const totalHidden = items.length - totalPublished;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="ml-72 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Admin Day Care Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create, update, publish, and manage daycare centers and Google review snapshots.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatBadge color="blue">{items.length} Total Centers</StatBadge>
              <StatBadge color="green">{totalPublished} Published</StatBadge>
              <StatBadge color="red">{totalHidden} Hidden</StatBadge>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-2">
            {/* Main form */}
            <form
              onSubmit={submit}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
            >
              <SectionTitle
                icon={<FaBuilding />}
                title={editingId ? "Edit Day Care / Therapy Center" : "Create Day Care / Therapy Center"}
                subtitle="Add complete details for a listed center."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <InputWithIcon
                  icon={<FaBuilding />}
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                  icon={<FaLocationDot />}
                  placeholder="Address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="md:col-span-2"
                />

                <InputWithIcon
                  icon={<FaMapLocationDot />}
                  placeholder="Google Maps Link"
                  value={form.googleMapsUrl}
                  onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })}
                  className="md:col-span-2"
                />

                <InputWithIcon
                  icon={<FaImage />}
                  placeholder="Thumbnail Image URL"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="md:col-span-2"
                />

                <InputWithIcon
                  icon={<FaLocationDot />}
                  placeholder="Latitude (optional)"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                />

                <InputWithIcon
                  icon={<FaLocationDot />}
                  placeholder="Longitude (optional)"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                />

                <InputWithIcon
                  icon={<FaPhone />}
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />

                <InputWithIcon
                  icon={<FaEnvelope />}
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />

                <InputWithIcon
                  icon={<FaGlobe />}
                  placeholder="Website"
                  value={form.websiteUrl}
                  onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                  className="md:col-span-2"
                />

                <TextareaWithIcon
                  icon={<FaPenToSquare />}
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="md:col-span-2"
                  rows={4}
                />

                <label className="inline-flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  />
                  Published
                </label>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  disabled={saving}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition ${
                    saving ? "cursor-not-allowed bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  <FaCheck />
                  {saving ? "Saving..." : editingId ? "Update Center" : "Create Center"}
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

            {/* Manual Google review form */}
            <form
              onSubmit={submitGoogleReview}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
            >
              <SectionTitle
                icon={<FaStar />}
                title="Add Google Review Snapshot"
                subtitle="Manually add one Google review snapshot for a selected center."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 rounded-xl border bg-white px-3">
                  <select
                    value={selectedDayCareId}
                    onChange={(e) => setSelectedDayCareId(e.target.value)}
                    className="w-full bg-transparent py-3 outline-none"
                  >
                    <option value="">Select a day care</option>
                    {items.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDayCare ? (
                  <div className="md:col-span-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    Adding review for <span className="font-semibold">{selectedDayCare.name}</span>
                  </div>
                ) : null}

                <InputWithIcon
                  icon={<FaPenToSquare />}
                  placeholder="Author Name"
                  value={googleReviewForm.authorName}
                  onChange={(e) =>
                    setGoogleReviewForm((p) => ({ ...p, authorName: e.target.value }))
                  }
                />

                <div className="rounded-xl border bg-white px-3">
                  <select
                    value={googleReviewForm.rating}
                    onChange={(e) =>
                      setGoogleReviewForm((p) => ({ ...p, rating: e.target.value }))
                    }
                    className="w-full bg-transparent py-3 outline-none"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} Star{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <InputWithIcon
                  icon={<FaStar />}
                  placeholder="Relative Time Text (e.g. 2 weeks ago)"
                  value={googleReviewForm.relativeTimeText}
                  onChange={(e) =>
                    setGoogleReviewForm((p) => ({ ...p, relativeTimeText: e.target.value }))
                  }
                  className="md:col-span-2"
                />

                <TextareaWithIcon
                  icon={<FaPenToSquare />}
                  placeholder="Review Comment"
                  value={googleReviewForm.comment}
                  onChange={(e) =>
                    setGoogleReviewForm((p) => ({ ...p, comment: e.target.value }))
                  }
                  className="md:col-span-2"
                  rows={4}
                />
              </div>

              <button
                disabled={savingGoogleReview}
                className={`mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition ${
                  savingGoogleReview
                    ? "cursor-not-allowed bg-blue-300"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <FaPlus />
                {savingGoogleReview ? "Saving..." : "Add Google Review"}
              </button>
            </form>
          </div>

          {/* CSV bulk upload */}
          <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <SectionTitle
              icon={<FaFileCsv />}
              title="Bulk Upload Google Reviews via CSV"
              subtitle="Upload a CSV file and add multiple Google review snapshots at once."
            />

            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-700">
                    <FaUpload />
                    Upload CSV File
                  </div>

                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="block w-full rounded-lg border bg-white p-3 text-sm"
                  />

                  <div className="mt-3 text-sm text-gray-600">
                    Expected columns: <span className="font-semibold">authorName, rating, comment, relativeTimeText</span>
                  </div>

                  {csvFileName ? (
                    <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm text-gray-700 ring-1 ring-gray-100">
                      Loaded file: <span className="font-semibold">{csvFileName}</span> ·{" "}
                      <span className="font-semibold">{csvRows.length}</span> valid row(s)
                    </div>
                  ) : null}
                </div>

                {selectedDayCare ? (
                  <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                    Bulk reviews will be added to{" "}
                    <span className="font-semibold">{selectedDayCare.name}</span>
                  </div>
                ) : (
                  <div className="rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                    Select a day care from the Google review section above before uploading.
                  </div>
                )}
              </div>

              <div className="flex items-start">
                <button
                  type="button"
                  onClick={uploadCsvReviews}
                  disabled={uploadingCsv || csvRows.length === 0 || !selectedDayCareId}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition ${
                    uploadingCsv || csvRows.length === 0 || !selectedDayCareId
                      ? "cursor-not-allowed bg-blue-300"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  <FaUpload />
                  {uploadingCsv ? "Uploading..." : "Upload Bulk Reviews"}
                </button>
              </div>
            </div>

            {csvRows.length > 0 ? (
              <div className="mt-6 overflow-x-auto rounded-2xl border">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Author</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Rating</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Comment</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Relative Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, idx) => (
                      <tr key={`${row.authorName}-${idx}`} className="border-b last:border-b-0">
                        <td className="px-4 py-3 text-gray-600">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.authorName}</td>
                        <td className="px-4 py-3">{row.rating}</td>
                        <td className="px-4 py-3 text-gray-700">{row.comment}</td>
                        <td className="px-4 py-3 text-gray-600">{row.relativeTimeText || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          {/* Table */}
          <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <SectionTitle
              icon={<FaBuilding />}
              title="All Day Care Centers"
              subtitle="Manage center visibility and quickly edit listed data."
            />

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 font-semibold text-gray-700">Name</th>
                    <th className="py-3 font-semibold text-gray-700">Category</th>
                    <th className="py-3 font-semibold text-gray-700">Address</th>
                    <th className="py-3 font-semibold text-gray-700">Parent Rating</th>
                    <th className="py-3 font-semibold text-gray-700">Google Rating</th>
                    <th className="py-3 font-semibold text-gray-700">Status</th>
                    <th className="py-3 text-right font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b align-top">
                      <td className="py-4 font-medium text-gray-900">{row.name}</td>
                      <td className="py-4">
                        <StatBadge color="purple">{prettyLabel(row.category)}</StatBadge>
                      </td>
                      <td className="py-4 text-gray-700">{row.address}</td>
                      <td className="py-4">
                        <div className="inline-flex items-center gap-2">
                          <FaStar className="text-yellow-500" />
                          <span>
                            {row.averageRating || 0} ({row.totalReviews || 0})
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="inline-flex items-center gap-2">
                          <FaStar className="text-yellow-500" />
                          <span>
                            {row.googleRating || 0} ({row.googleReviewCount || 0})
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        {row.published ? (
                          <StatBadge color="green">Published</StatBadge>
                        ) : (
                          <StatBadge color="red">Hidden</StatBadge>
                        )}
                      </td>

                      <td className="py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => edit(row)}
                            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <FaPenToSquare />
                            Edit
                          </button>

                          <button
                            onClick={() => toggle(row)}
                            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
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

                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-10 text-center text-gray-500">
                        No day care centers found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
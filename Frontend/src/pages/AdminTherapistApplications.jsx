import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

const TABS = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

// ✅ Always convert backend errors to a string
function getErrorMessage(err) {
  const data = err?.response?.data;

  if (!data) return "Something went wrong.";

  if (typeof data === "string") return data;

  if (typeof data === "object") {
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.title) return data.title;

    // Spring default error keys: timestamp/status/error/path
    if (data.status && data.path) {
      return `${data.error || "Request failed"} (${data.status})`;
    }

    try {
      return JSON.stringify(data);
    } catch {
      return "Something went wrong.";
    }
  }

  return String(data);
}

function fmtDate(value) {
  try {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  } catch {
    return String(value || "-");
  }
}

function isProbablyImage(type = "") {
  return type.startsWith("image/");
}

function isProbablyPdf(type = "") {
  return type === "application/pdf";
}

export default function AdminTherapistApplications() {
  const navigate = useNavigate();

  const [activeStatus, setActiveStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [actionId, setActionId] = useState(null);

  // Details modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState(null); // { application, documents }
  const [detailsRow, setDetailsRow] = useState(null); // fallback row

  // Decision modal
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionType, setDecisionType] = useState(null); // "approve" | "reject" | "markPending"
  const [decisionApp, setDecisionApp] = useState(null);
  const [adminMessage, setAdminMessage] = useState("");

  const loadByStatus = async (status, signal) => {
    try {
      setLoading(true);

      const res = await api.get("/api/admin/therapist-applications", {
        params: { status },
        signal,
      });

      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err?.name === "CanceledError") return;

      const code = err?.response?.status;

      if (code === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/logout", { replace: true });
        return;
      }

      if (code === 403) {
        toast.error("Access denied (Admins only).");
        navigate("/", { replace: true });
        return;
      }

      console.error("LOAD ERROR:", code, err?.response?.data);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      toast.error("Please login first.");
      navigate("/login", { replace: true });
      return;
    }

    if (role !== "ADMIN") {
      toast.error("Access denied. Admins only.");
      navigate("/", { replace: true });
      return;
    }

    const controller = new AbortController();
    loadByStatus(activeStatus, controller.signal);

    return () => controller.abort();
  }, [activeStatus, navigate]);

  const refresh = async () => {
    const controller = new AbortController();
    await loadByStatus(activeStatus, controller.signal);
  };

  // ---------------- Details ----------------
  const openDetails = async (row) => {
    setDetailsRow(row);
    setDetails(null);
    setDetailsOpen(true);

    try {
      setDetailsLoading(true);

      // expects: GET /api/admin/therapist-applications/{id}
      // return: { application: {...}, documents: [...] }
      const res = await api.get(`/api/admin/therapist-applications/${row.id}`);
      const data = res.data;

      if (data?.application) {
        setDetails(data);
      } else if (data?.id) {
        setDetails({ application: data, documents: data.documents || [] });
      } else {
        setDetails({ application: row, documents: [] });
      }
    } catch (err) {
      console.error("DETAILS ERROR:", err?.response?.status, err?.response?.data);
      toast.error(getErrorMessage(err));
      setDetails({ application: row, documents: [] });
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetails(null);
    setDetailsRow(null);
    setDetailsLoading(false);
  };

  // ---------------- Documents (JWT download) ----------------
  const downloadDocument = async (doc) => {
    const docId = doc?.id;
    if (!docId) return toast.error("Document id missing.");

    try {
      const res = await api.get(`/api/admin/therapist-documents/${docId}/download`, {
        responseType: "blob",
      });

      const contentType = res.headers?.["content-type"] || doc?.fileType || "application/octet-stream";
      const blob = new Blob([res.data], { type: contentType });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Try to create a clean filename
      const safeTitle = (doc?.title || `document-${docId}`).replace(/[^\w\-]+/g, "_");
      const ext = isProbablyPdf(contentType)
        ? ".pdf"
        : isProbablyImage(contentType)
        ? ""
        : "";

      a.download = `${safeTitle}${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DOWNLOAD ERROR:", err?.response?.status, err?.response?.data);
      toast.error(getErrorMessage(err));
    }
  };

  const previewDocument = async (doc) => {
    const docId = doc?.id;
    if (!docId) return toast.error("Document id missing.");

    try {
      const res = await api.get(`/api/admin/therapist-documents/${docId}/download`, {
        responseType: "blob",
      });

      const contentType = res.headers?.["content-type"] || doc?.fileType || "application/octet-stream";
      const blob = new Blob([res.data], { type: contentType });

      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");

      // note: don't revoke immediately or the tab may lose the blob
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error("PREVIEW ERROR:", err?.response?.status, err?.response?.data);
      toast.error(getErrorMessage(err));
    }
  };

  // ---------------- Decision ----------------
  const openDecision = (type, app) => {
    setDecisionType(type);
    setDecisionApp(app);
    setAdminMessage(app?.adminMessage || "");
    setDecisionOpen(true);
  };

  const closeDecision = () => {
    setDecisionOpen(false);
    setDecisionType(null);
    setDecisionApp(null);
    setAdminMessage("");
  };

  const confirmDecision = async () => {
    if (!decisionApp?.id || !decisionType) return;

    try {
      setActionId(decisionApp.id);

      const payload = { adminMessage: adminMessage.trim() || null };

      if (decisionType === "approve") {
        await api.put(`/api/admin/therapist-applications/${decisionApp.id}/approve`, payload);
        toast.success("Application approved.");
      }

      if (decisionType === "reject") {
        await api.put(`/api/admin/therapist-applications/${decisionApp.id}/reject`, payload);
        toast.success("Application rejected.");
      }

      if (decisionType === "markPending") {
        await api.put(`/api/admin/therapist-applications/${decisionApp.id}/mark-pending`, payload);
        toast.success("Marked as pending.");
      }

      closeDecision();
      await refresh();
    } catch (err) {
      const code = err?.response?.status;

      if (code === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/logout", { replace: true });
        return;
      }
      if (code === 403) {
        toast.error("Access denied (Admins only).");
        navigate("/", { replace: true });
        return;
      }

      console.error("DECISION ERROR:", code, err?.response?.data);
      toast.error(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const tabLabel = TABS.find((t) => t.key === activeStatus)?.label || activeStatus;

  const detailsApp = details?.application || detailsRow || null;
  const detailsDocs = Array.isArray(details?.documents) ? details.documents : [];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="rounded-md border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Admin — Therapist Applications</h1>
              <p className="mt-2 text-sm text-gray-600">
                Review applications by status. View full details + documents, approve/reject, or revert to pending.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={refresh}
                className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Refresh
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveStatus(t.key)}
                className={`rounded px-4 py-2 text-sm font-semibold border ${
                  activeStatus === t.key
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 rounded-md border border-gray-100 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="text-sm text-gray-600">Loading {tabLabel.toLowerCase()} applications...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-gray-600">No {tabLabel.toLowerCase()} applications.</div>
          ) : (
            <div className="overflow-x-auto">
              {/* ✅ EXACT columns requested */}
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">ID</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Full Name</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Submitted</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Qualification</th>
                    <th className="py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((a) => (
                    <tr key={a.id} className="border-b last:border-b-0">
                      <td className="py-3 text-sm text-gray-900">{a.id ?? "-"}</td>
                      <td className="py-3 text-sm text-gray-900">{a.fullName ?? "-"}</td>
                      <td className="py-3 text-sm text-gray-700">{fmtDate(a.createdAt)}</td>
                      <td className="py-3 text-sm text-gray-700">{a.qualification ?? "-"}</td>

                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openDetails(a)}
                            className="rounded border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            View Details
                          </button>

                          {activeStatus === "PENDING" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openDecision("approve", a)}
                                disabled={actionId === a.id}
                                className={`rounded px-3 py-2 text-xs font-semibold text-white ${
                                  actionId === a.id ? "bg-green-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                                }`}
                              >
                                {actionId === a.id ? "Working..." : "Approve"}
                              </button>

                              <button
                                type="button"
                                onClick={() => openDecision("reject", a)}
                                disabled={actionId === a.id}
                                className={`rounded px-3 py-2 text-xs font-semibold text-white ${
                                  actionId === a.id ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                                }`}
                              >
                                {actionId === a.id ? "Working..." : "Reject"}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openDecision("markPending", a)}
                              disabled={actionId === a.id}
                              className={`rounded px-3 py-2 text-xs font-semibold text-white ${
                                actionId === a.id ? "bg-gray-300 cursor-not-allowed" : "bg-gray-700 hover:bg-gray-800"
                              }`}
                            >
                              {actionId === a.id ? "Working..." : "Mark as Pending"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {activeStatus === "PENDING" ? (
                <p className="mt-4 text-xs text-gray-500">
                  Note: Approving will promote the user role to <span className="font-semibold">THERAPIST</span>. Approve/Reject
                  saves your message and sends an email.
                </p>
              ) : (
                <p className="mt-4 text-xs text-gray-500">
                  Tip: If an action was done by mistake, use <span className="font-semibold">Mark as Pending</span> to revert.
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      {/* DETAILS MODAL */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Application Details</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {detailsApp?.fullName || "-"} <span className="text-gray-400">•</span> Status:{" "}
                  <span className="font-semibold">{detailsApp?.status || activeStatus}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {detailsLoading ? (
              <div className="mt-5 text-sm text-gray-600">Loading details...</div>
            ) : (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Info label="Application ID" value={detailsApp?.id} />
                <Info label="Applicant Username" value={detailsApp?.applicantUsername} />
                <Info label="Email" value={detailsApp?.email} />
                <Info label="Phone" value={detailsApp?.phone} />
                <Info label="City" value={detailsApp?.city} />
                <Info label="Workplace" value={detailsApp?.workplace} />
                <Info label="Qualification" value={detailsApp?.qualification} />
                <Info label="License Number" value={detailsApp?.licenseNumber} />
                <Info label="Years Experience" value={detailsApp?.yearsExperience} />
                <Info label="Specialization" value={detailsApp?.specialization} />
                <Info label="Submitted" value={fmtDate(detailsApp?.createdAt)} />
                <Info label="Reviewed By" value={detailsApp?.reviewedBy} />
                <Info label="Reviewed At" value={fmtDate(detailsApp?.reviewedAt)} />

                <div className="md:col-span-2">
                  <div className="text-sm font-semibold text-gray-900">Applicant Message</div>
                  <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                    {detailsApp?.message ? detailsApp.message : <span className="text-gray-400">—</span>}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="text-sm font-semibold text-gray-900">Admin Message</div>
                  <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                    {detailsApp?.adminMessage ? detailsApp.adminMessage : <span className="text-gray-400">—</span>}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">Uploaded Documents</div>
                    <div className="text-xs text-gray-500">{detailsDocs.length} file(s)</div>
                  </div>

                  {detailsDocs.length === 0 ? (
                    <div className="mt-2 rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                      No documents uploaded.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {detailsDocs.map((d) => {
                        const label = d.title || d.fileName || d.originalName || `Document ${d.id}`;
                        const type = d.fileType || d.contentType || "";

                        const canPreview = isProbablyPdf(type) || isProbablyImage(type);

                        return (
                          <div
                            key={d.id || label}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-gray-900">{label}</div>
                              <div className="truncate text-xs text-gray-500">
                                {type || "file"}
                                {d.uploadedAt ? ` • ${fmtDate(d.uploadedAt)}` : ""}
                              </div>
                            </div>

                            <div className="flex shrink-0 gap-2">
                              {canPreview ? (
                                <button
                                  type="button"
                                  onClick={() => previewDocument(d)}
                                  className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                  Preview
                                </button>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => downloadDocument(d)}
                                className="rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black"
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeDetails}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DECISION MODAL */}
      {decisionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {decisionType === "approve"
                    ? "Approve Application"
                    : decisionType === "reject"
                    ? "Reject Application"
                    : "Mark as Pending"}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Applicant: <span className="font-semibold">{decisionApp?.fullName || "-"}</span> ({decisionApp?.id})
                </p>
              </div>

              <button
                type="button"
                onClick={closeDecision}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Message to user (optional)</label>
              <textarea
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                rows={5}
                className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="This message will be visible to the user on the site and included in the email."
              />
              <p className="mt-2 text-xs text-gray-500">Keep it short and clear.</p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDecision}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDecision}
                disabled={actionId === decisionApp?.id}
                className={`rounded-lg px-5 py-2 text-sm font-semibold text-white ${
                  decisionType === "approve"
                    ? actionId === decisionApp?.id
                      ? "bg-green-300 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                    : decisionType === "reject"
                    ? actionId === decisionApp?.id
                      ? "bg-red-300 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700"
                    : actionId === decisionApp?.id
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-gray-700 hover:bg-gray-800"
                }`}
              >
                {actionId === decisionApp?.id
                  ? "Working..."
                  : decisionType === "approve"
                  ? "Approve"
                  : decisionType === "reject"
                  ? "Reject"
                  : "Mark as Pending"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  const show = value === 0 ? "0" : value ? String(value) : "—";
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-900">{show}</div>
    </div>
  );
}

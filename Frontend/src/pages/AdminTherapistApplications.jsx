import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FaUserDoctor,
  FaClock,
  FaCircleCheck,
  FaCircleXmark,
  FaArrowsRotate,
  FaArrowLeft,
  FaEye,
  FaCheck,
  FaXmark,
  FaRotateLeft,
  FaEnvelope,
  FaPhone,
  FaLocationDot,
  FaBuilding,
  FaGraduationCap,
  FaIdCard,
  FaBriefcase,
  FaFileLines,
  FaDownload,
  FaUpRightFromSquare,
  FaUser,
} from "react-icons/fa6";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

const TABS = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

function getErrorMessage(err) {
  const data = err?.response?.data;

  if (!data) return "Something went wrong.";

  if (typeof data === "string") return data;

  if (typeof data === "object") {
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.title) return data.title;

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

export default function AdminTherapistApplications() {
  const navigate = useNavigate();

  const [activeStatus, setActiveStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [actionId, setActionId] = useState(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [detailsRow, setDetailsRow] = useState(null);

  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionType, setDecisionType] = useState(null);
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

  const openDetails = async (row) => {
    setDetailsRow(row);
    setDetails(null);
    setDetailsOpen(true);

    try {
      setDetailsLoading(true);

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
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("PREVIEW ERROR:", err?.response?.status, err?.response?.data);
      toast.error(getErrorMessage(err));
    }
  };

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

  const pendingCount = useMemo(
    () => (activeStatus === "PENDING" ? items.length : 0),
    [activeStatus, items]
  );
  const approvedCount = useMemo(
    () => (activeStatus === "APPROVED" ? items.length : 0),
    [activeStatus, items]
  );
  const rejectedCount = useMemo(
    () => (activeStatus === "REJECTED" ? items.length : 0),
    [activeStatus, items]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="ml-72 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Admin Therapist Applications
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Review therapist applications, inspect uploaded documents, and approve, reject, or revert applications.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatBadge color="yellow">
                {activeStatus === "PENDING" ? pendingCount : 0} Pending
              </StatBadge>
              <StatBadge color="green">
                {activeStatus === "APPROVED" ? approvedCount : 0} Approved
              </StatBadge>
              <StatBadge color="red">
                {activeStatus === "REJECTED" ? rejectedCount : 0} Rejected
              </StatBadge>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <SectionTitle
              icon={<FaUserDoctor />}
              title="Application Review"
              subtitle="Filter therapist applications by status and take review actions."
            />

            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveStatus(t.key)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      activeStatus === t.key
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={refresh}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <FaArrowsRotate />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <FaArrowLeft />
                  Back
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-600">
                Loading {tabLabel.toLowerCase()} applications...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-600">
                No {tabLabel.toLowerCase()} applications.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-3 font-semibold text-gray-700">ID</th>
                      <th className="py-3 font-semibold text-gray-700">Full Name</th>
                      <th className="py-3 font-semibold text-gray-700">Submitted</th>
                      <th className="py-3 font-semibold text-gray-700">Qualification</th>
                      <th className="py-3 text-right font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((a) => (
                      <tr key={a.id} className="border-b align-top last:border-b-0">
                        <td className="py-4 font-medium text-gray-900">{a.id ?? "-"}</td>
                        <td className="py-4 text-gray-900">{a.fullName ?? "-"}</td>
                        <td className="py-4 text-gray-700">{fmtDate(a.createdAt)}</td>
                        <td className="py-4 text-gray-700">{a.qualification ?? "-"}</td>

                        <td className="py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openDetails(a)}
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <FaEye />
                              View Details
                            </button>

                            {activeStatus === "PENDING" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openDecision("approve", a)}
                                  disabled={actionId === a.id}
                                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white ${
                                    actionId === a.id
                                      ? "cursor-not-allowed bg-green-300"
                                      : "bg-green-600 hover:bg-green-700"
                                  }`}
                                >
                                  <FaCheck />
                                  {actionId === a.id ? "Working..." : "Approve"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openDecision("reject", a)}
                                  disabled={actionId === a.id}
                                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white ${
                                    actionId === a.id
                                      ? "cursor-not-allowed bg-red-300"
                                      : "bg-red-600 hover:bg-red-700"
                                  }`}
                                >
                                  <FaXmark />
                                  {actionId === a.id ? "Working..." : "Reject"}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openDecision("markPending", a)}
                                disabled={actionId === a.id}
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white ${
                                  actionId === a.id
                                    ? "cursor-not-allowed bg-gray-300"
                                    : "bg-gray-700 hover:bg-gray-800"
                                }`}
                              >
                                <FaRotateLeft />
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
                    Note: Approving will promote the user role to <span className="font-semibold">THERAPIST</span>. Approve or Reject also saves your message and sends an email.
                  </p>
                ) : (
                  <p className="mt-4 text-xs text-gray-500">
                    Tip: Use <span className="font-semibold">Mark as Pending</span> if you need to revert a previous decision.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Application Details</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {detailsApp?.fullName || "-"} <span className="text-gray-400">•</span> Status{" "}
                  <span className="font-semibold">{detailsApp?.status || activeStatus}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {detailsLoading ? (
              <div className="mt-5 rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-600">
                Loading details...
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Info icon={<FaFileLines />} label="Application ID" value={detailsApp?.id} />
                  <Info icon={<FaUser />} label="Applicant Username" value={detailsApp?.applicantUsername} />
                  <Info icon={<FaEnvelope />} label="Email" value={detailsApp?.email} />
                  <Info icon={<FaPhone />} label="Phone" value={detailsApp?.phone} />
                  <Info icon={<FaLocationDot />} label="City" value={detailsApp?.city} />
                  <Info icon={<FaBuilding />} label="Workplace" value={detailsApp?.workplace} />
                  <Info icon={<FaGraduationCap />} label="Qualification" value={detailsApp?.qualification} />
                  <Info icon={<FaIdCard />} label="License Number" value={detailsApp?.licenseNumber} />
                  <Info icon={<FaBriefcase />} label="Years Experience" value={detailsApp?.yearsExperience} />
                  <Info icon={<FaUserDoctor />} label="Specialization" value={detailsApp?.specialization} />
                  <Info icon={<FaClock />} label="Submitted" value={fmtDate(detailsApp?.createdAt)} />
                  <Info icon={<FaUser />} label="Reviewed By" value={detailsApp?.reviewedBy} />
                  <Info icon={<FaClock />} label="Reviewed At" value={fmtDate(detailsApp?.reviewedAt)} />
                </div>

                <div className="mt-6 grid gap-5">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Applicant Message</div>
                    <div className="mt-2 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                      {detailsApp?.message ? detailsApp.message : <span className="text-gray-400">—</span>}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-gray-900">Admin Message</div>
                    <div className="mt-2 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                      {detailsApp?.adminMessage ? detailsApp.adminMessage : <span className="text-gray-400">—</span>}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-gray-900">Uploaded Documents</div>
                      <div className="text-xs text-gray-500">{detailsDocs.length} file(s)</div>
                    </div>

                    {detailsDocs.length === 0 ? (
                      <div className="mt-3 rounded-2xl border border-dashed border-gray-200 p-5 text-sm text-gray-600">
                        No documents uploaded.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {detailsDocs.map((d) => {
                          const label = d.title || d.fileName || d.originalName || `Document ${d.id}`;
                          const type = d.fileType || d.contentType || "";
                          const canPreview = isProbablyPdf(type) || isProbablyImage(type);

                          return (
                            <div
                              key={d.id || label}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 p-4"
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
                                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                  >
                                    <FaUpRightFromSquare />
                                    Preview
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => downloadDocument(d)}
                                  className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black"
                                >
                                  <FaDownload />
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
              </>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeDetails}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {decisionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
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
                className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700">
                Message to user (optional)
              </label>
              <textarea
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                rows={5}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="This message will be visible to the user on the site and included in the email."
              />
              <p className="mt-2 text-xs text-gray-500">Keep it short and clear.</p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDecision}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDecision}
                disabled={actionId === decisionApp?.id}
                className={`rounded-xl px-5 py-2 text-sm font-semibold text-white ${
                  decisionType === "approve"
                    ? actionId === decisionApp?.id
                      ? "cursor-not-allowed bg-green-300"
                      : "bg-green-600 hover:bg-green-700"
                    : decisionType === "reject"
                    ? actionId === decisionApp?.id
                      ? "cursor-not-allowed bg-red-300"
                      : "bg-red-600 hover:bg-red-700"
                    : actionId === decisionApp?.id
                    ? "cursor-not-allowed bg-gray-300"
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

function Info({ icon, label, value }) {
  const show = value === 0 ? "0" : value ? String(value) : "—";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-sm text-gray-900">{show}</div>
    </div>
  );
}
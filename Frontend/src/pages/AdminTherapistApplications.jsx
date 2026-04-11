import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import {
  FaUserDoctor,
  FaClock,
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
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import AppModal from "../components/ui/AppModal";

const TABS = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

const MAP_ICON = new L.Icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const TOAST_OPTIONS = {
  style: {
    borderRadius: "14px",
    border: "1px solid #dbe3ef",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 600,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  },
};

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

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function hasMapPoint(app) {
  return toNum(app?.workplaceLatitude) !== null && toNum(app?.workplaceLongitude) !== null;
}

function backendBase() {
  return (import.meta.env.VITE_API_BASE_URL || "http://localhost:8081").replace(/\/api\/?$/, "");
}

function resolveAssetUrl(raw) {
  if (!raw) return "";
  const value = String(raw).trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:")) {
    return value;
  }
  if (value.startsWith("/")) {
    return `${backendBase()}${value}`;
  }
  return `${backendBase()}/${value}`;
}

function toText(value) {
  if (value === 0) return "0";
  if (value === null || value === undefined) return "-";
  const s = String(value).trim();
  return s || "-";
}

async function loadImageDataUrl(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
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
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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
        toast.error("Session expired. Please login again.", TOAST_OPTIONS);
        navigate("/logout", { replace: true });
        return;
      }

      if (code === 403) {
        toast.error("Access denied (Admins only).", TOAST_OPTIONS);
        navigate("/", { replace: true });
        return;
      }

      console.error("LOAD ERROR:", code, err?.response?.data);
      toast.error(getErrorMessage(err), TOAST_OPTIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      toast.error("Please login first.", TOAST_OPTIONS);
      navigate("/login", { replace: true });
      return;
    }

    if (role !== "ADMIN") {
      toast.error("Access denied. Admins only.", TOAST_OPTIONS);
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
      toast.error(getErrorMessage(err), TOAST_OPTIONS);
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
    setDownloadingPdf(false);
  };

  const downloadDocument = async (doc) => {
    const docId = doc?.id;
    if (!docId) return toast.error("Document id missing.", TOAST_OPTIONS);

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
      toast.error(getErrorMessage(err), TOAST_OPTIONS);
    }
  };

  const previewDocument = async (doc) => {
    const docId = doc?.id;
    if (!docId) return toast.error("Document id missing.", TOAST_OPTIONS);

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
      toast.error(getErrorMessage(err), TOAST_OPTIONS);
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

    let toastId;

    try {
      setActionId(decisionApp.id);

      const payload = { adminMessage: adminMessage.trim() || null };
      const actionLabel =
        decisionType === "approve"
          ? "Approving application"
          : decisionType === "reject"
          ? "Rejecting application"
          : "Reverting to pending";

      toastId = toast.loading(`${actionLabel}...`, TOAST_OPTIONS);

      if (decisionType === "approve") {
        await api.put(`/api/admin/therapist-applications/${decisionApp.id}/approve`, payload);
        toast.success("Application approved and role updated.", { id: toastId, ...TOAST_OPTIONS });
      }

      if (decisionType === "reject") {
        await api.put(`/api/admin/therapist-applications/${decisionApp.id}/reject`, payload);
        toast.success("Application rejected.", { id: toastId, ...TOAST_OPTIONS });
      }

      if (decisionType === "markPending") {
        await api.put(`/api/admin/therapist-applications/${decisionApp.id}/mark-pending`, payload);
        toast.success("Moved back to pending and role set to user.", { id: toastId, ...TOAST_OPTIONS });
      }

      closeDecision();
      await refresh();
    } catch (err) {
      const code = err?.response?.status;

      if (code === 401) {
        toast.error("Session expired. Please login again.", { id: toastId, ...TOAST_OPTIONS });
        navigate("/logout", { replace: true });
        return;
      }
      if (code === 403) {
        toast.error("Access denied (Admins only).", { id: toastId, ...TOAST_OPTIONS });
        navigate("/", { replace: true });
        return;
      }

      console.error("DECISION ERROR:", code, err?.response?.data);
      toast.error(getErrorMessage(err), { id: toastId, ...TOAST_OPTIONS });
    } finally {
      setActionId(null);
    }
  };

  const tabLabel = TABS.find((t) => t.key === activeStatus)?.label || activeStatus;

  const detailsApp = details?.application || detailsRow || null;
  const detailsDocs = Array.isArray(details?.documents) ? details.documents : [];
  const locationLat = toNum(detailsApp?.workplaceLatitude);
  const locationLng = toNum(detailsApp?.workplaceLongitude);
  const applicantPhotoUrl = resolveAssetUrl(detailsApp?.applicantProfilePictureUrl);

  const downloadApplicationPdf = async () => {
    if (!detailsApp?.id || downloadingPdf) return;

    try {
      setDownloadingPdf(true);

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;
      const photoWidth = 32;
      const photoHeight = 40;

      let y = margin;

      const ensureSpace = (needed = 10) => {
        if (y + needed > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const drawSectionTitle = (title) => {
        ensureSpace(12);
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentWidth, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(title, margin + 3, y + 5.4);
        y += 11;
      };

      const drawLineItem = (label, value, valueWidth = contentWidth - 42) => {
        ensureSpace(8);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.text(`${label}:`, margin, y);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        const lines = doc.splitTextToSize(toText(value), valueWidth);
        doc.text(lines, margin + 36, y);
        y += Math.max(6, lines.length * 4.6 + 1.4);
      };

      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentWidth, 17, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text("ASD Track & Care", margin + 4, y + 7);
      doc.setFontSize(10);
      doc.text("Therapist Application Form", margin + 4, y + 12.2);
      y += 22;

      const photoX = pageWidth - margin - photoWidth;
      const photoY = y;

      doc.setDrawColor(148, 163, 184);
      doc.rect(photoX, photoY, photoWidth, photoHeight);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Applicant Photo", photoX + 3, photoY - 1.5);

      const profileImageData = await loadImageDataUrl(applicantPhotoUrl);
      if (profileImageData) {
        doc.addImage(profileImageData, "JPEG", photoX + 1, photoY + 1, photoWidth - 2, photoHeight - 2);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("No photo", photoX + 9, photoY + photoHeight / 2);
      }

      drawLineItem("Application ID", detailsApp?.id, contentWidth - 76);
      drawLineItem("Submission Date", fmtDate(detailsApp?.createdAt), contentWidth - 76);
      drawLineItem("Current Status", detailsApp?.status, contentWidth - 76);
      drawLineItem("Applicant Name", detailsApp?.fullName, contentWidth - 76);
      drawLineItem("Applicant Username", detailsApp?.applicantUsername, contentWidth - 76);
      y = Math.max(y + 2, photoY + photoHeight + 6);

      drawSectionTitle("Contact Details");
      drawLineItem("Email", detailsApp?.email);
      drawLineItem("Phone", detailsApp?.phone);
      drawLineItem("City", detailsApp?.city);

      drawSectionTitle("Professional Details");
      drawLineItem("Qualification", detailsApp?.qualification);
      drawLineItem("License Number", detailsApp?.licenseNumber);
      drawLineItem("Years Experience", detailsApp?.yearsExperience);
      drawLineItem("Specialization", detailsApp?.specialization);
      drawLineItem("Workplace", detailsApp?.workplace);
      drawLineItem(
        "Map Coordinates",
        locationLat !== null && locationLng !== null ? `${locationLat}, ${locationLng}` : "-"
      );

      drawSectionTitle("Review Metadata");
      drawLineItem("Reviewed By", detailsApp?.reviewedBy);
      drawLineItem("Reviewed At", fmtDate(detailsApp?.reviewedAt));

      drawSectionTitle("Applicant Message");
      drawLineItem("Message", detailsApp?.message);

      drawSectionTitle("Admin Message");
      drawLineItem("Message", detailsApp?.adminMessage);

      drawSectionTitle("Attached Documents");
      if (detailsDocs.length === 0) {
        drawLineItem("Documents", "No documents attached.");
      } else {
        detailsDocs.forEach((item, index) => {
          drawLineItem(
            `Doc ${index + 1}`,
            `${toText(item?.title || item?.fileName || `Document ${item?.id}`)} (${toText(item?.fileType || "file")})`
          );
        });
      }

      const fileName = `therapist_application_${detailsApp.id}.pdf`;
      doc.save(fileName);
      toast.success("Application PDF downloaded.", TOAST_OPTIONS);
    } catch (err) {
      console.error("PDF GENERATION ERROR:", err);
      toast.error("Could not generate PDF for this application.", TOAST_OPTIONS);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const activeCount = useMemo(() => items.length, [items]);

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
              <StatBadge color={activeStatus === "PENDING" ? "yellow" : activeStatus === "APPROVED" ? "green" : "red"}>
                {activeCount} {tabLabel} Application{activeCount === 1 ? "" : "s"}
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

              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700">
                Changes save instantly and notify applicants by email.
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
                                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold transition ${
                                  actionId === a.id
                                    ? "cursor-not-allowed border-amber-200 bg-amber-100 text-amber-400"
                                    : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                }`}
                              >
                                <FaRotateLeft />
                                {actionId === a.id ? "Working..." : "Re-open as Pending"}
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

      <AppModal
        open={detailsOpen}
        onClose={closeDetails}
        title="Application Details"
        subtitle={`${detailsApp?.fullName || "-"} • Status ${detailsApp?.status || activeStatus}`}
        size="xl"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={closeDetails}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={downloadApplicationPdf}
            disabled={detailsLoading || downloadingPdf || !detailsApp?.id}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-white ${
              detailsLoading || downloadingPdf || !detailsApp?.id
                ? "cursor-not-allowed bg-blue-300"
                : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
            }`}
          >
            <FaDownload />
            {downloadingPdf ? "Preparing PDF..." : "Download PDF"}
          </button>
        </div>

        {detailsLoading ? (
          <div className="rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-600">
            Loading details...
          </div>
        ) : (
          <>
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    ASD Track & Care
                  </p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">Therapist Application Form</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Formal summary sheet for review and record-keeping
                  </p>
                </div>

                <div className="h-24 w-20 overflow-hidden rounded-xl border border-slate-300 bg-slate-100">
                  {applicantPhotoUrl ? (
                    <img
                      src={applicantPhotoUrl}
                      alt="Applicant profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      No Photo
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                <p><span className="font-semibold text-slate-900">Application ID:</span> {toText(detailsApp?.id)}</p>
                <p><span className="font-semibold text-slate-900">Status:</span> {toText(detailsApp?.status)}</p>
                <p><span className="font-semibold text-slate-900">Applicant:</span> {toText(detailsApp?.fullName)}</p>
                <p><span className="font-semibold text-slate-900">Username:</span> {toText(detailsApp?.applicantUsername)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
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

            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">Workplace Location</div>
              <div className="mt-2 text-xs text-gray-500">
                Latitude: {locationLat ?? "—"} • Longitude: {locationLng ?? "—"}
              </div>

              {hasMapPoint(detailsApp) ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200">
                  <MapContainer
                    center={[locationLat, locationLng]}
                    zoom={14}
                    scrollWheelZoom={false}
                    className="h-56 w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[locationLat, locationLng]} icon={MAP_ICON}>
                      <Popup>
                        {detailsApp?.workplace || "Workplace"}
                        {detailsApp?.city ? ` (${detailsApp.city})` : ""}
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  No map coordinates were submitted for this application.
                </div>
              )}
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
      </AppModal>

      <AppModal
        open={decisionOpen}
        onClose={closeDecision}
        title={
          decisionType === "approve"
            ? "Approve Application"
            : decisionType === "reject"
            ? "Reject Application"
            : "Mark as Pending"
        }
        subtitle={`Applicant: ${decisionApp?.fullName || "-"} (${decisionApp?.id || "-"})`}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDecision}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
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
                  ? "cursor-not-allowed bg-amber-300"
                  : "bg-amber-600 hover:bg-amber-700"
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
        }
      >
        <div>
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
      </AppModal>
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
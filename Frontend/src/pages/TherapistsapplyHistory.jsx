import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ClipboardList,
  Eye,
  FileText,
  PlusCircle,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import AppModal from "../components/ui/AppModal";

function getErrorMessage(err) {
  const data = err?.response?.data;

  if (!data) return "Something went wrong.";
  if (typeof data === "string") return data;

  if (typeof data === "object") {
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.title) return data.title;

    if (data.status && data.path) return `${data.error || "Request failed"} (${data.status})`;

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

function getStatusStyle(status) {
  const s = String(status || "").toUpperCase();

  if (s === "APPROVED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (s === "REJECTED") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (s === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

const cardBase =
  "rounded-3xl border border-white/60 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur";

export default function TherapistApply() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [detailsRow, setDetailsRow] = useState(null);

  const latestApp = apps?.length ? apps[0] : null;
  const latestStatus = (latestApp?.status || "").toUpperCase();

  const canSubmitNew = !latestApp || latestStatus === "REJECTED";

  const submitDisabledReason = !latestApp
    ? ""
    : latestStatus === "REJECTED"
      ? ""
      : `Submit disabled because your latest application is ${latestStatus}.`;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first.");
      navigate("/login", { replace: true });
      return;
    }

    const controller = new AbortController();

    async function loadMyApps() {
      try {
        setLoading(true);

        const res = await api.get("/api/therapist-applications/my", {
          signal: controller.signal,
        });

        const data = res.data;

        if (Array.isArray(data)) {
          setApps(data);
        } else if (data?.id) {
          setApps([data]);
        } else if (data?.application?.id) {
          setApps([data.application]);
        } else {
          setApps([]);
        }
      } catch (err) {
        if (err?.name === "CanceledError") return;

        const code = err?.response?.status;

        if (code === 401) {
          toast.error("Session expired. Please login again.");
          navigate("/logout", { replace: true });
          return;
        }

        console.error("LOAD MY APPS ERROR:", code, err?.response?.data);
        toast.error(getErrorMessage(err));
        setApps([]);
      } finally {
        setLoading(false);
      }
    }

    loadMyApps();
    return () => controller.abort();
  }, [navigate]);

  const openDetails = async (row) => {
    setDetailsRow(row);
    setDetails(null);
    setDetailsOpen(true);

    try {
      setDetailsLoading(true);

      const res = await api.get(`/api/therapist-applications/my/${row.id}`);
      const data = res.data;

      if (data?.application) setDetails(data);
      else if (data?.id) setDetails({ application: data, documents: data.documents || [] });
      else setDetails({ application: row, documents: [] });
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

  const detailsApp = details?.application || detailsRow || null;
  const detailsDocs = Array.isArray(details?.documents) ? details.documents : [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_35%),linear-gradient(to_bottom,_#f8fbff,_#f8fafc_35%,_#ffffff)]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className={`${cardBase} overflow-hidden`}>
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-8 text-white md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
                  Therapist application
                </p>
                <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
                  <UserCheck size={30} />
                  Become a Therapist
                </h1>
                <p className="mt-3 text-sm leading-6 text-blue-50 md:text-base">
                  Track your previous applications and submit a new one when you are eligible.
                </p>

                {!canSubmitNew && (
                  <div className="mt-4 inline-flex rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/95 backdrop-blur">
                    {submitDisabledReason}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/therapist/apply/new")}
                  disabled={!canSubmitNew}
                  title={!canSubmitNew ? submitDisabledReason : ""}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
                    canSubmitNew
                      ? "bg-white text-slate-900 hover:bg-blue-50"
                      : "cursor-not-allowed bg-white/30 text-white/70"
                  }`}
                >
                  <PlusCircle size={16} />
                  Submit New Application
                </button>

                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-slate-100 bg-white px-6 py-5 md:grid-cols-3 md:px-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total applications
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{apps.length}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Latest status
              </div>
              <div className="mt-2">
                {latestApp ? (
                  <span
                    className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold ${getStatusStyle(
                      latestApp.status
                    )}`}
                  >
                    {latestApp.status}
                  </span>
                ) : (
                  <span className="text-lg font-bold text-slate-900">No applications</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Submit eligibility
              </div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {canSubmitNew ? "Eligible" : "Not eligible"}
              </div>
            </div>
          </div>
        </div>

        <div className={`${cardBase} mt-6 p-6 md:p-7`}>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <ClipboardList size={20} className="text-blue-600" />
                My old applications
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Review your previous therapist applications and open details for each submission.
              </p>
            </div>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {apps.length} total
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Loading your applications...
            </div>
          ) : apps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <FileText size={24} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                No applications yet
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                You have not submitted any therapist applications yet.
              </p>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => navigate("/therapist/apply/new")}
                  disabled={!canSubmitNew}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
                    canSubmitNew
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-0.5 hover:shadow-md"
                      : "cursor-not-allowed bg-blue-300"
                  }`}
                >
                  <PlusCircle size={16} />
                  Submit New Application
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[900px] border-collapse bg-white">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Submitted Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Reviewed Time
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {apps.map((a) => (
                      <tr
                        key={a.id}
                        onClick={() => openDetails(a)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openDetails(a);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        className="cursor-pointer border-b border-slate-100 last:border-b-0 transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                          {a.id ?? "-"}
                        </td>

                        <td className="px-4 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusStyle(
                              a.status
                            )}`}
                          >
                            {a.status ?? "-"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {fmtDate(a.createdAt)}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {fmtDate(a.reviewedAt)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(a);
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eye size={14} />
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <span className="font-semibold">Note:</span> You can only submit a new application if your latest application is{" "}
                <span className="font-semibold">REJECTED</span>, or if you have not submitted one yet.
              </div>
            </>
          )}
        </div>
      </main>

      <AppModal
        open={detailsOpen}
        onClose={closeDetails}
        title="Application Details"
        subtitle={`ID: ${detailsApp?.id ?? "-"} • Status: ${detailsApp?.status ?? "-"}`}
        badge="Therapist Application"
        icon={<ShieldCheck size={18} />}
        size="2xl"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={closeDetails}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        }
      >
        {detailsLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Loading details...
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Info label="Full Name" value={detailsApp?.fullName} />
              <Info label="Qualification" value={detailsApp?.qualification} />
              <Info label="Specialization" value={detailsApp?.specialization} />
              <Info label="Years Experience" value={detailsApp?.yearsExperience} />
              <Info label="License Number" value={detailsApp?.licenseNumber} />
              <Info label="City" value={detailsApp?.city} />
              <Info label="Workplace" value={detailsApp?.workplace} />
              <Info label="Submitted" value={fmtDate(detailsApp?.createdAt)} />
              <Info label="Reviewed At" value={fmtDate(detailsApp?.reviewedAt)} />
              <Info label="Reviewed By" value={detailsApp?.reviewedBy} />
            </div>

            <div className="grid gap-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Your Message</div>
                <div className="mt-2 text-sm leading-6 text-slate-700">
                  {detailsApp?.message ? detailsApp.message : <span className="text-slate-400">—</span>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Admin Message</div>
                <div className="mt-2 text-sm leading-6 text-slate-700">
                  {detailsApp?.adminMessage ? detailsApp.adminMessage : <span className="text-slate-400">—</span>}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">Uploaded Documents</div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    {detailsDocs.length} file(s)
                  </div>
                </div>

                {detailsDocs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No documents uploaded.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailsDocs.map((d) => (
                      <div
                        key={d.id || d.title}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {d.title || d.fileName || `Document ${d.id}`}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {d.fileType || d.contentType || "file"}
                            {d.uploadedAt ? ` • ${fmtDate(d.uploadedAt)}` : ""}
                          </div>
                        </div>

                        <FileText size={16} className="shrink-0 text-slate-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AppModal>
    </div>
  );
}

function Info({ label, value }) {
  const show = value === 0 ? "0" : value ? String(value) : "—";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-900">{show}</div>
    </div>
  );
}
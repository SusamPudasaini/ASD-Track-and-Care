import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

// ✅ Always convert backend errors to a string (prevents React object render crash)
function getErrorMessage(err) {
  const data = err?.response?.data;

  if (!data) return "Something went wrong.";
  if (typeof data === "string") return data;

  if (typeof data === "object") {
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.title) return data.title;

    // Spring default error keys: timestamp/status/error/path
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

export default function TherapistApply() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);

  // Details modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState(null); // { application, documents } OR application object
  const [detailsRow, setDetailsRow] = useState(null);

  // ✅ Load user's application history
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
          // fallback: backend returned single latest application
          setApps([data]);
        } else if (data?.application?.id) {
          // fallback: backend returned wrapper
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

  // ✅ View application details (expects: { application, documents } or application)
  const openDetails = async (row) => {
    setDetailsRow(row);
    setDetails(null);
    setDetailsOpen(true);

    try {
      setDetailsLoading(true);

      // ✅ Recommended endpoint for user:
      // GET /api/therapist-applications/{id} -> { application: {...}, documents: [...] }
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
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="rounded-md border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Become a Therapist</h1>
              <p className="mt-2 text-sm text-gray-600">
                Track your previous applications and submit a new one when you’re ready.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate("/therapist/apply/new")}
                className="rounded bg-[#4a6cf7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
              >
                Submit New Application
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
        </div>

        {/* My old applications table */}
        <div className="mt-6 rounded-md border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">My old applications</h2>
            <span className="text-xs text-gray-500">{apps.length} total</span>
          </div>

          {loading ? (
            <div className="text-sm text-gray-600">Loading your applications...</div>
          ) : apps.length === 0 ? (
            <div className="text-sm text-gray-600">
              You haven’t submitted any therapist applications yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">ID</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Submitted Time</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Reviewed Time</th>
                    <th className="py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {apps.map((a) => (
                    <tr key={a.id} className="border-b last:border-b-0">
                      <td className="py-3 text-sm text-gray-900">{a.id ?? "-"}</td>
                      <td className="py-3 text-sm text-gray-900">{a.status ?? "-"}</td>
                      <td className="py-3 text-sm text-gray-700">{fmtDate(a.createdAt)}</td>
                      <td className="py-3 text-sm text-gray-700">{fmtDate(a.reviewedAt)}</td>

                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openDetails(a)}
                          className="rounded border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          View Application Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-4 text-xs text-gray-500">
                Tip: If your latest application is <span className="font-semibold">PENDING</span>, you can still submit a new
                one if you want to update your documents (your admins will review the newest).
              </p>
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
                  ID: <span className="font-semibold">{detailsApp?.id ?? "-"}</span>{" "}
                  <span className="text-gray-400">•</span>{" "}
                  Status: <span className="font-semibold">{detailsApp?.status ?? "-"}</span>
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

                <div className="md:col-span-2">
                  <div className="text-sm font-semibold text-gray-900">Your Message</div>
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
                      {detailsDocs.map((d) => (
                        <div
                          key={d.id || d.title}
                          className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-900">
                              {d.title || d.fileName || `Document ${d.id}`}
                            </div>
                            <div className="truncate text-xs text-gray-500">
                              {d.fileType || d.contentType || "file"}
                              {d.uploadedAt ? ` • ${fmtDate(d.uploadedAt)}` : ""}
                            </div>
                          </div>

                          {/* For user-side, you can add download/preview later if you have an endpoint */}
                          <span className="shrink-0 text-xs text-gray-400"></span>
                        </div>
                      ))}
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

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

const TABS = [
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "CANCELLED", label: "Cancelled" },
];

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

function fmtDateOnly(dateStr) {
  try {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString();
  } catch {
    return String(dateStr || "-");
  }
}

function fmtTime(timeStr) {
  if (!timeStr) return "-";
  return String(timeStr);
}

function toTitle(s = "") {
  return String(s || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusPill(status) {
  const s = String(status || "").toUpperCase();

  if (s === "PENDING") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "CONFIRMED") return "bg-green-50 text-green-700 border-green-200";
  if (s === "CANCELLED") return "bg-red-50 text-red-700 border-red-200";

  return "bg-gray-50 text-gray-700 border-gray-200";
}

export default function TherapistDashboardBookings() {
  const navigate = useNavigate();

  const [activeStatus, setActiveStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [actionId, setActionId] = useState(null);

  // Details modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState(null);

  const tabLabel = useMemo(
    () => TABS.find((t) => t.key === activeStatus)?.label || activeStatus,
    [activeStatus]
  );

  const loadAllForTherapist = async (signal) => {
    try {
      setLoading(true);

      // GET /api/bookings/therapist/me
      const res = await api.get("/api/bookings/therapist/me", { signal });

      const arr = Array.isArray(res.data) ? res.data : [];

      // Filter client-side by tab status
      const filtered = arr.filter((b) => String(b?.status || "").toUpperCase() === activeStatus);
      setItems(filtered);
    } catch (err) {
      if (err?.name === "CanceledError") return;

      const code = err?.response?.status;

      if (code === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/logout", { replace: true });
        return;
      }

      if (code === 403) {
        toast.error("Access denied (Therapists only).");
        navigate("/", { replace: true });
        return;
      }

      console.error("LOAD ERROR:", code, err?.response?.data);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    const controller = new AbortController();
    await loadAllForTherapist(controller.signal);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      toast.error("Please login first.");
      navigate("/login", { replace: true });
      return;
    }

    if (role !== "THERAPIST") {
      toast.error("Access denied. Therapists only.");
      navigate("/", { replace: true });
      return;
    }

    const controller = new AbortController();
    loadAllForTherapist(controller.signal);

    return () => controller.abort();
  }, [activeStatus, navigate]);

  // ---------------- Details ----------------
  const openDetails = (row) => {
    setDetailsRow(row);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsRow(null);
  };

  // ---------------- Actions ----------------
  const approveBooking = async (booking) => {
    if (!booking?.id) return;

    try {
      setActionId(booking.id);
      await api.put(`/api/bookings/${booking.id}/approve`);
      toast.success("Booking approved.");
      await refresh();

      // if modal is open, close it (optional)
      if (detailsOpen) closeDetails();
    } catch (err) {
      const code = err?.response?.status;

      if (code === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/logout", { replace: true });
        return;
      }
      if (code === 403) {
        toast.error("Access denied (Therapists only).");
        navigate("/", { replace: true });
        return;
      }

      console.error("APPROVE ERROR:", code, err?.response?.data);
      toast.error(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const declineBooking = async (booking) => {
    if (!booking?.id) return;

    try {
      setActionId(booking.id);
      await api.put(`/api/bookings/${booking.id}/decline`);
      toast.success("Booking cancelled.");
      await refresh();

      if (detailsOpen) closeDetails();
    } catch (err) {
      const code = err?.response?.status;

      if (code === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/logout", { replace: true });
        return;
      }
      if (code === 403) {
        toast.error("Access denied (Therapists only).");
        navigate("/", { replace: true });
        return;
      }

      console.error("DECLINE ERROR:", code, err?.response?.data);
      toast.error(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  // ✅ NEW: Mark as Pending (for confirmed/cancelled mistakes)
  // Requires backend endpoint: PUT /api/bookings/{id}/mark-pending
  const markPending = async (booking) => {
    if (!booking?.id) return;

    try {
      setActionId(booking.id);
      await api.put(`/api/bookings/${booking.id}/mark-pending`);
      toast.success("Marked as pending.");
      await refresh();

      if (detailsOpen) closeDetails();
    } catch (err) {
      const code = err?.response?.status;

      if (code === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/logout", { replace: true });
        return;
      }
      if (code === 403) {
        toast.error("Access denied (Therapists only).");
        navigate("/", { replace: true });
        return;
      }

      console.error("MARK PENDING ERROR:", code, err?.response?.data);
      toast.error(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  // current modal data
  const d = detailsRow;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="rounded-md border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Therapist — Booking Requests</h1>
              <p className="mt-2 text-sm text-gray-600">
                Review booking requests. Approve pending requests to confirm sessions, or cancel requests if needed.
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
            <div className="text-sm text-gray-600">Loading {tabLabel.toLowerCase()} bookings...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-gray-600">No {tabLabel.toLowerCase()} bookings.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">ID</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Client</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Date</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Time</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                    <th className="py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((b) => {
                    const status = String(b?.status || "").toUpperCase();
                    const clientName = b?.userName || `User #${b?.userId ?? "-"}`;

                    return (
                      <tr key={b.id} className="border-b last:border-b-0">
                        <td className="py-3 text-sm text-gray-900">{b.id ?? "-"}</td>

                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            {b?.userProfilePictureUrl ? (
                              <img
                                src={b.userProfilePictureUrl}
                                alt={clientName}
                                className="h-9 w-9 rounded-full border border-gray-200 object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-bold text-gray-600">
                                {String(clientName || "U")
                                  .trim()
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-gray-900">{clientName}</div>
                              <div className="truncate text-xs text-gray-500">
                                {b?.userEmail || "-"} {b?.userPhone ? `• ${b.userPhone}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 text-sm text-gray-700">{fmtDateOnly(b.date)}</td>
                        <td className="py-3 text-sm text-gray-700">{fmtTime(b.time)}</td>

                        <td className="py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusPill(
                              status
                            )}`}
                          >
                            {toTitle(status)}
                          </span>
                        </td>

                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openDetails(b)}
                              className="rounded border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              View Details
                            </button>

                            {status === "PENDING" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => approveBooking(b)}
                                  disabled={actionId === b.id}
                                  className={`rounded px-3 py-2 text-xs font-semibold text-white ${
                                    actionId === b.id ? "bg-green-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                                  }`}
                                >
                                  {actionId === b.id ? "Working..." : "Approve"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => declineBooking(b)}
                                  disabled={actionId === b.id}
                                  className={`rounded px-3 py-2 text-xs font-semibold text-white ${
                                    actionId === b.id ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                                  }`}
                                >
                                  {actionId === b.id ? "Working..." : "Cancel"}
                                </button>
                              </>
                            ) : status === "CONFIRMED" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => declineBooking(b)}
                                  disabled={actionId === b.id}
                                  className={`rounded px-3 py-2 text-xs font-semibold text-white ${
                                    actionId === b.id ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                                  }`}
                                >
                                  {actionId === b.id ? "Working..." : "Cancel"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => markPending(b)}
                                  disabled={actionId === b.id}
                                  className={`rounded px-3 py-2 text-xs font-semibold text-white ${
                                    actionId === b.id ? "bg-gray-300 cursor-not-allowed" : "bg-gray-700 hover:bg-gray-800"
                                  }`}
                                >
                                  {actionId === b.id ? "Working..." : "Mark Pending"}
                                </button>
                              </>
                            ) : status === "CANCELLED" ? (
                              <button
                                type="button"
                                onClick={() => markPending(b)}
                                disabled={actionId === b.id}
                                className={`rounded px-3 py-2 text-xs font-semibold text-white ${
                                  actionId === b.id ? "bg-gray-300 cursor-not-allowed" : "bg-gray-700 hover:bg-gray-800"
                                }`}
                              >
                                {actionId === b.id ? "Working..." : "Mark Pending"}
                              </button>
                            ) : (
                              <span className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                                No actions
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {activeStatus === "PENDING" ? (
                <p className="mt-4 text-xs text-gray-500">
                  Tip: Approving will confirm the session. Cancelling will move it to{" "}
                  <span className="font-semibold">Cancelled</span>.
                </p>
              ) : (
                <p className="mt-4 text-xs text-gray-500">
                  Tip: If an action was done by mistake, use <span className="font-semibold">Mark Pending</span> to revert.
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
                <h2 className="text-base font-semibold text-gray-900">Booking Details</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Client: <span className="font-semibold">{d?.userName || `User #${d?.userId ?? "-"}`}</span>{" "}
                  <span className="text-gray-400">•</span> Status:{" "}
                  <span className="font-semibold">{toTitle(d?.status || "")}</span>
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

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Info label="Booking ID" value={d?.id} />
              <Info label="Status" value={toTitle(d?.status)} />
              <Info label="Date" value={fmtDateOnly(d?.date)} />
              <Info label="Time" value={fmtTime(d?.time)} />

              <div className="md:col-span-2">
                <div className="text-sm font-semibold text-gray-900">Client Info</div>
                <div className="mt-2 grid gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 md:grid-cols-2">
                  <Info label="Name" value={d?.userName} />
                  <Info label="User ID" value={d?.userId} />
                  <Info label="Email" value={d?.userEmail} />
                  <Info label="Phone" value={d?.userPhone} />
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="text-sm font-semibold text-gray-900">Therapist Info</div>
                <div className="mt-2 grid gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 md:grid-cols-2">
                  <Info label="Name" value={d?.therapistName} />
                  <Info label="Therapist ID" value={d?.therapistId} />
                  <Info label="Email" value={d?.therapistEmail} />
                  <Info label="Phone" value={d?.therapistPhone} />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              {String(d?.status || "").toUpperCase() === "PENDING" ? (
                <>
                  <button
                    type="button"
                    onClick={() => approveBooking(d)}
                    disabled={actionId === d?.id}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                      actionId === d?.id ? "bg-green-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {actionId === d?.id ? "Working..." : "Approve"}
                  </button>

                  <button
                    type="button"
                    onClick={() => declineBooking(d)}
                    disabled={actionId === d?.id}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                      actionId === d?.id ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {actionId === d?.id ? "Working..." : "Cancel"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => markPending(d)}
                    disabled={actionId === d?.id}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                      actionId === d?.id ? "bg-gray-300 cursor-not-allowed" : "bg-gray-700 hover:bg-gray-800"
                    }`}
                  >
                    {actionId === d?.id ? "Working..." : "Mark Pending"}
                  </button>

                  {String(d?.status || "").toUpperCase() === "CONFIRMED" ? (
                    <button
                      type="button"
                      onClick={() => declineBooking(d)}
                      disabled={actionId === d?.id}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                        actionId === d?.id ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {actionId === d?.id ? "Working..." : "Cancel"}
                    </button>
                  ) : null}
                </>
              )}

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

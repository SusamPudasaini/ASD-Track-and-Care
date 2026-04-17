import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import AppModal from "../components/ui/AppModal";
import {
  FaArrowTrendUp,
  FaArrowsRotate,
  FaArrowLeft,
  FaCircleInfo,
  FaListCheck,
  FaUser,
  FaSliders,
  FaStar,
} from "react-icons/fa6";

const THERAPIST_UPDATE_ENDPOINT = "/api/users/me/therapist-settings";

const TABS = [
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "CANCELLED", label: "Cancelled" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function buildTimeSlots() {
  const slots = [];
  for (let h = 9; h <= 18; h++) {
    for (const m of [0, 30]) {
      if (h === 18 && m !== 0) continue;
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

const TIME_SLOTS = buildTimeSlots();

function isValidSlotTime(time) {
  try {
    const [hh, mm] = String(time).split(":");
    const h = Number(hh);
    const m = Number(mm);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
    if (!(m === 0 || m === 30)) return false;
    if (h < 9 || h > 18) return false;
    if (h === 18 && m !== 0) return false;
    return true;
  } catch {
    return false;
  }
}

function normalizeAvailability(inMap) {
  if (!inMap || typeof inMap !== "object") return {};
  const out = {};
  for (const [day, times] of Object.entries(inMap)) {
    if (!day || !Array.isArray(times)) continue;
    const clean = times
      .filter((t) => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean)
      .filter(isValidSlotTime)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();
    if (clean.length) out[day] = clean;
  }
  return out;
}

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

function isPaymentCompleted(paymentStatus) {
  return String(paymentStatus || "").trim().toUpperCase() === "COMPLETED";
}

const UNPAID_BOOKING_APPROVAL_MESSAGE = "Payment hasn't been made for the booking request.";

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

function riskPill(level) {
  const s = String(level || "").toUpperCase();
  if (s === "HIGH") return "bg-red-50 text-red-700 border-red-200";
  if (s === "MODERATE") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "LOW") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
}

function pct(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${n.toFixed(1)}%`;
}

export default function TherapistDashboardBookings() {
  const navigate = useNavigate();

  const [activeStatus, setActiveStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [allBookings, setAllBookings] = useState([]);
  const [actionId, setActionId] = useState(null);
  const [reviewInsights, setReviewInsights] = useState(null);
  const [therapistSaving, setTherapistSaving] = useState(false);

  const [therapistForm, setTherapistForm] = useState({
    pricePerSession: "",
    qualification: "",
    experienceYears: "",
    bio: "",
    availability: {},
  });
  const [selectedDay, setSelectedDay] = useState("Sunday");
  const [slotsModalOpen, setSlotsModalOpen] = useState(false);

  // Details modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState(null);

  // ✅ Cancel reason modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const tabLabel = useMemo(
    () => TABS.find((t) => t.key === activeStatus)?.label || activeStatus,
    [activeStatus]
  );

  const items = useMemo(
    () => allBookings.filter((b) => String(b?.status || "").toUpperCase() === activeStatus),
    [allBookings, activeStatus]
  );

  const bookingStats = useMemo(() => {
    const totals = { PENDING: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0 };
    for (const b of allBookings) {
      const s = String(b?.status || "").toUpperCase();
      if (Object.prototype.hasOwnProperty.call(totals, s)) totals[s] += 1;
    }
    const sessionsTaken = totals.COMPLETED + totals.CONFIRMED;
    return {
      total: allBookings.length,
      pending: totals.PENDING,
      approved: totals.CONFIRMED,
      disapproved: totals.CANCELLED,
      completed: totals.COMPLETED,
      sessionsTaken,
    };
  }, [allBookings]);

  const daySelectedCount = useMemo(() => {
    const a = therapistForm.availability || {};
    return Object.keys(a).filter((d) => (a[d] || []).length > 0).length;
  }, [therapistForm.availability]);

  const totalSlotsSelected = useMemo(() => {
    const a = therapistForm.availability || {};
    return Object.values(a).reduce((acc, arr) => acc + (arr?.length || 0), 0);
  }, [therapistForm.availability]);

  const selectedTimesForDay = useMemo(
    () => therapistForm.availability?.[selectedDay] || [],
    [therapistForm.availability, selectedDay]
  );

  const activeDays = useMemo(() => {
    const a = therapistForm.availability || {};
    return DAYS.filter((d) => (a[d] || []).length > 0);
  }, [therapistForm.availability]);

  const loadAllForTherapist = async (signal) => {
    try {
      setLoading(true);

      // GET /api/bookings/therapist/me
      const res = await api.get("/api/bookings/therapist/me", { signal });
      const arr = Array.isArray(res.data) ? res.data : [];
      setAllBookings(arr);
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
    await loadReviewInsights(controller.signal);
    await loadTherapistSettings(controller.signal);
  };

  const loadReviewInsights = async (signal) => {
    try {
      const res = await api.get("/api/therapists/me/reviews", { signal });
      setReviewInsights(res.data || null);
    } catch (err) {
      if (err?.name === "CanceledError") return;
      console.error("REVIEW INSIGHTS ERROR:", err?.response?.status, err?.response?.data);
    }
  };

  const loadTherapistSettings = async (signal) => {
    try {
      const res = await api.get("/api/users/me", { signal });
      const u = res.data || {};
      const avail = normalizeAvailability(u.availability);

      setTherapistForm({
        pricePerSession:
          u.pricePerSession === null || u.pricePerSession === undefined
            ? ""
            : String(u.pricePerSession),
        qualification: u.qualification || "",
        experienceYears:
          u.experienceYears === null || u.experienceYears === undefined
            ? ""
            : String(u.experienceYears),
        bio: u.bio || u.about || u.description || "",
        availability: avail,
      });

      const firstDayWithSlots = DAYS.find((d) => (avail?.[d] || []).length > 0);
      setSelectedDay(firstDayWithSlots || "Sunday");
    } catch (err) {
      if (err?.name === "CanceledError") return;
      console.error("THERAPIST SETTINGS LOAD ERROR:", err?.response?.status, err?.response?.data);
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

    if (role !== "THERAPIST") {
      toast.error("Access denied. Therapists only.");
      navigate("/", { replace: true });
      return;
    }

    const controller = new AbortController();
    loadAllForTherapist(controller.signal);
    loadReviewInsights(controller.signal);
    loadTherapistSettings(controller.signal);

    return () => controller.abort();
  }, [navigate]);

  const toggleSlot = (day, time) => {
    setTherapistForm((p) => {
      const next = { ...(p.availability || {}) };
      const set = new Set(next[day] || []);
      if (set.has(time)) set.delete(time);
      else set.add(time);
      const arr = Array.from(set).sort();
      if (arr.length) next[day] = arr;
      else delete next[day];
      return { ...p, availability: next };
    });
  };

  const clearDay = (day) => {
    setTherapistForm((p) => {
      const next = { ...(p.availability || {}) };
      delete next[day];
      return { ...p, availability: next };
    });
  };

  const selectDayAll = (day) => {
    setTherapistForm((p) => {
      const next = { ...(p.availability || {}) };
      next[day] = [...TIME_SLOTS];
      return { ...p, availability: next };
    });
  };

  const saveTherapistProfile = async () => {
    if (therapistSaving) return;

    const price = therapistForm.pricePerSession?.toString().trim();
    if (!price) return toast.error("Price per session is required.");

    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) return toast.error("Enter a valid price.");

    const qualification = therapistForm.qualification?.toString().trim() || "";
    if (qualification.length < 2) return toast.error("Please add your qualification.");

    const bio = therapistForm.bio?.toString().trim() || "";
    if (bio && bio.length < 10) {
      return toast.error("Bio should be at least 10 characters or left empty.");
    }

    const experienceYearsStr = therapistForm.experienceYears?.toString().trim() || "";
    const experienceYearsNum = experienceYearsStr === "" ? 0 : Number(experienceYearsStr);
    if (Number.isNaN(experienceYearsNum) || experienceYearsNum < 0) {
      return toast.error("Experience years must be 0 or more.");
    }

    try {
      setTherapistSaving(true);
      const payload = {
        pricePerSession: priceNum,
        qualification,
        experienceYears: experienceYearsNum,
        bio,
        availability: therapistForm.availability || {},
      };

      let res;
      try {
        res = await api.put(THERAPIST_UPDATE_ENDPOINT, payload);
      } catch (err) {
        const text = String(err?.response?.data?.message || err?.response?.data || "").toLowerCase();
        const unknownBio =
          err?.response?.status === 400 &&
          text.includes("bio") &&
          (text.includes("unrecognized") || text.includes("unknown") || text.includes("not allow"));

        if (!unknownBio) throw err;

        // Backward-compatible retry for servers that don't yet accept the bio field.
        const { bio: _omit, ...legacyPayload } = payload;
        res = await api.put(THERAPIST_UPDATE_ENDPOINT, legacyPayload);
        toast("Bio field is not supported by this server yet.", { icon: "i" });
      }

      const updated = res?.data || {};
      const avail = normalizeAvailability(updated.availability);
      setTherapistForm({
        pricePerSession:
          updated.pricePerSession === null || updated.pricePerSession === undefined
            ? ""
            : String(updated.pricePerSession),
        qualification: updated.qualification || "",
        experienceYears:
          updated.experienceYears === null || updated.experienceYears === undefined
            ? ""
            : String(updated.experienceYears),
        bio: updated.bio || updated.about || updated.description || bio,
        availability: avail,
      });

      toast.success("Therapist settings updated.");
    } catch (err) {
      console.error("UPDATE THERAPIST ERROR:", err?.response?.status, err?.response?.data);
      toast.error(getErrorMessage(err));
    } finally {
      setTherapistSaving(false);
    }
  };

  // ---------------- Details ----------------
  const openDetails = (row) => {
    setDetailsRow(row);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsRow(null);
  };

  // ---------------- Cancel Modal ----------------
  const openCancel = (booking) => {
    setCancelBooking(booking);
    setCancelReason("");
    setCancelOpen(true);
  };

  const closeCancel = () => {
    setCancelOpen(false);
    setCancelBooking(null);
    setCancelReason("");
  };

  // ---------------- Actions ----------------
  const approveBooking = async (booking) => {
    if (!booking?.id) return;

    if (!isPaymentCompleted(booking?.paymentStatus)) {
      toast.error(UNPAID_BOOKING_APPROVAL_MESSAGE);
      return;
    }

    try {
      setActionId(booking.id);
      await api.put(`/api/bookings/${booking.id}/approve`);
      toast.success("Booking approved.");
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

      const backendMessage = getErrorMessage(err);
      const normalizedBackendMessage = String(backendMessage || "").toLowerCase();
      if (
        normalizedBackendMessage.includes("payment is not completed") ||
        normalizedBackendMessage.includes("payment hasnt been made") ||
        normalizedBackendMessage.includes("payment hasn't been made") ||
        (code === 500 && !isPaymentCompleted(booking?.paymentStatus))
      ) {
        toast.error(UNPAID_BOOKING_APPROVAL_MESSAGE);
        return;
      }

      console.error("APPROVE ERROR:", code, err?.response?.data);
      toast.error(backendMessage);
    } finally {
      setActionId(null);
    }
  };

  // ✅ Confirm cancel (send reason)
  const confirmCancel = async () => {
    if (!cancelBooking?.id) return;

    try {
      setActionId(cancelBooking.id);

      await api.put(`/api/bookings/${cancelBooking.id}/decline`, {
        message: cancelReason.trim() || null,
      });

      toast.success("Booking cancelled.");
      closeCancel();
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
      console.error("CANCEL ERROR:", code, err?.response?.data);
      toast.error(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  // ✅ Mark as Pending (for confirmed/cancelled mistakes)
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
  const weaknessAreas = Array.isArray(d?.weaknessCategories)
    ? d.weaknessCategories.filter((x) => typeof x === "string" && x.trim())
    : [];
  const riskLevel = String(d?.riskLevel || "").toUpperCase();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(to_bottom,_#f8fbff,_#f8fafc_30%,_#ffffff)]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FaArrowTrendUp className="text-[#4a6cf7]" />
                <h1 className="text-2xl font-semibold text-gray-900">Therapist Analytics Dashboard</h1>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Review booking requests. Approve pending requests to confirm sessions, cancel with a reason, or revert using Mark Pending.
              </p>
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

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Therapy Sessions"
              value={bookingStats.sessionsTaken}
              subtitle={`From ${bookingStats.total} total requests`}
              tone="purple"
              tag="TS"
            />
            <MetricCard
              label="Average Rating"
              value={`${Number(reviewInsights?.averageReview || 0).toFixed(1)} / 5`}
              subtitle="Current score"
              tone="amber"
              tag="AR"
            />
            <MetricCard
              label="Total Reviews"
              value={reviewInsights?.reviewCount || 0}
              subtitle="Parent feedback"
              tone="green"
              tag="RV"
            />
            <MetricCard
              label="Approval Summary"
              value={`${bookingStats.approved} / ${bookingStats.disapproved}`}
              subtitle={`Pending ${bookingStats.pending}`}
              tone="blue"
              tag="AP"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="flex items-start gap-3">
              <FaCircleInfo className="mt-0.5 text-blue-700" />
              <div>
                <div className="font-semibold">Session Requests Control Center</div>
                <div className="text-blue-800">
                  Use the tabs to review bookings by status and take actions quickly.
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveStatus(t.key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold border ${
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
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FaListCheck className="text-[#4a6cf7]" />
            <h2 className="text-lg font-semibold text-gray-900">Booking Requests</h2>
          </div>

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
                                <FaUser />
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
                                  onClick={() => openCancel(b)}
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
                                  onClick={() => navigate(`/bookings/${b.id}/chat`)}
                                  className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                >
                                  Open Chat
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openCancel(b)}
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
                  Tip: Approving confirms the session. Cancelling emails the user your reason.
                </p>
              ) : (
                <p className="mt-4 text-xs text-gray-500">
                  Tip: Use <span className="font-semibold">Mark Pending</span> to revert mistakes.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FaSliders className="text-[#4a6cf7]" /> Therapist Settings
            </h2>
            {totalSlotsSelected === 0 ? (
              <span className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                Not available
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Update your bio, price, qualification, experience, and weekly available slots.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-800">Price per session</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  value={therapistForm.pricePerSession}
                  onChange={(e) =>
                    setTherapistForm((p) => ({ ...p, pricePerSession: e.target.value }))
                  }
                  placeholder="e.g., 20"
                  inputMode="decimal"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <span className="text-sm font-semibold text-gray-500">/ session</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:w-[280px]">
              <MetricCard label="Active days" value={daySelectedCount} compact />
              <MetricCard label="Total slots" value={totalSlotsSelected} compact />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-800">Qualification</label>
              <input
                value={therapistForm.qualification}
                onChange={(e) =>
                  setTherapistForm((p) => ({ ...p, qualification: e.target.value }))
                }
                placeholder="e.g., MSc Child Psychology"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800">Experience (years)</label>
              <input
                value={therapistForm.experienceYears}
                onChange={(e) =>
                  setTherapistForm((p) => ({ ...p, experienceYears: e.target.value }))
                }
                placeholder="e.g., 8"
                inputMode="numeric"
                type="number"
                min="0"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-800">Bio</label>
            <textarea
              value={therapistForm.bio}
              onChange={(e) => setTherapistForm((p) => ({ ...p, bio: e.target.value }))}
              rows={4}
              placeholder="Tell parents about your approach, specialties, and the children you support."
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              This appears on your public therapist profile.
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-800">Availability</label>
                <p className="mt-1 text-xs text-gray-500">
                  Choose a day, then edit the available 30-minute time slots.
                </p>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setSlotsModalOpen(true)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Edit times
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-900">{selectedDay}</div>
                <div className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600">
                  {selectedTimesForDay.length} selected
                </div>
              </div>
              {selectedTimesForDay.length === 0 ? (
                <div className="mt-2 text-sm text-gray-600">No times selected for this day.</div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTimesForDay.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Available days</div>
              {activeDays.length === 0 ? (
                <div className="mt-2 text-sm text-gray-600">No active days selected.</div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeDays.map((d) => (
                    <span
                      key={d}
                      className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={saveTherapistProfile}
              disabled={therapistSaving}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white ${
                therapistSaving
                  ? "cursor-not-allowed bg-blue-300"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95"
              }`}
            >
              {therapistSaving ? "Saving..." : "Save Therapist Settings"}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FaStar className="text-amber-500" /> Reviews and Feedback
            </h2>
            <span className="text-xs text-gray-500">Updated from completed sessions</span>
          </div>

          {!reviewInsights ? (
            <div className="mt-4 text-sm text-gray-600">No review insights yet.</div>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Average rating</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{Number(reviewInsights.averageReview || 0).toFixed(1)} / 5</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total reviews</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{reviewInsights.reviewCount || 0}</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">5-star share</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">
                    {reviewInsights.reviewCount > 0
                      ? `${Math.round(((Number(reviewInsights?.distribution?.["5"] || 0)) / Number(reviewInsights.reviewCount)) * 100)}%`
                      : "0%"}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-5">
                {["5", "4", "3", "2", "1"].map((star) => (
                  <div key={star} className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                    <div className="text-sm font-semibold text-gray-700">{star} star</div>
                    <div className="mt-1 text-lg font-bold text-gray-900">{Number(reviewInsights?.distribution?.[star] || 0)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left text-xs font-semibold text-gray-500">Parent</th>
                      <th className="py-2 text-left text-xs font-semibold text-gray-500">Rating</th>
                      <th className="py-2 text-left text-xs font-semibold text-gray-500">Comment</th>
                      <th className="py-2 text-left text-xs font-semibold text-gray-500">Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reviewInsights.recentReviews || []).map((r) => (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="py-2 text-sm text-gray-900">{r.reviewerName || "Parent"}</td>
                        <td className="py-2 text-sm font-semibold text-amber-700">{r.rating}/5</td>
                        <td className="py-2 text-sm text-gray-700">{r.comment || "-"}</td>
                        <td className="py-2 text-sm text-gray-600">{r.sessionDate || "-"} {r.sessionTime || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* DETAILS MODAL */}
      <AppModal
        open={detailsOpen}
        onClose={closeDetails}
        title="Booking Details"
        subtitle={`Client: ${d?.userName || `User #${d?.userId ?? "-"}`} • Status: ${toTitle(d?.status || "")}`}
        icon={<FaListCheck />}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
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
                  onClick={() => openCancel(d)}
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
                  <>
                    <button
                      type="button"
                      onClick={() => navigate(`/bookings/${d?.id}/chat`)}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Open Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => openCancel(d)}
                      disabled={actionId === d?.id}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                        actionId === d?.id ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {actionId === d?.id ? "Working..." : "Cancel"}
                    </button>
                  </>
                ) : null}
              </>
            )}

            <button
              type="button"
              onClick={closeDetails}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="mt-1 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusPill(
                d?.status
              )}`}
            >
              {toTitle(d?.status)}
            </span>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Payment: {toTitle(d?.paymentStatus || "Unknown")}
            </span>
            {riskLevel ? (
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${riskPill(
                  riskLevel
                )}`}
              >
                Combined Risk: {toTitle(riskLevel)}
              </span>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Session</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Info label="Booking ID" value={d?.id} />
                <Info label="Status" value={toTitle(d?.status)} />
                <Info label="Date" value={fmtDateOnly(d?.date)} />
                <Info label="Time" value={fmtTime(d?.time)} />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Client</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Info label="Name" value={d?.userName} />
                <Info label="User ID" value={d?.userId} />
                <Info label="Email" value={d?.userEmail} />
                <Info label="Phone" value={d?.userPhone} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Child Assessment Snapshot</div>
                <div className="text-xs text-gray-600">
                  Shared automatically from the latest parent AI and M-CHAT assessments.
                </div>
              </div>
              {riskLevel ? (
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${riskPill(
                    riskLevel
                  )}`}
                >
                  {toTitle(riskLevel)} Risk
                </span>
              ) : null}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-white/80 bg-white/80 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">AI Probability</div>
                <div className="mt-1 text-lg font-bold text-gray-900">{pct(d?.aiProbabilityScore)}</div>
                <div className="mt-1 text-xs text-gray-500">AI Risk: {toTitle(d?.aiRiskLevel || "-")}</div>
              </div>

              <div className="rounded-lg border border-white/80 bg-white/80 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">M-CHAT Score</div>
                <div className="mt-1 text-lg font-bold text-gray-900">{pct(d?.mchatScore)}</div>
                <div className="mt-1 text-xs text-gray-500">M-CHAT Risk: {toTitle(d?.mchatRiskLevel || "-")}</div>
              </div>

              <div className="rounded-lg border border-white/80 bg-white/80 p-3 sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Weakness Categories</div>
                {weaknessAreas.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {weaknessAreas.map((area) => (
                      <span
                        key={area}
                        className="rounded-full border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-gray-600">No weakness categories available yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppModal>

      {/* ✅ CANCEL MODAL */}
      <AppModal
        open={cancelOpen}
        onClose={closeCancel}
        title="Cancel Booking"
        subtitle="This will cancel the booking and email the user your reason."
        icon={<FaCircleInfo />}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Back
            </button>

            <button
              type="button"
              onClick={confirmCancel}
              disabled={actionId === cancelBooking?.id}
              className={`rounded-lg px-5 py-2 text-sm font-semibold text-white ${
                actionId === cancelBooking?.id ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {actionId === cancelBooking?.id ? "Working..." : "Confirm Cancel"}
            </button>
          </div>
        }
      >
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Reason (optional but recommended)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={5}
                className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                placeholder="Example: I’m unavailable due to an emergency. Please reschedule for another day."
              />
              <p className="mt-2 text-xs text-gray-500">Keep it short and clear.</p>
            </div>
      </AppModal>

      {slotsModalOpen && (
        <SlotsModal
          day={selectedDay}
          selectedTimes={new Set(therapistForm.availability?.[selectedDay] || [])}
          onClose={() => setSlotsModalOpen(false)}
          onToggle={(time) => toggleSlot(selectedDay, time)}
          onSelectAll={() => selectDayAll(selectedDay)}
          onClear={() => clearDay(selectedDay)}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value, subtitle, tone = "slate", tag = "ST", compact = false }) {
  if (compact) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
        <div className="mt-2 text-xl font-bold text-gray-900">{value}</div>
      </div>
    );
  }

  const theme =
    tone === "purple"
      ? {
          wrap: "from-violet-500 to-purple-600",
          orb: "bg-white/16",
        }
      : tone === "amber"
        ? {
            wrap: "from-amber-400 to-orange-500",
            orb: "bg-white/16",
          }
        : tone === "green"
          ? {
              wrap: "from-emerald-400 to-green-500",
              orb: "bg-white/16",
            }
          : {
              wrap: "from-blue-500 to-sky-500",
              orb: "bg-white/16",
            };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg ${theme.wrap}`}>
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${theme.orb}`} />
      <div className={`absolute -bottom-8 -left-6 h-24 w-24 rounded-full ${theme.orb}`} />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="rounded-xl bg-white/20 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/95">
          {tag}
        </div>
      </div>

      <div className="relative z-10 mt-4 text-4xl font-extrabold leading-none tracking-tight">{value}</div>
      <div className="relative z-10 mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-white/90">
        {label}
      </div>
      <div className="relative z-10 mt-1 text-sm text-white/90">{subtitle}</div>
    </div>
  );
}

function SlotsModal({ day, selectedTimes, onClose, onToggle, onSelectAll, onClear }) {
  return (
    <AppModal
      open
      onClose={onClose}
      title="Edit Availability"
      subtitle={`Day: ${day} • ${selectedTimes.size} selected`}
      icon={<FaSliders />}
      size="2xl"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Done
          </button>
        </div>
      }
    >

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
          <div className="ml-auto text-xs text-gray-500">Click a time to toggle.</div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {TIME_SLOTS.map((t) => {
            const active = selectedTimes.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => onToggle(t)}
                className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold ${
                  active
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
    </AppModal>
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

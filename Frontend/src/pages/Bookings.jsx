import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

const MY_BOOKINGS_ENDPOINT = "/api/bookings/me"; // GET
const RESCHEDULE_ENDPOINT = (id) => `/api/bookings/${id}/reschedule`; // PUT { date, time }
const CANCEL_ENDPOINT = (id) => `/api/bookings/${id}`; // DELETE

// ✅ session duration (used for "COMPLETED" status)
const SESSION_MINUTES = 30;

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

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Parses "YYYY-MM-DD" + "HH:mm" into a Date in local time
function parseLocalDateTime(dateStr, timeStr) {
  try {
    if (!dateStr || !timeStr) return null;
    const [y, m, d] = String(dateStr).split("-").map(Number);
    const [hh, mm] = String(timeStr).split(":").map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  } catch {
    return null;
  }
}

function addMinutes(dateObj, minutes) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj)) return null;
  return new Date(dateObj.getTime() + minutes * 60 * 1000);
}

export default function Bookings() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);

  // ✅ Search
  const [search, setSearch] = useState("");

  // reschedule modal
  const [open, setOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  // available slots for reschedule
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]); // ["09:00","09:30"]

  // cancel modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBookingObj, setCancelBookingObj] = useState(null);
  const [canceling, setCanceling] = useState(false);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get(MY_BOOKINGS_ENDPOINT);
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setBookings(list);
    } catch (err) {
      console.error("LOAD BOOKINGS ERROR:", err?.response?.status, err?.response?.data);
      toast.error(err?.response?.data?.message || "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const openReschedule = (b) => {
    setActiveBooking(b);
    setDate(b.date || "");
    setTime(b.time || "");
    setAvailableTimes([]);
    setOpen(true);
  };

  const closeReschedule = () => {
    setOpen(false);
    setActiveBooking(null);
    setDate("");
    setTime("");
    setAvailableTimes([]);
    setSlotsLoading(false);
  };

  const therapistId = useMemo(() => {
    return activeBooking?.therapistId || activeBooking?.therapist_id || activeBooking?.therapist?.id || null;
  }, [activeBooking]);

  // ✅ Load available slots when reschedule modal is open AND date changes
  useEffect(() => {
    let mounted = true;

    async function loadSlots() {
      if (!open) return;
      if (!therapistId) {
        setAvailableTimes([]);
        return;
      }

      if (!date) {
        setAvailableTimes([]);
        setTime("");
        return;
      }

      try {
        setSlotsLoading(true);
        const res = await api.get(`/api/therapists/${therapistId}/available-slots`, {
          params: { date },
        });

        const list = Array.isArray(res.data) ? res.data : [];
        if (!mounted) return;

        setAvailableTimes(list);

        if (time && !list.includes(time)) {
          setTime("");
        }
      } catch (err) {
        console.error("LOAD AVAILABLE SLOTS ERROR:", err?.response?.status, err?.response?.data);
        toast.error(getErrorMessage(err) || "Could not load available slots.");
        if (!mounted) return;
        setAvailableTimes([]);
        setTime("");
      } finally {
        if (mounted) setSlotsLoading(false);
      }
    }

    loadSlots();
    return () => {
      mounted = false;
    };
  }, [open, therapistId, date]); // intentionally NOT including time

  const reschedule = async () => {
    if (!activeBooking?.id) return;
    if (!date) return toast.error("Select a date.");
    if (!time) return toast.error("Select a time.");

    if (availableTimes.length > 0 && !availableTimes.includes(time)) {
      return toast.error("Selected time is not available.");
    }

    try {
      setSaving(true);
      await api.put(RESCHEDULE_ENDPOINT(activeBooking.id), { date, time });
      toast.success("Booking rescheduled.");
      closeReschedule();
      loadBookings();
    } catch (err) {
      console.error("RESCHEDULE ERROR:", err?.response?.status, err?.response?.data);
      toast.error(err?.response?.data?.message || err?.response?.data || "Reschedule failed.");
    } finally {
      setSaving(false);
    }
  };

  const openCancelModal = (b) => {
    setCancelBookingObj(b);
    setCancelOpen(true);
  };

  const closeCancelModal = () => {
    setCancelOpen(false);
    setCancelBookingObj(null);
    setCanceling(false);
  };

  const confirmCancel = async () => {
    if (!cancelBookingObj?.id) return;

    try {
      setCanceling(true);
      await api.delete(CANCEL_ENDPOINT(cancelBookingObj.id));
      toast.success("Booking cancelled.");
      closeCancelModal();
      loadBookings();
    } catch (err) {
      console.error("CANCEL ERROR:", err?.response?.status, err?.response?.data);
      toast.error(err?.response?.data?.message || err?.response?.data || "Cancel failed.");
      setCanceling(false);
    }
  };

  const contactTherapist = (b) => {
    const email = b?.therapistEmail;
    const phone = b?.therapistPhone;

    if (email) {
      window.location.href = `mailto:${email}?subject=Regarding%20my%20booking&body=Hi%20${encodeURIComponent(
        b?.therapistName || "Doctor"
      )}%2C%0A%0A`;
      return;
    }

    if (phone) {
      window.location.href = `tel:${phone}`;
      return;
    }

    toast.error("Contact info not available.");
  };

  // ✅ Search filter (therapist name/date/time/status)
  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;

    return bookings.filter((b) => {
      const name = String(b?.therapistName || b?.therapist?.name || "").toLowerCase();
      const d = String(b?.date || "").toLowerCase();
      const t = String(b?.time || "").toLowerCase();
      const s = String(b?.status || "").toLowerCase();

      return (
        name.includes(q) ||
        d.includes(q) ||
        t.includes(q) ||
        s.includes(q)
      );
    });
  }, [bookings, search]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ✅ page layout like your screenshot */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Booking History</h1>
            <p className="mt-1 text-sm text-gray-600">
              View your bookings, reschedule sessions, cancel, or contact your therapist.
            </p>
          </div>

          {/* right-side action button (like "Booking History" button in screenshot) */}
          <button
            onClick={() => navigate("/therapists")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4a6cf7] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#3f5ee0]"
          >
            Find Therapists
          </button>
        </div>

        {/* ✅ Search bar (replaces speciality chips) */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by therapist, date, time, or status..."
              className="w-full rounded-full border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {search.trim() ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              Clear
            </button>
          ) : null}

          <div className="text-sm text-gray-500 sm:ml-auto">
            Showing <span className="font-semibold text-gray-800">{filteredBookings.length}</span>{" "}
            booking{filteredBookings.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* ✅ Cards grid like your screenshot */}
        <div className="mt-6">
          {loading ? (
            <div className="text-sm text-gray-600">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
              No bookings found.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBookings.map((b) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  onReschedule={() => openReschedule(b)}
                  onCancel={() => openCancelModal(b)}
                  onContact={() => contactTherapist(b)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {open && (
        <RescheduleModal
          booking={activeBooking}
          date={date}
          time={time}
          setDate={setDate}
          setTime={setTime}
          onClose={closeReschedule}
          onSave={reschedule}
          saving={saving}
          slotsLoading={slotsLoading}
          availableTimes={availableTimes}
          minDate={todayISO()}
        />
      )}

      {cancelOpen && (
        <CancelModal
          booking={cancelBookingObj}
          onClose={closeCancelModal}
          onConfirm={confirmCancel}
          canceling={canceling}
        />
      )}
    </div>
  );
}

function BookingCard({ b, onReschedule, onCancel, onContact }) {
  const therapistName = b.therapistName || "Therapist";

  const rawStatus = (b.status || "CONFIRMED").toString().trim().toUpperCase();
  const isCancelled = rawStatus === "CANCELLED" || rawStatus === "CANCELED";

  // ✅ Completed only after session duration has passed
  const start = parseLocalDateTime(b.date, b.time);
  const end = start ? addMinutes(start, SESSION_MINUTES) : null;
  const isCompleted =
    !isCancelled &&
    end instanceof Date &&
    !Number.isNaN(end) &&
    end.getTime() < Date.now();

  const displayStatus = isCancelled ? "CANCELLED" : isCompleted ? "COMPLETED" : rawStatus;

  const statusClass =
    displayStatus === "CANCELLED"
      ? "text-red-600"
      : displayStatus === "COMPLETED"
      ? "text-gray-600"
      : "text-green-600";

  const actionsDisabled = isCancelled || isCompleted;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-gray-900">{therapistName}</div>

          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-between gap-4">
              <span>Date</span>
              <span className="font-semibold text-gray-800">{b.date || "-"}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span>Time</span>
              <span className="font-semibold text-gray-800">{b.time || "-"}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span>Status</span>
              <span className={`font-semibold ${statusClass}`}>{displayStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {!actionsDisabled ? (
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onReschedule}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Change Date/Time
          </button>

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Cancel
            </button>

            <button
              onClick={onContact}
              className="w-full rounded-xl bg-[#4a6cf7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
            >
              Contact
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
          {displayStatus === "COMPLETED"
            ? "This session is completed."
            : "This booking was cancelled."}
        </div>
      )}
    </div>
  );
}

function RescheduleModal({
  booking,
  date,
  time,
  setDate,
  setTime,
  onClose,
  onSave,
  saving,
  slotsLoading,
  availableTimes,
  minDate,
}) {
  const name = booking?.therapistName || "Therapist";
  const noSlots = !!date && !slotsLoading && availableTimes.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Reschedule booking</h2>
            <p className="mt-1 text-sm text-gray-600">
              Therapist: <span className="font-semibold">{name}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Select date</label>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Select time</label>
              <span className="text-xs text-gray-500">Only available slots are shown</span>
            </div>

            {!date ? (
              <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                Pick a date to see available time slots.
              </div>
            ) : slotsLoading ? (
              <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                Loading availability...
              </div>
            ) : noSlots ? (
              <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                No available time slots for this date.
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availableTimes.map((t) => {
                  const active = t === time;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTime(t)}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                        active
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving || !date || !time}
            className={`rounded-xl px-5 py-2 text-sm font-semibold text-white ${
              saving || !date || !time ? "bg-blue-300 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
            }`}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({ booking, onClose, onConfirm, canceling }) {
  const therapistName = booking?.therapistName || "Therapist";
  const date = booking?.date || "-";
  const time = booking?.time || "-";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Cancel booking?</h2>
            <p className="mt-1 text-sm text-gray-600">
              You’re about to cancel your session with <span className="font-semibold">{therapistName}</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
          <div className="flex items-center justify-between">
            <span>Date</span>
            <span className="font-semibold">{date}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Time</span>
            <span className="font-semibold">{time}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={canceling}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Keep
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={canceling}
            className={`rounded-xl px-5 py-2 text-sm font-semibold text-white ${
              canceling ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {canceling ? "Canceling..." : "Yes, Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
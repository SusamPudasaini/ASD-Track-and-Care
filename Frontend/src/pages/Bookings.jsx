import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

const MY_BOOKINGS_ENDPOINT = "/api/bookings/me"; // GET
const RESCHEDULE_ENDPOINT = (id) => `/api/bookings/${id}/reschedule`; // PUT { date, time }
const CANCEL_ENDPOINT = (id) => `/api/bookings/${id}`; // DELETE

const TIMES = [
  "09:00", "09:30",
  "10:00", "10:30",
  "11:00", "11:30",
  "12:00", "12:30",
  "13:00", "13:30",
  "14:00", "14:30",
  "15:00", "15:30",
  "16:00", "16:30",
  "17:00", "17:30",
  "18:00",
];

export default function Bookings() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);

  // reschedule modal
  const [open, setOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

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
    setOpen(true);
  };

  const closeReschedule = () => {
    setOpen(false);
    setActiveBooking(null);
    setDate("");
    setTime("");
  };

  const reschedule = async () => {
    if (!activeBooking?.id) return;
    if (!date) return toast.error("Select a date.");
    if (!time) return toast.error("Select a time.");

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

  const cancelBooking = async (b) => {
    if (!b?.id) return;

    const ok = window.confirm("Cancel this booking?");
    if (!ok) return;

    try {
      await api.delete(CANCEL_ENDPOINT(b.id));
      toast.success("Booking cancelled.");
      loadBookings();
    } catch (err) {
      console.error("CANCEL ERROR:", err?.response?.status, err?.response?.data);
      toast.error(err?.response?.data?.message || err?.response?.data || "Cancel failed.");
    }
  };

  const contactTherapist = (b) => {
    // simplest: if backend returns therapistPhone or therapistEmail
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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-md border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Booking History</h1>
          <p className="mt-1 text-sm text-gray-600">
            View, reschedule, cancel, or contact your therapist.
          </p>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="text-sm text-gray-600">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="rounded border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
              No bookings yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {bookings.map((b) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  onReschedule={() => openReschedule(b)}
                  onCancel={() => cancelBooking(b)}
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
        />
      )}
    </div>
  );
}

function BookingCard({ b, onReschedule, onCancel, onContact }) {
  const therapistName = b.therapistName || "Therapist";
  const status = b.status || "CONFIRMED";

  return (
    <div className="rounded-md border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-gray-900">{therapistName}</div>
          <div className="mt-1 text-sm text-gray-600">
            Date: <span className="font-semibold text-gray-800">{b.date}</span>
          </div>
          <div className="text-sm text-gray-600">
            Time: <span className="font-semibold text-gray-800">{b.time}</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Status: {status}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onReschedule}
          className="rounded border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Change Date/Time
        </button>

        <button
          onClick={onCancel}
          className="rounded border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          Cancel
        </button>

        <button
          onClick={onContact}
          className="ml-auto rounded bg-[#4a6cf7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
        >
          Contact Therapist
        </button>
      </div>
    </div>
  );
}

function RescheduleModal({ booking, date, time, setDate, setTime, onClose, onSave, saving }) {
  const name = booking?.therapistName || "Therapist";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
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
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full rounded border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Select time</label>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {TIMES.map((t) => {
                const active = t === time;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTime(t)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
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
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className={`rounded-lg px-5 py-2 text-sm font-semibold text-white ${
              saving ? "bg-blue-300 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
            }`}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

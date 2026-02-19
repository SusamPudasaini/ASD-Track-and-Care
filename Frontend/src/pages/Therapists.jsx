import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

const THERAPISTS_ENDPOINT = "/api/therapists"; // GET
const CREATE_BOOKING_ENDPOINT = "/api/bookings"; // POST { therapistId, date, time }

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

/**
 * ✅ SAFER: Only label "Unavailable" when backend gives a strong signal.
 * This prevents false "Unavailable" when backend returns availability: {} by default.
 */
function isTherapistUnavailable(t) {
  // Strongest signals: explicit boolean
  if (typeof t?.available === "boolean") return !t.available;
  if (typeof t?.isAvailable === "boolean") return !t.isAvailable;

  // Strong signal: explicit slot count
  if (typeof t?.totalSlots === "number") return t.totalSlots === 0;
  if (typeof t?.slotCount === "number") return t.slotCount === 0;

  // Medium signal: availableDays array (only if field exists and is array)
  if (Array.isArray(t?.availableDays)) return t.availableDays.length === 0;

  // Medium signal: availability map
  const availMap = t?.availability;
  if (availMap && typeof availMap === "object" && !Array.isArray(availMap)) {
    const keys = Object.keys(availMap);

    // ✅ IMPORTANT: empty object means "unknown" (don’t block UI)
    if (keys.length === 0) return false;

    const total = Object.values(availMap).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);

    // If it has keys but zero slots => truly unavailable
    return total === 0;
  }

  // fallback: unknown => treat as available
  return false;
}

export default function Therapists() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [therapists, setTherapists] = useState([]);

  // booking modal
  const [open, setOpen] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [booking, setBooking] = useState(false);

  // availability from backend
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]); // ["09:00","09:30"]

  useEffect(() => {
    let mounted = true;

    async function loadTherapists() {
      try {
        setLoading(true);
        const res = await api.get(THERAPISTS_ENDPOINT);
        if (!mounted) return;

        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];

        // ✅ debug: check what backend returns (keep for now)
        // console.log("THERAPISTS PAYLOAD SAMPLE:", list?.[0]);

        setTherapists(list);
      } catch (err) {
        console.error("LOAD THERAPISTS ERROR:", err?.response?.status, err?.response?.data);
        toast.error(getErrorMessage(err) || "Could not load therapists.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadTherapists();
    return () => (mounted = false);
  }, []);

  const openBook = (t) => {
    // ✅ prevent opening modal if therapist is truly unavailable
    if (isTherapistUnavailable(t)) {
      toast.error("This therapist is currently unavailable.");
      return;
    }

    setSelectedTherapist(t);
    setDate("");
    setTime("");
    setAvailableTimes([]);
    setOpen(true);
  };

  const closeBook = () => {
    setOpen(false);
    setSelectedTherapist(null);
    setDate("");
    setTime("");
    setAvailableTimes([]);
  };

  const therapistName = useMemo(() => {
    if (!selectedTherapist) return "";
    return selectedTherapist.name || selectedTherapist.fullName || "Therapist";
  }, [selectedTherapist]);

  const therapistId = useMemo(() => {
    if (!selectedTherapist) return null;
    return selectedTherapist.id || selectedTherapist.therapistId || null;
  }, [selectedTherapist]);

  const selectedTherapistUnavailable = useMemo(() => {
    if (!selectedTherapist) return false;
    return isTherapistUnavailable(selectedTherapist);
  }, [selectedTherapist]);

  // ✅ load available slots when date changes
  useEffect(() => {
    let mounted = true;

    async function loadSlots() {
      if (!open) return;
      if (!therapistId) return;

      // ✅ if therapist is marked unavailable, don’t even fetch
      if (selectedTherapistUnavailable) {
        setAvailableTimes([]);
        setTime("");
        return;
      }

      if (!date) {
        setAvailableTimes([]);
        setTime("");
        return;
      }

      try {
        setSlotsLoading(true);
        setAvailableTimes([]);
        setTime("");

        const res = await api.get(`/api/therapists/${therapistId}/available-slots`, {
          params: { date },
        });

        const list = Array.isArray(res.data) ? res.data : [];
        if (!mounted) return;

        setAvailableTimes(list);
      } catch (err) {
        console.error("LOAD SLOTS ERROR:", err?.response?.status, err?.response?.data);
        toast.error(getErrorMessage(err) || "Could not load availability.");
        if (!mounted) return;
        setAvailableTimes([]);
      } finally {
        if (mounted) setSlotsLoading(false);
      }
    }

    loadSlots();
    return () => (mounted = false);
  }, [open, therapistId, date, selectedTherapistUnavailable]);

  const createBooking = async () => {
    if (!selectedTherapist) return toast.error("Pick a therapist first.");
    if (selectedTherapistUnavailable) return toast.error("This therapist is currently unavailable.");
    if (!date) return toast.error("Select a date.");
    if (!time) return toast.error("Select a time.");
    if (!therapistId) return toast.error("Therapist id missing.");

    if (!availableTimes.includes(time)) {
      return toast.error("Selected time is not available.");
    }

    try {
      setBooking(true);

      await api.post(CREATE_BOOKING_ENDPOINT, {
        therapistId,
        date,
        time,
      });

      toast.success("Booking placed!");
      closeBook();
      navigate("/bookings");
    } catch (err) {
      console.error("CREATE BOOKING ERROR:", err?.response?.status, err?.response?.data);
      toast.error(getErrorMessage(err) || "Booking failed.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Therapists</h1>
            <p className="mt-1 text-sm text-gray-600">Browse therapists and book a session.</p>
          </div>

          <button
            onClick={() => navigate("/bookings")}
            className="rounded bg-[#4a6cf7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
          >
            Booking History
          </button>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="text-sm text-gray-600">Loading therapists...</div>
          ) : therapists.length === 0 ? (
            <div className="rounded border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
              No therapists found.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {therapists.map((t) => (
                <TherapistCard
                  key={t.id || t.therapistId}
                  t={t}
                  onBook={() => openBook(t)}
                  unavailable={isTherapistUnavailable(t)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {open && (
        <BookModal
          therapistName={therapistName}
          unavailable={selectedTherapistUnavailable}
          date={date}
          time={time}
          setDate={setDate}
          setTime={setTime}
          onClose={closeBook}
          onBook={createBooking}
          booking={booking}
          slotsLoading={slotsLoading}
          availableTimes={availableTimes}
        />
      )}
    </div>
  );
}

function TherapistCard({ t, onBook, unavailable }) {
  const name = t.name || t.fullName || `${t.firstName || ""} ${t.lastName || ""}`.trim() || "Therapist";
  const qualification = t.qualification || t.degree || t.title || "—";
  const price = t.pricePerSession ?? t.sessionPrice ?? "—";
  const image = t.profilePictureUrl || t.avatarUrl || t.imageUrl || "";

  return (
    <div className="rounded-md border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
          {image ? (
            <img src={image} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-gray-900">{name}</div>
          <div className="truncate text-sm text-gray-600">Qualification: {qualification}</div>
          <div className="mt-1 text-sm font-semibold text-gray-800">
            Price per session: <span className="text-gray-700">{price}</span>
          </div>

          {unavailable && (
            <div className="mt-2 inline-flex items-center rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700">
              Unavailable
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onBook}
        disabled={unavailable}
        className={`mt-4 w-full rounded px-4 py-2 text-sm font-semibold text-white ${
          unavailable ? "cursor-not-allowed bg-gray-300" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
        }`}
      >
        {unavailable ? "Unavailable" : "Book Now"}
      </button>
    </div>
  );
}

function BookModal({
  therapistName,
  unavailable,
  date,
  time,
  setDate,
  setTime,
  onClose,
  onBook,
  booking,
  slotsLoading,
  availableTimes,
}) {
  const noSlots = !!date && !slotsLoading && availableTimes.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Book a session</h2>
            <p className="mt-1 text-sm text-gray-600">
              Therapist: <span className="font-semibold">{therapistName}</span>
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

        {unavailable ? (
          <div className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            This therapist is currently <span className="font-semibold">unavailable</span>. Please choose another therapist.
          </div>
        ) : (
          <>
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Select date</label>
                <input
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-2 w-full rounded border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Select time</label>
                  <span className="text-xs text-gray-500">Only available slots are shown</span>
                </div>

                {!date ? (
                  <div className="mt-2 rounded border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                    Pick a date to see available time slots.
                  </div>
                ) : slotsLoading ? (
                  <div className="mt-2 rounded border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                    Loading availability...
                  </div>
                ) : noSlots ? (
                  <div className="mt-2 rounded border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
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
                )}
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
                onClick={onBook}
                disabled={booking || !date || !time}
                className={`rounded-lg px-5 py-2 text-sm font-semibold text-white ${
                  booking || !date || !time ? "bg-blue-300 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                }`}
              >
                {booking ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

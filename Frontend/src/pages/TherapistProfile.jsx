import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

const CREATE_BOOKING_ENDPOINT = "/api/bookings"; // POST { therapistId, date, time }

function backendBase() {
  return (import.meta.env.VITE_API_BASE_URL || "http://localhost:8081").replace(/\/api\/?$/, "");
}

function resolveImageUrl(raw) {
  if (!raw) return "";
  const s = String(raw);
  if (s.startsWith("blob:")) return s;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `${backendBase()}${s}`;
  return `${backendBase()}/${s}`;
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

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toCurrencyMaybe(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number") return `Rs. ${v}`;
  return String(v);
}

/**
 * ✅ SAFER: Only label "Unavailable" when backend gives a strong signal.
 */
function isTherapistUnavailable(t) {
  if (typeof t?.available === "boolean") return !t.available;
  if (typeof t?.isAvailable === "boolean") return !t.isAvailable;

  if (typeof t?.totalSlots === "number") return t.totalSlots === 0;
  if (typeof t?.slotCount === "number") return t.slotCount === 0;

  if (Array.isArray(t?.availableDays)) return t.availableDays.length === 0;

  const availMap = t?.availability;
  if (availMap && typeof availMap === "object" && !Array.isArray(availMap)) {
    const keys = Object.keys(availMap);
    if (keys.length === 0) return false;
    const total = Object.values(availMap).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
    return total === 0;
  }

  return false;
}

function StarRow({ rating, reviews }) {
  const r = Number(rating);
  const safeRating = Number.isFinite(r) ? r.toFixed(1) : null;
  const safeReviews = Number.isFinite(Number(reviews)) ? Number(reviews) : null;

  return (
    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
      <span className="text-yellow-500">★</span>
      <span className="font-semibold text-gray-900">{safeRating ?? "—"}</span>
      <span className="text-gray-500">({safeReviews !== null ? `${safeReviews} reviews` : "no reviews"})</span>
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
      {children}
    </span>
  );
}

export default function TherapistProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // if we came from therapists list, we pass state: { therapist }
  const initialTherapist = location?.state?.therapist ?? null;

  const [loading, setLoading] = useState(!initialTherapist);
  const [therapist, setTherapist] = useState(initialTherapist);

  // booking modal
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [booking, setBooking] = useState(false);

  // availability
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]);

  const therapistId = useMemo(() => {
    return therapist?.id || therapist?.therapistId || (id ? Number(id) || id : null);
  }, [therapist, id]);

  const name = useMemo(() => {
    if (!therapist) return "Therapist";
    return therapist.name || therapist.fullName || `${therapist.firstName || ""} ${therapist.lastName || ""}`.trim() || "Therapist";
  }, [therapist]);

  const role = useMemo(() => {
    return therapist?.role || therapist?.specialization || therapist?.speciality || therapist?.type || therapist?.category || "Therapist";
  }, [therapist]);

  const qualification = useMemo(() => {
    return therapist?.qualification || therapist?.degree || therapist?.title || "—";
  }, [therapist]);

  const price = useMemo(() => {
    return toCurrencyMaybe(therapist?.pricePerSession ?? therapist?.sessionPrice ?? therapist?.price ?? "—");
  }, [therapist]);

  const rating = therapist?.rating ?? therapist?.avgRating ?? therapist?.stars;
  const reviews = therapist?.reviewsCount ?? therapist?.reviewCount ?? therapist?.reviews;

  const image = useMemo(() => {
    const raw = therapist?.profilePictureUrl || therapist?.avatarUrl || therapist?.imageUrl || "";
    return resolveImageUrl(raw);
  }, [therapist]);

  const unavailable = useMemo(() => {
    return therapist ? isTherapistUnavailable(therapist) : false;
  }, [therapist]);

  // ✅ Fetch therapist details if not provided
  useEffect(() => {
    let mounted = true;

    async function loadTherapist() {
      if (initialTherapist) return;
      if (!id) return;

      try {
        setLoading(true);

        // Expecting you likely have something like: GET /api/therapists/{id}
        // If your endpoint is different, change it here.
        const res = await api.get(`/api/therapists/${id}`);

        if (!mounted) return;
        setTherapist(res.data);
      } catch (err) {
        console.error("LOAD THERAPIST PROFILE ERROR:", err?.response?.status, err?.response?.data);
        toast.error(getErrorMessage(err) || "Could not load therapist profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadTherapist();
    return () => (mounted = false);
  }, [id, initialTherapist]);

  const openBook = () => {
    if (!therapistId) return toast.error("Therapist id missing.");
    if (unavailable) return toast.error("This therapist is currently unavailable.");
    setDate("");
    setTime("");
    setAvailableTimes([]);
    setOpen(true);
  };

  const closeBook = () => {
    setOpen(false);
    setDate("");
    setTime("");
    setAvailableTimes([]);
  };

  // ✅ Load slots on date change
  useEffect(() => {
    let mounted = true;

    async function loadSlots() {
      if (!open) return;
      if (!therapistId) return;

      if (unavailable) {
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

        const res = await api.get(`/api/therapists/${therapistId}/available-slots`, { params: { date } });

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
  }, [open, therapistId, date, unavailable]);

  const createBooking = async () => {
    if (!therapistId) return toast.error("Therapist id missing.");
    if (unavailable) return toast.error("This therapist is currently unavailable.");
    if (!date) return toast.error("Select a date.");
    if (!time) return toast.error("Select a time.");

    if (availableTimes.length > 0 && !availableTimes.includes(time)) {
      return toast.error("Selected time is not available.");
    }

    try {
      setBooking(true);
      await api.post(CREATE_BOOKING_ENDPOINT, { therapistId, date, time });
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

  const availableDays = useMemo(() => {
    const days = therapist?.availableDays;
    if (Array.isArray(days)) return days;

    // sometimes backend returns availability map like { MONDAY: ["09:00"] }
    const map = therapist?.availability;
    if (map && typeof map === "object" && !Array.isArray(map)) return Object.keys(map);

    return [];
  }, [therapist]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={() => navigate("/therapists")}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            All Therapists
          </button>
        </div>

        {loading ? (
          <div className="mt-8 text-sm text-gray-600">Loading therapist profile...</div>
        ) : !therapist ? (
          <div className="mt-8 rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
            Therapist not found.
          </div>
        ) : (
          <>
            <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                    {image ? (
                      <img src={image} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold text-gray-900">{name}</h1>
                    <p className="mt-1 truncate text-sm text-gray-600">{role}</p>
                    <StarRow rating={rating} reviews={reviews} />

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Pill>Qualification: {qualification}</Pill>
                      <Pill>Price: <span className="ml-1 text-[#4a6cf7]">{price}</span></Pill>
                      <Pill>Status: {unavailable ? "Unavailable" : "Available"}</Pill>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:min-w-[220px]">
                  <button
                    onClick={openBook}
                    disabled={unavailable}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white ${
                      unavailable ? "cursor-not-allowed bg-gray-300" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                    }`}
                  >
                    {unavailable ? "Currently Unavailable" : "Book Now"}
                  </button>

                  <button
                    onClick={() => navigate("/bookings")}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    View My Bookings
                  </button>
                </div>
              </div>

              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-white p-5">
                  <h2 className="text-base font-semibold text-gray-900">About</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    {therapist?.bio || therapist?.about || therapist?.description || "No bio added yet."}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5">
                  <h2 className="text-base font-semibold text-gray-900">Availability</h2>

                  {availableDays.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-600">No availability shared.</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {availableDays.map((d) => (
                        <Pill key={d}>{String(d)}</Pill>
                      ))}
                    </div>
                  )}

                  <p className="mt-3 text-xs text-gray-500">
                    Pick a date while booking to see exact available time slots.
                  </p>
                </div>
              </div>
            </div>

            {open && (
              <BookModal
                therapistName={name}
                unavailable={unavailable}
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
          </>
        )}
      </main>
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
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
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
          <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
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
                onClick={onBook}
                disabled={booking || !date || !time}
                className={`rounded-xl px-5 py-2 text-sm font-semibold text-white ${
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
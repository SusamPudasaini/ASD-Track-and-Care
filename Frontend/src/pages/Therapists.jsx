import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

const THERAPISTS_ENDPOINT = "/api/therapists"; // GET
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
    if (keys.length === 0) return false; // unknown => don't block
    const total = Object.values(availMap).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
    return total === 0;
  }

  return false;
}

function normalizeText(v) {
  return String(v ?? "").trim().toLowerCase();
}

function toCurrencyMaybe(v) {
  if (v === null || v === undefined || v === "") return "—";
  // keep as-is if already string like "Rs. 2000"
  if (typeof v === "string") return v;
  if (typeof v === "number") return `Rs. ${v}`;
  return String(v);
}

function StarRow({ rating, reviews }) {
  const r = Number(rating);
  const safeRating = Number.isFinite(r) ? r.toFixed(1) : null;
  const safeReviews = Number.isFinite(Number(reviews)) ? Number(reviews) : null;

  return (
    <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
      <span className="text-yellow-500">★</span>
      <span className="font-semibold text-gray-800">{safeRating ?? "—"}</span>
      <span className="text-gray-500">
        ({safeReviews !== null ? `${safeReviews} reviews` : "no reviews"})
      </span>
    </div>
  );
}

export default function Therapists() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [therapists, setTherapists] = useState([]);

  // ✅ Search bar (replaces speciality chips)
  const [search, setSearch] = useState("");

  // ✅ "Load more" behaviour (UI like screenshot)
  const PAGE_SIZE = 6;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
  }, [open, therapistId, date, selectedTherapistUnavailable]);

  const createBooking = async () => {
    if (!selectedTherapist) return toast.error("Pick a therapist first.");
    if (selectedTherapistUnavailable) return toast.error("This therapist is currently unavailable.");
    if (!date) return toast.error("Select a date.");
    if (!time) return toast.error("Select a time.");
    if (!therapistId) return toast.error("Therapist id missing.");

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

  // ✅ Search filter
  const filteredTherapists = useMemo(() => {
    const q = normalizeText(search);
    if (!q) return therapists;

    return therapists.filter((t) => {
      const name =
        normalizeText(t?.name) ||
        normalizeText(t?.fullName) ||
        normalizeText(`${t?.firstName || ""} ${t?.lastName || ""}`);

      const role = normalizeText(t?.role || t?.specialization || t?.speciality || t?.type || "");
      const qual = normalizeText(t?.qualification || t?.degree || t?.title || "");
      return name.includes(q) || role.includes(q) || qual.includes(q);
    });
  }, [therapists, search]);

  // reset visibleCount when search changes (so load-more doesn’t hide results)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search]);

  const visibleTherapists = useMemo(() => {
    return filteredTherapists.slice(0, visibleCount);
  }, [filteredTherapists, visibleCount]);

  const canLoadMore = visibleCount < filteredTherapists.length;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Header like screenshot */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Therapists</h1>
            <p className="mt-1 text-sm text-gray-600">
              Browse expert therapists and book your next session today.
            </p>
          </div>

          <button
            onClick={() => navigate("/bookings")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4a6cf7] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#3f5ee0]"
          >
            ⏱ Booking History
          </button>
        </div>

        {/* Search row (replaces chips) */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search therapists by name, speciality, or qualification..."
              className="w-full rounded-full border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
          ) : (
            <div />
          )}
        </div>

        {/* Cards */}
        <div className="mt-8">
          {loading ? (
            <div className="text-sm text-gray-600">Loading therapists...</div>
          ) : filteredTherapists.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
              No therapists found.
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {visibleTherapists.map((t) => (
                  <TherapistCard
                    key={t.id || t.therapistId}
                    t={t}
                    onBook={() => openBook(t)}
                    unavailable={isTherapistUnavailable(t)}
                  />
                ))}
              </div>

              {/* Load more button like screenshot */}
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredTherapists.length))}
                  disabled={!canLoadMore}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold ${
                    canLoadMore
                      ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Load More Therapists <span className={`${canLoadMore ? "" : "opacity-50"}`}>⟳</span>
                </button>
              </div>
            </>
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
  const name =
    t.name ||
    t.fullName ||
    `${t.firstName || ""} ${t.lastName || ""}`.trim() ||
    "Therapist";

  const role = t.role || t.specialization || t.speciality || t.type || t.category || "Therapist";
  const qualification = t.qualification || t.degree || t.title || "—";
  const experience = t.experience || t.yearsExperience || t.years || "—";
  const price = toCurrencyMaybe(t.pricePerSession ?? t.sessionPrice ?? t.price ?? "—");

  const rating = t.rating ?? t.avgRating ?? t.stars;
  const reviews = t.reviewsCount ?? t.reviewCount ?? t.reviews;

  const imageRaw = t.profilePictureUrl || t.avatarUrl || t.imageUrl || "";
  const image = resolveImageUrl(imageRaw);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {image ? (
            <img src={image} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold text-gray-900">{name}</div>
          <div className="truncate text-sm text-gray-600">{role}</div>
          <StarRow rating={rating} reviews={reviews} />
        </div>
      </div>

      <div className="mt-5 space-y-3 text-sm text-gray-700">
        <Row label="Qualification" value={qualification} />
        <Row label="Experience" value={experience} />
        <Row label="Price per session" value={price} valueClass="text-[#4a6cf7] font-semibold" />
      </div>

      <button
        onClick={onBook}
        disabled={unavailable}
        className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white ${
          unavailable ? "cursor-not-allowed bg-gray-300" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
        }`}
      >
        {unavailable ? "Unavailable" : "Book Now"}
      </button>
    </div>
  );
}

function Row({ label, value, valueClass = "" }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className={`truncate text-right text-gray-800 ${valueClass}`}>{value ?? "—"}</span>
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
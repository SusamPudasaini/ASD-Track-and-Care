import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import {
  FaArrowLeft,
  FaBriefcase,
  FaCalendarDays,
  FaEnvelope,
  FaGlobe,
  FaLocationDot,
  FaMoneyBill,
  FaPhone,
  FaMagnifyingGlass,
  FaStar,
  FaUserDoctor,
  FaGraduationCap,
} from "react-icons/fa6";
import AppModal from "../components/ui/AppModal";

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

function getBookingPaymentError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const text =
    typeof data === "string"
      ? data
      : typeof data === "object"
        ? data?.message || data?.error || data?.title || ""
        : "";

  if (status >= 500 || /khalti|payment|gateway|pidx/i.test(String(text || ""))) {
    return "Khalti payment initialization failed. Please try again in a moment.";
  }

  if (err?.message === "Payment URL not received.") {
    return "Payment link was not returned by server. Please try booking again.";
  }

  return getErrorMessage(err) || "Booking failed.";
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

function toNumberOrNull(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pickCoordinate(...values) {
  for (const value of values) {
    const parsed = toNumberOrNull(value);
    if (parsed !== null) return parsed;
  }
  return null;
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
  const stars = Math.round(Number.isFinite(r) ? r : 0);

  return (
    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
      <span className="font-semibold text-gray-900">{safeRating ?? "—"}</span>
      <span className="inline-flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((idx) => (
          <FaStar key={idx} className={idx <= stars ? "text-sky-500" : "text-slate-300"} />
        ))}
      </span>
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

function prettyDay(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

  const experience = useMemo(() => {
    return therapist?.experienceYears ?? therapist?.experience ?? therapist?.yearsExperience ?? therapist?.years ?? "—";
  }, [therapist]);

  const workplaceAddress = useMemo(() => {
    return therapist?.workplaceAddress || therapist?.workplace || therapist?.address || therapist?.location || "—";
  }, [therapist]);

  const workplaceLatitude = useMemo(() => {
    return pickCoordinate(
      therapist?.workplaceLatitude,
      therapist?.workplaceLat,
      therapist?.workplace_latitude,
      therapist?.location?.workplaceLatitude,
      therapist?.location?.latitude,
      therapist?.coordinates?.workplaceLatitude,
      therapist?.coordinates?.latitude,
      therapist?.approvedApplication?.workplaceLatitude,
      therapist?.approvedApplication?.workplaceLat,
      therapist?.latitude,
      therapist?.lat
    );
  }, [therapist]);

  const workplaceLongitude = useMemo(() => {
    return pickCoordinate(
      therapist?.workplaceLongitude,
      therapist?.workplaceLng,
      therapist?.workplace_longitude,
      therapist?.location?.workplaceLongitude,
      therapist?.location?.longitude,
      therapist?.coordinates?.workplaceLongitude,
      therapist?.coordinates?.longitude,
      therapist?.approvedApplication?.workplaceLongitude,
      therapist?.approvedApplication?.workplaceLng,
      therapist?.longitude,
      therapist?.lng
    );
  }, [therapist]);

  const canShowWorkplaceMap = workplaceLatitude !== null && workplaceLongitude !== null;
  const workplaceGoogleMapsUrl = canShowWorkplaceMap
    ? `https://www.google.com/maps?q=${workplaceLatitude},${workplaceLongitude}`
    : null;

  const rating = therapist?.averageReview ?? therapist?.rating ?? therapist?.avgRating ?? therapist?.stars;
  const reviews = therapist?.reviewCount ?? therapist?.reviewsCount ?? therapist?.reviews;

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

      const res = await api.post(CREATE_BOOKING_ENDPOINT, { therapistId, date, time });
      const paymentUrl = res?.data?.paymentUrl;
      if (!paymentUrl) {
        throw new Error("Payment URL not received.");
      }

      toast.success("Redirecting to Khalti...");
      window.location.href = paymentUrl;
    } catch (err) {
      console.error("CREATE BOOKING ERROR:", err?.response?.status, err?.response?.data);
      toast.error(getBookingPaymentError(err));
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

  const phone = therapist?.phoneNumber || therapist?.phone || "Not provided";
  const email = therapist?.userEmail || therapist?.email || "Not provided";
  const site = therapist?.website || therapist?.site || "Not provided";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(to_bottom,_#f8fbff,_#f8fafc_30%,_#ffffff)]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <FaArrowLeft /> Back
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
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
            Loading therapist profile...
          </div>
        ) : !therapist ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
            Therapist not found.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">

              <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
                <aside className="border-b border-slate-100 px-5 py-6 lg:border-b-0 lg:border-r lg:border-slate-100">
                  <div className="mx-auto h-44 w-full max-w-[190px] overflow-hidden rounded-sm border border-slate-200 bg-slate-100">
                    {image ? (
                      <img src={image} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Work</div>
                    <div className="mt-3 space-y-3 text-sm text-slate-700">
                      <InfoLine icon={FaGraduationCap} label="Qualification" value={qualification} />
                      <InfoLine
                        icon={FaBriefcase}
                        label="Experience"
                        value={experience === "—" ? "—" : `${experience} years`}
                      />
                      <InfoLine icon={FaMoneyBill} label="Price" value={price} />
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Availability</div>
                    {availableDays.length === 0 ? (
                      <p className="mt-3 text-xs text-slate-500">No availability shared.</p>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {availableDays.map((d) => (
                          <Pill key={d}>{prettyDay(d)}</Pill>
                        ))}
                      </div>
                    )}
                  </div>
                </aside>

                <section className="px-5 py-6 md:px-8">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h1 className="text-3xl font-semibold text-slate-800">{name}</h1>
                      <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500">
                        <FaLocationDot className="text-slate-400" /> {workplaceAddress}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-sky-600">{role}</p>
                      <StarRow rating={rating} reviews={reviews} />
                    </div>

                    <div className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                      {unavailable ? "Unavailable" : "Available"}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
                    <button
                      onClick={openBook}
                      disabled={unavailable}
                      className={`rounded px-4 py-2 text-sm font-semibold text-white ${
                        unavailable ? "cursor-not-allowed bg-slate-300" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                      }`}
                    >
                      {unavailable ? "Currently Unavailable" : "Book Now"}
                    </button>
                    <button
                      onClick={() => navigate("/bookings")}
                      className="rounded border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      View My Bookings
                    </button>
                  </div>

                  <div className="mt-4 border-b border-slate-200">
                    <div className="flex gap-6 text-sm">
                      <span className="border-b-2 border-[#4a6cf7] pb-2 font-semibold text-slate-800">About</span>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Contact Information
                      </div>
                      <div className="mt-3 space-y-3 text-sm text-slate-700">
                        <InfoLine icon={FaPhone} label="Phone" value={phone} />
                        <InfoLine icon={FaLocationDot} label="Workplace Address" value={workplaceAddress} />
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Basic Information
                      </div>
                      <div className="mt-3 space-y-3 text-sm text-slate-700">
                        <InfoLine icon={FaMoneyBill} label="Price Per Session" value={price} />
                        <InfoLine
                          icon={FaBriefcase}
                          label="Experience"
                          value={experience === "—" ? "—" : `${experience} years`}
                        />
  
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded border border-slate-200 bg-slate-50 p-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">About</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {therapist?.bio || therapist?.about || therapist?.description || "No bio added yet."}
                    </p>
                  </div>

                  <div className="mt-6 rounded border border-slate-200 bg-slate-50 p-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Workplace Location</h2>
                    <p className="mt-2 text-sm text-slate-600">{workplaceAddress}</p>

                    {canShowWorkplaceMap ? (
                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <iframe
                          title="Therapist Workplace Map"
                          className="h-56 w-full"
                          src={`https://maps.google.com/maps?q=${workplaceLatitude},${workplaceLongitude}&z=15&output=embed`}
                        />

                        {workplaceGoogleMapsUrl ? (
                          <div className="border-t border-slate-200 p-2">
                            <a
                              href={workplaceGoogleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-[#4a6cf7] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3f5ee0]"
                            >
                              Open in Google Maps
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">Workplace map location is not available.</p>
                    )}
                  </div>
                </section>
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

function InfoLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 text-slate-400" />
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-sm text-slate-800">{value || "—"}</div>
      </div>
    </div>
  );
}

function InfoStat({ icon: Icon, label, value, accent = "text-blue-600" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white">
        <Icon className={accent} />
      </div>
      <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-base font-bold text-slate-900">{value}</div>
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
    <AppModal
      open
      onClose={onClose}
      title="Book a session"
      subtitle={`Therapist: ${therapistName}`}
      size="md"
      bodyClassName="space-y-4"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onBook}
            disabled={unavailable || booking || !date || !time}
            className={`rounded-xl px-5 py-2 text-sm font-semibold text-white ${
              unavailable || booking || !date || !time
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
            }`}
          >
            {booking ? "Booking..." : "Confirm Booking"}
          </button>
        </>
      }
    >
      {unavailable ? (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          This therapist is currently <span className="font-semibold">unavailable</span>. Please choose another therapist.
        </div>
      ) : (
        <>
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
        </>
      )}
    </AppModal>
  );
}
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

// ✅ FontAwesome (react-icons / FA6)
import {
  FaUserDoctor,
  FaCalendarDays,
  FaClock,
  FaCircleCheck,
  FaCircleXmark,
  FaCircleInfo,
  FaMagnifyingGlass,
  FaBroom,
  FaPenToSquare,
  FaPhone,
  FaEnvelope,
  FaXmark,
  FaUserGroup,
  FaMoneyCheckDollar,
  FaComments,
  FaStar,
} from "react-icons/fa6";
   
const MY_BOOKINGS_ENDPOINT = "/api/bookings/me"; // GET
const RESCHEDULE_ENDPOINT = (id) => `/api/bookings/${id}/reschedule`; // PUT { date, time }
const CANCEL_ENDPOINT = (id) => `/api/bookings/${id}`; // DELETE
const REVIEW_ENDPOINT = (id) => `/api/bookings/${id}/review`; // POST { rating, comment }

const SESSION_MINUTES = 30;

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

function normalizeStatus(value, fallback = "") {
  return String(value || fallback).trim().toUpperCase();
}

function getPaymentDisplay(paymentStatus) {
  const p = normalizeStatus(paymentStatus, "UNKNOWN");

  if (p === "COMPLETED") {
    return {
      label: "PAID",
      className: "text-green-600",
      icon: FaCircleCheck,
    };
  }

  if (p === "FAILED" || p === "EXPIRED" || p === "USER CANCELED" || p === "USER CANCELLED") {
    return {
      label: p,
      className: "text-red-600",
      icon: FaCircleXmark,
    };
  }

  return {
    label: p,
    className: "text-yellow-600",
    icon: FaCircleInfo,
  };
}

function getBookingDisplayStatus(bookingStatus, paymentStatus, date, time) {
  const rawStatus = normalizeStatus(bookingStatus, "PENDING");
  const rawPayment = normalizeStatus(paymentStatus, "UNKNOWN");

  const isCancelled = rawStatus === "CANCELLED" || rawStatus === "CANCELED";

  const start = parseLocalDateTime(date, time);
  const end = start ? addMinutes(start, SESSION_MINUTES) : null;
  const isCompletedByTime =
    !isCancelled &&
    rawStatus === "CONFIRMED" &&
    end instanceof Date &&
    !Number.isNaN(end) &&
    end.getTime() < Date.now();

  if (isCancelled) {
    return {
      label: "CANCELLED",
      className: "text-red-600",
      icon: FaCircleXmark,
      disabled: true,
      helperText: "This booking was cancelled.",
    };
  }

  if (isCompletedByTime) {
    return {
      label: "COMPLETED",
      className: "text-gray-600",
      icon: FaCircleCheck,
      disabled: true,
      helperText: "This session is completed.",
    };
  }

  if (rawPayment === "COMPLETED" && rawStatus === "PENDING") {
    return {
      label: "AWAITING THERAPIST APPROVAL",
      className: "text-amber-600",
      icon: FaCircleInfo,
      disabled: false,
      helperText: "Your payment was successful. The therapist still needs to approve this booking.",
    };
  }

  if (rawStatus === "CONFIRMED") {
    return {
      label: "CONFIRMED",
      className: "text-green-600",
      icon: FaCircleCheck,
      disabled: false,
      helperText: "",
    };
  }

  return {
    label: rawStatus,
    className: "text-blue-600",
    icon: FaCircleInfo,
    disabled: false,
    helperText: "",
  };
}

export default function Bookings() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);

  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBookingObj, setCancelBookingObj] = useState(null);
  const [canceling, setCanceling] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get(MY_BOOKINGS_ENDPOINT);
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setBookings(list);
    } catch (err) {
      console.error("LOAD BOOKINGS ERROR:", err?.response?.status, err?.response?.data);
      toast.error(getErrorMessage(err) || "Could not load bookings.");
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
  }, [open, therapistId, date, time]);

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
      toast.error(getErrorMessage(err) || "Reschedule failed.");
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
      toast.error(getErrorMessage(err) || "Cancel failed.");
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

  const openReview = (b) => {
    setReviewBooking(b);
    setReviewRating(5);
    setReviewComment("");
    setReviewOpen(true);
  };

  const closeReview = () => {
    setReviewOpen(false);
    setReviewBooking(null);
    setReviewRating(5);
    setReviewComment("");
    setReviewSubmitting(false);
  };

  const submitReview = async () => {
    if (!reviewBooking?.id) return;

    try {
      setReviewSubmitting(true);
      await api.post(REVIEW_ENDPOINT(reviewBooking.id), {
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });
      toast.success("Review submitted successfully.");
      closeReview();
      loadBookings();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Could not submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;

    return bookings.filter((b) => {
      const name = String(b?.therapistName || b?.therapist?.name || "").toLowerCase();
      const d = String(b?.date || "").toLowerCase();
      const t = String(b?.time || "").toLowerCase();
      const s = String(b?.status || "").toLowerCase();
      const p = String(b?.paymentStatus || "").toLowerCase();

      return name.includes(q) || d.includes(q) || t.includes(q) || s.includes(q) || p.includes(q);
    });
  }, [bookings, search]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Booking History</h1>
            <p className="mt-1 text-sm text-gray-600">
              View your bookings, payment progress, reschedule sessions, cancel, or contact your therapist.
            </p>
          </div>

          <button
            onClick={() => navigate("/therapists")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4a6cf7] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#3f5ee0]"
          >
            <FaUserGroup />
            Find Therapists
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <FaMagnifyingGlass />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by therapist, date, time, booking status, or payment..."
              className="w-full rounded-full border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {search.trim() ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              <FaBroom />
              Clear
            </button>
          ) : null}

          <div className="text-sm text-gray-500 sm:ml-auto">
            Showing <span className="font-semibold text-gray-800">{filteredBookings.length}</span>{" "}
            booking{filteredBookings.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="text-sm text-gray-600">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
              No bookings found.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredBookings.map((b) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  onReschedule={() => openReschedule(b)}
                  onCancel={() => openCancelModal(b)}
                  onContact={() => contactTherapist(b)}
                  onChat={() => navigate(`/bookings/${b.id}/chat`)}
                  onReview={() => openReview(b)}
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

      {reviewOpen && (
        <ReviewModal
          booking={reviewBooking}
          rating={reviewRating}
          setRating={setReviewRating}
          comment={reviewComment}
          setComment={setReviewComment}
          onClose={closeReview}
          onSubmit={submitReview}
          submitting={reviewSubmitting}
        />
      )}
    </div>
  );
}

function BookingCard({ b, onReschedule, onCancel, onContact, onChat, onReview }) {
  const therapistName = b.therapistName || "Therapist";
  const therapistRole = b?.therapistSpecialization || b?.therapistRole || b?.therapistType || "Therapist";
  const therapistQualification = b?.therapistQualification || "Not provided";
  const therapistExperience = b?.therapistExperienceYears ?? b?.therapistExperience ?? "Not provided";
  const therapistPrice =
    b?.therapistPricePerSession ?? b?.therapistSessionPrice ?? b?.pricePerSession ?? null;
  const therapistRating = Number(b?.therapistAverageReview ?? b?.therapistRating ?? 0);
  const therapistReviewCount = Number(b?.therapistReviewCount ?? b?.reviews ?? 0);
  const therapistImage = resolveImageUrl(
    b?.therapistProfilePictureUrl || b?.therapistAvatarUrl || b?.therapistImageUrl || ""
  );

  const bookingDisplay = getBookingDisplayStatus(b.status, b.paymentStatus, b.date, b.time);
  const paymentDisplay = getPaymentDisplay(b.paymentStatus);

  const BookingStatusIcon = bookingDisplay.icon;
  const PaymentStatusIcon = paymentDisplay.icon;

  const actionsDisabled =
    normalizeStatus(b.status) === "CANCELLED" ||
    bookingDisplay.label === "COMPLETED";
  const canChat = normalizeStatus(b.status) === "CONFIRMED";
  const canReview = bookingDisplay.label === "COMPLETED" && !b?.reviewSubmitted;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
          {therapistImage ? (
            <img src={therapistImage} alt={therapistName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-500">
              <FaUserDoctor />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-gray-900">{therapistName}</div>
          <div className="truncate text-xs text-gray-500">{therapistRole}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            <FaStar className="text-amber-500" />
            <span className="font-semibold text-slate-700">{Number.isFinite(therapistRating) ? therapistRating.toFixed(1) : "0.0"}</span>
            <span>
              ({Number.isFinite(therapistReviewCount) ? therapistReviewCount : 0} reviews)
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs">
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <span className="text-slate-400">Qualification</span>
          <span className="font-medium text-slate-700">{therapistQualification}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <span className="text-slate-400">Experience</span>
          <span className="font-medium text-slate-700">
            {therapistExperience === "Not provided" ? therapistExperience : `${therapistExperience}+ Years`}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <span className="text-slate-400">Price per session</span>
          <span className="font-semibold text-[#4a6cf7]">
            {therapistPrice == null ? "—" : `Rs. ${therapistPrice}`}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-600">
          <div className="flex items-center gap-1">
            <FaCalendarDays className="text-slate-400" />
            <span className="font-medium">{b.date || "-"}</span>
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-600">
          <div className="flex items-center gap-1">
            <FaClock className="text-slate-400" />
            <span className="font-medium">{b.time || "-"}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-1.5 text-xs text-gray-600">
        <div className="flex items-center justify-between gap-4">
          <span>Booking</span>
          <span className={`inline-flex items-center gap-1.5 text-right font-semibold ${bookingDisplay.className}`}>
            <BookingStatusIcon />
            {bookingDisplay.label}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1">
            <FaMoneyCheckDollar className="text-gray-400" />
            Payment
          </span>
          <span className={`inline-flex items-center gap-1.5 text-right font-semibold ${paymentDisplay.className}`}>
            <PaymentStatusIcon />
            {paymentDisplay.label}
          </span>
        </div>
      </div>

      {b?.therapistMessage ? (
        <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-2.5 text-xs text-yellow-800">
          <span className="font-semibold">Therapist note:</span> {b.therapistMessage}
        </div>
      ) : null}

      {bookingDisplay.helperText ? (
        <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 p-2.5 text-xs text-blue-800">
          {bookingDisplay.helperText}
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {!actionsDisabled ? (
          <>
            <button
              onClick={canChat ? onChat : onContact}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#4a6cf7] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3f5ee0]"
            >
              {canChat ? <FaComments /> : b?.therapistEmail ? <FaEnvelope /> : <FaPhone />}
              {canChat ? "Open Chat" : "Contact Therapist"}
            </button>

            <div className="flex gap-2">
              <button
                onClick={onReschedule}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <FaPenToSquare />
                Change Date/Time
              </button>

              <button
                onClick={onCancel}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <FaCircleXmark />
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={canReview ? onReview : undefined}
              disabled={!canReview}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-white ${
                canReview ? "bg-[#4a6cf7] hover:bg-[#3f5ee0]" : "cursor-not-allowed bg-slate-300"
              }`}
            >
              {canReview ? "Rate This Session" : bookingDisplay.label === "COMPLETED" ? "Session Completed" : "Booking Cancelled"}
            </button>

            <div className="rounded-md border border-gray-100 bg-gray-50 p-2.5 text-xs text-gray-600">
              {bookingDisplay.label === "COMPLETED"
                ? "This session is completed."
                : "This booking was cancelled."}
            </div>

            {bookingDisplay.label === "COMPLETED" && b?.reviewSubmitted && (
              <div className="rounded-md border border-emerald-100 bg-emerald-50 p-2.5 text-xs text-emerald-800">
                Review submitted {b?.reviewRating ? `(${b.reviewRating}/5)` : ""}.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReviewModal({ booking, rating, setRating, comment, setComment, onClose, onSubmit, submitting }) {
  const therapistName = booking?.therapistName || "Therapist";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Rate your therapist</h2>
            <p className="mt-1 text-sm text-gray-600">
              Session with <span className="font-semibold">{therapistName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            <FaXmark />
          </button>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700">Your rating</div>
          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRating(v)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  v <= rating ? "bg-amber-400 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Comment (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Share your experience"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className={`rounded-xl px-5 py-2 text-sm font-semibold text-white ${
              submitting ? "bg-blue-300 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
            }`}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
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
            className="inline-flex items-center justify-center rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            <FaXmark />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Select date</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <FaCalendarDays />
              </span>
              <input
                type="date"
                value={date}
                min={minDate}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 pl-11 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
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
                      <span className="inline-flex items-center gap-2">
                        <FaClock className={`${active ? "text-blue-700" : "text-gray-400"}`} />
                        {t}
                      </span>
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
            Close
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
            className="inline-flex items-center justify-center rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            <FaXmark />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-gray-600">
              <FaCalendarDays className="text-gray-400" />
              Date
            </span>
            <span className="font-semibold">{date}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-gray-600">
              <FaClock className="text-gray-400" />
              Time
            </span>
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
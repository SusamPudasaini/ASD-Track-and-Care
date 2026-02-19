import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

const THERAPISTS_ENDPOINT = "/api/therapists"; // GET
const CREATE_BOOKING_ENDPOINT = "/api/bookings"; // POST { therapistId, date, time }

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
    setSelectedTherapist(t);
    setDate("");
    setTime("");
    setOpen(true);
  };

  const closeBook = () => {
    setOpen(false);
    setSelectedTherapist(null);
  };

  const therapistName = useMemo(() => {
    if (!selectedTherapist) return "";
    return selectedTherapist.name || selectedTherapist.fullName || "Therapist";
  }, [selectedTherapist]);

  const createBooking = async () => {
    if (!selectedTherapist) return toast.error("Pick a therapist first.");
    if (!date) return toast.error("Select a date.");
    if (!time) return toast.error("Select a time.");

    const therapistId = selectedTherapist.id || selectedTherapist.therapistId;
    if (!therapistId) return toast.error("Therapist id missing.");

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
            <p className="mt-1 text-sm text-gray-600">
              Browse therapists and book a session.
            </p>
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
                <TherapistCard key={t.id || t.therapistId} t={t} onBook={() => openBook(t)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {open && (
        <BookModal
          therapistName={therapistName}
          date={date}
          time={time}
          setDate={setDate}
          setTime={setTime}
          onClose={closeBook}
          onBook={createBooking}
          booking={booking}
        />
      )}
    </div>
  );
}

function TherapistCard({ t, onBook }) {
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
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-gray-900">{name}</div>
          <div className="truncate text-sm text-gray-600">Qualification: {qualification}</div>
          <div className="mt-1 text-sm font-semibold text-gray-800">
            Price per session: <span className="text-gray-700">{price}</span>
          </div>
        </div>
      </div>

      <button
        onClick={onBook}
        className="mt-4 w-full rounded bg-[#4a6cf7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
      >
        Book Now
      </button>
    </div>
  );
}

function BookModal({ therapistName, date, time, setDate, setTime, onClose, onBook, booking }) {
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
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Select time</label>
              <span className="text-xs text-gray-500">9:00 AM – 6:00 PM</span>
            </div>

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
            onClick={onBook}
            disabled={booking}
            className={`rounded-lg px-5 py-2 text-sm font-semibold text-white ${
              booking ? "bg-blue-300 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
            }`}
          >
            {booking ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}
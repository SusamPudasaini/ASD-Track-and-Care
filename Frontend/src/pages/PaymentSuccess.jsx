import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import Navbar from "../components/navbar/Navbar";

const KHALTI_VERIFY_ENDPOINT = "/api/payments/khalti/verify"; // POST { pidx }
const CREATE_BOOKING_ENDPOINT = "/api/bookings"; // POST { therapistId, date, time, pidx }

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [working, setWorking] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setWorking(true);

        const pidx = params.get("pidx");
        if (!pidx) {
          toast.error("Missing payment reference (pidx).");
          navigate("/therapists");
          return;
        }

        const pendingRaw = localStorage.getItem("pending_booking");
        if (!pendingRaw) {
          toast.error("No pending booking found.");
          navigate("/therapists");
          return;
        }

        const pending = JSON.parse(pendingRaw);

        // 1) verify payment on backend
        await api.post(KHALTI_VERIFY_ENDPOINT, { pidx });

        // 2) create booking
        await api.post(CREATE_BOOKING_ENDPOINT, {
          therapistId: pending.therapistId,
          date: pending.date,
          time: pending.time,
          pidx,
        });

        localStorage.removeItem("pending_booking");

        toast.success("Booking confirmed!");
        navigate("/bookings");
      } catch (err) {
        console.error("PAYMENT SUCCESS FLOW ERROR:", err?.response?.status, err?.response?.data);
        toast.error(err?.response?.data?.message || err?.response?.data || "Could not confirm booking.");
        navigate("/therapists");
      } finally {
        setWorking(false);
      }
    };

    run();
  }, [params, navigate]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-md border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Confirming your booking…</h1>
          <p className="mt-2 text-sm text-gray-600">
            {working ? "Please wait while we verify payment and create your booking." : "Done."}
          </p>
        </div>
      </main>
    </div>
  );
}

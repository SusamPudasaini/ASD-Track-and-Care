import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Please wait while we confirm your Khalti payment.");

  useEffect(() => {
    const pidx = params.get("pidx");

    async function verifyPayment() {
      try {
        if (!pidx) {
          setMessage("Missing payment reference.");
          toast.error("Missing payment reference.");
          setTimeout(() => navigate("/bookings", { replace: true }), 2000);
          return;
        }

        const res = await api.post(
          `/api/bookings/confirm-khalti?pidx=${encodeURIComponent(pidx)}`
        );

        if (res.data?.paymentStatus === "Completed") {
          setMessage("Payment verified successfully. Redirecting to your bookings...");
          toast.success("Payment verified successfully.");
        } else {
          setMessage(`Payment status: ${res.data?.paymentStatus || "Unknown"}. Redirecting...`);
          toast.error(`Payment status: ${res.data?.paymentStatus || "Unknown"}`);
        }

        setTimeout(() => {
          navigate("/bookings", { replace: true });
        }, 2500);
      } catch (err) {
        console.error(err);
        setMessage("Could not verify payment. Redirecting to bookings...");
        toast.error("Could not verify payment.");

        setTimeout(() => {
          navigate("/bookings", { replace: true });
        }, 2500);
      }
    }

    verifyPayment();
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Payment Verification</h1>
        <p className="mt-3 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}
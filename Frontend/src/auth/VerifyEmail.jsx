import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { FaCircleCheck, FaCircleXmark, FaSpinner, FaArrowRight, FaArrowLeft } from "react-icons/fa6";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [message, setMessage] = useState("Verifying your email...");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setSuccess(false);
      setMessage("Invalid or missing verification token.");
      return;
    }

    api
      .get(`/auth/verify?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setSuccess(true);
        setMessage(
          typeof res.data === "string"
            ? res.data
            : "Your email has been verified successfully."
        );
      })
      .catch((err) => {
        setSuccess(false);
        setMessage(
          err?.response?.data || "Verification failed. Please try again."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-120px] top-[28%] h-[300px] w-[300px] rotate-12 bg-blue-50" />
          <div className="absolute right-[-150px] bottom-[18%] h-[350px] w-[350px] -rotate-12 bg-blue-50" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-90px)] max-w-6xl items-center justify-center px-6 py-12">
          <div className="w-full max-w-[460px] rounded-2xl border border-blue-100 bg-white px-8 py-10 shadow-md">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                loading
                  ? "bg-blue-50 text-[#4a6cf7]"
                  : success
                  ? "bg-green-50 text-green-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {loading ? (
                <FaSpinner className="animate-spin text-3xl" />
              ) : success ? (
                <FaCircleCheck className="text-3xl" />
              ) : (
                <FaCircleXmark className="text-3xl" />
              )}
            </div>

            <h1 className="mt-6 text-center text-[24px] font-semibold text-gray-900">
              Email Verification
            </h1>

            <p className="mt-3 text-center text-sm leading-6 text-gray-600">
              {message}
            </p>

            {!loading && (
              <div
                className={`mt-5 rounded-xl px-4 py-3 text-sm ${
                  success
                    ? "border border-green-100 bg-green-50 text-green-700"
                    : "border border-red-100 bg-red-50 text-red-700"
                }`}
              >
                {success
                  ? "Your account is now active. You can continue to login."
                  : "The verification link may be invalid, expired, or already used."}
              </div>
            )}

            <div className="mt-8">
              {loading ? (
                <div className="flex w-full items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-500">
                  Please wait...
                </div>
              ) : success ? (
                <Link
                  to="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4a6cf7] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3f5ee0]"
                >
                  Go to Login
                  <FaArrowRight className="text-xs" />
                </Link>
              ) : (
                <Link
                  to="/signup"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <FaArrowLeft className="text-xs" />
                  Back to Signup
                </Link>
              )}
            </div>

            {!loading && !success && (
              <p className="mt-6 text-center text-xs leading-5 text-gray-500">
                You may need to request a new verification email if the old link has expired.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
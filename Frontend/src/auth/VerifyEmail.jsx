import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../api/axios";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [message, setMessage] = useState("Verifying your email...");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage("Invalid or missing verification token.");
      return;
    }

    api
      .get(`/auth/verify?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setSuccess(true);
        setMessage(res.data);
      })
      .catch((err) => {
        setSuccess(false);
        setMessage(err?.response?.data || "Verification failed. Please try again.");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full rounded bg-white p-6 shadow">
        <h1 className="text-xl font-semibold text-gray-900">Email Verification</h1>
        <p className="mt-3 text-sm text-gray-700">{message}</p>

        <div className="mt-6">
          {success ? (
            <Link to="/login" className="text-blue-600 hover:underline text-sm">
              Go to Login
            </Link>
          ) : (
            <Link to="/signup" className="text-blue-600 hover:underline text-sm">
              Back to Signup
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

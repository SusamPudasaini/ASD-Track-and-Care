import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");

    if (!email.trim()) {
      setErr("Email is required.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/forgot-password", { email: email.trim() });
      setMsg(res.data);
    } catch (e2) {
      setErr(e2?.response?.data || "Could not send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="mx-auto max-w-lg px-6 py-16">
        <div className="rounded-md bg-white p-8 shadow-md">
          <h1 className="text-xl font-semibold text-gray-900">Forgot Password</h1>
          <p className="mt-2 text-sm text-gray-500">
            Enter your email and we’ll send a reset link.
          </p>

          {msg && <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{msg}</div>}
          {err && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                className="mt-2 w-full rounded border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="you@gmail.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded py-2.5 text-sm font-semibold text-white ${
                loading ? "bg-blue-400 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
              }`}
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm">
            <Link to="/login" className="text-blue-600 hover:underline">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search).get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const pwErr = useMemo(() => {
    if (!newPassword.trim()) return "Password is required.";
    if (newPassword.length < 6) return "Password must be at least 6 characters.";
    return "";
  }, [newPassword]);

  const confirmErr = useMemo(() => {
    if (!confirm.trim()) return "Please confirm password.";
    if (confirm !== newPassword) return "Passwords do not match.";
    return "";
  }, [confirm, newPassword]);

  const canSubmit = token && !pwErr && !confirmErr;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");

    if (!token) {
      setErr("Invalid or missing reset token.");
      return;
    }
    if (!canSubmit) return;

    try {
      setLoading(true);
      const res = await api.post("/auth/reset-password", {
        token,
        newPassword,
      });
      setMsg(res.data);

      // optional: redirect to login after success
      setTimeout(() => navigate("/login"), 800);
    } catch (e2) {
      setErr(e2?.response?.data || "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="mx-auto max-w-lg px-6 py-16">
        <div className="rounded-md bg-white p-8 shadow-md">
          <h1 className="text-xl font-semibold text-gray-900">Reset Password</h1>

          {!token && (
            <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              Invalid or missing reset token.
            </div>
          )}

          {msg && <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{msg}</div>}
          {err && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e)=>setNewPassword(e.target.value)}
                className="mt-2 w-full rounded border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {newPassword && pwErr && <p className="mt-2 text-xs text-red-600">{pwErr}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e)=>setConfirm(e.target.value)}
                className="mt-2 w-full rounded border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {confirm && confirmErr && <p className="mt-2 text-xs text-red-600">{confirmErr}</p>}
            </div>

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className={`w-full rounded py-2.5 text-sm font-semibold text-white ${
                !canSubmit || loading ? "bg-blue-400 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
              }`}
            >
              {loading ? "Resetting..." : "Reset password"}
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

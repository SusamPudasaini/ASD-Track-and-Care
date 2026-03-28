import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faLock,
  faArrowRight,
  faSpinner,
  faTriangleExclamation,
  faEnvelopeCircleCheck,
} from "@fortawesome/free-solid-svg-icons";

function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  icon,
  rightElement,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>

      <div
        className={`flex items-center rounded border bg-white px-4 transition ${
          error
            ? "border-red-400 ring-1 ring-red-100"
            : "border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
        }`}
      >
        <FontAwesomeIcon icon={icon} className="mr-3 text-sm text-gray-400" />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className="w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
        />
        {rightElement}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function decodeJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");

    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [touched, setTouched] = useState({ username: false, password: false });
  const [serverError, setServerError] = useState("");

  const [isUnverified, setIsUnverified] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");

  const navigate = useNavigate();

  const usernameError = useMemo(() => {
    if (!touched.username) return "";
    if (!username.trim()) return "Username is required.";
    const ok = /^[a-zA-Z0-9_]{3,20}$/.test(username.trim());
    if (!ok) return "Username must be 3–20 characters using letters, numbers or underscore.";
    return "";
  }, [username, touched.username]);

  const passwordError = useMemo(() => {
    if (!touched.password) return "";
    if (!password.trim()) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return "";
  }, [password, touched.password]);

  const canSubmit = !usernameError && !passwordError && username.trim() && password.trim();

  const handleResend = async () => {
    setResendMsg("");

    if (!username.trim()) {
      toast.error("Please enter your username first.");
      return;
    }

    try {
      setResendLoading(true);
      const res = await api.post("/auth/resend-verification", {
        username: username.trim(),
      });

      const msg =
        typeof res.data === "string" ? res.data : "Verification email sent.";
      setResendMsg(msg);
      toast.success(msg);
    } catch (err) {
      const msg = err?.response?.data || "Could not resend verification email.";
      setResendMsg(msg);
      toast.error(msg);
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setServerError("");
    setResendMsg("");
    setIsUnverified(false);

    setTouched({ username: true, password: true });
    if (!canSubmit) return;

    try {
      setIsLoading(true);
      setLoadingStep("Checking credentials...");

      const res = await api.post("/auth/login", {
        username: username.trim(),
        password,
      });

      setLoadingStep("Preparing your account...");

      const token =
        res.data?.token || res.data?.accessToken || res.data?.jwt || res.data?.jwtToken;

      if (!token) {
        setServerError("Login succeeded, but token was not returned by the server.");
        toast.error("No token received. Check backend login response.");
        return;
      }

      localStorage.setItem("token", token);

      const payload = decodeJwt(token);
      const rawRole = (payload?.role || payload?.authorities?.[0] || "USER").toString();
      const role = rawRole.replace("ROLE_", "").toUpperCase();
      localStorage.setItem("role", role);

      try {
        const meRes = await api.get("/api/users/me");
        const me = meRes.data || {};
        localStorage.setItem("me", JSON.stringify(me));
        if (me.role) localStorage.setItem("role", me.role);
        if (me.profilePictureUrl) {
          localStorage.setItem("profilePictureUrl", me.profilePictureUrl);
        }
      } catch {
        // non-fatal
      }

      setLoadingStep("Redirecting...");
      toast.success("Logged in!");

      const finalRole = (localStorage.getItem("role") || role).toUpperCase();

      if (finalRole === "ADMIN") {
        navigate("/admin/request");
      } else if (finalRole === "THERAPIST") {
        navigate("/therapist/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data;

      if (status === 401) {
        setServerError("Invalid username or password. Please try again.");
        toast.error("Invalid username or password.");
        return;
      }

      if (status === 403) {
        setIsUnverified(true);
        if (msg === "EMAIL_NOT_VERIFIED") {
          setServerError("Your email has not been verified. Please verify it to login.");
        } else {
          setServerError(msg || "Your email has not been verified. Please verify it to login.");
        }
        toast.error("Please verify your email before logging in.");
        return;
      }

      setServerError(msg || "Login failed. Please try again.");
      toast.error(typeof msg === "string" ? msg : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-120px] top-[30%] h-[300px] w-[300px] rotate-12 bg-blue-50" />
          <div className="absolute right-[-150px] bottom-[20%] h-[350px] w-[350px] -rotate-12 bg-blue-50" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-90px)] max-w-6xl items-center justify-center px-6 py-12">
          <div className="w-full max-w-[420px] rounded-md bg-white px-8 py-10 shadow-md">
            <h1 className="text-center text-[22px] font-semibold text-gray-900">
              Sign in to your account
            </h1>
            <p className="mt-2 text-center text-sm text-gray-500">
              Login to your account to get started.
            </p>

            {isLoading && (
              <div className="mt-6 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  <span>{loadingStep || "Signing in..."}</span>
                </div>
              </div>
            )}

            {serverError && (
              <div className="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="flex items-start gap-3">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
                  <span>{serverError}</span>
                </div>
              </div>
            )}

            {isUnverified && (
              <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <FontAwesomeIcon
                    icon={faEnvelopeCircleCheck}
                    className="mt-0.5 text-amber-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">
                      Email verification required
                    </p>
                    <p className="mt-1 text-sm text-amber-700">
                      Please verify your email before logging in.
                    </p>

                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendLoading}
                      className="mt-3 inline-flex items-center rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-400"
                    >
                      {resendLoading ? "Resending..." : "Resend verification link"}
                    </button>

                    {resendMsg && (
                      <p className="mt-2 text-xs text-amber-800">{resendMsg}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-8 space-y-6">
              <Input
                label="Username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, username: true }))}
                error={usernameError}
                icon={faUser}
              />

              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                error={passwordError}
                icon={faLock}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="px-2 text-sm text-gray-500 hover:text-gray-800"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                }
              />

              <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Forgot Password?
              </Link>

              <button
                type="submit"
                disabled={!canSubmit || isLoading}
                className={`inline-flex w-full items-center justify-center gap-2 rounded py-2.5 text-sm font-semibold text-white transition ${
                  !canSubmit || isLoading
                    ? "cursor-not-allowed bg-blue-400"
                    : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                }`}
              >
                {isLoading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    {loadingStep || "Signing in..."}
                  </>
                ) : (
                  <>
                    Sign in
                    <FontAwesomeIcon icon={faArrowRight} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Don&apos;t you have an account?{" "}
              <Link to="/signup" className="text-blue-600 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
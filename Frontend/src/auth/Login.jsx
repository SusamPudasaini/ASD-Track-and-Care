import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import toast from "react-hot-toast";

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

  const navigate = useNavigate();

  const usernameError = useMemo(() => {
    if (!touched.username) return "";
    if (!username.trim()) return "Username is required.";
    const ok = /^[a-zA-Z0-9_]{3,20}$/.test(username.trim());
    if (!ok) return "Username must be 3–20 characters (letters, numbers, underscore).";
    return "";
  }, [username, touched.username]);

  const passwordError = useMemo(() => {
    if (!touched.password) return "";
    if (!password.trim()) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return "";
  }, [password, touched.password]);

  const canSubmit =
    !usernameError && !passwordError && username.trim() && password.trim();

  const handleResend = async () => {
    setResendMsg("");

    if (!username.trim()) {
      setResendMsg("Please enter your username first.");
      return;
    }

    try {
      setResendLoading(true);
      const res = await api.post("/auth/resend-verification", {
        username: username.trim(),
      });
      setResendMsg(res.data);
    } catch (err) {
      setResendMsg(err?.response?.data || "Could not resend verification email.");
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

      const res = await api.post("/auth/login", {
        username: username.trim(),
        password,
      });

      // ✅ See what backend returns (keep for now, remove later)
      console.log("LOGIN RESPONSE:", res.data);

      // ✅ support common token names
      const token =
        res.data?.token || res.data?.accessToken || res.data?.jwt || res.data?.jwtToken;

      if (!token) {
        setServerError("Login succeeded, but token was not returned by the server.");
        toast.error("No token received. Check backend login response.");
        return;
      }

      localStorage.setItem("token", token);

      // Optional: store user info if backend returns it
      // if (res.data?.user) localStorage.setItem("user", JSON.stringify(res.data.user));

      toast.success("Logged in!");
      navigate("/");
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data;

      if (status === 401) {
        setServerError("Invalid username or password. Please try again.");
        return;
      }

      if (status === 403) {
        setIsUnverified(true);
        if (msg === "EMAIL_NOT_VERIFIED") {
          setServerError("Your email has not been verified. Please verify it to login.");
        } else {
          setServerError(msg || "Your email has not been verified. Please verify it to login.");
        }
        return;
      }

      setServerError(msg || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
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

            {serverError && (
              <div className="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            {isUnverified && (
              <div className="mt-3 text-sm">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-blue-600 hover:underline disabled:text-blue-300"
                >
                  {resendLoading ? "Resending..." : "Resend verification link"}
                </button>

                {resendMsg && (
                  <p className="mt-2 text-xs text-gray-600">{resendMsg}</p>
                )}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, username: true }))}
                  className={`mt-2 w-full rounded border px-4 py-2.5 text-sm outline-none focus:ring-1
                    ${
                      usernameError
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                />
                {usernameError && (
                  <p className="mt-2 text-xs text-red-600">{usernameError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative mt-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                    className={`w-full rounded border px-4 py-2.5 pr-12 text-sm outline-none focus:ring-1
                      ${
                        passwordError
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-sm text-gray-500 hover:text-gray-800"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-2 text-xs text-red-600">{passwordError}</p>
                )}
              </div>

              <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Forgot Password?
              </Link>

              <button
                type="submit"
                disabled={!canSubmit || isLoading}
                className={`w-full rounded py-2.5 text-sm font-semibold text-white transition
                  ${
                    !canSubmit || isLoading
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                  }`}
              >
                {isLoading ? "Signing in..." : "Sign in"}
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

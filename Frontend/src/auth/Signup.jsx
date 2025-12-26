import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/navbar/Navbar";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // ---- validation helpers ----
  const emailValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const fullNameError = useMemo(() => {
    if (!touched.fullName) return "";
    if (!fullName.trim()) return "Full name is required.";
    if (fullName.trim().length < 2) return "Full name must be at least 2 characters.";
    return "";
  }, [fullName, touched.fullName]);

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!email.trim()) return "Email is required.";
    if (!emailValid(email)) return "Please enter a valid email address.";
    return "";
  }, [email, touched.email]);

 const passwordError = useMemo(() => {
  if (!touched.password) return "";
  if (!password.trim()) return "Password is required.";
  if (password.length < 6)
    return "Password must be at least 6 characters.";

  const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
  if (!specialCharRegex.test(password))
    return "Password must contain at least one special character.";

  return "";
}, [password, touched.password]);

  const confirmError = useMemo(() => {
    if (!touched.confirmPassword) return "";
    if (!confirmPassword.trim()) return "Please confirm your password.";
    if (confirmPassword !== password) return "Passwords do not match.";
    return "";
  }, [confirmPassword, password, touched.confirmPassword]);

  const canSubmit =
    !fullNameError &&
    !emailError &&
    !passwordError &&
    !confirmError &&
    fullName.trim() &&
    email.trim() &&
    password.trim() &&
    confirmPassword.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!canSubmit) return;

    try {
      setIsLoading(true);

      
      await axios.post("http://localhost:8081/auth/signup", {
        fullName,
        email,
        password,
      });

      // redirecting to login on success
      navigate("/login", { replace: true });
    } catch (err) {
      setServerError("Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <Navbar />

      <main className="relative overflow-hidden">

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-120px] top-[30%] h-[300px] w-[300px] rotate-12 bg-blue-50" />
          <div className="absolute right-[-150px] bottom-[20%] h-[350px] w-[350px] -rotate-12 bg-blue-50" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-90px)] max-w-6xl items-center justify-center px-6 py-12">
          {/* signup card */}
          <div className="w-full max-w-[420px] rounded-md bg-white px-8 py-10 shadow-md">
            <h1 className="text-center text-[22px] font-semibold text-gray-900">
              Create your account
            </h1>
            <p className="mt-2 text-center text-sm text-gray-500">
              Create Your Account to get started
            </p>

            {/* server error */}
            {serverError && (
              <div className="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
                  className={`mt-2 w-full rounded border px-4 py-2.5 text-sm outline-none focus:ring-1
                    ${
                      fullNameError
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                />
                {fullNameError && (
                  <p className="mt-2 text-xs text-red-600">{fullNameError}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Your Email
                </label>
                <input
                  type="email"
                  placeholder="Enter your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                  className={`mt-2 w-full rounded border px-4 py-2.5 text-sm outline-none focus:ring-1
                    ${
                      emailError
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                />
                {emailError && (
                  <p className="mt-2 text-xs text-red-600">{emailError}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Your Password
                </label>
                <div className="relative mt-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your Password"
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
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-2 text-xs text-red-600">{passwordError}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="relative mt-2">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm your Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() =>
                      setTouched((p) => ({ ...p, confirmPassword: true }))
                    }
                    className={`w-full rounded border px-4 py-2.5 pr-12 text-sm outline-none focus:ring-1
                      ${
                        confirmError
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-sm text-gray-500 hover:text-gray-800"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirm ? "🙈" : "👁️"}
                  </button>
                </div>
                {confirmError && (
                  <p className="mt-2 text-xs text-red-600">{confirmError}</p>
                )}
              </div>

              {/* Terms line*/}
              <p className="text-xs text-gray-500">
                By creating account means you agree to the{" "}
                <span className="text-blue-600">Terms and Conditions</span>, and our{" "}
                <span className="text-blue-600">Privacy Policy</span>.
              </p>

              {/* Submit */}
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
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creating...
                  </span>
                ) : (
                  "Sign up"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already using Startup?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

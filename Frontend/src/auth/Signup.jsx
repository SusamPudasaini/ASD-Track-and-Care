import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    username: false,
    phoneNumber: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // helpers
  const emailValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const usernameValid = (value) => /^[a-zA-Z0-9_]{3,20}$/.test(value.trim());
  const phoneValid = (value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  };

  const firstNameError = useMemo(() => {
    if (!touched.firstName) return "";
    if (!firstName.trim()) return "First name is required.";
    if (firstName.trim().length < 2) return "First name must be at least 2 characters.";
    return "";
  }, [firstName, touched.firstName]);

  const lastNameError = useMemo(() => {
    if (!touched.lastName) return "";
    if (!lastName.trim()) return "Last name is required.";
    if (lastName.trim().length < 2) return "Last name must be at least 2 characters.";
    return "";
  }, [lastName, touched.lastName]);

  const usernameError = useMemo(() => {
    if (!touched.username) return "";
    if (!username.trim()) return "Username is required.";
    if (!usernameValid(username)) return "Username must be 3–20 characters (letters, numbers, underscore).";
    return "";
  }, [username, touched.username]);

  const phoneError = useMemo(() => {
    if (!touched.phoneNumber) return "";
    if (!phoneNumber.trim()) return "Phone number is required.";
    if (!phoneValid(phoneNumber)) return "Enter a valid phone number (7–15 digits).";
    return "";
  }, [phoneNumber, touched.phoneNumber]);

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!email.trim()) return "Email is required.";
    if (!emailValid(email)) return "Please enter a valid email address.";
    return "";
  }, [email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password) return "";
    if (!password.trim()) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (!specialCharRegex.test(password)) return "Password must contain at least one special character.";
    return "";
  }, [password, touched.password]);

  const confirmError = useMemo(() => {
    if (!touched.confirmPassword) return "";
    if (!confirmPassword.trim()) return "Please confirm your password.";
    if (confirmPassword !== password) return "Passwords do not match.";
    return "";
  }, [confirmPassword, password, touched.confirmPassword]);

  const canSubmit =
    !firstNameError &&
    !lastNameError &&
    !usernameError &&
    !phoneError &&
    !emailError &&
    !passwordError &&
    !confirmError &&
    firstName.trim() &&
    lastName.trim() &&
    username.trim() &&
    phoneNumber.trim() &&
    email.trim() &&
    password.trim() &&
    confirmPassword.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    setTouched({
      firstName: true,
      lastName: true,
      username: true,
      phoneNumber: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!canSubmit) return;

    try {
      setIsLoading(true);

      await api.post("/auth/signup", {
        firstName,
        lastName,
        username,
        phoneNumber,
        email,
        password,
      });

      // ✅ after signup user should check email (not verify-email directly)
      navigate("/check-email", { state: { email } });
    } catch (err) {
      setServerError(err?.response?.data || "Signup failed. Please try again.");
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
          <div className="w-full max-w-[480px] rounded-md bg-white px-8 py-10 shadow-md">
            <h1 className="text-center text-[22px] font-semibold text-gray-900">
              Create your account
            </h1>
            <p className="mt-2 text-center text-sm text-gray-500">
              Create Your Account to get started
            </p>

            {serverError && (
              <div className="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {/* Personal Information */}
              <div className="rounded-md border border-gray-100 bg-gray-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Personal Information
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      placeholder="Enter first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, firstName: true }))}
                      className={`mt-2 w-full rounded border px-4 py-2.5 text-sm outline-none focus:ring-1
                        ${firstNameError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"}`}
                    />
                    {firstNameError && <p className="mt-2 text-xs text-red-600">{firstNameError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      placeholder="Enter last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, lastName: true }))}
                      className={`mt-2 w-full rounded border px-4 py-2.5 text-sm outline-none focus:ring-1
                        ${lastNameError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"}`}
                    />
                    {lastNameError && <p className="mt-2 text-xs text-red-600">{lastNameError}</p>}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, phoneNumber: true }))}
                    className={`mt-2 w-full rounded border px-4 py-2.5 text-sm outline-none focus:ring-1
                      ${phoneError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"}`}
                  />
                  {phoneError && <p className="mt-2 text-xs text-red-600">{phoneError}</p>}
                </div>
              </div>

              {/* Username section */}
              <div className="rounded-md border border-gray-100 bg-gray-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Account Username
                </p>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, username: true }))}
                    className={`mt-2 w-full rounded border px-4 py-2.5 text-sm outline-none focus:ring-1
                      ${usernameError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"}`}
                  />
                  {usernameError && <p className="mt-2 text-xs text-red-600">{usernameError}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                  className={`mt-2 w-full rounded border px-4 py-2.5 text-sm outline-none focus:ring-1
                    ${emailError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"}`}
                />
                {emailError && <p className="mt-2 text-xs text-red-600">{emailError}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative mt-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                    className={`w-full rounded border px-4 py-2.5 pr-12 text-sm outline-none focus:ring-1
                      ${passwordError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-sm text-gray-500 hover:text-gray-800"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {passwordError && <p className="mt-2 text-xs text-red-600">{passwordError}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <div className="relative mt-2">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                    className={`w-full rounded border px-4 py-2.5 pr-12 text-sm outline-none focus:ring-1
                      ${confirmError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-sm text-gray-500 hover:text-gray-800"
                  >
                    {showConfirm ? "🙈" : "👁️"}
                  </button>
                </div>
                {confirmError && <p className="mt-2 text-xs text-red-600">{confirmError}</p>}
              </div>

              <button
                type="submit"
                disabled={!canSubmit || isLoading}
                className={`w-full rounded py-2.5 text-sm font-semibold text-white transition
                  ${!canSubmit || isLoading ? "bg-blue-400 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"}`}
              >
                {isLoading ? "Creating..." : "Sign up"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
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

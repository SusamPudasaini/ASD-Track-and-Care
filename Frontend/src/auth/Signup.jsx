import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faPhone,
  faLock,
  faArrowRight,
  faArrowLeft,
  faCircleCheck,
  faIdBadge,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

function StepPill({ number, title, active, completed }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition ${
          completed
            ? "border-emerald-500 bg-emerald-50 text-emerald-600"
            : active
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-gray-300 bg-white text-gray-500"
        }`}
      >
        {completed ? <FontAwesomeIcon icon={faCircleCheck} /> : number}
      </div>

      <div className="hidden sm:block leading-tight">
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
            active || completed ? "text-gray-900" : "text-gray-400"
          }`}
        >
          Step {number}
        </p>
        <p className={`text-sm ${active || completed ? "text-gray-700" : "text-gray-400"}`}>
          {title}
        </p>
      </div>
    </div>
  );
}

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
        className={`flex items-center rounded-2xl border bg-white px-4 transition ${
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
          className="w-full bg-transparent py-3.5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
        />
        {rightElement}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Signup() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState({
    usernameAvailable: null,
    emailAvailable: null,
    phoneAvailable: null,
  });

  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    username: false,
    phoneNumber: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);

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
    if (!usernameValid(username)) {
      return "Username must be 3–20 characters using letters, numbers or underscore.";
    }
    if (availability.usernameAvailable === false) {
      return "Username is already taken.";
    }
    return "";
  }, [username, touched.username, availability.usernameAvailable]);

  const phoneError = useMemo(() => {
    if (!touched.phoneNumber) return "";
    if (!phoneNumber.trim()) return "Phone number is required.";
    if (!phoneValid(phoneNumber)) return "Enter a valid phone number (7–15 digits).";
    if (availability.phoneAvailable === false) {
      return "Phone number is already registered.";
    }
    return "";
  }, [phoneNumber, touched.phoneNumber, availability.phoneAvailable]);

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!email.trim()) return "Email is required.";
    if (!emailValid(email)) return "Please enter a valid email address.";
    if (availability.emailAvailable === false) {
      return "Email is already registered.";
    }
    return "";
  }, [email, touched.email, availability.emailAvailable]);

  const passwordError = useMemo(() => {
    if (!touched.password) return "";
    if (!password.trim()) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (!specialCharRegex.test(password)) {
      return "Password must contain at least one special character.";
    }
    return "";
  }, [password, touched.password]);

  const confirmError = useMemo(() => {
    if (!touched.confirmPassword) return "";
    if (!confirmPassword.trim()) return "Please confirm your password.";
    if (confirmPassword !== password) return "Passwords do not match.";
    return "";
  }, [confirmPassword, password, touched.confirmPassword]);

  const handleNextFromStep1 = () => {
    setTouched((prev) => ({
      ...prev,
      firstName: true,
      lastName: true,
    }));

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Please fill in your first and last name.");
      return;
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      toast.error("Please enter valid first and last name.");
      return;
    }

    setStep(2);
  };

  const checkAvailabilityFromBackend = async () => {
    const res = await api.get("/auth/check-availability", {
      params: {
        username: username.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
      },
    });

    const data = res.data || {};

    setAvailability({
      usernameAvailable: data.usernameAvailable ?? true,
      emailAvailable: data.emailAvailable ?? true,
      phoneAvailable: data.phoneAvailable ?? true,
    });

    return data;
  };

  const handleNextFromStep2 = async () => {
    setTouched((prev) => ({
      ...prev,
      username: true,
      email: true,
      phoneNumber: true,
    }));

    if (!username.trim() || !email.trim() || !phoneNumber.trim()) {
      toast.error("Please complete username, email, and phone number.");
      return;
    }

    if (!usernameValid(username)) {
      toast.error("Please enter a valid username.");
      return;
    }

    if (!emailValid(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!phoneValid(phoneNumber)) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    try {
      setCheckingAvailability(true);

      const data = await checkAvailabilityFromBackend();

      if (
        data.usernameAvailable === false ||
        data.emailAvailable === false ||
        data.phoneAvailable === false
      ) {
        toast.error("Please resolve the already used details before continuing.");
        return;
      }

      toast.success("Details available. Continue with password.");
      setStep(3);
    } catch {
      toast.error("Could not verify account details right now.");
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleBack = () => {
    if (isLoading) return;
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setTouched({
      firstName: true,
      lastName: true,
      username: true,
      phoneNumber: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!password.trim() || !confirmPassword.trim()) {
      toast.error("Please complete the password fields.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (!password.match(/[!@#$%^&*(),.?":{}|<>]/)) {
      toast.error("Password must contain at least one special character.");
      return;
    }

    if (confirmPassword !== password) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);

      setLoadingStep("Validating password...");
      setLoadingProgress(20);
      await sleep(3000);

      setLoadingStep("Creating user...");
      setLoadingProgress(55);
      await api.post("/auth/signup", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        password,
      });

      await sleep(3000);

      setLoadingStep("Sending verification email...");
      setLoadingProgress(85);
      await sleep(3000);

      setLoadingProgress(100);
      toast.success("Account created. Please verify your email.");
      navigate("/check-email", { state: { email } });
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data;

      if (status === 409) {
        toast.error(typeof message === "string" ? message : "Some details already exist.");
        setStep(2);
        return;
      }

      toast.error(typeof message === "string" ? message : "Signup failed.");
    } finally {
      setIsLoading(false);
      setLoadingStep("");
      setLoadingProgress(0);
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
          <div className="w-full max-w-[720px] rounded-md bg-white px-8 py-10 shadow-md">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-semibold text-gray-900">Create your account</h1>
                <p className="mt-2 text-sm text-gray-500">
                  Complete the steps below to get started.
                </p>
              </div>

              <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                Step {step} of 3
              </div>
            </div>

            <div className="mb-8 flex items-center gap-3 sm:gap-4">
              <StepPill number={1} title="Your name" active={step === 1} completed={step > 1} />
              <div className="h-px flex-1 bg-gray-200" />
              <StepPill number={2} title="Account info" active={step === 2} completed={step > 2} />
              <div className="h-px flex-1 bg-gray-200" />
              <StepPill number={3} title="Security" active={step === 3} completed={false} />
            </div>

            {isLoading && (
              <div className="mb-8 rounded border border-blue-200 bg-blue-50 px-4 py-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    <span>{loadingStep || "Processing..."}</span>
                  </div>
                  <span className="text-xs font-semibold text-blue-700">{loadingProgress}%</span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-[#4a6cf7] transition-all duration-700 ease-in-out"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">What’s your name?</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start with your personal details.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Input
                      label="First Name"
                      placeholder="Enter first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, firstName: true }))}
                      error={firstNameError}
                      icon={faUser}
                    />

                    <Input
                      label="Last Name"
                      placeholder="Enter last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, lastName: true }))}
                      error={lastNameError}
                      icon={faUser}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleNextFromStep1}
                      disabled={isLoading}
                      className="inline-flex min-w-[132px] items-center justify-center gap-2 rounded bg-[#4a6cf7] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3f5ee0] disabled:cursor-not-allowed disabled:bg-blue-400"
                    >
                      Next
                      <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Set up your account</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      These details must be unique before you continue.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <Input
                      label="Username"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setAvailability((prev) => ({ ...prev, usernameAvailable: null }));
                      }}
                      onBlur={() => setTouched((p) => ({ ...p, username: true }))}
                      error={usernameError}
                      icon={faIdBadge}
                    />

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <Input
                        label="Email Address"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setAvailability((prev) => ({ ...prev, emailAvailable: null }));
                        }}
                        onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                        error={emailError}
                        icon={faEnvelope}
                      />

                      <Input
                        label="Phone Number"
                        type="tel"
                        placeholder="Enter phone number"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          setAvailability((prev) => ({ ...prev, phoneAvailable: null }));
                        }}
                        onBlur={() => setTouched((p) => ({ ...p, phoneNumber: true }))}
                        error={phoneError}
                        icon={faPhone}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={checkingAvailability || isLoading}
                      className="inline-flex min-w-[132px] items-center justify-center gap-2 rounded border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FontAwesomeIcon icon={faArrowLeft} />
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={handleNextFromStep2}
                      disabled={checkingAvailability || isLoading}
                      className={`inline-flex min-w-[160px] items-center justify-center gap-2 rounded px-6 py-2.5 text-sm font-semibold text-white transition ${
                        checkingAvailability || isLoading
                          ? "cursor-not-allowed bg-blue-400"
                          : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                      }`}
                    >
                      {checkingAvailability ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          Next
                          <FontAwesomeIcon icon={faArrowRight} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Create a password</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Finish by securing your account.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <Input
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                      error={passwordError}
                      icon={faLock}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="text-gray-500 transition hover:text-gray-800"
                        >
                          {showPassword ? "🙈" : "👁️"}
                        </button>
                      }
                    />

                    <Input
                      label="Confirm Password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                      error={confirmError}
                      icon={faLock}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowConfirm((s) => !s)}
                          className="text-gray-500 transition hover:text-gray-800"
                        >
                          {showConfirm ? "🙈" : "👁️"}
                        </button>
                      }
                    />
                  </div>

                  <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    Use at least 6 characters and include one special character.
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={isLoading}
                      className="inline-flex min-w-[132px] items-center justify-center gap-2 rounded border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FontAwesomeIcon icon={faArrowLeft} />
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`inline-flex min-w-[185px] items-center justify-center gap-2 rounded px-6 py-2.5 text-sm font-semibold text-white transition ${
                        isLoading
                          ? "cursor-not-allowed bg-blue-400"
                          : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                          {loadingStep || "Processing..."}
                        </>
                      ) : (
                        <>
                          Create account
                          <FontAwesomeIcon icon={faArrowRight} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
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
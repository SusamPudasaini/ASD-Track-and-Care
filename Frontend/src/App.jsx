import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./auth/Login";
import Logout from "./auth/Logout";
import Signup from "./auth/Signup";
import VerifyEmail from "./auth/VerifyEmail";
import CheckEmail from "./auth/CheckEmail";
import ForgotPassword from "./auth/ForgotPassword";
import ResetPassword from "./auth/ResetPassword";

import AdminTherapistApplications from "./pages/AdminTherapistApplications";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/navbar/Navbar";
import Questionnaire from "./pages/questionnaire";
import Profile from "./pages/Profile";
import TherapistApply from "./pages/TherapistsapplyHistory";
import TherapistApplyNew from "./pages/TherapistApplyNew";

import Bookings from "./pages/Bookings";
import PaymentSuccess from "./pages/PaymentSuccess";
import Therapists from "./pages/Therapists";

import { Toaster } from "react-hot-toast";

// ✅ Optional placeholder pages (create later)
function TherapistDashboard() {
  return (
    <>
      <Navbar />
      <div className="p-6">
        <h1 className="text-xl font-semibold">Therapist Dashboard</h1>
        <p>Coming next (therapist-side flow).</p>
      </div>
    </>
  );
}

function Home() {
  return (
    <>
      <Navbar />
      <div className="p-6">
        <h1 className="text-xl font-semibold">Home</h1>
        <p>Welcome to the home page.</p>
      </div>
    </>
  );
}

// ✅ Small helper (role from localStorage)
function getRole() {
  try {
    const raw = localStorage.getItem("me");
    const me = raw ? JSON.parse(raw) : null;
    const r = (me?.role || localStorage.getItem("role") || "").toString().toUpperCase();
    return r || "USER";
  } catch {
    return (localStorage.getItem("role") || "USER").toString().toUpperCase();
  }
}

// ✅ Role guard wrapper for routes
function RoleRoute({ allow, children }) {
  const role = getRole();
  if (!allow.includes(role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          {/* Shared for all logged-in roles */}
          <Route path="/" element={<Home />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/therapists" element={<Therapists />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />

          {/* USER routes */}
          <Route
            path="/therapist/apply"
            element={
              <RoleRoute allow={["USER"]}>
                <TherapistApply />
              </RoleRoute>
            }
          />
          <Route
            path="/therapist/apply/new"
            element={
              <RoleRoute allow={["USER"]}>
                <TherapistApplyNew />
              </RoleRoute>
            }
          />

          {/* ADMIN routes */}
          <Route
            path="/admin/request"
            element={
              <RoleRoute allow={["ADMIN"]}>
                <AdminTherapistApplications />
              </RoleRoute>
            }
          />

          {/* THERAPIST routes (placeholder for now) */}
          <Route
            path="/therapist/dashboard"
            element={
              <RoleRoute allow={["THERAPIST"]}>
                <TherapistDashboard />
              </RoleRoute>
            }
          />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}

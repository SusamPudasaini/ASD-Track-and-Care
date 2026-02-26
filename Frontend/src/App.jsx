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

import ActivitiesHub from "./pages/activities/ActivitiesHub";
import ReactionTime from "./pages/Activities/ReactionTime";
import SequenceMemory from "./pages/activities/SequenceMemory";
import NumberMemory from "./pages/activities/NumberMemory";

import VisualMemory from "./pages/activities/VisualMemory";
import SoundTherapy from "./pages/activities/SoundTherapy";

import Analytics from "./pages/Analytics";

import TherapistProfile from "./pages/TherapistProfile";


import Home from "./pages/Home";

import { Toaster } from "react-hot-toast";
import TherapistDashboardBookings from "./pages/TherapistsBookingApplcations";

// ✅ Small helper (role from localStorage)
function getRole() {
  try {
    const raw = localStorage.getItem("me");
    const me = raw ? JSON.parse(raw) : null;
    const r = (me?.role || localStorage.getItem("role") || "")
      .toString()
      .toUpperCase();
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

        {/* ✅ common typo alias */}
        <Route path="/activites" element={<Navigate to="/activities" replace />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          {/* Shared for all logged-in roles */}
          <Route path="/" element={<Home />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/therapists" element={<Therapists />} />
          <Route path="/therapists/:id" element={<TherapistProfile />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/analytics" element={<Analytics />} />          
          <Route path="/payment-success" element={<PaymentSuccess />} />

          {/* ✅ Activities */}
          <Route path="/activities" element={<ActivitiesHub />} />
          <Route path="/activities/reaction-time" element={<ReactionTime />} />
          <Route path="/activities/sequence-memory" element={<SequenceMemory />} />
          <Route path="/activities/number-memory" element={<NumberMemory />} />
          <Route path="/activities/visual-memory" element={<VisualMemory />} />
          <Route path="/activities/sound-therapy" element={<SoundTherapy />} />

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

          {/* THERAPIST routes */}
          <Route
            path="/therapist/dashboard"
            element={
              <RoleRoute allow={["THERAPIST"]}>
                <TherapistDashboardBookings />
              </RoleRoute>
            }
          />
        </Route>

        {/* ✅ Global fallback (public + protected) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
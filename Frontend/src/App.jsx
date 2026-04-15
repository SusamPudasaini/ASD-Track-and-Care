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
import OnboardingGuard from "./components/OnboardingGuard";
import Navbar from "./components/navbar/Navbar";
import Questionnaire from "./pages/questionnaire";
import Profile from "./pages/Profile";
import TherapistApply from "./pages/TherapistsapplyHistory";
import TherapistApplyNew from "./pages/TherapistApplyNew";

import Bookings from "./pages/Bookings";
import BookingChat from "./pages/BookingChat";
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

import MChatQuestionnaire from "./pages/MChatQuestionnaire";
import MChatQuestionnaireAnalytics from "./pages/MChatQuestionnaireAnalytics";
import AdminMChatQuestionnaireQuestions from "./pages/AdminMChatQuestionnaireQuestions";


import ResourceHub from "./pages/ResourceHub";
import ResourceDetail from "./pages/ResourceDetail";
import AdminResources from "./pages/AdminResources";

import DayCareFinder from "./pages/DayCareFinder";
import DayCareDetail from "./pages/DayCareDetail";
import AdminDayCares from "./pages/AdminDayCares";


import Home from "./pages/Home";


import AacBoard from "./pages/AacBoard";
import AdminAacCards from "./pages/AdminAacCards";

import FirstThenBoard from "./pages/FirstThenBoard";
import FirstThenBoards from "./pages/FirstThenBoards";

import AdminMatchingSorting from "./pages/AdminMatchingSorting";
import MatchingSortingActivity from "./pages/MatchingSortingActivity";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminBookingManagement from "./pages/AdminBookingManagement";
import AdminTherapistReviewsManagement from "./pages/AdminTherapistReviewsManagement";

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

function PublicAuthRoute({ children }) {
  const token = localStorage.getItem("token");
  if (token && token.trim().length > 10) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function LandingRoute() {
  const token = localStorage.getItem("token") || "";
  const isAuthed = token.trim().length > 10;

  // Logged-in parent users now land directly on their analytics dashboard.
  if (isAuthed && getRole() === "USER") {
    return <Navigate to="/analytics" replace />;
  }

  return <Home />;
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingRoute />} />
        <Route path="/login" element={<PublicAuthRoute><Login /></PublicAuthRoute>} />
        <Route path="/signup" element={<PublicAuthRoute><Signup /></PublicAuthRoute>} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ✅ common typo alias */}
        <Route path="/activites" element={<Navigate to="/activities" replace />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/logout" element={<Logout />} />

          {/* Shared for all logged-in roles */}
          <Route element={<OnboardingGuard />}>
            <Route path="/questionnaire" element={<Questionnaire />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/therapists" element={<Therapists />} />
            <Route path="/therapists/:id" element={<TherapistProfile />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/bookings/:id/chat" element={<BookingChat />} />
            <Route path="/analytics" element={<MChatQuestionnaireAnalytics />} />
            <Route path="/gameanalytics" element={<Analytics />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />

            <Route path="/mchat-questionnaire" element={<MChatQuestionnaire />} />
            <Route path="/mchat-questionnaire/analytics" element={<Navigate to="/analytics" replace />} />

            <Route path="/resources" element={<ResourceHub />} />
            <Route path="/resources/:id" element={<ResourceDetail />} />

            <Route path="/daycares" element={<DayCareFinder />} />
            <Route path="/daycares/:id" element={<DayCareDetail />} />

            {/* ✅ Activities */}
            <Route path="/activities" element={<ActivitiesHub />} />
            <Route path="/activities/reaction-time" element={<ReactionTime />} />
            <Route path="/activities/sequence-memory" element={<SequenceMemory />} />
            <Route path="/activities/number-memory" element={<NumberMemory />} />
            <Route path="/activities/visual-memory" element={<VisualMemory />} />
            <Route path="/activities/sound-therapy" element={<SoundTherapy />} />

            <Route path="/aac-board" element={<AacBoard />} />
            <Route path="/first-then" element={<FirstThenBoard />} />
            <Route path="/first-then/boards" element={<FirstThenBoards />} />
            <Route path="/activities/matching-sorting" element={<MatchingSortingActivity />} />

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

            <Route
              path="/admin/matching-sorting"
              element={
                <RoleRoute allow={["ADMIN"]}>
                  <AdminMatchingSorting />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/mchat-questions"
              element={
                <RoleRoute allow={["ADMIN"]}>
                  <AdminMChatQuestionnaireQuestions />
                </RoleRoute>
              }
            />

            <Route
              path="/admin/aac-cards"
              element={
                <RoleRoute allow={["ADMIN"]}>
                  <AdminAacCards />
                </RoleRoute>
              }
            />

            <Route
              path="/admin/daycares"
              element={
                <RoleRoute allow={["ADMIN"]}>
                  <AdminDayCares />
                </RoleRoute>
              }
            />

            <Route
              path="/admin/resources"
              element={
                <RoleRoute allow={["ADMIN"]}>
                  <AdminResources />
                </RoleRoute>
              }
            />

            <Route
              path="/admin/user-management"
              element={
                <RoleRoute allow={["ADMIN"]}>
                  <AdminUserManagement />
                </RoleRoute>
              }
            />

            <Route
              path="/admin/booking-management"
              element={
                <RoleRoute allow={["ADMIN"]}>
                  <AdminBookingManagement />
                </RoleRoute>
              }
            />

            <Route
              path="/admin/therapist-reviews"
              element={
                <RoleRoute allow={["ADMIN"]}>
                  <AdminTherapistReviewsManagement />
                </RoleRoute>
              }
            />

            <Route
              path="/admin/database"
              element={
                <RoleRoute allow={["ADMIN"]}>
                  <Navigate to="/admin/user-management" replace />
                </RoleRoute>
              }
            />

            <Route
              path="/admin/database/:section"
              element={
                <RoleRoute allow={["ADMIN"]}>
                  <Navigate to="/admin/user-management" replace />
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
        </Route>

        {/* ✅ Global fallback (public + protected) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
import { Routes, Route } from "react-router-dom";
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

import { Toaster } from "react-hot-toast";

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
          <Route path="/" element={<Home />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/therapist/apply" element={<TherapistApply />}></Route>
          <Route path="/therapist/apply/new" element={<TherapistApplyNew />}></Route>
          <Route path="/admin/request" element={<AdminTherapistApplications />}></Route>
        </Route>
      </Routes>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import api from "../api/axios";

const ALLOWED_WHEN_PENDING = [
  "/questionnaire",
  "/mchat-questionnaire",
  "/profile",
  "/logout",
];

function getStoredRole() {
  try {
    const me = JSON.parse(localStorage.getItem("me") || "null");
    return (me?.role || localStorage.getItem("role") || "USER").toString().toUpperCase();
  } catch {
    return (localStorage.getItem("role") || "USER").toString().toUpperCase();
  }
}

export default function OnboardingGuard() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({
    aiCompleted: false,
    mchatCompleted: false,
  });

  const role = useMemo(() => getStoredRole(), []);

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      if (role !== "USER") {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const [aiRes, mchatRes] = await Promise.all([
          api.get("/api/ml/last"),
          api.get("/api/mchat-questionnaire/history", { params: { limit: 1 } }),
        ]);

        if (!mounted) return;

        const aiCompleted = Boolean(aiRes?.data?.hasHistory);
        const mchatCompleted = Array.isArray(mchatRes?.data) && mchatRes.data.length > 0;

        setStatus({ aiCompleted, mchatCompleted });
      } catch {
        if (!mounted) return;
        setStatus({ aiCompleted: false, mchatCompleted: false });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStatus();

    return () => {
      mounted = false;
    };
  }, [role, location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
        Checking onboarding progress...
      </div>
    );
  }

  if (role !== "USER") {
    return <Outlet />;
  }

  const pendingAi = !status.aiCompleted;
  const pendingMchat = status.aiCompleted && !status.mchatCompleted;

  if ((pendingAi || pendingMchat) && !ALLOWED_WHEN_PENDING.includes(location.pathname)) {
    return <Navigate to={pendingAi ? "/questionnaire" : "/mchat-questionnaire"} replace />;
  }

  if (pendingAi && location.pathname === "/mchat-questionnaire") {
    return <Navigate to="/questionnaire" replace />;
  }

  return <Outlet />;
}

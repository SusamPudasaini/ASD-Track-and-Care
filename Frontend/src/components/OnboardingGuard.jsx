import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import api from "../api/axios";
import {
  readOnboardingStatusCache,
  writeOnboardingStatusCache,
} from "../utils/onboardingStatusCache";

const ALLOWED_WHEN_PENDING = [
  "/questionnaire",
  "/mchat-questionnaire",
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
  const [status, setStatus] = useState(() => {
    const cached = readOnboardingStatusCache();
    return {
      aiCompleted: cached.aiCompleted,
      mchatCompleted: cached.mchatCompleted,
    };
  });

  const role = useMemo(() => getStoredRole(), []);

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      if (role !== "USER") {
        setLoading(false);
        return;
      }

      const cachedNow = readOnboardingStatusCache();
      // Keep optimistic completion from local cache to avoid bouncing users back
      // to questionnaire steps after a successful submit.
      setStatus((prev) => ({
        aiCompleted: !!prev?.aiCompleted || !!cachedNow.aiCompleted,
        mchatCompleted: !!prev?.mchatCompleted || !!cachedNow.mchatCompleted,
      }));

      setLoading(true);

      try {
        const [aiRes, mchatRes] = await Promise.all([
          api.get("/api/ml/last"),
          api.get("/api/mchat-questionnaire/last"),
        ]);

        if (!mounted) return;

        const next = {
          aiCompleted: Boolean(aiRes?.data?.hasHistory) || !!cachedNow.aiCompleted,
          mchatCompleted: Boolean(mchatRes?.data?.hasHistory) || !!cachedNow.mchatCompleted,
        };

        setStatus(next);
        writeOnboardingStatusCache(next);
      } catch {
        if (!mounted) return;
        // Re-read local cache on failures so successful submits done moments ago
        // are respected even if backend status check is temporarily unavailable.
        setStatus(() => {
          const safe = readOnboardingStatusCache();
          writeOnboardingStatusCache(safe);
          return safe;
        });
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" aria-label="Loading onboarding status" role="status" />
        <span className="sr-only">Checking onboarding progress...</span>
      </div>
    );
  }

  if (role !== "USER") {
    return <Outlet />;
  }

  // Read latest cache on render to prevent one-frame stale redirects after submit.
  const cachedNow = readOnboardingStatusCache();
  const effectiveStatus = {
    aiCompleted: !!status.aiCompleted || !!cachedNow.aiCompleted,
    mchatCompleted: !!status.mchatCompleted || !!cachedNow.mchatCompleted,
  };

  const pendingAi = !effectiveStatus.aiCompleted;
  const pendingMchat = effectiveStatus.aiCompleted && !effectiveStatus.mchatCompleted;

  if ((pendingAi || pendingMchat) && !ALLOWED_WHEN_PENDING.includes(location.pathname)) {
    return <Navigate to={pendingAi ? "/questionnaire" : "/mchat-questionnaire"} replace />;
  }

  if (pendingAi && location.pathname === "/mchat-questionnaire") {
    return <Navigate to="/questionnaire" replace />;
  }

  return <Outlet />;
}

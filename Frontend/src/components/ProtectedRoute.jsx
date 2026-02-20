import { Navigate, Outlet, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useEffect, useMemo, useRef } from "react";

export default function ProtectedRoute() {
  const location = useLocation();
  const shownRef = useRef(false);

  // ✅ Support multiple common keys (prevents false logouts)
  const token = useMemo(() => {
    const t =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("jwt") ||
      "";

    if (t && t.startsWith("Bearer ")) return t.slice(7);
    return t;
  }, []);

  const hasMe = useMemo(() => {
    try {
      const raw = localStorage.getItem("me");
      const me = raw ? JSON.parse(raw) : null;
      return !!me;
    } catch {
      return false;
    }
  }, []);

  const isAuthed = Boolean(token && token.trim().length > 10) || hasMe;

  useEffect(() => {
    if (!isAuthed && !shownRef.current) {
      toast.error("Please login first");
      shownRef.current = true;
    }
  }, [isAuthed]);

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
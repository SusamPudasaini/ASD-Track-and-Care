import { Navigate, Outlet, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useEffect, useRef } from "react";

export default function ProtectedRoute() {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const shownRef = useRef(false);

  useEffect(() => {
    if (!token && !shownRef.current) {
      toast.error("Please login first");
      shownRef.current = true;
    }
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

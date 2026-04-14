import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clearAllOnboardingStatusCache } from "../utils/onboardingStatusCache";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    // clear auth data
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("me");
    localStorage.removeItem("profilePictureUrl");
    clearAllOnboardingStatusCache();

    // redirect to login
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
}

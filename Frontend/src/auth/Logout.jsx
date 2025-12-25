import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    // clear auth data
    localStorage.removeItem("token");

    // redirect to login
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
}

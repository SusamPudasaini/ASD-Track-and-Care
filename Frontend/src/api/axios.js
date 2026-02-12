import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const url = config.url || "";

  // Skip token only for auth endpoints
  if (url.startsWith("/auth/")) return config;

  const token = localStorage.getItem("token");

  // ✅ Ensure headers exists and set Authorization safely
  config.headers = {
    ...(config.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // ✅ TEMP DEBUG (remove after confirming)
  console.log(
    "REQ:",
    `${config.baseURL || ""}${url}`,
    "AUTH SENT?",
    !!config.headers.Authorization
  );

  return config;
});

export default api;

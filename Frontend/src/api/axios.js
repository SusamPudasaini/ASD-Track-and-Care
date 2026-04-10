import axios from "axios";

const resolvedBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:8081");

const api = axios.create({
  baseURL: resolvedBaseUrl,
});

// Attach token on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    console.log("AXIOS REQUEST:", config.method?.toUpperCase(), config.url, "TOKEN?", !!token);

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Auto-handle expired/invalid token
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    // ✅ clear only on 401
    if (status === 401) {
      console.log("AUTH FAILURE:", status, "clearing token and role");
      localStorage.removeItem("token");
      localStorage.removeItem("role");
    }

    return Promise.reject(err);
  }
);

export default api;

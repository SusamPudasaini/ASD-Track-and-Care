import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8081",
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

    if (status === 401 || status === 403) {
      console.log("AUTH FAILURE:", status, "clearing token and role");
      localStorage.removeItem("token");
      localStorage.removeItem("role");

      // optional: redirect hard (works even outside React)
      // window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

export default api;

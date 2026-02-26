// src/api/activityApi.js
import api from "./axios";

/**
 * Save an activity result
 * Backend: POST /api/activities/results
 * Body: { type: "NUMBER_MEMORY", score: 5, details: {...} }
 */
export async function saveActivityResult(payload) {
  const res = await api.post("/api/activities/results", payload);
  return res.data;
}

/**
 * Get current user's activity results (history/analytics)
 * Backend: GET /api/analytics/activities?type=NUMBER_MEMORY&limit=12
 */
export async function getMyActivityResults(type, limit = 12) {
  const params = {
    limit,
    type: type || undefined,
  };

  const res = await api.get("/api/analytics/activities", { params });
  return res.data;
}
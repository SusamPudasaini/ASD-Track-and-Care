import api from "./axios";

// Save one attempt/session
export async function saveActivityResult(payload) {
  // payload example:
  // { type: "REACTION_TIME", score: 245, details: { trials: [...], averageMs: 245 } }
  const res = await api.post("/api/activities/results", payload);
  return res.data;
}

// Get recent history for an activity type
export async function getMyActivityResults(type, limit = 20) {
  const res = await api.get("/api/activities/results/me", {
    params: { type, limit },
  });
  return res.data;
}
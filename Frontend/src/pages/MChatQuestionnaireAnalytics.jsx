import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  FaArrowTrendUp,
  FaBookOpen,
  FaBrain,
  FaCircleInfo,
  FaGaugeHigh,
  FaTriangleExclamation,
  FaRegClock,
  FaListCheck,
  FaChartColumn,
  FaLocationDot,
  FaSchool,
  FaUserDoctor,
} from "react-icons/fa6";

function getErrorMessage(err) {
  const data = err?.response?.data;

  if (!data) return "Something went wrong.";
  if (typeof data === "string") return data;

  if (typeof data === "object") {
    if (data.message) return data.message;
    if (data.error) return data.error;
    try {
      return JSON.stringify(data);
    } catch {
      return "Something went wrong.";
    }
  }

  return String(data);
}

function fmtDate(value) {
  try {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value || "-");
  }
}

function backendBase() {
  return (import.meta.env.VITE_API_BASE_URL || "http://localhost:8081").replace(/\/api\/?$/, "");
}

function resolveImageUrl(raw) {
  if (!raw) return "";
  const s = String(raw);
  if (s.startsWith("blob:")) return s;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `${backendBase()}${s}`;
  return `${backendBase()}/${s}`;
}

function prettyText(v) {
  return String(v || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseISO(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseLocalDateTime(dateStr, timeStr) {
  try {
    if (!dateStr || !timeStr) return null;
    const [y, m, d] = String(dateStr).split("-").map(Number);
    const [hh, mm] = String(timeStr).split(":").map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  } catch {
    return null;
  }
}

function dateKeyLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

const ACTIVITY_DIRECTIONS = {
  REACTION_TIME: "LOWER_BETTER",
  SEQUENCE_MEMORY: "HIGHER_BETTER",
  NUMBER_MEMORY: "HIGHER_BETTER",
  VISUAL_MEMORY: "HIGHER_BETTER",
  SOUND_THERAPY: "HIGHER_BETTER",
  MATCHING: "HIGHER_BETTER",
  SORTING: "HIGHER_BETTER",
};

function normalizeActivityPerformance(type, score, allScoresForType) {
  if (!Number.isFinite(score)) return null;

  const dir = ACTIVITY_DIRECTIONS[type] || "HIGHER_BETTER";
  const scores = Array.isArray(allScoresForType)
    ? allScoresForType.filter(Number.isFinite)
    : [];

  if (scores.length < 3) {
    if (dir === "LOWER_BETTER") {
      const p = 1 - clamp01(score / 1000);
      return Math.round(p * 100);
    }
    const p = clamp01(score / 10);
    return Math.round(p * 100);
  }

  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (min === max) return 50;

  if (dir === "HIGHER_BETTER") {
    const p = (score - min) / (max - min);
    return Math.round(clamp01(p) * 100);
  }

  const p = (max - score) / (max - min);
  return Math.round(clamp01(p) * 100);
}

export default function MChatQuestionnaireAnalytics() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [aiStatus, setAiStatus] = useState({ completed: false, probabilityPercent: null });
  const [activityRows, setActivityRows] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const [analyticsRes, historyRes, planRes, aiRes, activitiesRes, bookingsRes] = await Promise.allSettled([
          api.get("/api/analytics/mchat-questionnaire"),
          api.get("/api/mchat-questionnaire/history"),
          api.get("/api/recommendations/child-plan"),
          api.get("/api/ml/last"),
          api.get("/api/analytics/activities", { params: { limit: 240 } }),
          api.get("/api/bookings/me"),
        ]);

        if (!mounted) return;

        const analyticsData = analyticsRes.status === "fulfilled" ? analyticsRes.value?.data : null;
        const historyData = historyRes.status === "fulfilled" && Array.isArray(historyRes.value?.data)
          ? historyRes.value.data
          : [];
        const planData = planRes.status === "fulfilled" ? planRes.value?.data : null;
        const aiData = aiRes.status === "fulfilled" ? aiRes.value?.data : null;
        const activityData =
          activitiesRes.status === "fulfilled" && Array.isArray(activitiesRes.value?.data)
            ? activitiesRes.value.data
            : [];
        const bookingData =
          bookingsRes.status === "fulfilled" && Array.isArray(bookingsRes.value?.data)
            ? bookingsRes.value.data
            : [];

        setAnalytics(analyticsData || null);
        setHistory(historyData);
        setRecommendation(planData || null);
        setActivityRows(
          activityData
            .map((row) => ({
              id: row?.id,
              type: String(row?.type || ""),
              score: typeof row?.score === "number" ? row.score : Number(row?.score),
              createdAt: row?.createdAt || "",
            }))
            .filter((row) => row.type && Number.isFinite(row.score))
        );
          setBookings(Array.isArray(bookingData) ? bookingData : []);

        const aiProbability =
          typeof aiData?.probability === "number"
            ? aiData.probability
            : typeof aiData?.latest?.probability === "number"
              ? aiData.latest.probability
              : null;

        const aiProbabilityPercent =
          aiProbability != null
            ? Math.round(aiProbability * 1000) / 10
            : typeof planData?.riskSummary?.aiProbabilityPercent === "number"
              ? Math.round(planData.riskSummary.aiProbabilityPercent * 10) / 10
              : null;

        setAiStatus({
          completed: Boolean(aiData?.hasHistory),
          probabilityPercent: aiProbabilityPercent,
        });
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const trendData = useMemo(() => {
    const rows = Array.isArray(analytics?.trends) ? analytics.trends : [];
    return rows.map((r) => ({
      date: fmtDate(r.date),
      development: r.developmentScore ?? 0,
      concern: r.concernScore ?? 0,
    }));
  }, [analytics]);

  const categoryData = useMemo(() => {
    const rows = Array.isArray(analytics?.categories) ? analytics.categories : [];
    return rows.map((r) => ({
      category: String(r.category || "").replaceAll("_", " "),
      development: r.developmentScore ?? 0,
      concern: r.concernScore ?? 0,
    }));
  }, [analytics]);

  const latest = history[0] || null;
  const riskSummary = recommendation?.riskSummary || null;
  const combinedRisk = riskSummary?.combinedRiskLevel || latest?.riskLevel || "UNKNOWN";

  const activityInsights = useMemo(() => {
    const hasAny = activityRows.length > 0;
    const todayKey = dateKeyLocal(new Date());

    const hasToday = activityRows.some((row) => {
      const d = parseISO(row.createdAt);
      return d ? dateKeyLocal(d) === todayKey : false;
    });

    const scoresByType = new Map();
    for (const row of activityRows) {
      if (!scoresByType.has(row.type)) scoresByType.set(row.type, []);
      scoresByType.get(row.type).push(row.score);
    }

    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentRows = activityRows.filter((row) => {
      const d = parseISO(row.createdAt);
      return d ? d.getTime() >= cutoff : false;
    });

    const recentPerformance = recentRows
      .map((row) => normalizeActivityPerformance(row.type, row.score, scoresByType.get(row.type)))
      .filter((x) => typeof x === "number");

    const avgRecentPerformance = recentPerformance.length
      ? Math.round((recentPerformance.reduce((a, b) => a + b, 0) / recentPerformance.length) * 10) / 10
      : null;

    const lowPerformance =
      recentPerformance.length >= 3 && typeof avgRecentPerformance === "number" && avgRecentPerformance < 45;

    return {
      hasAny,
      hasToday,
      recentCount: recentPerformance.length,
      avgRecentPerformance,
      lowPerformance,
    };
  }, [activityRows]);

  const riskToneClass =
    combinedRisk === "HIGH"
      ? "border-red-200 bg-red-50 text-red-800"
      : combinedRisk === "MODERATE"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-800";

  const alerts = useMemo(() => {
    const out = [];
    if (!aiStatus.completed) {
      out.push("AI questionnaire is pending. Complete it to improve recommendation quality.");
    }
    if (!latest) {
      out.push("M-CHAT is pending. Complete it to unlock richer trend analytics.");
    }
    if (riskSummary?.combinedRiskLevel === "HIGH") {
      out.push("High combined risk detected. Prioritize therapist consultation and structured intervention.");
    } else if (riskSummary?.combinedRiskLevel === "MODERATE") {
      out.push("Moderate combined risk detected. Weekly guided therapy and routine follow-up are recommended.");
    }
    if (!activityInsights.hasAny) {
      out.push("🚨No activity conducuted today! Conducted at least one activity session today.");
    } else if (!activityInsights.hasToday) {
      out.push("No activity logged today. Complete at least one short activity session to maintain consistency.");
    }
    if (activityInsights.lowPerformance) {
      out.push(
        `Recent activity performance is low (${activityInsights.avgRecentPerformance}% average over ${activityInsights.recentCount} recent attempts). Use guided easier modules and retry today.`
      );
    }
    if (out.length === 0) {
      out.push("No urgent alerts right now. Continue with your current routine and monitor trends regularly.");
    }
    return out;
  }, [
    aiStatus.completed,
    latest,
    riskSummary?.combinedRiskLevel,
    activityInsights.hasAny,
    activityInsights.hasToday,
    activityInsights.lowPerformance,
    activityInsights.avgRecentPerformance,
    activityInsights.recentCount,
  ]);

  const primaryAlert = alerts[0] || "No urgent alerts right now.";
  const hasUrgentAlert =
    combinedRisk === "HIGH" ||
    combinedRisk === "MODERATE" ||
    !activityInsights.hasToday ||
    activityInsights.lowPerformance;
  const weakAreas = Array.isArray(riskSummary?.weakAreas) ? riskSummary.weakAreas : [];

  const recommendedTherapists = Array.isArray(recommendation?.recommendedTherapists)
    ? recommendation.recommendedTherapists
    : [];
  const recommendedActivities = Array.isArray(recommendation?.recommendedActivities)
    ? recommendation.recommendedActivities
    : [];
  const recommendedResources = Array.isArray(recommendation?.recommendedResources)
    ? recommendation.recommendedResources
    : [];
  const recommendedCenters = Array.isArray(recommendation?.recommendedDayCareCenters)
    ? recommendation.recommendedDayCareCenters
    : [];

  const upcomingSessions = useMemo(() => {
    const now = Date.now();

    return bookings
      .map((row) => {
        const start = parseLocalDateTime(row?.date, row?.time);
        return {
          ...row,
          start,
        };
      })
      .filter((row) => {
        const status = String(row?.status || "").trim().toUpperCase();
        if (status !== "CONFIRMED") return false;
        if (!(row.start instanceof Date) || Number.isNaN(row.start.getTime())) return false;
        return row.start.getTime() > now;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 6);
  }, [bookings]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(to_bottom,_#f8fbff,_#f8fafc_30%,_#ffffff)]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
            <div className="flex items-center gap-2">
              <FaArrowTrendUp className="text-[#4a6cf7]" />
              <h1 className="text-3xl font-semibold text-gray-900">Child Analytics Dashboard</h1>
            </div>
            
            </div>
          </div>

        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
            Loading analytics dashboard...
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardStatCard
                icon={<FaListCheck />}
                title="M-CHAT Submissions"
                value={analytics?.totalSubmissions ?? 0}
                subtitle="Total"
                gradient="from-[#7C3AED] to-[#A78BFA]"
              />
              <DashboardStatCard
                icon={<FaBrain />}
                title="AI Questionnaire"
                value={aiStatus.completed ? `${aiStatus.probabilityPercent ?? 0}%` : "Pending"}
                subtitle={aiStatus.completed ? "Latest score" : "Incomplete"}
                gradient="from-[#F59E0B] to-[#FBBF24]"
              />
              <DashboardStatCard
                icon={<FaGaugeHigh />}
                title="Concern Level"
                value={`${analytics?.latestConcernScore ?? 0}%`}
                subtitle="Current"
                gradient="from-[#22C55E] to-[#4ADE80]"
              />
              <DashboardStatCard
                icon={<FaArrowTrendUp />}
                title="Combined risk"
                value={combinedRisk}
                subtitle={riskSummary?.urgency ? riskSummary.urgency.replaceAll("_", " ") : "Monitoring"}
                gradient="from-[#3B82F6] to-[#60A5FA]"
                valueClass={
                  combinedRisk === "HIGH"
                    ? "text-red-200"
                    : combinedRisk === "MODERATE"
                      ? "text-yellow-200"
                      : "text-white"
                }
                showHighAlert={combinedRisk === "HIGH"}
              />
            </div>


            <div className={`mt-6 rounded-2xl border p-5 shadow-sm ${riskToneClass}`}>
              <div className="flex items-start gap-3">
                <FaCircleInfo className="mt-0.5" />
                <div>
                  <h2 className="text-base font-semibold">Risk Summary</h2>
                  <p className="mt-1 text-sm">
                    {riskSummary?.guidance || "Complete AI + M-CHAT questionnaires to generate full guidance."}
                  </p>
                  {weakAreas.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {weakAreas.map((w) => (
                        <span
                          key={w}
                          className="rounded-full border border-current/30 bg-white/50 px-3 py-1 text-xs font-semibold"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
                <div className="mt-4 space-y-3">
                  {alerts.map((alert, idx) => (
                    <div
                      key={`${alert}-${idx}`}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                    >
                      {alert}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">Next Step Recommendations</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {riskSummary?.guidance || "Start by completing both questionnaires, then follow suggested support options."}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => navigate("/therapists")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FaUserDoctor /> Therapists
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/daycares")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FaSchool /> Centers
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/resources")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FaBookOpen /> Resources
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Upcoming Therapy Sessions</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Confirmed sessions scheduled for you.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/bookings")}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  View Bookings
                </button>
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-5 text-sm text-emerald-800">
                  No upcoming confirmed therapy sessions right now.
                </div>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {upcomingSessions.map((session) => (
                    <article
                      key={session.id}
                      className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="truncate text-sm font-semibold text-gray-900">
                          {session?.therapistName || "Therapist"}
                        </h4>
                        <span className="rounded-full border border-emerald-200 bg-white px-2 py-1 text-[10px] font-bold text-emerald-700">
                          CONFIRMED
                        </span>
                      </div>

                      <p className="mt-1 truncate text-xs text-gray-600">
                        {session?.therapistSpecialization || session?.therapistRole || "Therapy Session"}
                      </p>

                      <div className="mt-3 space-y-2 text-xs text-gray-700">
                        <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5">
                          <FaRegClock className="text-emerald-700" />
                          <span className="font-semibold">{session?.date || "-"}</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5">
                          <FaRegClock className="text-emerald-700" />
                          <span className="font-semibold">{session?.time || "-"}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Recommended Therapists</h3>
                  <p className="mt-1 text-sm text-gray-600">Prioritized by risk level, experience, review quality, and relevance.</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/therapists")}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  Browse All
                </button>
              </div>

              {recommendedTherapists.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No therapist recommendations yet.</p>
              ) : (
                <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                  {recommendedTherapists.slice(0, 8).map((t) => {
                    const img = resolveImageUrl(t.profilePictureUrl);
                    return (
                      <article key={t.id} className="min-w-[270px] max-w-[270px] rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="h-14 w-14 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                            {img ? <img src={img} alt={t.name || "Therapist"} className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold text-gray-900">{t.name || "Therapist"}</h4>
                            <p className="mt-1 line-clamp-2 text-xs text-gray-600">{t.qualification || "Qualification not listed"}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-gray-500">
                          {t.experienceYears ?? 0} yrs • {Number(t.averageReview || 0).toFixed(1)}★ ({t.reviewCount || 0})
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {t.distanceKm != null ? `${t.distanceKm} km away` : "Distance unavailable"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <FaLocationDot className="text-[11px]" />
                            {t.workplaceAddress || t.address || "Workplace address unavailable"}
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate(`/therapists/${t.id}`)}
                          className="mt-3 w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          View Profile
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Recommended Therapy Activities</h3>
                  <p className="mt-1 text-sm text-gray-600">Mapped to weak areas from M-CHAT categories.</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/activities")}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  Activities Hub
                </button>
              </div>

              {recommendedActivities.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No activity recommendations yet.</p>
              ) : (
                <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                  {recommendedActivities.slice(0, 8).map((a, idx) => (
                    <article key={`${a.name}-${idx}`} className="min-w-[290px] max-w-[290px] rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">A</span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Recommended</span>
                      </div>
                      <h4 className="mt-3 text-sm font-semibold text-gray-900">{a.name}</h4>
                      <p className="mt-2 line-clamp-3 text-xs text-gray-600">{a.plan}</p>
                      <button
                        type="button"
                        onClick={() => navigate(a.route || "/activities")}
                        className="mt-3 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        Open Activity
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Recommended Resources</h3>
                  <p className="mt-1 text-sm text-gray-600">Reading material and guidance tailored to weak categories.</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/resources")}
                  className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                >
                  Open Resource Hub
                </button>
              </div>

              {recommendedResources.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No resource recommendations yet.</p>
              ) : (
                <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                  {recommendedResources.slice(0, 8).map((r) => {
                    const thumb = resolveImageUrl(r.thumbnailUrl);
                    return (
                      <article key={r.id || r.title} className="min-w-[300px] max-w-[300px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                        <div className="h-32 bg-slate-100">
                          {thumb ? <img src={thumb} alt={r.title || "Resource"} className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="p-4">
                          <h4 className="line-clamp-2 text-sm font-semibold text-gray-900">{r.title}</h4>
                          <p className="mt-1 text-xs font-medium text-sky-700">{prettyText(r.category || "General")}</p>
                          <p className="mt-2 line-clamp-2 text-xs text-gray-600">{r.description || "No description available."}</p>
                          <button
                            type="button"
                            onClick={() => navigate(`/resources/${r.id}`)}
                            className="mt-3 w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                          >
                            View Resource
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Recommended Therapy Centers</h3>
                  <p className="mt-1 text-sm text-gray-600">Matched to child needs (sensory, communication, play, and more).</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/daycares")}
                  className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                >
                  View All Centers
                </button>
              </div>

              {recommendedCenters.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No therapy center recommendations yet.</p>
              ) : (
                <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                  {recommendedCenters.slice(0, 8).map((c) => {
                    const image = resolveImageUrl(c.imageUrl);
                    return (
                      <article key={c.id} className="min-w-[300px] max-w-[300px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                        <div className="h-32 bg-purple-100">
                          {image ? <img src={image} alt={c.name || "Center"} className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="p-4">
                          <h4 className="line-clamp-2 text-sm font-semibold text-gray-900">{c.name}</h4>
                          <p className="mt-1 text-xs font-medium text-purple-700">{prettyText(c.category || "General")}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {c.distanceKm != null ? `${c.distanceKm} km away` : "Distance unavailable (check profile address)"}
                            {c.rating != null ? ` • ${Number(c.rating).toFixed(1)}★` : ""}
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate(`/daycares/${c.id}`)}
                            className="mt-3 w-full rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                          >
                            View Center
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {!!analytics && (analytics.totalSubmissions || 0) > 0 && (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-cyan-100 bg-white p-6 shadow-sm">
                <div className="text-lg font-semibold text-gray-900">Trend Over Time</div>
                <div className="mt-1 text-xs text-gray-500">
                  Development should trend upward. Concern should trend downward.
                </div>

                <div className="mt-6 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <defs>
                        <linearGradient id="devStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#0ea5e9" />
                          <stop offset="100%" stopColor="#0284c7" />
                        </linearGradient>
                        <linearGradient id="concernStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="development"
                        name="Development %"
                        dot={false}
                        stroke="url(#devStroke)"
                        strokeWidth={3}
                      />
                      <Line
                        type="monotone"
                        dataKey="concern"
                        name="Concern %"
                        dot={false}
                        stroke="url(#concernStroke)"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <FaChartColumn className="text-[#4a6cf7]" />
                  Category Scores
                </div>

                <div className="mt-6 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="category"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-18}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="development" name="Development %" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="concern" name="Concern %" fill="#f97316" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            )}

            {!!analytics && (analytics.totalSubmissions || 0) > 0 && (
            <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <FaRegClock className="text-[#4a6cf7]" />
                  Submission History
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Development</th>
                      <th className="px-4 py-3 text-left">Concern</th>
                      <th className="px-4 py-3 text-left">Risk</th>
                      <th className="px-4 py-3 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {history.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="px-4 py-3 text-gray-700">{fmtDate(row.submittedAt)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {row.normalizedDevelopmentScore ?? 0}%
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.normalizedConcernScore ?? 0}%
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                            {row.riskLevel || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {row.notes ? row.notes : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {latest ? (
                <p className="mt-3 text-xs text-gray-500">
                  Latest submission risk level: <span className="font-semibold">{latest.riskLevel}</span>
                </p>
              ) : null}
            </div>
            )}

            {(!analytics || (analytics.totalSubmissions || 0) === 0) && (
              <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
                No M-CHAT submissions found yet. You can still use this dashboard to view AI status, risk alerts, and next-step recommendations.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function DashboardStatCard({ icon, title, value, subtitle, gradient, valueClass = "text-white", showHighAlert = false }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r p-5 text-white shadow-lg ${gradient}`}>
      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-7 right-10 h-16 w-16 rounded-full bg-white/10" />

      <div className="relative flex items-start justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur">
          {icon}
        </span>

        {showHighAlert ? (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500/85 text-white shadow-sm">
            <FaTriangleExclamation />
          </span>
        ) : null}
      </div>

      <div className={`relative mt-3 text-4xl font-extrabold leading-none tracking-tight ${valueClass}`}>{value}</div>
      <div className="relative mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-white/80">{title}</div>
      {subtitle ? <div className="relative mt-1 text-xs font-medium text-white/80">{subtitle}</div> : null}
    </div>
  );
}
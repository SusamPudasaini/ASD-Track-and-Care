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
  FaGaugeHigh,
  FaTriangleExclamation,
  FaRegClock,
  FaListCheck,
  FaChartColumn,
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

export default function MChatQuestionnaireAnalytics() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const [analyticsRes, historyRes] = await Promise.all([
          api.get("/api/analytics/mchat-questionnaire"),
          api.get("/api/mchat-questionnaire/history"),
        ]);

        if (!mounted) return;

        setAnalytics(analyticsRes.data || null);
        setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FaArrowTrendUp className="text-[#4a6cf7]" />
              <h1 className="text-3xl font-semibold text-gray-900">M-CHAT Analytics</h1>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Track questionnaire-based development and concern trends over time.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate("/mchat-questionnaire")}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Fill Questionnaire
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
            Loading M-CHAT analytics...
          </div>
        ) : !analytics || (analytics.totalSubmissions || 0) === 0 ? (
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
            No questionnaire submissions found yet.
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={<FaListCheck />}
                title="Total submissions"
                value={analytics.totalSubmissions ?? 0}
              />
              <KpiCard
                icon={<FaGaugeHigh />}
                title="Latest development"
                value={`${analytics.latestDevelopmentScore ?? 0}%`}
                hint="Higher is better"
              />
              <KpiCard
                icon={<FaTriangleExclamation />}
                title="Latest concern"
                value={`${analytics.latestConcernScore ?? 0}%`}
                hint="Lower is better"
              />
              <KpiCard
                icon={<FaArrowTrendUp />}
                title="Improvement"
                value={
                  analytics.improvementDelta == null
                    ? "—"
                    : `${analytics.improvementDelta > 0 ? "+" : ""}${analytics.improvementDelta}%`
                }
                sub={analytics.latestRiskLevel ? `Risk: ${analytics.latestRiskLevel}` : ""}
              />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="text-lg font-semibold text-gray-900">Trend Over Time</div>
                <div className="mt-1 text-xs text-gray-500">
                  Development should trend upward. Concern should trend downward.
                </div>

                <div className="mt-6 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="development" name="Development %" dot={false} />
                      <Line type="monotone" dataKey="concern" name="Concern %" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <FaChartColumn className="text-[#4a6cf7]" />
                  Category Scores
                </div>

                <div className="mt-6 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
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
                      <Bar dataKey="development" name="Development %" />
                      <Bar dataKey="concern" name="Concern %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

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
          </>
        )}
      </main>
    </div>
  );
}

function KpiCard({ icon, title, value, sub, hint }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{title}</div>
        <div className="text-[#4a6cf7]">{icon}</div>
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {sub ? <div className="mt-1 text-sm text-gray-600">{sub}</div> : null}
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}
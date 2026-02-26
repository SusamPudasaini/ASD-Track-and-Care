import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const LABELS = {
  REACTION_TIME: "Reaction Time",
  SEQUENCE_MEMORY: "Sequence Memory",
  NUMBER_MEMORY: "Number Memory",
  VISUAL_MEMORY: "Visual Memory",
  SOUND_THERAPY: "Sound Therapy",
};

const DIRECTION = {
  REACTION_TIME: "LOWER_BETTER",
  SEQUENCE_MEMORY: "HIGHER_BETTER",
  NUMBER_MEMORY: "HIGHER_BETTER",
  VISUAL_MEMORY: "HIGHER_BETTER",
  SOUND_THERAPY: "HIGHER_BETTER",
};

function parseISO(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateShort(iso) {
  const d = parseISO(iso);
  return d ? d.toLocaleDateString() : String(iso || "");
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/**
 * Normalizes a score to a 0–100 "performance" scale per activity type.
 * - If we have enough samples, uses min/max scaling within that activity type.
 * - If few samples, uses rough fallback heuristics.
 * - Respects LOWER_BETTER vs HIGHER_BETTER direction.
 */
function normalizePerformance(type, score, allScoresForType) {
  if (!Number.isFinite(score)) return null;

  const dir = DIRECTION[type] || "HIGHER_BETTER";
  const scores = Array.isArray(allScoresForType)
    ? allScoresForType.filter(Number.isFinite)
    : [];

  // fallback if very few data points
  if (scores.length < 3) {
    if (dir === "LOWER_BETTER") {
      // for reaction time: assume 0ms best, 1000ms worst
      const p = 1 - clamp01(score / 1000);
      return Math.round(p * 100);
    } else {
      // for memory-ish scores: assume 0..10 range
      const p = clamp01(score / 10);
      return Math.round(p * 100);
    }
  }

  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (min === max) return 50;

  if (dir === "HIGHER_BETTER") {
    const p = (score - min) / (max - min);
    return Math.round(clamp01(p) * 100);
  } else {
    const p = (max - score) / (max - min);
    return Math.round(clamp01(p) * 100);
  }
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  // filters
  const [type, setType] = useState(""); // "" => all
  const [range, setRange] = useState("30"); // 7/30/90/all
  const [mode, setMode] = useState("performance"); // performance/raw

  // visible debug panel
  const [debug, setDebug] = useState({
    lastUrl: "",
    status: "",
    message: "",
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      const url = `/api/analytics/activities?limit=400${
        type ? `&type=${encodeURIComponent(type)}` : ""
      }`;

      try {
        setLoading(true);
        setDebug({ lastUrl: url, status: "", message: "" });

        const res = await api.get("/api/analytics/activities", {
          params: { limit: 400, type: type || undefined },
        });

        const list = Array.isArray(res.data) ? res.data : [];

        const normalized = list
          .map((x) => ({
            id: x.id,
            type: String(x.type || ""),
            score: typeof x.score === "number" ? x.score : Number(x.score),
            createdAt: x.createdAt || "",
            detailsJson: x.detailsJson || null,
          }))
          .filter((x) => x.type && Number.isFinite(x.score));

        if (!mounted) return;

        setRows(normalized);
        setDebug({
          lastUrl: url,
          status: String(res.status),
          message: `Loaded ${normalized.length} rows`,
        });
      } catch (err) {
        const status = err?.response?.status;
        const msg =
          err?.response?.data?.message ||
          (typeof err?.response?.data === "string" ? err.response.data : "") ||
          err?.message ||
          "Could not load analytics.";

        if (!mounted) return;

        setRows([]);
        setDebug({
          lastUrl: url,
          status: status ? String(status) : "ERR",
          message: msg,
        });

        toast.error(msg || "Could not load analytics.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [type]);

  // apply time range client-side
  const ranged = useMemo(() => {
    if (range === "all") return rows;
    const days = Number(range);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    return rows.filter((r) => {
      const d = parseISO(r.createdAt);
      if (!d) return true;
      return d.getTime() >= cutoff;
    });
  }, [rows, range]);

  // group scores per type (needed for per-type normalization)
  const scoresByType = useMemo(() => {
    const map = new Map();
    for (const r of ranged) {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type).push(r.score);
    }
    return map;
  }, [ranged]);

  // sorted time series
  const timeSeries = useMemo(() => {
    const arr = [...ranged].sort((a, b) => {
      const da = parseISO(a.createdAt)?.getTime() ?? 0;
      const db = parseISO(b.createdAt)?.getTime() ?? 0;
      return da - db;
    });

    return arr.map((r) => {
      const perf = normalizePerformance(r.type, r.score, scoresByType.get(r.type));
      return {
        date: dateShort(r.createdAt),
        raw: r.score,
        performance: perf,
      };
    });
  }, [ranged, scoresByType]);

  // chart data depending on mode
  const chartData = useMemo(() => {
    return timeSeries.map((x) => ({
      date: x.date,
      value: mode === "performance" ? x.performance : x.raw,
    }));
  }, [timeSeries, mode]);

  // average by type chart
  const avgByType = useMemo(() => {
    const map = new Map(); // type -> stats

    for (const r of ranged) {
      const k = r.type;
      const cur = map.get(k) || { sum: 0, count: 0, sumPerf: 0, perfCount: 0 };

      cur.sum += r.score;
      cur.count += 1;

      const perf = normalizePerformance(k, r.score, scoresByType.get(k));
      if (typeof perf === "number") {
        cur.sumPerf += perf;
        cur.perfCount += 1;
      }

      map.set(k, cur);
    }

    const out = [];
    for (const [k, v] of map.entries()) {
      const avgRaw = v.count ? v.sum / v.count : 0;
      const avgPerf = v.perfCount ? v.sumPerf / v.perfCount : 0;

      out.push({
        type: k,
        label: LABELS[k] || k,
        attempts: v.count,
        value: mode === "performance" ? avgPerf : avgRaw,
      });
    }

    out.sort((a, b) => b.attempts - a.attempts);
    return out;
  }, [ranged, scoresByType, mode]);

  // KPIs
  const kpis = useMemo(() => {
    const total = ranged.length;
    const unique = new Set(ranged.map((r) => r.type)).size;

    // average depends on mode
    let avg = 0;
    if (total) {
      if (mode === "performance") {
        const vals = ranged
          .map((r) => normalizePerformance(r.type, r.score, scoresByType.get(r.type)))
          .filter((x) => typeof x === "number");
        avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      } else {
        avg = ranged.reduce((a, r) => a + r.score, 0) / total;
      }
    }

    // best depends on direction + mode (performance higher is always better)
    let best = null;
    if (total) {
      if (mode === "performance") {
        best = ranged.reduce((bestRow, r) => {
          const p = normalizePerformance(r.type, r.score, scoresByType.get(r.type));
          const bp = bestRow
            ? normalizePerformance(bestRow.type, bestRow.score, scoresByType.get(bestRow.type))
            : null;

          if (bestRow == null) return r;
          if (typeof p !== "number") return bestRow;
          if (typeof bp !== "number") return r;
          return p > bp ? r : bestRow;
        }, null);
      } else {
        // raw: direction differs per type, so show "best attempt" only if filtered to one type
        if (type) {
          const dir = DIRECTION[type] || "HIGHER_BETTER";
          best = ranged.reduce((bestRow, r) => {
            if (bestRow == null) return r;
            return dir === "LOWER_BETTER"
              ? r.score < bestRow.score
                ? r
                : bestRow
              : r.score > bestRow.score
              ? r
              : bestRow;
          }, null);
        }
      }
    }

    return { total, unique, avg, best };
  }, [ranged, mode, scoresByType, type]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Analytics</h1>
            <p className="mt-1 text-sm text-gray-600">
              Progress tracking across activities.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm"
            >
              <option value="">All Activities</option>
              {Object.keys(LABELS).map((k) => (
                <option key={k} value={k}>
                  {LABELS[k]}
                </option>
              ))}
            </select>

            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </select>

            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm"
            >
              <option value="performance">Normalized (0–100)</option>
              <option value="raw">Raw scores</option>
            </select>
          </div>
        </div>

        {/* Debug panel (keep for now, remove later) */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
          <div>
            <span className="font-semibold">Debug URL:</span>{" "}
            {debug.lastUrl || "—"}
          </div>
          <div>
            <span className="font-semibold">HTTP Status:</span>{" "}
            {debug.status || "—"}
          </div>
          <div>
            <span className="font-semibold">Message:</span>{" "}
            {debug.message || "—"}
          </div>
          <div className="mt-2">
            <span className="font-semibold">Rows loaded:</span> {rows.length}
            {rows[0] ? (
              <>
                <span className="ml-3 font-semibold">First row:</span>{" "}
                {rows[0].type} / {rows[0].score} / {rows[0].createdAt}
              </>
            ) : null}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Total attempts" value={kpis.total} />
          <Card title="Activities used" value={kpis.unique} />
          <Card
            title={mode === "performance" ? "Avg performance" : "Average score"}
            value={kpis.total ? kpis.avg.toFixed(2) : "—"}
          />
          <Card
            title="Best attempt"
            value={
              kpis.best
                ? mode === "performance"
                  ? `${normalizePerformance(
                      kpis.best.type,
                      kpis.best.score,
                      scoresByType.get(kpis.best.type)
                    )}%`
                  : kpis.best.score.toFixed(2)
                : "—"
            }
            sub={kpis.best ? (LABELS[kpis.best.type] || kpis.best.type) : ""}
          />
        </div>

        {loading ? (
          <div className="mt-10 text-sm text-gray-600">Loading analytics...</div>
        ) : ranged.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
            No activity results found yet for this account.
            <div className="mt-2 text-xs text-gray-500">
              Make sure you played an activity while logged in, and that it
              successfully POSTed to <b>/api/activities/results</b>.
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-gray-900">
                Progress over time
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {mode === "performance"
                  ? "0–100 scale (higher is better)"
                  : "Raw score (meaning depends on activity)"}
              </div>

              <div className="mt-6 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={mode === "performance" ? [0, 100] : undefined} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={mode === "performance" ? "Performance" : "Score"}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-gray-900">
                {mode === "performance"
                  ? "Average performance by activity"
                  : "Average score by activity"}
              </div>

              <div className="mt-6 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={avgByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis domain={mode === "performance" ? [0, 100] : undefined} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="value"
                      name={mode === "performance" ? "Avg performance" : "Avg score"}
                    />
                    <Bar dataKey="attempts" name="Attempts" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-gray-900">Recent results</div>
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Activity</th>
                      <th className="px-4 py-2 text-left">
                        {mode === "performance" ? "Performance" : "Score"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {ranged.slice(0, 12).map((r) => {
                      const perf = normalizePerformance(
                        r.type,
                        r.score,
                        scoresByType.get(r.type)
                      );
                      return (
                        <tr key={r.id} className="border-t">
                          <td className="px-4 py-2 text-gray-700">
                            {dateShort(r.createdAt) || "—"}
                          </td>
                          <td className="px-4 py-2 font-semibold text-gray-900">
                            {LABELS[r.type] || r.type}
                          </td>
                          <td className="px-4 py-2 text-gray-700">
                            {mode === "performance"
                              ? typeof perf === "number"
                                ? `${perf}%`
                                : "—"
                              : r.score.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Note: Reaction Time is “lower is better”, so the normalized
                performance converts it to “higher is better” for fair charts.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Card({ title, value, sub }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {sub ? <div className="mt-1 text-sm text-gray-600">{sub}</div> : null}
    </div>
  );
}
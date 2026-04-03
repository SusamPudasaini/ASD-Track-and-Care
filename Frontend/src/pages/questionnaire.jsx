import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Baby,
  Brain,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  History,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
const sectionMeta = {
  child: {
    icon: Baby,
    subtitle: "Basic child details used in the screening model.",
  },
  family: {
    icon: Users,
    subtitle: "Family background and caregiver-related information.",
  },
  birth: {
    icon: HeartPulse,
    subtitle: "Pregnancy and birth factors that may influence development.",
  },
  milestones: {
    icon: Sparkles,
    subtitle: "Early developmental milestone timing.",
  },
  conditions: {
    icon: Stethoscope,
    subtitle: "Associated developmental or medical conditions.",
  },
  screening: {
    icon: ClipboardList,
    subtitle: "Any earlier autism-related screening history.",
  },
  consent: {
    icon: ShieldCheck,
    subtitle: "Acknowledgement before generating a result.",
  },
};

const cardBase =
  "rounded-2xl border border-white/60 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur";

const Section = ({ title, children, sectionKey }) => {
  const meta = sectionMeta[sectionKey] || {};
  const Icon = meta.icon || ClipboardList;

  return (
    <section className={`${cardBase} p-6 md:p-7`}>
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 shadow-sm">
          <Icon size={22} strokeWidth={2.2} />
        </div>

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          {meta.subtitle ? (
            <p className="mt-1 text-sm text-slate-600">{meta.subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
};

const FieldShell = ({ label, helper, children }) => (
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-slate-800">{label}</label>
    {helper ? <p className="text-xs leading-5 text-slate-500">{helper}</p> : null}
    {children}
  </div>
);

const SelectField = ({
  label,
  inputRef,
  options,
  placeholder,
  helper,
  onValueChange,
}) => (
  <FieldShell label={label} helper={helper}>
    <select
      ref={inputRef}
      defaultValue=""
      onChange={(e) => onValueChange?.(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    >
      <option value="">{placeholder || "Select an option"}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </FieldShell>
);

const NumberInputField = ({ label, inputRef, placeholder, helper, min, max }) => (
  <FieldShell label={label} helper={helper}>
    <input
      ref={inputRef}
      type="number"
      inputMode="numeric"
      placeholder={placeholder || "Enter a number"}
      min={min}
      max={max}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    />
  </FieldShell>
);

// ---------------------------------------------------------------------------
// Result Modal
// ---------------------------------------------------------------------------
const ResultModal = ({
  open,
  prediction,
  riskLevel,
  resultQuery,
  onClose,
  onRetake,
  onNavigate,
}) => {
  if (!open) return null;

  const p = typeof prediction === "number" ? prediction : 0;
  const pct = (p * 100).toFixed(1);

  const riskBadgeClass =
    riskLevel === "High"
      ? "bg-red-50 text-red-700 border-red-200"
      : riskLevel === "Moderate"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const ringClass =
    riskLevel === "High"
      ? "from-red-500 to-rose-500"
      : riskLevel === "Moderate"
        ? "from-amber-500 to-orange-500"
        : "from-emerald-500 to-teal-500";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/40 bg-white shadow-2xl">
        <div className={`bg-gradient-to-r ${ringClass} px-6 py-6 text-white md:px-8`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                Screening completed
              </p>
              <h3 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
                <CheckCircle2 size={26} />
                Autism Screening Result
              </h3>
              <p className="mt-2 text-sm text-white/90">
                This is a screening estimate and not a medical diagnosis.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-600">Predicted ASD Probability</p>
              <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{pct}%</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${ringClass}`}
                  style={{ width: `${Math.min(Math.max(p * 100, 4), 100)}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-600">Risk Category</p>
              <div
                className={`mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${riskBadgeClass}`}
              >
                <Brain size={16} />
                {riskLevel}
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                You can now explore suggested therapists or activities based on this result.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-slate-900">What would you like to do next?</p>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => onNavigate(`/therapists?${resultQuery}`)}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                Suggested Therapists
              </button>

              <button
                type="button"
                onClick={() => onNavigate(`/activities?${resultQuery}`)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Suggested Activities
              </button>

              <button
                type="button"
                onClick={onRetake}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Retake Assessment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// History / Last Result Card
// ---------------------------------------------------------------------------
const LastResultCard = ({
  historyLoading,
  historyError,
  history,
  latest,
  computeRiskLevel,
  fmtDate,
  onRetake,
  onNavigate,
}) => {
  if (historyLoading) {
    return (
      <div className={`${cardBase} p-8`}>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Autism Risk Screening Questionnaire
        </h1>
        <p className="mt-3 text-sm text-slate-600">Loading your previous screening history...</p>
      </div>
    );
  }

  if (!latest) return null;

  const pct = (latest.probability * 100).toFixed(1);
  const lastRisk = latest.riskLevel || computeRiskLevel(latest.probability);

  const riskStyles =
    lastRisk === "High"
      ? "bg-red-50 text-red-700 border-red-200"
      : lastRisk === "Moderate"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <div className={`${cardBase} overflow-hidden`}>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
          Previous result
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <History size={26} />
          Autism Risk Screening Questionnaire
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
          Your latest recorded screening is shown below. You can review suggestions or retake the
          questionnaire anytime.
        </p>
      </div>

      <div className="p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm text-slate-500">Latest Probability</div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{pct}%</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm text-slate-500">Risk Level</div>
            <div className="mt-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${riskStyles}`}
              >
                <Brain size={15} />
                {lastRisk}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm text-slate-500">Recorded</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {fmtDate(latest.createdAt) || "—"}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            onClick={() =>
              onNavigate(
                `/therapists?${new URLSearchParams({
                  p: String(latest.probability),
                  risk: String(lastRisk),
                }).toString()}`
              )
            }
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            View Suggested Therapists
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate(
                `/activities?${new URLSearchParams({
                  p: String(latest.probability),
                  risk: String(lastRisk),
                }).toString()}`
              )
            }
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            View Suggested Activities
          </button>

          <button
            type="button"
            onClick={onRetake}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Retake Assessment
          </button>
        </div>

        {!!historyError && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {historyError}
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Recent history</h3>
                <p className="text-sm text-slate-500">Your most recent saved screening results.</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Probability</th>
                    <th className="px-4 py-3 text-left font-semibold">Risk</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {history.slice(0, 8).map((h) => {
                    const r = h.riskLevel || computeRiskLevel(h.probability);
                    return (
                      <tr key={h.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-slate-700">{fmtDate(h.createdAt) || "—"}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {(h.probability * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-slate-700">{r}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Tip: Use “Retake Assessment” whenever you want to generate a new screening record.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export default function Questionnaire() {
  const navigate = useNavigate();

  const age_months = useRef(null);
  const sex = useRef(null);
  const residence = useRef(null);
  const parental_education = useRef(null);
  const family_history_asd = useRef(null);

  const preeclampsia = useRef(null);
  const preterm_birth = useRef(null);
  const birth_asphyxia = useRef(null);
  const low_birth_weight = useRef(null);

  const eye_contact_age_months = useRef(null);
  const social_smile_months = useRef(null);

  const intellectual_disability = useRef(null);
  const epilepsy = useRef(null);
  const adhd = useRef(null);
  const language_disorder = useRef(null);
  const motor_delay = useRef(null);

  const screening_done = useRef(null);
  const screening_result = useRef(null);

  const consent = useRef(null);

  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [prediction, setPrediction] = useState(null);
  const [riskLevel, setRiskLevel] = useState("");
  const [resultModalOpen, setResultModalOpen] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [screeningDoneValue, setScreeningDoneValue] = useState("");

  const yesNoTo01 = (v) => (v === "Yes" ? 1 : 0);

  const computeRiskLevel = useCallback((p) => {
    if (p < 0.33) return "Low";
    if (p < 0.66) return "Moderate";
    return "High";
  }, []);

  const encodePayload = (raw) => {
    const eduMap = {
      "No formal": 0,
      Primary: 1,
      Secondary: 2,
      "College/University": 3,
    };

    const screeningMap = {
      Positive: 1,
      Negative: 0,
      Unknown: 2,
    };

    return {
      age_months: Number(raw.age_months),
      sex: raw.sex === "Male" ? 1 : 0,
      residence: raw.residence === "Urban" ? 1 : 0,
      parental_education: eduMap[raw.parental_education],
      family_history_asd: yesNoTo01(raw.family_history_asd),
      preeclampsia: yesNoTo01(raw.preeclampsia),
      preterm_birth: yesNoTo01(raw.preterm_birth),
      birth_asphyxia: yesNoTo01(raw.birth_asphyxia),
      low_birth_weight: yesNoTo01(raw.low_birth_weight),
      eye_contact_age_months: Number(raw.eye_contact_age_months),
      social_smile_months: Number(raw.social_smile_months),
      intellectual_disability: yesNoTo01(raw.intellectual_disability),
      epilepsy: yesNoTo01(raw.epilepsy),
      adhd: yesNoTo01(raw.adhd),
      language_disorder: yesNoTo01(raw.language_disorder),
      motor_delay: yesNoTo01(raw.motor_delay),
      screening_done: yesNoTo01(raw.screening_done),
      screening_result:
        raw.screening_done === "Yes" ? screeningMap[raw.screening_result] : null,
    };
  };

  const setRefValue = (ref, value) => {
    if (!ref?.current) return;
    ref.current.value = value;
    try {
      ref.current.dispatchEvent(new Event("change", { bubbles: true }));
    } catch {}
  };

  const clearAllFields = useCallback(() => {
    setRefValue(age_months, "");
    setRefValue(sex, "");
    setRefValue(residence, "");
    setRefValue(parental_education, "");
    setRefValue(family_history_asd, "");

    setRefValue(preeclampsia, "");
    setRefValue(preterm_birth, "");
    setRefValue(birth_asphyxia, "");
    setRefValue(low_birth_weight, "");

    setRefValue(eye_contact_age_months, "");
    setRefValue(social_smile_months, "");

    setRefValue(intellectual_disability, "");
    setRefValue(epilepsy, "");
    setRefValue(adhd, "");
    setRefValue(language_disorder, "");
    setRefValue(motor_delay, "");

    setRefValue(screening_done, "");
    setRefValue(screening_result, "");

    if (consent.current) consent.current.checked = false;

    setScreeningDoneValue("");
    setServerError(null);
    setPrediction(null);
    setRiskLevel("");
    setResultModalOpen(false);
  }, []);

  const handleAutofill = () => {
    setRefValue(age_months, "28");
    setRefValue(sex, "Male");
    setRefValue(residence, "Urban");
    setRefValue(parental_education, "College/University");
    setRefValue(family_history_asd, "No");

    setRefValue(preeclampsia, "No");
    setRefValue(preterm_birth, "No");
    setRefValue(birth_asphyxia, "No");
    setRefValue(low_birth_weight, "No");

    setRefValue(eye_contact_age_months, "7");
    setRefValue(social_smile_months, "3");

    setRefValue(intellectual_disability, "No");
    setRefValue(epilepsy, "No");
    setRefValue(adhd, "No");
    setRefValue(language_disorder, "Yes");
    setRefValue(motor_delay, "No");

    setRefValue(screening_done, "Yes");
    setRefValue(screening_result, "Unknown");

    setScreeningDoneValue("Yes");

    if (consent.current) consent.current.checked = true;

    toast.success("Autofilled test values.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resultQuery = useMemo(() => {
    const p = typeof prediction === "number" ? prediction : null;
    const rl = riskLevel || (p != null ? computeRiskLevel(p) : "");
    return new URLSearchParams({
      p: p != null ? String(p) : "",
      risk: rl || "",
    }).toString();
  }, [prediction, riskLevel, computeRiskLevel]);

  const normalizeServerData = (resData) => {
    let data = resData;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {}
    }
    if (!data || typeof data !== "object") return { p: null, rl: "" };

    const p = typeof data.probability === "number" ? data.probability : null;

    const rl =
      typeof data.riskLevel === "string"
        ? data.riskLevel
        : typeof data.risk_level === "string"
          ? data.risk_level
          : "";

    return { p, rl };
  };

  const fetchHistory = useCallback(async () => {
    const res = await api.get("/api/ml/history", { params: { limit: 10 } });
    const list = Array.isArray(res.data) ? res.data : res.data?.data || [];

    const normalized = list
      .map((x) => ({
        id: x.id ?? x._id ?? x.createdAt ?? `record-${x.probability}-${x.createdAt}`,
        probability: typeof x.probability === "number" ? x.probability : null,
        riskLevel: x.riskLevel || x.risk_level || "",
        createdAt: x.createdAt || x.created_at || x.timestamp || "",
      }))
      .filter((x) => typeof x.probability === "number");

    return normalized;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      try {
        setHistoryLoading(true);
        setHistoryError(null);

        const normalized = await fetchHistory();
        if (!mounted) return;

        setHistory(normalized);
        setShowForm(normalized.length === 0);
      } catch {
        if (!mounted) return;
        setHistoryError("Could not load previous results.");
        setShowForm(true);
      } finally {
        if (mounted) setHistoryLoading(false);
      }
    }

    loadHistory();
    return () => {
      mounted = false;
    };
  }, [fetchHistory]);

  const latest = useMemo(() => {
    if (!history || history.length === 0) return null;
    return history[0];
  }, [history]);

  const fmtDate = useCallback((iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  }, []);

  const handleRetake = useCallback(() => {
    clearAllFields();
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [clearAllFields]);

  const handlePredict = async () => {
    setServerError(null);
    setPrediction(null);
    setRiskLevel("");
    setResultModalOpen(false);

    const raw = {
      age_months: age_months.current?.value ?? "",
      sex: sex.current?.value ?? "",
      residence: residence.current?.value ?? "",
      parental_education: parental_education.current?.value ?? "",
      family_history_asd: family_history_asd.current?.value ?? "",
      preeclampsia: preeclampsia.current?.value ?? "",
      preterm_birth: preterm_birth.current?.value ?? "",
      birth_asphyxia: birth_asphyxia.current?.value ?? "",
      low_birth_weight: low_birth_weight.current?.value ?? "",
      eye_contact_age_months: eye_contact_age_months.current?.value ?? "",
      social_smile_months: social_smile_months.current?.value ?? "",
      intellectual_disability: intellectual_disability.current?.value ?? "",
      epilepsy: epilepsy.current?.value ?? "",
      adhd: adhd.current?.value ?? "",
      language_disorder: language_disorder.current?.value ?? "",
      motor_delay: motor_delay.current?.value ?? "",
      screening_done: screening_done.current?.value ?? "",
      screening_result: screening_result.current?.value ?? "",
      consent: !!consent.current?.checked,
    };

    if (!raw.consent) {
      toast.error("Consent is required.");
      return;
    }

    const required = [
      "age_months",
      "sex",
      "residence",
      "parental_education",
      "family_history_asd",
      "preeclampsia",
      "preterm_birth",
      "birth_asphyxia",
      "low_birth_weight",
      "eye_contact_age_months",
      "social_smile_months",
      "intellectual_disability",
      "epilepsy",
      "adhd",
      "language_disorder",
      "motor_delay",
      "screening_done",
    ];

    if (raw.screening_done === "Yes") required.push("screening_result");

    const missing = required.filter((k) => raw[k] === "");
    if (missing.length > 0) {
      toast.error("Please fill all required fields.");
      return;
    }

    const payload = encodePayload(raw);

    try {
      setIsSubmitting(true);

      const res = await api.post("/api/ml/predict", payload);
      const { p, rl } = normalizeServerData(res?.data);

      if (typeof p !== "number" || Number.isNaN(p)) {
        throw new Error("Invalid response from server.");
      }

      const finalRisk = rl || computeRiskLevel(p);

      setPrediction(p);
      setRiskLevel(finalRisk);
      setResultModalOpen(true);
      window.scrollTo({ top: 0, behavior: "smooth" });

      try {
        const normalized = await fetchHistory();
        setHistory(normalized);
      } catch {
        // ignore refresh errors
      }
    } catch (err) {
      const data = err?.response?.data;
      setServerError(data || err?.message || "Could not compute prediction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(to_bottom,_#f8fbff,_#f8fafc_35%,_#ffffff)]"
      onKeyDownCapture={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
        }
        if (e.key === "Escape") {
          setResultModalOpen(false);
        }
      }}
    >
      <Navbar />

      <ResultModal
        open={resultModalOpen}
        prediction={prediction}
        riskLevel={riskLevel}
        resultQuery={resultQuery}
        onClose={() => setResultModalOpen(false)}
        onRetake={handleRetake}
        onNavigate={navigate}
      />

      <main className="relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {!showForm ? (
            <LastResultCard
              historyLoading={historyLoading}
              historyError={historyError}
              history={history}
              latest={latest}
              computeRiskLevel={computeRiskLevel}
              fmtDate={fmtDate}
              onRetake={handleRetake}
              onNavigate={navigate}
            />
          ) : (
            <>
              <div className={`${cardBase} overflow-hidden`}>
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-8 text-white md:px-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
                        ASD screening tool
                      </p>
                      <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
                        <Brain size={30} />
                        Autism Risk Screening Questionnaire
                      </h1>
                      <p className="mt-3 text-sm leading-6 text-blue-50 md:text-base">
                        Complete the questionnaire below to generate a probabilistic screening
                        result. This tool supports early guidance and does not replace clinical
                        diagnosis by a healthcare professional.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleAutofill}
                        className="rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                      >
                        Autofill Test Values
                      </button>

                      {history.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowForm(false)}
                          className="rounded-2xl border border-white/25 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-blue-50"
                        >
                          View History
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 border-t border-slate-100 bg-white px-6 py-5 md:grid-cols-3 md:px-8">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Sections
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900">7</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Questions
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900">18</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Outcome
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900">Probability + Risk</div>
                  </div>
                </div>

                {!!serverError && (
                  <div className="border-t border-slate-100 px-6 py-5 md:px-8">
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {typeof serverError === "string" ? (
                        serverError
                      ) : (
                        <>
                          <div className="font-semibold">{serverError.message || "Error"}</div>
                          {serverError.errors && (
                            <ul className="mt-2 list-disc pl-5">
                              {Object.entries(serverError.errors).map(([k, v]) => (
                                <li key={k}>
                                  <span className="font-semibold">{k}:</span> {String(v)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky top-3 z-20 mt-6">
                <div className="mx-auto max-w-6xl rounded-2xl border border-blue-100 bg-white/85 px-4 py-3 shadow-lg backdrop-blur">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Please answer all required fields before submitting.
                      </p>
                      <p className="text-xs text-slate-500">
                        Pressing Enter is disabled to prevent accidental submission.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Back
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handlePredict}
                        className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition ${
                          isSubmitting
                            ? "cursor-not-allowed bg-blue-300"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-0.5 hover:shadow-lg"
                        }`}
                      >
                        {isSubmitting ? "Submitting..." : "Submit & Predict"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <Section title="Section A: Child Information" sectionKey="child">
                  <NumberInputField
                    inputRef={age_months}
                    label="1) Child age (in months)"
                    placeholder="e.g., 24"
                    min={0}
                    helper="Enter the child's current age in months."
                  />
                  <SelectField
                    inputRef={sex}
                    label="2) Child biological sex"
                    options={["Male", "Female"]}
                  />
                  <SelectField
                    inputRef={residence}
                    label="3) Current residence"
                    options={["Urban", "Rural"]}
                  />
                </Section>

                <Section
                  title="Section B: Parental and Family Background"
                  sectionKey="family"
                >
                  <SelectField
                    inputRef={parental_education}
                    label="4) Highest education level of primary caregiver"
                    options={["No formal", "Primary", "Secondary", "College/University"]}
                  />
                  <SelectField
                    inputRef={family_history_asd}
                    label="5) Family history of ASD"
                    options={["Yes", "No"]}
                    helper="Includes parents, siblings, or close relatives."
                  />
                </Section>

                <Section title="Section C: Pregnancy and Birth History" sectionKey="birth">
                  <SelectField
                    inputRef={preeclampsia}
                    label="6) Pre-eclampsia during pregnancy"
                    options={["Yes", "No"]}
                  />
                  <SelectField
                    inputRef={preterm_birth}
                    label="7) Preterm birth (before 37 weeks)"
                    options={["Yes", "No"]}
                  />
                  <SelectField
                    inputRef={birth_asphyxia}
                    label="8) Birth asphyxia (lack of oxygen at birth)"
                    options={["Yes", "No"]}
                  />
                  <SelectField
                    inputRef={low_birth_weight}
                    label="9) Low birth weight (less than 2.5 kg)"
                    options={["Yes", "No"]}
                  />
                </Section>

                <Section
                  title="Section D: Early Developmental Milestones"
                  sectionKey="milestones"
                >
                  <NumberInputField
                    inputRef={eye_contact_age_months}
                    label="10) Eye contact age (months)"
                    placeholder="e.g., 10"
                    min={0}
                    helper="Approximate age when consistent eye contact began."
                  />
                  <NumberInputField
                    inputRef={social_smile_months}
                    label="11) Social smile age (months)"
                    placeholder="e.g., 3"
                    min={0}
                    helper="Approximate age when social smiling began."
                  />
                </Section>

                <Section
                  title="Section E: Developmental and Medical Conditions"
                  sectionKey="conditions"
                >
                  <SelectField
                    inputRef={intellectual_disability}
                    label="12) Diagnosed intellectual disability"
                    options={["Yes", "No"]}
                  />
                  <SelectField
                    inputRef={epilepsy}
                    label="13) Diagnosed epilepsy / seizure disorder"
                    options={["Yes", "No"]}
                  />
                  <SelectField
                    inputRef={adhd}
                    label="14) Diagnosed ADHD"
                    options={["Yes", "No"]}
                  />
                  <SelectField
                    inputRef={language_disorder}
                    label="15) Language or speech delay"
                    options={["Yes", "No"]}
                  />
                  <SelectField
                    inputRef={motor_delay}
                    label="16) Motor development delay (e.g., delayed sitting/walking)"
                    options={["Yes", "No"]}
                  />
                </Section>

                <Section
                  title="Section F: Previous Screening History"
                  sectionKey="screening"
                >
                  <SelectField
                    inputRef={screening_done}
                    label="17) Has the child undergone autism-related developmental screening before?"
                    options={["Yes", "No"]}
                    onValueChange={(value) => {
                      setScreeningDoneValue(value);
                      if (value !== "Yes") {
                        setRefValue(screening_result, "");
                      }
                    }}
                  />

                  {screeningDoneValue === "Yes" && (
                    <SelectField
                      inputRef={screening_result}
                      label="18) If yes, what was the screening outcome?"
                      options={["Positive", "Negative", "Unknown"]}
                      placeholder="Select screening outcome"
                      helper="This field appears only when Question 17 is Yes."
                    />
                  )}
                </Section>

                <Section title="Section G: Consent" sectionKey="consent">
                  <div className="md:col-span-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm leading-6 text-slate-700">
                        <span className="font-semibold">Consent:</span> I understand that this tool
                        provides a probabilistic screening result and does not replace a
                        professional medical diagnosis.
                      </p>

                      <label className="mt-4 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
                        <input ref={consent} type="checkbox" className="h-4 w-4 rounded" />
                        I agree
                      </label>
                    </div>
                  </div>
                </Section>

                <div
                  className={`${cardBase} flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between`}
                >
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Ready to generate the result?
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Review your answers, then submit the questionnaire.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handlePredict}
                      className={`rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-md transition ${
                        isSubmitting
                          ? "cursor-not-allowed bg-blue-300"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-0.5 hover:shadow-lg"
                      }`}
                    >
                      {isSubmitting ? "Submitting..." : "Submit & Predict"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
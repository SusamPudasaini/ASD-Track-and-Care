import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// FIX: Sub-components moved OUTSIDE the parent to prevent remounting on every
// render, which caused state loss, focus jumps, and wasted re-renders.
// They receive all needed data via props.
// ---------------------------------------------------------------------------

const Section = ({ title, children }) => (
  <div className="rounded-md border border-gray-100 bg-white p-6 shadow-sm">
    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
    <div className="mt-4 space-y-5">{children}</div>
  </div>
);

const SelectField = ({ label, inputRef, options, placeholder, helper }) => (
  <div>
    <div className="flex items-start justify-between gap-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
    </div>
    {helper ? <p className="mt-1 text-xs text-gray-500">{helper}</p> : null}
    <select
      ref={inputRef}
      defaultValue=""
      className="mt-2 w-full rounded border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500"
    >
      <option value="">{placeholder || "Select an option"}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </div>
);

const NumberInputField = ({ label, inputRef, placeholder, helper, min, max }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    {helper ? <p className="mt-1 text-xs text-gray-500">{helper}</p> : null}
    <input
      ref={inputRef}
      type="number"
      inputMode="numeric"
      placeholder={placeholder || "Enter a number"}
      min={min}
      max={max}
      className="mt-2 w-full rounded border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500"
    />
  </div>
);

// ---------------------------------------------------------------------------
// ResultModal — receives all state via props, no internal closures over parent
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
      ? "bg-red-100 text-red-800 border-red-200"
      : riskLevel === "Moderate"
        ? "bg-yellow-100 text-yellow-800 border-yellow-200"
        : "bg-green-100 text-green-800 border-green-200";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Screening Result</h3>
            <p className="mt-1 text-sm text-gray-600">
              This is a screening estimate and not a medical diagnosis.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-gray-100 bg-gray-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Predicted ASD Probability</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{pct}%</p>
            </div>

            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${riskBadgeClass}`}
            >
              <span className="h-2 w-2 rounded-full bg-current opacity-60" />
              Risk: {riskLevel}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <p className="text-sm font-medium text-gray-900">What would you like to do next?</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onNavigate(`/therapists?${resultQuery}`)}
              className="rounded-lg bg-[#4a6cf7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
            >
              Suggested Therapists
            </button>

            <button
              type="button"
              onClick={() => onNavigate(`/activities?${resultQuery}`)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Suggested Activities
            </button>

            <button
              type="button"
              onClick={onRetake}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Retake Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// LastResultCard — receives all state via props
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
      <div className="rounded-md bg-white p-6 shadow-md">
        <h1 className="text-xl font-semibold text-gray-900">Autism Risk Screening Questionnaire</h1>
        <p className="mt-2 text-sm text-gray-600">Loading your previous screening history...</p>
      </div>
    );
  }

  if (!latest) return null;

  const pct = (latest.probability * 100).toFixed(1);
  const lastRisk = latest.riskLevel || computeRiskLevel(latest.probability);

  return (
    <div className="rounded-md bg-white p-6 shadow-md">
      <h1 className="text-xl font-semibold text-gray-900">Autism Risk Screening Questionnaire</h1>
      <p className="mt-2 text-sm text-gray-600">
        The last probability score was <span className="font-semibold">{pct}%</span> and the state
        is <span className="font-semibold">{lastRisk}</span>.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
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
          className="rounded-lg bg-[#4a6cf7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3f5ee0]"
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
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          View Suggested Activities
        </button>

        <button
          type="button"
          onClick={onRetake}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Retest →
        </button>
      </div>

      {!!historyError && (
        <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          {historyError}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6">
          <div className="text-sm font-semibold text-gray-900">Recent history</div>
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Probability</th>
                  <th className="px-4 py-2 text-left">Risk</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {history.slice(0, 8).map((h) => {
                  const r = h.riskLevel || computeRiskLevel(h.probability);
                  return (
                    // FIX: Use stable id instead of Math.random() to avoid key churn
                    <tr key={h.id} className="border-t">
                      <td className="px-4 py-2 text-gray-700">{fmtDate(h.createdAt) || "—"}</td>
                      <td className="px-4 py-2 font-semibold text-gray-900">
                        {(h.probability * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-2 text-gray-700">{r}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Tip: Click "Retest" to take the questionnaire again.
          </p>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export default function Questionnaire() {
  const navigate = useNavigate();

  // refs (uncontrolled inputs)
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

  const yesNoTo01 = (v) => (v === "Yes" ? 1 : 0);

  // FIX: Wrapped in useCallback so it is stable across renders and can be
  // safely passed as a prop or used in dependency arrays.
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

  // FIX: clearAllFields now also resets all related state so callers don't
  // have to remember to do it separately.
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

    // FIX: Reset derived state here so callers have a single place to clear everything
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
        // FIX: Use a stable fallback (index-based) rather than Math.random()
        // to avoid key churn. Ideally all records have a real id from the backend.
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

  // FIX: handleRetake now delegates all state resets to clearAllFields to
  // avoid duplicated reset logic spread across multiple functions.
  const handleRetake = useCallback(() => {
    clearAllFields();
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [clearAllFields]);

  const handlePredict = async () => {
    // FIX: Use clearAllFields instead of individually resetting a subset of state
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
        // ignore history refresh failures silently
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
      className="min-h-screen bg-white"
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
        <div className="relative z-10 mx-auto max-w-4xl px-6 py-10">
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
              <div className="rounded-md bg-white p-6 shadow-md">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">
                      Autism Risk Screening Questionnaire
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                      This tool provides a probabilistic screening result and does not replace a
                      professional medical diagnosis.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAutofill}
                      className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Autofill Test Values
                    </button>

                    {history.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        View History
                      </button>
                    )}
                  </div>
                </div>

                {!!serverError && (
                  <div className="mt-5 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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
                )}
              </div>

              {/* FORM */}
              <div className="mt-8 space-y-6">
                <Section title="Section A: Child Information">
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

                <Section title="Section B: Parental and Family Background">
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

                <Section title="Section C: Pregnancy and Birth History">
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

                <Section title="Section D: Early Developmental Milestones">
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

                <Section title="Section E: Developmental and Medical Conditions">
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

                <Section title="Section F: Previous Screening History">
                  <SelectField
                    inputRef={screening_done}
                    label="17) Has the child undergone autism-related developmental screening before?"
                    options={["Yes", "No"]}
                  />

                  <SelectField
                    inputRef={screening_result}
                    label="18) If yes, what was the screening outcome?"
                    options={["Positive", "Negative", "Unknown"]}
                    placeholder="Select (only required if Q17 is Yes)"
                    helper="Only required when Q17 is Yes."
                  />
                </Section>

                <Section title="Section G: Consent">
                  <div className="rounded border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Consent:</span>{" "}
                      I understand that this tool provides a probabilistic screening result and does
                      not replace a professional medical diagnosis.
                    </p>

                    <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                      <input ref={consent} type="checkbox" />
                      I agree
                    </label>
                  </div>
                </Section>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="w-full sm:w-auto rounded border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handlePredict}
                    className={`w-full sm:w-auto rounded px-6 py-2.5 text-sm font-semibold text-white transition
                      ${isSubmitting ? "bg-blue-300 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"}`}
                  >
                    {isSubmitting ? "Submitting..." : "Submit & Predict"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
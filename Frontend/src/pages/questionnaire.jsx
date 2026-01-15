import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

export default function Questionnaire() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    age_months: "",
    sex: "",
    residence: "",
    parental_education: "",
    family_history_asd: "",

    preeclampsia: "",
    preterm_birth: "",
    birth_asphyxia: "",
    low_birth_weight: "",

    eye_contact_age_months: "",
    social_smile_months: "",

    intellectual_disability: "",
    epilepsy: "",
    adhd: "",
    language_disorder: "",
    motor_delay: "",

    screening_done: "",
    screening_result: "",
    consent: false,
  });

  const [serverError, setServerError] = useState(null); // can be string or {message, errors}
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [prediction, setPrediction] = useState(null);
  const [riskLevel, setRiskLevel] = useState("");

  const onChange = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  // Prevent Enter key from submitting form (avoids refresh)
  const blockEnterSubmit = (e) => {
    if (e.key === "Enter") e.preventDefault();
  };

  const yesNoTo01 = (v) => (v === "Yes" ? 1 : 0);

  const encodeCategoricals = (payload) => {
    const sex = payload.sex === "Male" ? 1 : 0;
    const residence = payload.residence === "Urban" ? 1 : 0;

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
      age_months: Number(payload.age_months),
      sex,
      residence,
      parental_education: eduMap[payload.parental_education],

      family_history_asd: yesNoTo01(payload.family_history_asd),

      preeclampsia: yesNoTo01(payload.preeclampsia),
      preterm_birth: yesNoTo01(payload.preterm_birth),
      birth_asphyxia: yesNoTo01(payload.birth_asphyxia),
      low_birth_weight: yesNoTo01(payload.low_birth_weight),

      eye_contact_age_months: Number(payload.eye_contact_age_months),
      social_smile_months: Number(payload.social_smile_months),

      intellectual_disability: yesNoTo01(payload.intellectual_disability),
      epilepsy: yesNoTo01(payload.epilepsy),
      adhd: yesNoTo01(payload.adhd),
      language_disorder: yesNoTo01(payload.language_disorder),
      motor_delay: yesNoTo01(payload.motor_delay),

      screening_done: yesNoTo01(payload.screening_done),
      screening_result:
        payload.screening_done === "Yes"
          ? screeningMap[payload.screening_result]
          : null,
    };
  };

  const computeRiskLevel = (p) => {
    if (p < 0.33) return "Low";
    if (p < 0.66) return "Moderate";
    return "High";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    setPrediction(null);
    setRiskLevel("");

    if (!form.consent) {
      setServerError("Consent is required.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = encodeCategoricals(form);

      // Backend validates and forwards to FastAPI
      const res = await api.post("/ml/predict", payload);

      const p = res?.data?.autism_probability ?? res?.data?.probability;
      if (typeof p !== "number") throw new Error("Invalid response from server.");

      setPrediction(p);
      setRiskLevel(computeRiskLevel(p));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      // backend returns: { message: "Validation failed", errors: {...} }
      const data = err?.response?.data;

      if (data) {
        setServerError(data);
      } else {
        setServerError(err?.message || "Could not compute prediction. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI helpers
  const Section = ({ title, children }) => (
    <div className="rounded-md border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-5">{children}</div>
    </div>
  );

  const Select = ({ name, label, value, onChangeValue, options, placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onKeyDown={blockEnterSubmit}
        onChange={(e) => onChangeValue(e.target.value)}
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

  const YesNo = ({ name, label }) => (
    <Select
      name={name}
      label={label}
      value={form[name]}
      onChangeValue={(v) => onChange(name, v)}
      options={["Yes", "No"]}
      placeholder="Select Yes / No"
    />
  );

  const NumberInput = ({ name, label, placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        value={form[name]}
        onKeyDown={blockEnterSubmit}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder || "Enter a number"}
        className="mt-2 w-full rounded border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-4xl px-6 py-10">
          <div className="rounded-md bg-white p-6 shadow-md">
            <h1 className="text-xl font-semibold text-gray-900">
              Autism Risk Screening Questionnaire
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              This tool provides a probabilistic screening result and does not replace a professional medical diagnosis.
            </p>

            {prediction !== null && (
              <div className="mt-5 rounded border border-green-200 bg-green-50 p-4">
                <p className="text-sm text-green-900 font-semibold">
                  Predicted Autism Probability: {(prediction * 100).toFixed(1)}%
                </p>
                <p className="mt-1 text-sm text-green-800">
                  Risk Level: <span className="font-semibold">{riskLevel}</span>
                </p>
              </div>
            )}

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

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <Section title="Section A: Child Information">
              <NumberInput name="age_months" label="1) Child age (in months)" placeholder="e.g., 24" />
              <Select name="sex" label="2) Child biological sex" value={form.sex} onChangeValue={(v) => onChange("sex", v)} options={["Male", "Female"]} />
              <Select name="residence" label="3) Current residence" value={form.residence} onChangeValue={(v) => onChange("residence", v)} options={["Urban", "Rural"]} />
            </Section>

            <Section title="Section B: Parental and Family Background">
              <Select name="parental_education" label="4) Highest education level of primary caregiver" value={form.parental_education} onChangeValue={(v) => onChange("parental_education", v)} options={["No formal", "Primary", "Secondary", "College/University"]} />
              <Select name="family_history_asd" label="5) Family history of ASD" value={form.family_history_asd} onChangeValue={(v) => onChange("family_history_asd", v)} options={["Yes", "No"]} />
            </Section>

            <Section title="Section C: Pregnancy and Birth History">
              <YesNo name="preeclampsia" label="6) Pre-eclampsia during pregnancy" />
              <YesNo name="preterm_birth" label="7) Preterm birth (before 37 weeks)" />
              <YesNo name="birth_asphyxia" label="8) Birth asphyxia (lack of oxygen at birth)" />
              <YesNo name="low_birth_weight" label="9) Low birth weight (less than 2.5 kg)" />
            </Section>

            <Section title="Section D: Early Developmental Milestones">
              <NumberInput name="eye_contact_age_months" label="10) Eye contact age (months)" placeholder="e.g., 10" />
              <NumberInput name="social_smile_months" label="11) Social smile age (months)" placeholder="e.g., 3" />
            </Section>

            <Section title="Section E: Developmental and Medical Conditions">
              <YesNo name="intellectual_disability" label="12) Diagnosed intellectual disability" />
              <YesNo name="epilepsy" label="13) Diagnosed epilepsy / seizure disorder" />
              <YesNo name="adhd" label="14) Diagnosed ADHD" />
              <YesNo name="language_disorder" label="15) Language or speech delay" />
              <YesNo name="motor_delay" label="16) Motor development delay (e.g., delayed sitting/walking)" />
            </Section>

            <Section title="Section F: Previous Screening History">
              <Select
                name="screening_done"
                label="17) Has the child undergone autism-related developmental screening before?"
                value={form.screening_done}
                onChangeValue={(v) => {
                  onChange("screening_done", v);
                  if (v !== "Yes") onChange("screening_result", "");
                }}
                options={["Yes", "No"]}
              />

              {form.screening_done === "Yes" && (
                <Select
                  name="screening_result"
                  label="18) If yes, what was the screening outcome?"
                  value={form.screening_result}
                  onChangeValue={(v) => onChange("screening_result", v)}
                  options={["Positive", "Negative", "Unknown"]}
                />
              )}
            </Section>

            <Section title="Section G: Consent">
              <div className="rounded border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Consent:</span>{" "}
                  I understand that this tool provides a probabilistic screening result and does not replace a professional medical diagnosis.
                </p>
                <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => onChange("consent", e.target.checked)}
                  />
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
                type="submit"
                disabled={isSubmitting}
                className={`w-full sm:w-auto rounded px-6 py-2.5 text-sm font-semibold text-white transition
                  ${isSubmitting ? "bg-blue-300 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"}`}
              >
                {isSubmitting ? "Submitting..." : "Submit & Predict"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

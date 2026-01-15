import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
import toast from "react-hot-toast";

export default function Questionnaire() {
  const navigate = useNavigate();

  // Refs (uncontrolled inputs) => no onChange needed
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

  const [serverError, setServerError] = useState(null); // string or object
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [riskLevel, setRiskLevel] = useState("");

  const yesNoTo01 = (v) => (v === "Yes" ? 1 : 0);

  const computeRiskLevel = (p) => {
    if (p < 0.33) return "Low";
    if (p < 0.66) return "Moderate";
    return "High";
  };

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

  // Only empty-field checks + consent check on Submit button click
  const handlePredict = async () => {
    setServerError(null);
    setPrediction(null);
    setRiskLevel("");

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
      toast.error(`Please fill all required fields`);
      return;
    }

    const payload = encodePayload(raw);

    try {
      setIsSubmitting(true);

        const res = await api.post("/ml/predict", payload);
        setPrediction(res.data.probability);
        setRiskLevel(res.data.riskLevel);



      

      // Spring is returning String body from FastAPI; parse if it is stringified JSON
      let data = res?.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          // leave as is
        }
      }

      const p = data?.autism_probability ?? data?.probability;
      if (typeof p !== "number") throw new Error("Invalid response from server.");

      setPrediction(p);
      setRiskLevel(computeRiskLevel(p));

      // Scroll ONLY on success (remove if you don't want it)
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const data = err?.response?.data;
      setServerError(data || err?.message || "Could not compute prediction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI components
  const Section = ({ title, children }) => (
    <div className="rounded-md border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-5">{children}</div>
    </div>
  );

  const Select = ({ label, inputRef, options, placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
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

  const NumberInput = ({ label, inputRef, placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        placeholder={placeholder || "Enter a number"}
        className="mt-2 w-full rounded border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div
      className="min-h-screen bg-white"
      onKeyDownCapture={(e) => {
        // Prevent Enter from doing anything (no hidden submit)
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
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

          <div className="mt-8 space-y-6">
            <Section title="Section A: Child Information">
              <NumberInput inputRef={age_months} label="1) Child age (in months)" placeholder="e.g., 24" />
              <Select inputRef={sex} label="2) Child biological sex" options={["Male", "Female"]} />
              <Select inputRef={residence} label="3) Current residence" options={["Urban", "Rural"]} />
            </Section>

            <Section title="Section B: Parental and Family Background">
              <Select
                inputRef={parental_education}
                label="4) Highest education level of primary caregiver"
                options={["No formal", "Primary", "Secondary", "College/University"]}
              />
              <Select
                inputRef={family_history_asd}
                label="5) Family history of ASD"
                options={["Yes", "No"]}
              />
            </Section>

            <Section title="Section C: Pregnancy and Birth History">
              <Select inputRef={preeclampsia} label="6) Pre-eclampsia during pregnancy" options={["Yes", "No"]} />
              <Select inputRef={preterm_birth} label="7) Preterm birth (before 37 weeks)" options={["Yes", "No"]} />
              <Select inputRef={birth_asphyxia} label="8) Birth asphyxia (lack of oxygen at birth)" options={["Yes", "No"]} />
              <Select inputRef={low_birth_weight} label="9) Low birth weight (less than 2.5 kg)" options={["Yes", "No"]} />
            </Section>

            <Section title="Section D: Early Developmental Milestones">
              <NumberInput inputRef={eye_contact_age_months} label="10) Eye contact age (months)" placeholder="e.g., 10" />
              <NumberInput inputRef={social_smile_months} label="11) Social smile age (months)" placeholder="e.g., 3" />
            </Section>

            <Section title="Section E: Developmental and Medical Conditions">
              <Select inputRef={intellectual_disability} label="12) Diagnosed intellectual disability" options={["Yes", "No"]} />
              <Select inputRef={epilepsy} label="13) Diagnosed epilepsy / seizure disorder" options={["Yes", "No"]} />
              <Select inputRef={adhd} label="14) Diagnosed ADHD" options={["Yes", "No"]} />
              <Select inputRef={language_disorder} label="15) Language or speech delay" options={["Yes", "No"]} />
              <Select inputRef={motor_delay} label="16) Motor development delay (e.g., delayed sitting/walking)" options={["Yes", "No"]} />
            </Section>

            <Section title="Section F: Previous Screening History">
              <Select
                inputRef={screening_done}
                label="17) Has the child undergone autism-related developmental screening before?"
                options={["Yes", "No"]}
              />

              <Select
                inputRef={screening_result}
                label="18) If yes, what was the screening outcome?"
                options={["Positive", "Negative", "Unknown"]}
                placeholder="Select (only required if Q17 is Yes)"
              />
            </Section>

            <Section title="Section G: Consent">
              <div className="rounded border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Consent:</span>{" "}
                  I understand that this tool provides a probabilistic screening result and does not replace a professional medical diagnosis.
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
        </div>
      </main>
    </div>
  );
}

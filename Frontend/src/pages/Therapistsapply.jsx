import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

export default function TherapistApply() {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    qualification: "",
    licenseNumber: "",
    yearsExperience: "",
    specialization: "",
    workplace: "",
    city: "",
    message: "",
  });

  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Only minimal empty checks (backend should fully validate)
    if (!form.fullName.trim()) return toast.error("Full name is required.");
    if (!form.email.trim()) return toast.error("Email is required.");
    if (!form.phone.trim()) return toast.error("Phone is required.");
    if (!form.qualification.trim()) return toast.error("Qualification is required.");

    try {
      setSaving(true);
      await api.post("/therapists/apply", {
        ...form,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
      });

      toast.success("Application submitted!");
      navigate("/profile");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit application.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-md border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Therapist Application</h1>
          <p className="mt-2 text-sm text-gray-600">
            Fill out this form to apply as a therapist. Our team will review and contact you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <Section title="Contact Information">
            <Field label="Full Name" value={form.fullName} onChange={(v) => onChange("fullName", v)} />
            <Field label="Email" value={form.email} onChange={(v) => onChange("email", v)} />
            <Field label="Phone" value={form.phone} onChange={(v) => onChange("phone", v)} />
            <Field label="City" value={form.city} onChange={(v) => onChange("city", v)} />
          </Section>

          <Section title="Professional Details">
            <Field label="Qualification" value={form.qualification} onChange={(v) => onChange("qualification", v)} placeholder="e.g., MSc Clinical Psychology" />
            <Field label="License Number (if any)" value={form.licenseNumber} onChange={(v) => onChange("licenseNumber", v)} />
            <Field label="Years of Experience" type="number" value={form.yearsExperience} onChange={(v) => onChange("yearsExperience", v)} placeholder="e.g., 3" />
            <Field label="Specialization" value={form.specialization} onChange={(v) => onChange("specialization", v)} placeholder="e.g., ASD, Speech Therapy" />
            <Field label="Workplace / Clinic" value={form.workplace} onChange={(v) => onChange("workplace", v)} />
          </Section>

          <Section title="Message">
            <div>
              <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
              <textarea
                value={form.message}
                onChange={(e) => onChange("message", e.target.value)}
                rows={5}
                className="mt-2 w-full rounded border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Tell us anything relevant (availability, certifications, etc.)"
              />
            </div>
          </Section>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>

            <button
              type="submit"
              disabled={saving}
              className={`rounded px-5 py-2 text-sm font-semibold text-white ${
                saving ? "bg-blue-300 cursor-not-allowed" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
              }`}
            >
              {saving ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-md border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, disabled, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder || ""}
        className={`mt-2 w-full rounded border px-4 py-2.5 text-sm outline-none focus:ring-1 ${
          disabled
            ? "border-gray-200 bg-gray-50 text-gray-500"
            : "border-gray-200 bg-white focus:border-blue-500 focus:ring-blue-500"
        }`}
      />
    </div>
  );
}

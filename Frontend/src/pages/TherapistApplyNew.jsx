import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

const ACCEPTED_DOC_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export default function TherapistApplyNew() {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [loadingMe, setLoadingMe] = useState(true);

  const token = useMemo(() => localStorage.getItem("token"), []);

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

  const [documents, setDocuments] = useState([]);

  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Prefill profile
  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      try {
        setLoadingMe(true);

        if (!token) {
          toast.error("Please login first.");
          navigate("/login", { replace: true });
          return;
        }

        const res = await api.get("/api/users/me");
        if (!mounted) return;

        const u = res.data || {};
        const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim();

        setForm((prev) => ({
          ...prev,
          fullName: fullName || prev.fullName,
          email: u.userEmail || prev.email,
          phone: u.phoneNumber || prev.phone,
        }));
      } catch (err) {
        const status = err?.response?.status;

        if (status === 401) {
          toast.error("Session expired. Please login again.");
          navigate("/logout", { replace: true });
          return;
        }

        toast.error(
          err?.response?.data?.message || "Could not load your profile details."
        );
      } finally {
        if (mounted) setLoadingMe(false);
      }
    }

    loadMe();
    return () => {
      mounted = false;
    };
  }, [navigate, token]);

  // Documents helpers
  const addDocumentRow = () => {
    setDocuments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", file: null },
    ]);
  };

  const removeDocumentRow = (id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const updateDocTitle = (id, title) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, title } : d)));
  };

  const updateDocFile = (id, file) => {
    if (!file) return;

    if (!ACCEPTED_DOC_TYPES.includes(file.type)) {
      toast.error("Only PDF or image files are allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
      return;
    }

    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, file } : d)));
  };

  const validateDocuments = () => {
    for (const d of documents) {
      if (d.title?.trim() && !d.file) {
        toast.error(`Please upload a file for "${d.title}".`);
        return false;
      }
      if (!d.title?.trim() && d.file) {
        toast.error("Please enter a document title.");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.fullName.trim()) return toast.error("Full name is required.");
    if (!form.email.trim()) return toast.error("Email is required.");
    if (!form.phone.trim()) return toast.error("Phone is required.");
    if (!form.qualification.trim())
      return toast.error("Qualification is required.");

    if (!validateDocuments()) return;

    try {
      setSaving(true);

      const fd = new FormData();

      const payload = {
        ...form,
        yearsExperience: form.yearsExperience
          ? Number(form.yearsExperience)
          : null,
      };

      fd.append(
        "application",
        new Blob([JSON.stringify(payload)], {
          type: "application/json",
        })
      );

      documents
        .filter((d) => d.title?.trim() && d.file)
        .forEach((d) => {
          fd.append("documentTitles", d.title.trim());
          fd.append("documentFiles", d.file);
        });

      await api.post("/api/therapists/apply", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Application submitted successfully!");
      navigate("/therapist/apply");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Submission failed."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            Therapist Application
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Submit your professional details for review.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <Section title="Contact Information">
            <TwoCol>
              <Field label="Full Name" value={form.fullName} onChange={(v) => onChange("fullName", v)} />
              <Field label="Email" value={form.email} onChange={(v) => onChange("email", v)} />
              <Field label="Phone" value={form.phone} onChange={(v) => onChange("phone", v)} />
              <Field label="City" value={form.city} onChange={(v) => onChange("city", v)} />
            </TwoCol>
          </Section>

          <Section title="Professional Details">
            <TwoCol>
              <Field label="Qualification" value={form.qualification} onChange={(v) => onChange("qualification", v)} />
              <Field label="Workplace" value={form.workplace} onChange={(v) => onChange("workplace", v)} />
              <Field label="License Number" value={form.licenseNumber} onChange={(v) => onChange("licenseNumber", v)} />
              <Field label="Years of Experience" type="number" value={form.yearsExperience} onChange={(v) => onChange("yearsExperience", v)} />
              <Field label="Specialization" value={form.specialization} onChange={(v) => onChange("specialization", v)} />
            </TwoCol>
          </Section>

          <Section title="Documents" right={
            <button
              type="button"
              onClick={addDocumentRow}
              className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black"
            >
              + Add Document
            </button>
          }>
            {documents.length === 0 ? (
              <p className="text-sm text-gray-600">No documents added.</p>
            ) : (
              documents.map((d, idx) => (
                <div key={d.id} className="mt-4 border p-4 rounded-lg">
                  <p className="font-semibold">Document {idx + 1}</p>
                  <input
                    placeholder="Document Title"
                    value={d.title}
                    onChange={(e) => updateDocTitle(d.id, e.target.value)}
                    className="mt-2 w-full border px-3 py-2 rounded"
                  />
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) =>
                      updateDocFile(d.id, e.target.files?.[0] || null)
                    }
                    className="mt-2"
                  />
                  <button
                    type="button"
                    onClick={() => removeDocumentRow(d.id)}
                    className="mt-2 text-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </Section>

          <Section title="Message">
            <textarea
              value={form.message}
              onChange={(e) => onChange("message", e.target.value)}
              rows={5}
              className="w-full border rounded px-4 py-2"
              placeholder="Optional notes"
            />
          </Section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || loadingMe}
              className={`rounded-lg px-6 py-2 text-white ${
                saving ? "bg-blue-300" : "bg-[#4a6cf7] hover:bg-[#3f5ee0]"
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

/* ---------- UI Helpers ---------- */

function Section({ title, right, children }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {right}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function TwoCol({ children }) {
  return <div className="grid gap-5 md:grid-cols-2">{children}</div>;
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-2 w-full rounded-lg border px-4 py-2.5 text-sm"
      />
    </div>
  );
}

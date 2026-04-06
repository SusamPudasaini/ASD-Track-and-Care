import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Briefcase,
  FilePlus2,
  FileText,
  Mail,
  MapPin,
  Phone,
  PlusCircle,
  Save,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserCheck,
  UserCircle2,
} from "lucide-react";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";

const ACCEPTED_DOC_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const cardBase =
  "rounded-3xl border border-white/60 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur";

export default function TherapistApplyNew() {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [loadingMe, setLoadingMe] = useState(true);
  const [dragOverId, setDragOverId] = useState(null);

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

  const addDocumentRow = () => {
    setDocuments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", file: null },
    ]);
  };

  const removeDocumentRow = (id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setDragOverId((prev) => (prev === id ? null : prev));
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

  const handleDropFile = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    updateDocFile(id, file);
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
    if (!form.qualification.trim()) {
      return toast.error("Qualification is required.");
    }

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_35%),linear-gradient(to_bottom,_#f8fbff,_#f8fafc_35%,_#ffffff)]">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className={`${cardBase} overflow-hidden`}>
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-8 text-white md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
                  Therapist application
                </p>
                <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
                  <UserCheck size={30} />
                  New Therapist Application
                </h1>
                <p className="mt-3 text-sm leading-6 text-blue-50 md:text-base">
                  Submit your professional details and supporting documents for review.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            </div>
          </div>

          <div className="grid gap-4 border-t border-slate-100 bg-white px-6 py-5 md:grid-cols-3 md:px-8">
            <StatCard label="Documents Added" value={documents.length} />
            <StatCard label="Profile Prefill" value={loadingMe ? "Loading..." : "Ready"} />
            <StatCard label="Application Status" value="Draft" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <Section
            icon={UserCircle2}
            title="Contact Information"
            description="Provide your basic details so the review team can identify and contact you."
          >
            <TwoCol>
              <Field
                label="Full Name"
                value={form.fullName}
                onChange={(v) => onChange("fullName", v)}
                icon={UserCircle2}
              />
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => onChange("email", v)}
                icon={Mail}
              />
              <Field
                label="Phone"
                value={form.phone}
                onChange={(v) => onChange("phone", v)}
                icon={Phone}
              />
              <Field
                label="City"
                value={form.city}
                onChange={(v) => onChange("city", v)}
                icon={MapPin}
              />
            </TwoCol>
          </Section>

          <Section
            icon={Briefcase}
            title="Professional Details"
            description="Add your qualifications, experience, and work details."
          >
            <TwoCol>
              <Field
                label="Qualification"
                value={form.qualification}
                onChange={(v) => onChange("qualification", v)}
              />
              <Field
                label="Workplace"
                value={form.workplace}
                onChange={(v) => onChange("workplace", v)}
              />
              <Field
                label="License Number"
                value={form.licenseNumber}
                onChange={(v) => onChange("licenseNumber", v)}
              />
              <Field
                label="Years of Experience"
                type="number"
                value={form.yearsExperience}
                onChange={(v) => onChange("yearsExperience", v)}
              />
              <Field
                label="Specialization"
                value={form.specialization}
                onChange={(v) => onChange("specialization", v)}
              />
            </TwoCol>
          </Section>

          <Section
            icon={FileText}
            title="Documents"
            description="Upload supporting files such as certificates, licenses, or identification."
            right={
              <button
                type="button"
                onClick={addDocumentRow}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <PlusCircle size={16} />
                Add Document
              </button>
            }
          >
            {documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <FilePlus2 size={24} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  No documents added yet
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Add document rows and upload PDF or image files up to 10 MB each.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((d, idx) => {
                  const isDragging = dragOverId === d.id;

                  return (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            Document {idx + 1}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Accepted: PDF, PNG, JPG, WEBP · Max 10 MB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeDocumentRow(d.id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-[1.1fr_.9fr]">
                        <div>
                          <label className="block text-sm font-semibold text-slate-800">
                            Document Title
                          </label>
                          <input
                            placeholder="e.g., Medical License"
                            value={d.title}
                            onChange={(e) => updateDocTitle(d.id, e.target.value)}
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-800">
                            Upload File
                          </label>

                          <label
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverId(d.id);
                            }}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverId(d.id);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragOverId === d.id) setDragOverId(null);
                            }}
                            onDrop={(e) => handleDropFile(d.id, e)}
                            className={`mt-2 flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition ${
                              isDragging
                                ? "border-blue-400 bg-blue-50"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <UploadCloud
                              size={22}
                              className={isDragging ? "text-blue-600" : "text-slate-400"}
                            />

                            <div className="mt-3 text-sm font-semibold text-slate-800">
                              {d.file ? d.file.name : "Drop file here or click to browse"}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              PDF or image files only
                            </div>

                            <input
                              type="file"
                              accept=".pdf,image/*"
                              className="hidden"
                              onChange={(e) =>
                                updateDocFile(d.id, e.target.files?.[0] || null)
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Section
            icon={ShieldCheck}
            title="Message"
            description="Add any optional notes you want the review team to know."
          >
            <textarea
              value={form.message}
              onChange={(e) => onChange("message", e.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="Optional notes"
            />
          </Section>

          <div className={`${cardBase} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Ready to submit?
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Review your details and uploaded documents before submission.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving || loadingMe}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition ${
                saving || loadingMe
                  ? "cursor-not-allowed bg-blue-300"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-0.5 hover:shadow-md"
              }`}
            >
              <Save size={16} />
              {saving ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

/* ---------- UI Helpers ---------- */

function Section({ icon, title, description, right, children }) {
  const Icon = icon;

  return (
    <section className={`${cardBase} p-6 md:p-7`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 shadow-sm">
            <Icon size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function TwoCol({ children }) {
  return <div className="grid gap-5 md:grid-cols-2">{children}</div>;
}

function Field({ label, value, onChange, type = "text", icon: Icon }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800">{label}</label>

      <div className="relative mt-2">
        {Icon ? (
          <Icon
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
        ) : null}

        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
            Icon ? "pl-11" : ""
          }`}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}